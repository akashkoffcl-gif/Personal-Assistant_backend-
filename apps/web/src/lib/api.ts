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

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL
    ? process.env.NEXT_PUBLIC_API_URL.replace(/\/+$/, '')
    : (typeof window !== 'undefined'
        ? '/api/v1'
        : 'https://nova-assistant-api.onrender.com/api/v1');

let memoryToken: string | null = null;

export function setApiAuthToken(token: string | null) {
  memoryToken = token;
}

export function getApiAuthToken(): string | null {
  return memoryToken;
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  if (typeof window !== 'undefined') {
    // 1. Direct memory or explicitly stored tokens
    const directToken =
      memoryToken ||
      localStorage.getItem('assistant_token') ||
      localStorage.getItem('supabase_access_token') ||
      localStorage.getItem('access_token');

    if (directToken) {
      memoryToken = directToken;
      return { Authorization: `Bearer ${directToken}` };
    }

    // 2. Supabase Auth Session Token stored under storageKey 'assistant_auth_token'
    try {
      const storedAuth = localStorage.getItem('assistant_auth_token');
      if (storedAuth) {
        const parsed = JSON.parse(storedAuth);
        const token = parsed?.access_token || parsed?.currentSession?.access_token;
        if (token) {
          memoryToken = token;
          return { Authorization: `Bearer ${token}` };
        }
      }
    } catch (e) {
      // Fallback silently if storage entry is non-JSON
    }

    // 3. Scan for any default Supabase storage keys (e.g. sb-*-auth-token)
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('sb-') || key.includes('auth-token'))) {
          const val = localStorage.getItem(key);
          if (val && val.startsWith('{')) {
            const parsed = JSON.parse(val);
            const token = parsed?.access_token || parsed?.currentSession?.access_token;
            if (token) {
              memoryToken = token;
              return { Authorization: `Bearer ${token}` };
            }
          }
        }
      }
    } catch (e) {}
  }
  return memoryToken ? { Authorization: `Bearer ${memoryToken}` } : {};
}

interface FetcherOptions extends RequestInit {
  timeoutMs?: number;
  retries?: number;
  idempotencyKey?: string;
}

export class ApiTimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`Request timed out after ${timeoutMs}ms`);
    this.name = 'ApiTimeoutError';
  }
}

export class ApiAbortError extends Error {
  constructor(reason?: string) {
    super(reason || 'Request was aborted');
    this.name = 'ApiAbortError';
  }
}

/**
 * Categorical Request Timeout Policy
 * Eliminates the fragile uniform 15-second clamp across all endpoints.
 */
function resolveTimeout(endpoint: string, explicitTimeout?: number): number {
  if (explicitTimeout !== undefined && explicitTimeout > 0) {
    return explicitTimeout;
  }
  if (endpoint.startsWith('/ai/chat') || endpoint.startsWith('/ai/planner')) {
    return 90000; // 90 seconds for heavy LLM & day planning operations
  }
  if (endpoint.startsWith('/ai/')) {
    return 30000; // 30 seconds for personal context retrieval (briefings, status, history)
  }
  if (endpoint.startsWith('/analytics/')) {
    return 45000; // 45 seconds for multi-day command center aggregations
  }
  if (endpoint.startsWith('/wellness/summary') || endpoint.startsWith('/plans/')) {
    return 30000; // 30 seconds for complex schedule & wellness cross-aggregations
  }
  return 15000; // Default 15 seconds for basic CRUD
}

/**
 * Resilient fetcher with proper AbortController and timeout lifecycle management.
 * - Guarantees timeout timer is cleared upon response or error.
 * - Cleans up external abort listeners to avoid memory leaks.
 * - Distinguishes between intentional caller aborts and internal timeouts.
 * - Prevents sensitive credentials (Authorization Bearer tokens) from ever being logged.
 */
async function fetcher<T>(endpoint: string, options?: FetcherOptions): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const method = (options?.method || 'GET').toUpperCase();
  const isIdempotent = method === 'GET' || Boolean(options?.idempotencyKey);
  const maxRetries = options?.retries !== undefined ? options.retries : (isIdempotent ? 2 : 0);
  const timeoutMs = resolveTimeout(endpoint, options?.timeoutMs);

  let attempt = 0;
  let lastError: Error | null = null;

  while (attempt <= maxRetries) {
    const controller = new AbortController();
    let isTimedOut = false;

    const timeoutTimer = setTimeout(() => {
      isTimedOut = true;
      controller.abort(new ApiTimeoutError(timeoutMs));
    }, timeoutMs);

    // Merge external signal if passed and clean up listener afterwards
    let removeExternalAbortListener: (() => void) | null = null;
    if (options?.signal) {
      if (options.signal.aborted) {
        clearTimeout(timeoutTimer);
        throw new ApiAbortError((options.signal as any).reason?.toString?.() || 'Caller signal already aborted');
      }
      const onExternalAbort = () => {
        controller.abort(new ApiAbortError((options?.signal as any)?.reason?.toString?.() || 'Caller aborted request'));
      };
      options.signal.addEventListener('abort', onExternalAbort, { once: true });
      removeExternalAbortListener = () => {
        options?.signal?.removeEventListener('abort', onExternalAbort);
      };
    }

    try {
      const authHeaders = await getAuthHeaders();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...authHeaders,
        ...(options?.idempotencyKey ? { 'Idempotency-Key': options.idempotencyKey } : {}),
        ...((options?.headers as Record<string, string>) || {}),
      };

      // Safe logging: Never log Authorization or JWT values
      console.log(`[API ${method}]`, endpoint, { attempt: attempt > 0 ? attempt : undefined });

      const res = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers,
      });

      clearTimeout(timeoutTimer);
      if (removeExternalAbortListener) removeExternalAbortListener();

      console.log(`[API ${method} COMPLETE]`, endpoint, res.status);

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
        // If 5xx transient server error on an idempotent request, retry with jitter
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
      if (removeExternalAbortListener) removeExternalAbortListener();

      if (isTimedOut || err?.name === 'ApiTimeoutError') {
        lastError = new ApiTimeoutError(timeoutMs);
      } else if (err?.name === 'AbortError' || err?.name === 'ApiAbortError') {
        lastError = new ApiAbortError(err.message || 'Request cancelled');
        // Do not retry intentional aborts
        break;
      } else {
        lastError = err;
      }

      if (attempt < maxRetries && isIdempotent && !(lastError instanceof ApiAbortError)) {
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

  // Focus Studio & Deep Work (Phase 27)
  getFocusPreferences: () => fetcher<any>('/focus/preferences'),
  updateFocusPreferences: (data: any) => fetcher<any>('/focus/preferences', { method: 'PATCH', body: JSON.stringify(data) }),
  getCurrentFocusSession: () => fetcher<any>('/focus/current'),
  startFocusSession: (data: any) => fetcher<any>('/focus/start', { method: 'POST', body: JSON.stringify(data) }),
  pauseFocusSession: (id: string) => fetcher<any>(`/focus/${id}/pause`, { method: 'POST' }),
  resumeFocusSession: (id: string) => fetcher<any>(`/focus/${id}/resume`, { method: 'POST' }),
  completeFocusSession: (id: string, notes?: string) =>
    fetcher<any>(`/focus/${id}/complete`, { method: 'POST', body: JSON.stringify({ notes }) }),
  abandonFocusSession: (id: string) => fetcher<any>(`/focus/${id}/abandon`, { method: 'POST' }),
  getFocusHistory: (page = 1, limit = 20) => fetcher<any>(`/focus/history?page=${page}&limit=${limit}`),
  getFocusAnalytics: () => fetcher<any>('/focus/analytics'),

  // Goals & Milestones (Phase 28)
  getGoals: (params?: { type?: string; status?: string; parentId?: string }) => {
    const q = new URLSearchParams();
    if (params?.type) q.set('type', params.type);
    if (params?.status) q.set('status', params.status);
    if (params?.parentId) q.set('parentId', params.parentId);
    const qs = q.toString();
    return fetcher<any[]>(`/goals${qs ? '?' + qs : ''}`);
  },
  getGoalsSummary: () => fetcher<any>('/goals/summary'),
  getGoalById: (id: string) => fetcher<any>(`/goals/${id}`),
  createGoal: (data: any) => fetcher<any>('/goals', { method: 'POST', body: JSON.stringify(data) }),
  updateGoal: (id: string, data: any) => fetcher<any>(`/goals/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteGoal: (id: string) => fetcher<{ success: boolean }>(`/goals/${id}`, { method: 'DELETE' }),
  addGoalMilestone: (goalId: string, data: any) =>
    fetcher<any>(`/goals/${goalId}/milestones`, { method: 'POST', body: JSON.stringify(data) }),
  updateGoalMilestone: (goalId: string, milestoneId: string, data: any) =>
    fetcher<any>(`/goals/${goalId}/milestones/${milestoneId}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteGoalMilestone: (goalId: string, milestoneId: string) =>
    fetcher<{ success: boolean }>(`/goals/${goalId}/milestones/${milestoneId}`, { method: 'DELETE' }),
  logGoalProgress: (goalId: string, data: any) =>
    fetcher<any>(`/goals/${goalId}/progress`, { method: 'POST', body: JSON.stringify(data) }),

  // Personal Knowledge Hub (Phase 29 & Phase 42 Knowledge Intelligence)
  getKnowledgeSummary: () => fetcher<any>('/knowledge/summary'),
  getNotes: (params?: {
    folderId?: string;
    category?: string;
    isPinned?: boolean;
    isBookmarked?: boolean;
    isArchived?: boolean;
    isJournal?: boolean;
    journalDate?: string;
    isTrash?: boolean;
    search?: string;
    q?: string;
    tag?: string;
  }) => {
    const q = new URLSearchParams();
    if (params?.folderId) q.set('folderId', params.folderId);
    if (params?.category) q.set('category', params.category);
    if (params?.isPinned !== undefined) q.set('isPinned', String(params.isPinned));
    if (params?.isBookmarked !== undefined) q.set('isBookmarked', String(params.isBookmarked));
    if (params?.isArchived !== undefined) q.set('isArchived', String(params.isArchived));
    if (params?.isJournal !== undefined) q.set('isJournal', String(params.isJournal));
    if (params?.journalDate) q.set('journalDate', params.journalDate);
    if (params?.isTrash !== undefined) q.set('isTrash', String(params.isTrash));
    if (params?.search) q.set('search', params.search);
    if (params?.q) q.set('q', params.q);
    if (params?.tag) q.set('tag', params.tag);
    const qs = q.toString();
    return fetcher<any[]>(`/knowledge/notes${qs ? '?' + qs : ''}`);
  },
  getNoteById: (id: string) => fetcher<any>(`/knowledge/notes/${id}`),
  createNote: (data: any) => fetcher<any>('/knowledge/notes', { method: 'POST', body: JSON.stringify(data) }),
  updateNote: (id: string, data: any) => fetcher<any>(`/knowledge/notes/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteNote: (id: string) => fetcher<{ success: boolean }>(`/knowledge/notes/${id}`, { method: 'DELETE' }),
  restoreNote: (id: string) => fetcher<any>(`/knowledge/notes/${id}/restore`, { method: 'POST' }),
  purgeNote: (id: string) => fetcher<{ success: boolean }>(`/knowledge/notes/${id}/purge`, { method: 'DELETE' }),
  rollbackNoteVersion: (id: string, version: number) => fetcher<any>(`/knowledge/notes/${id}/rollback/${version}`, { method: 'POST' }),
  getFolders: () => fetcher<any[]>('/knowledge/folders'),
  createFolder: (data: any) => fetcher<any>('/knowledge/folders', { method: 'POST', body: JSON.stringify(data) }),
  updateFolder: (id: string, data: any) => fetcher<any>(`/knowledge/folders/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteFolder: (id: string) => fetcher<{ success: boolean }>(`/knowledge/folders/${id}`, { method: 'DELETE' }),
  getBookmarks: (category?: string) => fetcher<any[]>('/knowledge/bookmarks' + (category ? `?category=${category}` : '')),
  createBookmark: (data: any) => fetcher<any>('/knowledge/bookmarks', { method: 'POST', body: JSON.stringify(data) }),
  updateBookmark: (id: string, data: any) => fetcher<any>(`/knowledge/bookmarks/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteBookmark: (id: string) => fetcher<{ success: boolean }>(`/knowledge/bookmarks/${id}`, { method: 'DELETE' }),
  // Phase 42 Document & Knowledge Intelligence
  getDocuments: () => fetcher<any[]>('/knowledge/documents'),
  getDocumentById: (id: string) => fetcher<any>(`/knowledge/documents/${id}`),
  createDocument: (data: any) => fetcher<any>('/knowledge/documents', { method: 'POST', body: JSON.stringify(data) }),
  reindexDocument: (id: string) => fetcher<any>(`/knowledge/documents/${id}/reindex`, { method: 'POST' }),
  deleteDocument: (id: string) => fetcher<{ success: boolean }>(`/knowledge/documents/${id}`, { method: 'DELETE' }),
  getKnowledgeGraph: () => fetcher<any>('/knowledge/graph'),
  createKnowledgeRelation: (data: any) => fetcher<any>('/knowledge/relations', { method: 'POST', body: JSON.stringify(data) }),
  searchKnowledge: (params: { q: string; mode?: 'keyword' | 'semantic' | 'hybrid'; category?: string; limit?: number }) => {
    const q = new URLSearchParams();
    if (params.q) q.set('q', params.q);
    if (params.mode) q.set('mode', params.mode);
    if (params.category) q.set('category', params.category);
    if (params.limit) q.set('limit', String(params.limit));
    return fetcher<any>(`/knowledge/search?${q.toString()}`);
  },
  askKnowledge: (question: string) => fetcher<any>('/knowledge/ai/ask', { method: 'POST', body: JSON.stringify({ question }) }),
  suggestTitle: (content: string) => fetcher<any>('/knowledge/ai/suggest-title', { method: 'POST', body: JSON.stringify({ content }) }),
  extractTopics: (content: string, title?: string) => fetcher<any>('/knowledge/ai/extract-topics', { method: 'POST', body: JSON.stringify({ content, title }) }),
  extractActions: (content: string, noteId?: string) => fetcher<any>('/knowledge/ai/extract-actions', { method: 'POST', body: JSON.stringify({ content, noteId }) }),

  // Personal Finance & Expense Tracking (Phase 30)
  getFinanceAnalytics: (month?: string) => fetcher<any>('/finance/analytics' + (month ? `?month=${month}` : '')),
  getFinanceAccounts: () => fetcher<any[]>('/finance/accounts'),
  createFinanceAccount: (data: any) => fetcher<any>('/finance/accounts', { method: 'POST', body: JSON.stringify(data) }),
  updateFinanceAccount: (id: string, data: any) => fetcher<any>(`/finance/accounts/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteFinanceAccount: (id: string) => fetcher<{ success: boolean }>(`/finance/accounts/${id}`, { method: 'DELETE' }),
  getFinanceCategories: () => fetcher<any[]>('/finance/categories'),
  createFinanceCategory: (data: any) => fetcher<any>('/finance/categories', { method: 'POST', body: JSON.stringify(data) }),
  getFinanceTransactions: (params?: any) => {
    const q = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') q.set(k, String(v));
      });
    }
    const qs = q.toString();
    return fetcher<any[]>(`/finance/transactions${qs ? '?' + qs : ''}`);
  },
  createFinanceTransaction: (data: any) => fetcher<any>('/finance/transactions', { method: 'POST', body: JSON.stringify(data) }),
  updateFinanceTransaction: (id: string, data: any) => fetcher<any>(`/finance/transactions/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteFinanceTransaction: (id: string) => fetcher<{ success: boolean }>(`/finance/transactions/${id}`, { method: 'DELETE' }),
  getFinanceBudgets: (month?: string) => fetcher<any[]>('/finance/budgets' + (month ? `?month=${month}` : '')),
  setFinanceBudget: (data: any) => fetcher<any>('/finance/budgets', { method: 'POST', body: JSON.stringify(data) }),
  deleteFinanceBudget: (id: string) => fetcher<{ success: boolean }>(`/finance/budgets/${id}`, { method: 'DELETE' }),
  getSavingsGoals: () => fetcher<any[]>('/finance/savings'),
  createSavingsGoal: (data: any) => fetcher<any>('/finance/savings', { method: 'POST', body: JSON.stringify(data) }),
  contributeSavingsGoal: (id: string, amount: number) =>
    fetcher<any>(`/finance/savings/${id}/contribute`, { method: 'POST', body: JSON.stringify({ amount }) }),
  deleteSavingsGoal: (id: string) => fetcher<{ success: boolean }>(`/finance/savings/${id}`, { method: 'DELETE' }),
  getRecurringTransactions: () => fetcher<any[]>('/finance/recurring'),
  createRecurringTransaction: (data: any) => fetcher<any>('/finance/recurring', { method: 'POST', body: JSON.stringify(data) }),
  deleteRecurringTransaction: (id: string) => fetcher<{ success: boolean }>(`/finance/recurring/${id}`, { method: 'DELETE' }),
  exportFinanceCsv: () => fetcher<string>('/finance/export/csv'),

  // Generic HTTP helpers for backward compatibility & direct endpoint execution
  get: <T = any>(endpoint: string, options?: FetcherOptions) => fetcher<T>(endpoint, { ...options, method: 'GET' }),
  post: <T = any>(endpoint: string, body?: any, options?: FetcherOptions) =>
    fetcher<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body !== undefined ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
    }),
  put: <T = any>(endpoint: string, body?: any, options?: FetcherOptions) =>
    fetcher<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body !== undefined ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
    }),
  patch: <T = any>(endpoint: string, body?: any, options?: FetcherOptions) =>
    fetcher<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body !== undefined ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
    }),
  delete: <T = any>(endpoint: string, options?: FetcherOptions) =>
    fetcher<T>(endpoint, { ...options, method: 'DELETE' }),

  // AI Assistant & Smart Planner (Phase 32 & 33 & 40)
  getAIConversations: () => fetcher<any[]>('/ai/conversations'),
  getAIConversationById: (id: string) => fetcher<any>(`/ai/conversations/${id}`),
  renameAIConversation: (id: string, title: string) =>
    fetcher<any>(`/ai/conversations/${id}`, { method: 'PATCH', body: JSON.stringify({ title }) }),
  deleteAIConversation: (id: string) =>
    fetcher<{ success: boolean }>(`/ai/conversations/${id}`, { method: 'DELETE' }),
  getAIBriefing: () => fetcher<any>('/ai/briefing'),
  getAIProviderStatus: (key?: string) =>
    fetcher<any>(`/ai/provider-status${key ? '?key=' + encodeURIComponent(key) : ''}`),
  streamAIChatMessage: async (
    message: string,
    onChunk: (chunk: { type: string; content?: string; category?: string; [key: string]: any }) => void,
    conversationId?: string,
    assistantName?: string,
    signal?: AbortSignal,
  ) => {
    const authHeaders = await getAuthHeaders();
    const streamController = new AbortController();

    // Idle timeout timer: resets every time a token or SSE chunk arrives (max idle 60s)
    let idleTimer: NodeJS.Timeout | null = null;
    const resetIdleTimer = () => {
      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        streamController.abort(new ApiTimeoutError(60000));
      }, 60000);
    };

    // Forward external signal if provided
    let cleanExternalSignal: (() => void) | null = null;
    if (signal) {
      if (signal.aborted) throw new ApiAbortError('Caller signal already aborted');
      const onAbort = () => streamController.abort(new ApiAbortError('Caller cancelled stream'));
      signal.addEventListener('abort', onAbort, { once: true });
      cleanExternalSignal = () => signal.removeEventListener('abort', onAbort);
    }

    try {
      resetIdleTimer();
      const res = await fetch(`${API_BASE}/ai/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify({ message, conversationId, assistantName }),
        signal: streamController.signal,
      });

      if (!res.ok) {
        throw new Error(`Stream error: ${res.status} ${res.statusText}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error('Response body is not readable');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        resetIdleTimer(); // Active token delivery keeps stream alive
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const clean = line.replace(/^data:\s*/, '').trim();
          if (clean) {
            try {
              const parsed = JSON.parse(clean);
              onChunk(parsed);
            } catch (e) {
              console.warn('[AI Stream Parse Error]', e);
            }
          }
        }
      }
    } finally {
      if (idleTimer) clearTimeout(idleTimer);
      if (cleanExternalSignal) cleanExternalSignal();
    }
  },
  sendAIChatMessage: (
    message: string,
    conversationId?: string,
    assistantName?: string,
    signal?: AbortSignal,
    uiContext?: { activeTab?: string; selectedTaskId?: string; selectedProjectId?: string; selectedDate?: string },
  ) =>
    fetcher<any>('/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ message, conversationId, assistantName, uiContext }),
      timeoutMs: 60000,
      signal,
    }),
  getUserProgressAnalysis: () =>
    fetcher<any>('/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ message: 'Analyze my user progress' }),
      timeoutMs: 60000,
    }),
  executeAIAction: (actionId: string, confirmed: boolean) =>
    fetcher<any>(`/ai/actions/${actionId}/execute`, {
      method: 'POST',
      body: JSON.stringify({ confirmed }),
      timeoutMs: 60000,
    }),
  proposeSmartDayPlan: (date: string, preferences?: any) =>
    fetcher<any>('/ai/planner/propose', {
      method: 'POST',
      body: JSON.stringify({ date, preferences }),
      timeoutMs: 60000,
    }),
  applySmartDayPlan: (proposalId: string) =>
    fetcher<any>('/ai/planner/apply', {
      method: 'POST',
      body: JSON.stringify({ proposalId }),
      timeoutMs: 60000,
    }),
  getProposals: (date?: string) => fetcher<any[]>('/ai/planner/proposals' + (date ? `?date=${date}` : '')),

  // Phase 51.2 — Multi-Step Autonomous Workflows
  planAIWorkflow: (prompt: string) =>
    fetcher<any>('/ai/workflows/plan', {
      method: 'POST',
      body: JSON.stringify({ prompt }),
      timeoutMs: 60000,
    }),
  approveAIWorkflow: (workflowId: string, confirmedPayloadHash?: string) =>
    fetcher<any>(`/ai/workflows/${workflowId}/approve`, {
      method: 'POST',
      body: JSON.stringify({ confirmedPayloadHash }),
      timeoutMs: 60000,
    }),
  rejectAIWorkflow: (workflowId: string) =>
    fetcher<any>(`/ai/workflows/${workflowId}/reject`, {
      method: 'POST',
      timeoutMs: 60000,
    }),
  executeAIWorkflow: (workflowId: string) =>
    fetcher<any>(`/ai/workflows/${workflowId}/execute`, {
      method: 'POST',
      timeoutMs: 120000,
    }),

  // Predictive Analytics, Life Balance, Timeline (Phase 34, 35, 36)
  getPredictiveAnalytics: () => fetcher<any>('/analytics/predictive'),
  getLifeBalance: () => fetcher<any>('/analytics/life-balance'),
  getUnifiedTimeline: (limit = 50) => fetcher<any[]>(`/analytics/timeline?limit=${limit}`),
  getDayTimeline: (date: string) => fetcher<any>(`/analytics/day-timeline?date=${date}`),
};

if (typeof window !== 'undefined') {
  (window as any).api = api;
}
