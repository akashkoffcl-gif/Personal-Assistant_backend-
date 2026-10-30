'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, addDays, subDays, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay } from 'date-fns';
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
import { SmartCheckInModal, SmartCheckInTarget } from '@/components/SmartCheckInModal';
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
  Sparkles,
  Layers,
  ArrowRight,
  Eye,
  CheckSquare,
  Square,
  BarChart2,
  CalendarDays,
} from 'lucide-react';

export default function App() {
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0],
  );
  const [analyticsDays, setAnalyticsDays] = useState<number>(7);
  const [calendarView, setCalendarView] = useState<'day' | 'week' | 'agenda'>('day');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTask, setSelectedTask] = useState<TaskDto | null>(null);
  const [activeKpiFilter, setActiveKpiFilter] = useState<'tasks' | 'routines' | 'work' | 'wellness' | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Modals state
  const [isEmergencyModalOpen, setIsEmergencyModalOpen] = useState(false);
  const [isCreateTaskModalOpen, setIsCreateTaskModalOpen] = useState(false);
  const [isCreateRoutineModalOpen, setIsCreateRoutineModalOpen] = useState(false);
  const [isCheckInModalOpen, setIsCheckInModalOpen] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [smartCheckInTarget, setSmartCheckInTarget] = useState<SmartCheckInTarget | null>(null);
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

  // Global Ctrl + K search hotkey
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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
    toast.info('Data refreshed', 'All workspaces synchronized with Supabase & Redis.');
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

  // Smart Habit Check-in & Follow-up Scheduler
  const handleRecordRoutineProgress = async (
    occurrenceId: string,
    actualQuantity: number,
    reminderTime?: string,
    notes?: string,
  ) => {
    const occ = occurrences.find((o) => o.id === occurrenceId);
    const targetQty = occ?.routine?.targetQuantity || 1;
    const isDone = actualQuantity >= targetQty;
    const status = isDone ? TaskStatus.COMPLETED : TaskStatus.IN_PROGRESS;

    // 1. Record occurrence in permanent database
    await api.recordOccurrence(occurrenceId, {
      status,
      actualQuantity,
      notes: notes || undefined,
    });

    // 2. If partial progress and follow-up reminder requested, schedule follow-up task
    if (!isDone && reminderTime && occ?.routine) {
      const remaining = Math.max(0, targetQty - actualQuantity);
      const unit = occ.routine.unit || 'steps';
      await api.createTask({
        title: `Complete remaining ${remaining.toLocaleString()} ${unit} (${occ.routine.title})`,
        category: TaskCategory.ROUTINE,
        routineId: occ.routine.id,
        scheduledStartTime: reminderTime,
        estimatedDurationMinutes: 20,
        priority: Priority.MEDIUM,
        schedulingMode: SchedulingMode.FLEXIBLE,
        notes: `Smart follow-up reminder for habit '${occ.routine.title}'. Current progress: ${actualQuantity.toLocaleString()}/${targetQty.toLocaleString()} ${unit}.`,
      });
    }

    // Refresh data across workspaces
    queryClient.invalidateQueries({ queryKey: ['routine-occurrences'] });
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
    queryClient.invalidateQueries({ queryKey: ['tasks-all'] });
    queryClient.invalidateQueries({ queryKey: ['daily-kpi'] });
    queryClient.invalidateQueries({ queryKey: ['wellness-summary'] });
    queryClient.invalidateQueries({ queryKey: ['analytics-trends'] });

    if (isDone) {
      toast.success('🎉 Goal 100% Achieved!', `${actualQuantity.toLocaleString()} ${occ?.routine?.unit || 'units'} completed today. Streak advanced!`);
    } else {
      toast.info(
        'Progress Saved',
        `${actualQuantity.toLocaleString()} of ${targetQty.toLocaleString()} logged.${
          reminderTime ? ` Follow-up reminder set for ${format(new Date(reminderTime), 'h:mm a')}.` : ''
        }`,
      );
    }
  };

  // Smart Task Check-in & Follow-up Scheduler
  const handleRecordTaskStatus = async (
    taskId: string,
    action: 'complete' | 'partial' | 'snooze' | 'skip',
    rescheduleTime?: string,
    notes?: string,
  ) => {
    if (action === 'complete') {
      await api.completeTask(taskId);
      toast.success('Task Completed', 'Marked done and KPI updated.');
    } else if (action === 'snooze') {
      await api.snoozeTask(taskId, 30, notes);
      toast.info('Task Snoozed', 'Moved forward by 30 minutes.');
    } else if (action === 'partial') {
      await api.updateTask(taskId, {
        status: TaskStatus.IN_PROGRESS,
        notes: notes || 'Partial progress reported via smart check-in.',
        scheduledStartTime: rescheduleTime || undefined,
      });
      toast.info('Progress Logged', `Follow-up reminder set ${rescheduleTime ? `for ${format(new Date(rescheduleTime), 'h:mm a')}` : 'later'}.`);
    } else if (action === 'skip') {
      await api.updateTask(taskId, { status: TaskStatus.SKIPPED, notes: notes || 'Skipped via check-in.' });
      toast.info('Task Skipped for Today');
    }

    queryClient.invalidateQueries({ queryKey: ['tasks'] });
    queryClient.invalidateQueries({ queryKey: ['tasks-all'] });
    queryClient.invalidateQueries({ queryKey: ['daily-kpi'] });
    queryClient.invalidateQueries({ queryKey: ['day-plan'] });
  };

  // Detect pending routine check-in or ended task awaiting follow-up
  const pendingCheckInItem = useMemo(() => {
    // 1. Check for any active routine occurrence not yet 100% completed today
    const pendingRoutine = occurrences.find((occ) => {
      const target = occ.routine?.targetQuantity || 1;
      const actual = occ.actualQuantity || 0;
      return occ.status !== TaskStatus.COMPLETED && actual < target;
    });
    if (pendingRoutine && pendingRoutine.routine) {
      const target = pendingRoutine.routine.targetQuantity || 1;
      const actual = pendingRoutine.actualQuantity || 0;
      const unit = pendingRoutine.routine.unit || 'steps';
      return {
        message: actual > 0
          ? `You have logged ${actual.toLocaleString()}/${target.toLocaleString()} ${unit} for '${pendingRoutine.routine.title}'. Time for your follow-up check-in!`
          : `Daily Habit Check-In: How many ${unit} have you completed today for '${pendingRoutine.routine.title}'?`,
        target: {
          type: 'routine' as const,
          id: pendingRoutine.id,
          routineId: pendingRoutine.routineId,
          title: pendingRoutine.routine.title,
          targetQuantity: pendingRoutine.routine.targetQuantity,
          actualQuantity: pendingRoutine.actualQuantity,
          unit: pendingRoutine.routine.unit,
        },
      };
    }

    // 2. Check for any scheduled task whose end time has passed
    const now = new Date();
    const pastTask = tasks.find((t) => {
      if (t.status === TaskStatus.COMPLETED) return false;
      if (!t.scheduledEndTime) return false;
      return new Date(t.scheduledEndTime).getTime() <= now.getTime();
    });
    if (pastTask) {
      return {
        message: `The scheduled slot for '${pastTask.title}' has concluded. Did you finish this task?`,
        target: {
          type: 'task' as const,
          id: pastTask.id,
          title: pastTask.title,
          estimatedDurationMinutes: pastTask.estimatedDurationMinutes,
          scheduledStartTime: pastTask.scheduledStartTime,
        },
      };
    }

    return null;
  }, [occurrences, tasks]);

  // Filtered tasks by search query & optional project selection
  const filteredTaskList = useMemo(() => {
    let list = allTasks;
    if (selectedProjectId) {
      list = list.filter((t) => t.projectId === selectedProjectId);
    }
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        (t.description && t.description.toLowerCase().includes(q)),
    );
  }, [allTasks, searchQuery, selectedProjectId]);

  // Calendar week calculation
  const weekDays = useMemo(() => {
    const cur = new Date(selectedDate);
    const start = startOfWeek(cur, { weekStartsOn: 1 });
    const end = endOfWeek(cur, { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [selectedDate]);

  return (
    <div className="min-h-screen glass-mesh-bg flex flex-col lg:flex-row relative selection:bg-sky-400 selection:text-slate-950">
      {/* 1. Left Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={(tab) => {
          setCurrentTab(tab);
          setActiveKpiFilter(null);
        }}
        onOpenEmergency={() => setIsEmergencyModalOpen(true)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 pb-20 lg:pb-0">
        <Header
          onOpenCreateTask={() => setIsCreateTaskModalOpen(true)}
          onOpenEmergency={() => setIsEmergencyModalOpen(true)}
          isPushSubscribed={push.isSubscribed}
          onTogglePush={push.isSubscribed ? () => {} : push.subscribe}
          pushLoading={push.loading}
          pushMessage={push.message}
          onRefresh={refreshAll}
          onSearchFocus={() => searchInputRef.current?.focus()}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          {/* TAB 1: COMMAND CENTER (UNIFIED DASHBOARD VIEW) */}
          {currentTab === 'dashboard' && (
            <div className="space-y-6">
              {/* Daily Context Bar with Today/Prev/Next Stepper */}
              <div className="glass-panel rounded-2xl p-4 sm:p-5 border border-white/80 shadow-glass flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-sky-400/20 to-sky-500/30 text-sky-700 flex items-center justify-center border border-sky-300/50 shadow-xs">
                    <Calendar className="w-5 h-5 text-sky-600" />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                      {format(new Date(selectedDate), 'EEEE, MMMM d, yyyy')}
                    </h2>
                    <p className="text-xs text-assistant-coolGrey font-medium">
                      {selectedDate === new Date().toISOString().split('T')[0]
                        ? 'Today’s Active Operational Context'
                        : 'Historical / Forward Scheduled View'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    onClick={handlePrevDay}
                    className="p-2 rounded-xl glass-card hover:border-sky-300 text-slate-700 transition-all hover:scale-105 active:scale-95 shadow-xs"
                    title="Previous Day"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleToday}
                    className="px-4 py-2 text-xs font-bold rounded-xl bg-assistant-navy text-white hover:bg-slate-800 transition-all hover:scale-102 active:scale-95 shadow-xs"
                  >
                    Today
                  </button>
                  <button
                    onClick={handleNextDay}
                    className="p-2 rounded-xl glass-card hover:border-sky-300 text-slate-700 transition-all hover:scale-105 active:scale-95 shadow-xs"
                    title="Next Day"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="px-3 py-1.5 text-xs font-semibold glass-input rounded-xl text-slate-800 ml-1"
                  />
                </div>
              </div>

              {/* Schedule Collision Alert Banner */}
              {dayPlan?.conflicts && dayPlan.conflicts.length > 0 && (
                <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-300/70 shadow-glass-glow-rose backdrop-blur-xl flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5 animate-pulse" />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-black text-rose-800 uppercase tracking-wider">
                      Schedule Conflict Detected ({dayPlan.conflicts.length} Overlapping Slots)
                    </h4>
                    {dayPlan.conflicts.map((c: any, i: number) => (
                      <p key={i} className="text-xs text-rose-700 mt-0.5 font-medium">
                        &apos;{c.taskA}&apos; collides with &apos;{c.taskB}&apos; by {c.overlapMinutes}m. Adjust times or trigger replanning.
                      </p>
                    ))}
                  </div>
                  <button
                    onClick={() => setIsEmergencyModalOpen(true)}
                    className="px-3.5 py-1.5 text-xs font-bold bg-rose-600 text-white rounded-xl hover:bg-rose-700 transition-all shadow-xs shrink-0"
                  >
                    Auto-Replan
                  </button>
                </div>
              )}

              {/* Proactive Smart Check-In Assistant Banner */}
              {pendingCheckInItem && (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-sky-500/15 via-indigo-500/15 to-purple-500/15 border border-sky-300/80 shadow-glass-glow backdrop-blur-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-sky-400 to-indigo-500 text-slate-950 flex items-center justify-center shrink-0 shadow-glass-glow font-bold">
                      <Sparkles className="w-5 h-5 text-slate-950 animate-pulse" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                          Proactive Smart Assistant Check-In
                        </h4>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-800 border border-sky-300/60">
                          Awaiting Response
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 font-semibold mt-0.5">
                        {pendingCheckInItem.message}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSmartCheckInTarget(pendingCheckInItem.target)}
                    className="px-4 py-2 text-xs font-bold text-slate-900 glass-button-primary rounded-xl transition-all shadow-glass-glow flex items-center gap-1.5 shrink-0 self-start sm:self-auto hover:scale-102"
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>Answer & Check-In</span>
                  </button>
                </div>
              )}

              {/* Executive KPI Cards */}
              <KpiCards
                kpi={kpi}
                wellnessTrendLabel={wellness?.adherenceTrendLabel}
                loading={kpiLoading}
                activeFilter={activeKpiFilter}
                onSelectCard={(cardType) => {
                  setActiveKpiFilter(cardType);
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
                    onOpenCreateTask={() => setIsCreateTaskModalOpen(true)}
                    onOpenTaskCheckIn={(task) =>
                      setSmartCheckInTarget({
                        type: 'task',
                        id: task.id,
                        title: task.title,
                        estimatedDurationMinutes: task.estimatedDurationMinutes,
                        scheduledStartTime: task.scheduledStartTime,
                      })
                    }
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
                    onOpenCheckIn={(occ) =>
                      setSmartCheckInTarget({
                        type: 'routine',
                        id: occ.id,
                        routineId: occ.routineId,
                        title: occ.routine?.title || 'Habit',
                        targetQuantity: occ.routine?.targetQuantity,
                        actualQuantity: occ.actualQuantity,
                        unit: occ.routine?.unit,
                      })
                    }
                    onAddRoutine={() => setIsCreateRoutineModalOpen(true)}
                    loading={routinesLoading}
                  />

                  {/* Right Side Widgets (Water, Check-in, Focus Timer) */}
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
                    onQuickCheckIn={(energy, mood) =>
                      checkInMutation.mutate({
                        energyScore: energy,
                        moodScore: mood,
                        notes: 'Quick check-in from widget',
                      })
                    }
                    onLogBreak={() =>
                      logMetricMutation.mutate({
                        type: 'BREAK_COUNT',
                        value: 1,
                        unit: 'count',
                      })
                    }
                    pushLoading={push.loading}
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: TASK & WORK MANAGEMENT WORKSPACE */}
          {(currentTab === 'my-day' || currentTab === 'work') && (
            <div className="space-y-6">
              <div className="glass-panel rounded-2xl p-5 sm:p-6 border border-white/80 shadow-glass">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                  <div>
                    <h3 className="text-lg font-black text-slate-900 tracking-tight">
                      Task & Work Management
                    </h3>
                    <p className="text-xs text-assistant-coolGrey font-medium">
                      Full lifecycle management, deadlines, priorities, and subtask trees
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsCreateTaskModalOpen(true)}
                      className="px-4 py-2 text-xs font-bold text-slate-900 glass-button-primary rounded-xl transition-all shadow-glass-glow flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5 stroke-[2.5]" /> New Task
                    </button>
                  </div>
                </div>

                {/* Interactive Search Bar & Project Selector */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
                  <div className="sm:col-span-2 relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search tasks by title, description or keywords (Ctrl+K)..."
                      className="w-full pl-10 pr-4 py-2.5 text-xs font-semibold glass-input rounded-xl"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="absolute right-3 top-2.5 text-xs font-bold text-slate-400 hover:text-slate-600"
                      >
                        Clear
                      </button>
                    )}
                  </div>

                  <div>
                    <select
                      value={selectedProjectId || ''}
                      onChange={(e) => setSelectedProjectId(e.target.value || null)}
                      className="w-full px-3 py-2.5 text-xs font-bold glass-input rounded-xl text-slate-800"
                    >
                      <option value="">All Projects</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>
                          📁 {p.title}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Task List */}
                <div className="space-y-2.5">
                  {filteredTaskList.length === 0 ? (
                    <div className="py-14 text-center glass-card rounded-2xl border border-dashed border-slate-300 p-6">
                      <CheckCircle2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-xs font-bold text-slate-600">No matching tasks found.</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Try modifying your search or project filter.
                      </p>
                    </div>
                  ) : (
                    filteredTaskList.map((t) => {
                      const isDone = t.status === TaskStatus.COMPLETED;
                      return (
                        <div
                          key={t.id}
                          className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl border transition-all duration-200 select-none ${
                            isDone
                              ? 'bg-emerald-50/40 border-emerald-200/60 opacity-80'
                              : 'glass-card border-white/90 hover:border-sky-300 shadow-glass hover:shadow-glass-hover'
                          }`}
                        >
                          <div
                            onClick={() => setSelectedTask(t)}
                            className="flex-1 cursor-pointer min-w-0"
                          >
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span
                                className={`font-bold text-sm transition-colors ${
                                  isDone ? 'line-through text-slate-400' : 'text-slate-900 hover:text-sky-600'
                                }`}
                              >
                                {t.title}
                              </span>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full glass-pill text-slate-700 uppercase">
                                {t.category}
                              </span>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  t.priority === Priority.URGENT
                                    ? 'bg-rose-500/15 text-rose-700 border border-rose-300/60'
                                    : t.priority === Priority.HIGH
                                    ? 'bg-amber-500/15 text-amber-700 border border-amber-300/60'
                                    : 'glass-pill text-slate-600'
                                }`}
                              >
                                {t.priority}
                              </span>
                              {t.project && (
                                <span
                                  className="text-[10px] font-bold px-2 py-0.5 rounded-full border shadow-2xs"
                                  style={{
                                    backgroundColor: `${t.project.color || '#38BDF8'}15`,
                                    borderColor: `${t.project.color || '#38BDF8'}40`,
                                    color: t.project.color || '#0284C7',
                                  }}
                                >
                                  📁 {t.project.title}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-500 mt-1 truncate font-medium">
                              Status: <span className="font-bold text-slate-700">{t.status}</span> • Duration: {t.estimatedDurationMinutes}m
                              {t.scheduledStartTime ? ` • Start: ${format(new Date(t.scheduledStartTime), 'MMM d, h:mm a')}` : ' • Flexible'}
                              {t.deadline ? ` • Due: ${format(new Date(t.deadline), 'MMM d, h:mm a')}` : ''}
                            </p>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0">
                            {!isDone && (
                              <button
                                onClick={() => completeTaskMutation.mutate(t.id)}
                                className="px-3 py-1.5 text-xs font-bold bg-emerald-500/15 text-emerald-700 border border-emerald-300/60 rounded-xl hover:bg-emerald-500/25 transition-all shadow-xs"
                              >
                                Complete
                              </button>
                            )}
                            <button
                              onClick={() => setSelectedTask(t)}
                              className="px-3 py-1.5 text-xs font-bold text-slate-700 glass-card hover:border-sky-300 rounded-xl transition-all shadow-xs"
                            >
                              Edit Details
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PROJECTS WORKSPACE */}
          {currentTab === 'projects' && (
            <div className="space-y-6">
              <div className="glass-panel rounded-2xl p-5 sm:p-6 border border-white/80 shadow-glass">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-black text-slate-900 tracking-tight">
                      Projects & Workspaces
                    </h3>
                    <p className="text-xs text-assistant-coolGrey font-medium">
                      Organize initiatives, target delivery dates, and group deliverables
                    </p>
                  </div>
                  <button
                    onClick={() => setIsProjectModalOpen(true)}
                    className="px-4 py-2 text-xs font-bold text-slate-900 glass-button-primary rounded-xl transition-all shadow-glass-glow flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" /> New Project
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {projects.length === 0 ? (
                    <div className="col-span-full py-14 text-center glass-card rounded-2xl border border-dashed border-slate-300 p-6">
                      <FolderKanban className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-xs font-bold text-slate-600">No active projects yet.</p>
                      <p className="text-[11px] text-slate-400 mt-0.5 mb-3">
                        Create a project workspace to bundle tasks and measure overall velocity.
                      </p>
                      <button
                        onClick={() => setIsProjectModalOpen(true)}
                        className="px-3.5 py-1.5 text-xs font-bold text-slate-900 glass-button-primary rounded-xl shadow-xs"
                      >
                        Create Project
                      </button>
                    </div>
                  ) : (
                    projects.map((proj) => (
                      <div
                        key={proj.id}
                        onClick={() => {
                          setSelectedProjectId(proj.id);
                          setCurrentTab('work');
                        }}
                        className="p-5 rounded-2xl glass-card border border-white/90 shadow-glass hover:shadow-glass-hover transition-all duration-300 flex flex-col justify-between cursor-pointer group"
                      >
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <span
                              className="w-4 h-4 rounded-full ring-2 ring-white shadow-xs"
                              style={{ backgroundColor: proj.color }}
                            />
                            <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full glass-pill text-slate-800 uppercase">
                              {proj.status}
                            </span>
                          </div>
                          <h4 className="font-extrabold text-base text-slate-900 group-hover:text-sky-600 transition-colors">
                            {proj.title}
                          </h4>
                          {proj.description && (
                            <p className="text-xs text-slate-500 mt-1 line-clamp-2 font-medium">
                              {proj.description}
                            </p>
                          )}
                        </div>

                        <div className="mt-5 pt-3.5 border-t border-slate-200/60">
                          <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-1.5">
                            <span>Progress</span>
                            <span className="text-sky-600">{proj.progressPercent || 0}%</span>
                          </div>
                          <div className="w-full bg-slate-200/50 rounded-full h-2 overflow-hidden shadow-inner">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-sky-400 to-indigo-500 transition-all duration-700"
                              style={{ width: `${proj.progressPercent || 0}%` }}
                            />
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 font-medium">
                            <span>
                              {proj.completedTasksCount || 0} of {proj.tasksCount || 0} tasks done
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

          {/* TAB 4: ROUTINES & HABITS WORKSPACE */}
          {currentTab === 'routines' && (
            <div className="space-y-6">
              <div className="glass-panel rounded-2xl p-5 sm:p-6 border border-white/80 shadow-glass">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-black text-slate-900 tracking-tight">
                      Habits & Daily Routines
                    </h3>
                    <p className="text-xs text-assistant-coolGrey font-medium">
                      Permanent recurring habit definitions, target quantities, and streak tracking
                    </p>
                  </div>
                  <button
                    onClick={() => setIsCreateRoutineModalOpen(true)}
                    className="px-4 py-2 text-xs font-bold text-slate-900 glass-button-primary rounded-xl transition-all shadow-glass-glow flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" /> New Habit
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {routinesList.map((r) => {
                    const todayOcc = occurrences.find((o) => o.routineId === r.id);
                    const actualQty = todayOcc?.actualQuantity || 0;
                    const targetQty = r.targetQuantity || 1;
                    const unit = r.unit || 'units';
                    const progressPercent = Math.min(100, Math.round((actualQty / targetQty) * 100));
                    const isCompleted = todayOcc?.status === TaskStatus.COMPLETED || actualQty >= targetQty;

                    return (
                      <div
                        key={r.id}
                        className="p-5 rounded-2xl glass-card border border-white/90 shadow-glass hover:shadow-glass-hover transition-all duration-300 flex flex-col justify-between gap-4"
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="font-extrabold text-slate-900 text-sm sm:text-base">
                              {r.title}
                            </span>
                            <span className="text-xs font-bold text-amber-700 bg-amber-500/15 px-2.5 py-0.5 rounded-full border border-amber-300/60 shadow-xs flex items-center gap-1">
                              <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-500 animate-pulse" />
                              {r.streakCount} Day Streak
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-1 font-medium">
                            Frequency: <span className="font-bold text-slate-700">{r.frequency}</span> • {r.durationMinutes} min
                            {r.targetTime ? ` • Target: ${r.targetTime}` : ''}
                            {r.targetQuantity ? ` • Goal: ${r.targetQuantity.toLocaleString()} ${r.unit || ''}` : ''}
                          </p>

                          {/* Today's Inline Progress */}
                          <div className="mt-4 p-3 rounded-xl bg-white/60 border border-white/80 space-y-1.5 shadow-2xs">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-slate-500 font-medium">Today&apos;s Status</span>
                              <span className="font-mono font-bold text-slate-800">
                                {actualQty.toLocaleString()} / {targetQty.toLocaleString()} {unit}
                              </span>
                            </div>
                            <div className="w-full bg-slate-200/60 rounded-full h-2 overflow-hidden shadow-inner">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                  isCompleted
                                    ? 'bg-gradient-to-r from-emerald-400 to-teal-500'
                                    : 'bg-gradient-to-r from-sky-400 to-indigo-500'
                                }`}
                                style={{ width: `${Math.max(4, progressPercent)}%` }}
                              />
                            </div>
                            {todayOcc?.notes && (
                              <p className="text-[10px] text-sky-700 font-semibold pt-0.5">
                                🔔 {todayOcc.notes}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-200/50">
                          <span className={`text-[11px] font-bold ${isCompleted ? 'text-emerald-700' : 'text-slate-500'}`}>
                            {isCompleted ? '✅ Goal achieved today' : `${Math.max(0, targetQty - actualQty).toLocaleString()} ${unit} remaining`}
                          </span>
                          <button
                            onClick={() => {
                              if (todayOcc) {
                                setSmartCheckInTarget({
                                  type: 'routine',
                                  id: todayOcc.id,
                                  routineId: r.id,
                                  title: r.title,
                                  targetQuantity: r.targetQuantity,
                                  actualQuantity: todayOcc.actualQuantity,
                                  unit: r.unit,
                                });
                              } else {
                                toast.info('Habit occurrence active', 'Track today in Command Center.');
                              }
                            }}
                            className="px-3 py-1.5 text-xs font-bold text-slate-900 glass-button-primary rounded-xl transition-all shadow-xs flex items-center gap-1.5 hover:scale-102"
                          >
                            <span>{isCompleted ? 'Update Progress' : 'Log / Check-In'}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: CALENDAR & PLANNING WORKSPACE */}
          {(currentTab === 'planning' || currentTab === 'calendar') && (
            <div className="space-y-6">
              <div className="glass-panel rounded-2xl p-5 sm:p-6 border border-white/80 shadow-glass">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                  <div>
                    <h3 className="text-lg font-black text-slate-900 tracking-tight">
                      Calendar & Schedule Planning
                    </h3>
                    <p className="text-xs text-assistant-coolGrey font-medium">
                      Multi-view agenda, time blocks, and deterministic conflict detection (Plan v{dayPlan?.version || 1})
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex bg-white/60 p-1 rounded-xl border border-white/80 shadow-xs">
                      {(['day', 'week', 'agenda'] as const).map((view) => (
                        <button
                          key={view}
                          onClick={() => setCalendarView(view)}
                          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all capitalize ${
                            calendarView === view
                              ? 'bg-assistant-navy text-white shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
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
                      className="px-3 py-1.5 text-xs font-semibold glass-input rounded-xl text-slate-800"
                    />
                  </div>
                </div>

                {/* VIEW 1: DAY TIME BLOCKS */}
                {calendarView === 'day' && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 rounded-2xl glass-card border border-white/80 shadow-xs">
                      <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider mb-3 flex items-center justify-between">
                        <span>🌅 Morning Focus</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 font-bold">
                          {dayPlan?.morningPriorities?.length || 0}
                        </span>
                      </h4>
                      <div className="space-y-2">
                        {dayPlan?.morningPriorities?.map((t: any) => (
                          <div
                            key={t.id}
                            onClick={() => setSelectedTask(t)}
                            className="p-3 rounded-xl glass-card border border-white/90 text-xs cursor-pointer hover:border-sky-300 transition-all shadow-xs"
                          >
                            <span className="font-bold text-slate-900">{t.title}</span>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              {t.scheduledStartTime ? format(new Date(t.scheduledStartTime), 'h:mm a') : 'Flexible'}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl glass-card border border-white/80 shadow-xs">
                      <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider mb-3 flex items-center justify-between">
                        <span>☀️ Afternoon Sessions</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-bold">
                          {dayPlan?.afternoonPriorities?.length || 0}
                        </span>
                      </h4>
                      <div className="space-y-2">
                        {dayPlan?.afternoonPriorities?.map((t: any) => (
                          <div
                            key={t.id}
                            onClick={() => setSelectedTask(t)}
                            className="p-3 rounded-xl glass-card border border-white/90 text-xs cursor-pointer hover:border-sky-300 transition-all shadow-xs"
                          >
                            <span className="font-bold text-slate-900">{t.title}</span>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              {t.scheduledStartTime ? format(new Date(t.scheduledStartTime), 'h:mm a') : 'Flexible'}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl glass-card border border-white/80 shadow-xs">
                      <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider mb-3 flex items-center justify-between">
                        <span>🌙 Evening & Wind Down</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 font-bold">
                          {dayPlan?.eveningPriorities?.length || 0}
                        </span>
                      </h4>
                      <div className="space-y-2">
                        {dayPlan?.eveningPriorities?.map((t: any) => (
                          <div
                            key={t.id}
                            onClick={() => setSelectedTask(t)}
                            className="p-3 rounded-xl glass-card border border-white/90 text-xs cursor-pointer hover:border-sky-300 transition-all shadow-xs"
                          >
                            <span className="font-bold text-slate-900">{t.title}</span>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              {t.scheduledStartTime ? format(new Date(t.scheduledStartTime), 'h:mm a') : 'Flexible'}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* VIEW 2: WEEK GRID */}
                {calendarView === 'week' && (
                  <div className="grid grid-cols-2 sm:grid-cols-7 gap-2">
                    {weekDays.map((day, idx) => {
                      const dayStr = day.toISOString().split('T')[0];
                      const isSelected = isSameDay(day, new Date(selectedDate));
                      const dayTasks = allTasks.filter(
                        (t) => t.scheduledStartTime && t.scheduledStartTime.startsWith(dayStr),
                      );

                      return (
                        <div
                          key={idx}
                          onClick={() => setSelectedDate(dayStr)}
                          className={`p-3 rounded-2xl border transition-all cursor-pointer min-h-40 flex flex-col justify-between ${
                            isSelected
                              ? 'bg-sky-500/15 border-sky-400 shadow-glass-glow'
                              : 'glass-card border-white/80 hover:border-sky-300'
                          }`}
                        >
                          <div>
                            <span className="text-xs font-bold text-slate-500 block uppercase">
                              {format(day, 'EEE')}
                            </span>
                            <span className="text-base font-black text-slate-900">
                              {format(day, 'd')}
                            </span>
                          </div>

                          <div className="mt-2 space-y-1">
                            {dayTasks.slice(0, 2).map((dt) => (
                              <div
                                key={dt.id}
                                className="text-[10px] font-bold truncate p-1 rounded bg-white/80 text-slate-800 shadow-2xs"
                              >
                                {dt.title}
                              </div>
                            ))}
                            {dayTasks.length > 2 && (
                              <span className="text-[9px] font-bold text-sky-600 block">
                                +{dayTasks.length - 2} more
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* VIEW 3: AGENDA LIST */}
                {calendarView === 'agenda' && (
                  <div className="space-y-3">
                    {tasks.map((t) => (
                      <div
                        key={t.id}
                        onClick={() => setSelectedTask(t)}
                        className="p-3.5 rounded-2xl glass-card border border-white/90 flex items-center justify-between cursor-pointer hover:border-sky-300 shadow-xs"
                      >
                        <div>
                          <span className="font-bold text-sm text-slate-900">{t.title}</span>
                          <p className="text-xs text-slate-500 font-medium">
                            {t.scheduledStartTime
                              ? `${format(new Date(t.scheduledStartTime), 'h:mm a')} (${t.estimatedDurationMinutes}m)`
                              : 'Flexible'}
                          </p>
                        </div>
                        <span className="text-xs font-bold px-2.5 py-0.5 rounded-full glass-pill text-slate-700">
                          {t.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 6: EMERGENCY AUDIT WORKSPACE */}
          {currentTab === 'emergency' && (
            <div className="space-y-6">
              <div className="glass-panel rounded-2xl p-5 sm:p-6 border border-white/80 shadow-glass">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-black text-slate-900 tracking-tight">
                      Emergency Replanning Audit History
                    </h3>
                    <p className="text-xs text-assistant-coolGrey font-medium">
                      Historical log of before/after task repositioning events
                    </p>
                  </div>
                  <button
                    onClick={() => setIsEmergencyModalOpen(true)}
                    className="px-4 py-2 text-xs font-bold bg-gradient-to-r from-rose-500 to-red-600 text-white rounded-xl hover:from-rose-600 hover:to-red-700 transition-all shadow-glass-glow-rose"
                  >
                    🚨 Trigger Emergency
                  </button>
                </div>

                <div className="space-y-2.5">
                  {scheduleChanges.length === 0 ? (
                    <p className="text-xs text-slate-500 py-10 text-center glass-card rounded-2xl border border-dashed border-slate-300 font-medium">
                      No emergency schedule replans recorded yet.
                    </p>
                  ) : (
                    scheduleChanges.map((change: any) => (
                      <div
                        key={change.id}
                        className="p-4 rounded-2xl glass-card border border-white/90 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-xs"
                      >
                        <div>
                          <span className="font-extrabold text-slate-900 text-sm">
                            {change.taskTitle || 'Task Modified'}
                          </span>
                          <span className="ml-2 text-[10px] font-bold bg-rose-500/15 text-rose-700 px-2 py-0.5 rounded-full border border-rose-300/60">
                            {change.reason}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-600 font-semibold">
                          <span>
                            {change.originalStartTime
                              ? format(new Date(change.originalStartTime), 'h:mm a')
                              : 'Unscheduled'}
                          </span>
                          <span>➔</span>
                          <span className="font-bold text-sky-600">
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

          {/* TAB 7: HEALTH & WELLNESS WORKSPACE */}
          {currentTab === 'wellness' && (
            <div className="space-y-6">
              <div className="glass-panel rounded-2xl p-5 sm:p-6 border border-white/80 shadow-glass">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-black text-slate-900 tracking-tight">
                      Health & Wellness Tracking
                    </h3>
                    <p className="text-xs text-assistant-coolGrey font-medium">
                      Behavioral insights from hydration, exercise, sleep, and self-reported check-ins
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
                    className="p-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-all flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Clear Records
                  </button>
                </div>

                {/* Quick Log Row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                  <button
                    onClick={() => logMetricMutation.mutate({ type: 'HYDRATION', value: 250, unit: 'ml' })}
                    className="p-4 rounded-2xl glass-card border border-sky-200/70 hover:border-sky-400 text-left transition-all shadow-xs group"
                  >
                    <span className="text-xs font-bold text-sky-700 block group-hover:scale-102 transition-transform">
                      +250ml Water
                    </span>
                    <p className="text-[11px] text-slate-500 mt-1 font-medium">Hydration intake</p>
                  </button>
                  <button
                    onClick={() => logMetricMutation.mutate({ type: 'EXERCISE', value: 30, unit: 'minutes' })}
                    className="p-4 rounded-2xl glass-card border border-emerald-200/70 hover:border-emerald-400 text-left transition-all shadow-xs group"
                  >
                    <span className="text-xs font-bold text-emerald-700 block group-hover:scale-102 transition-transform">
                      +30m Workout
                    </span>
                    <p className="text-[11px] text-slate-500 mt-1 font-medium">Exercise session</p>
                  </button>
                  <button
                    onClick={() => logMetricMutation.mutate({ type: 'SLEEP', value: 8, unit: 'hours' })}
                    className="p-4 rounded-2xl glass-card border border-purple-200/70 hover:border-purple-400 text-left transition-all shadow-xs group"
                  >
                    <span className="text-xs font-bold text-purple-700 block group-hover:scale-102 transition-transform">
                      +8h Sleep
                    </span>
                    <p className="text-[11px] text-slate-500 mt-1 font-medium">Restful sleep</p>
                  </button>
                  <button
                    onClick={() => setIsCheckInModalOpen(true)}
                    className="p-4 rounded-2xl glass-card border border-amber-200/70 hover:border-amber-400 text-left transition-all shadow-xs group"
                  >
                    <span className="text-xs font-bold text-amber-700 block group-hover:scale-102 transition-transform">
                      Daily Check-In
                    </span>
                    <p className="text-[11px] text-slate-500 mt-1 font-medium">Mood & Energy Score</p>
                  </button>
                </div>

                {/* Summary Overview */}
                <div className="p-5 rounded-2xl glass-card border border-white/90 shadow-xs">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-800">
                      Adherence & Consistency Score
                    </span>
                    <span className="text-xs font-bold text-sky-600 bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-200">
                      {wellness?.adherenceTrendLabel || 'Sufficient baseline active'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium">
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
              <div className="glass-panel rounded-2xl p-5 sm:p-6 border border-white/80 shadow-glass">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                  <div>
                    <h3 className="text-lg font-black text-slate-900 tracking-tight">
                      Rule-Driven Automation Engine
                    </h3>
                    <p className="text-xs text-assistant-coolGrey font-medium">
                      Deterministic background rules, continuous focus break suggestions, and schedule triggers
                    </p>
                  </div>
                  <button
                    onClick={() => evaluateRulesMutation.mutate()}
                    className="px-4 py-2 text-xs font-bold text-slate-900 glass-button-primary rounded-xl transition-all shadow-glass-glow flex items-center gap-1.5"
                  >
                    <Play className="w-3.5 h-3.5 stroke-[2.5]" /> Evaluate Rules Now
                  </button>
                </div>

                {/* Automation Rules List */}
                <div className="space-y-3 mb-8">
                  {automationRules.map((rule) => (
                    <div
                      key={rule.id}
                      className="p-4 rounded-2xl glass-card border border-white/90 flex items-center justify-between gap-4 shadow-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-sm text-slate-900">{rule.name}</span>
                          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full glass-pill text-slate-700">
                            {rule.ruleType}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1 font-medium">
                          Cooldown: {rule.cooldownMinutes}m
                          {rule.lastExecutedAt
                            ? ` • Last run: ${format(new Date(rule.lastExecutedAt), 'MMM d, h:mm a')}`
                            : ' • Not executed yet'}
                        </p>
                      </div>

                      <button
                        onClick={() => toggleRuleMutation.mutate({ id: rule.id, isEnabled: !rule.isEnabled })}
                        className={`px-3.5 py-1.5 text-xs font-bold rounded-xl border transition-all ${
                          rule.isEnabled
                            ? 'bg-emerald-500/15 text-emerald-700 border-emerald-300/60 shadow-glass-glow-emerald'
                            : 'glass-card text-slate-400 border-slate-200'
                        }`}
                      >
                        {rule.isEnabled ? 'Active' : 'Disabled'}
                      </button>
                    </div>
                  ))}
                </div>

                {/* Execution History */}
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 mb-3">
                    Recent Automation Executions
                  </h4>
                  <div className="space-y-2">
                    {automationExecutions.length === 0 ? (
                      <p className="text-xs text-slate-400 py-8 text-center glass-card rounded-2xl border border-dashed border-slate-300 font-medium">
                        No rule executions recorded yet.
                      </p>
                    ) : (
                      automationExecutions.slice(0, 10).map((exec) => (
                        <div
                          key={exec.id}
                          className="p-3.5 rounded-xl glass-card border border-white/80 text-xs flex items-center justify-between shadow-xs"
                        >
                          <div>
                            <span className="font-bold text-slate-900">{exec.actionTaken}</span>
                            <span className="text-slate-500 ml-2">via {exec.triggeredBy}</span>
                          </div>
                          <span className="text-[11px] font-bold text-slate-400">
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
              <div className="glass-panel rounded-2xl p-5 sm:p-6 border border-white/80 shadow-glass max-w-2xl">
                <h3 className="text-lg font-black text-slate-900 mb-1 tracking-tight">
                  User Settings & Data Portability
                </h3>
                <p className="text-xs text-assistant-coolGrey mb-6 font-medium">
                  Configure working hours, quiet hours, default task duration, and data portability
                </p>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Work Start Hour (0-23)
                      </label>
                      <input
                        type="number"
                        defaultValue={settings?.workStartHour || 9}
                        className="w-full px-3.5 py-2 text-xs font-semibold glass-input rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Work End Hour (1-24)
                      </label>
                      <input
                        type="number"
                        defaultValue={settings?.workEndHour || 18}
                        className="w-full px-3.5 py-2 text-xs font-semibold glass-input rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Quiet Hours Start (Hour)
                      </label>
                      <input
                        type="number"
                        defaultValue={settings?.quietHoursStart || 22}
                        className="w-full px-3.5 py-2 text-xs font-semibold glass-input rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Quiet Hours End (Hour)
                      </label>
                      <input
                        type="number"
                        defaultValue={settings?.quietHoursEnd || 7}
                        className="w-full px-3.5 py-2 text-xs font-semibold glass-input rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-200/60 flex flex-col gap-3">
                    <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                      Data Portability & Export (GDPR / CCPA)
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
                      className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-assistant-navy text-white text-xs font-bold hover:bg-slate-800 transition-all shadow-xs"
                    >
                      <Download className="w-4 h-4 text-sky-400" /> Download Complete User Archive (JSON)
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

      {/* Proactive Smart Habit & Task Check-In Assistant Modal */}
      <SmartCheckInModal
        isOpen={!!smartCheckInTarget}
        onClose={() => setSmartCheckInTarget(null)}
        target={smartCheckInTarget}
        onRecordRoutineProgress={handleRecordRoutineProgress}
        onRecordTaskStatus={handleRecordTaskStatus}
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
