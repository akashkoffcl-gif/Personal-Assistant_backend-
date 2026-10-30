'use client';

import React, { useState } from 'react';
import {
  Check,
  Clock,
  AlertTriangle,
  Flame,
  Briefcase,
  Repeat,
  CalendarDays,
  MoreVertical,
  Plus,
  Pin,
  ListTodo,
  ArrowRight,
  Filter,
  CheckCircle2,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { TaskDto, TaskCategory, TaskStatus, Priority, SchedulingMode } from '@assistant/shared';
import { format } from 'date-fns';

interface TodayScheduleProps {
  tasks: TaskDto[];
  onComplete: (taskId: string) => void;
  onSnooze: (taskId: string) => void;
  onSelectTask?: (task: TaskDto) => void;
  onOpenCreateTask?: () => void;
  onOpenTaskCheckIn?: (task: TaskDto) => void;
  loading?: boolean;
}

export function TodaySchedule({
  tasks,
  onComplete,
  onSnooze,
  onSelectTask,
  onOpenCreateTask,
  onOpenTaskCheckIn,
  loading,
}: TodayScheduleProps) {
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'COMPLETED'>('ALL');

  const filteredTasks = tasks.filter((t) => {
    // Category filter
    let matchCat = true;
    if (categoryFilter !== 'ALL') {
      if (categoryFilter === 'ROUTINE') {
        matchCat = t.category === TaskCategory.PERSONAL_ROUTINE || (t.category as any) === 'ROUTINE';
      } else if (categoryFilter === 'PLANNING') {
        matchCat = t.category === TaskCategory.DAY_PLAN || (t.category as any) === 'PLANNING';
      } else {
        matchCat = t.category === categoryFilter;
      }
    }

    // Status filter
    let matchStatus = true;
    if (statusFilter === 'PENDING') {
      matchStatus = t.status !== TaskStatus.COMPLETED;
    } else if (statusFilter === 'COMPLETED') {
      matchStatus = t.status === TaskStatus.COMPLETED;
    }

    return matchCat && matchStatus;
  });

  const getPriorityBadge = (p: Priority) => {
    switch (p) {
      case Priority.URGENT:
        return (
          <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-700 border border-rose-300/60 shadow-xs">
            Urgent
          </span>
        );
      case Priority.HIGH:
        return (
          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 border border-amber-300/60 shadow-xs">
            High
          </span>
        );
      case Priority.MEDIUM:
        return (
          <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-700 border border-sky-300/60 shadow-xs">
            Medium
          </span>
        );
      default:
        return (
          <span className="text-[10px] font-medium uppercase px-2 py-0.5 rounded-full bg-slate-200/60 text-slate-600 border border-slate-300/60 shadow-xs">
            Low
          </span>
        );
    }
  };

  const getCategoryBadge = (cat: TaskCategory) => {
    switch (cat) {
      case TaskCategory.EMERGENCY:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-500/15 px-2 py-0.5 rounded-lg border border-rose-300/60">
            <Flame className="w-3 h-3 text-rose-600 animate-pulse" /> Emergency
          </span>
        );
      case TaskCategory.WORK:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-800 bg-slate-200/70 px-2 py-0.5 rounded-lg border border-slate-300/60">
            <Briefcase className="w-3 h-3 text-slate-700" /> Work
          </span>
        );
      case TaskCategory.ROUTINE:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-800 bg-sky-500/15 px-2 py-0.5 rounded-lg border border-sky-300/60">
            <Repeat className="w-3 h-3 text-sky-600" /> Habit
          </span>
        );
      case TaskCategory.PLANNING:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-500/15 px-2 py-0.5 rounded-lg border border-emerald-300/60">
            <CalendarDays className="w-3 h-3 text-emerald-600" /> Planning
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="glass-panel rounded-2xl p-5 sm:p-6 border border-white/80 shadow-glass">
      {/* Header and Interactive Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">
              Today&apos;s Schedule & Tasks
            </h3>
            <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-sky-500/10 text-sky-700 border border-sky-300/50">
              {filteredTasks.length} {filteredTasks.length === 1 ? 'item' : 'items'}
            </span>
          </div>
          <p className="text-xs text-assistant-coolGrey font-medium">
            Chronological timeline, subtasks & dynamic time blocks
          </p>
        </div>

        {/* Filters Group */}
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Status filter toggle */}
          <div className="flex items-center p-0.5 rounded-xl bg-slate-200/50 border border-white/70">
            {(['ALL', 'PENDING', 'COMPLETED'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-2 py-1 text-[11px] font-bold rounded-lg transition-all ${statusFilter === s
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                  }`}
              >
                {s === 'ALL' ? 'All' : s === 'PENDING' ? 'Active' : 'Done'}
              </button>
            ))}
          </div>

          {/* Category filter pills */}
          <div className="flex items-center gap-1 overflow-x-auto">
            {['ALL', 'WORK', 'ROUTINE', 'PLANNING', 'EMERGENCY'].map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-xl transition-all whitespace-nowrap border ${categoryFilter === cat
                    ? 'bg-assistant-navy text-white border-transparent shadow-xs scale-102'
                    : 'glass-card text-slate-600 hover:text-slate-900 border-white/80'
                  }`}
              >
                {cat === 'ALL' ? 'All' : cat.charAt(0) + cat.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Task List */}
      {loading ? (
        <div className="py-14 text-center text-sm text-slate-400 flex flex-col items-center gap-2">
          <div className="w-6 h-6 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
          <span>Synchronizing schedule timeline...</span>
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="py-12 text-center glass-card rounded-2xl border border-dashed border-slate-300/80 p-6">
          <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <h4 className="text-sm font-bold text-slate-700">No scheduled tasks match your filter</h4>
          <p className="text-xs text-slate-500 mt-1 mb-4">
            Create an appointment, habit, or task to organize your day.
          </p>
          {onOpenCreateTask && (
            <button
              onClick={onOpenCreateTask}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-900 glass-button-primary border border-sky-300 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Create Task</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTasks.map((t) => {
            const isCompleted = t.status === TaskStatus.COMPLETED;
            const isOverdue =
              !isCompleted &&
              t.scheduledEndTime &&
              new Date(t.scheduledEndTime).getTime() < Date.now();
            const isFixed = t.schedulingMode === SchedulingMode.FIXED || (t.schedulingMode as string) === 'FIXED_APPOINTMENT';
            const subtaskCount = t.subtasks?.length || 0;
            const completedSubtasks = t.subtasks?.filter((s) => s.status === TaskStatus.COMPLETED).length || 0;

            return (
              <div
                key={t.id}
                className={`p-4 rounded-2xl border transition-all duration-200 select-none group relative overflow-hidden ${isCompleted
                    ? 'bg-emerald-50/40 border-emerald-200/60 opacity-80'
                    : isOverdue
                      ? 'bg-rose-50/50 border-rose-300/70 shadow-xs hover:border-rose-400'
                      : 'glass-card border-white/90 hover:border-sky-300 shadow-glass hover:shadow-glass-hover'
                  }`}
              >
                <div className="flex items-start justify-between gap-3">
                  {/* Left: Interactive Complete Checkbox */}
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onComplete(t.id);
                      }}
                      className={`w-6 h-6 rounded-xl flex items-center justify-center border transition-all mt-0.5 shrink-0 ${isCompleted
                          ? 'bg-emerald-500 border-emerald-500 text-white shadow-glass-glow-emerald scale-105'
                          : 'border-slate-300 bg-white/80 hover:border-emerald-500 hover:bg-emerald-50 text-transparent hover:scale-110 shadow-xs'
                        }`}
                      title={isCompleted ? 'Mark as active' : 'Complete task'}
                    >
                      <Check className="w-4 h-4 stroke-[3]" />
                    </button>

                    {/* Task Content: Clickable to open drawer */}
                    <div
                      className="min-w-0 flex-1 cursor-pointer"
                      onClick={() => onSelectTask?.(t)}
                    >
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span
                          className={`text-sm font-bold tracking-tight truncate transition-colors ${isCompleted
                              ? 'line-through text-slate-400'
                              : 'text-slate-900 group-hover:text-assistant-navy'
                            }`}
                        >
                          {t.title}
                        </span>

                        {isFixed && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-500/15 px-2 py-0.5 rounded-full border border-amber-300/60">
                            <Pin className="w-2.5 h-2.5" /> Fixed
                          </span>
                        )}

                        {getCategoryBadge(t.category)}
                        {getPriorityBadge(t.priority)}

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

                      {t.description && (
                        <p className="text-xs text-slate-500 line-clamp-1 mb-2">
                          {t.description}
                        </p>
                      )}

                      {/* Time and Duration info */}
                      <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
                        {t.scheduledStartTime ? (
                          <span className="flex items-center gap-1 text-slate-700 font-semibold">
                            <Clock className="w-3.5 h-3.5 text-sky-500" />
                            {format(new Date(t.scheduledStartTime), 'h:mm a')}
                            {t.scheduledEndTime && ` - ${format(new Date(t.scheduledEndTime), 'h:mm a')}`}
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-slate-500">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            Flexible schedule
                          </span>
                        )}

                        {t.estimatedDurationMinutes && (
                          <span className="text-slate-400 font-semibold">
                            • {t.estimatedDurationMinutes}m
                          </span>
                        )}

                        {/* Subtasks summary */}
                        {subtaskCount > 0 && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-700 bg-indigo-500/10 px-2 py-0.5 rounded-md border border-indigo-200">
                            <ListTodo className="w-3 h-3 text-indigo-500" />
                            {completedSubtasks}/{subtaskCount} subtasks
                          </span>
                        )}

                        {isOverdue && (
                          <span className="text-[11px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                            Overdue
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Quick Action Buttons */}
                  <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
                    {!isCompleted && onOpenTaskCheckIn && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenTaskCheckIn(t);
                        }}
                        className="px-2.5 py-1 text-xs font-bold rounded-xl glass-card text-sky-700 hover:border-sky-300 transition-all flex items-center gap-1 shadow-xs hover:scale-102"
                        title="Check in on task completion & follow-ups"
                      >
                        <Sparkles className="w-3 h-3 text-sky-500" />
                        <span>Check-In</span>
                      </button>
                    )}

                    {!isCompleted && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSnooze(t.id);
                        }}
                        className="px-2.5 py-1 text-xs font-semibold rounded-xl glass-card text-slate-600 hover:text-sky-700 hover:border-sky-300 transition-all flex items-center gap-1 shadow-xs"
                        title="Snooze task by 15 minutes"
                      >
                        <Clock className="w-3 h-3 text-sky-500" />
                        <span className="hidden sm:inline">+15m</span>
                      </button>
                    )}

                    <button
                      onClick={() => onSelectTask?.(t)}
                      className="p-1.5 rounded-xl glass-card text-slate-500 hover:text-slate-900 hover:border-slate-300 transition-all shadow-xs"
                      title="Open details, subtasks & history"
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
