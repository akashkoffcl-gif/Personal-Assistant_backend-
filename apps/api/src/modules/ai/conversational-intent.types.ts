export type PrimaryIntent =
  | 'QUESTION'
  | 'REQUEST_ACTION'
  | 'INSTRUCTION'
  | 'SUGGESTION'
  | 'COMPLAINT_OR_FRUSTRATION'
  | 'PREFERENCE_STATEMENT'
  | 'CORRECTION'
  | 'FOLLOW_UP'
  | 'REQUEST_ADVICE'
  | 'EMOTIONAL_DISCLOSURE'
  | 'CONTEXT_STATEMENT'
  | 'IMPLICIT_ASSISTANCE_REQUEST'
  | 'GREETING_OR_SMALLTALK';

export type DecisionPolicy =
  | 'DIRECT_ANSWER'
  | 'CONTEXTUAL_RESPONSE'
  | 'RECOMMENDATION'
  | 'CLARIFICATION'
  | 'PLAN'
  | 'ACTION'
  | 'PROACTIVE_SUGGESTION';

export type UserPacing = 'IN_A_HURRY' | 'MEASURED' | 'REFLECTIVE' | 'NORMAL';
export type UserEmotionalTone = 'FRUSTRATED' | 'UNCERTAIN' | 'EXCITED' | 'OVERWHELMED' | 'CALM';

export interface StructuredIntentAnalysis {
  primaryIntent: PrimaryIntent;
  secondaryIntent?: string;
  decisionPolicy: DecisionPolicy;
  userObjective: string;
  entities: {
    projects: string[];
    tasks: string[];
    dates: string[];
    topics: string[];
  };
  contextReferences: {
    resolvedPronouns: Record<string, string>;
    referredEntityId?: string;
    referredEntityType?: 'project' | 'task' | 'note' | 'budget';
  };
  urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  ambiguityLevel: 'NONE' | 'LOW' | 'MODERATE' | 'HIGH';
  clarificationRequired?: string;
  actionRequired: boolean;
  userPacing: UserPacing;
  detectedEmotion?: UserEmotionalTone;
  confidence: number;
}

