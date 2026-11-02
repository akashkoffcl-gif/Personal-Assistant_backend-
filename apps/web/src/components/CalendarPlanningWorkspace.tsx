'use client';

import React, { useState, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  CalendarDays,
  Clock,
  AlertTriangle,
  Plus,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  ListTodo,
  Layers,
  ArrowRight,
  ShieldAlert,
  Sparkles,
  RotateCcw,
  Sliders,
} from 'lucide-react';
import {
  format,
  addDays,
  subDays,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
  startOfMonth,
  endOfMonth,
  getDay,
} from 'date-fns';
import { TaskDto, TaskStatus } from '@assistant/shared';

export interface CalendarPlanningWorkspaceProps {
  tasks: TaskDto[];
  allTasks: TaskDto[];
  dayPlan: any;
  scheduleChanges: any[];
  selectedDate: string;
  onSelectDate: (date: string) => void;
  onSelectTask: (task: TaskDto) => void;
  onOpenCreateTask: () => void;
  onOpenEmergency: () => void;
  initialSubView?: 'calendar' | 'planning' | 'management' | 'replanning';
}

export function CalendarPlanningWorkspace({
  tasks,
  allTasks,
  dayPlan,
  scheduleChanges,
  selectedDate,
  onSelectDate,
  onSelectTask,
  onOpenCreateTask,
  onOpenEmergency,
  initialSubView = 'calendar',
}: CalendarPlanningWorkspaceProps) {
  const [subView, setSubView] = useState<'calendar' | 'planning' | 'management' | 'replanning'>(initialSubView);
  const [calendarViewMode, setCalendarViewMode] = useState<'day' | 'week' | 'month' | 'agenda'>('day');

  // Synchronize subView when initialSubView changes (e.g. navigation from navbar or quick action)
  React.useEffect(() => {
    if (initialSubView) {
      setSubView(initialSubView);
    }
  }, [initialSubView]);

  const currentDateObj = useMemo(() => new Date(selectedDate), [selectedDate]);

  // Steppers
  const handlePrevDay = () => {
    const prev = subDays(currentDateObj, 1);
    onSelectDate(prev.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const next = addDays(currentDateObj, 1);
    onSelectDate(next.toISOString().split('T')[0]);
  };

  const handleToday = () => {
    onSelectDate(new Date().toISOString().split('T')[0]);
  };

  // Week calculation
  const weekDays = useMemo(() => {
    const start = startOfWeek(currentDateObj, { weekStartsOn: 1 });
    const end = endOfWeek(currentDateObj, { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [currentDateObj]);

  // Month calculation
  const monthDays = useMemo(() => {
    const start = startOfMonth(currentDateObj);
    const end = endOfMonth(currentDateObj);
    return eachDayOfInterval({ start, end });
  }, [currentDateObj]);

  // Conflict detection
  const detectedConflicts = useMemo(() => {
    const conflicts: { taskA: TaskDto; taskB: TaskDto; reason: string }[] = [];
    const scheduled = tasks.filter((t) => t.scheduledStartTime && t.scheduledEndTime);

    for (let i = 0; i < scheduled.length; i++) {
      for (let j = i + 1; j < scheduled.length; j++) {
        const aStart = new Date(scheduled[i].scheduledStartTime!).getTime();
        const aEnd = new Date(scheduled[i].scheduledEndTime!).getTime();
        const bStart = new Date(scheduled[j].scheduledStartTime!).getTime();
        const bEnd = new Date(scheduled[j].scheduledEndTime!).getTime();

        if (aStart < bEnd && bStart < aEnd) {
          conflicts.push({
            taskA: scheduled[i],
            taskB: scheduled[j],
            reason: `Overlap detected between '${scheduled[i].title}' and '${scheduled[j].title}'`,
          });
        }
      }
    }
    return conflicts;
  }, [tasks]);

  // Fixed vs Flexible breakdown
  const fixedAppointments = useMemo(() => {
    return tasks.filter((t) => t.scheduledStartTime && (t.description?.toLowerCase().includes('meeting') || t.title.toLowerCase().includes('meeting')));
  }, [tasks]);

  const flexibleTasks = useMemo(() => {
    return tasks.filter((t) => !t.scheduledStartTime || (!t.description?.toLowerCase().includes('meeting') && !t.title.toLowerCase().includes('meeting')));
  }, [tasks]);

  // Available time calculation (assume 8:00 AM - 10:00 PM = 14 hours = 840 mins)
  const availableTimeMinutes = useMemo(() => {
    const totalDayMinutes = 14 * 60;
    const committedMinutes = tasks.reduce((acc, t) => acc + (t.estimatedDurationMinutes || 30), 0);
    return Math.max(0, totalDayMinutes - committedMinutes);
  }, [tasks]);

  return (
    <div className="space-y-4">
      {/* =========================================================================
          WORKSPACE HEADER WITH SYNCHRONIZED DATE COORDINATION & SUBTABS
         ========================================================================= */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#E5E2F5] shadow-[0_4px_20px_rgba(139,69,245,0.035)]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#F0F2FA]">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#8B45F5] bg-[#F4F3FF] px-2.5 py-0.5 rounded-full border border-[#E5E2F5]">
                Unified Scheduling Workspace
              </span>
              {detectedConflicts.length > 0 && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#E05268] bg-[#FFEAEF] px-2 py-0.5 rounded-full border border-[#FECDD6]">
                  <AlertTriangle className="w-3 h-3" />
                  {detectedConflicts.length} Conflict{detectedConflicts.length > 1 ? 's' : ''} Detected
                </span>
              )}
            </div>
            <h2 className="text-lg sm:text-xl font-extrabold text-[#202033] tracking-tight">
              Calendar & Schedule Planning
            </h2>
            <p className="text-xs text-[#74738A] font-medium mt-0.5">
              Coordinated calendar views, daily focus blocks, schedule management, and emergency replanning.
            </p>
          </div>

          {/* Unified Date Stepper & Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center bg-[#F4F3FF] p-1 rounded-xl border border-[#E5E2F5]">
              <button
                onClick={handlePrevDay}
                className="w-7 h-7 rounded-lg bg-white hover:bg-[#EDE9FE] text-[#202033] flex items-center justify-center transition-colors shadow-2xs"
                title="Previous Day"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleToday}
                className="px-2.5 py-1 text-xs font-bold text-[#8B45F5] hover:text-[#6935C8] transition-colors"
              >
                Today
              </button>
              <button
                onClick={handleNextDay}
                className="w-7 h-7 rounded-lg bg-white hover:bg-[#EDE9FE] text-[#202033] flex items-center justify-center transition-colors shadow-2xs"
                title="Next Day"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <input
              type="date"
              value={selectedDate}
              onChange={(e) => onSelectDate(e.target.value)}
              className="px-2.5 py-1.5 text-xs font-bold border border-[#E5E2F5] rounded-xl bg-white text-[#202033] shadow-2xs focus:outline-none focus:border-[#8B45F5]"
            />

            <button
              onClick={onOpenCreateTask}
              className="px-3 py-1.5 bg-[#8B45F5] hover:bg-[#7839D6] text-white text-xs font-bold rounded-xl shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Activity</span>
            </button>
          </div>
        </div>

        {/* 4 Primary Unified Sub-Views */}
        <div className="flex items-center gap-1.5 pt-3 overflow-x-auto custom-card-scrollbar">
          {[
            { id: 'calendar', label: 'Calendar Views', icon: CalendarIcon },
            { id: 'planning', label: 'Daily Planning', icon: Layers },
            { id: 'management', label: 'Schedule Management', icon: Sliders },
            { id: 'replanning', label: 'Emergency Replanning', icon: AlertTriangle, badge: detectedConflicts.length > 0 ? `${detectedConflicts.length}` : undefined },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = subView === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setSubView(tab.id as any)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-[#8B45F5] text-white shadow-2xs'
                    : 'text-[#74738A] bg-[#F4F3FF] hover:text-[#202033] hover:bg-[#EDE9FE]'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-[#8B45F5]'}`} />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-[#E05268] text-white">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* =========================================================================
          VIEW A: CALENDAR (DAY, WEEK, MONTH, AGENDA)
         ========================================================================= */}
      {subView === 'calendar' && (
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#E5E2F5] shadow-[0_4px_20px_rgba(139,69,245,0.035)]">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#F0F2FA]">
            <h3 className="text-sm font-bold text-[#202033]">
              {format(currentDateObj, 'MMMM yyyy')}
            </h3>

            {/* View Mode Selector */}
            <div className="flex p-0.5 rounded-xl bg-[#F4F3FF] border border-[#E5E2F5]">
              {(['day', 'week', 'month', 'agenda'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setCalendarViewMode(mode)}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-all capitalize ${
                    calendarViewMode === mode
                      ? 'bg-white text-[#8B45F5] shadow-2xs'
                      : 'text-[#74738A] hover:text-[#202033]'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          {/* Day View */}
          {calendarViewMode === 'day' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-[#74738A] font-semibold mb-2">
                <span>Timeline Schedule for {format(currentDateObj, 'EEEE, d MMMM')}</span>
                <span>{tasks.length} total activities</span>
              </div>
              <div className="space-y-1.5">
                {tasks.length === 0 ? (
                  <div className="py-12 text-center text-xs text-[#74738A] border border-dashed border-[#E5E2F5] rounded-xl bg-[#FDFBFF]">
                    No activities scheduled for this day. Click &ldquo;Add Activity&rdquo; to schedule one.
                  </div>
                ) : (
                  tasks.map((t) => (
                    <div
                      key={t.id}
                      onClick={() => onSelectTask(t)}
                      className="p-3 rounded-xl border border-[#E5E2F5] bg-white hover:border-[#DDD8F8] hover:bg-[#FAF9FF] transition-all cursor-pointer flex items-center justify-between group shadow-2xs"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-16 text-xs font-bold text-[#8B45F5] shrink-0">
                          {t.scheduledStartTime ? format(new Date(t.scheduledStartTime), 'h:mm a') : 'Flexible'}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-[#202033] group-hover:text-[#8B45F5] transition-colors truncate">
                            {t.title}
                          </p>
                          <p className="text-[10px] text-[#74738A] truncate">
                            {t.estimatedDurationMinutes || 30} mins &bull; {t.category || 'General'}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                          t.status === TaskStatus.COMPLETED
                            ? 'bg-[#ECFDF5] text-[#16A36A]'
                            : 'bg-[#F4F3FF] text-[#8B45F5]'
                        }`}
                      >
                        {t.status}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Week View */}
          {calendarViewMode === 'week' && (
            <div className="grid grid-cols-1 sm:grid-cols-7 gap-2">
              {weekDays.map((day, idx) => {
                const dayStr = day.toISOString().split('T')[0];
                const isSelected = isSameDay(day, currentDateObj);
                const dayTasks = allTasks.filter(
                  (t) => t.scheduledStartTime && t.scheduledStartTime.startsWith(dayStr)
                );

                return (
                  <div
                    key={idx}
                    onClick={() => onSelectDate(dayStr)}
                    className={`p-2.5 rounded-xl border transition-all cursor-pointer min-h-[140px] flex flex-col justify-between ${
                      isSelected
                        ? 'bg-[#FAF9FF] border-[#8B45F5] shadow-xs'
                        : 'bg-white border-[#E5E2F5] hover:border-[#DDD8F8]'
                    }`}
                  >
                    <div>
                      <span className="text-[10px] font-bold text-[#74738A] block uppercase">
                        {format(day, 'EEE')}
                      </span>
                      <span
                        className={`text-sm font-extrabold block ${
                          isSelected ? 'text-[#8B45F5]' : 'text-[#202033]'
                        }`}
                      >
                        {format(day, 'd')}
                      </span>
                    </div>

                    <div className="mt-2 space-y-1">
                      {dayTasks.slice(0, 3).map((dt) => (
                        <div
                          key={dt.id}
                          className="text-[9px] font-semibold truncate p-1 rounded-md bg-[#F4F3FF] text-[#6935C8] border border-[#E5E2F5]"
                        >
                          {dt.title}
                        </div>
                      ))}
                      {dayTasks.length > 3 && (
                        <span className="text-[8px] font-bold text-[#8B45F5] block">
                          +{dayTasks.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Month View */}
          {calendarViewMode === 'month' && (
            <div>
              <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-[#74738A] mb-2 uppercase">
                <span>Mon</span>
                <span>Tue</span>
                <span>Wed</span>
                <span>Thu</span>
                <span>Fri</span>
                <span>Sat</span>
                <span>Sun</span>
              </div>
              <div className="grid grid-cols-7 gap-1.5">
                {monthDays.map((day, idx) => {
                  const dayStr = day.toISOString().split('T')[0];
                  const isSelected = isSameDay(day, currentDateObj);
                  const count = allTasks.filter(
                    (t) => t.scheduledStartTime && t.scheduledStartTime.startsWith(dayStr)
                  ).length;

                  return (
                    <div
                      key={idx}
                      onClick={() => onSelectDate(dayStr)}
                      className={`p-2 rounded-xl border text-left cursor-pointer transition-all min-h-[70px] flex flex-col justify-between ${
                        isSelected
                          ? 'bg-[#FAF9FF] border-[#8B45F5] shadow-xs'
                          : 'bg-white border-[#E5E2F5] hover:border-[#DDD8F8]'
                      }`}
                    >
                      <span className={`text-xs font-bold ${isSelected ? 'text-[#8B45F5]' : 'text-[#202033]'}`}>
                        {format(day, 'd')}
                      </span>
                      {count > 0 && (
                        <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded-full bg-[#F4F3FF] text-[#8B45F5] border border-[#E5E2F5] self-start">
                          {count} task{count > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Agenda View */}
          {calendarViewMode === 'agenda' && (
            <div className="space-y-2">
              {tasks.length === 0 ? (
                <div className="py-8 text-center text-xs text-[#74738A]">No agenda items for {selectedDate}.</div>
              ) : (
                tasks.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => onSelectTask(t)}
                    className="p-3 rounded-xl border border-[#E5E2F5] bg-white hover:border-[#DDD8F8] flex items-center justify-between cursor-pointer transition-all"
                  >
                    <div>
                      <h4 className="text-xs font-bold text-[#202033]">{t.title}</h4>
                      <p className="text-[11px] text-[#74738A]">
                        {t.scheduledStartTime ? format(new Date(t.scheduledStartTime), 'h:mm a') : 'Flexible slot'} &bull; Duration: {t.estimatedDurationMinutes || 30} mins
                      </p>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#F4F3FF] text-[#8B45F5]">
                      {t.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          VIEW B: DAILY PLANNING (FOCUS BLOCKS & PRIORITIES)
         ========================================================================= */}
      {subView === 'planning' && (
        <div className="space-y-4">
          {/* Available Time Summary Bar */}
          <div className="bg-[#FAF9FF] rounded-2xl p-4 border border-[#DDD8F8] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-xs font-bold text-[#8B45F5]">Time Budget Overview ({format(currentDateObj, 'EEE, d MMM')})</span>
              <p className="text-[11px] text-[#74738A] mt-0.5">
                Committed work: {Math.round((840 - availableTimeMinutes) / 60)}h {(840 - availableTimeMinutes) % 60}m &bull; Free bandwidth: {Math.round(availableTimeMinutes / 60)}h {availableTimeMinutes % 60}m
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-[#202033]">
                {Math.round(((840 - availableTimeMinutes) / 840) * 100)}% Scheduled
              </span>
              <div className="w-24 h-2 bg-[#E5E2F5] rounded-full overflow-hidden">
                <div
                  style={{ width: `${Math.round(((840 - availableTimeMinutes) / 840) * 100)}%` }}
                  className="h-full bg-[#8B45F5] rounded-full"
                />
              </div>
            </div>
          </div>

          {/* Three Focus Blocks */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {/* Morning Focus */}
            <div className="p-4 rounded-2xl bg-white border border-[#E5E2F5] shadow-2xs">
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#F0F2FA]">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm">🌅</span>
                  <h4 className="text-xs font-bold text-[#202033] uppercase tracking-wider">Morning Focus</h4>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold border border-blue-200">
                  {dayPlan?.morningPriorities?.length || 0}
                </span>
              </div>
              <div className="space-y-2">
                {dayPlan?.morningPriorities && dayPlan.morningPriorities.length > 0 ? (
                  dayPlan.morningPriorities.map((t: any) => (
                    <div
                      key={t.id}
                      onClick={() => onSelectTask(t)}
                      className="p-2.5 rounded-xl border border-[#E5E2F5] bg-[#FDFBFF] hover:border-[#8B45F5] text-xs cursor-pointer transition-all shadow-2xs"
                    >
                      <span className="font-bold text-[#202033] block truncate">{t.title}</span>
                      <p className="text-[10px] text-[#74738A] mt-0.5">
                        {t.scheduledStartTime ? format(new Date(t.scheduledStartTime), 'h:mm a') : 'Flexible priority'}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-[#74738A] py-6 text-center">No morning focus items set.</p>
                )}
              </div>
            </div>

            {/* Afternoon Focus */}
            <div className="p-4 rounded-2xl bg-white border border-[#E5E2F5] shadow-2xs">
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#F0F2FA]">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm">☀️</span>
                  <h4 className="text-xs font-bold text-[#202033] uppercase tracking-wider">Afternoon Focus</h4>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-bold border border-amber-200">
                  {dayPlan?.afternoonPriorities?.length || 0}
                </span>
              </div>
              <div className="space-y-2">
                {dayPlan?.afternoonPriorities && dayPlan.afternoonPriorities.length > 0 ? (
                  dayPlan.afternoonPriorities.map((t: any) => (
                    <div
                      key={t.id}
                      onClick={() => onSelectTask(t)}
                      className="p-2.5 rounded-xl border border-[#E5E2F5] bg-[#FDFBFF] hover:border-[#8B45F5] text-xs cursor-pointer transition-all shadow-2xs"
                    >
                      <span className="font-bold text-[#202033] block truncate">{t.title}</span>
                      <p className="text-[10px] text-[#74738A] mt-0.5">
                        {t.scheduledStartTime ? format(new Date(t.scheduledStartTime), 'h:mm a') : 'Flexible priority'}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-[#74738A] py-6 text-center">No afternoon focus items set.</p>
                )}
              </div>
            </div>

            {/* Evening Focus */}
            <div className="p-4 rounded-2xl bg-white border border-[#E5E2F5] shadow-2xs">
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#F0F2FA]">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm">🌙</span>
                  <h4 className="text-xs font-bold text-[#202033] uppercase tracking-wider">Evening Focus</h4>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 font-bold border border-purple-200">
                  {dayPlan?.eveningPriorities?.length || 0}
                </span>
              </div>
              <div className="space-y-2">
                {dayPlan?.eveningPriorities && dayPlan.eveningPriorities.length > 0 ? (
                  dayPlan.eveningPriorities.map((t: any) => (
                    <div
                      key={t.id}
                      onClick={() => onSelectTask(t)}
                      className="p-2.5 rounded-xl border border-[#E5E2F5] bg-[#FDFBFF] hover:border-[#8B45F5] text-xs cursor-pointer transition-all shadow-2xs"
                    >
                      <span className="font-bold text-[#202033] block truncate">{t.title}</span>
                      <p className="text-[10px] text-[#74738A] mt-0.5">
                        {t.scheduledStartTime ? format(new Date(t.scheduledStartTime), 'h:mm a') : 'Flexible priority'}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-[#74738A] py-6 text-center">No evening focus items set.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          VIEW C: SCHEDULE MANAGEMENT (FIXED APPOINTMENTS VS FLEXIBLE TASKS)
         ========================================================================= */}
      {subView === 'management' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Fixed Appointments */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#E5E2F5] shadow-2xs">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#F0F2FA]">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-[#EFF6FF] text-[#3B82F6] flex items-center justify-center">
                  <Clock className="w-3.5 h-3.5" />
                </div>
                <h4 className="text-xs font-bold text-[#202033] uppercase tracking-wider">
                  Fixed Appointments ({fixedAppointments.length})
                </h4>
              </div>
              <span className="text-[10px] text-[#74738A] font-semibold">Strict time slots</span>
            </div>
            <div className="space-y-2">
              {fixedAppointments.length === 0 ? (
                <p className="text-xs text-[#74738A] py-8 text-center">No fixed appointments found today.</p>
              ) : (
                fixedAppointments.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => onSelectTask(t)}
                    className="p-3 rounded-xl border border-[#E5E2F5] bg-[#FDFBFF] hover:border-[#3B82F6] cursor-pointer transition-all flex items-center justify-between"
                  >
                    <div>
                      <p className="text-xs font-bold text-[#202033]">{t.title}</p>
                      <span className="text-[10px] text-[#3B82F6] font-semibold">
                        {t.scheduledStartTime ? format(new Date(t.scheduledStartTime), 'h:mm a') : 'Set time'}
                      </span>
                    </div>
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#EFF6FF] text-[#3B82F6] border border-[#BFDBFE]">
                      Fixed Slot
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Flexible Tasks */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#E5E2F5] shadow-2xs">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#F0F2FA]">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-[#F4F3FF] text-[#8B45F5] flex items-center justify-center">
                  <ListTodo className="w-3.5 h-3.5" />
                </div>
                <h4 className="text-xs font-bold text-[#202033] uppercase tracking-wider">
                  Flexible Tasks ({flexibleTasks.length})
                </h4>
              </div>
              <span className="text-[10px] text-[#74738A] font-semibold">Auto-adjustable</span>
            </div>
            <div className="space-y-2">
              {flexibleTasks.length === 0 ? (
                <p className="text-xs text-[#74738A] py-8 text-center">No flexible tasks for this date.</p>
              ) : (
                flexibleTasks.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => onSelectTask(t)}
                    className="p-3 rounded-xl border border-[#E5E2F5] bg-[#FDFBFF] hover:border-[#8B45F5] cursor-pointer transition-all flex items-center justify-between"
                  >
                    <div>
                      <p className="text-xs font-bold text-[#202033]">{t.title}</p>
                      <span className="text-[10px] text-[#74738A]">
                        Duration: {t.estimatedDurationMinutes || 30} mins
                      </span>
                    </div>
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#F4F3FF] text-[#8B45F5] border border-[#DDD8F8]">
                      Flexible
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          VIEW D: EMERGENCY REPLANNING & CONFLICT AUDIT
         ========================================================================= */}
      {subView === 'replanning' && (
        <div className="space-y-4">
          {/* Conflict Alert Banner */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#E5E2F5] shadow-2xs">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#F0F2FA]">
              <div>
                <h4 className="text-sm font-bold text-[#202033]">
                  Schedule Conflict Engine & Replanning
                </h4>
                <p className="text-xs text-[#74738A] mt-0.5">
                  Detect overlapping time commitments and auto-reschedule flexible items around fixed appointments.
                </p>
              </div>
              <button
                onClick={onOpenEmergency}
                className="px-3.5 py-1.5 bg-[#FFEAEF] hover:bg-[#FDD8E0] text-[#E05268] border border-[#FECDD6] font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-[#E05268]" />
                <span>Trigger Emergency Replan</span>
              </button>
            </div>

            {/* Conflict List */}
            {detectedConflicts.length > 0 ? (
              <div className="space-y-2 mb-4">
                {detectedConflicts.map((c, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-xl bg-[#FFFBFB] border border-[#FECDD6] text-xs flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-[#E05268] shrink-0" />
                      <div>
                        <span className="font-bold text-[#202033]">{c.reason}</span>
                        <p className="text-[10px] text-[#74738A]">
                          Requires repositioning of flexible task.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={onOpenEmergency}
                      className="px-2.5 py-1 bg-[#E05268] text-white rounded-lg font-bold text-[10px] hover:bg-red-700 transition-colors"
                    >
                      Resolve Conflict
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-[#ECFDF5] border border-[#A7F3D0] text-xs text-[#16A36A] font-bold flex items-center gap-2 mb-4">
                <CheckCircle2 className="w-4 h-4 text-[#16A36A]" />
                <span>Zero schedule conflicts identified. All task slots are cleanly sequenced.</span>
              </div>
            )}
          </div>

          {/* Audit History of Schedule Changes */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#E5E2F5] shadow-2xs">
            <h4 className="text-xs font-bold text-[#202033] uppercase tracking-wider mb-3">
              Replanning Audit History ({scheduleChanges.length} events)
            </h4>
            <div className="space-y-2">
              {scheduleChanges.length === 0 ? (
                <p className="text-xs text-[#74738A] py-6 text-center border border-dashed border-[#E5E2F5] rounded-xl bg-[#FAF9FF]">
                  No past rescheduling events recorded.
                </p>
              ) : (
                scheduleChanges.map((change: any) => (
                  <div
                    key={change.id}
                    className="p-3 rounded-xl border border-[#E5E2F5] bg-white text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs"
                  >
                    <div>
                      <span className="font-bold text-[#202033]">{change.taskTitle || 'Task Modified'}</span>
                      <span className="ml-2 text-[10px] font-bold bg-red-50 text-red-700 px-2 py-0.5 rounded-full border border-red-200">
                        {change.reason}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[#74738A] font-semibold text-[11px]">
                      <span>
                        {change.originalStartTime ? format(new Date(change.originalStartTime), 'h:mm a') : 'Flexible'}
                      </span>
                      <span>&rarr;</span>
                      <span className="font-bold text-[#8B45F5]">
                        {change.revisedStartTime ? format(new Date(change.revisedStartTime), 'h:mm a') : 'New Slot'}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
