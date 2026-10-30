'use client';

import React, { useState } from 'react';
import {
  Check,
  Clock,
  Briefcase,
  Repeat,
  CalendarDays,
  Plus,
  Pin,
  ListTodo,
  ArrowRight,
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
          <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-red-50 text-red-700 border border-red-200">
            Urgent
          </span>
        );
      case Priority.HIGH:
        return (
          <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
            High
          </span>
        );
      case Priority.MEDIUM:
        return (
          <span className="text-[10px] font-medium uppercase px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
            Medium
          </span>
        );
      default:
        return (
          <span className="text-[10px] font-medium uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
            Low
          </span>
        );
    }
  };

  const getCategoryBadge = (cat: TaskCategory) => {
    switch (cat) {
      case TaskCategory.EMERGENCY:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200">
            Emergency
          </span>
        );
      case TaskCategory.WORK:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
            <Briefcase className="w-3 h-3 text-slate-500" /> Work
          </span>
        );
      case TaskCategory.ROUTINE:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
            <Repeat className="w-3 h-3 text-blue-500" /> Routine
          </span>
        );
      case TaskCategory.PLANNING:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
            <CalendarDays className="w-3 h-3 text-emerald-500" /> Plan
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs">
      {/* Header and Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-900 tracking-tight">
              Today&apos;s Schedule & Tasks
            </h3>
            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-slate-100 text-slate-600">
              {filteredTasks.length} {filteredTasks.length === 1 ? 'item' : 'items'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Chronological timeline, subtasks and scheduled time blocks
          </p>
        </div>

        {/* Filters Group */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status filter toggle */}
          <div className="flex items-center p-0.5 rounded-lg bg-slate-100 border border-slate-200">
            {(['ALL', 'PENDING', 'COMPLETED'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                  statusFilter === s
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
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
                className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors whitespace-nowrap border ${
                  categoryFilter === cat
                    ? 'bg-slate-900 text-white border-slate-900 font-semibold'
                    : 'bg-white text-slate-600 hover:bg-slate-50 border-slate-200'
                }`}
              >
                {cat === 'ALL' ? 'All Categories' : cat.charAt(0) + cat.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Task List */}
      {loading ? (
        <div className="py-12 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
          <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span>Loading scheduled activities...</span>
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="py-8 text-center rounded-lg border border-dashed border-slate-200 p-5 bg-slate-50/50">
          <Calendar className="w-8 h-8 text-slate-400 mx-auto mb-1.5" />
          <h4 className="text-xs font-semibold text-slate-700">No scheduled tasks match your filter</h4>
          <p className="text-xs text-slate-500 mt-0.5 mb-3">
            Add a task, appointment, or routine to organize today.
          </p>
          {onOpenCreateTask && (
            <button
              onClick={onOpenCreateTask}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors shadow-xs"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Create Task</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredTasks.map((t) => {
            const isCompleted = t.status === TaskStatus.COMPLETED;
            const isOverdue =
              !isCompleted &&
              t.scheduledEndTime &&
              new Date(t.scheduledEndTime).getTime() < Date.now();
            const isFixed =
              t.schedulingMode === SchedulingMode.FIXED ||
              (t.schedulingMode as string) === 'FIXED_APPOINTMENT';
            const subtaskCount = t.subtasks?.length || 0;
            const completedSubtasks =
              t.subtasks?.filter((s) => s.status === TaskStatus.COMPLETED).length || 0;

            return (
              <div
                key={t.id}
                className={`p-3 rounded-lg border transition-colors select-none ${
                  isCompleted
                    ? 'bg-slate-50/80 border-slate-200 opacity-75'
                    : isOverdue
                    ? 'bg-red-50/20 border-red-200 hover:border-red-300'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  {/* Left: Complete Checkbox */}
                  <div className="flex items-start gap-2.5 min-w-0 flex-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onComplete(t.id);
                      }}
                      className={`w-5 h-5 rounded flex items-center justify-center border transition-colors mt-0.5 shrink-0 ${
                        isCompleted
                          ? 'bg-emerald-600 border-emerald-600 text-white'
                          : 'border-slate-300 bg-white hover:border-blue-600 hover:bg-blue-50 text-transparent'
                      }`}
                      title={isCompleted ? 'Mark as active' : 'Complete task'}
                    >
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </button>

                    {/* Task Content */}
                    <div
                      className="min-w-0 flex-1 cursor-pointer"
                      onClick={() => onSelectTask?.(t)}
                    >
                      <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                        <span
                          className={`text-xs font-semibold tracking-tight truncate ${
                            isCompleted ? 'line-through text-slate-400' : 'text-slate-900'
                          }`}
                        >
                          {t.title}
                        </span>

                        {isFixed && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-700 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">
                            <Pin className="w-2.5 h-2.5" /> Fixed
                          </span>
                        )}

                        {getCategoryBadge(t.category)}
                        {getPriorityBadge(t.priority)}

                        {t.project && (
                          <span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 border border-slate-200">
                            {t.project.title}
                          </span>
                        )}
                      </div>

                      {t.description && (
                        <p className="text-xs text-slate-500 line-clamp-1 mb-1">
                          {t.description}
                        </p>
                      )}

                      {/* Time and Duration info */}
                      <div className="flex items-center gap-2.5 text-[11px] text-slate-500 font-normal">
                        {t.scheduledStartTime ? (
                          <span className="flex items-center gap-1 text-slate-700 font-medium">
                            <Clock className="w-3 h-3 text-slate-400" />
                            {format(new Date(t.scheduledStartTime), 'h:mm a')}
                            {t.scheduledEndTime && ` - ${format(new Date(t.scheduledEndTime), 'h:mm a')}`}
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-slate-400">
                            <Clock className="w-3 h-3 text-slate-400" />
                            Flexible schedule
                          </span>
                        )}

                        {t.estimatedDurationMinutes && (
                          <span className="text-slate-400">
                            • {t.estimatedDurationMinutes}m
                          </span>
                        )}

                        {subtaskCount > 0 && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-200">
                            <ListTodo className="w-3 h-3 text-indigo-500" />
                            {completedSubtasks}/{subtaskCount}
                          </span>
                        )}

                        {isOverdue && (
                          <span className="text-[10px] font-semibold text-red-600 bg-red-50 px-1.5 py-0.2 rounded border border-red-200">
                            Overdue
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Actions */}
                  <div className="flex items-center gap-1 shrink-0 pt-0.5">
                    {!isCompleted && onOpenTaskCheckIn && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenTaskCheckIn(t);
                        }}
                        className="px-2 py-1 text-xs font-semibold rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-colors flex items-center gap-1"
                        title="Check in on task completion"
                      >
                        <Sparkles className="w-3 h-3 text-blue-600" />
                        <span>Check-In</span>
                      </button>
                    )}

                    {!isCompleted && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSnooze(t.id);
                        }}
                        className="px-2 py-1 text-xs font-medium rounded-md bg-white text-slate-600 hover:bg-slate-50 border border-slate-200 transition-colors flex items-center gap-1"
                        title="Snooze task by 15 minutes"
                      >
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>+15m</span>
                      </button>
                    )}

                    <button
                      onClick={() => onSelectTask?.(t)}
                      className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-colors"
                      title="Open details"
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
