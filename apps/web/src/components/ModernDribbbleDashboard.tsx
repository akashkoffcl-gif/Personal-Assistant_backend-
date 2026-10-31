'use client';

import React, { useState, useMemo } from 'react';
import { format, addDays, subDays, startOfWeek, eachDayOfInterval, isSameDay } from 'date-fns';
import {
  TaskDto,
  RoutineOccurrenceDto,
  DailyKpiSummary,
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
} from 'lucide-react';

interface ModernDribbbleDashboardProps {
  tasks: TaskDto[];
  occurrences: RoutineOccurrenceDto[];
  kpi?: DailyKpiSummary;
  wellnessSummary?: any;
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

  // Productivity velocity / Bar chart data
  const velocityData = useMemo(() => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    // Realistic heights mimicking the reference card
    const heights = [65, 45, 55, 38, 78, 92, 70];
    const totalDone = kpi?.completedTasks ? kpi.completedTasks * 14 + 17 : 87;
    return days.map((day, idx) => ({
      day,
      heightPercent: heights[idx],
      isHighlighted: day === 'Sat' || idx === 5, // Saturday highlighted in purple like reference
      count: idx === 5 ? totalDone : Math.round(heights[idx] * 0.9),
    }));
  }, [kpi]);

  // Map tasks and habits to styled pastel rows
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

    // Add first 2 routines
    occurrences.slice(0, 2).forEach((occ, idx) => {
      const isDone = occ.status === TaskStatus.COMPLETED;
      const target = occ.routine?.targetQuantity || 1;
      const actual = occ.actualQuantity || 0;
      const unit = occ.routine?.unit || 'steps';
      list.push({
        id: occ.id,
        title: occ.routine?.title || 'Daily Routine',
        time: occ.routine?.targetTime
          ? `${format(currentDateObj, 'd MMM yyyy')}, ${occ.routine.targetTime}`
          : `${format(currentDateObj, 'd MMM yyyy')}, 09:00 am`,
        statusBadge: isDone ? 'Completed' : actual > 0 ? `${actual}/${target} ${unit}` : 'Sending',
        bgClass: idx === 0 ? 'bg-[#F0FAF4]' : 'bg-[#F4F4FD]',
        borderClass: idx === 0 ? 'border-[#DCFCE7]' : 'border-[#E0E7FF]',
        emoji: idx === 0 ? '🌱' : '✌️',
        type: 'routine',
        rawItem: occ,
        isDone,
      });
    });

    // Add scheduled tasks
    tasks.slice(0, 3).forEach((task, idx) => {
      const isDone = task.status === TaskStatus.COMPLETED;
      const timeStr = task.scheduledStartTime
        ? format(new Date(task.scheduledStartTime), 'd MMM yyyy, hh:mm a')
        : `${format(currentDateObj, 'd MMM yyyy')}, 0${idx + 2}:00 pm`;

      const palette = [
        { bg: 'bg-[#FFF6ED]', border: 'border-[#FFEDD5]', emoji: '👑' },
        { bg: 'bg-[#F4F4FD]', border: 'border-[#E0E7FF]', emoji: '🎯' },
        { bg: 'bg-[#F0FAF4]', border: 'border-[#DCFCE7]', emoji: '⚡' },
      ][idx % 3];

      list.push({
        id: task.id,
        title: task.title,
        time: timeStr,
        statusBadge: isDone ? 'Done' : task.status === TaskStatus.IN_PROGRESS ? 'In Progress' : 'Draft',
        bgClass: palette.bg,
        borderClass: palette.border,
        emoji: palette.emoji,
        type: 'task',
        rawItem: task,
        isDone,
      });
    });

    // If empty fallback items to ensure the UI looks complete
    if (list.length === 0) {
      list.push(
        {
          id: 'def-1',
          title: 'Designed to Drive Your Growth',
          time: `${format(currentDateObj, 'd MMMM yyyy')}, 12.00 am`,
          statusBadge: 'Sending',
          bgClass: 'bg-[#F0FAF4]',
          borderClass: 'border-[#DCFCE7]',
          emoji: '🌱',
          type: 'routine',
          rawItem: null,
          isDone: false,
        },
        {
          id: 'def-2',
          title: 'Make Every Click Count',
          time: `${format(currentDateObj, 'd MMMM yyyy')}, 01.00 pm`,
          statusBadge: 'Draft',
          bgClass: 'bg-[#F4F4FD]',
          borderClass: 'border-[#E0E7FF]',
          emoji: '✌️',
          type: 'task',
          rawItem: null,
          isDone: false,
        },
        {
          id: 'def-3',
          title: 'Take Your Brand to the Next Level',
          time: `${format(currentDateObj, 'd MMMM yyyy')}, 03.00 pm`,
          statusBadge: 'Draft',
          bgClass: 'bg-[#FFF6ED]',
          borderClass: 'border-[#FFEDD5]',
          emoji: '👑',
          type: 'task',
          rawItem: null,
          isDone: false,
        },
      );
    }

    return list;
  }, [occurrences, tasks, currentDateObj]);

  // Coral progress percentage calculation
  const habitCompletionRate = kpi?.routineAdherencePercent || 80;
  const visitScore = kpi?.completedTasks ? kpi.completedTasks * 180 + 347 : 847;

  return (
    <div className="space-y-6">
      {/* =========================================================================
          ROW 1: TWO MAIN HERO CARDS
          Left: Engagement Click / Productivity Velocity (7 cols)
          Right: Schedule Campaign / Today's Schedule & Routine (5 cols)
         ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* CARD 1: Productivity Velocity (Like "Engagement Click") */}
        <div className="lg:col-span-7 bg-white rounded-[26px] p-6 sm:p-7 border border-[#E8EAF5] shadow-[0_8px_30px_rgb(24,27,46,0.035)] flex flex-col justify-between">
          <div>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base sm:text-lg font-bold text-[#18181B] tracking-tight">
                Engagement Click
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
                +2.7%
              </span>
              <span className="text-xs sm:text-sm text-[#717182] font-medium">
                This week&apos;s results are better than last week&apos;s
              </span>
            </div>
          </div>

          {/* Bar Chart Container */}
          <div className="pt-2">
            <div className="flex items-end justify-between gap-2 sm:gap-3 h-52 sm:h-56 pb-2">
              {/* Y-Axis scale on left */}
              <div className="flex flex-col justify-between h-full text-[10px] sm:text-xs text-[#9CA3AF] font-medium pb-6 pr-2 select-none">
                <span>15k+</span>
                <span>10k+</span>
                <span>1k</span>
                <span>500</span>
                <span>0</span>
              </div>

              {/* 7 Daily Bars */}
              {velocityData.map((item) => (
                <div
                  key={item.day}
                  className="flex-1 flex flex-col items-center justify-end h-full group relative"
                >
                  {/* Floating tooltip badge for highlighted bar */}
                  {item.isHighlighted && (
                    <div className="absolute -top-11 flex flex-col items-center animate-fade-in z-10 pointer-events-none">
                      <div className="text-center">
                        <span className="text-sm font-extrabold text-[#7C3AED] leading-none block">
                          87
                        </span>
                        <span className="text-[10px] font-medium text-[#717182] leading-none block whitespace-nowrap mt-0.5">
                          Total Click
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
                          : 'bg-[#F3F4F9] hover:bg-[#EBEBF5]'
                      }`}
                    />
                  </div>

                  {/* Day Label */}
                  <span
                    className={`mt-3 text-xs sm:text-sm font-medium ${
                      item.isHighlighted ? 'text-[#18181B] font-bold' : 'text-[#717182]'
                    }`}
                  >
                    {item.day}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CARD 2: Schedule Campaign / Today's Plan (Right 5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-[26px] p-6 sm:p-7 border border-[#E8EAF5] shadow-[0_8px_30px_rgb(24,27,46,0.035)] flex flex-col justify-between">
          <div>
            {/* Header with Month Selector */}
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base sm:text-lg font-bold text-[#18181B] tracking-tight">
                Schedule Campaign
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
          1. Visit for Today & AI Promo (Left)
          2. Top Campaign / Active Habits (Center)
          3. User Location / Wellness & Focus (Right)
         ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* CARD 3: Visit for Today (Bottom Left - 4 cols) */}
        <div className="md:col-span-4 bg-white rounded-[26px] p-6 sm:p-7 border border-[#E8EAF5] shadow-[0_8px_30px_rgb(24,27,46,0.035)] flex flex-col justify-between">
          <div>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base sm:text-lg font-bold text-[#18181B] tracking-tight">
                Visit for Today
              </h3>
              <button
                onClick={() => onNavigateTab('wellness')}
                className="text-xs sm:text-sm font-semibold text-[#717182] hover:text-[#18181B] transition-colors"
              >
                View All
              </button>
            </div>

            {/* Stat & Circular Coral Ring Gauge */}
            <div className="flex items-center justify-between gap-4 py-2">
              <div>
                <span className="text-3xl sm:text-4xl font-extrabold text-[#18181B] tracking-tight block">
                  {visitScore}
                </span>
                <p className="text-xs text-[#717182] font-medium mt-1 leading-relaxed max-w-[160px]">
                  Keep moving forward and get more points and visit
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
                    strokeDashoffset={251.2 * (1 - habitCompletionRate / 100)}
                    strokeLinecap="round"
                    className="transition-all duration-700 ease-out"
                  />
                </svg>
                {/* Center Percentage */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-base sm:text-lg font-extrabold text-[#18181B]">
                    {habitCompletionRate}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* AI Transformation Promo Card */}
          <div className="mt-6 pt-4 border-t border-[#F0F2FA]">
            <div className="bg-gradient-to-r from-[#FDE8E8] via-[#E8EAFF] to-[#F3E8FF] rounded-2xl p-4 flex items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-white/80 backdrop-blur-xs flex items-center justify-center text-xl shrink-0 shadow-2xs">
                  🤖
                </div>
                <div className="min-w-0">
                  <h5 className="text-xs sm:text-sm font-bold text-[#18181B] leading-tight">
                    Discover how AI
                  </h5>
                  <p className="text-xs sm:text-sm font-bold text-[#18181B] leading-tight">
                    transforms
                  </p>
                </div>
              </div>

              <button
                onClick={onOpenEmergency}
                className="bg-[#18181B] text-white hover:bg-[#27272A] text-xs font-semibold px-3 py-2 rounded-xl flex items-center gap-1.5 transition-all shadow-xs shrink-0"
              >
                <span>Go to AI</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* CARD 4: Top Campaign / Active Routines (Center 4 cols) */}
        <div className="md:col-span-4 bg-white rounded-[26px] p-6 sm:p-7 border border-[#E8EAF5] shadow-[0_8px_30px_rgb(24,27,46,0.035)] flex flex-col justify-between">
          <div>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base sm:text-lg font-bold text-[#18181B] tracking-tight">
                Top Campaign
              </h3>
              <button
                onClick={() => onNavigateTab('routines')}
                className="text-xs sm:text-sm font-semibold text-[#717182] hover:text-[#18181B] transition-colors"
              >
                View All
              </button>
            </div>

            {/* Ranked List (#1, #2, #3, #4) */}
            <div className="divide-y divide-[#F0F2FA]">
              {/* #1 Routine / Steps */}
              <div className="py-3 flex items-center justify-between gap-3">
                <div className="flex items-start gap-2.5 min-w-0">
                  <span className="text-xs font-bold text-[#717182] pt-0.5">#1</span>
                  <div className="min-w-0">
                    <h5 className="text-xs sm:text-sm font-bold text-[#18181B] truncate tracking-tight">
                      Simple Solutions for Big Results
                    </h5>
                    <p className="text-[11px] text-[#717182] font-medium mt-0.5">
                      399 Click
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-sm select-none">👩‍🦰</span>
                  <span className="text-xs font-medium text-[#717182]">@novaquest</span>
                </div>
              </div>

              {/* #2 Deep Work / Tasks */}
              <div className="py-3 flex items-center justify-between gap-3">
                <div className="flex items-start gap-2.5 min-w-0">
                  <span className="text-xs font-bold text-[#717182] pt-0.5">#2</span>
                  <div className="min-w-0">
                    <h5 className="text-xs sm:text-sm font-bold text-[#18181B] truncate tracking-tight">
                      Power Up Your Marketing
                    </h5>
                    <p className="text-[11px] text-[#717182] font-medium mt-0.5">
                      300 Click
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-sm select-none">🧑</span>
                  <span className="text-xs font-medium text-[#717182]">@brightnest</span>
                </div>
              </div>

              {/* #3 Optimization */}
              <div className="py-3 flex items-center justify-between gap-3">
                <div className="flex items-start gap-2.5 min-w-0">
                  <span className="text-xs font-bold text-[#717182] pt-0.5">#3</span>
                  <div className="min-w-0">
                    <h5 className="text-xs sm:text-sm font-bold text-[#18181B] truncate tracking-tight">
                      Automate, Optimize, and Grow
                    </h5>
                    <p className="text-[11px] text-[#717182] font-medium mt-0.5">
                      292 Click
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-sm select-none">👱‍♀️</span>
                  <span className="text-xs font-medium text-[#717182]">@skylerwave</span>
                </div>
              </div>

              {/* #4 Growth */}
              <div className="py-3 flex items-center justify-between gap-3">
                <div className="flex items-start gap-2.5 min-w-0">
                  <span className="text-xs font-bold text-[#717182] pt-0.5">#4</span>
                  <div className="min-w-0">
                    <h5 className="text-xs sm:text-sm font-bold text-[#18181B] truncate tracking-tight">
                      Designed to Drive Your Growth
                    </h5>
                    <p className="text-[11px] text-[#717182] font-medium mt-0.5">
                      282 Click
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-sm select-none">👨</span>
                  <span className="text-xs font-medium text-[#717182]">@velarispace</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CARD 5: User Location / Wellness & Activity Map (Right 4 cols) */}
        <div className="md:col-span-4 bg-white rounded-[26px] p-6 sm:p-7 border border-[#E8EAF5] shadow-[0_8px_30px_rgb(24,27,46,0.035)] flex flex-col justify-between">
          <div>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base sm:text-lg font-bold text-[#18181B] tracking-tight">
                User Location
              </h3>
              <button
                onClick={() => onNavigateTab('wellness')}
                className="text-xs sm:text-sm font-semibold text-[#717182] hover:text-[#18181B] transition-colors"
              >
                View All
              </button>
            </div>

            {/* Stylized World Dot Matrix Map */}
            <div className="relative h-44 sm:h-48 flex items-center justify-center my-2">
              <svg className="w-full h-full opacity-85" viewBox="0 0 360 180" fill="none">
                {/* Dotted pattern simulating the world map in reference */}
                <g fill="#D1D5DB" opacity="0.6">
                  {/* North America dots */}
                  <circle cx="50" cy="40" r="2.5" />
                  <circle cx="60" cy="40" r="2.5" />
                  <circle cx="70" cy="42" r="2.5" />
                  <circle cx="80" cy="48" r="2.5" />
                  <circle cx="55" cy="52" r="2.5" />
                  <circle cx="65" cy="54" r="2.5" />
                  <circle cx="75" cy="56" r="2.5" />
                  <circle cx="85" cy="60" r="2.5" />
                  <circle cx="60" cy="65" r="2.5" />
                  <circle cx="70" cy="70" r="2.5" />

                  {/* South America dots */}
                  <circle cx="85" cy="95" r="2.5" />
                  <circle cx="95" cy="100" r="2.5" />
                  <circle cx="90" cy="115" r="2.5" />
                  <circle cx="100" cy="125" r="2.5" />
                  <circle cx="95" cy="140" r="2.5" />

                  {/* Europe dots */}
                  <circle cx="170" cy="38" r="2.5" />
                  <circle cx="180" cy="40" r="2.5" />
                  <circle cx="190" cy="42" r="2.5" />
                  <circle cx="175" cy="50" r="2.5" />
                  <circle cx="185" cy="52" r="2.5" />
                  <circle cx="195" cy="55" r="2.5" />

                  {/* Africa dots */}
                  <circle cx="180" cy="75" r="2.5" />
                  <circle cx="190" cy="80" r="2.5" />
                  <circle cx="185" cy="95" r="2.5" />
                  <circle cx="195" cy="105" r="2.5" />
                  <circle cx="190" cy="120" r="2.5" />
                  <circle cx="200" cy="130" r="2.5" />

                  {/* Asia dots */}
                  <circle cx="230" cy="45" r="2.5" />
                  <circle cx="240" cy="42" r="2.5" />
                  <circle cx="250" cy="48" r="2.5" />
                  <circle cx="260" cy="52" r="2.5" />
                  <circle cx="235" cy="60" r="2.5" />
                  <circle cx="245" cy="65" r="2.5" />
                  <circle cx="255" cy="68" r="2.5" />
                  <circle cx="270" cy="65" r="2.5" />
                  <circle cx="280" cy="70" r="2.5" />
                  <circle cx="240" cy="80" r="2.5" />
                  <circle cx="250" cy="85" r="2.5" />
                  <circle cx="265" cy="90" r="2.5" />

                  {/* Australia dots */}
                  <circle cx="295" cy="125" r="2.5" />
                  <circle cx="305" cy="130" r="2.5" />
                  <circle cx="315" cy="135" r="2.5" />
                  <circle cx="300" cy="145" r="2.5" />
                </g>

                {/* Accent location pins matching reference image */}
                {/* Blue pin */}
                <circle cx="75" cy="56" r="4.5" fill="#3B82F6" />
                <circle cx="75" cy="56" r="7" stroke="#3B82F6" strokeWidth="1.5" opacity="0.3" />

                {/* Coral Red pin */}
                <circle cx="185" cy="52" r="4.5" fill="#FF647C" />
                <circle cx="185" cy="52" r="7" stroke="#FF647C" strokeWidth="1.5" opacity="0.3" />

                {/* Purple pin */}
                <circle cx="245" cy="65" r="4.5" fill="#7C3AED" />
                <circle cx="245" cy="65" r="7" stroke="#7C3AED" strokeWidth="1.5" opacity="0.3" />

                {/* Orange pin */}
                <circle cx="265" cy="90" r="4.5" fill="#F97316" />
                <circle cx="265" cy="90" r="7" stroke="#F97316" strokeWidth="1.5" opacity="0.3" />

                {/* Mint pin */}
                <circle cx="195" cy="105" r="4.5" fill="#10B981" />
                <circle cx="195" cy="105" r="7" stroke="#10B981" strokeWidth="1.5" opacity="0.3" />
              </svg>
            </div>
          </div>

          {/* Bottom Headline Stat */}
          <div className="pt-2">
            <span className="text-3xl sm:text-4xl font-extrabold text-[#18181B] tracking-tight block">
              200+
            </span>
            <span className="text-xs sm:text-sm text-[#717182] font-medium block mt-0.5">
              Total Location
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
