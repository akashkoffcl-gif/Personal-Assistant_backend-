'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, addDays, subDays, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay } from 'date-fns';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useToast } from '@/components/Toast';
import { HorizontalNavbar, NavTab } from '@/components/HorizontalNavbar';
import { ModernDribbbleDashboard } from '@/components/ModernDribbbleDashboard';
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
import { NotificationCenterDrawer } from '@/components/NotificationCenterDrawer';
import { BottomNav } from '@/components/BottomNav';
import { SmartCheckInModal, SmartCheckInTarget } from '@/components/SmartCheckInModal';
import { FollowUpPromptModal, FollowUpItem } from '@/components/FollowUpPromptModal';
import { ApplicationUsageAnalytics } from '@/components/ApplicationUsageAnalytics';
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
  const router = useRouter();
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const [currentTab, setCurrentTab] = useState<NavTab>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab') as NavTab | null;
      if (tab) return tab;
    }
    return 'dashboard';
  });
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

  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthLoading, isAuthenticated, router]);
  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState(false);
  const [activeFollowUp, setActiveFollowUp] = useState<FollowUpItem | null>(null);

  // Automated Follow-Ups query (Phase 23 Engine)
  const { data: pendingFollowUps = [], refetch: refetchFollowUps } = useQuery({
    queryKey: ['pending-follow-ups'],
    queryFn: () => api.getPendingFollowUps(),
    refetchInterval: 15000,
  });

  useEffect(() => {
    if (pendingFollowUps && pendingFollowUps.length > 0 && !activeFollowUp) {
      setActiveFollowUp(pendingFollowUps[0]);
    }
  }, [pendingFollowUps, activeFollowUp]);

  // Centralized in-app notification center query
  const { data: notificationsData, refetch: refetchNotifications } = useQuery({
    queryKey: ['in-app-notifications-summary'],
    queryFn: () => api.getNotifications({ limit: 10 }),
    refetchInterval: 12000,
  });

  // Global Ctrl + K search hotkey
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab') as NavTab | null;
      if (tabParam) {
        setCurrentTab(tabParam);
      }
      if (params.get('notifications') === 'open') {
        setIsNotificationCenterOpen(true);
      }
    }

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

  const { data: commandCenterData, refetch: refetchCommandCenter } = useQuery({
    queryKey: ['command-center-analytics', selectedDate],
    queryFn: () => api.getCommandCenterAnalytics(selectedDate, 7),
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
    refetchCommandCenter();
    refetchChanges();
    refetchDayPlan();
    refetchRules();
    refetchExecutions();
    refetchNotifications();
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
      toast.success('ðŸŽ‰ Goal 100% Achieved!', `${actualQuantity.toLocaleString()} ${occ?.routine?.unit || 'units'} completed today. Streak advanced!`);
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

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-[#EAE9FF] flex flex-col items-center justify-center p-6">
        <div className="w-14 h-14 rounded-2xl bg-[#8B45F5] text-white flex items-center justify-center font-extrabold text-2xl shadow-lg shadow-[#8B45F5]/30 mb-4 animate-bounce">
          M
        </div>
        <h2 className="text-sm font-extrabold text-[#18181B] tracking-tight">Personal Assistant</h2>
        <p className="text-xs text-[#717182] font-medium mt-1">Synchronizing secure user workspace...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div
      className={`min-h-screen bg-[#EAE9FF] flex flex-col selection:bg-[#EDE9FE] selection:text-[#6935C8] ${
        currentTab === 'dashboard'
          ? 'lg:h-screen lg:max-h-screen lg:overflow-hidden p-2 sm:p-2.5 lg:px-3.5 lg:py-2 max-w-[1760px] w-full mx-auto'
          : 'overflow-x-hidden'
      }`}
    >
      {/* Shared Horizontal Enterprise Navbar */}
      <div
        className={`w-full mx-auto ${
          currentTab === 'dashboard' ? 'p-0 mb-1.5 sm:mb-2' : 'p-3 sm:p-5 lg:p-6 max-w-[1680px] pb-0'
        }`}
      >
        <HorizontalNavbar
          currentTab={currentTab}
          onSelectTab={(tab) => {
            setCurrentTab(tab);
            setActiveKpiFilter(null);
          }}
          onOpenCreateTask={() => setIsCreateTaskModalOpen(true)}
          onOpenCreateRoutine={() => setIsCreateRoutineModalOpen(true)}
          onOpenEmergency={() => setIsEmergencyModalOpen(true)}
          isPushSubscribed={push.isSubscribed}
          onTogglePush={push.isSubscribed ? () => {} : push.subscribe}
          pushLoading={push.loading}
          pushMessage={push.message}
          onRefresh={refreshAll}
          onSearchFocus={() => searchInputRef.current?.focus()}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedDate={selectedDate}
          onOpenNotifications={() => setIsNotificationCenterOpen(true)}
          unreadNotificationsCount={notificationsData?.unreadCount || 0}
        />
      </div>

      {/* Main Content Area — Full Width Layout */}
      <div
        className={`flex-1 flex flex-col min-w-0 ${
          currentTab === 'dashboard' ? 'min-h-0 overflow-hidden pb-0' : 'pb-16 lg:pb-8'
        }`}
      >
        <main
          className={`flex-1 w-full mx-auto ${
            currentTab === 'dashboard'
              ? 'min-h-0 flex flex-col overflow-hidden space-y-0 px-0'
              : 'px-3 sm:px-5 lg:px-6 max-w-[1680px] space-y-6'
          }`}
        >
          {/* Proactive Smart Check-In Assistant Banner */}
          {pendingCheckInItem && (
            <div className="p-4 rounded-2xl bg-[#F4F3FF] border border-[#E5E2F5] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-[0_4px_20px_rgba(139,69,245,0.04)]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#6935C8] to-[#8B45F5] text-white flex items-center justify-center shrink-0 shadow-2xs">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-[#6935C8] uppercase tracking-wider">
                      Proactive Assistant Check-In
                    </h4>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#EDE9FE] text-[#6935C8]">
                      Awaiting Response
                    </span>
                  </div>
                  <p className="text-xs text-[#202033] font-medium mt-0.5">
                    {pendingCheckInItem.message}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSmartCheckInTarget(pendingCheckInItem.target)}
                className="px-4 py-2 text-xs font-bold text-white bg-[#8B45F5] hover:bg-[#7839D6] rounded-xl transition-all shadow-2xs flex items-center gap-1.5 shrink-0 self-start sm:self-auto"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Answer & Check-In</span>
              </button>
            </div>
          )}

          {/* Schedule Collision Alert Banner */}
          {dayPlan?.conflicts && dayPlan.conflicts.length > 0 && (
            <div className="p-4 rounded-2xl bg-[#FFEAEF] border border-[#FECDD6] flex items-start gap-3 shadow-[0_4px_20px_rgba(224,82,104,0.06)]">
              <AlertTriangle className="w-5 h-5 text-[#E05268] shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-bold text-[#E05268] uppercase tracking-wider">
                  Schedule Conflict Detected ({dayPlan.conflicts.length} Overlapping Slots)
                </h4>
                {dayPlan.conflicts.map((c: any, i: number) => (
                  <p key={i} className="text-xs text-[#74738A] font-medium mt-0.5">
                    &apos;{c.taskA}&apos; collides with &apos;{c.taskB}&apos; by {c.overlapMinutes}m. Adjust times or trigger replanning.
                  </p>
                ))}
              </div>
              <button
                onClick={() => setIsEmergencyModalOpen(true)}
                className="px-4 py-1.5 text-xs font-bold bg-[#E05268] hover:bg-[#C4384E] text-white rounded-xl transition-all shadow-2xs shrink-0"
              >
                Auto-Replan
              </button>
            </div>
          )}

          {/* TAB 1: MODERN DRIBBLE DASHBOARD (COMMAND CENTER) */}
          {currentTab === 'dashboard' && (
            <ModernDribbbleDashboard
              tasks={tasks}
              occurrences={occurrences}
              kpi={kpi}
              wellnessSummary={wellness}
              projects={projects}
              trends={trends}
              commandCenterData={commandCenterData}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              onCompleteTask={(id) => completeTaskMutation.mutate(id)}
              onSnoozeTask={(id) => snoozeTaskMutation.mutate(id)}
              onSelectTask={(t) => setSelectedTask(t)}
              onOpenTaskCheckIn={(task) =>
                setSmartCheckInTarget({
                  type: 'task',
                  id: task.id,
                  title: task.title,
                  estimatedDurationMinutes: task.estimatedDurationMinutes,
                  scheduledStartTime: task.scheduledStartTime,
                })
              }
              onOpenRoutineCheckIn={(occ) =>
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
              onOpenEmergency={() => setIsEmergencyModalOpen(true)}
              onOpenCreateTask={() => setIsCreateTaskModalOpen(true)}
              onOpenCreateRoutine={() => setIsCreateRoutineModalOpen(true)}
              onOpenCreateProject={() => setIsProjectModalOpen(true)}
              onOpenCreateReminder={() => setIsCreateTaskModalOpen(true)}
              onOpenCreateEvent={() => setIsCreateTaskModalOpen(true)}
              onOpenWellnessCheckIn={() => setIsCheckInModalOpen(true)}
              onNavigateTab={(tab) => setCurrentTab(tab as any)}
              loading={tasksLoading || routinesLoading}
            />
          )}

          {/* TAB 2: TASK & WORK MANAGEMENT WORKSPACE */}
          {(currentTab === 'my-day' || currentTab === 'work') && (
            <div className="space-y-5">
              <div className="bg-white rounded-2xl p-5 sm:p-6 border border-[#E5E2F5] shadow-[0_4px_20px_rgba(139,69,245,0.04)]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-3 border-b border-[#E5E2F5]">
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                      Task & Work Management
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Full lifecycle management, deadlines, priorities, and subtask trees
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsCreateTaskModalOpen(true)}
                      className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#8B45F5] hover:bg-[#7839D6] rounded-lg transition-colors shadow-xs flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5 stroke-[2.5]" /> New Task
                    </button>
                  </div>
                </div>

                {/* Search Bar & Project Selector */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                  <div className="sm:col-span-2 relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search tasks by title, description or keywords (Ctrl+K)..."
                      className="w-full pl-9 pr-14 py-2 text-xs font-medium border border-[#E5E2F5] rounded-lg bg-white text-slate-900 focus:outline-none focus:border-[#8B45F5]"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="absolute right-3 top-2 text-xs font-semibold text-slate-400 hover:text-slate-600"
                      >
                        Clear
                      </button>
                    )}
                  </div>

                  <div>
                    <select
                      value={selectedProjectId || ''}
                      onChange={(e) => setSelectedProjectId(e.target.value || null)}
                      className="w-full px-3 py-2 text-xs font-medium border border-[#E5E2F5] rounded-lg bg-white text-slate-800"
                    >
                      <option value="">All Projects</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>
                          ðŸ“ {p.title}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Task List */}
                <div className="space-y-2">
                  {filteredTaskList.length === 0 ? (
                    <div className="py-10 text-center rounded-lg border border-dashed border-[#E5E2F5] p-5 bg-[#F4F3FF]/50">
                      <CheckCircle2 className="w-7 h-7 text-slate-300 mx-auto mb-1.5" />
                      <p className="text-xs font-semibold text-slate-700">No matching tasks found.</p>
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
                          className={`flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-lg border transition-colors select-none ${
                            isDone
                              ? 'bg-[#F4F3FF]/80 border-[#E5E2F5] opacity-75'
                              : 'bg-white border-[#E5E2F5] hover:border-slate-300'
                          }`}
                        >
                          <div
                            onClick={() => setSelectedTask(t)}
                            className="flex-1 cursor-pointer min-w-0"
                          >
                            <div className="flex items-center gap-1.5 flex-wrap mb-1">
                              <span
                                className={`font-semibold text-xs transition-colors ${
                                  isDone ? 'line-through text-slate-400' : 'text-slate-900 hover:text-blue-600'
                                }`}
                              >
                                {t.title}
                              </span>
                              <span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 uppercase">
                                {t.category}
                              </span>
                              <span
                                className={`text-[10px] font-semibold px-1.5 py-0.2 rounded ${
                                  t.priority === Priority.URGENT
                                    ? 'bg-red-50 text-red-700 border border-red-200'
                                    : t.priority === Priority.HIGH
                                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                    : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                {t.priority}
                              </span>
                              {t.project && (
                                <span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 border border-[#E5E2F5]">
                                  {t.project.title}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 truncate">
                              Status: <span className="font-semibold text-slate-700">{t.status}</span> â€¢ Duration: {t.estimatedDurationMinutes}m
                              {t.scheduledStartTime ? ` â€¢ Start: ${format(new Date(t.scheduledStartTime), 'MMM d, h:mm a')}` : ' â€¢ Flexible'}
                              {t.deadline ? ` â€¢ Due: ${format(new Date(t.deadline), 'MMM d, h:mm a')}` : ''}
                            </p>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0 pt-2 sm:pt-0">
                            {!isDone && (
                              <button
                                onClick={() => completeTaskMutation.mutate(t.id)}
                                className="px-2.5 py-1 text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md hover:bg-emerald-100 transition-colors"
                              >
                                Complete
                              </button>
                            )}
                            <button
                              onClick={() => setSelectedTask(t)}
                              className="px-2.5 py-1 text-xs font-semibold text-slate-700 bg-white hover:bg-[#F4F3FF] border border-[#E5E2F5] rounded-md transition-colors"
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
            <div className="space-y-5">
              <div className="bg-white rounded-2xl p-5 sm:p-6 border border-[#E5E2F5] shadow-[0_4px_20px_rgba(139,69,245,0.04)]">
                <div className="flex items-center justify-between mb-5 pb-3 border-b border-[#E5E2F5]">
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                      Projects & Workspaces
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Organize initiatives, target delivery dates, and group deliverables
                    </p>
                  </div>
                  <button
                    onClick={() => setIsProjectModalOpen(true)}
                    className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#8B45F5] hover:bg-[#7839D6] rounded-lg transition-colors shadow-xs flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" /> New Project
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {projects.length === 0 ? (
                    <div className="col-span-full py-10 text-center rounded-lg border border-dashed border-[#E5E2F5] p-5 bg-[#F4F3FF]/50">
                      <FolderKanban className="w-7 h-7 text-slate-400 mx-auto mb-1.5" />
                      <p className="text-xs font-semibold text-slate-700">No active projects yet.</p>
                      <p className="text-[11px] text-slate-400 mt-0.5 mb-3">
                        Create a project workspace to bundle tasks and measure overall velocity.
                      </p>
                      <button
                        onClick={() => setIsProjectModalOpen(true)}
                        className="px-3 py-1.5 text-xs font-semibold text-white bg-[#8B45F5] hover:bg-[#7839D6] rounded-lg transition-colors shadow-xs"
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
                        className="p-4 rounded-xl border border-[#E5E2F5] hover:border-slate-300 transition-colors bg-white shadow-xs flex flex-col justify-between cursor-pointer"
                      >
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: proj.color }}
                            />
                            <span className="text-[10px] font-semibold px-2 py-0.2 rounded bg-slate-100 text-slate-700 uppercase">
                              {proj.status}
                            </span>
                          </div>
                          <h4 className="font-semibold text-sm text-slate-900 hover:text-blue-600 transition-colors">
                            {proj.title}
                          </h4>
                          {proj.description && (
                            <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                              {proj.description}
                            </p>
                          )}
                        </div>

                        <div className="mt-4 pt-3 border-t border-[#E5E2F5]">
                          <div className="flex items-center justify-between text-xs font-medium text-slate-700 mb-1">
                            <span>Progress</span>
                            <span className="font-semibold text-blue-600">{proj.progressPercent || 0}%</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-blue-600 transition-all duration-500"
                              style={{ width: `${proj.progressPercent || 0}%` }}
                            />
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1.5">
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
            <div className="space-y-5">
              <div className="bg-white rounded-2xl p-5 sm:p-6 border border-[#E5E2F5] shadow-[0_4px_20px_rgba(139,69,245,0.04)]">
                <div className="flex items-center justify-between mb-5 pb-3 border-b border-[#E5E2F5]">
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                      Habits & Daily Routines
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Permanent recurring habit definitions, target quantities, and streak tracking
                    </p>
                  </div>
                  <button
                    onClick={() => setIsCreateRoutineModalOpen(true)}
                    className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#8B45F5] hover:bg-[#7839D6] rounded-lg transition-colors shadow-xs flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" /> New Habit
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
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
                        className="p-4 rounded-xl border border-[#E5E2F5] hover:border-slate-300 transition-colors bg-white shadow-xs flex flex-col justify-between gap-3"
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-sm text-slate-900">
                              {r.title}
                            </span>
                            <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 flex items-center gap-1">
                              <Flame className="w-3 h-3 text-amber-500 fill-amber-500" />
                              {r.streakCount}d Streak
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Frequency: <span className="font-semibold text-slate-700">{r.frequency}</span> â€¢ {r.durationMinutes} min
                            {r.targetTime ? ` â€¢ Target: ${r.targetTime}` : ''}
                            {r.targetQuantity ? ` â€¢ Goal: ${r.targetQuantity.toLocaleString()} ${r.unit || ''}` : ''}
                          </p>

                          {/* Today's Inline Progress */}
                          <div className="mt-3 p-2.5 rounded-lg bg-[#F4F3FF] border border-[#E5E2F5]/60 space-y-1">
                            <div className="flex items-center justify-between text-[11px] font-medium">
                              <span className="text-slate-500">Today&apos;s Status</span>
                              <span className="font-mono font-semibold text-slate-800">
                                {actualQty.toLocaleString()} / {targetQty.toLocaleString()} {unit}
                              </span>
                            </div>
                            <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                  isCompleted ? 'bg-emerald-600' : 'bg-blue-600'
                                }`}
                                style={{ width: `${Math.max(4, progressPercent)}%` }}
                              />
                            </div>
                            {todayOcc?.notes && (
                              <p className="text-[10px] text-blue-700 font-medium pt-0.5">
                                ðŸ”” {todayOcc.notes}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-[#E5E2F5]">
                          <span className={`text-[11px] font-medium ${isCompleted ? 'text-emerald-700' : 'text-slate-500'}`}>
                            {isCompleted ? 'Goal achieved today' : `${Math.max(0, targetQty - actualQty).toLocaleString()} ${unit} remaining`}
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
                            className="px-2.5 py-1 text-xs font-semibold text-slate-700 bg-white hover:bg-[#F4F3FF] border border-[#E5E2F5] rounded-md transition-colors"
                          >
                            <span>{isCompleted ? 'Update' : 'Log / Check-In'}</span>
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
            <div className="space-y-5">
              <div className="bg-white rounded-2xl p-5 sm:p-6 border border-[#E5E2F5] shadow-[0_4px_20px_rgba(139,69,245,0.04)]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-3 border-b border-[#E5E2F5]">
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                      Calendar & Schedule Planning
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Multi-view agenda, time blocks, and deterministic conflict detection (Plan v{dayPlan?.version || 1})
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex p-0.5 rounded-lg bg-slate-100 border border-[#E5E2F5]">
                      {(['day', 'week', 'agenda'] as const).map((view) => (
                        <button
                          key={view}
                          onClick={() => setCalendarView(view)}
                          className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors capitalize ${
                            calendarView === view
                              ? 'bg-white text-slate-900 shadow-xs font-semibold'
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
                      className="px-2.5 py-1 text-xs font-medium border border-[#E5E2F5] rounded-lg bg-white text-slate-800"
                    />
                  </div>
                </div>

                {/* VIEW 1: DAY TIME BLOCKS */}
                {calendarView === 'day' && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                    <div className="p-3.5 rounded-lg bg-[#F4F3FF] border border-[#E5E2F5]">
                      <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-2.5 flex items-center justify-between">
                        <span>Morning Focus</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 font-semibold border border-blue-200">
                          {dayPlan?.morningPriorities?.length || 0}
                        </span>
                      </h4>
                      <div className="space-y-1.5">
                        {dayPlan?.morningPriorities?.map((t: any) => (
                          <div
                            key={t.id}
                            onClick={() => setSelectedTask(t)}
                            className="p-2.5 rounded-md border border-[#E5E2F5] bg-white text-xs cursor-pointer hover:border-slate-300 transition-colors shadow-2xs"
                          >
                            <span className="font-semibold text-slate-900">{t.title}</span>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              {t.scheduledStartTime ? format(new Date(t.scheduledStartTime), 'h:mm a') : 'Flexible'}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="p-3.5 rounded-lg bg-[#F4F3FF] border border-[#E5E2F5]">
                      <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-2.5 flex items-center justify-between">
                        <span>Afternoon Focus</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-50 text-amber-700 font-semibold border border-amber-200">
                          {dayPlan?.afternoonPriorities?.length || 0}
                        </span>
                      </h4>
                      <div className="space-y-1.5">
                        {dayPlan?.afternoonPriorities?.map((t: any) => (
                          <div
                            key={t.id}
                            onClick={() => setSelectedTask(t)}
                            className="p-2.5 rounded-md border border-[#E5E2F5] bg-white text-xs cursor-pointer hover:border-slate-300 transition-colors shadow-2xs"
                          >
                            <span className="font-semibold text-slate-900">{t.title}</span>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              {t.scheduledStartTime ? format(new Date(t.scheduledStartTime), 'h:mm a') : 'Flexible'}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="p-3.5 rounded-lg bg-[#F4F3FF] border border-[#E5E2F5]">
                      <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-2.5 flex items-center justify-between">
                        <span>Evening Focus</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-200 text-slate-700 font-semibold">
                          {dayPlan?.eveningPriorities?.length || 0}
                        </span>
                      </h4>
                      <div className="space-y-1.5">
                        {dayPlan?.eveningPriorities?.map((t: any) => (
                          <div
                            key={t.id}
                            onClick={() => setSelectedTask(t)}
                            className="p-2.5 rounded-md border border-[#E5E2F5] bg-white text-xs cursor-pointer hover:border-slate-300 transition-colors shadow-2xs"
                          >
                            <span className="font-semibold text-slate-900">{t.title}</span>
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
                          className={`p-2.5 rounded-lg border transition-colors cursor-pointer min-h-36 flex flex-col justify-between ${
                            isSelected
                              ? 'bg-blue-50/50 border-blue-600'
                              : 'bg-white border-[#E5E2F5] hover:border-slate-300'
                          }`}
                        >
                          <div>
                            <span className="text-[11px] font-semibold text-slate-500 block uppercase">
                              {format(day, 'EEE')}
                            </span>
                            <span className="text-sm font-bold text-slate-900">
                              {format(day, 'd')}
                            </span>
                          </div>

                          <div className="mt-2 space-y-1">
                            {dayTasks.slice(0, 2).map((dt) => (
                              <div
                                key={dt.id}
                                className="text-[10px] font-medium truncate p-1 rounded bg-slate-100 text-slate-800"
                              >
                                {dt.title}
                              </div>
                            ))}
                            {dayTasks.length > 2 && (
                              <span className="text-[9px] font-semibold text-blue-600 block">
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
                  <div className="space-y-2">
                    {tasks.map((t) => (
                      <div
                        key={t.id}
                        onClick={() => setSelectedTask(t)}
                        className="p-3 rounded-lg border border-[#E5E2F5] bg-white flex items-center justify-between cursor-pointer hover:border-slate-300 transition-colors"
                      >
                        <div>
                          <span className="font-semibold text-xs text-slate-900">{t.title}</span>
                          <p className="text-[11px] text-slate-500">
                            {t.scheduledStartTime
                              ? `${format(new Date(t.scheduledStartTime), 'h:mm a')} (${t.estimatedDurationMinutes}m)`
                              : 'Flexible'}
                          </p>
                        </div>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
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
            <div className="space-y-5">
              <div className="bg-white rounded-2xl p-5 sm:p-6 border border-[#E5E2F5] shadow-[0_4px_20px_rgba(139,69,245,0.04)]">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#E5E2F5]">
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                      Emergency Replanning Audit History
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Historical log of before/after task repositioning events
                    </p>
                  </div>
                  <button
                    onClick={() => setIsEmergencyModalOpen(true)}
                    className="px-3.5 py-1.5 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors shadow-xs"
                  >
                    Trigger Emergency
                  </button>
                </div>

                <div className="space-y-2">
                  {scheduleChanges.length === 0 ? (
                    <p className="text-xs text-slate-400 py-8 text-center rounded-lg border border-dashed border-[#E5E2F5] bg-[#F4F3FF]">
                      No emergency schedule replans recorded yet.
                    </p>
                  ) : (
                    scheduleChanges.map((change: any) => (
                      <div
                        key={change.id}
                        className="p-3 rounded-lg border border-[#E5E2F5] bg-white text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                      >
                        <div>
                          <span className="font-semibold text-slate-900">
                            {change.taskTitle || 'Task Modified'}
                          </span>
                          <span className="ml-2 text-[10px] font-semibold bg-red-50 text-red-700 px-1.5 py-0.2 rounded border border-red-200">
                            {change.reason}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-600 font-medium">
                          <span>
                            {change.originalStartTime
                              ? format(new Date(change.originalStartTime), 'h:mm a')
                              : 'Unscheduled'}
                          </span>
                          <span>âž”</span>
                          <span className="font-semibold text-blue-600">
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
            <div className="space-y-5">
              <div className="bg-white rounded-2xl p-5 sm:p-6 border border-[#E5E2F5] shadow-[0_4px_20px_rgba(139,69,245,0.04)]">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#E5E2F5]">
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                      Health & Wellness Tracking
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Behavioral indicators from hydration, exercise, sleep, and self-reported check-ins
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
                    className="px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-lg border border-red-200 transition-colors flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Clear Records
                  </button>
                </div>

                {/* Quick Log Row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                  <button
                    onClick={() => logMetricMutation.mutate({ type: 'HYDRATION', value: 250, unit: 'ml' })}
                    className="p-3.5 rounded-lg border border-[#E5E2F5] bg-white hover:border-blue-500 text-left transition-colors shadow-2xs"
                  >
                    <span className="text-xs font-semibold text-blue-700 block">
                      +250ml Water
                    </span>
                    <p className="text-[11px] text-slate-500 mt-0.5">Hydration intake</p>
                  </button>
                  <button
                    onClick={() => logMetricMutation.mutate({ type: 'EXERCISE', value: 30, unit: 'minutes' })}
                    className="p-3.5 rounded-lg border border-[#E5E2F5] bg-white hover:border-emerald-500 text-left transition-colors shadow-2xs"
                  >
                    <span className="text-xs font-semibold text-emerald-700 block">
                      +30m Workout
                    </span>
                    <p className="text-[11px] text-slate-500 mt-0.5">Exercise session</p>
                  </button>
                  <button
                    onClick={() => logMetricMutation.mutate({ type: 'SLEEP', value: 8, unit: 'hours' })}
                    className="p-3.5 rounded-lg border border-[#E5E2F5] bg-white hover:border-purple-500 text-left transition-colors shadow-2xs"
                  >
                    <span className="text-xs font-semibold text-purple-700 block">
                      +8h Sleep
                    </span>
                    <p className="text-[11px] text-slate-500 mt-0.5">Restful sleep</p>
                  </button>
                  <button
                    onClick={() => setIsCheckInModalOpen(true)}
                    className="p-3.5 rounded-lg border border-[#E5E2F5] bg-white hover:border-amber-500 text-left transition-colors shadow-2xs"
                  >
                    <span className="text-xs font-semibold text-amber-700 block">
                      Daily Check-In
                    </span>
                    <p className="text-[11px] text-slate-500 mt-0.5">Mood & Energy</p>
                  </button>
                </div>

                {/* Summary Overview */}
                <div className="p-4 rounded-lg bg-[#F4F3FF] border border-[#E5E2F5]">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                      Adherence & Consistency Status
                    </span>
                    <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      {wellness?.adherenceTrendLabel || 'Insufficient data'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600">
                    Hydration: {wellness?.hydrationTotalMl || 0}ml â€¢ Exercise: {wellness?.exerciseDurationMinutes || 0}m â€¢ Sleep: {wellness?.sleepHours || 0}h
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 8: ANALYTICS SUITE */}
          {currentTab === 'analytics' && (
            <div className="space-y-5">
              <AnalyticsCharts
                data={trends}
                days={analyticsDays}
                onSelectDays={setAnalyticsDays}
                loading={trendsLoading}
              />
            </div>
          )}

          {/* TAB 8B: APPLICATION USAGE ANALYTICS (DOMAIN B) */}
          {currentTab === 'usage-analytics' && (
            <div className="space-y-5">
              <ApplicationUsageAnalytics />
            </div>
          )}

          {/* TAB 9: AUTOMATION RULES WORKSPACE */}
          {currentTab === 'automation' && (
            <div className="space-y-5">
              <div className="bg-white rounded-2xl p-5 sm:p-6 border border-[#E5E2F5] shadow-[0_4px_20px_rgba(139,69,245,0.04)]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-3 border-b border-[#E5E2F5]">
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                      Rule-Driven Automation Engine
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Deterministic background rules, focus break notifications, and schedule triggers
                    </p>
                  </div>
                  <button
                    onClick={() => evaluateRulesMutation.mutate()}
                    className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#8B45F5] hover:bg-[#7839D6] rounded-lg transition-colors shadow-xs flex items-center gap-1.5"
                  >
                    <Play className="w-3.5 h-3.5 stroke-[2.5]" /> Evaluate Rules Now
                  </button>
                </div>

                {/* Automation Rules List */}
                <div className="space-y-2 mb-6">
                  {automationRules.map((rule) => (
                    <div
                      key={rule.id}
                      className="p-3.5 rounded-lg border border-[#E5E2F5] bg-white flex items-center justify-between gap-4"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs text-slate-900">{rule.name}</span>
                          <span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-slate-100 text-slate-700">
                            {rule.ruleType}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Cooldown: {rule.cooldownMinutes}m
                          {rule.lastExecutedAt
                            ? ` â€¢ Last run: ${format(new Date(rule.lastExecutedAt), 'MMM d, h:mm a')}`
                            : ' â€¢ Not executed yet'}
                        </p>
                      </div>

                      <button
                        onClick={() => toggleRuleMutation.mutate({ id: rule.id, isEnabled: !rule.isEnabled })}
                        className={`px-3 py-1 text-xs font-semibold rounded-md border transition-colors ${
                          rule.isEnabled
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-slate-100 text-slate-500 border-[#E5E2F5]'
                        }`}
                      >
                        {rule.isEnabled ? 'Active' : 'Disabled'}
                      </button>
                    </div>
                  ))}
                </div>

                {/* Execution History */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                    Recent Automation Executions
                  </h4>
                  <div className="space-y-1.5">
                    {automationExecutions.length === 0 ? (
                      <p className="text-xs text-slate-400 py-6 text-center rounded-lg border border-dashed border-[#E5E2F5] bg-[#F4F3FF]">
                        No rule executions recorded yet.
                      </p>
                    ) : (
                      automationExecutions.slice(0, 10).map((exec) => (
                        <div
                          key={exec.id}
                          className="p-2.5 rounded-md border border-[#E5E2F5] bg-[#F4F3FF]/50 text-xs flex items-center justify-between"
                        >
                          <div>
                            <span className="font-semibold text-slate-900">{exec.actionTaken}</span>
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
            <div className="space-y-5">
              <div className="bg-white rounded-2xl p-5 sm:p-6 border border-[#E5E2F5] shadow-[0_4px_20px_rgba(139,69,245,0.04)] max-w-2xl">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-0.5 tracking-tight">
                  User Settings & Data Portability
                </h3>
                <p className="text-xs text-slate-500 mb-5">
                  Configure working hours, quiet hours, default task duration, and data portability
                </p>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Work Start Hour (0-23)
                      </label>
                      <input
                        type="number"
                        defaultValue={settings?.workStartHour || 9}
                        className="w-full px-3 py-1.5 text-xs font-medium border border-[#E5E2F5] rounded-lg bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Work End Hour (1-24)
                      </label>
                      <input
                        type="number"
                        defaultValue={settings?.workEndHour || 18}
                        className="w-full px-3 py-1.5 text-xs font-medium border border-[#E5E2F5] rounded-lg bg-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Quiet Hours Start (Hour)
                      </label>
                      <input
                        type="number"
                        defaultValue={settings?.quietHoursStart || 22}
                        className="w-full px-3 py-1.5 text-xs font-medium border border-[#E5E2F5] rounded-lg bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Quiet Hours End (Hour)
                      </label>
                      <input
                        type="number"
                        defaultValue={settings?.quietHoursEnd || 7}
                        className="w-full px-3 py-1.5 text-xs font-medium border border-[#E5E2F5] rounded-lg bg-white"
                      />
                    </div>
                  </div>

                  <div className="pt-4 border-t border-[#E5E2F5] flex flex-col gap-2.5">
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Data Portability & Export (GDPR / CCPA)
                    </span>
                    <button
                      onClick={async () => {
                        const exportJob = (async () => {
                          const data = await api.exportUserData();
                          const blob = new Blob([JSON.stringify(data, null, 2)], {
                            type: 'application/json',
                          });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `personal-assistant-export-${new Date().toISOString()}.json`;
                          a.click();
                          return data;
                        })();

                        toast.promise(exportJob, {
                          loading: 'Preparing comprehensive archive...',
                          success: 'Export package downloaded successfully!',
                          error: (err: any) => `Export failed: ${err?.message || 'API error'}`,
                        });
                      }}
                      className="flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-[#8B45F5] hover:bg-[#7839D6] text-white text-xs font-semibold transition-colors shadow-xs"
                    >
                      <Download className="w-4 h-4 text-white" /> Download Complete User Archive (JSON)
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

      {/* Automated Task & Routine Follow-Up Modal (Phase 23) */}
      <FollowUpPromptModal
        isOpen={!!activeFollowUp}
        item={activeFollowUp}
        onClose={() => setActiveFollowUp(null)}
        onSuccess={(action) => {
          toast.success('Follow-Up Response Recorded', `Status updated: ${action.replace('_', ' ')}`);
          queryClient.invalidateQueries({ queryKey: ['tasks'] });
          queryClient.invalidateQueries({ queryKey: ['routines'] });
          queryClient.invalidateQueries({ queryKey: ['command-center-analytics'] });
          queryClient.invalidateQueries({ queryKey: ['daily-kpi'] });
          refetchFollowUps();
          refetchTasks();
          refetchRoutines();
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

      {/* Persistent Centralized In-App Notification Center Drawer */}
      <NotificationCenterDrawer
        isOpen={isNotificationCenterOpen}
        onClose={() => setIsNotificationCenterOpen(false)}
        isPushSubscribed={push.isSubscribed}
        onTogglePush={push.isSubscribed ? () => {} : push.subscribe}
        pushLoading={push.loading}
        onNavigateTab={(tab) => setCurrentTab(tab as any)}
        initialNotifications={notificationsData?.notifications || []}
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
