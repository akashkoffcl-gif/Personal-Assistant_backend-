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
  Calendar,
  CheckCircle2,
  Clock,
  ArrowRight,
  TrendingUp,
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

  const daysOfWeek = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  return (
    <div className="glass-panel rounded-2xl p-5 sm:p-6 border border-white/80 shadow-glass">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">
              Habits & Routines
            </h3>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-amber-500/10 text-amber-700 border border-amber-300/50 flex items-center gap-1 shadow-xs">
              <Flame className="w-3 h-3 text-amber-500 fill-amber-500" />
              Daily Tracking
            </span>
          </div>
          <p className="text-xs text-assistant-coolGrey font-medium">
            Progressive target tracking, inline goals & smart reminders
          </p>
        </div>

        {onAddRoutine && (
          <button
            onClick={onAddRoutine}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-900 glass-button-primary px-3 py-1.5 rounded-xl transition-all shadow-xs"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Add Habit</span>
          </button>
        )}
      </div>

      {loading ? (
        <div className="py-12 text-center text-sm text-slate-400 flex flex-col items-center gap-2">
          <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
          <span>Synchronizing daily routines...</span>
        </div>
      ) : occurrences.length === 0 ? (
        <div className="py-10 text-center glass-card rounded-2xl border border-dashed border-slate-300/80 p-6">
          <Sparkles className="w-8 h-8 text-amber-400 mx-auto mb-2 animate-bounce" />
          <h4 className="text-sm font-bold text-slate-700">No habits scheduled for today</h4>
          <p className="text-xs text-slate-500 mt-1 mb-4">
            Start building daily habits for steps, hydration, workouts, reading, or mindfulness.
          </p>
          {onAddRoutine && (
            <button
              onClick={onAddRoutine}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-900 glass-button-primary border border-sky-300 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Create New Routine</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3.5">
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
                className={`p-4 rounded-2xl border transition-all duration-200 select-none ${
                  isCompleted
                    ? 'bg-emerald-50/40 border-emerald-200/80 shadow-xs'
                    : isPartial
                    ? 'bg-sky-50/40 border-sky-200/80 shadow-xs'
                    : 'glass-card border-white/90 hover:border-sky-300 shadow-glass hover:shadow-glass-hover'
                }`}
              >
                {/* Top Row: Icon, Title & Status Badge */}
                <div className="flex items-center justify-between gap-3 mb-2.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border shadow-xs ${
                        isCompleted
                          ? 'bg-emerald-500/15 text-emerald-600 border-emerald-300/60'
                          : isPartial
                          ? 'bg-sky-500/15 text-sky-600 border-sky-300/60'
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>

                    <div className="min-w-0">
                      <h4 className="text-sm font-extrabold text-slate-900 truncate">
                        {routine?.title}
                      </h4>
                      {routine?.targetTime && (
                        <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" /> Target time: {routine.targetTime}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="shrink-0">
                    {isCompleted ? (
                      <span className="text-[11px] font-extrabold text-emerald-700 bg-emerald-500/15 px-2.5 py-0.5 rounded-full border border-emerald-300/60 flex items-center gap-1 shadow-xs">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Done
                      </span>
                    ) : isPartial ? (
                      <span className="text-[11px] font-extrabold text-sky-700 bg-sky-500/15 px-2.5 py-0.5 rounded-full border border-sky-300/60 shadow-xs">
                        {progressPercent}% In Progress
                      </span>
                    ) : (
                      <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
                        Goal: {targetQty.toLocaleString()} {unit}
                      </span>
                    )}
                  </div>
                </div>

                {/* Middle: In-Line Progress Bar & Status Text */}
                <div className="space-y-1.5 mb-3 bg-white/50 p-2.5 rounded-xl border border-white/80 shadow-2xs">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-500 font-medium">Daily Goal</span>
                    <span className="font-extrabold text-slate-800 font-mono">
                      {actualQty.toLocaleString()} / {targetQty.toLocaleString()} {unit}
                    </span>
                  </div>

                  <div className="w-full bg-slate-200/60 rounded-full h-2 overflow-hidden shadow-inner">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isCompleted
                          ? 'bg-gradient-to-r from-emerald-400 to-teal-500'
                          : 'bg-gradient-to-r from-sky-400 to-indigo-500'
                      }`}
                      style={{ width: `${Math.max(4, progressPercent)}%` }}
                    />
                  </div>

                  {/* Follow-up reminder note if partial */}
                  {occ.notes && isPartial && (
                    <div className="text-[10px] text-sky-700 font-semibold flex items-center gap-1 pt-0.5">
                      <Bell className="w-3 h-3 text-sky-500" />
                      <span>{occ.notes}</span>
                    </div>
                  )}
                </div>

                {/* Bottom Row: Streak flame + Action Button */}
                <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200/50">
                  <div
                    className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold ${
                      streak > 0
                        ? 'bg-amber-500/15 text-amber-700 border border-amber-300/60'
                        : 'text-slate-400'
                    }`}
                  >
                    <Flame
                      className={`w-3.5 h-3.5 ${
                        streak > 0 ? 'text-amber-500 fill-amber-500' : 'text-slate-300'
                      }`}
                    />
                    <span>{streak}d streak</span>
                  </div>

                  {/* Interactive Smart Check-In Button */}
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => onOpenCheckIn?.(occ)}
                      className="px-3 py-1.5 text-xs font-bold text-slate-800 glass-card hover:border-sky-300 rounded-xl transition-all shadow-xs flex items-center gap-1.5 hover:scale-102 active:scale-95"
                    >
                      <span>{isCompleted ? 'Update Progress' : 'Log / Check-In'}</span>
                      <ArrowRight className="w-3 h-3 text-sky-500" />
                    </button>

                    {/* Direct Quick Toggle Checkbox */}
                    <button
                      onClick={() =>
                        onRecord(
                          occ.id,
                          isCompleted ? TaskStatus.TODO : TaskStatus.COMPLETED,
                          isCompleted ? 0 : targetQty,
                        )
                      }
                      className={`w-7 h-7 rounded-xl flex items-center justify-center border transition-all ${
                        isCompleted
                          ? 'bg-emerald-500 border-emerald-500 text-white shadow-glass-glow-emerald'
                          : 'border-slate-300 bg-white hover:border-emerald-500 hover:bg-emerald-50 text-slate-300 hover:text-emerald-500'
                      }`}
                      title={isCompleted ? 'Reset habit' : 'Complete 100%'}
                    >
                      <Check className="w-4 h-4 stroke-[3]" />
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
