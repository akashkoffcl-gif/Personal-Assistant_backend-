'use client';

import React, { useState } from 'react';
import { Check, Flame, Plus, Droplet, Dumbbell, Coffee, Moon } from 'lucide-react';
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
  const [selectedQuantity, setSelectedQuantity] = useState<Record<string, number>>({});

  const getRoutineIcon = (title: string) => {
    const lower = title.toLowerCase();
    if (lower.includes('water') || lower.includes('hydration')) return Droplet;
    if (lower.includes('exercise') || lower.includes('workout') || lower.includes('jog')) return Dumbbell;
    if (lower.includes('sleep') || lower.includes('wake')) return Moon;
    return Coffee;
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-bold text-assistant-navy">Personal Routines</h3>
          <p className="text-xs text-assistant-coolGrey">Daily wellness habits & streaks</p>
        </div>

        {onAddRoutine && (
          <button
            onClick={onAddRoutine}
            className="flex items-center gap-1 text-xs font-semibold text-assistant-navy bg-assistant-paleSky hover:bg-sky-100 px-2.5 py-1.5 rounded-lg transition-colors border border-sky-200"
          >
            <Plus className="w-3.5 h-3.5 text-assistant-sky stroke-[2.5]" />
            <span>Add Habit</span>
          </button>
        )}
      </div>

      {loading ? (
        <div className="py-8 text-center text-sm text-slate-400">Loading routines...</div>
      ) : occurrences.length === 0 ? (
        <div className="py-8 text-center text-sm text-assistant-coolGrey bg-slate-50 rounded-lg border border-dashed border-slate-200">
          No routine occurrences scheduled for today.
        </div>
      ) : (
        <div className="space-y-2.5">
          {occurrences.map((occ) => {
            const isCompleted = occ.status === TaskStatus.COMPLETED;
            const routine = occ.routine;
            const Icon = getRoutineIcon(routine?.title || '');
            const targetQty = routine?.targetQuantity;
            const unit = routine?.unit || '';

            return (
              <div
                key={occ.id}
                className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                  isCompleted
                    ? 'bg-emerald-50/50 border-emerald-200'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    onClick={() =>
                      onRecord(
                        occ.id,
                        isCompleted ? TaskStatus.TODO : TaskStatus.COMPLETED,
                        targetQty || undefined,
                      )
                    }
                    className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors ${
                      isCompleted
                        ? 'bg-assistant-green border-assistant-green text-white'
                        : 'border-slate-300 hover:border-assistant-green hover:bg-emerald-50 text-transparent'
                    }`}
                  >
                    <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                  </button>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-sm font-semibold truncate ${
                          isCompleted
                            ? 'line-through text-assistant-coolGrey'
                            : 'text-assistant-navy'
                        }`}
                      >
                        {routine?.title}
                      </span>
                      {routine?.streakCount !== undefined && routine.streakCount > 0 && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded-full">
                          <Flame className="w-3 h-3 text-amber-500 fill-amber-500" />
                          {routine.streakCount} streak
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mt-0.5 text-xs text-assistant-coolGrey">
                      <Icon className="w-3 h-3 text-assistant-sky" />
                      <span>{routine?.durationMinutes || 15} min</span>
                      {targetQty && (
                        <>
                          <span>•</span>
                          <span className="font-medium text-slate-700">
                            {occ.actualQuantity || targetQty} {unit}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {!isCompleted && targetQty && unit && (
                    <button
                      onClick={() =>
                        onRecord(occ.id, TaskStatus.COMPLETED, (occ.actualQuantity || 0) + targetQty / 2)
                      }
                      className="px-2 py-1 text-[11px] font-medium text-assistant-navy bg-assistant-paleSky hover:bg-sky-100 rounded border border-sky-200"
                      title="Log partial intake"
                    >
                      + Half
                    </button>
                  )}
                  <button
                    onClick={() =>
                      onRecord(
                        occ.id,
                        isCompleted ? TaskStatus.TODO : TaskStatus.COMPLETED,
                        targetQty || undefined,
                      )
                    }
                    className={`px-2.5 py-1 text-xs font-semibold rounded transition-colors ${
                      isCompleted
                        ? 'text-assistant-coolGrey hover:text-assistant-navy'
                        : 'bg-assistant-sky text-assistant-navy hover:bg-sky-400'
                    }`}
                  >
                    {isCompleted ? 'Undo' : 'Check off'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

