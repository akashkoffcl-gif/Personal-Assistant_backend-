'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { format, addDays, subDays, isToday, parseISO } from 'date-fns';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle2,
  Circle,
  AlertTriangle,
  Play,
  RotateCcw,
  Sparkles,
  ArrowRight,
  Plus,
  Repeat,
  Timer,
  Bell,
  CheckSquare,
  Briefcase,
  Flag,
  FolderKanban,
  Check,
  CalendarCheck,
  Flame,
} from 'lucide-react';
import { toast } from '@/components/Toast';

interface MyDayTimelineWorkspaceProps {
  onOpenCreateTask: () => void;
  onOpenSmartPlanner?: () => void;
  onNavigateTab?: (tab: string) => void;
  onSelectTask?: (task: any) => void;
}

export const MyDayTimelineWorkspace: React.FC<MyDayTimelineWorkspaceProps> = ({
  onOpenCreateTask,
  onOpenSmartPlanner,
  onNavigateTab,
  onSelectTask,
}) => {
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState<string>(() => format(new Date(), 'yyyy-MM-dd'));
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'TASK' | 'ROUTINE' | 'FOCUS' | 'REMINDER'>('ALL');

  const { data: timelineData, isLoading, refetch, error } = useQuery({
    queryKey: ['day-timeline', selectedDate],
    queryFn: () => api.getDayTimeline(selectedDate),
    staleTime: 10000,
  });

  if (error) {
    console.error('[MY DAY QUERY ERROR]', error);
  }
  if (timelineData) {
    console.log('[MY DAY DATA SUCCESS]', timelineData);
  }

  const raw = (timelineData as any)?.data || timelineData;
  const summary = raw?.summary || {
    total: 0,
    completed: 0,
    inProgress: 0,
    overdue: 0,
    pending: 0,
    completionPercentage: 0,
    isAllCompleted: false,
  };
  const timelineItems: any[] = raw?.timeline || [];
  const unscheduledTasks: any[] = raw?.unscheduledTasks || [];
  const currentActive = raw?.currentActiveItem || null;
  const nextRecommended = raw?.nextRecommendedItem || null;

  // Complete Task Mutation
  const completeTaskMutation = useMutation({
    mutationFn: (id: string) => api.completeTask(id),
    onSuccess: () => {
      toast.success('Task Completed', 'Timeline and progress metrics updated.');
      queryClient.invalidateQueries({ queryKey: ['day-timeline'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['daily-kpi'] });
    },
    onError: (err: any) => {
      toast.error('Task Action Failed', err?.message || 'Could not complete task.');
    },
  });

  // Start Focus on Task
  const startFocusMutation = useMutation({
    mutationFn: (taskId: string) => api.startFocusSession({ taskId, plannedDuration: 25 * 60, sessionType: 'FOCUS' }),
    onSuccess: () => {
      toast.success('Focus Studio Started', '25-minute deep work session initiated.');
      queryClient.invalidateQueries({ queryKey: ['day-timeline'] });
      queryClient.invalidateQueries({ queryKey: ['focus-current'] });
      onNavigateTab?.('focus');
    },
    onError: (err: any) => {
      toast.error('Focus Start Failed', err?.message || 'Could not start session.');
    },
  });

  // Complete Routine Occurrence
  const completeRoutineMutation = useMutation({
    mutationFn: (occurrenceId: string) => api.completeOccurrence(occurrenceId, 1),
    onSuccess: () => {
      toast.success('Habit Logged', 'Routine occurrence marked as completed.');
      queryClient.invalidateQueries({ queryKey: ['day-timeline'] });
      queryClient.invalidateQueries({ queryKey: ['routines'] });
    },
    onError: (err: any) => {
      toast.error('Routine Failed', err?.message || 'Could not record habit.');
    },
  });

  // Date Navigation handlers
  const handlePrevDay = () => {
    const prev = subDays(parseISO(selectedDate), 1);
    setSelectedDate(format(prev, 'yyyy-MM-dd'));
  };

  const handleNextDay = () => {
    const next = addDays(parseISO(selectedDate), 1);
    setSelectedDate(format(next, 'yyyy-MM-dd'));
  };

  const handleToday = () => {
    setSelectedDate(format(new Date(), 'yyyy-MM-dd'));
  };

  const filteredItems = timelineItems.filter((item) => {
    if (activeFilter === 'ALL') return true;
    return item.itemType === activeFilter;
  });

  const parsedDate = parseISO(selectedDate);
  const isDateToday = isToday(parsedDate);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* 1. Header & Date Navigator */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#E5E2F5] shadow-[0_4px_24px_rgba(139,69,245,0.04)] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-[#F4F3FF] text-[#8B45F5] border border-[#DDD8F8]">
              <CalendarCheck className="w-5 h-5 stroke-[2.2]" />
            </span>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-[#202033] tracking-tight">
                My Day Timeline
              </h1>
              <p className="text-xs text-[#74738A] font-medium">
                Intelligent chronological execution stream for your daily commitments
              </p>
            </div>
          </div>
        </div>

        {/* Date Selector Navigation Toolbar */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center bg-[#F4F3FF] p-1 rounded-2xl border border-[#E5E2F5]">
            <button
              onClick={handlePrevDay}
              className="p-1.5 rounded-xl hover:bg-white text-[#74738A] hover:text-[#202033] transition-colors"
              title="Previous Day"
              aria-label="Previous day"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="px-3 py-1 text-xs font-bold text-[#202033] flex items-center gap-1.5 min-w-[140px] justify-center">
              <CalendarIcon className="w-3.5 h-3.5 text-[#8B45F5]" />
              <span>{format(parsedDate, 'EEE, MMM d, yyyy')}</span>
            </div>
            <button
              onClick={handleNextDay}
              className="p-1.5 rounded-xl hover:bg-white text-[#74738A] hover:text-[#202033] transition-colors"
              title="Next Day"
              aria-label="Next day"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {!isDateToday && (
            <button
              onClick={handleToday}
              className="px-3 py-2 rounded-xl bg-[#EDE9FE] hover:bg-[#DDD8F8] text-[#8B45F5] text-xs font-bold transition-colors"
            >
              Jump to Today
            </button>
          )}

          <button
            onClick={onOpenCreateTask}
            className="px-4 py-2 rounded-xl bg-[#8B45F5] hover:bg-[#7839D6] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all transform active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Schedule Activity</span>
          </button>
        </div>
      </div>

      {/* 2. Compact Daily Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white rounded-2xl p-4 border border-[#E5E2F5] shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#74738A] block">
            Scheduled Items
          </span>
          <span className="text-2xl font-black text-[#202033] mt-1 block">{summary.total}</span>
          <span className="text-[10px] text-[#74738A] font-semibold">Across all sources</span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-[#E5E2F5] shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#10B981] block">
            Completed
          </span>
          <span className="text-2xl font-black text-[#10B981] mt-1 block">{summary.completed}</span>
          <span className="text-[10px] text-[#10B981] font-semibold">{summary.completionPercentage}% Done</span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-[#E5E2F5] shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#3B82F6] block">
            In Progress
          </span>
          <span className="text-2xl font-black text-[#3B82F6] mt-1 block">{summary.inProgress}</span>
          <span className="text-[10px] text-[#3B82F6] font-semibold">Active right now</span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-[#E5E2F5] shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#F59E0B] block">
            Pending / Upcoming
          </span>
          <span className="text-2xl font-black text-[#F59E0B] mt-1 block">{summary.pending}</span>
          <span className="text-[10px] text-[#F59E0B] font-semibold">On track today</span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-[#E5E2F5] shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#E05268] block">
            Overdue
          </span>
          <span className="text-2xl font-black text-[#E05268] mt-1 block">{summary.overdue}</span>
          <span className="text-[10px] text-[#E05268] font-semibold">Requires attention</span>
        </div>

        <div className="bg-gradient-to-tr from-[#6935C8] to-[#8B45F5] rounded-2xl p-4 text-white shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-200 block">
              Day Completion
            </span>
            <span className="text-2xl font-black mt-1 block">{summary.completionPercentage}%</span>
          </div>
          <div className="w-full bg-white/20 h-1.5 rounded-full overflow-hidden mt-2">
            <div
              className="bg-white h-full rounded-full transition-all duration-500"
              style={{ width: `${summary.completionPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* 3. Contextual Active Work / Next Action Recommendation Card */}
      {(currentActive || nextRecommended) && (
        <div className="bg-gradient-to-r from-[#F4F3FF] to-[#FAF9FF] border border-[#DDD8F8] rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#6935C8] to-[#8B45F5] text-white flex items-center justify-center shrink-0 shadow-xs">
              {currentActive ? <Flame className="w-5 h-5 text-white animate-pulse" /> : <Sparkles className="w-5 h-5 text-white" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#8B45F5] text-white">
                  {currentActive ? 'Active Work In Progress' : 'Next Recommended Action'}
                </span>
                <span className="text-xs font-semibold text-[#74738A]">
                  Scheduled for {format(parseISO(currentActive?.scheduledTime || nextRecommended?.scheduledTime), 'h:mm a')}
                </span>
              </div>
              <h4 className="text-sm font-bold text-[#202033] mt-1">
                {currentActive?.title || nextRecommended?.title}
              </h4>
              <p className="text-xs text-[#74738A] mt-0.5">
                {currentActive?.description || nextRecommended?.description || 'Allocated in your synchronized day plan.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {(currentActive?.itemType === 'TASK' || nextRecommended?.itemType === 'TASK') && (
              <button
                onClick={() => completeTaskMutation.mutate(currentActive?.sourceId || nextRecommended?.sourceId)}
                className="px-3.5 py-1.5 text-xs font-bold bg-[#10B981] hover:bg-[#059669] text-white rounded-xl transition-all flex items-center gap-1.5 shadow-2xs"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Mark Done</span>
              </button>
            )}
            <button
              onClick={() => onOpenSmartPlanner?.()}
              className="px-3.5 py-1.5 text-xs font-bold border border-[#DDD8F8] bg-white hover:bg-[#F4F3FF] text-[#6935C8] rounded-xl transition-all flex items-center gap-1.5"
            >
              <span>Smart Replan</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* 4. Filter Strip & Search */}
      <div className="flex items-center justify-between border-b border-[#E5E2F5] pb-3 gap-2 overflow-x-auto">
        <div className="flex items-center gap-1.5">
          {(['ALL', 'TASK', 'ROUTINE', 'FOCUS', 'REMINDER'] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveFilter(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeFilter === cat
                  ? 'bg-[#8B45F5] text-white shadow-2xs'
                  : 'bg-white text-[#74738A] hover:bg-[#F4F3FF] hover:text-[#202033] border border-[#E5E2F5]'
              }`}
            >
              {cat === 'ALL'
                ? `All Activities (${timelineItems.length})`
                : cat === 'TASK'
                ? `Tasks (${timelineItems.filter((i) => i.itemType === 'TASK').length})`
                : cat === 'ROUTINE'
                ? `Routines (${timelineItems.filter((i) => i.itemType === 'ROUTINE').length})`
                : cat === 'FOCUS'
                ? `Focus (${timelineItems.filter((i) => i.itemType === 'FOCUS').length})`
                : `Reminders (${timelineItems.filter((i) => i.itemType === 'REMINDER').length})`}
            </button>
          ))}
        </div>
      </div>

      {/* 5. Main Chronological Timeline Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Column (3 Spans): Chronological Vertical Time Rail */}
        <div className="lg:col-span-3 space-y-4">
          {isLoading ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-[#E5E2F5]">
              <div className="w-8 h-8 rounded-full border-2 border-[#8B45F5] border-t-transparent animate-spin mx-auto mb-3" />
              <p className="text-xs font-bold text-[#202033]">Loading daily chronological stream...</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-dashed border-[#E5E2F5] space-y-3">
              <CalendarCheck className="w-10 h-10 text-slate-300 mx-auto" />
              <h4 className="text-sm font-bold text-[#202033]">No Scheduled Activities on this Day</h4>
              <p className="text-xs text-[#74738A] max-w-sm mx-auto">
                Your schedule is clear for {format(parsedDate, 'MMMM d, yyyy')}. Add a task or use Smart Day Planner to schedule commitments.
              </p>
              <div className="flex justify-center gap-2 pt-2">
                <button
                  onClick={onOpenCreateTask}
                  className="px-4 py-2 rounded-xl bg-[#8B45F5] hover:bg-[#7839D6] text-white text-xs font-bold"
                >
                  Create Task
                </button>
                <button
                  onClick={() => onOpenSmartPlanner?.()}
                  className="px-4 py-2 rounded-xl bg-[#F4F3FF] hover:bg-[#EAE9FF] text-[#8B45F5] text-xs font-bold border border-[#DDD8F8]"
                >
                  Generate Day Plan
                </button>
              </div>
            </div>
          ) : (
            <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-3 sm:before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-[#E5E2F5]">
              {filteredItems.map((item, idx) => {
                const itemTime = parseISO(item.scheduledTime);
                const isItemDone = item.status === 'COMPLETED';
                const isItemInProgress = item.status === 'IN_PROGRESS';
                const isItemOverdue = item.status === 'OVERDUE';

                return (
                  <div
                    key={item.id || idx}
                    className="relative group transition-all"
                  >
                    {/* Rail Status Bullet Icon */}
                    <div
                      className={`absolute -left-6 sm:-left-8 top-4 w-6 h-6 rounded-full flex items-center justify-center border-2 bg-white transition-all ${
                        isItemDone
                          ? 'border-[#10B981] text-[#10B981]'
                          : isItemInProgress
                          ? 'border-[#3B82F6] text-[#3B82F6] animate-pulse'
                          : isItemOverdue
                          ? 'border-[#E05268] text-[#E05268]'
                          : 'border-[#8B45F5] text-[#8B45F5]'
                      }`}
                    >
                      {isItemDone ? (
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      ) : isItemInProgress ? (
                        <Play className="w-3 h-3 fill-current" />
                      ) : isItemOverdue ? (
                        <AlertTriangle className="w-3.5 h-3.5 stroke-[2.5]" />
                      ) : (
                        <Circle className="w-2.5 h-2.5 fill-current" />
                      )}
                    </div>

                    {/* Timeline Activity Card */}
                    <div
                      className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                        isItemDone
                          ? 'bg-[#FAF9FF]/60 border-[#E5E2F5] opacity-75'
                          : isItemInProgress
                          ? 'bg-gradient-to-r from-[#EFF6FF] to-white border-[#93C5FD] shadow-sm'
                          : isItemOverdue
                          ? 'bg-[#FFF5F7] border-[#FECDD6] shadow-xs'
                          : 'bg-white border-[#E5E2F5] hover:border-[#DDD8F8] shadow-xs'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                        {/* Time Label & Type Badge */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-black text-[#8B45F5] flex items-center gap-1 font-mono">
                            <Clock className="w-3.5 h-3.5" />
                            {format(itemTime, 'h:mm a')}
                          </span>

                          <span
                            className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                              item.itemType === 'TASK'
                                ? 'bg-[#EDE9FE] text-[#6935C8]'
                                : item.itemType === 'ROUTINE'
                                ? 'bg-[#FEF3C7] text-[#D97706]'
                                : item.itemType === 'FOCUS'
                                ? 'bg-[#E0E7FF] text-[#4338CA]'
                                : 'bg-[#FEE2E2] text-[#DC2626]'
                            }`}
                          >
                            {item.itemType}
                          </span>

                          {item.priority && (
                            <span
                              className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded ${
                                item.priority === 'URGENT' || item.priority === 'HIGH'
                                  ? 'bg-[#FEE2E2] text-[#DC2626]'
                                  : 'bg-slate-100 text-[#74738A]'
                              }`}
                            >
                              {item.priority}
                            </span>
                          )}

                          {item.project && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#F4F3FF] text-[#6935C8] border border-[#DDD8F8] flex items-center gap-1">
                              <FolderKanban className="w-3 h-3" />
                              {item.project.title}
                            </span>
                          )}
                        </div>

                        {/* Status Indicator Pill */}
                        <span
                          className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full w-fit ${
                            isItemDone
                              ? 'bg-[#D1FAE5] text-[#065F46]'
                              : isItemInProgress
                              ? 'bg-[#DBEAFE] text-[#1E40AF] font-black'
                              : isItemOverdue
                              ? 'bg-[#FEE2E2] text-[#991B1B] font-black'
                              : 'bg-slate-100 text-[#475569]'
                          }`}
                        >
                          {item.status}
                        </span>
                      </div>

                      {/* Title & Description */}
                      <h3
                        onClick={() => onSelectTask?.(item)}
                        className={`text-sm sm:text-base font-bold transition-colors cursor-pointer ${
                          isItemDone
                            ? 'line-through text-[#74738A]'
                            : 'text-[#202033] hover:text-[#8B45F5]'
                        }`}
                      >
                        {item.title}
                      </h3>

                      {item.description && (
                        <p className="text-xs text-[#74738A] mt-1 leading-relaxed">
                          {item.description}
                        </p>
                      )}

                      {/* Interactive Controls Footbar */}
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#F0F2FA] text-xs">
                        <div className="flex items-center gap-3 text-[11px] text-[#74738A]">
                          {item.durationMinutes && (
                            <span>{item.durationMinutes} mins estimated</span>
                          )}
                          {item.progressPercent !== undefined && (
                            <span>{item.progressPercent}% progress</span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {item.itemType === 'TASK' && item.canComplete && (
                            <button
                              onClick={() => completeTaskMutation.mutate(item.sourceId)}
                              className="px-3 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold transition-colors flex items-center gap-1"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Complete</span>
                            </button>
                          )}

                          {item.itemType === 'TASK' && item.canStart && (
                            <button
                              onClick={() => startFocusMutation.mutate(item.sourceId)}
                              className="px-3 py-1 rounded-lg bg-[#F4F3FF] hover:bg-[#EAE9FF] text-[#8B45F5] text-xs font-bold transition-colors flex items-center gap-1"
                            >
                              <Timer className="w-3.5 h-3.5" />
                              <span>Focus (25m)</span>
                            </button>
                          )}

                          {item.itemType === 'ROUTINE' && item.canComplete && (
                            <button
                              onClick={() => completeRoutineMutation.mutate(item.sourceId)}
                              className="px-3 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-bold transition-colors flex items-center gap-1"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Log Habit</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column (1 Span): Today's Unscheduled Work & Quick Reschedule */}
        <div className="space-y-4">
          <div className="bg-white rounded-3xl p-5 border border-[#E5E2F5] shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-[#F0F2FA] mb-3">
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-[#202033]">
                  Unscheduled Work ({unscheduledTasks.length})
                </h3>
                <p className="text-[11px] text-[#74738A]">Assigned to today without fixed time</p>
              </div>
            </div>

            {unscheduledTasks.length === 0 ? (
              <div className="py-6 text-center text-xs text-[#74738A] italic">
                All tasks for today have scheduled time slots!
              </div>
            ) : (
              <div className="space-y-2.5">
                {unscheduledTasks.map((t) => (
                  <div
                    key={t.id}
                    className="p-3 rounded-xl border border-[#E5E2F5] hover:border-[#DDD8F8] bg-[#F8F7FF] transition-all space-y-2"
                  >
                    <div className="flex items-start justify-between gap-1">
                      <span className="text-xs font-bold text-[#202033] line-clamp-2">
                        {t.title}
                      </span>
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-200 text-[#202033]">
                        {t.priority}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-[#74738A]">
                      <span>{t.estimatedDurationMinutes}m</span>
                      <button
                        onClick={() => {
                          const nowTime = new Date().toISOString();
                          api.rescheduleTask(t.id, nowTime).then(() => {
                            toast.success('Task Scheduled', 'Added to chronological timeline.');
                            queryClient.invalidateQueries({ queryKey: ['day-timeline'] });
                          });
                        }}
                        className="px-2 py-0.5 rounded-lg bg-[#8B45F5] hover:bg-[#7839D6] text-white font-bold transition-colors"
                      >
                        Schedule Now
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
