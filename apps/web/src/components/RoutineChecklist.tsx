'use client';

import React, { useState } from 'react';
import {
  Check,
  Flame,
  Plus,
  Droplet,
  Dumbbell,
  Coffee,
  Moon,
  Sparkles,
  Calendar,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import { RoutineOccurrenceDto, TaskStatus } from '@assistant/shared';

interface RoutineChecklistProps {
  occurrences: RoutineOccurrenceDto[];
  onRecord: (occurrenceId: string, status: TaskStatus, actualQuantity?: number) => void;
  onAddRoutine?: () => void;
  loading?: boolean;
}

export function RoutineChecklist({
  occurrences,
  onRecord,
  onAddRoutine,
  loading,
}: RoutineChecklistProps) {
  const getRoutineIcon = (title: string) => {
    const lower = title.toLowerCase();
    if (lower.includes('water') || lower.includes('hydration')) return Droplet;
    if (lower.includes('exercise') || lower.includes('workout') || lower.includes('jog') || lower.includes('gym'))
      return Dumbbell;
    if (lower.includes('sleep') || lower.includes('wake') || lower.includes('rest')) return Moon;
    return Coffee;
  };

  const daysOfWeek = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  return (
    <div className="glass-panel rounded-2xl p-5 sm:p-6 border border-white/80 shadow-glass">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">
              Habits & Routines
            </h3>
            <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-amber-500/10 text-amber-700 border border-amber-300/50 flex items-center gap-1">
              <Flame className="w-3 h-3 text-amber-500 fill-amber-500" />
              Daily Streaks
            </span>
          </div>
          <p className="text-xs text-assistant-coolGrey font-medium">
            Daily wellness consistency & recurring habits
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
            Start building daily habits for hydration, workouts, reading, or mindfulness.
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
        <div className="space-y-3">
          {occurrences.map((occ) => {
            const isCompleted = occ.status === TaskStatus.COMPLETED;
            const routine = occ.routine;
            const Icon = getRoutineIcon(routine?.title || '');
            const targetQty = routine?.targetQuantity;
            const unit = routine?.unit || '';
            const streak = routine?.streakCount || 0;

            return (
              <div
                key={occ.id}
                className={`p-4 rounded-2xl border transition-all duration-200 select-none ${
                  isCompleted
                    ? 'bg-emerald-50/40 border-emerald-200/70 shadow-xs'
                    : 'glass-card border-white/90 hover:border-sky-300 shadow-glass hover:shadow-glass-hover'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  {/* Left: Complete Checkbox + Title */}
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      onClick={() =>
                        onRecord(
                          occ.id,
                          isCompleted ? TaskStatus.TODO : TaskStatus.COMPLETED,
                          targetQty || undefined,
                        )
                      }
                      className={`w-6 h-6 rounded-xl flex items-center justify-center border transition-all shrink-0 ${
                        isCompleted
                          ? 'bg-emerald-500 border-emerald-500 text-white shadow-glass-glow-emerald scale-105'
                          : 'border-slate-300 bg-white/80 hover:border-emerald-500 hover:bg-emerald-50 text-transparent hover:scale-110 shadow-xs'
                      }`}
                      title={isCompleted ? 'Mark uncompleted' : 'Complete habit today'}
                    >
                      <Check className="w-4 h-4 stroke-[3]" />
                    </button>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-sm font-bold truncate transition-colors ${
                            isCompleted ? 'line-through text-slate-400' : 'text-slate-900'
                          }`}
                        >
                          {routine?.title}
                        </span>

                        <div className="p-1 rounded-lg bg-sky-500/10 text-sky-600 border border-sky-300/40">
                          <Icon className="w-3 h-3" />
                        </div>
                      </div>

                      <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-500 font-medium">
                        {targetQty && (
                          <span>
                            Goal: {targetQty} {unit}
                          </span>
                        )}
                        {routine?.targetTime && (
                          <span>• Target time: {routine.targetTime}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Streak Flame Badge & Weekday Indicators */}
                  <div className="flex items-center gap-3 shrink-0">
                    {/* Visual Mon-Sun Indicator dots */}
                    <div className="hidden sm:flex items-center gap-1 bg-white/60 p-1 rounded-xl border border-white/80 shadow-2xs">
                      {daysOfWeek.map((day, idx) => {
                        const isPastDay = idx < new Date().getDay();
                        const isToday = idx === (new Date().getDay() === 0 ? 6 : new Date().getDay() - 1);
                        return (
                          <span
                            key={idx}
                            className={`w-5 h-5 rounded-lg flex items-center justify-center text-[10px] font-bold ${
                              isToday
                                ? isCompleted
                                  ? 'bg-emerald-500 text-white'
                                  : 'bg-amber-400 text-slate-900 animate-pulse'
                                : isPastDay
                                ? 'bg-slate-200/80 text-slate-600'
                                : 'text-slate-400'
                            }`}
                            title={`${day}: ${isToday ? (isCompleted ? 'Done' : 'Pending') : 'History'}`}
                          >
                            {day}
                          </span>
                        );
                      })}
                    </div>

                    {/* Streak Badge */}
                    <div
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-xl font-bold text-xs border shadow-xs ${
                        streak > 0
                          ? 'bg-amber-500/15 text-amber-700 border-amber-300/60 shadow-glass-glow'
                          : 'bg-slate-100 text-slate-400 border-slate-200'
                      }`}
                      title={`${streak} consecutive day streak`}
                    >
                      <Flame
                        className={`w-3.5 h-3.5 ${
                          streak > 0 ? 'text-amber-500 fill-amber-500 animate-bounce' : 'text-slate-300'
                        }`}
                      />
                      <span>{streak}d</span>
                    </div>
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
