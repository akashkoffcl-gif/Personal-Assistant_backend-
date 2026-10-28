'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { api } from '@/lib/api';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { Sidebar, NavTab } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { KpiCards } from '@/components/KpiCards';
import { TodaySchedule } from '@/components/TodaySchedule';
import { RoutineChecklist } from '@/components/RoutineChecklist';
import { AnalyticsCharts } from '@/components/AnalyticsCharts';
import { RightWidgets } from '@/components/RightWidgets';
import { EmergencyModal } from '@/components/EmergencyModal';
import { CreateTaskModal } from '@/components/CreateTaskModal';
import { BottomNav } from '@/components/BottomNav';
import { TaskCategory, TaskStatus, Priority, SchedulingMode } from '@assistant/shared';
import {
  Activity,
  Calendar,
  Clock,
  Download,
  Flame,
  Plus,
  RefreshCw,
  Trash2,
  CheckCircle2,
  Settings,
} from 'lucide-react';

export default function App() {
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0],
  );
  const [analyticsDays, setAnalyticsDays] = useState<number>(7);
  const [isEmergencyModalOpen, setIsEmergencyModalOpen] = useState(false);
  const [isCreateTaskModalOpen, setIsCreateTaskModalOpen] = useState(false);

  const queryClient = useQueryClient();
  const push = usePushNotifications();

  // Queries
  const { data: tasks = [], isLoading: tasksLoading, refetch: refetchTasks } = useQuery({
    queryKey: ['tasks', selectedDate],
    queryFn: () => api.getTasks({ date: selectedDate }),
  });

  const { data: allTasks = [] } = useQuery({
    queryKey: ['tasks-all'],
    queryFn: () => api.getTasks(),
  });

  const { data: occurrences = [], isLoading: routinesLoading, refetch: refetchRoutines } = useQuery({
    queryKey: ['routine-occurrences', selectedDate],
    queryFn: () => api.getOccurrences(selectedDate),
  });

  const { data: routinesList = [] } = useQuery({
    queryKey: ['routines-list'],
    queryFn: () => api.getRoutines(),
  });

  const { data: kpi, isLoading: kpiLoading, refetch: refetchKpi } = useQuery({
    queryKey: ['daily-kpi', selectedDate],
    queryFn: () => api.getDailyKpi(selectedDate),
  });

  const { data: wellness, refetch: refetchWellness } = useQuery({
    queryKey: ['wellness-summary', selectedDate],
    queryFn: () => api.getWellnessSummary(selectedDate),
  });

  const { data: trends, isLoading: trendsLoading, refetch: refetchTrends } = useQuery({
    queryKey: ['analytics-trends', analyticsDays],
    queryFn: () => api.getTrends(analyticsDays),
  });

  const { data: scheduleChanges = [], refetch: refetchChanges } = useQuery({
    queryKey: ['schedule-changes'],
    queryFn: () => api.getScheduleChanges(),
  });

  const { data: dayPlan } = useQuery({
    queryKey: ['day-plan', selectedDate],
    queryFn: () => api.getDayPlan(selectedDate),
  });

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.getSettings(),
  });

  const refreshAll = () => {
    refetchTasks();
    refetchRoutines();
    refetchKpi();
    refetchWellness();
    refetchTrends();
    refetchChanges();
  };

  // Mutations
  const completeTaskMutation = useMutation({
    mutationFn: (id: string) => api.completeTask(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['daily-kpi'] });
      queryClient.invalidateQueries({ queryKey: ['analytics-trends'] });
    },
  });

  const snoozeTaskMutation = useMutation({
    mutationFn: (id: string) => api.snoozeTask(id, 15),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  const recordOccurrenceMutation = useMutation({
    mutationFn: ({ id, status, actualQuantity }: { id: string; status: TaskStatus; actualQuantity?: number }) =>
      api.recordOccurrence(id, { status, actualQuantity }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routine-occurrences'] });
      queryClient.invalidateQueries({ queryKey: ['daily-kpi'] });
      queryClient.invalidateQueries({ queryKey: ['wellness-summary'] });
      queryClient.invalidateQueries({ queryKey: ['analytics-trends'] });
    },
  });

  const logMetricMutation = useMutation({
    mutationFn: (data: any) => api.logWellnessMetric(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wellness-summary'] });
      queryClient.invalidateQueries({ queryKey: ['analytics-trends'] });
    },
  });

  const checkInMutation = useMutation({
    mutationFn: (data: any) => api.recordCheckIn(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wellness-summary'] });
    },
  });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row">
      {/* 1. Left Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        onOpenEmergency={() => setIsEmergencyModalOpen(true)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 pb-16 lg:pb-0">
        <Header
          onOpenCreateTask={() => setIsCreateTaskModalOpen(true)}
          onOpenEmergency={() => setIsEmergencyModalOpen(true)}
          isPushSubscribed={push.isSubscribed}
          onTogglePush={push.isSubscribed ? () => {} : push.subscribe}
          pushLoading={push.loading}
          pushMessage={push.message}
          onRefresh={refreshAll}
        />

        <main className="flex-1 p-4 sm:p-6 max-w-7xl w-full mx-auto">
          {/* TAB 1: DASHBOARD VIEW */}
          {currentTab === 'dashboard' && (
            <div className="space-y-6">
              {/* Executive KPI Cards */}
              <KpiCards
                kpi={kpi}
                wellnessTrendLabel={wellness?.adherenceTrendLabel}
                loading={kpiLoading}
              />

              {/* Main Schedule & Checklist Grid */}
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="xl:col-span-2 space-y-6">
                  {/* Today's Schedule */}
                  <TodaySchedule
                    tasks={tasks}
                    onComplete={(id) => completeTaskMutation.mutate(id)}
                    onSnooze={(id) => snoozeTaskMutation.mutate(id)}
                    loading={tasksLoading}
                  />

                  {/* Interactive Analytics Charts */}
                  <AnalyticsCharts
                    data={trends}
                    days={analyticsDays}
                    onSelectDays={setAnalyticsDays}
                    loading={trendsLoading}
                  />
                </div>

                <div className="space-y-6">
                  {/* Personal Routine Checklist */}
                  <RoutineChecklist
                    occurrences={occurrences}
                    onRecord={(id, status, actualQuantity) =>
                      recordOccurrenceMutation.mutate({ id, status, actualQuantity })
                    }
                    onAddRoutine={() => setCurrentTab('routines')}
                    loading={routinesLoading}
                  />

                  {/* Right Side Widgets */}
                  <RightWidgets
                    tasks={tasks}
                    wellness={wellness}
                    isPushSubscribed={push.isSubscribed}
                    onTestPush={push.testNotification}
                    onOpenCreateTask={() => setIsCreateTaskModalOpen(true)}
                    onOpenEmergency={() => setIsEmergencyModalOpen(true)}
                    onLogHydration={(amount) =>
                      logMetricMutation.mutate({
                        type: 'HYDRATION',
                        value: amount,
                        unit: 'ml',
                      })
                    }
                    pushLoading={push.loading}
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: MY DAY & PLANNING VIEW */}
          {(currentTab === 'my-day' || currentTab === 'planning') && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-assistant-navy">Day-Specific Planning</h3>
                    <p className="text-xs text-assistant-coolGrey">
                      Chronological agenda, time-blocks, and conflict detection (Plan v{dayPlan?.version || 1})
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="px-3 py-1.5 text-xs font-medium border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>

                {/* Conflict Alert Banner if any conflicts exist */}
                {dayPlan?.conflicts && dayPlan.conflicts.length > 0 && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <h5 className="text-xs font-bold text-assistant-red">
                      ⚠️ Schedule Collision Detected ({dayPlan.conflicts.length})
                    </h5>
                    {dayPlan.conflicts.map((c: any, i: number) => (
                      <p key={i} className="text-xs text-red-700 mt-0.5">
                        '{c.taskA}' overlaps with '{c.taskB}' by {c.overlapMinutes} minutes.
                      </p>
                    ))}
                  </div>
                )}

                {/* Time Blocks: Morning, Afternoon, Evening */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
                    <h4 className="text-xs font-bold text-assistant-navy uppercase tracking-wider mb-2">
                      🌅 Morning ({dayPlan?.morningPriorities?.length || 0})
                    </h4>
                    <div className="space-y-2">
                      {dayPlan?.morningPriorities?.map((t: any) => (
                        <div key={t.id} className="p-2.5 rounded bg-white border border-slate-200 text-xs">
                          <span className="font-semibold text-assistant-navy">{t.title}</span>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {t.scheduledStartTime ? format(new Date(t.scheduledStartTime), 'h:mm a') : 'Flexible'}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
                    <h4 className="text-xs font-bold text-assistant-navy uppercase tracking-wider mb-2">
                      ☀️ Afternoon ({dayPlan?.afternoonPriorities?.length || 0})
                    </h4>
                    <div className="space-y-2">
                      {dayPlan?.afternoonPriorities?.map((t: any) => (
                        <div key={t.id} className="p-2.5 rounded bg-white border border-slate-200 text-xs">
                          <span className="font-semibold text-assistant-navy">{t.title}</span>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {t.scheduledStartTime ? format(new Date(t.scheduledStartTime), 'h:mm a') : 'Flexible'}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
                    <h4 className="text-xs font-bold text-assistant-navy uppercase tracking-wider mb-2">
                      🌙 Evening ({dayPlan?.eveningPriorities?.length || 0})
                    </h4>
                    <div className="space-y-2">
                      {dayPlan?.eveningPriorities?.map((t: any) => (
                        <div key={t.id} className="p-2.5 rounded bg-white border border-slate-200 text-xs">
                          <span className="font-semibold text-assistant-navy">{t.title}</span>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {t.scheduledStartTime ? format(new Date(t.scheduledStartTime), 'h:mm a') : 'Flexible'}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: ROUTINES MANAGEMENT */}
          {currentTab === 'routines' && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-assistant-navy">Daily & Weekly Routines</h3>
                    <p className="text-xs text-assistant-coolGrey">
                      Permanent recurrence definitions, target quantities, and streak tracking
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      const title = prompt('Enter routine habit title:');
                      if (title) {
                        api.createRoutine({ title, frequency: 'DAILY', durationMinutes: 15 }).then(() => {
                          queryClient.invalidateQueries({ queryKey: ['routines-list'] });
                          queryClient.invalidateQueries({ queryKey: ['routine-occurrences'] });
                        });
                      }
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-assistant-navy text-white rounded-lg hover:bg-slate-800"
                  >
                    <Plus className="w-3.5 h-3.5" /> New Routine Definition
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {routinesList.map((r) => (
                    <div key={r.id} className="p-4 rounded-xl border border-slate-200 bg-white">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-assistant-navy">{r.title}</span>
                        <span className="text-[11px] font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                          🔥 {r.streakCount} streak
                        </span>
                      </div>
                      <p className="text-xs text-assistant-coolGrey mt-1">
                        Frequency: {r.frequency} • {r.durationMinutes} min
                        {r.targetQuantity ? ` • Target: ${r.targetQuantity} ${r.unit || ''}` : ''}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: WORK REMINDERS */}
          {currentTab === 'work' && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
                <h3 className="text-lg font-bold text-assistant-navy mb-1">Work Reminders & Deadlines</h3>
                <p className="text-xs text-assistant-coolGrey mb-4">
                  Priorities, progress tracking, advance reminders, and overdue tracking
                </p>
                <div className="space-y-2">
                  {allTasks
                    .filter((t) => t.category === TaskCategory.WORK)
                    .map((t) => (
                      <div
                        key={t.id}
                        className="flex items-center justify-between p-3.5 rounded-lg border border-slate-200 bg-white"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-assistant-navy text-sm">{t.title}</span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-assistant-navy">
                              {t.priority}
                            </span>
                            {t.isOverdue && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-assistant-red">
                                Overdue
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-assistant-coolGrey mt-1">
                            Status: {t.status} • Duration: {t.estimatedDurationMinutes}m
                            {t.deadline ? ` • Deadline: ${format(new Date(t.deadline), 'MMM d, h:mm a')}` : ''}
                          </p>
                        </div>
                        {t.status !== TaskStatus.COMPLETED && (
                          <button
                            onClick={() => completeTaskMutation.mutate(t.id)}
                            className="px-3 py-1.5 text-xs font-semibold bg-emerald-50 text-assistant-green border border-emerald-200 rounded-lg hover:bg-emerald-100"
                          >
                            Mark Done
                          </button>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: EMERGENCY AUDIT TRAIL */}
          {currentTab === 'emergency' && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-assistant-navy">Emergency Replanning Audit History</h3>
                    <p className="text-xs text-assistant-coolGrey">
                      Historical log of before/after task repositioning events
                    </p>
                  </div>
                  <button
                    onClick={() => setIsEmergencyModalOpen(true)}
                    className="px-3 py-1.5 text-xs font-bold bg-assistant-red text-white rounded-lg hover:bg-red-700"
                  >
                    🚨 Trigger Emergency
                  </button>
                </div>

                <div className="space-y-2.5">
                  {scheduleChanges.length === 0 ? (
                    <p className="text-xs text-assistant-coolGrey py-6 text-center">
                      No emergency schedule replans recorded yet.
                    </p>
                  ) : (
                    scheduleChanges.map((change: any) => (
                      <div
                        key={change.id}
                        className="p-3.5 rounded-lg border border-slate-200 bg-slate-50 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                      >
                        <div>
                          <span className="font-bold text-assistant-navy text-sm">
                            {change.taskTitle || 'Task Modified'}
                          </span>
                          <span className="ml-2 text-[10px] font-semibold bg-red-100 text-assistant-red px-1.5 py-0.5 rounded">
                            {change.reason}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-600">
                          <span>
                            {change.originalStartTime
                              ? format(new Date(change.originalStartTime), 'h:mm a')
                              : 'Unscheduled'}
                          </span>
                          <span>➔</span>
                          <span className="font-bold text-assistant-navy">
                            {change.revisedStartTime
                              ? format(new Date(change.revisedStartTime), 'h:mm a')
                              : 'New Slot'}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: HEALTH & WELLNESS */}
          {currentTab === 'wellness' && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
                <h3 className="text-lg font-bold text-assistant-navy mb-1">Health & Wellness Tracking</h3>
                <p className="text-xs text-assistant-coolGrey mb-6">
                  Behavioral insights from routine adherence, hydration, sleep, and self-reported check-ins
                </p>

                {/* Quick Log Row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                  <button
                    onClick={() => logMetricMutation.mutate({ type: 'HYDRATION', value: 250, unit: 'ml' })}
                    className="p-3 rounded-lg border border-sky-200 bg-assistant-paleSky hover:bg-sky-100 text-left"
                  >
                    <span className="text-xs font-semibold text-assistant-navy">+250ml Water</span>
                    <p className="text-[11px] text-slate-500 mt-1">Hydration intake</p>
                  </button>
                  <button
                    onClick={() => logMetricMutation.mutate({ type: 'EXERCISE', value: 30, unit: 'minutes' })}
                    className="p-3 rounded-lg border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-left"
                  >
                    <span className="text-xs font-semibold text-assistant-green">+30m Workout</span>
                    <p className="text-[11px] text-slate-500 mt-1">Exercise duration</p>
                  </button>
                  <button
                    onClick={() => logMetricMutation.mutate({ type: 'SLEEP', value: 8, unit: 'hours' })}
                    className="p-3 rounded-lg border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-left"
                  >
                    <span className="text-xs font-semibold text-indigo-700">+8h Sleep</span>
                    <p className="text-[11px] text-slate-500 mt-1">Night sleep</p>
                  </button>
                  <button
                    onClick={() => {
                      const energy = prompt('Rate energy level (1-5):', '4');
                      const mood = prompt('Rate mood (1-5):', '4');
                      if (energy && mood) {
                        checkInMutation.mutate({ energyScore: Number(energy), moodScore: Number(mood) });
                      }
                    }}
                    className="p-3 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-left"
                  >
                    <span className="text-xs font-semibold text-assistant-navy">Daily Check-In</span>
                    <p className="text-[11px] text-slate-500 mt-1">Mood & Energy score</p>
                  </button>
                </div>

                {/* Wellness Summary Overview */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-assistant-navy">
                      Adherence & Consistency
                    </span>
                    <span className="text-xs font-bold text-assistant-sky">
                      {wellness?.adherenceTrendLabel || 'Insufficient data'}
                    </span>
                  </div>
                  <p className="text-xs text-assistant-coolGrey">
                    Hydration: {wellness?.hydrationTotalMl || 0}ml • Exercise: {wellness?.exerciseDurationMinutes || 0}m • Sleep: {wellness?.sleepHours || 0}h
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: FULL ANALYTICS SUITE */}
          {currentTab === 'analytics' && (
            <div className="space-y-6">
              <AnalyticsCharts
                data={trends}
                days={analyticsDays}
                onSelectDays={setAnalyticsDays}
                loading={trendsLoading}
              />
            </div>
          )}

          {/* TAB 8: CALENDAR */}
          {currentTab === 'calendar' && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-assistant-navy">Calendar Navigation</h3>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="px-3 py-1.5 text-xs font-medium border border-slate-300 rounded-lg"
                  />
                </div>
                <p className="text-xs text-assistant-coolGrey mb-4">
                  Showing scheduled tasks for {format(new Date(selectedDate), 'EEEE, MMMM d, yyyy')}
                </p>
                <TodaySchedule
                  tasks={tasks}
                  onComplete={(id) => completeTaskMutation.mutate(id)}
                  onSnooze={(id) => snoozeTaskMutation.mutate(id)}
                  loading={tasksLoading}
                />
              </div>
            </div>
          )}

          {/* TAB 9: SETTINGS */}
          {currentTab === 'settings' && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 max-w-2xl">
                <h3 className="text-lg font-bold text-assistant-navy mb-1">User Settings & Preferences</h3>
                <p className="text-xs text-assistant-coolGrey mb-6">
                  Configure work hours, quiet hours, follow-up limits, and data portability
                </p>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-assistant-navy mb-1">
                        Work Start Hour (0-23)
                      </label>
                      <input
                        type="number"
                        defaultValue={settings?.workStartHour || 9}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-assistant-navy mb-1">
                        Work End Hour (1-24)
                      </label>
                      <input
                        type="number"
                        defaultValue={settings?.workEndHour || 18}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-assistant-navy mb-1">
                        Quiet Hours Start (Hour)
                      </label>
                      <input
                        type="number"
                        defaultValue={settings?.quietHoursStart || 22}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-assistant-navy mb-1">
                        Quiet Hours End (Hour)
                      </label>
                      <input
                        type="number"
                        defaultValue={settings?.quietHoursEnd || 7}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                      />
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex flex-col gap-3">
                    <span className="text-xs font-bold text-assistant-navy uppercase tracking-wider">
                      Data Portability & Export
                    </span>
                    <button
                      onClick={async () => {
                        const data = await api.exportUserData();
                        const blob = new Blob([JSON.stringify(data, null, 2)], {
                          type: 'application/json',
                        });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `personal-assistant-export-${new Date().toISOString()}.json`;
                        a.click();
                      }}
                      className="flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-assistant-navy text-white text-xs font-semibold hover:bg-slate-800"
                    >
                      <Download className="w-4 h-4" /> Export All Personal Records (JSON)
                    </button>

                    <button
                      onClick={async () => {
                        if (confirm('Clear all wellness logs? This cannot be undone.')) {
                          await api.clearWellnessRecords();
                          refreshAll();
                          alert('Wellness records cleared.');
                        }
                      }}
                      className="flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-red-50 text-assistant-red text-xs font-semibold hover:bg-red-100 border border-red-200"
                    >
                      <Trash2 className="w-4 h-4" /> Clear All Personal Wellness Records
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <BottomNav
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        onOpenEmergency={() => setIsEmergencyModalOpen(true)}
      />

      {/* Emergency Modal */}
      <EmergencyModal
        isOpen={isEmergencyModalOpen}
        onClose={() => setIsEmergencyModalOpen(false)}
        onSubmit={async (data) => {
          const res = await api.createEmergency(data);
          refreshAll();
          return res;
        }}
      />

      {/* Create Task Modal */}
      <CreateTaskModal
        isOpen={isCreateTaskModalOpen}
        onClose={() => setIsCreateTaskModalOpen(false)}
        onSubmit={async (data) => {
          const res = await api.createTask(data);
          refreshAll();
          return res;
        }}
      />
    </div>
  );
}

