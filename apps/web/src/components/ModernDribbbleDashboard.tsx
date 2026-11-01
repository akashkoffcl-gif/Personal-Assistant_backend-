'use client';

import React, { useState, useMemo } from 'react';
import { format, subDays } from 'date-fns';
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
  Plus,
  ChevronRight,
  ChevronDown,
  Smile,
  Bell,
  Footprints,
  Droplet,
  Moon,
  BarChart2,
  CalendarDays,
  Activity,
  Layers,
  ArrowRight,
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
  const [hoveredChartDay, setHoveredChartDay] = useState<OverviewChartDay | null>(null);
  const [isFabMenuOpen, setIsFabMenuOpen] = useState(false);

  const currentDateObj = useMemo(() => new Date(selectedDate), [selectedDate]);

  // Dynamic greeting based on current hour
  const timeOfDayGreeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  // 1. KPI Intelligence Metrics
  const completedTasksCount = commandCenterData?.kpi?.taskCompletion?.completed ?? (tasks.filter((t) => t.status === TaskStatus.COMPLETED).length || 6);
  const totalTasksCount = commandCenterData?.kpi?.taskCompletion?.total ?? (tasks.length || 8);
  const taskCompletionPercent = commandCenterData?.kpi?.taskCompletion?.percentage ?? Math.round((completedTasksCount / Math.max(1, totalTasksCount)) * 100);

  const completedRoutinesCount = commandCenterData?.kpi?.routineAdherence?.completed ?? (occurrences.filter((o) => o.status === TaskStatus.COMPLETED).length || 4);
  const totalRoutinesCount = commandCenterData?.kpi?.routineAdherence?.total ?? (occurrences.length || 5);
  const routineAdherencePercent = commandCenterData?.kpi?.routineAdherence?.percentage ?? Math.round((completedRoutinesCount / Math.max(1, totalRoutinesCount)) * 100);

  const upcomingActivitiesCount = commandCenterData?.kpi?.upcomingActivities?.count ?? 5;
  const upcomingNextActivity = commandCenterData?.kpi?.upcomingActivities?.nextActivity ?? '10:00 AM - Team Meeting';

  const overdueCount = commandCenterData?.kpi?.overdueItems?.count ?? 2;
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
        { id: 'def-1', time: '08:00', title: 'Morning Routine', category: 'Routine', priority: 'Low', status: 'Completed', emoji: '🌿', colorClass: 'border-[#DCFCE7] bg-[#F0FAF4]' },
        { id: 'def-2', time: '10:00', title: 'Team Meeting', category: 'Work', priority: 'High', status: 'Upcoming', emoji: '💼', colorClass: 'border-[#E0E7FF] bg-white' },
        { id: 'def-3', time: '12:30', title: 'Lunch Break', category: 'Personal', priority: 'Medium', status: 'Upcoming', emoji: '🥪', colorClass: 'border-[#E5E2F5] bg-white' },
        { id: 'def-4', time: '14:00', title: 'Project Review', category: 'Project: Website Redesign', priority: 'High', status: 'Upcoming', emoji: '📁', colorClass: 'border-[#E5E2F5] bg-white' },
        { id: 'def-5', time: '16:00', title: 'Gym Session', category: 'Health', priority: 'Low', status: 'Upcoming', emoji: '💚', colorClass: 'border-[#E5E2F5] bg-white' },
        { id: 'def-6', time: '19:00', title: 'Dinner with Family', category: 'Personal', priority: 'Medium', status: 'Upcoming', emoji: '🍽️', colorClass: 'border-[#E5E2F5] bg-white' },
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
    const fallbackProjects = [
      { id: 'proj-1', name: 'Website Redesign', completed: 6, total: 8, percent: 75, icon: '📁' },
      { id: 'proj-2', name: 'Mobile App', completed: 3, total: 5, percent: 60, icon: '📱' },
      { id: 'proj-3', name: 'Personal Growth', completed: 4, total: 5, percent: 80, icon: '📈' },
    ];

    if (!projects || projects.length === 0) return fallbackProjects;

    const mapped = projects.slice(0, 3).map((p, idx) => ({
      id: p.id,
      name: p.title,
      completed: p.completedTasksCount || (idx === 0 ? 6 : idx === 1 ? 3 : 4),
      total: p.tasksCount || (idx === 0 ? 8 : idx === 1 ? 5 : 5),
      percent: p.progressPercent || (idx === 0 ? 75 : idx === 1 ? 60 : 80),
      icon: idx === 0 ? '📁' : idx === 1 ? '📱' : '📈',
    }));

    if (mapped.length < 3) {
      return [...mapped, ...fallbackProjects.slice(mapped.length, 3)];
    }

    return mapped;
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

  const maxBarValue = 20;

  return (
    <div className="max-w-[1720px] mx-auto space-y-4 sm:space-y-5 pb-16 select-none">
      {/* =========================================================================
          SECTION A: COMPACT WELCOME HEADER & QUICK ACTIONS ROW
         ========================================================================= */}
      <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-[#E5E2F5] shadow-[0_4px_20px_rgba(139,69,245,0.035)] flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
        {/* Left Side: Greeting & Daily Progress */}
        <div className="flex flex-wrap items-center gap-3 sm:gap-5 min-w-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#F4F3FF] border border-[#E5E2F5] flex items-center justify-center text-xl shadow-2xs shrink-0">
              👋
            </div>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-extrabold text-[#202033] tracking-tight truncate leading-tight">
                {timeOfDayGreeting}, {userName}!
              </h1>
              <p className="text-[11px] sm:text-xs text-[#74738A] font-medium truncate mt-0.5">
                {format(currentDateObj, 'EEEE, d MMMM yyyy')} &bull; Keep up the great work!
              </p>
            </div>
          </div>

          {/* Mini Today's Progress Donut Ring */}
          <div className="flex items-center gap-2.5 pl-0 sm:pl-4 sm:border-l sm:border-[#F0F2FA]">
            <div className="relative w-8 h-8 sm:w-9 sm:h-9 shrink-0 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="14" fill="none" stroke="#F4F4FD" strokeWidth="4" />
                <circle
                  cx="18"
                  cy="18"
                  r="14"
                  fill="none"
                  stroke="#10B981"
                  strokeWidth="4"
                  strokeDasharray="87.9"
                  strokeDashoffset={87.9 * (1 - taskCompletionPercent / 100)}
                  strokeLinecap="round"
                  className="transition-all duration-700 ease-out"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-[10px] font-extrabold text-[#202033]">
                {taskCompletionPercent}%
              </span>
            </div>
            <div className="min-w-0">
              <span className="text-[11px] font-bold text-[#202033] block leading-tight">Today&apos;s Progress</span>
              <span className="text-[10px] text-[#74738A] font-medium block leading-tight">
                {completedTasksCount}/{totalTasksCount} tasks completed
              </span>
            </div>
          </div>

          {/* On Track Pill */}
          <div className="hidden xl:flex items-center gap-2 pl-4 border-l border-[#F0F2FA]">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#ECFDF5] text-[#16A36A] text-[11px] font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-[#16A36A] animate-pulse" />
              <span>On Track</span>
            </div>
            <span className="text-[11px] text-[#74738A] font-medium">You&apos;re doing great!</span>
          </div>
        </div>

        {/* Right Side: Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            onClick={onOpenCreateTask}
            className="px-3 py-1.5 bg-[#8B45F5] hover:bg-[#7839D6] text-white font-bold text-xs rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-white" />
            <span>New Task</span>
          </button>

          <button
            onClick={onOpenCreateReminder ? onOpenCreateReminder : onOpenCreateTask}
            className="px-2.5 py-1.5 bg-white hover:bg-[#F4F3FF] text-[#202033] border border-[#E5E2F5] font-semibold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <Plus className="w-3 h-3 text-[#8B45F5]" />
            <span>Reminder</span>
          </button>

          <button
            onClick={onOpenCreateRoutine}
            className="px-2.5 py-1.5 bg-white hover:bg-[#F4F3FF] text-[#202033] border border-[#E5E2F5] font-semibold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <Plus className="w-3 h-3 text-[#8B45F5]" />
            <span>Routine</span>
          </button>

          <button
            onClick={onOpenCreateProject ? onOpenCreateProject : () => onNavigateTab('projects')}
            className="px-2.5 py-1.5 bg-white hover:bg-[#F4F3FF] text-[#202033] border border-[#E5E2F5] font-semibold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <Plus className="w-3 h-3 text-[#8B45F5]" />
            <span>Project</span>
          </button>

          <button
            onClick={onOpenEmergency}
            className="px-3 py-1.5 bg-[#FFEAEF] hover:bg-[#FDD8E0] text-[#E05268] border border-[#FECDD6] font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-[#E05268]" />
            <span>Emergency Replan</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          SECTION B: 6 COMPACT KPI INTELLIGENCE CARDS IN ONE ROW
         ========================================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 sm:gap-4">
        {/* KPI 1: Task Completion */}
        <div
          onClick={() => onNavigateTab('work', { filter: 'completed' })}
          className="bg-white rounded-2xl p-3 sm:p-3.5 border border-[#E5E2F5] shadow-[0_4px_20px_rgba(139,69,245,0.03)] hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="w-7 h-7 rounded-full bg-[#ECFDF5] flex items-center justify-center text-[#16A36A]">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#16A36A]" />
              </div>
              <span className="text-[11px] font-semibold text-[#74738A] group-hover:text-[#202033] transition-colors">
                Task Completion
              </span>
            </div>
            <div className="flex items-center justify-between gap-1.5">
              <span className="text-xl sm:text-2xl font-extrabold text-[#202033] tracking-tight">
                {completedTasksCount}/{totalTasksCount}
              </span>
              <div className="relative w-8 h-8 shrink-0 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="14" fill="none" stroke="#F4F4FD" strokeWidth="4" />
                  <circle
                    cx="18"
                    cy="18"
                    r="14"
                    fill="none"
                    stroke="#10B981"
                    strokeWidth="4"
                    strokeDasharray="87.9"
                    strokeDashoffset={87.9 * (1 - taskCompletionPercent / 100)}
                    strokeLinecap="round"
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-[#202033]">
                  {taskCompletionPercent}%
                </span>
              </div>
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-[#F0F2FA] flex items-center justify-between text-[10px]">
            <span className="text-[#16A36A] font-semibold">&uarr; 12% vs last week</span>
            <ChevronRight className="w-3 h-3 text-[#9CA3AF] group-hover:text-[#8B45F5] transition-colors" />
          </div>
        </div>

        {/* KPI 2: Routine Adherence */}
        <div
          onClick={() => onNavigateTab('routines')}
          className="bg-white rounded-2xl p-3 sm:p-3.5 border border-[#E5E2F5] shadow-[0_4px_20px_rgba(139,69,245,0.03)] hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="w-7 h-7 rounded-full bg-[#F4F3FF] flex items-center justify-center text-[#8B45F5]">
                <RotateCcw className="w-3.5 h-3.5 text-[#8B45F5]" />
              </div>
              <span className="text-[11px] font-semibold text-[#74738A] group-hover:text-[#202033] transition-colors">
                Routine Adherence
              </span>
            </div>
            <div className="flex items-center justify-between gap-1.5">
              <span className="text-xl sm:text-2xl font-extrabold text-[#202033] tracking-tight">
                {completedRoutinesCount}/{totalRoutinesCount}
              </span>
              <div className="relative w-8 h-8 shrink-0 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="14" fill="none" stroke="#F4F4FD" strokeWidth="4" />
                  <circle
                    cx="18"
                    cy="18"
                    r="14"
                    fill="none"
                    stroke="#8B45F5"
                    strokeWidth="4"
                    strokeDasharray="87.9"
                    strokeDashoffset={87.9 * (1 - routineAdherencePercent / 100)}
                    strokeLinecap="round"
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-[#8B45F5]">
                  {routineAdherencePercent}%
                </span>
              </div>
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-[#F0F2FA] flex items-center justify-between text-[10px]">
            <span className="text-[#16A36A] font-semibold">&uarr; 8% vs last week</span>
            <ChevronRight className="w-3 h-3 text-[#9CA3AF] group-hover:text-[#8B45F5] transition-colors" />
          </div>
        </div>

        {/* KPI 3: Upcoming Activities */}
        <div
          onClick={() => onNavigateTab('calendar')}
          className="bg-white rounded-2xl p-3 sm:p-3.5 border border-[#E5E2F5] shadow-[0_4px_20px_rgba(139,69,245,0.03)] hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="w-7 h-7 rounded-full bg-[#EFF6FF] flex items-center justify-center text-[#3B82F6]">
                <Calendar className="w-3.5 h-3.5 text-[#3B82F6]" />
              </div>
              <span className="text-[11px] font-semibold text-[#74738A] group-hover:text-[#202033] transition-colors">
                Upcoming Activities
              </span>
            </div>
            <div>
              <span className="text-xl sm:text-2xl font-extrabold text-[#202033] tracking-tight block">
                {upcomingActivitiesCount}
              </span>
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-[#F0F2FA] flex items-center justify-between text-[10px]">
            <span className="text-[#74738A] font-medium truncate">{upcomingNextActivity}</span>
            <ChevronRight className="w-3 h-3 text-[#9CA3AF] group-hover:text-[#3B82F6] transition-colors shrink-0" />
          </div>
        </div>

        {/* KPI 4: Overdue Items */}
        <div
          onClick={() => onNavigateTab('work', { filter: 'overdue' })}
          className={`bg-white rounded-2xl p-3 sm:p-3.5 border shadow-[0_4px_20px_rgba(139,69,245,0.03)] hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between ${
            overdueCount > 0 ? 'border-[#FECDD6] bg-[#FFFBFB]' : 'border-[#E5E2F5]'
          }`}
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="w-7 h-7 rounded-full bg-[#FFEAEF] flex items-center justify-center text-[#E05268]">
                <AlertTriangle className="w-3.5 h-3.5 text-[#E05268]" />
              </div>
              <span className="text-[11px] font-semibold text-[#74738A] group-hover:text-[#202033] transition-colors">
                Overdue Items
              </span>
            </div>
            <div>
              <span className="text-xl sm:text-2xl font-extrabold text-[#E05268] tracking-tight block">
                {overdueCount}
              </span>
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-[#F0F2FA] flex items-center justify-between text-[10px]">
            <span className="text-[#E05268] font-semibold truncate flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#E05268]" />
              <span>{overdueDetail}</span>
            </span>
            <ChevronRight className="w-3 h-3 text-[#E05268] shrink-0" />
          </div>
        </div>

        {/* KPI 5: Active Projects */}
        <div
          onClick={() => onNavigateTab('projects')}
          className="bg-white rounded-2xl p-3 sm:p-3.5 border border-[#E5E2F5] shadow-[0_4px_20px_rgba(139,69,245,0.03)] hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="w-7 h-7 rounded-full bg-[#F0FDF4] flex items-center justify-center text-[#10B981]">
                <FolderKanban className="w-3.5 h-3.5 text-[#10B981]" />
              </div>
              <span className="text-[11px] font-semibold text-[#74738A] group-hover:text-[#202033] transition-colors">
                Active Projects
              </span>
            </div>
            <div>
              <span className="text-xl sm:text-2xl font-extrabold text-[#202033] tracking-tight block">
                {activeProjectsCount}
              </span>
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-[#F0F2FA] flex items-center justify-between text-[10px]">
            <span className="text-[#74738A] font-medium truncate">2 in progress &bull; 1 on track</span>
            <ChevronRight className="w-3 h-3 text-[#9CA3AF] group-hover:text-[#8B45F5] transition-colors shrink-0" />
          </div>
        </div>

        {/* KPI 6: Focus Time */}
        <div
          onClick={() => onNavigateTab('analytics')}
          className="bg-white rounded-2xl p-3 sm:p-3.5 border border-[#E5E2F5] shadow-[0_4px_20px_rgba(139,69,245,0.03)] hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="w-7 h-7 rounded-full bg-[#EEF2FF] flex items-center justify-center text-[#6366F1]">
                <Clock className="w-3.5 h-3.5 text-[#6366F1]" />
              </div>
              <span className="text-[11px] font-semibold text-[#74738A] group-hover:text-[#202033] transition-colors">
                Focus Time
              </span>
            </div>
            <div>
              <span className="text-xl sm:text-2xl font-extrabold text-[#202033] tracking-tight block">
                {focusTimeHours}
              </span>
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-[#F0F2FA] flex items-center justify-between text-[10px]">
            <span className="text-[#16A36A] font-semibold">&uarr; 28% vs last week</span>
            <ChevronRight className="w-3 h-3 text-[#9CA3AF] group-hover:text-[#8B45F5] transition-colors shrink-0" />
          </div>
        </div>
      </div>

      {/* =========================================================================
          SECTION C, D, E: EXACT THREE-COLUMN PRIMARY GRID (50% / 25% / 25%)
         ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 items-stretch">
        {/* COLUMN 1: LEFT 50% (lg:col-span-6) — PRODUCTIVITY OVERVIEW & TASK DISTRIBUTION */}
        <div className="lg:col-span-6 bg-white rounded-2xl p-4 sm:p-5 border border-[#E5E2F5] shadow-[0_4px_20px_rgba(139,69,245,0.035)] flex flex-col justify-between">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
            {/* Left Sub-Section: Productivity Overview Dual-Bar & Line Chart (~62% of card) */}
            <div className="md:col-span-7 flex flex-col justify-between border-b md:border-b-0 md:border-r border-[#F0F2FA] pb-4 md:pb-0 md:pr-4">
              {/* Header */}
              <div className="flex items-center justify-between gap-2 mb-3">
                <h3 className="text-sm sm:text-base font-bold text-[#202033] tracking-tight">
                  Productivity Overview
                </h3>
                {/* Time Range Selector */}
                <div className="relative">
                  <select
                    value={overviewTimeRange}
                    onChange={(e) => setOverviewTimeRange(e.target.value as any)}
                    className="appearance-none bg-[#F4F3FF] border border-[#E5E2F5] text-[11px] font-semibold text-[#202033] rounded-lg pl-2.5 pr-7 py-1 focus:outline-none cursor-pointer"
                  >
                    <option value="7">Last 7 days</option>
                    <option value="30">Last 30 days</option>
                    <option value="90">Last 90 days</option>
                  </select>
                  <ChevronDown className="w-3 h-3 text-[#74738A] absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* Legend */}
              <div className="flex flex-wrap items-center gap-3 text-[10px] text-[#74738A] mb-3">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-xs bg-[#C4B5FD]" />
                  <span className="font-medium text-[#202033]">Tasks Completed</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-xs bg-[#8B45F5]" />
                  <span className="font-medium text-[#202033]">Tasks Scheduled</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#10B981] ring-1 ring-[#10B981]/30" />
                  <span className="font-medium text-[#202033]">Completion Rate</span>
                </div>
              </div>

              {/* Dual-Bar & Line Chart */}
              <div className="relative w-full pt-1">
                <div className="h-44 sm:h-48 flex items-end justify-between gap-1.5 relative pb-6">
                  {/* Left Y scale */}
                  <div className="flex flex-col justify-between h-full text-[9px] text-[#9CA3AF] font-medium pb-6 pr-1 select-none shrink-0">
                    <span>20</span>
                    <span>15</span>
                    <span>10</span>
                    <span>5</span>
                    <span>0</span>
                  </div>

                  {/* Horizontal grid lines */}
                  <div className="absolute inset-x-5 inset-y-0 flex flex-col justify-between pointer-events-none pb-6">
                    <div className="w-full border-b border-[#F0F2FA]" />
                    <div className="w-full border-b border-[#F0F2FA]" />
                    <div className="w-full border-b border-[#F0F2FA]" />
                    <div className="w-full border-b border-[#F0F2FA]" />
                    <div className="w-full border-b border-[#E5E2F5]" />
                  </div>

                  {/* SVG Connected Green Trend Line */}
                  <div className="absolute inset-x-5 top-0 bottom-6 pointer-events-none z-12">
                    <svg className="w-full h-full" viewBox="0 0 700 100" preserveAspectRatio="none">
                      <polyline
                        fill="none"
                        stroke="#10B981"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        points={overviewChartDays
                          .map((d, i) => {
                            const x = 50 + i * 100;
                            const y = 100 - Math.min(92, Math.max(16, d.completionRate));
                            return `${x},${y}`;
                          })
                          .join(' ')}
                      />
                    </svg>
                  </div>

                  {/* Bars & Points */}
                  <div className="flex-1 flex items-end justify-between h-full gap-1 sm:gap-2 z-10">
                    {overviewChartDays.map((item: OverviewChartDay) => {
                      const isSelected = item.date === selectedDate;
                      const schedHeight = Math.min(100, Math.max(12, (item.tasksScheduled / maxBarValue) * 100));
                      const compHeight = Math.min(100, Math.max(8, (item.tasksCompleted / maxBarValue) * 100));

                      return (
                        <div
                          key={item.date}
                          onClick={() => onSelectDate(item.date)}
                          onMouseEnter={() => setHoveredChartDay(item)}
                          onMouseLeave={() => setHoveredChartDay(null)}
                          className="flex-1 flex flex-col items-center justify-end h-full group relative cursor-pointer"
                        >
                          {/* Tooltip */}
                          {hoveredChartDay?.date === item.date && (
                            <div className="absolute -top-12 bg-[#202033] text-white text-[10px] font-semibold py-1 px-2.5 rounded-lg shadow-lg z-30 pointer-events-none whitespace-nowrap animate-fade-in flex flex-col items-center">
                              <span>
                                {item.tasksCompleted}/{item.tasksScheduled} &bull; {item.completionRate}%
                              </span>
                              <span className="text-[9px] text-gray-300 font-normal">{item.dateLabel}</span>
                            </div>
                          )}

                          {/* Dual Pillars */}
                          <div className="w-full flex justify-center items-end gap-1 h-[120px] sm:h-[135px]">
                            {/* Completed Bar */}
                            <div
                              style={{ height: `${compHeight}%` }}
                              className={`w-2.5 sm:w-3 max-w-[12px] rounded-t-sm transition-all duration-300 ${
                                isSelected ? 'bg-[#8B45F5]' : 'bg-[#C4B5FD] group-hover:bg-[#A78BFA]'
                              }`}
                            />
                            {/* Scheduled Bar */}
                            <div
                              style={{ height: `${schedHeight}%` }}
                              className={`w-2.5 sm:w-3 max-w-[12px] rounded-t-sm transition-all duration-300 ${
                                isSelected ? 'bg-[#6935C8]' : 'bg-[#8B45F5] group-hover:bg-[#7839D6]'
                              }`}
                            />
                          </div>

                          {/* Line Dot */}
                          <div
                            style={{ bottom: `${Math.min(92, Math.max(16, item.completionRate))}%` }}
                            className="absolute w-2 h-2 rounded-full bg-[#10B981] ring-1 ring-white shadow-2xs pointer-events-none"
                          />

                          {/* Day Label */}
                          <div className="absolute -bottom-1 flex flex-col items-center">
                            <span
                              className={`text-[9px] sm:text-[10px] font-medium transition-colors ${
                                isSelected ? 'text-[#8B45F5] font-bold' : 'text-[#74738A] group-hover:text-[#202033]'
                              }`}
                            >
                              {item.dayLabel}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Sub-Section: Task Distribution Donut Chart (~38% of card) */}
            <div className="md:col-span-5 flex flex-col items-center justify-between h-full pt-1">
              <div className="w-full flex items-center justify-between mb-2">
                <h3 className="text-sm sm:text-base font-bold text-[#202033] tracking-tight">
                  Task Distribution
                </h3>
              </div>

              {/* Donut Chart with Center Total */}
              <div className="relative w-36 h-36 sm:w-40 sm:h-40 my-1 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="38" fill="none" stroke="#F4F4FD" strokeWidth="15" />
                  {/* Segment 1: Work (42%) */}
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    fill="none"
                    stroke="#8B45F5"
                    strokeWidth="15"
                    strokeDasharray="238.7"
                    strokeDashoffset={238.7 * (1 - 0.42)}
                    strokeLinecap="round"
                    className="transition-all duration-700 hover:opacity-85 cursor-pointer"
                    onClick={() => onNavigateTab('work', { category: TaskCategory.WORK })}
                  />
                  {/* Segment 2: Personal (28%) */}
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    fill="none"
                    stroke="#3B82F6"
                    strokeWidth="15"
                    strokeDasharray="238.7"
                    strokeDashoffset={238.7 * (1 - 0.28)}
                    strokeLinecap="round"
                    transform="rotate(151.2 50 50)"
                    className="transition-all duration-700 hover:opacity-85 cursor-pointer"
                    onClick={() => onNavigateTab('work', { category: TaskCategory.PERSONAL_ROUTINE })}
                  />
                  {/* Segment 3: Projects (18%) */}
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    fill="none"
                    stroke="#F59E0B"
                    strokeWidth="15"
                    strokeDasharray="238.7"
                    strokeDashoffset={238.7 * (1 - 0.18)}
                    strokeLinecap="round"
                    transform="rotate(252 50 50)"
                    className="transition-all duration-700 hover:opacity-85 cursor-pointer"
                    onClick={() => onNavigateTab('projects')}
                  />
                  {/* Segment 4: Other (12%) */}
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    fill="none"
                    stroke="#10B981"
                    strokeWidth="15"
                    strokeDasharray="238.7"
                    strokeDashoffset={238.7 * (1 - 0.12)}
                    strokeLinecap="round"
                    transform="rotate(316.8 50 50)"
                    className="transition-all duration-700 hover:opacity-85 cursor-pointer"
                  />
                </svg>

                {/* Center Total Count */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-2xl sm:text-3xl font-extrabold text-[#202033] leading-none">
                    {taskDistribution.total}
                  </span>
                  <span className="text-[10px] font-medium text-[#74738A] mt-0.5">Total Tasks</span>
                </div>
              </div>

              {/* Distribution Legend List */}
              <div className="w-full grid grid-cols-2 gap-1.5 pt-2 border-t border-[#F0F2FA] text-[11px]">
                {taskDistribution.segments.map((seg: any) => (
                  <div
                    key={seg.name}
                    onClick={() => onNavigateTab('work', { category: seg.name })}
                    className="flex items-center justify-between p-1 rounded-lg hover:bg-[#F4F3FF] transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: seg.color }} />
                      <span className="text-[11px] font-medium text-[#202033] group-hover:text-[#8B45F5] truncate">
                        {seg.name}
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-[#74738A]">
                      {seg.percent}% ({seg.count})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* COLUMN 2: CENTER 25% (lg:col-span-3) — TODAY'S SCHEDULE */}
        <div className="lg:col-span-3 bg-white rounded-2xl p-4 sm:p-5 border border-[#E5E2F5] shadow-[0_4px_20px_rgba(139,69,245,0.035)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm sm:text-base font-bold text-[#202033] tracking-tight">
                  Today&apos;s Schedule
                </h3>
                <span className="text-[10px] font-semibold text-[#74738A] bg-[#F4F3FF] px-2 py-0.5 rounded-full">
                  {format(currentDateObj, 'd MMM')}
                </span>
              </div>
              <button
                onClick={() => onNavigateTab('calendar')}
                className="text-[11px] font-bold text-[#8B45F5] hover:text-[#6935C8] transition-colors flex items-center gap-0.5"
              >
                <span>View Calendar</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            {/* Timeline Item Rows */}
            <div className="space-y-2.5">
              {scheduleItems.map((item) => {
                const isCompleted = item.status === 'Completed';

                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      if (item.rawItem && onSelectTask) onSelectTask(item.rawItem);
                    }}
                    className={`flex items-center justify-between p-2 sm:p-2.5 rounded-xl border transition-all cursor-pointer group ${
                      isCompleted ? 'bg-[#F9FDFB] border-[#DCFCE7]' : 'bg-white border-[#E5E2F5] hover:border-[#DDD8F8]'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[10px] font-bold text-[#74738A] w-9 shrink-0">{item.time}</span>
                      <span className="text-sm shrink-0">{item.emoji}</span>
                      <div className="min-w-0">
                        <span className={`text-xs font-bold block truncate leading-tight ${isCompleted ? 'line-through text-[#9CA3AF]' : 'text-[#202033]'}`}>
                          {item.title}
                        </span>
                        <span className="text-[10px] text-[#74738A] block truncate leading-tight">{item.category}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 pl-1.5">
                      {isCompleted ? (
                        <span className="px-2 py-0.5 rounded-full bg-[#ECFDF5] text-[#16A36A] text-[10px] font-bold flex items-center gap-1">
                          Completed <CheckCircle2 className="w-2.5 h-2.5 text-[#16A36A]" />
                        </span>
                      ) : (
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            item.priority === 'High'
                              ? 'bg-[#EFF6FF] text-[#3B82F6]'
                              : item.priority === 'Medium'
                              ? 'bg-[#F4F3FF] text-[#8B45F5]'
                              : 'bg-[#F3F4F6] text-[#6B7280]'
                          }`}
                        >
                          {item.priority}
                        </span>
                      )}
                      <ChevronRight className="w-3 h-3 text-[#9CA3AF] group-hover:text-[#8B45F5] transition-colors" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* COLUMN 3: RIGHT 25% (lg:col-span-3) — QUICK ACTIONS & REPLAN CALLOUT */}
        <div className="lg:col-span-3 bg-white rounded-2xl p-4 sm:p-5 border border-[#E5E2F5] shadow-[0_4px_20px_rgba(139,69,245,0.035)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm sm:text-base font-bold text-[#202033] tracking-tight">Quick Actions</h3>
            </div>

            {/* 2x3 Grid */}
            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={onOpenCreateTask}
                className="flex flex-col items-center justify-center p-3 rounded-xl border border-[#E5E2F5] hover:border-[#8B45F5] hover:bg-[#F8F7FF] transition-all group text-center"
              >
                <div className="w-8 h-8 rounded-full bg-[#F4F3FF] flex items-center justify-center text-[#8B45F5] mb-1.5 group-hover:scale-105 transition-transform">
                  <CheckCircle2 className="w-4 h-4 text-[#8B45F5]" />
                </div>
                <span className="text-xs font-bold text-[#202033]">Add Task</span>
              </button>

              <button
                onClick={onOpenCreateReminder ? onOpenCreateReminder : onOpenCreateTask}
                className="flex flex-col items-center justify-center p-3 rounded-xl border border-[#E5E2F5] hover:border-[#3B82F6] hover:bg-[#EFF6FF] transition-all group text-center"
              >
                <div className="w-8 h-8 rounded-full bg-[#EFF6FF] flex items-center justify-center text-[#3B82F6] mb-1.5 group-hover:scale-105 transition-transform">
                  <Clock className="w-4 h-4 text-[#3B82F6]" />
                </div>
                <span className="text-xs font-bold text-[#202033]">Add Reminder</span>
              </button>

              <button
                onClick={onOpenCreateRoutine}
                className="flex flex-col items-center justify-center p-3 rounded-xl border border-[#E5E2F5] hover:border-[#8B45F5] hover:bg-[#F8F7FF] transition-all group text-center"
              >
                <div className="w-8 h-8 rounded-full bg-[#F4F3FF] flex items-center justify-center text-[#8B45F5] mb-1.5 group-hover:scale-105 transition-transform">
                  <RotateCcw className="w-4 h-4 text-[#8B45F5]" />
                </div>
                <span className="text-xs font-bold text-[#202033]">Add Routine</span>
              </button>

              <button
                onClick={onOpenCreateProject ? onOpenCreateProject : () => onNavigateTab('projects')}
                className="flex flex-col items-center justify-center p-3 rounded-xl border border-[#E5E2F5] hover:border-[#10B981] hover:bg-[#F0FDF4] transition-all group text-center"
              >
                <div className="w-8 h-8 rounded-full bg-[#F0FDF4] flex items-center justify-center text-[#10B981] mb-1.5 group-hover:scale-105 transition-transform">
                  <FolderKanban className="w-4 h-4 text-[#10B981]" />
                </div>
                <span className="text-xs font-bold text-[#202033]">Add Project</span>
              </button>

              <button
                onClick={onOpenCreateEvent ? onOpenCreateEvent : () => onNavigateTab('calendar')}
                className="flex flex-col items-center justify-center p-3 rounded-xl border border-[#E5E2F5] hover:border-[#6366F1] hover:bg-[#EEF2FF] transition-all group text-center"
              >
                <div className="w-8 h-8 rounded-full bg-[#EEF2FF] flex items-center justify-center text-[#6366F1] mb-1.5 group-hover:scale-105 transition-transform">
                  <Calendar className="w-4 h-4 text-[#6366F1]" />
                </div>
                <span className="text-xs font-bold text-[#202033]">Add Event</span>
              </button>

              <button
                onClick={onOpenEmergency}
                className="flex flex-col items-center justify-center p-3 rounded-xl border border-[#FECDD6] bg-[#FFFBFB] hover:bg-[#FFEAEF] transition-all group text-center"
              >
                <div className="w-8 h-8 rounded-full bg-[#FFEAEF] flex items-center justify-center text-[#E05268] mb-1.5 group-hover:scale-105 transition-transform">
                  <AlertTriangle className="w-4 h-4 text-[#E05268]" />
                </div>
                <span className="text-xs font-bold text-[#E05268]">Emergency Replan</span>
              </button>
            </div>
          </div>

          {/* Replan Callout Banner */}
          <div
            onClick={onOpenEmergency}
            className="mt-3 bg-[#F8F7FF] border border-[#DDD8F8] rounded-xl p-2.5 flex items-center gap-2 hover:bg-[#F2EEFF] cursor-pointer transition-colors"
          >
            <div className="w-7 h-7 rounded-full bg-[#EAE5FC] flex items-center justify-center text-[#8B45F5] shrink-0">
              <RotateCcw className="w-3.5 h-3.5 text-[#8B45F5]" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] text-[#202033] font-semibold leading-tight">Need to reschedule your day?</p>
              <p className="text-[10px] text-[#74738A] leading-tight mt-0.5 truncate">
                Use Emergency Replan to adjust your schedule.
              </p>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-[#8B45F5] shrink-0" />
          </div>
        </div>
      </div>

      {/* =========================================================================
          SECTION F, G, H, I: SUPPORTING 4-COLUMN BALANCED GRID (25% EACH)
         ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 items-stretch">
        {/* CARD F: Routine Tracker */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#E5E2F5] shadow-[0_4px_20px_rgba(139,69,245,0.035)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm sm:text-base font-bold text-[#202033] tracking-tight">Routine Tracker</h3>
              <button
                onClick={() => onNavigateTab('routines')}
                className="text-[11px] font-semibold text-[#8B45F5] hover:text-[#6935C8] transition-colors"
              >
                View All
              </button>
            </div>

            <div className="space-y-3">
              {routineTrackerItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => {
                    const occ = occurrences.find((o) => o.routineId === item.id) || (occurrences[0] ?? null);
                    if (occ && onOpenRoutineCheckIn) onOpenRoutineCheckIn(occ);
                  }}
                  className="space-y-1 cursor-pointer group"
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span>{item.icon}</span>
                      <span className="font-bold text-[#202033] group-hover:text-[#8B45F5] transition-colors truncate">
                        {item.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[10px] text-[#74738A] font-medium">{item.progress}%</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          item.isDone
                            ? 'bg-[#ECFDF5] text-[#16A36A]'
                            : item.isMissed
                            ? 'bg-[#FFEAEF] text-[#E05268]'
                            : 'bg-[#F4F3FF] text-[#8B45F5]'
                        }`}
                      >
                        {item.statusBadge}
                      </span>
                    </div>
                  </div>
                  <div className="w-full h-1.5 bg-[#F4F4FD] rounded-full overflow-hidden">
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
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#E5E2F5] shadow-[0_4px_20px_rgba(139,69,245,0.035)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm sm:text-base font-bold text-[#202033] tracking-tight">Projects & Tasks</h3>
              <button
                onClick={() => onNavigateTab('projects')}
                className="text-[11px] font-semibold text-[#8B45F5] hover:text-[#6935C8] transition-colors"
              >
                View All
              </button>
            </div>

            {/* Sub Tabs */}
            <div className="flex items-center gap-1 mb-3 bg-[#F4F3FF] p-1 rounded-xl">
              <button
                onClick={() => setProjectTab('projects')}
                className={`flex-1 py-1 text-center text-xs font-bold rounded-lg transition-all ${
                  projectTab === 'projects' ? 'bg-white text-[#8B45F5] shadow-xs' : 'text-[#74738A] hover:text-[#202033]'
                }`}
              >
                Active Projects
              </button>
              <button
                onClick={() => setProjectTab('tasks')}
                className={`flex-1 py-1 text-center text-xs font-bold rounded-lg transition-all ${
                  projectTab === 'tasks' ? 'bg-white text-[#8B45F5] shadow-xs' : 'text-[#74738A] hover:text-[#202033]'
                }`}
              >
                Recent Tasks
              </button>
            </div>

            {projectTab === 'projects' ? (
              <div className="space-y-3">
                {activeProjectsList.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => onNavigateTab('projects')}
                    className="p-2.5 rounded-xl border border-[#E5E2F5] hover:border-[#DDD8F8] hover:bg-[#FDFBFF] transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span>{p.icon}</span>
                        <span className="text-xs font-bold text-[#202033] group-hover:text-[#8B45F5] transition-colors truncate">
                          {p.name}
                        </span>
                      </div>
                      <span className="text-[11px] font-semibold text-[#74738A]">
                        {p.completed}/{p.total} tasks &gt;
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-[#F4F4FD] rounded-full overflow-hidden">
                      <div style={{ width: `${p.percent}%` }} className="h-full bg-[#8B45F5] rounded-full transition-all duration-500" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {tasks.slice(0, 4).map((t) => (
                  <div
                    key={t.id}
                    onClick={() => onSelectTask?.(t)}
                    className="flex items-center justify-between p-2 rounded-xl border border-[#E5E2F5] hover:border-[#DDD8F8] transition-all cursor-pointer"
                  >
                    <span className="text-xs font-semibold text-[#202033] truncate">{t.title}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-[#9CA3AF]" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* CARD H: Wellness & Habit Insights */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#E5E2F5] shadow-[0_4px_20px_rgba(139,69,245,0.035)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm sm:text-base font-bold text-[#202033] tracking-tight">Wellness & Habit Insights</h3>
              <button
                onClick={onOpenWellnessCheckIn}
                className="text-[11px] font-semibold text-[#8B45F5] hover:text-[#6935C8] transition-colors"
              >
                View All
              </button>
            </div>

            {/* 2x2 Mini Metrics */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="p-2.5 rounded-xl bg-[#F0FDF4] border border-[#DCFCE7] flex items-center gap-2">
                <Footprints className="w-4 h-4 text-[#10B981] shrink-0" />
                <div className="min-w-0">
                  <span className="text-[10px] text-[#74738A] block">Exercise</span>
                  <span className="text-xs font-extrabold text-[#202033]">4/5 days</span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-[#EFF6FF] border border-[#DBEAFE] flex items-center gap-2">
                <Droplet className="w-4 h-4 text-[#3B82F6] shrink-0" />
                <div className="min-w-0">
                  <span className="text-[10px] text-[#74738A] block">Water Intake</span>
                  <span className="text-xs font-extrabold text-[#202033]">6/8 cups</span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-[#F4F3FF] border border-[#EDE9FE] flex items-center gap-2">
                <Moon className="w-4 h-4 text-[#8B45F5] shrink-0" />
                <div className="min-w-0">
                  <span className="text-[10px] text-[#74738A] block">Sleep</span>
                  <span className="text-xs font-extrabold text-[#202033]">7h 15m</span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-[#FFFBEB] border border-[#FEF3C7] flex items-center gap-2">
                <Smile className="w-4 h-4 text-[#F59E0B] shrink-0" />
                <div className="min-w-0">
                  <span className="text-[10px] text-[#74738A] block">Mood</span>
                  <span className="text-xs font-extrabold text-[#202033]">Good</span>
                </div>
              </div>
            </div>

            {/* Sparkline Curve */}
            <div className="pt-2 border-t border-[#F0F2FA]">
              <div className="flex items-center justify-between text-[11px] mb-1">
                <span className="text-[#74738A] font-medium">Wellness Trend</span>
                <span className="text-[#10B981] font-bold">78% &uarr;</span>
              </div>
              <div className="h-10 w-full relative">
                <svg className="w-full h-full" viewBox="0 0 200 40">
                  <path
                    d="M 10 30 Q 40 10 70 20 T 130 15 T 190 8"
                    fill="none"
                    stroke="#8B45F5"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                  <circle cx="190" cy="8" r="3.5" fill="#8B45F5" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* CARD I: Recent Activity */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#E5E2F5] shadow-[0_4px_20px_rgba(139,69,245,0.035)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm sm:text-base font-bold text-[#202033] tracking-tight">Recent Activity</h3>
              <button
                onClick={() => onNavigateTab('analytics')}
                className="text-[11px] font-semibold text-[#8B45F5] hover:text-[#6935C8] transition-colors"
              >
                View All
              </button>
            </div>

            <div className="space-y-3">
              {recentActivities.map((act: RecentActivityItem) => (
                <div key={act.id} className="flex items-start gap-2.5 text-xs group">
                  <div className="w-6 h-6 rounded-full bg-[#F4F3FF] border border-[#E5E2F5] flex items-center justify-center text-[#8B45F5] shrink-0 mt-0.5">
                    {act.icon === 'check' ? (
                      <CheckCircle2 className="w-3 h-3 text-[#8B45F5]" />
                    ) : act.icon === 'runner' ? (
                      <Footprints className="w-3 h-3 text-[#10B981]" />
                    ) : act.icon === 'folder' ? (
                      <FolderKanban className="w-3 h-3 text-[#3B82F6]" />
                    ) : (
                      <Bell className="w-3 h-3 text-[#8B45F5]" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-[#202033] leading-tight truncate">{act.title}</p>
                    <p className="text-[11px] text-[#74738A] leading-tight truncate mt-0.5">{act.description}</p>
                  </div>
                  <span className="text-[10px] text-[#9CA3AF] shrink-0">{act.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          SECTION J: COMPACT PRODUCTIVITY ANALYTICS FOOTER SUMMARY BAR
         ========================================================================= */}
      <div className="bg-white rounded-2xl px-4 sm:px-6 py-3 border border-[#E5E2F5] shadow-[0_4px_20px_rgba(139,69,245,0.035)] flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Left Side: Title & Period Switcher */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#F4F3FF] flex items-center justify-center text-[#8B45F5]">
              <BarChart2 className="w-4 h-4 text-[#8B45F5]" />
            </div>
            <span className="text-sm font-bold text-[#202033]">Productivity Analytics</span>
          </div>

          <div className="flex items-center gap-1 bg-[#F4F3FF] p-0.5 rounded-xl border border-[#E5E2F5]">
            <button
              onClick={() => setAnalyticsFooterTab('weekly')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                analyticsFooterTab === 'weekly' ? 'bg-white text-[#8B45F5] shadow-xs' : 'text-[#74738A] hover:text-[#202033]'
              }`}
            >
              Weekly
            </button>
            <button
              onClick={() => setAnalyticsFooterTab('monthly')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                analyticsFooterTab === 'monthly' ? 'bg-white text-[#8B45F5] shadow-xs' : 'text-[#74738A] hover:text-[#202033]'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setAnalyticsFooterTab('custom')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                analyticsFooterTab === 'custom' ? 'bg-white text-[#8B45F5] shadow-xs' : 'text-[#74738A] hover:text-[#202033]'
              }`}
            >
              Custom
            </button>
          </div>
        </div>

        {/* Right Side: Key High-Level Metrics */}
        <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-xs text-[#74738A]">
          <div className="flex items-center gap-1.5">
            <span className="text-[#9CA3AF]">Total Focus:</span>
            <span className="font-bold text-[#202033]">32h 45m</span>
            <span className="text-[10px] font-bold text-[#16A36A]">&uarr; 18%</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[#9CA3AF]">Avg. Completion Rate:</span>
            <span className="font-bold text-[#202033]">78%</span>
            <span className="text-[10px] font-bold text-[#16A36A]">&uarr; 12%</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[#9CA3AF]">Most Productive Day:</span>
            <span className="font-bold text-[#202033]">Tuesday</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[#9CA3AF]">Active Days:</span>
            <span className="font-bold text-[#202033]">6/7</span>
          </div>
        </div>
      </div>

      {/* Floating Action Button (FAB) Speed-Dial */}
      <div className="fixed bottom-6 right-6 z-50">
        {isFabMenuOpen && (
          <div className="mb-3 space-y-2 animate-fade-in flex flex-col items-end">
            <button
              onClick={() => {
                setIsFabMenuOpen(false);
                onOpenCreateTask();
              }}
              className="flex items-center gap-2 px-3.5 py-2 bg-white text-[#202033] hover:text-[#8B45F5] border border-[#E5E2F5] rounded-xl text-xs font-bold shadow-lg transition-all"
            >
              <span>New Task</span>
              <CheckCircle2 className="w-4 h-4 text-[#8B45F5]" />
            </button>
            <button
              onClick={() => {
                setIsFabMenuOpen(false);
                onOpenCreateRoutine();
              }}
              className="flex items-center gap-2 px-3.5 py-2 bg-white text-[#202033] hover:text-[#8B45F5] border border-[#E5E2F5] rounded-xl text-xs font-bold shadow-lg transition-all"
            >
              <span>Add Routine</span>
              <RotateCcw className="w-4 h-4 text-[#8B45F5]" />
            </button>
            <button
              onClick={() => {
                setIsFabMenuOpen(false);
                if (onOpenCreateProject) onOpenCreateProject();
                else onNavigateTab('projects');
              }}
              className="flex items-center gap-2 px-3.5 py-2 bg-white text-[#202033] hover:text-[#8B45F5] border border-[#E5E2F5] rounded-xl text-xs font-bold shadow-lg transition-all"
            >
              <span>New Project</span>
              <FolderKanban className="w-4 h-4 text-[#8B45F5]" />
            </button>
          </div>
        )}

        <button
          onClick={() => setIsFabMenuOpen(!isFabMenuOpen)}
          className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-[#8B45F5] hover:bg-[#7839D6] text-white flex items-center justify-center shadow-[0_8px_30px_rgba(139,69,245,0.4)] transition-transform duration-200 cursor-pointer ${
            isFabMenuOpen ? 'rotate-45' : 'hover:scale-105'
          }`}
          aria-label="Speed dial quick actions"
        >
          <Plus className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.5]" />
        </button>
      </div>
    </div>
  );
}
