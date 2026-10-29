'use client';

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, addDays, subDays } from 'date-fns';
import { api } from '@/lib/api';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useToast } from '@/components/Toast';
import { Sidebar, NavTab } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { KpiCards } from '@/components/KpiCards';
import { TodaySchedule } from '@/components/TodaySchedule';
import { RoutineChecklist } from '@/components/RoutineChecklist';
import { AnalyticsCharts } from '@/components/AnalyticsCharts';
import { RightWidgets } from '@/components/RightWidgets';
import { EmergencyModal } from '@/components/EmergencyModal';
import { CreateTaskModal } from '@/components/CreateTaskModal';
import { CreateRoutineModal } from '@/components/CreateRoutineModal';
import { WellnessCheckInModal } from '@/components/WellnessCheckInModal';
import { TaskDetailDrawer } from '@/components/TaskDetailDrawer';
import { ProjectModal } from '@/components/ProjectModal';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { BottomNav } from '@/components/BottomNav';
import {
  TaskCategory,
  TaskStatus,
  Priority,
  SchedulingMode,
  TaskDto,
  ProjectDto,
} from '@assistant/shared';
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
  ChevronLeft,
  ChevronRight,
  Search,
  FolderKanban,
  Cpu,
  Play,
  Check,
  AlertTriangle,
  RotateCcw,
  Sliders,
  Filter,
} from 'lucide-react';

export default function App() {
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0],
  );
  const [analyticsDays, setAnalyticsDays] = useState<number>(7);
  const [calendarView, setCalendarView] = useState<'day' | 'week' | 'month' | 'agenda'>('day');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTask, setSelectedTask] = useState<TaskDto | null>(null);

  // Modals state
  const [isEmergencyModalOpen, setIsEmergencyModalOpen] = useState(false);
  const [isCreateTaskModalOpen, setIsCreateTaskModalOpen] = useState(false);
  const [isCreateRoutineModalOpen, setIsCreateRoutineModalOpen] = useState(false);
  const [isCheckInModalOpen, setIsCheckInModalOpen] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    isDestructive?: boolean;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const queryClient = useQueryClient();
  const push = usePushNotifications();
  const toast = useToast();

  // Queries
  const { data: tasks = [], isLoading: tasksLoading, refetch: refetchTasks } = useQuery({
    queryKey: ['tasks', selectedDate],
    queryFn: () => api.getTasks({ date: selectedDate }),
  });

  const { data: allTasks = [], refetch: refetchAllTasks } = useQuery({
    queryKey: ['tasks-all'],
    queryFn: () => api.getTasks(),
  });

  const { data: projects = [], refetch: refetchProjects } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.getProjects(),
  });

  const { data: occurrences = [], isLoading: routinesLoading, refetch: refetchRoutines } = useQuery({
    queryKey: ['routine-occurrences', selectedDate],
    queryFn: () => api.getOccurrences(selectedDate),
  });

  const { data: routinesList = [], refetch: refetchRoutinesList } = useQuery({
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

  const { data: dayPlan, refetch: refetchDayPlan } = useQuery({
    queryKey: ['day-plan', selectedDate],
    queryFn: () => api.getDayPlan(selectedDate),
  });

  const { data: automationRules = [], refetch: refetchRules } = useQuery({
    queryKey: ['automation-rules'],
    queryFn: () => api.getAutomationRules(),
  });

  const { data: automationExecutions = [], refetch: refetchExecutions } = useQuery({
    queryKey: ['automation-executions'],
    queryFn: () => api.getAutomationExecutions(),
  });

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.getSettings(),
  });

  const { data: taskEvents = [] } = useQuery({
    queryKey: ['task-events', selectedTask?.id],
    queryFn: () => (selectedTask?.id ? api.getTaskEvents(selectedTask.id) : Promise.resolve([])),
    enabled: !!selectedTask?.id,
  });

  const refreshAll = () => {
    refetchTasks();
    refetchAllTasks();
    refetchProjects();
    refetchRoutines();
    refetchRoutinesList();
    refetchKpi();
    refetchWellness();
    refetchTrends();
    refetchChanges();
    refetchDayPlan();
    refetchRules();
    refetchExecutions();
    toast.info('Data refreshed', 'All workspaces synchronized.');
  };

  // Stepper helpers
  const handlePrevDay = () => {
    const prev = subDays(new Date(selectedDate), 1);
    setSelectedDate(prev.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const next = addDays(new Date(selectedDate), 1);
    setSelectedDate(next.toISOString().split('T')[0]);
  };

  const handleToday = () => {
    setSelectedDate(new Date().toISOString().split('T')[0]);
  };

  // Mutations
  const completeTaskMutation = useMutation({
    mutationFn: (id: string) => api.completeTask(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks-all'] });
      queryClient.invalidateQueries({ queryKey: ['daily-kpi'] });
      queryClient.invalidateQueries({ queryKey: ['analytics-trends'] });
      toast.success('Task completed', 'Good progress! Schedule updated.');
    },
    onError: (err: any) => toast.error('Error completing task', err.message),
  });

  const snoozeTaskMutation = useMutation({
    mutationFn: (id: string) => api.snoozeTask(id, 15),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks-all'] });
      toast.info('Task snoozed', 'Moved forward by 15 minutes.');
    },
    onError: (err: any) => toast.error('Error snoozing task', err.message),
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.updateTask(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks-all'] });
      queryClient.invalidateQueries({ queryKey: ['day-plan'] });
      toast.success('Task updated', 'Changes saved successfully.');
    },
    onError: (err: any) => toast.error('Update failed', err.message),
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (id: string) => api.deleteTask(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks-all'] });
      queryClient.invalidateQueries({ queryKey: ['daily-kpi'] });
      setSelectedTask(null);
      toast.info('Task deleted', 'Removed from schedule.');
    },
    onError: (err: any) => toast.error('Delete failed', err.message),
  });

  const recordOccurrenceMutation = useMutation({
    mutationFn: ({ id, status, actualQuantity }: { id: string; status: TaskStatus; actualQuantity?: number }) =>
      api.recordOccurrence(id, { status, actualQuantity }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routine-occurrences'] });
      queryClient.invalidateQueries({ queryKey: ['daily-kpi'] });
      queryClient.invalidateQueries({ queryKey: ['wellness-summary'] });
      queryClient.invalidateQueries({ queryKey: ['analytics-trends'] });
      toast.success('Habit recorded', 'Routine streak updated.');
    },
    onError: (err: any) => toast.error('Record failed', err.message),
  });

  const logMetricMutation = useMutation({
    mutationFn: (data: any) => api.logWellnessMetric(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wellness-summary'] });
      queryClient.invalidateQueries({ queryKey: ['analytics-trends'] });
      toast.success('Wellness logged', 'Entry saved to persistent records.');
    },
    onError: (err: any) => toast.error('Logging failed', err.message),
  });

  const checkInMutation = useMutation({
    mutationFn: (data: any) => api.recordCheckIn(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wellness-summary'] });
      toast.success('Daily check-in saved', 'Energy and mood recorded.');
    },
    onError: (err: any) => toast.error('Check-in failed', err.message),
  });

  const createProjectMutation = useMutation({
    mutationFn: (data: any) => api.createProject(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Project created', 'Workspace ready for tasks.');
    },
    onError: (err: any) => toast.error('Project creation failed', err.message),
  });

  const toggleRuleMutation = useMutation({
    mutationFn: ({ id, isEnabled }: { id: string; isEnabled: boolean }) =>
      api.toggleAutomationRule(id, isEnabled),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-rules'] });
      toast.info('Automation rule updated');
    },
    onError: (err: any) => toast.error('Toggle rule failed', err.message),
  });

  const evaluateRulesMutation = useMutation({
    mutationFn: () => api.evaluateAutomationRules(),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['automation-executions'] });
      toast.success('Automation Evaluated', `Evaluated rules. ${res.executed} action(s) triggered.`);
    },
    onError: (err: any) => toast.error('Evaluation failed', err.message),
  });

  // Filtered tasks by search query
  const filteredTaskList = useMemo(() => {
    if (!searchQuery.trim()) return allTasks;
    const q = searchQuery.toLowerCase();
    return allTasks.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        (t.description && t.description.toLowerCase().includes(q)),
    );
  }, [allTasks, searchQuery]);

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
          {/* TAB 1: COMMAND CENTER (UNIFIED DASHBOARD VIEW) */}
          {currentTab === 'dashboard' && (
            <div className="space-y-6">
              {/* Daily Context Bar with Today/Prev/Next Stepper */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-assistant-paleSky text-assistant-navy">
                    <Calendar className="w-5 h-5 text-assistant-sky" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-assistant-navy">
                      {format(new Date(selectedDate), 'EEEE, MMMM d, yyyy')}
                    </h2>
                    <p className="text-xs text-assistant-coolGrey">
                      {selectedDate === new Date().toISOString().split('T')[0]
                        ? 'Today’s Command Center'
                        : 'Historical / Scheduled View'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePrevDay}
                    className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-assistant-navy transition-colors"
                    title="Previous Day"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleToday}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-assistant-navy text-white hover:bg-slate-800 transition-colors"
                  >
                    Today
                  </button>
                  <button
                    onClick={handleNextDay}
                    className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-assistant-navy transition-colors"
                    title="Next Day"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="px-2.5 py-1 text-xs border border-slate-300 rounded-lg text-slate-700 ml-1"
                  />
                </div>
              </div>

              {/* Schedule Collision Alert Banner */}
              {dayPlan?.conflicts && dayPlan.conflicts.length > 0 && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-assistant-red shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold text-assistant-red uppercase tracking-wider">
                      Schedule Conflict Detected ({dayPlan.conflicts.length})
                    </h4>
                    {dayPlan.conflicts.map((c: any, i: number) => (
                      <p key={i} className="text-xs text-red-700 mt-0.5">
                        &apos;{c.taskA}&apos; overlaps with &apos;{c.taskB}&apos; by {c.overlapMinutes}m. Adjust times or trigger replanning.
                      </p>
                    ))}
                  </div>
                  <button
                    onClick={() => setIsEmergencyModalOpen(true)}
                    className="px-3 py-1 text-xs font-bold bg-assistant-red text-white rounded-lg hover:bg-red-700 transition-colors shrink-0"
                  >
                    Replan
                  </button>
                </div>
              )}

              {/* Executive KPI Cards (Clicking links directly into workspace views) */}
              <KpiCards
                kpi={kpi}
                wellnessTrendLabel={wellness?.adherenceTrendLabel}
                loading={kpiLoading}
                onSelectCard={(cardType) => {
                  if (cardType === 'tasks' || cardType === 'work') setCurrentTab('work');
                  if (cardType === 'routines') setCurrentTab('routines');
                  if (cardType === 'wellness') setCurrentTab('wellness');
                }}
              />

              {/* Main Schedule & Checklist Grid */}
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="xl:col-span-2 space-y-6">
                  {/* Today's Schedule */}
                  <TodaySchedule
                    tasks={tasks}
                    onComplete={(id) => completeTaskMutation.mutate(id)}
                    onSnooze={(id) => snoozeTaskMutation.mutate(id)}
                    onSelectTask={(t) => setSelectedTask(t)}
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
                    onAddRoutine={() => setIsCreateRoutineModalOpen(true)}
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

          {/* TAB 2: TASK MANAGEMENT WORKSPACE */}
          {(currentTab === 'my-day' || currentTab === 'work') && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                  <div>
                    <h3 className="text-lg font-bold text-assistant-navy">Task & Work Management</h3>
                    <p className="text-xs text-assistant-coolGrey">
                      Full lifecycle task management, priorities, deadlines, and project assignments
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsCreateTaskModalOpen(true)}
                      className="px-3.5 py-1.5 text-xs font-semibold bg-assistant-navy text-white rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" /> New Task
                    </button>
                  </div>
                </div>

                {/* Search Bar */}
                <div className="relative mb-4">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search tasks by title or description..."
                    className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-assistant-sky"
                  />
                </div>

                {/* Task List Table */}
                <div className="space-y-2">
                  {filteredTaskList.length === 0 ? (
                    <div className="py-12 text-center text-xs text-assistant-coolGrey bg-slate-50 rounded-lg border border-dashed border-slate-200">
                      No matching tasks found.
                    </div>
                  ) : (
                    filteredTaskList.map((t) => (
                      <div
                        key={t.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-lg border border-slate-200 bg-white hover:border-sky-300 transition-colors gap-3"
                      >
                        <div
                          onClick={() => setSelectedTask(t)}
                          className="flex-1 cursor-pointer min-w-0"
                        >
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-assistant-navy text-sm hover:text-assistant-sky">
                              {t.title}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-assistant-navy uppercase">
                              {t.category}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                t.priority === Priority.URGENT
                                  ? 'bg-red-100 text-assistant-red'
                                  : t.priority === Priority.HIGH
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {t.priority}
                            </span>
                            {t.isOverdue && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-assistant-red">
                                Overdue
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-assistant-coolGrey mt-1 truncate">
                            Status: <span className="font-semibold">{t.status}</span> • Duration: {t.estimatedDurationMinutes}m
                            {t.scheduledStartTime ? ` • Start: ${format(new Date(t.scheduledStartTime), 'MMM d, h:mm a')}` : ' • Flexible'}
                            {t.deadline ? ` • Due: ${format(new Date(t.deadline), 'MMM d, h:mm a')}` : ''}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {t.status !== TaskStatus.COMPLETED && (
                            <button
                              onClick={() => completeTaskMutation.mutate(t.id)}
                              className="px-3 py-1 text-xs font-semibold bg-emerald-50 text-assistant-green border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors"
                            >
                              Complete
                            </button>
                          )}
                          <button
                            onClick={() => setSelectedTask(t)}
                            className="px-2.5 py-1 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                          >
                            Edit
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PROJECTS WORKSPACE */}
          {currentTab === 'projects' && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-bold text-assistant-navy">Work & Project Workspaces</h3>
                    <p className="text-xs text-assistant-coolGrey">
                      Organize initiatives, track progress, and group linked deliverables
                    </p>
                  </div>
                  <button
                    onClick={() => setIsProjectModalOpen(true)}
                    className="px-3.5 py-1.5 text-xs font-semibold bg-assistant-navy text-white rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" /> New Project
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {projects.length === 0 ? (
                    <div className="col-span-full py-12 text-center text-xs text-assistant-coolGrey bg-slate-50 rounded-lg border border-dashed border-slate-200">
                      No active projects yet. Create your first project workspace to group tasks.
                    </div>
                  ) : (
                    projects.map((proj) => (
                      <div
                        key={proj.id}
                        className="p-4 rounded-xl border border-slate-200 bg-white hover:shadow-md transition-shadow flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: proj.color }}
                            />
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-assistant-navy uppercase">
                              {proj.status}
                            </span>
                          </div>
                          <h4 className="font-bold text-sm text-assistant-navy">{proj.title}</h4>
                          {proj.description && (
                            <p className="text-xs text-assistant-coolGrey mt-1 line-clamp-2">
                              {proj.description}
                            </p>
                          )}
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-100">
                          <div className="flex items-center justify-between text-xs text-slate-600 mb-1.5">
                            <span>Progress</span>
                            <span className="font-bold">{proj.progressPercent || 0}%</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                            <div
                              className="h-full bg-assistant-navy rounded-full transition-all"
                              style={{ width: `${proj.progressPercent || 0}%` }}
                            />
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-assistant-coolGrey mt-2">
                            <span>
                              {proj.completedTasksCount || 0} of {proj.tasksCount || 0} tasks
                            </span>
                            {proj.targetDate && (
                              <span>Due {format(new Date(proj.targetDate), 'MMM d, yyyy')}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: ROUTINES WORKSPACE */}
          {currentTab === 'routines' && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-bold text-assistant-navy">Daily & Weekly Habits</h3>
                    <p className="text-xs text-assistant-coolGrey">
                      Permanent recurring definitions, target quantities, duration, and active streaks
                    </p>
                  </div>
                  <button
                    onClick={() => setIsCreateRoutineModalOpen(true)}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold bg-assistant-navy text-white rounded-lg hover:bg-slate-800 transition-colors"
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
                        {r.targetTime ? ` • Target: ${r.targetTime}` : ''}
                        {r.targetQuantity ? ` • Goal: ${r.targetQuantity} ${r.unit || ''}` : ''}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: CALENDAR & PLANNING WORKSPACE */}
          {(currentTab === 'planning' || currentTab === 'calendar') && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                  <div>
                    <h3 className="text-lg font-bold text-assistant-navy">Calendar & Schedule Planning</h3>
                    <p className="text-xs text-assistant-coolGrey">
                      Multi-view agenda, chronological time blocks, and conflict detection (Plan v{dayPlan?.version || 1})
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex bg-slate-100 p-1 rounded-lg">
                      {(['day', 'week', 'agenda'] as const).map((view) => (
                        <button
                          key={view}
                          onClick={() => setCalendarView(view)}
                          className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors capitalize ${
                            calendarView === view
                              ? 'bg-white text-assistant-navy shadow-xs'
                              : 'text-assistant-coolGrey hover:text-assistant-navy'
                          }`}
                        >
                          {view}
                        </button>
                      ))}
                    </div>
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="px-2.5 py-1 text-xs border border-slate-300 rounded-lg text-slate-700"
                    />
                  </div>
                </div>

                {/* Time Blocks: Morning, Afternoon, Evening */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <h4 className="text-xs font-bold text-assistant-navy uppercase tracking-wider mb-2">
                      🌅 Morning ({dayPlan?.morningPriorities?.length || 0})
                    </h4>
                    <div className="space-y-2">
                      {dayPlan?.morningPriorities?.map((t: any) => (
                        <div
                          key={t.id}
                          onClick={() => setSelectedTask(t)}
                          className="p-2.5 rounded bg-white border border-slate-200 text-xs cursor-pointer hover:border-sky-300 transition-colors"
                        >
                          <span className="font-semibold text-assistant-navy">{t.title}</span>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {t.scheduledStartTime ? format(new Date(t.scheduledStartTime), 'h:mm a') : 'Flexible'}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <h4 className="text-xs font-bold text-assistant-navy uppercase tracking-wider mb-2">
                      ☀️ Afternoon ({dayPlan?.afternoonPriorities?.length || 0})
                    </h4>
                    <div className="space-y-2">
                      {dayPlan?.afternoonPriorities?.map((t: any) => (
                        <div
                          key={t.id}
                          onClick={() => setSelectedTask(t)}
                          className="p-2.5 rounded bg-white border border-slate-200 text-xs cursor-pointer hover:border-sky-300 transition-colors"
                        >
                          <span className="font-semibold text-assistant-navy">{t.title}</span>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {t.scheduledStartTime ? format(new Date(t.scheduledStartTime), 'h:mm a') : 'Flexible'}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <h4 className="text-xs font-bold text-assistant-navy uppercase tracking-wider mb-2">
                      🌙 Evening ({dayPlan?.eveningPriorities?.length || 0})
                    </h4>
                    <div className="space-y-2">
                      {dayPlan?.eveningPriorities?.map((t: any) => (
                        <div
                          key={t.id}
                          onClick={() => setSelectedTask(t)}
                          className="p-2.5 rounded bg-white border border-slate-200 text-xs cursor-pointer hover:border-sky-300 transition-colors"
                        >
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

          {/* TAB 6: EMERGENCY WORKSPACE */}
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
                    className="px-3.5 py-1.5 text-xs font-bold bg-assistant-red text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    🚨 Trigger Emergency
                  </button>
                </div>

                <div className="space-y-2.5">
                  {scheduleChanges.length === 0 ? (
                    <p className="text-xs text-assistant-coolGrey py-8 text-center bg-slate-50 rounded-lg border border-dashed border-slate-200">
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

          {/* TAB 7: WELLNESS WORKSPACE */}
          {currentTab === 'wellness' && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-assistant-navy">Health & Wellness Tracking</h3>
                    <p className="text-xs text-assistant-coolGrey">
                      Behavioral insights from routine adherence, hydration, sleep, and self-reported check-ins
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      setConfirmDialog({
                        isOpen: true,
                        title: 'Clear Wellness Logs',
                        message: 'Are you sure you want to clear wellness records? This action cannot be undone.',
                        isDestructive: true,
                        onConfirm: async () => {
                          await api.clearWellnessRecords();
                          queryClient.invalidateQueries({ queryKey: ['wellness-summary'] });
                          setConfirmDialog((p) => ({ ...p, isOpen: false }));
                          toast.info('Wellness records cleared');
                        },
                      })
                    }
                    className="p-2 text-xs font-semibold text-assistant-red hover:bg-red-50 rounded-lg transition-colors flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Clear Records
                  </button>
                </div>

                {/* Quick Log Row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                  <button
                    onClick={() => logMetricMutation.mutate({ type: 'HYDRATION', value: 250, unit: 'ml' })}
                    className="p-3 rounded-lg border border-sky-200 bg-assistant-paleSky hover:bg-sky-100 text-left transition-colors"
                  >
                    <span className="text-xs font-semibold text-assistant-navy">+250ml Water</span>
                    <p className="text-[11px] text-slate-500 mt-1">Hydration intake</p>
                  </button>
                  <button
                    onClick={() => logMetricMutation.mutate({ type: 'EXERCISE', value: 30, unit: 'minutes' })}
                    className="p-3 rounded-lg border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-left transition-colors"
                  >
                    <span className="text-xs font-semibold text-assistant-green">+30m Workout</span>
                    <p className="text-[11px] text-slate-500 mt-1">Exercise duration</p>
                  </button>
                  <button
                    onClick={() => logMetricMutation.mutate({ type: 'SLEEP', value: 8, unit: 'hours' })}
                    className="p-3 rounded-lg border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-left transition-colors"
                  >
                    <span className="text-xs font-semibold text-indigo-700">+8h Sleep</span>
                    <p className="text-[11px] text-slate-500 mt-1">Night sleep</p>
                  </button>
                  <button
                    onClick={() => setIsCheckInModalOpen(true)}
                    className="p-3 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-left transition-colors"
                  >
                    <span className="text-xs font-semibold text-assistant-navy">Daily Check-In</span>
                    <p className="text-[11px] text-slate-500 mt-1">Mood & Energy score</p>
                  </button>
                </div>

                {/* Summary Overview */}
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

          {/* TAB 8: ANALYTICS SUITE */}
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

          {/* TAB 9: AUTOMATION RULES WORKSPACE */}
          {currentTab === 'automation' && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                  <div>
                    <h3 className="text-lg font-bold text-assistant-navy">Rule-Driven Automation Engine</h3>
                    <p className="text-xs text-assistant-coolGrey">
                      Deterministic background rules, continuous focus break suggestions, and schedule triggers
                    </p>
                  </div>
                  <button
                    onClick={() => evaluateRulesMutation.mutate()}
                    className="px-3.5 py-1.5 text-xs font-bold bg-assistant-navy text-white rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-1.5"
                  >
                    <Play className="w-3.5 h-3.5 text-assistant-sky" /> Evaluate Rules Now
                  </button>
                </div>

                {/* Automation Rules List */}
                <div className="space-y-3 mb-8">
                  {automationRules.map((rule) => (
                    <div
                      key={rule.id}
                      className="p-4 rounded-xl border border-slate-200 bg-white flex items-center justify-between gap-4"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-assistant-navy">{rule.name}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                            {rule.ruleType}
                          </span>
                        </div>
                        <p className="text-xs text-assistant-coolGrey mt-1">
                          Cooldown: {rule.cooldownMinutes}m
                          {rule.lastExecutedAt
                            ? ` • Last run: ${format(new Date(rule.lastExecutedAt), 'MMM d, h:mm a')}`
                            : ' • Not executed yet'}
                        </p>
                      </div>

                      <button
                        onClick={() => toggleRuleMutation.mutate({ id: rule.id, isEnabled: !rule.isEnabled })}
                        className={`px-3 py-1 text-xs font-bold rounded-lg border transition-colors ${
                          rule.isEnabled
                            ? 'bg-emerald-50 text-assistant-green border-emerald-200 hover:bg-emerald-100'
                            : 'bg-slate-100 text-slate-400 border-slate-200 hover:bg-slate-200'
                        }`}
                      >
                        {rule.isEnabled ? 'Active' : 'Disabled'}
                      </button>
                    </div>
                  ))}
                </div>

                {/* Execution History */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-assistant-navy mb-3">
                    Recent Automation Executions
                  </h4>
                  <div className="space-y-2">
                    {automationExecutions.length === 0 ? (
                      <p className="text-xs text-assistant-coolGrey py-6 text-center bg-slate-50 rounded-lg border border-dashed border-slate-200">
                        No rule executions recorded yet.
                      </p>
                    ) : (
                      automationExecutions.slice(0, 10).map((exec) => (
                        <div
                          key={exec.id}
                          className="p-3 rounded-lg border border-slate-200 bg-slate-50 text-xs flex items-center justify-between"
                        >
                          <div>
                            <span className="font-semibold text-assistant-navy">{exec.actionTaken}</span>
                            <span className="text-slate-500 ml-2">via {exec.triggeredBy}</span>
                          </div>
                          <span className="text-[11px] text-slate-400">
                            {format(new Date(exec.executedAt), 'h:mm a')}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 10: SETTINGS WORKSPACE */}
          {currentTab === 'settings' && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 max-w-2xl">
                <h3 className="text-lg font-bold text-assistant-navy mb-1">User Settings & Preferences</h3>
                <p className="text-xs text-assistant-coolGrey mb-6">
                  Configure working hours, quiet hours, default task duration, and data portability
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
                        toast.success('Export downloaded', 'Full data package exported.');
                      }}
                      className="flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-assistant-navy text-white text-xs font-semibold hover:bg-slate-800 transition-colors"
                    >
                      <Download className="w-4 h-4 text-assistant-sky" /> Download User Archive (JSON)
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Slide-Over Task Detail Drawer */}
      <TaskDetailDrawer
        task={selectedTask}
        isOpen={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        onUpdate={async (id, data) => updateTaskMutation.mutateAsync({ id, data })}
        onComplete={async (id) => completeTaskMutation.mutateAsync(id)}
        onDelete={async (id) => deleteTaskMutation.mutateAsync(id)}
        onSnooze={async (id, mins) => snoozeTaskMutation.mutateAsync(id)}
        taskEvents={taskEvents}
      />

      {/* Accessible Modals */}
      <CreateTaskModal
        isOpen={isCreateTaskModalOpen}
        onClose={() => setIsCreateTaskModalOpen(false)}
        onSubmit={async (data) => {
          await api.createTask(data);
          queryClient.invalidateQueries({ queryKey: ['tasks'] });
          queryClient.invalidateQueries({ queryKey: ['tasks-all'] });
          queryClient.invalidateQueries({ queryKey: ['daily-kpi'] });
          toast.success('Task created successfully');
        }}
      />

      <CreateRoutineModal
        isOpen={isCreateRoutineModalOpen}
        onClose={() => setIsCreateRoutineModalOpen(false)}
        onSubmit={async (data) => {
          await api.createRoutine(data);
          queryClient.invalidateQueries({ queryKey: ['routines-list'] });
          queryClient.invalidateQueries({ queryKey: ['routine-occurrences'] });
          toast.success('Habit definition created');
        }}
      />

      <WellnessCheckInModal
        isOpen={isCheckInModalOpen}
        onClose={() => setIsCheckInModalOpen(false)}
        onSubmit={async (data) => {
          await checkInMutation.mutateAsync(data);
        }}
      />

      <ProjectModal
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
        onSubmit={async (data) => {
          await createProjectMutation.mutateAsync(data);
        }}
      />

      <EmergencyModal
        isOpen={isEmergencyModalOpen}
        onClose={() => setIsEmergencyModalOpen(false)}
        onSubmit={async (data) => {
          const res = await api.createEmergency(data);
          queryClient.invalidateQueries({ queryKey: ['tasks'] });
          queryClient.invalidateQueries({ queryKey: ['tasks-all'] });
          queryClient.invalidateQueries({ queryKey: ['schedule-changes'] });
          queryClient.invalidateQueries({ queryKey: ['daily-kpi'] });
          toast.warning('Emergency Replan Applied', `Plan v${res.planVersion} active.`);
          return res;
        }}
      />

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        isDestructive={confirmDialog.isDestructive}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog((p) => ({ ...p, isOpen: false }))}
      />

      {/* Bottom Mobile Navigation */}
      <BottomNav
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        onOpenEmergency={() => setIsEmergencyModalOpen(true)}
      />
    </div>
  );
}
