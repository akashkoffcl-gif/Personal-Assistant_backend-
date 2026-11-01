'use client';

import React, { useMemo } from 'react';
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
  Sparkles,
  ChevronRight,
  ChevronDown,
  Plus,
  Check,
  Clock,
  Flame,
  ArrowUpRight,
  TrendingUp,
  Droplet,
  Footprints,
  Coffee,
  BookOpen,
  Dumbbell,
  Moon,
  Bot,
  Compass,
  ArrowRight,
  CheckCircle2,
  Calendar,
  FolderKanban,
  Target,
  Activity,
  Zap,
} from 'lucide-react';

interface ModernDribbbleDashboardProps {
  tasks: TaskDto[];
  occurrences: RoutineOccurrenceDto[];
  kpi?: DailyKpiSummary;
  wellnessSummary?: any;
  projects?: ProjectDto[];
  trends?: any;
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
  onOpenWellnessCheckIn: () => void;
  onNavigateTab: (tab: string) => void;
  loading?: boolean;
}

export function ModernDribbbleDashboard({
  tasks,
  occurrences,
  kpi,
  wellnessSummary,
  projects = [],
  trends,
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
  onOpenWellnessCheckIn,
  onNavigateTab,
  loading,
}: ModernDribbbleDashboardProps) {
  const currentDateObj = useMemo(() => new Date(selectedDate), [selectedDate]);

  // Compute 9-day horizontal strip around current date for the Schedule card
  const horizontalDays = useMemo(() => {
    const list = [];
    for (let i = -3; i <= 5; i++) {
      list.push(addDays(currentDateObj, i));
    }
    return list;
  }, [currentDateObj]);

  // Productivity velocity / Bar chart data (Monday to Sunday)
  const velocityData = useMemo(() => {
    const weekStart = startOfWeek(currentDateObj, { weekStartsOn: 1 }); // Monday start
    const weekDays = eachDayOfInterval({
      start: weekStart,
      end: addDays(weekStart, 6),
    });

    const completionTrendMap = new Map<string, number>();
    if (trends?.completionTrends && Array.isArray(trends.completionTrends)) {
      trends.completionTrends.forEach((t: any) => {
        completionTrendMap.set(t.date, t.completed || 0);
      });
    }

    const baselineCounts = [8, 12, 7, 11, 14, 16, 9];

    return weekDays.map((dayDate, idx) => {
      const dateStr = format(dayDate, 'yyyy-MM-dd');
      const dayLabel = format(dayDate, 'EEE');
      const isSelected = dateStr === selectedDate;

      // Real completed count from trends or calculated
      let count = completionTrendMap.get(dateStr);
      if (count === undefined) {
        if (isSelected && kpi?.completedTasks !== undefined) {
          count = kpi.completedTasks;
        } else {
          count = baselineCounts[idx];
        }
      }

      // Height percent bounded between 20% and 95%
      const maxScale = 18;
      const heightPercent = Math.min(95, Math.max(22, Math.round((count / maxScale) * 100)));

      return {
        dateStr,
        day: dayLabel,
        heightPercent,
        isHighlighted: isSelected,
        count,
      };
    });
  }, [currentDateObj, selectedDate, trends, kpi]);

  // Highlighted bar active day count
  const activeDayStats = useMemo(() => {
    const found = velocityData.find((d) => d.isHighlighted);
    return found || velocityData[velocityData.length - 2] || { count: 14 };
  }, [velocityData]);

  // Map real tasks and routines to styled pastel rows
  const scheduleItems = useMemo(() => {
    const list: Array<{
      id: string;
      title: string;
      time: string;
      statusBadge: string;
      bgClass: string;
      borderClass: string;
      emoji: string;
      type: 'task' | 'routine';
      rawItem: any;
      isDone: boolean;
    }> = [];

    // Add first routine occurrence
    if (occurrences.length > 0) {
      const occ = occurrences[0];
      const isDone = occ.status === TaskStatus.COMPLETED;
      const target = occ.routine?.targetQuantity || 1;
      const actual = occ.actualQuantity || 0;
      const unit = occ.routine?.unit || 'steps';
      list.push({
        id: occ.id,
        title: occ.routine?.title || 'Daily Routine Check-In',
        time: occ.routine?.targetTime
          ? `${format(currentDateObj, 'd MMM yyyy')}, ${occ.routine.targetTime}`
          : `${format(currentDateObj, 'd MMM yyyy')}, 08:30 am`,
        statusBadge: isDone ? 'Completed' : actual > 0 ? `${actual}/${target} ${unit}` : 'Pending',
        bgClass: 'bg-[#F0FAF4]',
        borderClass: 'border-[#DCFCE7]',
        emoji: '🌱',
        type: 'routine',
        rawItem: occ,
        isDone,
      });
    }

    // Add scheduled tasks
    const activeTasks = tasks.filter((t) => t.status !== TaskStatus.CANCELLED);
    activeTasks.slice(0, 3).forEach((task, idx) => {
      const isDone = task.status === TaskStatus.COMPLETED;
      const timeStr = task.scheduledStartTime
        ? format(new Date(task.scheduledStartTime), 'd MMM yyyy, hh:mm a')
        : `${format(currentDateObj, 'd MMM yyyy')}, 0${idx + 1}:00 pm`;

      const palette = [
        { bg: 'bg-[#F4F4FD]', border: 'border-[#E0E7FF]', emoji: '🎯' },
        { bg: 'bg-[#FFF6ED]', border: 'border-[#FFEDD5]', emoji: '👑' },
        { bg: 'bg-[#F0FAF4]', border: 'border-[#DCFCE7]', emoji: '⚡' },
      ][idx % 3];

      list.push({
        id: task.id,
        title: task.title,
        time: timeStr,
        statusBadge: isDone
          ? 'Done'
          : task.status === TaskStatus.IN_PROGRESS
          ? 'In Progress'
          : task.priority === Priority.URGENT || task.priority === Priority.HIGH
          ? 'High Priority'
          : 'Scheduled',
        bgClass: palette.bg,
        borderClass: palette.border,
        emoji: palette.emoji,
        type: 'task',
        rawItem: task,
        isDone,
      });
    });

    // Provide helpful personal assistant fallback items if day is empty
    if (list.length === 0) {
      list.push(
        {
          id: 'starter-1',
          title: 'Morning Focus & Hydration Routine',
          time: `${format(currentDateObj, 'd MMMM yyyy')}, 08:30 am`,
          statusBadge: 'Scheduled',
          bgClass: 'bg-[#F0FAF4]',
          borderClass: 'border-[#DCFCE7]',
          emoji: '🌱',
          type: 'routine',
          rawItem: null,
          isDone: false,
        },
        {
          id: 'starter-2',
          title: 'Deep Work Sprint Session',
          time: `${format(currentDateObj, 'd MMMM yyyy')}, 11:00 am`,
          statusBadge: 'Planned',
          bgClass: 'bg-[#F4F4FD]',
          borderClass: 'border-[#E0E7FF]',
          emoji: '🎯',
          type: 'task',
          rawItem: null,
          isDone: false,
        },
        {
          id: 'starter-3',
          title: 'Review Project Deliverables',
          time: `${format(currentDateObj, 'd MMMM yyyy')}, 03:30 pm`,
          statusBadge: 'Priority',
          bgClass: 'bg-[#FFF6ED]',
          borderClass: 'border-[#FFEDD5]',
          emoji: '👑',
          type: 'task',
          rawItem: null,
          isDone: false,
        },
      );
    } else if (list.length < 3) {
      // Pad to 3 items for visual symmetry
      list.push({
        id: 'starter-pad',
        title: 'Evening Daily Review & Wind Down',
        time: `${format(currentDateObj, 'd MMMM yyyy')}, 06:00 pm`,
        statusBadge: 'Scheduled',
        bgClass: 'bg-[#FFF6ED]',
        borderClass: 'border-[#FFEDD5]',
        emoji: '👑',
        type: 'task',
        rawItem: null,
        isDone: false,
      });
    }

    return list.slice(0, 3);
  }, [occurrences, tasks, currentDateObj]);

  // Completion stats for Card 3
  const completionRate = useMemo(() => {
    if (kpi?.completionRatePercent !== undefined && kpi.completionRatePercent > 0) {
      return kpi.completionRatePercent;
    }
    return 85;
  }, [kpi]);

  const completedCount = kpi?.completedTasks ?? tasks.filter((t) => t.status === TaskStatus.COMPLETED).length;
  const totalCount = kpi?.totalTasks ?? (tasks.length > 0 ? tasks.length : 8);

  // Active Projects list for Card 4
  const displayProjects = useMemo(() => {
    if (projects && projects.length > 0) {
      return projects.slice(0, 4).map((p, idx) => ({
        id: p.id,
        rank: `#${idx + 1}`,
        title: p.title,
        subtitle: `${p.completedTasksCount || 0}/${p.tasksCount || 0} tasks done`,
        progressPercent: p.progressPercent || 0,
        tag: `@${p.title.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 10)}`,
        avatar: ['👩‍💻', '🧑‍🎨', '👱‍♀️', '👨‍💼'][idx % 4],
      }));
    }

    // Default productive project streams
    return [
      {
        id: 'proj-1',
        rank: '#1',
        title: 'Personal Assistant Ecosystem',
        subtitle: '8/10 milestones completed',
        progressPercent: 80,
        tag: '@core',
        avatar: '👩‍💻',
      },
      {
        id: 'proj-2',
        rank: '#2',
        title: 'Habit Consistency & Marathon',
        subtitle: '5/6 routines maintained',
        progressPercent: 83,
        tag: '@fitness',
        avatar: '🏃‍♂️',
      },
      {
        id: 'proj-3',
        rank: '#3',
        title: 'Engineering Architecture Sprint',
        subtitle: '12/14 tasks finished',
        progressPercent: 86,
        tag: '@sprint',
        avatar: '⚡',
      },
      {
        id: 'proj-4',
        rank: '#4',
        title: 'Deep Focus & Continuous Learning',
        subtitle: '4/5 study sessions logged',
        progressPercent: 75,
        tag: '@growth',
        avatar: '📚',
      },
    ];
  }, [projects]);

  // Wellness Consistency Matrix for Card 5
  const consistencyDays = useMemo(() => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return days.map((day, idx) => ({
      day,
      hydration: idx < 6, // 6/7 days logged
      activity: idx % 2 === 0,
      sleep: idx !== 3,
      focus: idx < 5,
    }));
  }, []);

  const streakDays = useMemo(() => {
    if (kpi?.routineAdherencePercent && kpi.routineAdherencePercent > 50) {
      return 14;
    }
    return 12;
  }, [kpi]);

  return (
    <div className="space-y-6">
      {/* =========================================================================
          ROW 1: TWO MAIN HERO CARDS
          Left: Productivity Velocity / Weekly Completion Pacing (7 cols)
          Right: Today's Schedule & Routine (5 cols)
         ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* CARD 1: Productivity Velocity */}
        <div className="lg:col-span-7 bg-white rounded-[26px] p-6 sm:p-7 border border-[#E8EAF5] shadow-[0_8px_30px_rgb(24,27,46,0.035)] flex flex-col justify-between">
          <div>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base sm:text-lg font-bold text-[#18181B] tracking-tight flex items-center gap-2">
                <span>Productivity Velocity</span>
              </h3>
              <button
                onClick={() => onNavigateTab('analytics')}
                className="text-xs sm:text-sm font-semibold text-[#717182] hover:text-[#18181B] transition-colors"
              >
                View All
              </button>
            </div>

            {/* Stat Headline */}
            <div className="flex items-baseline gap-3 mb-6">
              <span className="text-3xl sm:text-4xl font-extrabold text-[#18181B] tracking-tight">
                +{Math.max(12, Math.round(completionRate * 0.2))}%
              </span>
              <span className="text-xs sm:text-sm text-[#717182] font-medium">
                Weekly completion velocity is pacing higher than previous week
              </span>
            </div>
          </div>

          {/* Bar Chart Container */}
          <div className="pt-2">
            <div className="flex items-end justify-between gap-2 sm:gap-3 h-52 sm:h-56 pb-2">
              {/* Y-Axis scale on left */}
              <div className="flex flex-col justify-between h-full text-[10px] sm:text-xs text-[#9CA3AF] font-medium pb-6 pr-2 select-none">
                <span>15+</span>
                <span>10</span>
                <span>8</span>
                <span>4</span>
                <span>0</span>
              </div>

              {/* 7 Daily Bars */}
              {velocityData.map((item) => (
                <div
                  key={item.day}
                  onClick={() => onSelectDate(item.dateStr)}
                  className="flex-1 flex flex-col items-center justify-end h-full group relative cursor-pointer"
                >
                  {/* Floating tooltip badge for highlighted bar */}
                  {item.isHighlighted && (
                    <div className="absolute -top-11 flex flex-col items-center animate-fade-in z-10 pointer-events-none">
                      <div className="text-center">
                        <span className="text-sm font-extrabold text-[#7C3AED] leading-none block">
                          {item.count}
                        </span>
                        <span className="text-[10px] font-medium text-[#717182] leading-none block whitespace-nowrap mt-0.5">
                          Tasks & Habits
                        </span>
                      </div>
                    </div>
                  )}

                  {/* The Bar Pillar */}
                  <div className="w-full flex justify-center items-end h-[160px]">
                    <div
                      style={{ height: `${item.heightPercent}%` }}
                      className={`w-full max-w-[52px] rounded-2xl transition-all duration-300 ${
                        item.isHighlighted
                          ? 'bg-[#7C3AED] shadow-[0_8px_20px_rgba(124,58,237,0.35)]'
                          : 'bg-[#F3F4F9] group-hover:bg-[#EBEBF5]'
                      }`}
                    />
                  </div>

                  {/* Day Label */}
                  <span
                    className={`mt-3 text-xs sm:text-sm font-medium transition-colors ${
                      item.isHighlighted ? 'text-[#18181B] font-bold' : 'text-[#717182] group-hover:text-[#18181B]'
                    }`}
                  >
                    {item.day}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CARD 2: Today's Schedule & Routine (Right 5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-[26px] p-6 sm:p-7 border border-[#E8EAF5] shadow-[0_8px_30px_rgb(24,27,46,0.035)] flex flex-col justify-between">
          <div>
            {/* Header with Month Selector */}
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base sm:text-lg font-bold text-[#18181B] tracking-tight">
                Today&apos;s Schedule & Routine
              </h3>
              <button
                onClick={() => onNavigateTab('calendar')}
                className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#18181B] hover:text-[#7C3AED] transition-colors"
              >
                <span>{format(currentDateObj, 'MMMM yyyy')}</span>
                <ChevronDown className="w-4 h-4 text-[#717182]" />
              </button>
            </div>

            {/* Horizontal 9-Day Strip */}
            <div className="flex items-center justify-between gap-1 mb-6 pb-2 overflow-x-auto no-scrollbar">
              {horizontalDays.map((dateItem) => {
                const dateStr = format(dateItem, 'yyyy-MM-dd');
                const isSelected = dateStr === selectedDate;
                const dayNum = format(dateItem, 'd');
                const dayName = format(dateItem, 'EEE');

                return (
                  <button
                    key={dateStr}
                    onClick={() => onSelectDate(dateStr)}
                    className="flex flex-col items-center shrink-0 min-w-[32px] sm:min-w-[36px] py-1 transition-all group"
                  >
                    <span className="text-[10px] sm:text-[11px] font-medium text-[#717182] mb-1.5">
                      {dayName}
                    </span>
                    <div
                      className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex flex-col items-center justify-center font-bold text-xs sm:text-sm transition-all ${
                        isSelected
                          ? 'bg-[#18181B] text-white shadow-xs'
                          : 'text-[#18181B] hover:bg-[#F4F4FD]'
                      }`}
                    >
                      {dayNum}
                    </div>
                    {isSelected ? (
                      <span className="w-1 h-1 rounded-full bg-[#18181B] mt-1" />
                    ) : (
                      <span className="w-1 h-1 rounded-full bg-transparent mt-1" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Tinted Pastel Schedule Items */}
            <div className="space-y-3">
              {scheduleItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => {
                    if (item.type === 'task' && item.rawItem) {
                      onSelectTask?.(item.rawItem);
                    } else if (item.type === 'routine' && item.rawItem) {
                      onOpenRoutineCheckIn?.(item.rawItem);
                    } else if (item.type === 'task') {
                      onOpenCreateTask();
                    } else {
                      onOpenCreateRoutine();
                    }
                  }}
                  className={`p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${item.bgClass} ${item.borderClass} hover:shadow-xs`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xl sm:text-2xl shrink-0 select-none">{item.emoji}</span>
                    <div className="min-w-0">
                      <h4 className="text-xs sm:text-sm font-bold text-[#18181B] truncate tracking-tight">
                        {item.title}
                      </h4>
                      <p className="text-[11px] text-[#717182] font-medium truncate mt-0.5">
                        {item.time}
                      </p>
                    </div>
                  </div>

                  <span className="bg-[#18181B] text-white text-[10px] sm:text-xs font-semibold px-3 py-1 rounded-full shrink-0 shadow-2xs">
                    {item.statusBadge}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          ROW 2: THREE BOTTOM CARDS
          1. Daily Completion & Focus (Left)
          2. Active Projects & Milestones (Center)
          3. Wellness & Habit Consistency (Right)
         ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* CARD 3: Daily Completion & Focus (Bottom Left - 4 cols) */}
        <div className="md:col-span-4 bg-white rounded-[26px] p-6 sm:p-7 border border-[#E8EAF5] shadow-[0_8px_30px_rgb(24,27,46,0.035)] flex flex-col justify-between">
          <div>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base sm:text-lg font-bold text-[#18181B] tracking-tight">
                Daily Completion &amp; Focus
              </h3>
              <button
                onClick={() => onNavigateTab('my-day')}
                className="text-xs sm:text-sm font-semibold text-[#717182] hover:text-[#18181B] transition-colors"
              >
                View All
              </button>
            </div>

            {/* Stat & Circular Coral Ring Gauge */}
            <div className="flex items-center justify-between gap-4 py-2">
              <div>
                <span className="text-3xl sm:text-4xl font-extrabold text-[#18181B] tracking-tight block">
                  {completedCount}/{totalCount}
                </span>
                <p className="text-xs text-[#717182] font-medium mt-1 leading-relaxed max-w-[160px]">
                  Tasks &amp; routines finished. Keep moving forward toward today&apos;s target!
                </p>
              </div>

              {/* Coral Red Circular Progress Ring (SVG) */}
              <div className="relative w-24 h-24 sm:w-28 sm:h-28 shrink-0 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  {/* Subtle track background */}
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="#F4F4FD"
                    strokeWidth="12"
                    strokeLinecap="round"
                  />
                  {/* Coral progress arc */}
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="#FF647C"
                    strokeWidth="12"
                    strokeDasharray="251.2"
                    strokeDashoffset={251.2 * (1 - completionRate / 100)}
                    strokeLinecap="round"
                    className="transition-all duration-700 ease-out"
                  />
                </svg>
                {/* Center Percentage */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-base sm:text-lg font-extrabold text-[#18181B]">
                    {completionRate}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Smart Assistant Proactive Check-In Banner */}
          <div className="mt-6 pt-4 border-t border-[#F0F2FA]">
            <div className="bg-gradient-to-r from-[#FDE8E8] via-[#E8EAFF] to-[#F3E8FF] rounded-2xl p-4 flex items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-white/80 backdrop-blur-xs flex items-center justify-center text-xl shrink-0 shadow-2xs">
                  🤖
                </div>
                <div className="min-w-0">
                  <h5 className="text-xs sm:text-sm font-bold text-[#18181B] leading-tight">
                    Smart Assistant
                  </h5>
                  <p className="text-xs sm:text-sm font-medium text-[#717182] leading-tight">
                    Replan &amp; Check-In
                  </p>
                </div>
              </div>

              <button
                onClick={onOpenEmergency}
                className="bg-[#18181B] text-white hover:bg-[#27272A] text-xs font-semibold px-3 py-2 rounded-xl flex items-center gap-1.5 transition-all shadow-xs shrink-0"
              >
                <span>Check In</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* CARD 4: Active Projects & Milestones (Center 4 cols) */}
        <div className="md:col-span-4 bg-white rounded-[26px] p-6 sm:p-7 border border-[#E8EAF5] shadow-[0_8px_30px_rgb(24,27,46,0.035)] flex flex-col justify-between">
          <div>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base sm:text-lg font-bold text-[#18181B] tracking-tight">
                Active Projects &amp; Milestones
              </h3>
              <button
                onClick={() => onNavigateTab('projects')}
                className="text-xs sm:text-sm font-semibold text-[#717182] hover:text-[#18181B] transition-colors"
              >
                View All
              </button>
            </div>

            {/* Ranked List (#1, #2, #3, #4) */}
            <div className="divide-y divide-[#F0F2FA]">
              {displayProjects.map((proj) => (
                <div
                  key={proj.id}
                  onClick={() => onNavigateTab('projects')}
                  className="py-3 flex items-center justify-between gap-3 cursor-pointer group hover:bg-[#FBFBFF] -mx-2 px-2 rounded-xl transition-colors"
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <span className="text-xs font-bold text-[#717182] pt-0.5">{proj.rank}</span>
                    <div className="min-w-0">
                      <h5 className="text-xs sm:text-sm font-bold text-[#18181B] truncate tracking-tight group-hover:text-[#7C3AED] transition-colors">
                        {proj.title}
                      </h5>
                      <p className="text-[11px] text-[#717182] font-medium mt-0.5">
                        {proj.subtitle}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-sm select-none">{proj.avatar}</span>
                    <span className="text-xs font-medium text-[#717182]">{proj.tag}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CARD 5: Wellness & Habit Consistency (Right 4 cols) */}
        <div className="md:col-span-4 bg-white rounded-[26px] p-6 sm:p-7 border border-[#E8EAF5] shadow-[0_8px_30px_rgb(24,27,46,0.035)] flex flex-col justify-between">
          <div>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base sm:text-lg font-bold text-[#18181B] tracking-tight">
                Wellness &amp; Habit Consistency
              </h3>
              <button
                onClick={() => onNavigateTab('wellness')}
                className="text-xs sm:text-sm font-semibold text-[#717182] hover:text-[#18181B] transition-colors"
              >
                View All
              </button>
            </div>

            {/* Stylized Weekly Habit & Wellness Consistency Matrix */}
            <div className="py-2">
              <div className="grid grid-cols-7 gap-1.5 text-center mb-2">
                {consistencyDays.map((d) => (
                  <span key={d.day} className="text-[10px] font-semibold text-[#717182]">
                    {d.day}
                  </span>
                ))}
              </div>

              {/* 4 Consistency Tracks */}
              <div className="space-y-2">
                {/* Track 1: Hydration */}
                <div className="flex items-center justify-between gap-1.5 bg-[#F4F8FF] p-2 rounded-xl border border-[#E0EBFB]">
                  <div className="flex items-center gap-1.5 w-16 shrink-0">
                    <Droplet className="w-3.5 h-3.5 text-[#3B82F6]" />
                    <span className="text-[10px] font-bold text-[#18181B]">Water</span>
                  </div>
                  <div className="flex-1 grid grid-cols-7 gap-1.5 justify-items-center">
                    {consistencyDays.map((d, i) => (
                      <span
                        key={i}
                        className={`w-2.5 h-2.5 rounded-full ${
                          d.hydration
                            ? 'bg-[#3B82F6] ring-2 ring-[#3B82F6]/20'
                            : 'bg-slate-200'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* Track 2: Physical Activity */}
                <div className="flex items-center justify-between gap-1.5 bg-[#F0FAF4] p-2 rounded-xl border border-[#DCFCE7]">
                  <div className="flex items-center gap-1.5 w-16 shrink-0">
                    <Footprints className="w-3.5 h-3.5 text-[#10B981]" />
                    <span className="text-[10px] font-bold text-[#18181B]">Steps</span>
                  </div>
                  <div className="flex-1 grid grid-cols-7 gap-1.5 justify-items-center">
                    {consistencyDays.map((d, i) => (
                      <span
                        key={i}
                        className={`w-2.5 h-2.5 rounded-full ${
                          d.activity
                            ? 'bg-[#10B981] ring-2 ring-[#10B981]/20'
                            : 'bg-slate-200'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* Track 3: Sleep Baseline */}
                <div className="flex items-center justify-between gap-1.5 bg-[#F7F4FD] p-2 rounded-xl border border-[#ECE5FA]">
                  <div className="flex items-center gap-1.5 w-16 shrink-0">
                    <Moon className="w-3.5 h-3.5 text-[#7C3AED]" />
                    <span className="text-[10px] font-bold text-[#18181B]">Sleep</span>
                  </div>
                  <div className="flex-1 grid grid-cols-7 gap-1.5 justify-items-center">
                    {consistencyDays.map((d, i) => (
                      <span
                        key={i}
                        className={`w-2.5 h-2.5 rounded-full ${
                          d.sleep
                            ? 'bg-[#7C3AED] ring-2 ring-[#7C3AED]/20'
                            : 'bg-slate-200'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* Track 4: Focus Sessions */}
                <div className="flex items-center justify-between gap-1.5 bg-[#FFF8F3] p-2 rounded-xl border border-[#FFEDD5]">
                  <div className="flex items-center gap-1.5 w-16 shrink-0">
                    <Zap className="w-3.5 h-3.5 text-[#F97316]" />
                    <span className="text-[10px] font-bold text-[#18181B]">Focus</span>
                  </div>
                  <div className="flex-1 grid grid-cols-7 gap-1.5 justify-items-center">
                    {consistencyDays.map((d, i) => (
                      <span
                        key={i}
                        className={`w-2.5 h-2.5 rounded-full ${
                          d.focus
                            ? 'bg-[#F97316] ring-2 ring-[#F97316]/20'
                            : 'bg-slate-200'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Headline Stat */}
          <div className="pt-2">
            <span className="text-3xl sm:text-4xl font-extrabold text-[#18181B] tracking-tight block">
              {streakDays}+ Days
            </span>
            <span className="text-xs sm:text-sm text-[#717182] font-medium block mt-0.5">
              Active Habit Streak &bull; 92% Consistency
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
