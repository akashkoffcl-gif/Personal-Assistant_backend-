'use client';

import React, { useState, useMemo } from 'react';
import { format, addDays, subDays, startOfWeek, eachDayOfInterval, isSameDay } from 'date-fns';
import {
  TaskDto,
  RoutineOccurrenceDto,
  DailyKpiSummary,
  ProjectDto,
  TaskStatus,
  TaskCategory,
  Priority,
} from '@assistant/shared';
import {
  CheckCircle2,
  Calendar,
  Clock,
  RotateCcw,
  AlertTriangle,
  FolderKanban,
  Target,
  Plus,
  ArrowUpRight,
  TrendingUp,
  ChevronRight,
  ChevronDown,
  Sparkles,
  Zap,
  Check,
  X,
  Droplet,
  Footprints,
  Moon,
  Smile,
  Bell,
  RefreshCw,
  Sliders,
  BarChart2,
  ListTodo,
  Layers,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export interface OverviewChartDay {
  date: string;
  dayLabel: string;
  dateLabel: string;
  tasksScheduled: number;
  tasksCompleted: number;
  completionRate: number;
}

export interface ScheduleTimelineItem {
  id: string;
  time: string;
  title: string;
  category: string;
  priority: 'High' | 'Medium' | 'Low';
  status: 'Completed' | 'In Progress' | 'Upcoming';
  emoji: string;
  colorClass: string;
  rawItem?: any;
}

export interface RecentActivityItem {
  id: string;
  icon: string;
  title: string;
  description: string;
  time: string;
}

export interface ModernDribbbleDashboardProps {
  tasks: TaskDto[];
  occurrences: RoutineOccurrenceDto[];
  kpi?: DailyKpiSummary;
  wellnessSummary?: any;
  projects?: ProjectDto[];
  trends?: any;
  commandCenterData?: any;
  selectedDate: string;
  onSelectDate: (date: string) => void;
  onCompleteTask: (taskId: string) => void;
  onSnoozeTask: (taskId: string) => void;
  onSelectTask?: (task: TaskDto) => void;
  onOpenTaskCheckIn?: (task: TaskDto) => void;
  onOpenRoutineCheckIn?: (occurrence: RoutineOccurrenceDto) => void;
  onOpenEmergency: () => void;
  onOpenCreateTask: () => void;
  onOpenCreateRoutine: () => void;
  onOpenCreateProject?: () => void;
  onOpenCreateReminder?: () => void;
  onOpenCreateEvent?: () => void;
  onOpenWellnessCheckIn: () => void;
  onNavigateTab: (tab: string, filter?: any) => void;
  loading?: boolean;
}

export function ModernDribbbleDashboard({
  tasks = [],
  occurrences = [],
  kpi,
  wellnessSummary,
  projects = [],
  trends,
  commandCenterData,
  selectedDate,
  onSelectDate,
  onCompleteTask,
  onSnoozeTask,
  onSelectTask,
  onOpenTaskCheckIn,
  onOpenRoutineCheckIn,
  onOpenEmergency,
  onOpenCreateTask,
  onOpenCreateRoutine,
  onOpenCreateProject,
  onOpenCreateReminder,
  onOpenCreateEvent,
  onOpenWellnessCheckIn,
  onNavigateTab,
  loading = false,
}: ModernDribbbleDashboardProps) {
  const { user, profile } = useAuth();
  const userName = profile?.fullName?.split(' ')[0] || user?.user_metadata?.full_name?.split(' ')[0] || 'Selma';

  const [overviewTimeRange, setOverviewTimeRange] = useState<'7' | '30' | '90'>('7');
  const [projectTab, setProjectTab] = useState<'projects' | 'tasks'>('projects');
  const [analyticsFooterTab, setAnalyticsFooterTab] = useState<'weekly' | 'monthly' | 'custom'>('weekly');
  const [hoveredChartDay, setHoveredChartDay] = useState<any | null>(null);
  const [isFabMenuOpen, setIsFabMenuOpen] = useState(false);

  const currentDateObj = useMemo(() => new Date(selectedDate), [selectedDate]);

  // Dynamic greeting based on current hour
  const timeOfDayGreeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  }, []);

  // 1. KPI Calculations (Combining real backend data with fallback baseline)
  const totalTasksCount = commandCenterData?.kpi?.taskCompletion?.total ?? (tasks.length > 0 ? tasks.length : 8);
  const completedTasksCount =
    commandCenterData?.kpi?.taskCompletion?.completed ??
    tasks.filter((t) => t.status === TaskStatus.COMPLETED).length ??
    6;
  const taskCompletionPercent =
    commandCenterData?.kpi?.taskCompletion?.percentage ??
    (totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 75);

  const totalRoutinesCount =
    commandCenterData?.kpi?.routineAdherence?.total ?? (occurrences.length > 0 ? occurrences.length : 5);
  const completedRoutinesCount =
    commandCenterData?.kpi?.routineAdherence?.completed ??
    occurrences.filter((o) => o.status === TaskStatus.COMPLETED).length ??
    4;
  const routineAdherencePercent =
    commandCenterData?.kpi?.routineAdherence?.percentage ??
    (totalRoutinesCount > 0 ? Math.round((completedRoutinesCount / totalRoutinesCount) * 100) : 80);

  const upcomingCount = commandCenterData?.kpi?.upcomingActivities?.count ?? 5;
  const nextActivityLabel =
    commandCenterData?.kpi?.upcomingActivities?.nextActivity ?? 'Next: 10:00 AM - Team Meeting';

  const overdueCount =
    commandCenterData?.kpi?.overdueItems?.count ??
    tasks.filter(
      (t) =>
        t.deadline &&
        new Date(t.deadline) < new Date() &&
        t.status !== TaskStatus.COMPLETED &&
        t.status !== TaskStatus.CANCELLED,
    ).length ??
    2;
  const overdueDetail = commandCenterData?.kpi?.overdueItems?.detail ?? '1 task • 1 reminder';

  const activeProjectsCount = commandCenterData?.kpi?.activeProjects?.count ?? (projects.length > 0 ? projects.length : 3);
  const focusTimeHours = commandCenterData?.kpi?.focusTime?.hoursText ?? '4.5h';

  // 2. Productivity Overview Multi-day Chart Data
  const overviewChartDays = useMemo<OverviewChartDay[]>(() => {
    if (commandCenterData?.overviewChart && Array.isArray(commandCenterData.overviewChart)) {
      return commandCenterData.overviewChart as OverviewChartDay[];
    }

    const daysCount = Number(overviewTimeRange);
    const result: OverviewChartDay[] = [];
    const today = new Date(selectedDate);

    for (let i = daysCount - 1; i >= 0; i--) {
      const d = subDays(today, i);
      const dayStr = format(d, 'yyyy-MM-dd');
      const baselineScheduled = [8, 10, 7, 11, 9, 12, 6][i % 7];
      const baselineCompleted = [6, 8, 6, 9, 7, 10, 5][i % 7];
      const rate = Math.round((baselineCompleted / baselineScheduled) * 100);

      result.push({
        date: dayStr,
        dayLabel: format(d, 'EEE'),
        dateLabel: format(d, 'MMM d'),
        tasksScheduled: baselineScheduled,
        tasksCompleted: baselineCompleted,
        completionRate: rate,
      });
    }
    return result;
  }, [commandCenterData, overviewTimeRange, selectedDate]);

  // 3. Task Distribution Data (Donut Chart)
  const taskDistribution = useMemo(() => {
    if (commandCenterData?.taskDistribution) {
      return commandCenterData.taskDistribution;
    }

    return {
      total: 39,
      segments: [
        { name: 'Work', count: 16, percent: 42, color: '#8B45F5' },
        { name: 'Personal', count: 11, percent: 28, color: '#3B82F6' },
        { name: 'Projects', count: 7, percent: 18, color: '#F59E0B' },
        { name: 'Other', count: 5, percent: 12, color: '#10B981' },
      ],
    };
  }, [commandCenterData]);

  // 4. Today's Schedule Items (Timeline)
  const scheduleItems = useMemo<ScheduleTimelineItem[]>(() => {
    const list: ScheduleTimelineItem[] = [];

    // Map existing tasks for today
    if (tasks.length > 0) {
      tasks.slice(0, 6).forEach((t, idx) => {
        const timeStr = t.scheduledStartTime
          ? format(new Date(t.scheduledStartTime), 'HH:mm')
          : `0${8 + idx * 2}:00`.slice(-5);
        const isDone = t.status === TaskStatus.COMPLETED;
        list.push({
          id: t.id,
          time: timeStr,
          title: t.title,
          category: t.project?.title ? `Project: ${t.project.title}` : t.category === TaskCategory.WORK ? 'Work' : 'Personal',
          priority: t.priority === Priority.HIGH || t.priority === Priority.URGENT ? 'High' : t.priority === Priority.MEDIUM ? 'Medium' : 'Low',
          status: isDone ? 'Completed' : 'Upcoming',
          emoji: t.category === TaskCategory.WORK ? '💼' : t.projectId ? '📁' : '🌿',
          colorClass: isDone ? 'border-[#DCFCE7] bg-[#F0FAF4]' : 'border-[#E5E2F5] bg-white',
          rawItem: t,
        });
      });
    }

    // Default pristine items matching reference mock-up if empty or partial
    if (list.length < 6) {
      const defaults: ScheduleTimelineItem[] = [
        { id: 'def-1', time: '08:00', title: 'Morning Routine', category: 'Routine', priority: 'Low' as const, status: 'Completed' as const, emoji: '🌿', colorClass: 'border-[#DCFCE7] bg-[#F0FAF4]' },
        { id: 'def-2', time: '10:00', title: 'Team Meeting', category: 'Work', priority: 'High' as const, status: 'Upcoming' as const, emoji: '💼', colorClass: 'border-[#E0E7FF] bg-white' },
        { id: 'def-3', time: '12:30', title: 'Lunch Break', category: 'Personal', priority: 'Medium' as const, status: 'Upcoming' as const, emoji: '🥪', colorClass: 'border-[#E5E2F5] bg-white' },
        { id: 'def-4', time: '14:00', title: 'Project Review', category: 'Project: Website Redesign', priority: 'High' as const, status: 'Upcoming' as const, emoji: '📁', colorClass: 'border-[#E5E2F5] bg-white' },
        { id: 'def-5', time: '16:00', title: 'Gym Session', category: 'Health', priority: 'Low' as const, status: 'Upcoming' as const, emoji: '💚', colorClass: 'border-[#E5E2F5] bg-white' },
        { id: 'def-6', time: '19:00', title: 'Dinner with Family', category: 'Personal', priority: 'Medium' as const, status: 'Upcoming' as const, emoji: '🍽️', colorClass: 'border-[#E5E2F5] bg-white' },
      ];
      return defaults;
    }

    return list;
  }, [tasks]);

  // 5. Daily Routine Tracker Items
  const routineTrackerItems = useMemo(() => {
    return [
      { id: 'rt-1', name: 'Morning Workout', time: '06:30 AM', progress: 100, statusBadge: 'Done', isDone: true, color: '#10B981', icon: '☀️' },
      { id: 'rt-2', name: 'Hydration', time: '09:00 AM', progress: 80, statusBadge: '4/5 cups', isDone: false, color: '#3B82F6', icon: '💧' },
      { id: 'rt-3', name: 'Healthy Breakfast', time: '09:30 AM', progress: 100, statusBadge: 'Done', isDone: true, color: '#10B981', icon: '🥗' },
      { id: 'rt-4', name: 'Meditation', time: '08:00 PM', progress: 0, statusBadge: 'Missed', isDone: false, isMissed: true, color: '#E05268', icon: '🧘' },
      { id: 'rt-5', name: 'Sleep (7-8h)', time: '10:30 PM', progress: 0, statusBadge: 'Upcoming', isDone: false, color: '#74738A', icon: '🌙' },
    ];
  }, []);

  // 6. Projects & Tasks items
  const activeProjectsList = useMemo(() => {
    if (projects.length > 0) {
      return projects.slice(0, 3).map((p, idx) => ({
        id: p.id,
        name: p.title,
        completed: p.completedTasksCount || (idx === 0 ? 6 : idx === 1 ? 3 : 4),
        total: p.tasksCount || (idx === 0 ? 8 : idx === 1 ? 5 : 5),
        percent: p.progressPercent || (idx === 0 ? 75 : idx === 1 ? 60 : 80),
        icon: idx === 0 ? '📁' : idx === 1 ? '📱' : '📈',
      }));
    }

    return [
      { id: 'proj-1', name: 'Website Redesign', completed: 6, total: 8, percent: 75, icon: '📁' },
      { id: 'proj-2', name: 'Mobile App', completed: 3, total: 5, percent: 60, icon: '📱' },
      { id: 'proj-3', name: 'Personal Growth', completed: 4, total: 5, percent: 80, icon: '📈' },
    ];
  }, [projects]);

  // 7. Recent Activity Feed
  const recentActivities = useMemo<RecentActivityItem[]>(() => {
    if (commandCenterData?.recentActivity && Array.isArray(commandCenterData.recentActivity)) {
      return commandCenterData.recentActivity as RecentActivityItem[];
    }

    return [
      { id: 'act-1', icon: 'check', title: 'Task completed', description: 'Website design mockups', time: '2m ago' },
      { id: 'act-2', icon: 'runner', title: 'Routine completed', description: 'Morning Workout', time: '12m ago' },
      { id: 'act-3', icon: 'bell', title: 'Reminder scheduled', description: 'Team meeting at 10:00 AM', time: '28m ago' },
      { id: 'act-4', icon: 'folder', title: 'Project updated', description: 'Mobile App status changed', time: '1h ago' },
      { id: 'act-5', icon: 'bell-purple', title: 'New notification', description: 'You have 2 unread notifications', time: '1h ago' },
    ];
  }, [commandCenterData]);

  // Max value for dual bar chart Y axis
  const maxBarValue = 20;

  return (
    <div className="space-y-6 pb-20 select-none">
      {/* =========================================================================
          SECTION A: WELCOME HEADER & COMMAND ACTIONS
         ========================================================================= */}
      <div className="bg-white rounded-[26px] p-5 sm:p-7 border border-[#E5E2F5] shadow-[0_4px_24px_rgba(139,69,245,0.04)] flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        {/* Left Side: Greeting & Daily Progress Summary */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-5 sm:gap-7">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#F4F3FF] border border-[#E5E2F5] flex items-center justify-center text-2xl shadow-xs shrink-0">
              👋
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-[#202033] tracking-tight">
                {timeOfDayGreeting}, {userName}!
              </h1>
              <p className="text-xs sm:text-sm text-[#74738A] font-medium mt-0.5">
                {format(currentDateObj, 'EEEE, d MMMM yyyy')} &bull; Keep up the great work!
              </p>
            </div>
          </div>

          {/* Mini Today's Progress Donut Ring */}
          <div className="flex items-center gap-3 pl-0 sm:pl-5 sm:border-l sm:border-[#F0F2FA]">
            <div className="relative w-12 h-12 shrink-0 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 40 40">
                <circle cx="20" cy="20" r="16" fill="none" stroke="#F4F4FD" strokeWidth="5" />
                <circle
                  cx="20"
                  cy="20"
                  r="16"
                  fill="none"
                  stroke="#10B981"
                  strokeWidth="5"
                  strokeDasharray="100.5"
                  strokeDashoffset={100.5 * (1 - taskCompletionPercent / 100)}
                  strokeLinecap="round"
                  className="transition-all duration-700 ease-out"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-[11px] font-extrabold text-[#202033]">
                {taskCompletionPercent}%
              </span>
            </div>
            <div>
              <span className="text-xs font-bold text-[#202033] block">Today&apos;s Progress</span>
              <span className="text-[11px] font-medium text-[#74738A] block">
                {completedTasksCount}/{totalTasksCount} tasks completed
              </span>
            </div>
          </div>

          {/* On Track Status Pill */}
          <div className="hidden xl:flex flex-col justify-center pl-5 border-l border-[#F0F2FA]">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#ECFDF5] text-[#16A36A] text-xs font-bold w-fit">
              <span className="w-2 h-2 rounded-full bg-[#16A36A] animate-pulse" />
              <span>On Track</span>
            </div>
            <span className="text-[11px] text-[#74738A] font-medium mt-1">You&apos;re doing great!</span>
          </div>
        </div>

        {/* Right Side: Command Action Toolbar */}
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 shrink-0">
          <button
            onClick={onOpenCreateTask}
            className="px-4 py-2.5 bg-[#8B45F5] hover:bg-[#7839D6] text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-md shadow-[#8B45F5]/25 flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4 text-white" />
            <span>New Task</span>
          </button>

          <button
            onClick={onOpenCreateReminder ? onOpenCreateReminder : onOpenCreateTask}
            className="px-3.5 py-2.5 bg-white hover:bg-[#F4F3FF] text-[#202033] border border-[#E5E2F5] font-semibold text-xs sm:text-sm rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5 text-[#8B45F5]" />
            <span>Reminder</span>
          </button>

          <button
            onClick={onOpenCreateRoutine}
            className="px-3.5 py-2.5 bg-white hover:bg-[#F4F3FF] text-[#202033] border border-[#E5E2F5] font-semibold text-xs sm:text-sm rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5 text-[#8B45F5]" />
            <span>Routine</span>
          </button>

          <button
            onClick={onOpenCreateProject ? onOpenCreateProject : () => onNavigateTab('projects')}
            className="px-3.5 py-2.5 bg-white hover:bg-[#F4F3FF] text-[#202033] border border-[#E5E2F5] font-semibold text-xs sm:text-sm rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5 text-[#8B45F5]" />
            <span>Project</span>
          </button>

          <button
            onClick={onOpenEmergency}
            className="px-4 py-2.5 bg-[#FFEAEF] hover:bg-[#FDD8E0] text-[#E05268] border border-[#FECDD6] font-bold text-xs sm:text-sm rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-2xs"
          >
            <AlertTriangle className="w-4 h-4 text-[#E05268]" />
            <span>Emergency Replan</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          SECTION B: 6 INTERACTIVE KPI INTELLIGENCE CARDS
         ========================================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* KPI 1: Task Completion */}
        <div
          onClick={() => onNavigateTab('work', { filter: 'completed' })}
          className="bg-white rounded-[22px] p-4 sm:p-5 border border-[#E5E2F5] shadow-[0_4px_20px_rgba(139,69,245,0.03)] hover:shadow-[0_8px_25px_rgba(139,69,245,0.08)] hover:border-[#DDD8F8] transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-8 h-8 rounded-full bg-[#ECFDF5] flex items-center justify-center text-[#16A36A]">
                <CheckCircle2 className="w-4 h-4 text-[#16A36A]" />
              </div>
              <span className="text-[11px] font-semibold text-[#74738A] group-hover:text-[#202033] transition-colors">
                Task Completion
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-2xl sm:text-3xl font-extrabold text-[#202033] tracking-tight">
                {completedTasksCount}/{totalTasksCount}
              </span>
              <div className="relative w-10 h-10 shrink-0 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="14" fill="none" stroke="#F4F4FD" strokeWidth="4" />
                  <circle
                    cx="18"
                    cy="18"
                    r="14"
                    fill="none"
                    stroke="#10B981"
                    strokeWidth="4"
                    strokeDasharray="88"
                    strokeDashoffset={88 * (1 - taskCompletionPercent / 100)}
                    strokeLinecap="round"
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-[#202033]">
                  {taskCompletionPercent}%
                </span>
              </div>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-[#F0F2FA] flex items-center justify-between text-[11px]">
            <span className="text-[#16A36A] font-semibold flex items-center gap-1">
              &uarr; 12% vs last week
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-[#9CA3AF] group-hover:text-[#8B45F5] transition-colors" />
          </div>
        </div>

        {/* KPI 2: Routine Adherence */}
        <div
          onClick={() => onNavigateTab('routines')}
          className="bg-white rounded-[22px] p-4 sm:p-5 border border-[#E5E2F5] shadow-[0_4px_20px_rgba(139,69,245,0.03)] hover:shadow-[0_8px_25px_rgba(139,69,245,0.08)] hover:border-[#DDD8F8] transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-8 h-8 rounded-full bg-[#F4F3FF] flex items-center justify-center text-[#8B45F5]">
                <RotateCcw className="w-4 h-4 text-[#8B45F5]" />
              </div>
              <span className="text-[11px] font-semibold text-[#74738A] group-hover:text-[#202033] transition-colors">
                Routine Adherence
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-2xl sm:text-3xl font-extrabold text-[#202033] tracking-tight">
                {completedRoutinesCount}/{totalRoutinesCount}
              </span>
              <div className="relative w-10 h-10 shrink-0 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="14" fill="none" stroke="#F4F4FD" strokeWidth="4" />
                  <circle
                    cx="18"
                    cy="18"
                    r="14"
                    fill="none"
                    stroke="#8B45F5"
                    strokeWidth="4"
                    strokeDasharray="88"
                    strokeDashoffset={88 * (1 - routineAdherencePercent / 100)}
                    strokeLinecap="round"
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-[#202033]">
                  {routineAdherencePercent}%
                </span>
              </div>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-[#F0F2FA] flex items-center justify-between text-[11px]">
            <span className="text-[#16A36A] font-semibold flex items-center gap-1">
              &uarr; 8% vs last week
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-[#9CA3AF] group-hover:text-[#8B45F5] transition-colors" />
          </div>
        </div>

        {/* KPI 3: Upcoming Activities */}
        <div
          onClick={() => onNavigateTab('my-day')}
          className="bg-white rounded-[22px] p-4 sm:p-5 border border-[#E5E2F5] shadow-[0_4px_20px_rgba(139,69,245,0.03)] hover:shadow-[0_8px_25px_rgba(139,69,245,0.08)] hover:border-[#DDD8F8] transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-8 h-8 rounded-full bg-[#EFF6FF] flex items-center justify-center text-[#3B82F6]">
                <Calendar className="w-4 h-4 text-[#3B82F6]" />
              </div>
              <span className="text-[11px] font-semibold text-[#74738A] group-hover:text-[#202033] transition-colors">
                Upcoming Activities
              </span>
            </div>
            <div>
              <span className="text-2xl sm:text-3xl font-extrabold text-[#202033] tracking-tight block">
                {upcomingCount}
              </span>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-[#F0F2FA] flex items-center justify-between text-[11px]">
            <span className="text-[#74738A] font-medium truncate max-w-[130px]">{nextActivityLabel}</span>
            <ChevronRight className="w-3.5 h-3.5 text-[#9CA3AF] group-hover:text-[#8B45F5] transition-colors shrink-0" />
          </div>
        </div>

        {/* KPI 4: Overdue Items */}
        <div
          onClick={() => onNavigateTab('work', { filter: 'overdue' })}
          className={`bg-white rounded-[22px] p-4 sm:p-5 border shadow-[0_4px_20px_rgba(139,69,245,0.03)] hover:shadow-[0_8px_25px_rgba(139,69,245,0.08)] transition-all cursor-pointer group flex flex-col justify-between ${
            overdueCount > 0 ? 'border-[#FECDD6] bg-[#FFFBFB]' : 'border-[#E5E2F5]'
          }`}
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-8 h-8 rounded-full bg-[#FFEAEF] flex items-center justify-center text-[#E05268]">
                <AlertTriangle className="w-4 h-4 text-[#E05268]" />
              </div>
              <span className="text-[11px] font-semibold text-[#74738A] group-hover:text-[#202033] transition-colors">
                Overdue Items
              </span>
            </div>
            <div>
              <span className="text-2xl sm:text-3xl font-extrabold text-[#E05268] tracking-tight block">
                {overdueCount}
              </span>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-[#F0F2FA] flex items-center justify-between text-[11px]">
            <span className="text-[#E05268] font-semibold truncate flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#E05268]" />
              <span>{overdueDetail}</span>
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-[#9CA3AF] group-hover:text-[#E05268] transition-colors shrink-0" />
          </div>
        </div>

        {/* KPI 5: Active Projects */}
        <div
          onClick={() => onNavigateTab('projects')}
          className="bg-white rounded-[22px] p-4 sm:p-5 border border-[#E5E2F5] shadow-[0_4px_20px_rgba(139,69,245,0.03)] hover:shadow-[0_8px_25px_rgba(139,69,245,0.08)] hover:border-[#DDD8F8] transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-8 h-8 rounded-full bg-[#F0FDF4] flex items-center justify-center text-[#10B981]">
                <FolderKanban className="w-4 h-4 text-[#10B981]" />
              </div>
              <span className="text-[11px] font-semibold text-[#74738A] group-hover:text-[#202033] transition-colors">
                Active Projects
              </span>
            </div>
            <div>
              <span className="text-2xl sm:text-3xl font-extrabold text-[#202033] tracking-tight block">
                {activeProjectsCount}
              </span>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-[#F0F2FA] flex items-center justify-between text-[11px]">
            <span className="text-[#74738A] font-medium truncate">2 in progress &bull; 1 on track</span>
            <ChevronRight className="w-3.5 h-3.5 text-[#9CA3AF] group-hover:text-[#8B45F5] transition-colors shrink-0" />
          </div>
        </div>

        {/* KPI 6: Focus Time */}
        <div
          onClick={() => onNavigateTab('analytics')}
          className="bg-white rounded-[22px] p-4 sm:p-5 border border-[#E5E2F5] shadow-[0_4px_20px_rgba(139,69,245,0.03)] hover:shadow-[0_8px_25px_rgba(139,69,245,0.08)] hover:border-[#DDD8F8] transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-8 h-8 rounded-full bg-[#EEF2FF] flex items-center justify-center text-[#6366F1]">
                <Clock className="w-4 h-4 text-[#6366F1]" />
              </div>
              <span className="text-[11px] font-semibold text-[#74738A] group-hover:text-[#202033] transition-colors">
                Focus Time
              </span>
            </div>
            <div>
              <span className="text-2xl sm:text-3xl font-extrabold text-[#202033] tracking-tight block">
                {focusTimeHours}
              </span>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-[#F0F2FA] flex items-center justify-between text-[11px]">
            <span className="text-[#16A36A] font-semibold flex items-center gap-1">
              &uarr; 28% vs last week
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-[#9CA3AF] group-hover:text-[#8B45F5] transition-colors shrink-0" />
          </div>
        </div>
      </div>

      {/* =========================================================================
          SECTION C: PRODUCTIVITY OVERVIEW & TASK DISTRIBUTION
         ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* CHART 1: Productivity Overview (Combined Bar & Line Chart) - 8 cols */}
        <div className="lg:col-span-8 bg-white rounded-[26px] p-6 sm:p-7 border border-[#E5E2F5] shadow-[0_4px_24px_rgba(139,69,245,0.035)] flex flex-col justify-between">
          <div>
            {/* Header & Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-[#202033] tracking-tight">
                  Productivity Overview
                </h3>
              </div>

              <div className="flex items-center gap-4">
                {/* Time range selector dropdown */}
                <div className="relative">
                  <select
                    value={overviewTimeRange}
                    onChange={(e) => setOverviewTimeRange(e.target.value as any)}
                    className="appearance-none bg-[#F4F3FF] border border-[#E5E2F5] text-xs font-semibold text-[#202033] rounded-xl pl-3 pr-8 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#8B45F5]/30 cursor-pointer"
                  >
                    <option value="7">Last 7 days</option>
                    <option value="30">Last 30 days</option>
                    <option value="90">Last 90 days</option>
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-[#74738A] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-5 text-xs text-[#74738A] mb-6">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-xs bg-[#DDD8F8]" />
                <span className="font-medium text-[#202033]">Tasks Completed</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-xs bg-[#8B45F5]" />
                <span className="font-medium text-[#202033]">Tasks Scheduled</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#10B981] ring-2 ring-[#10B981]/30" />
                <span className="font-medium text-[#202033]">Completion Rate</span>
              </div>
            </div>
          </div>

          {/* SVG Combined Dual-Bar + Line Chart */}
          <div className="relative w-full pt-2">
            <div className="h-56 sm:h-64 flex items-end justify-between gap-2 sm:gap-4 relative pb-7">
              {/* Left Y-axis scale */}
              <div className="flex flex-col justify-between h-full text-[10px] sm:text-xs text-[#9CA3AF] font-medium pb-7 pr-2 select-none shrink-0">
                <span>20</span>
                <span>15</span>
                <span>10</span>
                <span>5</span>
                <span>0</span>
              </div>

              {/* Horizontal grid lines */}
              <div className="absolute inset-x-8 inset-y-0 flex flex-col justify-between pointer-events-none pb-7">
                <div className="w-full border-b border-[#F0F2FA]" />
                <div className="w-full border-b border-[#F0F2FA]" />
                <div className="w-full border-b border-[#F0F2FA]" />
                <div className="w-full border-b border-[#F0F2FA]" />
                <div className="w-full border-b border-[#E5E2F5]" />
              </div>

              {/* Day Bars & Data Points */}
              <div className="flex-1 flex items-end justify-between h-full gap-2 sm:gap-4 z-10">
                {overviewChartDays.map((item: OverviewChartDay, idx: number) => {
                  const isSelected = item.date === selectedDate;
                  const schedHeight = Math.min(100, Math.max(15, (item.tasksScheduled / maxBarValue) * 100));
                  const compHeight = Math.min(100, Math.max(10, (item.tasksCompleted / maxBarValue) * 100));

                  return (
                    <div
                      key={item.date}
                      onClick={() => onSelectDate(item.date)}
                      onMouseEnter={() => setHoveredChartDay(item)}
                      onMouseLeave={() => setHoveredChartDay(null)}
                      className="flex-1 flex flex-col items-center justify-end h-full group relative cursor-pointer"
                    >
                      {/* Floating tooltip badge */}
                      {hoveredChartDay?.date === item.date && (
                        <div className="absolute -top-14 bg-[#202033] text-white text-[11px] font-semibold py-1.5 px-3 rounded-xl shadow-lg z-30 pointer-events-none whitespace-nowrap animate-fade-in flex flex-col items-center">
                          <span>
                            {item.tasksCompleted}/{item.tasksScheduled} done &bull; {item.completionRate}%
                          </span>
                          <span className="text-[10px] text-gray-300 font-normal">{item.dateLabel}</span>
                        </div>
                      )}

                      {/* Dual Bar Pillars */}
                      <div className="w-full flex justify-center items-end gap-1.5 h-[160px] sm:h-[190px]">
                        {/* Completed Bar */}
                        <div
                          style={{ height: `${compHeight}%` }}
                          className={`w-3 sm:w-4 max-w-[18px] rounded-t-md transition-all duration-300 ${
                            isSelected ? 'bg-[#8B45F5]' : 'bg-[#DDD8F8] group-hover:bg-[#C9C2F5]'
                          }`}
                        />
                        {/* Scheduled Bar */}
                        <div
                          style={{ height: `${schedHeight}%` }}
                          className={`w-3 sm:w-4 max-w-[18px] rounded-t-md transition-all duration-300 ${
                            isSelected ? 'bg-[#6935C8]' : 'bg-[#A78BFA] group-hover:bg-[#906CF0]'
                          }`}
                        />
                      </div>

                      {/* Line dot indicator */}
                      <div
                        style={{ bottom: `${Math.min(95, Math.max(20, item.completionRate))}%` }}
                        className="absolute w-2.5 h-2.5 rounded-full bg-[#10B981] ring-2 ring-white shadow-xs pointer-events-none transition-all"
                      />

                      {/* Day Label */}
                      <div className="absolute -bottom-1 flex flex-col items-center">
                        <span
                          className={`text-[10px] sm:text-xs font-medium transition-colors ${
                            isSelected ? 'text-[#8B45F5] font-bold' : 'text-[#74738A] group-hover:text-[#202033]'
                          }`}
                        >
                          {item.dayLabel}
                        </span>
                        <span className="text-[9px] text-[#9CA3AF] hidden sm:block">{item.dateLabel.split(' ')[1]}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* CHART 2: Task Distribution (Donut Chart) - 4 cols */}
        <div className="lg:col-span-4 bg-white rounded-[26px] p-6 sm:p-7 border border-[#E5E2F5] shadow-[0_4px_24px_rgba(139,69,245,0.035)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base sm:text-lg font-bold text-[#202033] tracking-tight">
                Task Distribution
              </h3>
            </div>

            {/* Donut Chart with Center Total */}
            <div className="relative w-44 h-44 sm:w-48 sm:h-48 mx-auto my-3 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                {/* Background Ring */}
                <circle cx="50" cy="50" r="38" fill="none" stroke="#F4F4FD" strokeWidth="16" />

                {/* 4 Category Segments */}
                {/* Segment 1: Work (42%) */}
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="none"
                  stroke="#8B45F5"
                  strokeWidth="16"
                  strokeDasharray="238.7"
                  strokeDashoffset={238.7 * (1 - 0.42)}
                  strokeLinecap="round"
                  className="transition-all duration-700 hover:opacity-85 cursor-pointer"
                  onClick={() => onNavigateTab('work', { category: TaskCategory.WORK })}
                />
                {/* Segment 2: Personal (28%) offset */}
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="none"
                  stroke="#3B82F6"
                  strokeWidth="16"
                  strokeDasharray="238.7"
                  strokeDashoffset={238.7 * (1 - 0.28)}
                  strokeLinecap="round"
                  transform="rotate(151.2 50 50)"
                  className="transition-all duration-700 hover:opacity-85 cursor-pointer"
                  onClick={() => onNavigateTab('work', { category: TaskCategory.PERSONAL_ROUTINE })}
                />
                {/* Segment 3: Projects (18%) offset */}
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="none"
                  stroke="#F59E0B"
                  strokeWidth="16"
                  strokeDasharray="238.7"
                  strokeDashoffset={238.7 * (1 - 0.18)}
                  strokeLinecap="round"
                  transform="rotate(252 50 50)"
                  className="transition-all duration-700 hover:opacity-85 cursor-pointer"
                  onClick={() => onNavigateTab('projects')}
                />
                {/* Segment 4: Other (12%) offset */}
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="none"
                  stroke="#10B981"
                  strokeWidth="16"
                  strokeDasharray="238.7"
                  strokeDashoffset={238.7 * (1 - 0.12)}
                  strokeLinecap="round"
                  transform="rotate(316.8 50 50)"
                  className="transition-all duration-700 hover:opacity-85 cursor-pointer"
                />
              </svg>

              {/* Center Total Count */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-3xl font-extrabold text-[#202033] leading-none">
                  {taskDistribution.total}
                </span>
                <span className="text-[11px] font-medium text-[#74738A] mt-1">Total Tasks</span>
              </div>
            </div>
          </div>

          {/* Category breakdown legend */}
          <div className="grid grid-cols-2 gap-2.5 pt-3 border-t border-[#F0F2FA]">
            {taskDistribution.segments.map((seg: any) => (
              <div
                key={seg.name}
                onClick={() => onNavigateTab('work', { category: seg.name })}
                className="flex items-center justify-between p-2 rounded-xl hover:bg-[#F4F3FF] transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: seg.color }} />
                  <span className="text-xs font-semibold text-[#202033] group-hover:text-[#8B45F5] transition-colors truncate">
                    {seg.name}
                  </span>
                </div>
                <span className="text-xs font-bold text-[#74738A] group-hover:text-[#202033] transition-colors">
                  {seg.percent}% ({seg.count})
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* =========================================================================
          SECTION D & E: TODAY'S SCHEDULE & QUICK ACTIONS
         ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* SECTION D: Today's Schedule Timeline (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-[26px] p-6 sm:p-7 border border-[#E5E2F5] shadow-[0_4px_24px_rgba(139,69,245,0.035)] flex flex-col justify-between">
          <div>
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-[#202033] tracking-tight">
                  Today&apos;s Schedule
                </h3>
                <span className="text-xs font-semibold text-[#74738A] bg-[#F4F3FF] px-2.5 py-0.5 rounded-full">
                  {format(currentDateObj, 'EEE, d MMM yyyy')}
                </span>
              </div>
              <button
                onClick={() => onNavigateTab('calendar')}
                className="text-xs sm:text-sm font-semibold text-[#8B45F5] hover:text-[#6935C8] flex items-center gap-1 transition-colors"
              >
                <span>View Calendar</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Timeline Rows */}
            <div className="space-y-3">
              {scheduleItems.map((item) => {
                const isCompleted = item.status === 'Completed';

                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      if (item.rawItem && onSelectTask) {
                        onSelectTask(item.rawItem);
                      }
                    }}
                    className={`p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      isCompleted ? 'bg-[#F0FAF4] border-[#DCFCE7]' : 'bg-white border-[#E5E2F5] hover:border-[#DDD8F8] hover:shadow-xs'
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      {/* Time Pill */}
                      <span className="text-xs sm:text-sm font-bold text-[#74738A] w-12 shrink-0">
                        {item.time}
                      </span>

                      {/* Icon */}
                      <span className="text-xl shrink-0 select-none">{item.emoji}</span>

                      {/* Title & Category */}
                      <div className="min-w-0">
                        <h4
                          className={`text-xs sm:text-sm font-bold truncate tracking-tight ${
                            isCompleted ? 'text-[#16A36A] line-through' : 'text-[#202033]'
                          }`}
                        >
                          {item.title}
                        </h4>
                        <p className="text-[11px] text-[#74738A] font-medium truncate mt-0.5">
                          {item.category}
                        </p>
                      </div>
                    </div>

                    {/* Right Action & Badges */}
                    <div className="flex items-center gap-2.5 shrink-0">
                      {/* Priority pill */}
                      <span
                        className={`text-[10px] sm:text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                          item.priority === 'High'
                            ? 'bg-[#EFF6FF] text-[#3B82F6]'
                            : item.priority === 'Medium'
                            ? 'bg-[#F0FDF4] text-[#10B981]'
                            : 'bg-gray-100 text-[#74738A]'
                        }`}
                      >
                        {item.priority}
                      </span>

                      {/* Status indicator / Complete action */}
                      {isCompleted ? (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#DCFCE7] text-[#16A36A] text-[11px] font-bold">
                          <span>Completed</span>
                          <Check className="w-3.5 h-3.5 text-[#16A36A]" />
                        </div>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (item.rawItem) {
                              onCompleteTask(item.rawItem.id);
                            }
                          }}
                          className="w-7 h-7 rounded-full border-2 border-[#DDD8F8] hover:border-[#10B981] hover:bg-[#F0FAF4] flex items-center justify-center transition-all group/btn"
                          title="Mark complete"
                        >
                          <Check className="w-3.5 h-3.5 text-transparent group-hover/btn:text-[#10B981] transition-colors" />
                        </button>
                      )}

                      <ChevronRight className="w-4 h-4 text-[#9CA3AF] hover:text-[#202033] transition-colors" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* SECTION E: Quick Actions Grid (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-[26px] p-6 sm:p-7 border border-[#E5E2F5] shadow-[0_4px_24px_rgba(139,69,245,0.035)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base sm:text-lg font-bold text-[#202033] tracking-tight">
                Quick Actions
              </h3>
            </div>

            {/* 2x3 Grid of square action tiles */}
            <div className="grid grid-cols-3 gap-3">
              {/* Tile 1: Add Task */}
              <button
                onClick={onOpenCreateTask}
                className="p-4 rounded-2xl border border-[#E5E2F5] hover:border-[#8B45F5] hover:bg-[#F4F3FF] transition-all flex flex-col items-center justify-center gap-2 group cursor-pointer shadow-2xs"
              >
                <div className="w-10 h-10 rounded-xl bg-[#F4F3FF] group-hover:bg-[#8B45F5] text-[#8B45F5] group-hover:text-white flex items-center justify-center transition-colors">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-[#202033] group-hover:text-[#8B45F5] transition-colors">
                  Add Task
                </span>
              </button>

              {/* Tile 2: Add Reminder */}
              <button
                onClick={onOpenCreateReminder ? onOpenCreateReminder : onOpenCreateTask}
                className="p-4 rounded-2xl border border-[#E5E2F5] hover:border-[#3B82F6] hover:bg-[#EFF6FF] transition-all flex flex-col items-center justify-center gap-2 group cursor-pointer shadow-2xs"
              >
                <div className="w-10 h-10 rounded-xl bg-[#EFF6FF] group-hover:bg-[#3B82F6] text-[#3B82F6] group-hover:text-white flex items-center justify-center transition-colors">
                  <Clock className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-[#202033] group-hover:text-[#3B82F6] transition-colors">
                  Add Reminder
                </span>
              </button>

              {/* Tile 3: Add Routine */}
              <button
                onClick={onOpenCreateRoutine}
                className="p-4 rounded-2xl border border-[#E5E2F5] hover:border-[#8B45F5] hover:bg-[#F4F3FF] transition-all flex flex-col items-center justify-center gap-2 group cursor-pointer shadow-2xs"
              >
                <div className="w-10 h-10 rounded-xl bg-[#F4F3FF] group-hover:bg-[#8B45F5] text-[#8B45F5] group-hover:text-white flex items-center justify-center transition-colors">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-[#202033] group-hover:text-[#8B45F5] transition-colors">
                  Add Routine
                </span>
              </button>

              {/* Tile 4: Add Project */}
              <button
                onClick={onOpenCreateProject ? onOpenCreateProject : () => onNavigateTab('projects')}
                className="p-4 rounded-2xl border border-[#E5E2F5] hover:border-[#10B981] hover:bg-[#ECFDF5] transition-all flex flex-col items-center justify-center gap-2 group cursor-pointer shadow-2xs"
              >
                <div className="w-10 h-10 rounded-xl bg-[#ECFDF5] group-hover:bg-[#10B981] text-[#10B981] group-hover:text-white flex items-center justify-center transition-colors">
                  <FolderKanban className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-[#202033] group-hover:text-[#10B981] transition-colors">
                  Add Project
                </span>
              </button>

              {/* Tile 5: Add Event */}
              <button
                onClick={onOpenCreateEvent ? onOpenCreateEvent : onOpenCreateTask}
                className="p-4 rounded-2xl border border-[#E5E2F5] hover:border-[#8B45F5] hover:bg-[#F4F3FF] transition-all flex flex-col items-center justify-center gap-2 group cursor-pointer shadow-2xs"
              >
                <div className="w-10 h-10 rounded-xl bg-[#F4F3FF] group-hover:bg-[#8B45F5] text-[#8B45F5] group-hover:text-white flex items-center justify-center transition-colors">
                  <Calendar className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-[#202033] group-hover:text-[#8B45F5] transition-colors">
                  Add Event
                </span>
              </button>

              {/* Tile 6: Emergency Replan */}
              <button
                onClick={onOpenEmergency}
                className="p-4 rounded-2xl border border-[#FECDD6] bg-[#FFFBFB] hover:bg-[#FFEAEF] hover:border-[#E05268] transition-all flex flex-col items-center justify-center gap-2 group cursor-pointer shadow-2xs"
              >
                <div className="w-10 h-10 rounded-xl bg-[#FFEAEF] group-hover:bg-[#E05268] text-[#E05268] group-hover:text-white flex items-center justify-center transition-colors">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-[#E05268] transition-colors">
                  Emergency Replan
                </span>
              </button>
            </div>
          </div>

          {/* Reschedule Promo Banner */}
          <div
            onClick={onOpenEmergency}
            className="mt-6 p-4 rounded-2xl bg-[#F4F3FF] border border-[#DDD8F8] hover:bg-[#EDE9FE] transition-all cursor-pointer flex items-center justify-between gap-3 shadow-2xs"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-white text-[#8B45F5] flex items-center justify-center text-lg shadow-2xs shrink-0">
                <Sparkles className="w-5 h-5 text-[#8B45F5]" />
              </div>
              <div className="min-w-0">
                <h5 className="text-xs sm:text-sm font-bold text-[#202033] truncate">
                  Need to reschedule your day?
                </h5>
                <p className="text-[11px] text-[#74738A] font-medium truncate mt-0.5">
                  Use Emergency Replan to adjust your schedule around unexpected changes.
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-[#8B45F5] shrink-0" />
          </div>
        </div>
      </div>

      {/* =========================================================================
          SECTION F, G, H, I: ROUTINE TRACKER, PROJECTS & TASKS, WELLNESS, RECENT ACTIVITY
         ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* CARD F: Routine Tracker */}
        <div className="bg-white rounded-[26px] p-5 sm:p-6 border border-[#E5E2F5] shadow-[0_4px_24px_rgba(139,69,245,0.035)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-[#202033] tracking-tight">Routine Tracker</h3>
              <button
                onClick={() => onNavigateTab('routines')}
                className="text-xs font-semibold text-[#8B45F5] hover:text-[#6935C8] transition-colors"
              >
                View All
              </button>
            </div>

            <div className="space-y-3.5">
              {routineTrackerItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => {
                    if (occurrences.length > 0 && onOpenRoutineCheckIn) {
                      onOpenRoutineCheckIn(occurrences[0]);
                    }
                  }}
                  className="space-y-1.5 cursor-pointer group"
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-base select-none">{item.icon}</span>
                      <span className="font-bold text-[#202033] group-hover:text-[#8B45F5] transition-colors truncate">
                        {item.name}
                      </span>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        item.isDone
                          ? 'bg-[#DCFCE7] text-[#16A36A]'
                          : item.isMissed
                          ? 'bg-[#FFEAEF] text-[#E05268]'
                          : item.progress > 0
                          ? 'bg-[#EFF6FF] text-[#3B82F6]'
                          : 'bg-gray-100 text-[#74738A]'
                      }`}
                    >
                      {item.isDone ? '✓ ' : ''}
                      {item.statusBadge}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-[#74738A]">
                    <span>{item.time}</span>
                    <span className="font-semibold">{item.progress}%</span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full h-1.5 rounded-full bg-[#F4F4FD] overflow-hidden">
                    <div
                      style={{ width: `${item.progress}%`, backgroundColor: item.color }}
                      className="h-full rounded-full transition-all duration-500"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CARD G: Projects & Tasks */}
        <div className="bg-white rounded-[26px] p-5 sm:p-6 border border-[#E5E2F5] shadow-[0_4px_24px_rgba(139,69,245,0.035)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-[#202033] tracking-tight">Projects &amp; Tasks</h3>
              <button
                onClick={() => onNavigateTab('projects')}
                className="text-xs font-semibold text-[#8B45F5] hover:text-[#6935C8] transition-colors"
              >
                View All
              </button>
            </div>

            {/* Pill Tabs */}
            <div className="flex items-center gap-1.5 p-1 bg-[#F4F3FF] rounded-xl mb-4 border border-[#E5E2F5]">
              <button
                onClick={() => setProjectTab('projects')}
                className={`flex-1 py-1 text-xs font-bold rounded-lg transition-all ${
                  projectTab === 'projects'
                    ? 'bg-white text-[#8B45F5] shadow-xs'
                    : 'text-[#74738A] hover:text-[#202033]'
                }`}
              >
                Active Projects
              </button>
              <button
                onClick={() => setProjectTab('tasks')}
                className={`flex-1 py-1 text-xs font-bold rounded-lg transition-all ${
                  projectTab === 'tasks'
                    ? 'bg-white text-[#8B45F5] shadow-xs'
                    : 'text-[#74738A] hover:text-[#202033]'
                }`}
              >
                Recent Tasks
              </button>
            </div>

            {/* Project List */}
            <div className="space-y-4">
              {activeProjectsList.map((p) => (
                <div
                  key={p.id}
                  onClick={() => onNavigateTab('projects')}
                  className="space-y-1.5 cursor-pointer group p-2 rounded-xl hover:bg-[#FBFBFF] transition-colors"
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-base select-none">{p.icon}</span>
                      <span className="font-bold text-[#202033] group-hover:text-[#8B45F5] transition-colors truncate">
                        {p.name}
                      </span>
                    </div>
                    <span className="text-[11px] font-semibold text-[#74738A]">
                      {p.completed}/{p.total} tasks
                    </span>
                  </div>

                  <div className="w-full h-1.5 rounded-full bg-[#F4F4FD] overflow-hidden">
                    <div
                      style={{ width: `${p.percent}%` }}
                      className="h-full rounded-full bg-[#8B45F5] transition-all duration-500"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CARD H: Wellness & Habit Insights */}
        <div className="bg-white rounded-[26px] p-5 sm:p-6 border border-[#E5E2F5] shadow-[0_4px_24px_rgba(139,69,245,0.035)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-[#202033] tracking-tight">
                Wellness &amp; Habit Insights
              </h3>
              <button
                onClick={() => onNavigateTab('wellness')}
                className="text-xs font-semibold text-[#8B45F5] hover:text-[#6935C8] transition-colors"
              >
                View All
              </button>
            </div>

            {/* 2x2 Metric Cards Grid */}
            <div className="grid grid-cols-2 gap-2.5 mb-4">
              {/* Exercise */}
              <div className="p-3 rounded-2xl bg-[#F0FAF4] border border-[#DCFCE7] flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1 text-[11px] font-bold text-[#16A36A]">
                    <Footprints className="w-3.5 h-3.5" />
                    <span>Exercise</span>
                  </div>
                  <span className="text-xs font-extrabold text-[#202033] mt-1 block">4/5 days</span>
                </div>
                <span className="text-xs font-bold text-[#16A36A]">80%</span>
              </div>

              {/* Water Intake */}
              <div className="p-3 rounded-2xl bg-[#EFF6FF] border border-[#DBEAFE] flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1 text-[11px] font-bold text-[#3B82F6]">
                    <Droplet className="w-3.5 h-3.5" />
                    <span>Water Intake</span>
                  </div>
                  <span className="text-xs font-extrabold text-[#202033] mt-1 block">6/8 cups</span>
                </div>
                <span className="text-xs font-bold text-[#3B82F6]">75%</span>
              </div>

              {/* Sleep */}
              <div className="p-3 rounded-2xl bg-[#F5F3FF] border border-[#EDE9FE] flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1 text-[11px] font-bold text-[#8B45F5]">
                    <Moon className="w-3.5 h-3.5" />
                    <span>Sleep</span>
                  </div>
                  <span className="text-xs font-extrabold text-[#202033] mt-1 block">7h 15m</span>
                </div>
                <span className="text-xs font-bold text-[#8B45F5]">Good</span>
              </div>

              {/* Mood */}
              <div className="p-3 rounded-2xl bg-[#FFFBEB] border border-[#FEF3C7] flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1 text-[11px] font-bold text-[#F59E0B]">
                    <Smile className="w-3.5 h-3.5" />
                    <span>Mood</span>
                  </div>
                  <span className="text-xs font-extrabold text-[#202033] mt-1 block">Positive</span>
                </div>
                <span className="text-xs font-bold text-[#F59E0B]">Good</span>
              </div>
            </div>

            {/* Sparkline Wellness Trend */}
            <div className="pt-2 border-t border-[#F0F2FA]">
              <div className="flex items-center justify-between mb-1.5 text-xs">
                <span className="font-bold text-[#202033]">Wellness Trend</span>
                <span className="font-bold text-[#16A36A] flex items-center gap-1">
                  Overall consistency 78% &uarr;
                </span>
              </div>
              {/* Smooth SVG Trend Sparkline */}
              <div className="w-full h-10">
                <svg className="w-full h-full overflow-visible" viewBox="0 0 200 40">
                  <path
                    d="M 0 30 Q 30 15, 60 22 T 120 18 T 170 12 T 200 8"
                    fill="none"
                    stroke="#8B45F5"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                  <circle cx="200" cy="8" r="3.5" fill="#8B45F5" className="animate-ping opacity-75" />
                  <circle cx="200" cy="8" r="3.5" fill="#8B45F5" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* CARD I: Recent Activity Feed */}
        <div className="bg-white rounded-[26px] p-5 sm:p-6 border border-[#E5E2F5] shadow-[0_4px_24px_rgba(139,69,245,0.035)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-[#202033] tracking-tight">Recent Activity</h3>
              <button
                onClick={() => onNavigateTab('analytics')}
                className="text-xs font-semibold text-[#8B45F5] hover:text-[#6935C8] transition-colors"
              >
                View All
              </button>
            </div>

            <div className="space-y-3.5">
              {recentActivities.map((act: RecentActivityItem) => (
                <div key={act.id} className="flex items-start gap-3 text-xs group">
                  <div className="w-7 h-7 rounded-full bg-[#F4F3FF] border border-[#E5E2F5] flex items-center justify-center text-[#8B45F5] shrink-0 mt-0.5">
                    {act.icon === 'check' ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#8B45F5]" />
                    ) : act.icon === 'runner' ? (
                      <Footprints className="w-3.5 h-3.5 text-[#10B981]" />
                    ) : act.icon === 'folder' ? (
                      <FolderKanban className="w-3.5 h-3.5 text-[#3B82F6]" />
                    ) : (
                      <Bell className="w-3.5 h-3.5 text-[#8B45F5]" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-[#202033] truncate group-hover:text-[#8B45F5] transition-colors">
                      {act.title}
                    </p>
                    <p className="text-[11px] text-[#74738A] truncate mt-0.5">{act.description}</p>
                  </div>
                  <span className="text-[10px] text-[#9CA3AF] font-medium shrink-0">{act.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          SECTION J: PRODUCTIVITY ANALYTICS SUMMARY FOOTER & FAB
         ========================================================================= */}
      <div className="bg-white rounded-[22px] p-4 sm:p-5 border border-[#E5E2F5] shadow-[0_4px_24px_rgba(139,69,245,0.04)] flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left Side: Module Label & Mode Selector */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-[#8B45F5]" />
            <span className="text-sm font-bold text-[#202033] tracking-tight">Productivity Analytics</span>
          </div>

          <div className="flex items-center gap-1 p-1 bg-[#F4F3FF] rounded-xl border border-[#E5E2F5]">
            <button
              onClick={() => setAnalyticsFooterTab('weekly')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                analyticsFooterTab === 'weekly'
                  ? 'bg-white text-[#8B45F5] shadow-xs'
                  : 'text-[#74738A] hover:text-[#202033]'
              }`}
            >
              Weekly
            </button>
            <button
              onClick={() => setAnalyticsFooterTab('monthly')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                analyticsFooterTab === 'monthly'
                  ? 'bg-white text-[#8B45F5] shadow-xs'
                  : 'text-[#74738A] hover:text-[#202033]'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setAnalyticsFooterTab('custom')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                analyticsFooterTab === 'custom'
                  ? 'bg-white text-[#8B45F5] shadow-xs'
                  : 'text-[#74738A] hover:text-[#202033]'
              }`}
            >
              Custom
            </button>
          </div>
        </div>

        {/* Right Side: Key Productivity Aggregations */}
        <div className="flex flex-wrap items-center gap-4 sm:gap-8 text-xs">
          <div>
            <span className="text-[11px] text-[#74738A] font-medium block">Total Focus Time</span>
            <span className="font-bold text-[#202033] flex items-center gap-1 text-xs sm:text-sm">
              32h 45m <span className="text-[#16A36A] font-bold">&uarr; 18%</span>
            </span>
          </div>

          <div>
            <span className="text-[11px] text-[#74738A] font-medium block">Avg. Completion Rate</span>
            <span className="font-bold text-[#202033] flex items-center gap-1 text-xs sm:text-sm">
              78% <span className="text-[#16A36A] font-bold">&uarr; 12%</span>
            </span>
          </div>

          <div>
            <span className="text-[11px] text-[#74738A] font-medium block">Most Productive Day</span>
            <span className="font-bold text-[#202033] text-xs sm:text-sm">Tuesday</span>
          </div>

          <div>
            <span className="text-[11px] text-[#74738A] font-medium block">Active Days</span>
            <span className="font-bold text-[#202033] text-xs sm:text-sm">6/7</span>
          </div>
        </div>
      </div>

      {/* Floating Action Button (FAB) in Bottom Right */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          onClick={() => setIsFabMenuOpen(!isFabMenuOpen)}
          className="w-13 h-13 rounded-full bg-[#8B45F5] hover:bg-[#7839D6] text-white flex items-center justify-center shadow-lg shadow-[#8B45F5]/40 transition-transform active:scale-95 cursor-pointer"
          title="Quick Actions"
        >
          {isFabMenuOpen ? <X className="w-6 h-6 text-white" /> : <Plus className="w-6 h-6 text-white" />}
        </button>

        {/* Radial Action Popover */}
        {isFabMenuOpen && (
          <div className="absolute bottom-16 right-0 bg-white rounded-2xl p-2 border border-[#E5E2F5] shadow-xl flex flex-col gap-1 w-48 animate-fade-in">
            <button
              onClick={() => {
                setIsFabMenuOpen(false);
                onOpenCreateTask();
              }}
              className="w-full text-left px-3 py-2 text-xs font-bold text-[#202033] hover:bg-[#F4F3FF] rounded-xl flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4 text-[#8B45F5]" />
              <span>Create Task</span>
            </button>
            <button
              onClick={() => {
                setIsFabMenuOpen(false);
                onOpenCreateRoutine();
              }}
              className="w-full text-left px-3 py-2 text-xs font-bold text-[#202033] hover:bg-[#F4F3FF] rounded-xl flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4 text-[#8B45F5]" />
              <span>Add Routine</span>
            </button>
            <button
              onClick={() => {
                setIsFabMenuOpen(false);
                if (onOpenCreateProject) onOpenCreateProject();
                else onNavigateTab('projects');
              }}
              className="w-full text-left px-3 py-2 text-xs font-bold text-[#202033] hover:bg-[#F4F3FF] rounded-xl flex items-center gap-2"
            >
              <FolderKanban className="w-4 h-4 text-[#10B981]" />
              <span>New Project</span>
            </button>
            <button
              onClick={() => {
                setIsFabMenuOpen(false);
                onOpenEmergency();
              }}
              className="w-full text-left px-3 py-2 text-xs font-bold text-[#E05268] hover:bg-[#FFEAEF] rounded-xl flex items-center gap-2"
            >
              <AlertTriangle className="w-4 h-4 text-[#E05268]" />
              <span>Emergency Replan</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
