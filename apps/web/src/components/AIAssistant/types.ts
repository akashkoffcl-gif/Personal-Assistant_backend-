export type AssistantInvocationState =
  | 'HIDDEN'
  | 'IDLE'
  | 'WAKE_LISTENING'
  | 'ACTIVATING'
  | 'LISTENING'
  | 'REQUEST_LISTENING'
  | 'TRANSCRIBING'
  | 'UNDERSTANDING'
  | 'THINKING'
  | 'PLANNING'
  | 'AWAITING_APPROVAL'
  | 'AWAITING_CONFIRMATION'
  | 'EXECUTING'
  | 'EXECUTING_ACTION'
  | 'SPEAKING'
  | 'INTERRUPTED'
  | 'CANCELLED'
  | 'ERROR'
  | 'CLOSING';

export type AvatarState =
  | 'idle'
  | 'listening'
  | 'thinking'
  | 'planning'
  | 'speaking'
  | 'executing'
  | 'awaiting_approval'
  | 'success'
  | 'warning'
  | 'error';

export interface WorkflowStepProgress {
  stepId: string;
  toolId: string;
  description: string;
  status: 'PENDING' | 'EXECUTING' | 'COMPLETED' | 'FAILED' | 'SKIPPED' | 'COMPENSATED';
  progressPercent: number;
  result?: any;
  error?: string;
}

export interface WorkflowExecutionProgress {
  workflowId: string;
  status: 'STARTED' | 'RUNNING' | 'COMPENSATED' | 'COMPLETED' | 'PARTIALLY_COMPLETED' | 'FAILED';
  currentStepId?: string;
  progressPercent: number;
  message: string;
  steps: WorkflowStepProgress[];
}

export interface ActionProposal {
  id: string;
  actionType: 'CREATE_TASK' | 'START_FOCUS' | 'CREATE_REMINDER' | 'CREATE_GOAL' | 'CREATE_NOTE' | 'FINISH_FOCUS' | 'APPLY_DAY_PLAN' | 'MULTI_STEP_WORKFLOW' | string;
  description: string;
  payload: any;
  status: 'DRAFT' | 'PROPOSED' | 'CONFIRMED' | 'RUNNING' | 'COMPLETED' | 'EXECUTED' | 'REJECTED' | 'FAILED' | 'PARTIALLY_COMPLETED' | 'COMPENSATED' | 'CANCELLED';
  createdAt?: string;
}

export interface AssistantMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  toolUsed?: string | null;
  toolResults?: any;
  actionProposal?: ActionProposal | null;
}

export interface AIAssistantSettingsState {
  assistantName: string; // Customizable name e.g. "Nova", "Jarvis", "Friday", "Selma AI"
  wakeWordEnabled: boolean; // Voice activation by speaking its name
  voiceURI: string;
  speechRate: number; // 0.8 to 1.4
  autoVoiceResponse: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string; // "22:00"
  quietHoursEnd: string; // "07:00"
  maskFinanceAmounts: boolean;
  hapticFeedback: boolean;
  autoBackgroundAnalysis: boolean; // Continuous backend analysis of user progress
}

