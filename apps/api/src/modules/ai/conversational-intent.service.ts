import { Injectable, Logger } from '@nestjs/common';
import {
  PrimaryIntent,
  DecisionPolicy,
  StructuredIntentAnalysis,
  UserPacing,
  UserEmotionalTone,
} from './conversational-intent.types';

@Injectable()
export class ConversationalIntentService {
  private readonly logger = new Logger(ConversationalIntentService.name);

  /**
   * Performs deep pragmatic intent recognition, multi-turn entity resolution,
   * emotional tone inference, and decision policy determination.
   */
  analyzeIntent(
    message: string,
    history: Array<{ role: string; content: string }> = [],
    uiContext?: { activeTab?: string; selectedTaskId?: string; selectedProjectId?: string },
  ): StructuredIntentAnalysis {
    const trimmed = message.trim();
    const lower = trimmed.toLowerCase();

    // 1. Detect User Pacing
    let userPacing: UserPacing = 'NORMAL';
    if (
      lower.includes('quickly') ||
      lower.includes('quick') ||
      lower.includes('hurry') ||
      lower.includes('asap') ||
      lower.includes('fast') ||
      lower.includes('short version') ||
      lower.includes('briefly')
    ) {
      userPacing = 'IN_A_HURRY';
    } else if (lower.includes('help me think') || lower.includes('reflect') || lower.includes('in depth')) {
      userPacing = 'REFLECTIVE';
    }

    // 2. Detect Emotional Tone (Treated as uncertain / contextual signal)
    let detectedEmotion: UserEmotionalTone | undefined = undefined;
    if (
      lower.includes('mess') ||
      lower.includes('hate this') ||
      lower.includes('frustrated') ||
      lower.includes('annoyed') ||
      lower.includes('so complicated') ||
      lower.includes('becoming a mess') ||
      lower.includes('tired of')
    ) {
      detectedEmotion = 'FRUSTRATED';
    } else if (
      lower.includes("don't know what to") ||
      lower.includes('not sure') ||
      lower.includes('uncertain') ||
      lower.includes('confused') ||
      lower.includes('which one first') ||
      lower.includes('lost')
    ) {
      detectedEmotion = 'UNCERTAIN';
    } else if (
      lower.includes('finally completed') ||
      lower.includes('we did it') ||
      lower.includes('awesome') ||
      lower.includes('great news') ||
      lower.includes('finished the deployment') ||
      lower.includes('success')
    ) {
      detectedEmotion = 'EXCITED';
    } else if (
      lower.includes('overwhelmed') ||
      lower.includes('so much to do') ||
      lower.includes('drowning in') ||
      lower.includes('a lot to finish today')
    ) {
      detectedEmotion = 'OVERWHELMED';
    }

    // 3. Multi-turn Entity & Pronoun Resolution
    const resolvedPronouns: Record<string, string> = {};
    let referredEntityId: string | undefined = uiContext?.selectedTaskId || uiContext?.selectedProjectId;
    let referredEntityType: 'project' | 'task' | 'note' | 'budget' | undefined = undefined;

    // Scan recent history (last 4 messages) for salient entities
    let recentProjectName: string | undefined;
    let recentTaskTitle: string | undefined;

    for (let i = history.length - 1; i >= 0 && i >= history.length - 4; i--) {
      const prevMsg = history[i].content;
      const projMatch = prevMsg.match(/(?:project|working on)\s+["']?([A-Za-z0-9\s_-]+?)(?:["']|\.|\,|$)/i);
      if (projMatch && !recentProjectName) {
        recentProjectName = projMatch[1].trim();
      }
      const taskMatch = prevMsg.match(/(?:task|doing)\s+["']?([A-Za-z0-9\s_-]+?)(?:["']|\.|\,|$)/i);
      if (taskMatch && !recentTaskTitle) {
        recentTaskTitle = taskMatch[1].trim();
      }
    }

    if (recentProjectName) {
      if (lower.includes(' it ') || lower.endsWith(' it') || lower.includes(' this ') || lower.includes(' that ')) {
        resolvedPronouns['it'] = `Project: ${recentProjectName}`;
        resolvedPronouns['this'] = `Project: ${recentProjectName}`;
      }
    }

    // 4. Determine Primary Intent
    let primaryIntent: PrimaryIntent = 'QUESTION';
    let decisionPolicy: DecisionPolicy = 'DIRECT_ANSWER';
    let actionRequired = false;

    // Correction check: "no, I meant...", "actually, that's wrong"
    if (
      lower.startsWith('no ') ||
      lower.startsWith('actually ') ||
      lower.includes("that's not what i meant") ||
      lower.includes('correct that') ||
      lower.includes('i meant ')
    ) {
      primaryIntent = 'CORRECTION';
      decisionPolicy = 'CONTEXTUAL_RESPONSE';
    }
    // Complaint / Frustration check
    else if (detectedEmotion === 'FRUSTRATED' || lower.includes('becoming a mess')) {
      primaryIntent = 'COMPLAINT_OR_FRUSTRATION';
      decisionPolicy = 'RECOMMENDATION';
    }
    // Implicit assistance check: "I have a lot to finish today", "I'm overwhelmed"
    else if (
      detectedEmotion === 'OVERWHELMED' ||
      lower.includes('a lot to finish today') ||
      lower.includes('too many things')
    ) {
      primaryIntent = 'IMPLICIT_ASSISTANCE_REQUEST';
      decisionPolicy = 'RECOMMENDATION';
    }
    // Advice request check: "what should I do first?", "how would you approach this?"
    else if (
      lower.includes('what should i do') ||
      lower.includes('what should i focus on') ||
      lower.includes('where should i start') ||
      lower.includes('give me advice') ||
      lower.includes('how should i prioritize')
    ) {
      primaryIntent = 'REQUEST_ADVICE';
      decisionPolicy = 'RECOMMENDATION';
    }
    // Explicit Action check: "create task", "delete", "start focus timer", "schedule"
    else if (
      lower.startsWith('create ') ||
      lower.startsWith('add ') ||
      lower.startsWith('delete ') ||
      lower.startsWith('remove ') ||
      lower.startsWith('complete ') ||
      lower.startsWith('start focus') ||
      lower.startsWith('set a reminder') ||
      lower.startsWith('schedule ')
    ) {
      primaryIntent = 'REQUEST_ACTION';
      decisionPolicy = 'ACTION';
      actionRequired = true;
    }
    // Preference statement check: "I prefer working in the morning", "Always keep answers brief"
    else if (
      lower.includes('i prefer') ||
      lower.includes('my preference is') ||
      lower.includes('always keep') ||
      lower.includes('i like to') ||
      lower.includes('remember that i')
    ) {
      primaryIntent = 'PREFERENCE_STATEMENT';
      decisionPolicy = 'CONTEXTUAL_RESPONSE';
    }
    // Follow-up question: "and what about the deadline?", "why?", "which one?"
    else if (
      lower.startsWith('and ') ||
      lower.startsWith('what about') ||
      lower.startsWith('why ') ||
      lower.startsWith('which one') ||
      lower.startsWith('how about')
    ) {
      primaryIntent = 'FOLLOW_UP';
      decisionPolicy = 'CONTEXTUAL_RESPONSE';
    }
    // Context statement: "I am working on the website project", "Client wants it finished this week"
    else if (
      lower.startsWith('i am working on') ||
      lower.includes('the client wants') ||
      lower.startsWith('just letting you know')
    ) {
      primaryIntent = 'CONTEXT_STATEMENT';
      decisionPolicy = 'CONTEXTUAL_RESPONSE';
    }
    // Plan request: "plan my day", "reorganize schedule"
    else if (
      lower.includes('plan my day') ||
      lower.includes('reorganize') ||
      lower.includes('build schedule') ||
      lower.includes('smart plan')
    ) {
      primaryIntent = 'INSTRUCTION';
      decisionPolicy = 'PLAN';
    }

    // Greeting or Smalltalk check
    else if (
      lower.startsWith('hello') ||
      lower.startsWith('hi ') ||
      lower === 'hi' ||
      lower.startsWith('hey') ||
      lower.startsWith('good morning') ||
      lower.startsWith('good afternoon') ||
      lower.startsWith('good evening')
    ) {
      primaryIntent = 'GREETING_OR_SMALLTALK';
      decisionPolicy = 'DIRECT_ANSWER';
    }

    // 5. Urgency Calculation
    let urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'MEDIUM';
    if (userPacing === 'IN_A_HURRY' || lower.includes('urgent') || lower.includes('critical')) {
      urgency = 'HIGH';
    } else if (lower.includes('emergency') || lower.includes('crisis')) {
      urgency = 'CRITICAL';
    } else if (primaryIntent === 'CONTEXT_STATEMENT' || (primaryIntent as string) === 'GREETING_OR_SMALLTALK') {
      urgency = 'LOW';
    }

    return {
      primaryIntent,
      decisionPolicy,
      userObjective: trimmed,
      entities: {
        projects: recentProjectName ? [recentProjectName] : [],
        tasks: recentTaskTitle ? [recentTaskTitle] : [],
        dates: [],
        topics: [],
      },
      contextReferences: {
        resolvedPronouns,
        referredEntityId,
        referredEntityType,
      },
      urgency,
      ambiguityLevel: primaryIntent === 'IMPLICIT_ASSISTANCE_REQUEST' ? 'LOW' : 'NONE',
      actionRequired,
      userPacing,
      detectedEmotion,
      confidence: 0.92,
    };
  }
}
