'use client';

import React from 'react';
import {
  Check,
  Flame,
  Plus,
  Droplet,
  Dumbbell,
  Coffee,
  Moon,
  Sparkles,
  Footprints,
  CheckCircle2,
  Clock,
  ArrowRight,
  Bell,
  BookOpen,
} from 'lucide-react';
import { RoutineOccurrenceDto, TaskStatus } from '@assistant/shared';

interface RoutineChecklistProps {
  occurrences: RoutineOccurrenceDto[];
  onRecord: (occurrenceId: string, status: TaskStatus, actualQuantity?: number) => void;
  onOpenCheckIn?: (occurrence: RoutineOccurrenceDto) => void;
  onAddRoutine?: () => void;
  loading?: boolean;
}

export function RoutineChecklist({
  occurrences,
  onRecord,
  onOpenCheckIn,
  onAddRoutine,
  loading,
}: RoutineChecklistProps) {
  const getRoutineIcon = (title: string, unit?: string | null) => {
    const lower = `${title} ${unit || ''}`.toLowerCase();
    if (lower.includes('step') || lower.includes('walk') || lower.includes('jog')) return Footprints;
    if (lower.includes('water') || lower.includes('hydration') || lower.includes('ml')) return Droplet;
    if (lower.includes('exercise') || lower.includes('workout') || lower.includes('gym')) return Dumbbell;
    if (lower.includes('sleep') || lower.includes('wake') || lower.includes('rest')) return Moon;
    if (lower.includes('read') || lower.includes('book') || lower.includes('study')) return BookOpen;
    return Coffee;
  };

  return (
    <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-900 tracking-tight">
              Habits & Routines
            </h3>
            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
              <Flame className="w-3 h-3 text-amber-500 fill-amber-500" />
              Daily Tracking
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Progressive target tracking, inline goals & smart reminders
          </p>
        </div>

        {onAddRoutine && (
          <button
            onClick={onAddRoutine}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-lg transition-colors shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Add Habit</span>
          </button>
        )}
      </div>

      {loading ? (
        <div className="py-10 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
          <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <span>Synchronizing daily routines...</span>
        </div>
      ) : occurrences.length === 0 ? (
        <div className="py-8 text-center rounded-lg border border-dashed border-slate-200 p-5 bg-slate-50/50">
          <Sparkles className="w-7 h-7 text-amber-500 mx-auto mb-1.5" />
          <h4 className="text-xs font-semibold text-slate-700">No habits scheduled for today</h4>
          <p className="text-xs text-slate-500 mt-0.5 mb-3">
            Build daily routines for hydration, walking, study, or mindfulness.
          </p>
          {onAddRoutine && (
            <button
              onClick={onAddRoutine}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors shadow-xs"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Create New Routine</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {occurrences.map((occ) => {
            const routine = occ.routine;
            const Icon = getRoutineIcon(routine?.title || '', routine?.unit);
            const targetQty = routine?.targetQuantity || 1;
            const actualQty = occ.actualQuantity || 0;
            const unit = routine?.unit || 'steps';
            const streak = routine?.streakCount || 0;
            const isCompleted = occ.status === TaskStatus.COMPLETED || actualQty >= targetQty;
            const isPartial = actualQty > 0 && actualQty < targetQty;
            const progressPercent = Math.min(100, Math.round((actualQty / targetQty) * 100));

            return (
              <div
                key={occ.id}
                className={`p-3.5 rounded-lg border transition-colors select-none ${
                  isCompleted
                    ? 'bg-slate-50/70 border-slate-200'
                    : isPartial
                    ? 'bg-blue-50/20 border-blue-200'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                {/* Top Row: Icon, Title & Status Badge */}
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 border ${
                        isCompleted
                          ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                          : isPartial
                          ? 'bg-blue-50 text-blue-600 border-blue-200'
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                    </div>

                    <div className="min-w-0">
                      <h4 className="text-xs font-semibold text-slate-900 truncate">
                        {routine?.title}
                      </h4>
                      {routine?.targetTime && (
                        <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" /> Target: {routine.targetTime}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="shrink-0">
                    {isCompleted ? (
                      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Done
                      </span>
                    ) : isPartial ? (
                      <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                        {progressPercent}% Done
                      </span>
                    ) : (
                      <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        Target: {targetQty.toLocaleString()} {unit}
                      </span>
                    )}
                  </div>
                </div>

                {/* Middle: In-Line Progress Bar & Status Text */}
                <div className="space-y-1 mb-2.5 bg-slate-50 p-2 rounded-md border border-slate-200/60">
                  <div className="flex items-center justify-between text-[11px] font-medium">
                    <span className="text-slate-500">Daily Target</span>
                    <span className="font-semibold text-slate-800 font-mono">
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

                  {occ.notes && isPartial && (
                    <div className="text-[10px] text-blue-700 font-medium flex items-center gap-1 pt-0.5">
                      <Bell className="w-2.5 h-2.5 text-blue-500" />
                      <span>{occ.notes}</span>
                    </div>
                  )}
                </div>

                {/* Bottom Row: Streak flame + Action Buttons */}
                <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100">
                  <div
                    className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium ${
                      streak > 0
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : 'text-slate-400'
                    }`}
                  >
                    <Flame
                      className={`w-3 h-3 ${
                        streak > 0 ? 'text-amber-500 fill-amber-500' : 'text-slate-300'
                      }`}
                    />
                    <span>{streak}d streak</span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => onOpenCheckIn?.(occ)}
                      className="px-2.5 py-1 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-md transition-colors flex items-center gap-1 shadow-2xs"
                    >
                      <span>{isCompleted ? 'Update' : 'Log / Check-In'}</span>
                      <ArrowRight className="w-3 h-3 text-slate-400" />
                    </button>

                    <button
                      onClick={() =>
                        onRecord(
                          occ.id,
                          isCompleted ? TaskStatus.TODO : TaskStatus.COMPLETED,
                          isCompleted ? 0 : targetQty,
                        )
                      }
                      className={`w-6 h-6 rounded-md flex items-center justify-center border transition-colors ${
                        isCompleted
                          ? 'bg-emerald-600 border-emerald-600 text-white'
                          : 'border-slate-300 bg-white hover:border-emerald-600 hover:bg-emerald-50 text-slate-300 hover:text-emerald-600'
                      }`}
                      title={isCompleted ? 'Reset habit' : 'Complete 100%'}
                    >
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
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
