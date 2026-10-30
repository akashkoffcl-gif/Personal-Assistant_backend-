'use client';

import React, { useState } from 'react';
import { X, Repeat } from 'lucide-react';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white max-w-lg w-full rounded-xl border border-slate-200 shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center">
              <Repeat className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">Create New Habit & Routine</h3>
              <p className="text-[11px] text-slate-500">Recurring daily habit definition</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[85vh] overflow-y-auto">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Habit Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Daily 8,000 Steps, 2L Hydration, Reading..."
              className="w-full px-3 py-2 text-xs font-semibold border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Recurrence Frequency
              </label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as RecurrenceFrequency)}
                className="w-full px-2.5 py-1.5 text-xs font-medium border border-slate-200 rounded-lg text-slate-800 bg-white"
              >
                <option value={RecurrenceFrequency.DAILY}>Daily (Every Day)</option>
                <option value={RecurrenceFrequency.WEEKDAYS}>Weekdays (Mon-Fri)</option>
                <option value={RecurrenceFrequency.WEEKENDS}>Weekends (Sat-Sun)</option>
                <option value={RecurrenceFrequency.WEEKLY}>Weekly</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Target Time of Day
              </label>
              <input
                type="time"
                value={targetTime}
                onChange={(e) => setTargetTime(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Duration (Mins)
              </label>
              <input
                type="number"
                min="5"
                max="240"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Target Quantity
              </label>
              <input
                type="number"
                min="1"
                placeholder="e.g. 8000"
                value={targetQuantity}
                onChange={(e) => setTargetQuantity(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Unit of Measure
              </label>
              <input
                type="text"
                placeholder="e.g. steps, ml"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Description & Details (Optional)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Why this habit matters..."
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
              {loading ? 'Saving...' : 'Save Routine'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
