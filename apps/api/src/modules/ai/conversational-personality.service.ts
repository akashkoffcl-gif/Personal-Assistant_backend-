import { Injectable } from '@nestjs/common';
import { StructuredIntentAnalysis } from './conversational-intent.types';
import { UserBehaviourProfile } from './behavioral-context.service';

export interface PromptGuidance {
  toneInstruction: string;
  concisenessGuidance: string;
  personalityPointers: string[];
  speechPacingHint: string;
}

@Injectable()
export class ConversationalPersonalityEngine {
  /**
   * Generates situational personality directives and stylistic framing for the model.
   */
  generateStyleDirectives(
    intent: StructuredIntentAnalysis,
    profile: UserBehaviourProfile,
    assistantName = 'Nova',
  ): PromptGuidance {
    const pointers: string[] = [
      `Your name is ${assistantName}. You are a composed, highly capable personal executive partner.`,
      `Never say "How can I assist you today?" or "I have processed your request." Speak directly and naturally.`,
      `Never use robotic confirmation formulas like "Your task has been successfully created." Instead say: "I've logged that task for you."`,
      `Avoid excessive markdown bullet points unless presenting a structured schedule or multi-item breakdown.`,
    ];

    let toneInstruction = 'Calm, confident, articulate, and focused.';
    let concisenessGuidance = 'Balanced: clear, conversational, and direct.';
    let speechPacingHint = '1.0x normal speech cadence.';

    // 1. Frustration / Difficulty Handling
    if (intent.detectedEmotion === 'FRUSTRATED' || intent.primaryIntent === 'COMPLAINT_OR_FRUSTRATION') {
      toneInstruction = 'Empathetic, reassuring, grounded, and solution-oriented.';
      pointers.push(
        'Acknowledge the pressure or difficulty calmly without patronizing.',
        'Offer to identify the immediate bottlenecks before jumping into creating more tasks.',
      );
    }
    // 2. Uncertainty / Overwhelmed Handling
    else if (intent.detectedEmotion === 'UNCERTAIN' || intent.detectedEmotion === 'OVERWHELMED') {
      toneInstruction = 'Clarifying, supportive, and structured.';
      pointers.push(
        'Help clarify priorities. Compare available items and suggest the single most effective next step.',
      );
    }
    // 3. User in a Hurry / Urgency
    else if (intent.userPacing === 'IN_A_HURRY' || intent.urgency === 'HIGH') {
      toneInstruction = 'Direct, rapid, razor-sharp, and unembellished.';
      concisenessGuidance = 'Extremely concise: 1 to 2 crisp sentences. Zero pleasantries.';
      speechPacingHint = '1.15x rapid, crisp speech cadence.';
      pointers.push('Give the immediate answer or top priority instantly.');
    }
    // 4. Achievement / Excitement
    else if (intent.detectedEmotion === 'EXCITED') {
      toneInstruction = 'Warm, affirming, and encouraging.';
      pointers.push('Celebrate the milestone naturally before proposing further action.');
    }
    // 5. Implicit Request Handling
    else if (intent.primaryIntent === 'IMPLICIT_ASSISTANCE_REQUEST') {
      toneInstruction = 'Attentive and proactive.';
      pointers.push(
        'The user is sharing context or stress. Do NOT forcefully create tasks. Instead, offer to review their schedule or clear their plate.',
      );
    }

    // Adapt to persistent user profile preference
    if (profile.preferredPacing === 'CONCISE' && intent.userPacing !== 'REFLECTIVE') {
      concisenessGuidance = 'Concise: keep replies compact and focused on essential facts.';
    }

    return {
      toneInstruction,
      concisenessGuidance,
      personalityPointers: pointers,
      speechPacingHint,
    };
  }
}

