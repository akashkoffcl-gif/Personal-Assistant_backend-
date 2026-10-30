'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  Clock,
  CheckCircle2,
  Bell,
  Sun,
  Moon,
} from 'lucide-react';
import { format, addHours, setHours, setMinutes } from 'date-fns';

export interface SmartCheckInTarget {
  type: 'routine' | 'task';
  id: string; // occurrenceId or taskId
  routineId?: string;
  title: string;
  targetQuantity?: number | null;
  actualQuantity?: number | null;
  unit?: string | null;
  durationMinutes?: number;
  estimatedDurationMinutes?: number;
  scheduledStartTime?: string | null;
}

interface SmartCheckInModalProps {
  isOpen: boolean;
  onClose: () => void;
  target: SmartCheckInTarget | null;
  onRecordRoutineProgress: (
    occurrenceId: string,
    actualQuantity: number,
    reminderTime?: string,
    notes?: string,
  ) => Promise<void>;
  onRecordTaskStatus: (
    taskId: string,
    action: 'complete' | 'partial' | 'snooze' | 'skip',
    rescheduleTime?: string,
    notes?: string,
  ) => Promise<void>;
}

export function SmartCheckInModal({
  isOpen,
  onClose,
  target,
  onRecordRoutineProgress,
  onRecordTaskStatus,
}: SmartCheckInModalProps) {
  const [quantity, setQuantity] = useState<number>(0);
  const [selectedReminderChoice, setSelectedReminderChoice] = useState<string>('evening');
  const [customReminderTime, setCustomReminderTime] = useState<string>('');
  const [taskAction, setTaskAction] = useState<'complete' | 'partial' | 'snooze' | 'skip'>('complete');
  const [taskNotes, setTaskNotes] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (target) {
      if (target.type === 'routine') {
        setQuantity(target.actualQuantity || 0);
        setSelectedReminderChoice('evening');
      } else {
        setTaskAction('complete');
        setTaskNotes('');
      }
    }
  }, [target]);

  if (!isOpen || !target) return null;

  const isRoutine = target.type === 'routine';
  const targetQty = target.targetQuantity || 1;
  const unit = target.unit || 'units';
  const remaining = Math.max(0, targetQty - quantity);
  const progressPercent = Math.min(100, Math.round((quantity / targetQty) * 100));
  const isGoalReached = quantity >= targetQty;

  const getReminderDate = (choice: string): string | undefined => {
    const now = new Date();
    if (choice === 'none') return undefined;

    if (choice === 'evening') {
      const evening = setMinutes(setHours(new Date(), 18), 30);
      return (evening.getTime() > now.getTime() ? evening : addHours(now, 2)).toISOString();
    }
    if (choice === 'tonight') {
      const night = setMinutes(setHours(new Date(), 21), 0);
      return (night.getTime() > now.getTime() ? night : addHours(now, 2)).toISOString();
    }
    if (choice === '2h') {
      return addHours(now, 2).toISOString();
    }
    if (choice === 'custom' && customReminderTime) {
      return new Date(customReminderTime).toISOString();
    }
    return addHours(now, 2).toISOString();
  };

  const handleRoutineSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const reminderIso = !isGoalReached ? getReminderDate(selectedReminderChoice) : undefined;
      let notes = `Logged ${quantity} of ${targetQty} ${unit}.`;
      if (!isGoalReached && reminderIso) {
        notes += ` Follow-up reminder scheduled for ${format(new Date(reminderIso), 'h:mm a')}.`;
      }
      await onRecordRoutineProgress(target.id, quantity, reminderIso, notes);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const reminderIso = taskAction !== 'complete' ? getReminderDate(selectedReminderChoice) : undefined;
      await onRecordTaskStatus(target.id, taskAction, reminderIso, taskNotes);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white max-w-lg w-full rounded-xl border border-slate-200 shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">
                {isRoutine ? 'Habit Check-In & Progress' : 'Task Completion Check-In'}
              </h3>
              <p className="text-[11px] text-slate-500">Smart Proactive Follow-up Assistant</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ROUTINE / HABIT CHECK-IN FORM */}
        {isRoutine ? (
          <form onSubmit={handleRoutineSubmit} className="p-5 space-y-4">
            {/* Routine Title and Question */}
            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-blue-700 block mb-0.5">
                Active Routine Prompt
              </span>
              <h4 className="text-sm font-bold text-slate-900 mb-0.5">{target.title}</h4>
              <p className="text-xs text-slate-500">
                How many <span className="font-semibold text-slate-700">{unit}</span> have you completed today?
              </p>
            </div>

            {/* In-Line Progress Bar */}
            <div className="p-3.5 rounded-lg border border-slate-200 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-slate-600">Daily Target Progress</span>
                <span className="font-bold text-slate-900 font-mono">
                  {quantity.toLocaleString()} / {targetQty.toLocaleString()} {unit} ({progressPercent}%)
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    isGoalReached ? 'bg-emerald-600' : 'bg-blue-600'
                  }`}
                  style={{ width: `${Math.max(4, progressPercent)}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] pt-0.5">
                {isGoalReached ? (
                  <span className="font-semibold text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> 100% Target Met! Streak will advance.
                  </span>
                ) : (
                  <span className="font-medium text-amber-700">
                    {remaining.toLocaleString()} {unit} remaining for full completion
                  </span>
                )}
              </div>
            </div>

            {/* Numeric Input & Quick Increment Buttons */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Enter Current Quantity ({unit})
              </label>
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={quantity === 0 ? '' : quantity}
                  onChange={(e) => setQuantity(Number(e.target.value) || 0)}
                  placeholder="e.g. 5000"
                  className="flex-1 px-3 py-2 text-sm font-semibold border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                />
                <button
                  type="button"
                  onClick={() => setQuantity(targetQty)}
                  className="px-3 py-2 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors"
                >
                  Full ({targetQty.toLocaleString()})
                </button>
              </div>

              {/* Quick Increment Chips */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {[
                  Math.round(targetQty * 0.25),
                  Math.round(targetQty * 0.5),
                  Math.round(targetQty * 0.75),
                  1000,
                  2500,
                  5000,
                ]
                  .filter((v, i, a) => v > 0 && a.indexOf(v) === i && v < targetQty)
                  .slice(0, 4)
                  .map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setQuantity((prev) => Math.min(targetQty * 2, prev + val))}
                      className="px-2 py-1 text-xs font-medium rounded-md bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 transition-colors"
                    >
                      +{val.toLocaleString()}
                    </button>
                  ))}
                <button
                  type="button"
                  onClick={() => setQuantity(0)}
                  className="px-2 py-1 text-[11px] font-medium text-slate-400 hover:text-slate-600"
                >
                  Reset
                </button>
              </div>
            </div>

            {/* Smart Follow-Up Reminder Section (when partial) */}
            {!isGoalReached && (
              <div className="p-3.5 rounded-lg bg-blue-50/50 border border-blue-200 space-y-2.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-900">
                  <Bell className="w-3.5 h-3.5 text-blue-600" />
                  <span>When should I remind you to finish the remaining {remaining.toLocaleString()} {unit}?</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'evening', label: 'Evening (6:30 PM)', icon: Sun },
                    { id: 'tonight', label: 'Tonight (9:00 PM)', icon: Moon },
                    { id: '2h', label: 'In 2 Hours', icon: Clock },
                    { id: 'none', label: 'Do not remind again', icon: X },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setSelectedReminderChoice(opt.id)}
                      className={`p-2 rounded-md text-xs font-semibold text-left transition-colors border flex items-center gap-1.5 ${
                        selectedReminderChoice === opt.id
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <span>{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Footer Buttons */}
            <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-xs disabled:opacity-50"
              >
                {loading
                  ? 'Saving...'
                  : isGoalReached
                  ? 'Mark 100% Completed'
                  : 'Save Progress & Set Reminder'}
              </button>
            </div>
          </form>
        ) : (
          /* TASK CHECK-IN FORM */
          <form onSubmit={handleTaskSubmit} className="p-5 space-y-4">
            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-blue-700 block mb-0.5">
                Scheduled Slot Ended
              </span>
              <h4 className="text-sm font-bold text-slate-900 mb-0.5">{target.title}</h4>
              <p className="text-xs text-slate-500">
                The scheduled time for this task has concluded. What is the current status?
              </p>
            </div>

            {/* Response Choices */}
            <div className="space-y-2">
              {[
                {
                  id: 'complete' as const,
                  title: 'Yes, Fully Completed',
                  desc: 'Task finished successfully. Mark as completed and update KPI.',
                  badge: 'Done',
                  activeClass: 'bg-emerald-50 border-emerald-500 text-emerald-950 font-semibold',
                },
                {
                  id: 'partial' as const,
                  title: 'Partially Done',
                  desc: 'Completed some progress, but need more time to finish remainder.',
                  badge: 'Needs Follow-up',
                  activeClass: 'bg-blue-50 border-blue-500 text-blue-950 font-semibold',
                },
                {
                  id: 'snooze' as const,
                  title: 'Need More Time / Snooze',
                  desc: 'Still working on it right now. Move deadline forward.',
                  badge: '+15m to 2h',
                  activeClass: 'bg-amber-50 border-amber-500 text-amber-950 font-semibold',
                },
                {
                  id: 'skip' as const,
                  title: 'Skip for Today',
                  desc: 'Could not get to it today. Log as skipped.',
                  badge: 'Skip',
                  activeClass: 'bg-slate-100 border-slate-400 text-slate-900 font-semibold',
                },
              ].map((opt) => (
                <div
                  key={opt.id}
                  onClick={() => setTaskAction(opt.id)}
                  className={`p-3 rounded-lg border transition-colors cursor-pointer ${
                    taskAction === opt.id
                      ? opt.activeClass
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-900">{opt.title}</span>
                    <span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                      {opt.badge}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">{opt.desc}</p>
                </div>
              ))}
            </div>

            {/* If partial or snooze: offer follow-up reminder */}
            {(taskAction === 'partial' || taskAction === 'snooze') && (
              <div className="p-3.5 rounded-lg bg-blue-50/50 border border-blue-200 space-y-2">
                <span className="text-xs font-semibold text-blue-900 flex items-center gap-1.5">
                  <Bell className="w-3.5 h-3.5 text-blue-600" />
                  When should we schedule the follow-up reminder?
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'evening', label: 'Evening (6:30 PM)' },
                    { id: '2h', label: 'In 2 Hours' },
                    { id: 'tonight', label: 'Tonight (9:00 PM)' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setSelectedReminderChoice(t.id)}
                      className={`p-2 rounded-md text-xs font-semibold text-center border transition-colors ${
                        selectedReminderChoice === t.id
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Optional Check-in Note
              </label>
              <input
                type="text"
                value={taskNotes}
                onChange={(e) => setTaskNotes(e.target.value)}
                placeholder="e.g. Completed initial drafts, need 30m review..."
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600"
              />
            </div>

            <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-xs disabled:opacity-50"
              >
                {loading ? 'Submitting...' : 'Save Check-In'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
