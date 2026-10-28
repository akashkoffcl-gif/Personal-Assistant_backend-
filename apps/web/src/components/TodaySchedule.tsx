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
} from 'lucide-react';
import { TaskDto, TaskCategory, TaskStatus } from '@assistant/shared';
import { format } from 'date-fns';

interface TodayScheduleProps {
  tasks: TaskDto[];
  onComplete: (taskId: string) => void;
  onSnooze: (taskId: string) => void;
  onSelectTask?: (task: TaskDto) => void;
  loading?: boolean;
}

export function TodaySchedule({
  tasks,
  onComplete,
  onSnooze,
  onSelectTask,
  loading,
}: TodayScheduleProps) {
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  const filteredTasks = tasks.filter((t) => {
    if (categoryFilter === 'ALL') return true;
    if (categoryFilter === 'ROUTINE') return t.category === TaskCategory.PERSONAL_ROUTINE || t.category === ('ROUTINE' as any);
    if (categoryFilter === 'PLANNING') return t.category === TaskCategory.DAY_PLAN || t.category === ('PLANNING' as any);
    return t.category === categoryFilter;
  });

  const getCategoryBadge = (cat: TaskCategory) => {
    switch (cat) {
      case TaskCategory.EMERGENCY:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-assistant-red bg-red-100 px-2 py-0.5 rounded">
            <Flame className="w-3 h-3" /> Emergency
          </span>
        );
      case TaskCategory.WORK:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-assistant-navy bg-slate-100 px-2 py-0.5 rounded">
            <Briefcase className="w-3 h-3 text-assistant-navy" /> Work
          </span>
        );
      case TaskCategory.ROUTINE:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-assistant-navy bg-assistant-paleSky px-2 py-0.5 rounded">
            <Repeat className="w-3 h-3 text-assistant-sky" /> Routine
          </span>
        );
      case TaskCategory.PLANNING:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
            <CalendarDays className="w-3 h-3 text-assistant-green" /> Planning
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-base font-bold text-assistant-navy">Today's Schedule</h3>
          <p className="text-xs text-assistant-coolGrey">Chronological timeline & time blocks</p>
        </div>

        {/* Category Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {['ALL', 'WORK', 'ROUTINE', 'PLANNING', 'EMERGENCY'].map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                categoryFilter === cat
                  ? 'bg-assistant-navy text-white shadow-xs'
                  : 'bg-slate-100 text-assistant-coolGrey hover:bg-slate-200 hover:text-assistant-navy'
              }`}
            >
              {cat === 'ALL' ? 'All Tasks' : cat.charAt(0) + cat.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center text-sm text-slate-400">Loading schedule timeline...</div>
      ) : filteredTasks.length === 0 ? (
        <div className="py-12 text-center text-sm text-assistant-coolGrey bg-slate-50 rounded-lg border border-dashed border-slate-200">
          No tasks scheduled for today in this category.
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredTasks.map((task) => {
            const isCompleted = task.status === TaskStatus.COMPLETED;
            const startTimeStr = task.scheduledStartTime
              ? format(new Date(task.scheduledStartTime), 'h:mm a')
              : 'Flexible';
            const endTimeStr = task.scheduledEndTime
              ? format(new Date(task.scheduledEndTime), 'h:mm a')
              : null;

            return (
              <div
                key={task.id}
                className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-lg border transition-all ${
                  isCompleted
                    ? 'bg-slate-50/70 border-slate-200 opacity-75'
                    : task.category === TaskCategory.EMERGENCY
                    ? 'bg-red-50/40 border-red-200 shadow-xs'
                    : 'bg-white border-slate-200 hover:border-sky-300 shadow-xs'
                }`}
              >
                <div className="flex items-start gap-3 min-w-0">
                  {/* Complete Button */}
                  <button
                    onClick={() => onComplete(task.id)}
                    disabled={isCompleted}
                    className={`mt-0.5 w-6 h-6 rounded-full flex items-center justify-center border transition-colors ${
                      isCompleted
                        ? 'bg-assistant-green border-assistant-green text-white'
                        : 'border-slate-300 hover:border-assistant-green hover:bg-emerald-50 text-transparent hover:text-assistant-green'
                    }`}
                    title={isCompleted ? 'Completed' : 'Mark Complete'}
                  >
                    <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                  </button>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-sm font-semibold truncate ${
                          isCompleted
                            ? 'line-through text-assistant-coolGrey'
                            : 'text-assistant-navy'
                        }`}
                      >
                        {task.title}
                      </span>
                      {getCategoryBadge(task.category)}
                      {task.isOverdue && !isCompleted && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-assistant-red bg-red-100 px-1.5 py-0.5 rounded">
                          <AlertTriangle className="w-3 h-3" /> Overdue
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 mt-1 text-xs text-assistant-coolGrey">
                      <span className="flex items-center gap-1 font-medium text-slate-600">
                        <Clock className="w-3 h-3 text-assistant-sky" />
                        {startTimeStr} {endTimeStr && `– ${endTimeStr}`}
                      </span>
                      <span>•</span>
                      <span>{task.estimatedDurationMinutes} min</span>
                      {task.schedulingMode === 'FIXED' && (
                        <>
                          <span>•</span>
                          <span className="text-[11px] font-semibold text-assistant-navy">
                            Fixed Slot
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Task Actions */}
                {!isCompleted && (
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <button
                      onClick={() => onSnooze(task.id)}
                      className="px-2.5 py-1 text-xs font-medium text-assistant-coolGrey hover:text-assistant-navy bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
                      title="Snooze 15 minutes"
                    >
                      Snooze 15m
                    </button>
                    <button
                      onClick={() => onComplete(task.id)}
                      className="px-2.5 py-1 text-xs font-semibold text-assistant-green hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-md transition-colors"
                    >
                      Complete
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

