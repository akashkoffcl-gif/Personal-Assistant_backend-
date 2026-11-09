export type ProactiveUrgency = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type ProactiveAction = 'NOTIFY' | 'SUGGEST' | 'ASK' | 'SILENCE';

export interface ProactiveOpportunity {
  id: string;
  category:
    | 'DEADLINE_RISK'
    | 'UNRESOLVED_BLOCKER'
    | 'MEETING_PREPARATION'
    | 'PROTECTED_FOCUS_TIME'
    | 'MILESTONE_NEXT_STEP'
    | 'ROUTINE_DRIFT'
    | 'SCHEDULE_CONFLICT';
  title: string;
  naturalMessage: string;
  rationale: string;
  action: ProactiveAction;
  urgency: ProactiveUrgency;
  confidence: number;
  relatedEntity?: {
    type: 'project' | 'task' | 'routine' | 'meeting';
    id: string;
    name: string;
  };
  interruptionPermitted: boolean;
  suppressionReason?: string;
}

export interface InterruptionContext {
  inQuietHours: boolean;
  isFocusSessionActive: boolean;
  isMeetingActive: boolean;
  lastProactiveTimeMs?: number;
  suppressNonCritical: boolean;
}

