'use client';

import React, { useState } from 'react';
import { X, Heart, Smile, BatteryCharging, Zap, ShieldAlert } from 'lucide-react';

interface WellnessCheckInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    energyScore?: number;
    moodScore?: number;
    fatigueScore?: number;
    stressScore?: number;
    notes?: string;
  }) => Promise<any>;
}

export function WellnessCheckInModal({ isOpen, onClose, onSubmit }: WellnessCheckInModalProps) {
  const [energyScore, setEnergyScore] = useState<number>(4);
  const [moodScore, setMoodScore] = useState<number>(4);
  const [fatigueScore, setFatigueScore] = useState<number>(2);
  const [stressScore, setStressScore] = useState<number>(2);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      await onSubmit({
        energyScore,
        moodScore,
        fatigueScore,
        stressScore,
        notes: notes.trim() || undefined,
      });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const renderRatingButtons = (
    label: string,
    icon: React.ReactNode,
    value: number,
    onChange: (val: number) => void,
    lowLabel: string,
    highLabel: string,
  ) => (
    <div className="space-y-1.5 p-3 rounded-lg border border-slate-200 bg-slate-50/50">
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-slate-800 flex items-center gap-1.5">
          {icon} {label}
        </span>
        <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
          {value} / 5
        </span>
      </div>
      <div className="grid grid-cols-5 gap-1.5">
        {[1, 2, 3, 4, 5].map((score) => (
          <button
            key={score}
            type="button"
            onClick={() => onChange(score)}
            className={`py-1.5 text-xs font-semibold rounded-md border transition-colors ${
              value === score
                ? 'bg-blue-600 border-blue-600 text-white'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            {score}
          </button>
        ))}
      </div>
      <div className="flex justify-between text-[10px] text-slate-400 font-medium px-0.5">
        <span>{lowLabel}</span>
        <span>{highLabel}</span>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white max-w-md w-full rounded-xl border border-slate-200 shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center">
              <Heart className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">Daily Wellness Check-In</h3>
              <p className="text-[11px] text-slate-500">Energy, Mood & Focus Balance</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-3.5 max-h-[85vh] overflow-y-auto">
          {renderRatingButtons(
            'Mental Energy Level',
            <Zap className="w-3.5 h-3.5 text-amber-500" />,
            energyScore,
            setEnergyScore,
            '1 - Drained',
            '5 - Peak Energy',
          )}

          {renderRatingButtons(
            'Emotional Mood',
            <Smile className="w-3.5 h-3.5 text-emerald-500" />,
            moodScore,
            setMoodScore,
            '1 - Low',
            '5 - Joyful',
          )}

          {renderRatingButtons(
            'Physical Fatigue',
            <BatteryCharging className="w-3.5 h-3.5 text-slate-600" />,
            fatigueScore,
            setFatigueScore,
            '1 - Rested',
            '5 - Exhausted',
          )}

          {renderRatingButtons(
            'Stress Level',
            <ShieldAlert className="w-3.5 h-3.5 text-red-500" />,
            stressScore,
            setStressScore,
            '1 - Calm',
            '5 - Overwhelmed',
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Personal Reflection Notes (Optional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="What influenced your energy, focus, or stress today?..."
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
              {loading ? 'Saving...' : 'Save Check-In'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
