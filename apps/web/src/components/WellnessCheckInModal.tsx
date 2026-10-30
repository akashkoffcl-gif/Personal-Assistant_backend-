'use client';

import React, { useState } from 'react';
import { X, Heart, Smile, BatteryCharging, Zap, ShieldAlert, Sparkles } from 'lucide-react';

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
    activeColorClass: string,
  ) => (
    <div className="space-y-1.5 p-3 rounded-2xl glass-card border border-white/80 shadow-xs">
      <div className="flex items-center justify-between text-xs">
        <span className="font-bold text-slate-800 flex items-center gap-1.5">
          {icon} {label}
        </span>
        <span className="font-extrabold text-sky-600 bg-sky-50 px-2 py-0.5 rounded-full border border-sky-200">
          {value} / 5
        </span>
      </div>
      <div className="grid grid-cols-5 gap-1.5">
        {[1, 2, 3, 4, 5].map((score) => (
          <button
            key={score}
            type="button"
            onClick={() => onChange(score)}
            className={`py-2 text-xs font-black rounded-xl border transition-all ${
              value === score
                ? `${activeColorClass} text-white shadow-xs scale-105`
                : 'glass-card text-slate-600 hover:border-sky-300'
            }`}
          >
            {score}
          </button>
        ))}
      </div>
      <div className="flex justify-between text-[10px] text-slate-400 font-medium px-1">
        <span>{lowLabel}</span>
        <span>{highLabel}</span>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/45 backdrop-blur-md animate-in fade-in duration-150">
      <div className="glass-panel max-w-md w-full bg-white/90 backdrop-blur-2xl rounded-3xl border border-white/80 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 glass-dark text-white border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-300 flex items-center justify-center border border-rose-400/30">
              <Heart className="w-4 h-4 text-rose-400 fill-rose-400" />
            </div>
            <div>
              <h3 className="font-extrabold text-base tracking-tight text-white">Daily Wellness Check-In</h3>
              <p className="text-[11px] text-rose-200 font-medium">Energy, Mood & Focus Balance</p>
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
          {renderRatingButtons(
            'Mental Energy Level',
            <Zap className="w-4 h-4 text-amber-500" />,
            energyScore,
            setEnergyScore,
            '1 - Drained',
            '5 - Peak Energy',
            'bg-amber-500 border-amber-500',
          )}

          {renderRatingButtons(
            'Emotional Mood',
            <Smile className="w-4 h-4 text-emerald-500" />,
            moodScore,
            setMoodScore,
            '1 - Low / Down',
            '5 - Joyful / Optimistic',
            'bg-emerald-500 border-emerald-500',
          )}

          {renderRatingButtons(
            'Physical Fatigue',
            <BatteryCharging className="w-4 h-4 text-purple-500" />,
            fatigueScore,
            setFatigueScore,
            '1 - Well Rested',
            '5 - Exhausted',
            'bg-purple-500 border-purple-500',
          )}

          {renderRatingButtons(
            'Stress & Anxiety',
            <ShieldAlert className="w-4 h-4 text-rose-500" />,
            stressScore,
            setStressScore,
            '1 - Calm & Peaceful',
            '5 - Overwhelmed',
            'bg-rose-500 border-rose-500',
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Personal Reflection Notes (Optional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="What factors influenced your energy, focus, or stress today?..."
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
              {loading ? 'Saving...' : 'Save Check-In'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
