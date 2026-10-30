'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  Clock,
  CheckCircle2,
  Bell,
  Footprints,
  Calendar,
  AlertCircle,
  TrendingUp,
  ArrowRight,
  Flame,
  Sun,
  Moon,
  ChevronRight,
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

  // Compute preset reminder timestamps
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-md animate-in fade-in duration-150">
      <div className="glass-panel max-w-lg w-full bg-white/95 backdrop-blur-2xl rounded-3xl border border-white/80 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 glass-dark text-white border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-400 to-indigo-500 text-slate-950 flex items-center justify-center font-bold shadow-glass-glow">
              <Sparkles className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <h3 className="font-extrabold text-base tracking-tight text-white">
                {isRoutine ? 'Habit Check-In & Progress' : 'Task Completion Check-In'}
              </h3>
              <p className="text-[11px] text-sky-200 font-medium">Smart Proactive Follow-up Assistant</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-white/15 transition-all text-white/80 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ROUTINE / HABIT CHECK-IN FORM */}
        {isRoutine ? (
          <form onSubmit={handleRoutineSubmit} className="p-6 space-y-5">
            {/* Routine Title and Question */}
            <div className="p-4 rounded-2xl glass-card border border-white/90 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-sky-600 block mb-1">
                Active Routine Question
              </span>
              <h4 className="text-base font-extrabold text-slate-900 mb-1">{target.title}</h4>
              <p className="text-xs text-slate-500 font-medium">
                How many <span className="font-bold text-slate-700">{unit}</span> have you completed today?
              </p>
            </div>

            {/* In-Line Progress Bar */}
            <div className="p-4 rounded-2xl glass-card border border-white/90 space-y-2 shadow-xs">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-600">Daily Goal Progress</span>
                <span className="font-extrabold text-slate-900 font-mono text-sm">
                  {quantity.toLocaleString()} / {targetQty.toLocaleString()} {unit} ({progressPercent}%)
                </span>
              </div>
              <div className="w-full bg-slate-200/60 rounded-full h-3 overflow-hidden shadow-inner">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    isGoalReached
                      ? 'bg-gradient-to-r from-emerald-400 to-teal-500'
                      : 'bg-gradient-to-r from-sky-400 via-sky-500 to-indigo-500'
                  }`}
                  style={{ width: `${Math.max(6, progressPercent)}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] pt-1">
                {isGoalReached ? (
                  <span className="font-extrabold text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> 100% Target Met! Streak will advance.
                  </span>
                ) : (
                  <span className="font-bold text-amber-600">
                    {remaining.toLocaleString()} {unit} remaining to achieve full goal
                  </span>
                )}
              </div>
            </div>

            {/* Numeric Input & Quick Increment Buttons */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Enter Current Quantity ({unit})
              </label>
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={quantity === 0 ? '' : quantity}
                  onChange={(e) => setQuantity(Number(e.target.value) || 0)}
                  placeholder={`e.g. 5000`}
                  className="flex-1 px-4 py-2.5 text-base font-black glass-input rounded-xl text-slate-900"
                />
                <button
                  type="button"
                  onClick={() => setQuantity(targetQty)}
                  className="px-3.5 py-2.5 text-xs font-bold rounded-xl glass-card text-emerald-700 hover:border-emerald-300 shadow-xs"
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
                      className="px-2.5 py-1 text-xs font-bold rounded-lg glass-card text-sky-700 hover:border-sky-300 transition-all shadow-xs"
                    >
                      +{val.toLocaleString()}
                    </button>
                  ))}
                <button
                  type="button"
                  onClick={() => setQuantity(0)}
                  className="px-2 py-1 text-[11px] font-semibold rounded-lg text-slate-400 hover:text-slate-600"
                >
                  Reset
                </button>
              </div>
            </div>

            {/* Smart Follow-Up Reminder Section (when partial) */}
            {!isGoalReached && (
              <div className="p-4 rounded-2xl bg-sky-500/10 border border-sky-300/50 space-y-3">
                <div className="flex items-center gap-2 text-xs font-extrabold text-sky-900">
                  <Bell className="w-4 h-4 text-sky-600 animate-bounce" />
                  <span>When should I remind you to finish the remaining {remaining.toLocaleString()} {unit}?</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'evening', label: '🌅 This Evening (6:30 PM)', icon: Sun },
                    { id: 'tonight', label: '🌙 Tonight (9:00 PM)', icon: Moon },
                    { id: '2h', label: '⏰ In 2 Hours', icon: Clock },
                    { id: 'none', label: '⏭️ Don\'t remind again', icon: X },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setSelectedReminderChoice(opt.id)}
                      className={`p-2.5 rounded-xl text-xs font-bold text-left transition-all border flex items-center gap-2 ${
                        selectedReminderChoice === opt.id
                          ? 'bg-sky-500 text-white border-sky-500 shadow-glass-glow'
                          : 'bg-white/80 text-slate-700 border-white hover:border-sky-300'
                      }`}
                    >
                      <span>{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Footer Buttons */}
            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200/60">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-slate-600 glass-card hover:border-slate-300 rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2.5 text-xs font-bold text-slate-900 glass-button-primary rounded-xl transition-all shadow-glass-glow disabled:opacity-50"
              >
                {loading
                  ? 'Saving...'
                  : isGoalReached
                  ? '🎉 Mark 100% Completed'
                  : 'Save Progress & Set Reminder'}
              </button>
            </div>
          </form>
        ) : (
          /* TASK CHECK-IN FORM */
          <form onSubmit={handleTaskSubmit} className="p-6 space-y-5">
            <div className="p-4 rounded-2xl glass-card border border-white/90 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-sky-600 block mb-1">
                Scheduled Task Ended
              </span>
              <h4 className="text-base font-extrabold text-slate-900 mb-1">{target.title}</h4>
              <p className="text-xs text-slate-500 font-medium">
                The scheduled time for this task has concluded. What is the current status?
              </p>
            </div>

            {/* Response Choices */}
            <div className="space-y-2">
              {[
                {
                  id: 'complete' as const,
                  title: '✅ Yes, Fully Completed!',
                  desc: 'Task finished successfully. Mark as completed and update KPI.',
                  badge: 'Done',
                  color: 'hover:border-emerald-400',
                  activeClass: 'bg-emerald-500/15 border-emerald-400 text-emerald-950',
                },
                {
                  id: 'partial' as const,
                  title: '⏳ Partially Done',
                  desc: 'Completed some progress, but need more time to finish remainder.',
                  badge: 'Needs Follow-up',
                  color: 'hover:border-sky-400',
                  activeClass: 'bg-sky-500/15 border-sky-400 text-sky-950',
                },
                {
                  id: 'snooze' as const,
                  title: '⏰ Need More Time / Snooze',
                  desc: 'Still working on it right now. Move deadline forward.',
                  badge: '+15m to 2h',
                  color: 'hover:border-amber-400',
                  activeClass: 'bg-amber-500/15 border-amber-400 text-amber-950',
                },
                {
                  id: 'skip' as const,
                  title: '⏭️ Skip or Cancel for Today',
                  desc: 'Could not get to it today. Log as skipped.',
                  badge: 'Skip',
                  color: 'hover:border-rose-400',
                  activeClass: 'bg-rose-500/15 border-rose-400 text-rose-950',
                },
              ].map((opt) => (
                <div
                  key={opt.id}
                  onClick={() => setTaskAction(opt.id)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                    taskAction === opt.id
                      ? `${opt.activeClass} shadow-xs scale-101 font-bold`
                      : `glass-card border-white/90 ${opt.color}`
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-slate-900">{opt.title}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full glass-pill text-slate-600">
                      {opt.badge}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 font-medium">{opt.desc}</p>
                </div>
              ))}
            </div>

            {/* If partial or snooze: offer follow-up reminder */}
            {(taskAction === 'partial' || taskAction === 'snooze') && (
              <div className="p-4 rounded-2xl bg-sky-500/10 border border-sky-300/50 space-y-2.5">
                <span className="text-xs font-bold text-sky-900 flex items-center gap-1.5">
                  <Bell className="w-3.5 h-3.5 text-sky-600" />
                  When should we schedule the follow-up reminder?
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'evening', label: '🌅 Evening (6:30 PM)' },
                    { id: '2h', label: '⏰ In 2 Hours' },
                    { id: 'tonight', label: '🌙 Tonight (9:00 PM)' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setSelectedReminderChoice(t.id)}
                      className={`p-2 rounded-xl text-[11px] font-bold text-center border transition-all ${
                        selectedReminderChoice === t.id
                          ? 'bg-sky-500 text-white border-sky-500 shadow-xs'
                          : 'bg-white/80 text-slate-700 border-white hover:border-sky-300'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Optional Check-in Note
              </label>
              <input
                type="text"
                value={taskNotes}
                onChange={(e) => setTaskNotes(e.target.value)}
                placeholder="e.g. Completed initial drafts, need 30m review..."
                className="w-full px-3.5 py-2 text-xs glass-input rounded-xl"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200/60">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-slate-600 glass-card hover:border-slate-300 rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2.5 text-xs font-bold text-slate-900 glass-button-primary rounded-xl transition-all shadow-glass-glow disabled:opacity-50"
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

