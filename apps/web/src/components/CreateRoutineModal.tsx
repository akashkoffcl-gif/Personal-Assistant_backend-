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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-4 bg-assistant-navy text-white">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-assistant-sky" />
            <h3 className="font-bold text-sm sm:text-base">New Recurring Routine Definition</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[85vh] overflow-y-auto">
          <div>
            <label className="block text-xs font-semibold text-assistant-navy mb-1">
              Routine Habit Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Morning Hydration, 30m Workout, Reading..."
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-assistant-sky"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-assistant-navy mb-1">
                Recurrence Frequency
              </label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as RecurrenceFrequency)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-assistant-sky"
              >
                <option value={RecurrenceFrequency.DAILY}>Daily (Every Day)</option>
                <option value={RecurrenceFrequency.WEEKDAYS}>Weekdays (Mon-Fri)</option>
                <option value={RecurrenceFrequency.WEEKENDS}>Weekends (Sat-Sun)</option>
                <option value={RecurrenceFrequency.WEEKLY}>Weekly</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-assistant-navy mb-1">
                Preferred Time
              </label>
              <input
                type="time"
                value={targetTime}
                onChange={(e) => setTargetTime(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-assistant-sky"
              >
              </input>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-assistant-navy mb-1">
                Duration (min)
              </label>
              <input
                type="number"
                min="1"
                max="360"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-assistant-sky"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-assistant-navy mb-1">
                Target Quantity
              </label>
              <input
                type="number"
                placeholder="e.g. 500"
                value={targetQuantity}
                onChange={(e) => setTargetQuantity(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-assistant-sky"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-assistant-navy mb-1">
                Unit
              </label>
              <input
                type="text"
                placeholder="ml, pages, min"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-assistant-sky"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-assistant-navy mb-1">
              Description / Instructions (Optional)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Why this routine matters or step-by-step guidance..."
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-assistant-sky"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-assistant-coolGrey hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-xs font-bold text-white bg-assistant-navy hover:bg-slate-800 rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
            >
              {loading ? 'Creating...' : 'Save Routine Definition'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

