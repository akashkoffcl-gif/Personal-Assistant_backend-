'use client';

import React, { useState } from 'react';
import { X, Sparkles, Clock, Repeat, Target } from 'lucide-react';
import { RecurrenceFrequency } from '@assistant/shared';

interface CreateRoutineModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    title: string;
    description?: string;
    frequency: RecurrenceFrequency;
    customDays?: number[];
    targetTime?: string;
    timeWindowStart?: string;
    timeWindowEnd?: string;
    durationMinutes: number;
    targetQuantity?: number;
    unit?: string;
  }) => Promise<any>;
}

export function CreateRoutineModal({ isOpen, onClose, onSubmit }: CreateRoutineModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [frequency, setFrequency] = useState<RecurrenceFrequency>(RecurrenceFrequency.DAILY);
  const [targetTime, setTargetTime] = useState('08:00');
  const [durationMinutes, setDurationMinutes] = useState(15);
  const [targetQuantity, setTargetQuantity] = useState<string>('');
  const [unit, setUnit] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      setLoading(true);
      await onSubmit({
        title: title.trim(),
        description: description.trim() || undefined,
        frequency,
        targetTime: targetTime || undefined,
        durationMinutes: Number(durationMinutes) || 15,
        targetQuantity: targetQuantity ? Number(targetQuantity) : undefined,
        unit: unit.trim() || undefined,
      });
      setTitle('');
      setDescription('');
      setTargetQuantity('');
      setUnit('');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/45 backdrop-blur-md animate-in fade-in duration-150">
      <div className="glass-panel max-w-lg w-full bg-white/90 backdrop-blur-2xl rounded-3xl border border-white/80 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 glass-dark text-white border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-400/20 text-amber-300 flex items-center justify-center border border-amber-400/30">
              <Sparkles className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <h3 className="font-extrabold text-base tracking-tight text-white">Create New Habit & Routine</h3>
              <p className="text-[11px] text-amber-200 font-medium">Daily Streak Definition</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-white/15 transition-all text-white/80 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[85vh] overflow-y-auto">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Habit Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Morning 2L Hydration, 30m Run, Mindfulness..."
              className="w-full px-3.5 py-2.5 text-sm font-bold glass-input rounded-xl"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Recurrence Frequency
              </label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as RecurrenceFrequency)}
                className="w-full px-3 py-2 text-xs font-semibold glass-input rounded-xl text-slate-800"
              >
                <option value={RecurrenceFrequency.DAILY}>Daily (Every Day)</option>
                <option value={RecurrenceFrequency.WEEKDAYS}>Weekdays (Mon-Fri)</option>
                <option value={RecurrenceFrequency.WEEKENDS}>Weekends (Sat-Sun)</option>
                <option value={RecurrenceFrequency.WEEKLY}>Weekly</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Target Time of Day
              </label>
              <input
                type="time"
                value={targetTime}
                onChange={(e) => setTargetTime(e.target.value)}
                className="w-full px-3 py-1.5 text-xs font-bold glass-input rounded-xl"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Duration (Mins)
              </label>
              <input
                type="number"
                min="5"
                max="240"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs font-semibold glass-input rounded-xl"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Target Quantity
              </label>
              <input
                type="number"
                min="1"
                placeholder="e.g. 8"
                value={targetQuantity}
                onChange={(e) => setTargetQuantity(e.target.value)}
                className="w-full px-3 py-2 text-xs font-semibold glass-input rounded-xl"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Unit of Measure
              </label>
              <input
                type="text"
                placeholder="e.g. glasses, mins"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full px-3 py-2 text-xs font-semibold glass-input rounded-xl"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Habit Objective & Details (Optional)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Why this routine matters to your health or career..."
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
              className="px-5 py-2 text-xs font-bold text-slate-900 glass-button-primary rounded-xl transition-all shadow-glass-glow disabled:opacity-50"
            >
              {loading ? 'Saving Habit...' : 'Save Routine'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
