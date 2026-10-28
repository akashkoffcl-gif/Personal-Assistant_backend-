import {
  TaskDto,
  RoutineDto,
  RoutineOccurrenceDto,
  SchedulePlanDto,
  ScheduleChangeDto,
  WellnessMetricDto,
  WellnessSummaryDto,
  DailyKpiSummary,
  UserSettingsDto,
  TaskCategory,
  TaskStatus,
  PushSubscriptionPayload,
} from '@assistant/shared';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

async function fetcher<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.message || 'API request failed');
  }

  return (json.data !== undefined ? json.data : json) as T;
}

export const api = {
  // Tasks
  getTasks: (params?: { category?: TaskCategory; status?: TaskStatus; date?: string }) => {
    const query = new URLSearchParams();
    if (params?.category) query.set('category', params.category);
    if (params?.status) query.set('status', params.status);
    if (params?.date) query.set('date', params.date);
    return fetcher<TaskDto[]>(`/tasks?${query.toString()}`);
  },
  createTask: (data: any) => fetcher<TaskDto>('/tasks', { method: 'POST', body: JSON.stringify(data) }),
  updateTask: (id: string, data: any) => fetcher<TaskDto>(`/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  completeTask: (id: string) => fetcher<TaskDto>(`/tasks/${id}/complete`, { method: 'POST' }),
  snoozeTask: (id: string, minutes = 15, reason?: string) =>
    fetcher<TaskDto>(`/tasks/${id}/snooze`, { method: 'POST', body: JSON.stringify({ minutes, reason }) }),
  rescheduleTask: (id: string, scheduledStartTime: string, scheduledEndTime?: string) =>
    fetcher<TaskDto>(`/tasks/${id}/reschedule`, { method: 'POST', body: JSON.stringify({ scheduledStartTime, scheduledEndTime }) }),
  deleteTask: (id: string) => fetcher<{ success: boolean }>(`/tasks/${id}`, { method: 'DELETE' }),
  getTaskEvents: (id: string) => fetcher<any[]>(`/tasks/${id}/events`),

  // Routines
  getRoutines: () => fetcher<RoutineDto[]>('/routines'),
  createRoutine: (data: any) => fetcher<RoutineDto>('/routines', { method: 'POST', body: JSON.stringify(data) }),
  getOccurrences: (date: string) => fetcher<RoutineOccurrenceDto[]>(`/routines/occurrences/${date}`),
  recordOccurrence: (id: string, data: { status: TaskStatus; actualQuantity?: number; notes?: string }) =>
    fetcher<RoutineOccurrenceDto>(`/routines/occurrences/${id}/record`, { method: 'POST', body: JSON.stringify(data) }),
  deleteRoutine: (id: string) => fetcher<{ success: boolean }>(`/routines/${id}`, { method: 'DELETE' }),

  // Day-Specific Planning
  getDayPlan: (date: string) => fetcher<any>(`/plans/${date}`),
  lockPlan: (date: string, isLocked: boolean) => fetcher<{ success: boolean }>(`/plans/${date}/lock`, { method: 'POST', body: JSON.stringify({ isLocked }) }),

  // Emergencies & Schedule Changes
  createEmergency: (data: any) => fetcher<any>('/emergencies', { method: 'POST', body: JSON.stringify(data) }),
  getScheduleChanges: () => fetcher<ScheduleChangeDto[]>('/schedule-changes'),
  cancelEmergency: (id: string) => fetcher<{ success: boolean }>(`/emergencies/${id}/cancel`, { method: 'POST' }),

  // Notifications
  getVapidPublicKey: () => fetcher<{ publicKey: string }>('/notifications/vapid-public-key'),
  subscribePush: (payload: PushSubscriptionPayload) =>
    fetcher<{ success: boolean; subscription: any }>('/notifications/subscribe', { method: 'POST', body: JSON.stringify(payload) }),
  sendTestPush: () => fetcher<any>('/notifications/test', { method: 'POST' }),

  // Wellness
  logWellnessMetric: (data: any) => fetcher<WellnessMetricDto>('/wellness/metrics', { method: 'POST', body: JSON.stringify(data) }),
  recordCheckIn: (data: any) => fetcher<any>('/wellness/check-in', { method: 'POST', body: JSON.stringify(data) }),
  getWellnessSummary: (date: string) => fetcher<WellnessSummaryDto & { checkIn: any }>(`/wellness/summary?date=${date}`),
  clearWellnessRecords: () => fetcher<{ success: boolean }>('/wellness/records', { method: 'DELETE' }),

  // Analytics
  getDailyKpi: (date: string) => fetcher<DailyKpiSummary>(`/analytics/daily?date=${date}`),
  getTrends: (days = 7) => fetcher<any>(`/analytics/trends?days=${days}`),

  // Settings
  getSettings: () => fetcher<UserSettingsDto>('/settings'),
  updateSettings: (data: any) => fetcher<UserSettingsDto>('/settings', { method: 'PATCH', body: JSON.stringify(data) }),
  exportUserData: () => fetcher<any>('/settings/export'),
};

