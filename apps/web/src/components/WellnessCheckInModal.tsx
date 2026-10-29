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
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-assistant-navy flex items-center gap-1.5">
          {icon} {label}
        </span>
        <span className="font-bold text-assistant-sky">{value} / 5</span>
      </div>
      <div className="grid grid-cols-5 gap-2">
        {[1, 2, 3, 4, 5].map((score) => (
          <button
            key={score}
            type="button"
            onClick={() => onChange(score)}
            className={`py-2 text-xs font-bold rounded-lg border transition-all ${
              value === score
                ? 'bg-assistant-navy text-white border-assistant-navy shadow-xs scale-102'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            {score}
          </button>
        ))}
      </div>
      <div className="flex justify-between text-[10px] text-assistant-coolGrey px-0.5">
        <span>{lowLabel}</span>
        <span>{highLabel}</span>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-4 bg-assistant-navy text-white">
          <div className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-assistant-sky" />
            <h3 className="font-bold text-sm sm:text-base">Daily Wellness Check-In</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[85vh] overflow-y-auto">
          <p className="text-xs text-assistant-coolGrey leading-relaxed">
            Record self-reported subjective indicators to understand energy and focus patterns.
          </p>

          {renderRatingButtons(
            'Energy Level',
            <BatteryCharging className="w-4 h-4 text-emerald-600" />,
            energyScore,
            setEnergyScore,
            'Low Energy',
            'Fully Energized',
          )}

          {renderRatingButtons(
            'Mood Score',
            <Smile className="w-4 h-4 text-sky-500" />,
            moodScore,
            setMoodScore,
            'Low / Drained',
            'Positive / Focused',
          )}

          {renderRatingButtons(
            'Fatigue Level',
            <Zap className="w-4 h-4 text-amber-500" />,
            fatigueScore,
            setFatigueScore,
            'Well Rested',
            'Exhausted',
          )}

          {renderRatingButtons(
            'Stress Level',
            <ShieldAlert className="w-4 h-4 text-assistant-red" />,
            stressScore,
            setStressScore,
            'Calm / Relaxed',
            'High Pressure',
          )}

          <div>
            <label className="block text-xs font-semibold text-assistant-navy mb-1">
              Personal Notes / Reflection (Optional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any context about sleep, focus or workday stress..."
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
              {loading ? 'Saving...' : 'Record Check-In'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

