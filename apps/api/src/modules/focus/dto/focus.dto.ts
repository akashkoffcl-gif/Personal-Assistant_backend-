export class StartFocusSessionDto {
  plannedDurationMinutes?: number; // default from preferences or 25
  sessionType?: string; // "FOCUS", "SHORT_BREAK", "LONG_BREAK"
  taskId?: string;
  projectId?: string;
  notes?: string;
}

export class PauseFocusSessionDto {
  reason?: string;
}

export class CompleteFocusSessionDto {
  notes?: string;
}

export class UpdateFocusPreferencesDto {
  focusDurationMinutes?: number;
  shortBreakMinutes?: number;
  longBreakMinutes?: number;
  longBreakInterval?: number;
  dailyTargetMinutes?: number;
  soundEnabled?: boolean;
  autoStartBreaks?: boolean;
  autoStartFocus?: boolean;
}

