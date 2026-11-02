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
  ProjectDto,
  AutomationRuleDto,
  AutomationRuleExecutionDto,
} from '@assistant/shared';
import { supabase } from './supabaseClient';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

let memoryToken: string | null = null;

export function setApiAuthToken(token: string | null) {
  memoryToken = token;
}

export function getApiAuthToken(): string | null {
  return memoryToken;
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  if (memoryToken) {
    return { Authorization: `Bearer ${memoryToken}` };
  }
  if (typeof window !== 'undefined') {
    try {
      const { data } = await supabase.auth.getSession();
      if (data?.session?.access_token) {
        memoryToken = data.session.access_token;
        return { Authorization: `Bearer ${data.session.access_token}` };
      }
    } catch {
      // ignore
    }
  }
  return {};
}

interface FetcherOptions extends RequestInit {
  timeoutMs?: number;
  retries?: number;
  idempotencyKey?: string;
}

/**
 * Resilient fetcher with request timeout, exponential backoff with jitter for idempotent requests,
 * and graceful error handling.
 */
async function fetcher<T>(endpoint: string, options?: FetcherOptions): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const method = (options?.method || 'GET').toUpperCase();
  const isIdempotent = method === 'GET' || Boolean(options?.idempotencyKey);
  const maxRetries = options?.retries !== undefined ? options.retries : (isIdempotent ? 2 : 0);
  const timeoutMs = options?.timeoutMs || 12000;

  let attempt = 0;
  let lastError: Error | null = null;

  while (attempt <= maxRetries) {
    const controller = new AbortController();
    const timeoutTimer = setTimeout(() => {
      controller.abort();
    }, timeoutMs);

    // Merge external signal if passed
    if (options?.signal) {
      options.signal.addEventListener('abort', () => controller.abort());
    }

    try {
      const authHeaders = await getAuthHeaders();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...authHeaders,
        ...(options?.idempotencyKey ? { 'Idempotency-Key': options.idempotencyKey } : {}),
        ...((options?.headers as Record<string, string>) || {}),
      };

      const res = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers,
      });

      clearTimeout(timeoutTimer);

      // Handle 204 No Content
      if (res.status === 204) {
        return {} as T;
      }

      const text = await res.text();
      let json: any = {};
      try {
        json = text ? JSON.parse(text) : {};
      } catch {
        json = { message: text || `HTTP error ${res.status}` };
      }

      if (!res.ok) {
        // If 5xx transient server error on an idempotent request, retry
        if (res.status >= 500 && attempt < maxRetries && isIdempotent) {
          attempt++;
          const jitter = Math.floor(Math.random() * 300);
          const delay = Math.min(1000 * Math.pow(2, attempt) + jitter, 4000);
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }

        throw new Error(json.message || `API request failed with status ${res.status}`);
      }

      return (json.data !== undefined ? json.data : json) as T;
    } catch (err: any) {
      clearTimeout(timeoutTimer);
      lastError = err?.name === 'AbortError' ? new Error(`Request timed out after ${timeoutMs}ms`) : err;

      if (attempt < maxRetries && isIdempotent) {
        attempt++;
        const jitter = Math.floor(Math.random() * 300);
        const delay = Math.min(1000 * Math.pow(2, attempt) + jitter, 4000);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      break;
    }
  }

  throw lastError || new Error('Network request failed');
}

export const api = {
  // Auth & Profile
  getAuthProfile: () => fetcher<{ user: { id: string; email: string; fullName?: string; timezone: string } }>('/auth/me'),
  updateAuthProfile: (data: { fullName?: string; timezone?: string; dateFormat?: string }) =>
    fetcher<any>('/auth/profile', { method: 'PATCH', body: JSON.stringify(data) }),

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
  updateRoutine: (id: string, data: any) => fetcher<RoutineDto>(`/routines/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  getOccurrences: (date: string) => fetcher<RoutineOccurrenceDto[]>(`/routines/occurrences/${date}`),
  recordOccurrence: (id: string, data: { status: TaskStatus; actualQuantity?: number; notes?: string }) =>
    fetcher<RoutineOccurrenceDto>(`/routines/occurrences/${id}/record`, { method: 'POST', body: JSON.stringify(data) }),
  completeOccurrence: (id: string, actualQuantity?: number) =>
    fetcher<RoutineOccurrenceDto>(`/routines/occurrences/${id}/complete`, { method: 'POST', body: JSON.stringify({ actualQuantity }) }),
  deleteRoutine: (id: string) => fetcher<{ success: boolean }>(`/routines/${id}`, { method: 'DELETE' }),

  // Automated Follow-Ups (Phase 23 Engine)
  getPendingFollowUps: () => fetcher<any[]>('/follow-ups/pending'),
  respondToFollowUp: (data: {
    followUpId?: string;
    taskId?: string;
    routineId?: string;
    occurrenceId?: string;
    action: 'COMPLETED' | 'PARTIALLY_COMPLETED' | 'STILL_WORKING' | 'RESCHEDULE' | 'SKIPPED';
    progressPercent?: number;
    revisedEndTime?: string;
    rescheduleDate?: string;
    actualQuantity?: number;
    notes?: string;
  }) => fetcher<any>('/follow-ups/respond', { method: 'POST', body: JSON.stringify(data) }),

  // Day-Specific Planning
  getDayPlan: (date: string) => fetcher<any>(`/plans/${date}`),
  lockPlan: (date: string, isLocked: boolean) => fetcher<{ success: boolean }>(`/plans/${date}/lock`, { method: 'POST', body: JSON.stringify({ isLocked }) }),
  lockDayPlan: (date: string) => fetcher<SchedulePlanDto>(`/schedule/plan/lock`, { method: 'POST', body: JSON.stringify({ date }) }),

  // Projects
  getProjects: (status?: string) => {
    const q = status ? `?status=${status}` : '';
    return fetcher<ProjectDto[]>(`/projects${q}`);
  },
  getProject: (id: string) => fetcher<ProjectDto>(`/projects/${id}`),
  createProject: (data: any) => fetcher<ProjectDto>('/projects', { method: 'POST', body: JSON.stringify(data) }),
  updateProject: (id: string, data: any) => fetcher<ProjectDto>(`/projects/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteProject: (id: string) => fetcher<{ success: boolean }>(`/projects/${id}`, { method: 'DELETE' }),

  // Automation
  getAutomationRules: () => fetcher<AutomationRuleDto[]>('/automation/rules'),
  createAutomationRule: (data: any) => fetcher<AutomationRuleDto>('/automation/rules', { method: 'POST', body: JSON.stringify(data) }),
  updateAutomationRule: (id: string, data: any) => fetcher<AutomationRuleDto>(`/automation/rules/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  toggleAutomationRule: (id: string, isEnabled: boolean) =>
    fetcher<AutomationRuleDto>(`/automation/rules/${id}/toggle`, { method: 'POST', body: JSON.stringify({ isEnabled }) }),
  deleteAutomationRule: (id: string) => fetcher<{ success: boolean }>(`/automation/rules/${id}`, { method: 'DELETE' }),
  getAutomationExecutions: (ruleId?: string) => {
    const q = ruleId ? `?ruleId=${ruleId}` : '';
    return fetcher<AutomationRuleExecutionDto[]>(`/automation/executions${q}`);
  },
  evaluateAutomationRules: () => fetcher<{ evaluated: number; executed: number }>('/automation/evaluate', { method: 'POST' }),

  // Emergencies & Schedule Changes
  createEmergency: (data: any) => fetcher<any>('/emergencies', { method: 'POST', body: JSON.stringify(data) }),
  triggerEmergency: (data: any) => fetcher<any>('/schedule/emergency', { method: 'POST', body: JSON.stringify(data) }),
  getScheduleChanges: () => fetcher<ScheduleChangeDto[]>('/schedule-changes'),
  cancelEmergency: (id: string) => fetcher<{ success: boolean }>(`/emergencies/${id}/cancel`, { method: 'POST' }),

  // Notifications & In-App Center
  getVapidPublicKey: () => fetcher<{ publicKey: string }>('/notifications/vapid-public-key'),
  subscribePush: (payload: PushSubscriptionPayload) =>
    fetcher<{ success: boolean; subscription: any }>('/notifications/subscribe', { method: 'POST', body: JSON.stringify(payload) }),
  sendTestPush: () => fetcher<any>('/notifications/test', { method: 'POST' }),
  getNotifications: (params?: { category?: string; unreadOnly?: boolean; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.category) q.set('category', params.category);
    if (params?.unreadOnly !== undefined) q.set('unreadOnly', String(params.unreadOnly));
    if (params?.limit) q.set('limit', String(params.limit));
    return fetcher<{ unreadCount: number; totalCount: number; notifications: any[] }>(`/notifications?${q.toString()}`);
  },
  markNotificationRead: (id: string) => fetcher<{ success: boolean }>(`/notifications/${id}/read`, { method: 'PATCH' }),
  markAllNotificationsRead: () => fetcher<{ success: boolean; count: number }>('/notifications/read-all', { method: 'POST' }),
  deleteNotification: (id: string) => fetcher<{ success: boolean }>(`/notifications/${id}`, { method: 'DELETE' }),
  createInAppNotification: (data: { title: string; message: string; category?: string; severity?: string; actionUrl?: string; metadata?: any }) =>
    fetcher<{ success: boolean; notification: any }>('/notifications/in-app', { method: 'POST', body: JSON.stringify(data) }),

  // Wellness
  getWellnessMetrics: (params?: { type?: string; date?: string; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.type) q.set('type', params.type);
    if (params?.date) q.set('date', params.date);
    if (params?.limit) q.set('limit', String(params.limit));
    const qs = q.toString();
    return fetcher<WellnessMetricDto[]>(`/wellness/metrics${qs ? `?${qs}` : ''}`);
  },
  logWellnessMetric: (data: any) => fetcher<WellnessMetricDto>('/wellness/metrics', { method: 'POST', body: JSON.stringify(data) }),
  updateWellnessMetric: (id: string, data: any) =>
    fetcher<WellnessMetricDto>(`/wellness/metrics/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteWellnessMetric: (id: string) =>
    fetcher<{ success: boolean; id: string }>(`/wellness/metrics/${id}`, { method: 'DELETE' }),
  recordCheckIn: (data: any) => fetcher<any>('/wellness/check-in', { method: 'POST', body: JSON.stringify(data) }),
  getWellnessSummary: (date: string) => fetcher<WellnessSummaryDto & { checkIn: any }>(`/wellness/summary?date=${date}`),
  clearWellnessRecords: () => fetcher<{ success: boolean }>('/wellness/records', { method: 'DELETE' }),

  // Personal Productivity Analytics (Domain A)
  getDailyKpi: (date: string) => fetcher<DailyKpiSummary>(`/analytics/daily?date=${date}`),
  getTrends: (days = 7) => fetcher<any>(`/analytics/trends?days=${days}`),
  getCommandCenterAnalytics: (date: string, range = 7) =>
    fetcher<any>(`/analytics/command-center?date=${date}&range=${range}`),

  // Application Usage Analytics (Domain B)
  getUsageOverview: (days = 30) => fetcher<any>(`/analytics/usage/overview?days=${days}`),
  getUsageTrends: (days = 14) => fetcher<any>(`/analytics/usage/trends?days=${days}`),
  getUsageModules: (days = 30) => fetcher<any>(`/analytics/usage/modules?days=${days}`),
  getUsageFeatures: (days = 30) => fetcher<any>(`/analytics/usage/features?days=${days}`),
  getUsageAutomation: (days = 30) => fetcher<any>(`/analytics/usage/automation?days=${days}`),
  getUsageReminders: (days = 30) => fetcher<any>(`/analytics/usage/reminders?days=${days}`),
  getUsageEvents: (params?: { page?: number; limit?: number; module?: string; feature?: string; status?: string; startDate?: string; endDate?: string }) => {
    const q = new URLSearchParams();
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    if (params?.module) q.set('module', params.module);
    if (params?.feature) q.set('feature', params.feature);
    if (params?.status) q.set('status', params.status);
    if (params?.startDate) q.set('startDate', params.startDate);
    if (params?.endDate) q.set('endDate', params.endDate);
    return fetcher<any>(`/analytics/usage/events?${q.toString()}`);
  },
  recordUsageEvent: (data: { eventName: string; module: string; feature: string; action?: string; status?: string; metadata?: any; idempotencyKey?: string }) =>
    fetcher<any>('/analytics/usage/events', { method: 'POST', body: JSON.stringify(data) }),

  // Settings
  getSettings: () => fetcher<UserSettingsDto>('/settings'),
  updateSettings: (data: any) => fetcher<UserSettingsDto>('/settings', { method: 'PATCH', body: JSON.stringify(data) }),
  exportUserData: () => fetcher<any>('/settings/export'),
  deleteAccount: () => fetcher<{ success: boolean }>('/settings/account', { method: 'DELETE' }),
};
