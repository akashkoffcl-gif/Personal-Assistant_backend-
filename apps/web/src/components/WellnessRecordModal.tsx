'use client';

import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { toast } from '@/components/Toast';
import {
  X,
  Droplet,
  Footprints,
  Moon,
  Coffee,
  Smile,
  Zap,
  Check,
  Calendar,
  Clock,
} from 'lucide-react';
import { WellnessMetricType } from '@assistant/shared';

export interface WellnessRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  recordToEdit?: {
    id: string;
    type: WellnessMetricType;
    value: number;
    unit: string;
    notes?: string;
    recordedAt?: string;
  } | null;
  defaultDate?: string;
}

export function WellnessRecordModal({
  isOpen,
  onClose,
  recordToEdit,
  defaultDate,
}: WellnessRecordModalProps) {
  const queryClient = useQueryClient();

  const [category, setCategory] = useState<WellnessMetricType>(
    recordToEdit?.type || WellnessMetricType.HYDRATION
  );
  const [value, setValue] = useState<number>(recordToEdit?.value || 250);
  const [unit, setUnit] = useState<string>(recordToEdit?.unit || 'ml');
  const [notes, setNotes] = useState<string>(recordToEdit?.notes || '');
  const [exerciseType, setExerciseType] = useState<string>('Workout');
  const [energyScore, setEnergyScore] = useState<number>(4);
  const [moodScore, setMoodScore] = useState<number>(4);
  const [sleepStart, setSleepStart] = useState<string>('23:00');
  const [sleepEnd, setSleepEnd] = useState<string>('07:00');
  const [recordedTime, setRecordedTime] = useState<string>(() => {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  });

  // Sync state if editing
  useEffect(() => {
    if (recordToEdit) {
      setCategory(recordToEdit.type);
      setValue(recordToEdit.value);
      setUnit(recordToEdit.unit);
      setNotes(recordToEdit.notes || '');
    } else {
      // Defaults based on category
      if (category === WellnessMetricType.HYDRATION) {
        setValue(250);
        setUnit('ml');
      } else if (category === WellnessMetricType.EXERCISE) {
        setValue(30);
        setUnit('minutes');
      } else if (category === WellnessMetricType.SLEEP) {
        setValue(7.5);
        setUnit('hours');
      } else if (category === WellnessMetricType.BREAK) {
        setValue(15);
        setUnit('minutes');
      } else if (category === WellnessMetricType.MOOD || category === WellnessMetricType.ENERGY) {
        setValue(4);
        setUnit('score');
      }
    }
  }, [recordToEdit, category]);

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: any) => api.logWellnessMetric(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wellness-summary'] });
      queryClient.invalidateQueries({ queryKey: ['wellness-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['analytics-trends'] });
      toast.success('Wellness record saved', `Logged ${value} ${unit} successfully.`);
      onClose();
    },
    onError: (err: any) => {
      toast.error('Failed to log record', err.message || 'Server error occurred.');
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.updateWellnessMetric(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wellness-summary'] });
      queryClient.invalidateQueries({ queryKey: ['wellness-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['analytics-trends'] });
      toast.success('Wellness record updated', 'Changes persisted to PostgreSQL.');
      onClose();
    },
    onError: (err: any) => {
      toast.error('Update failed', err.message || 'Server error occurred.');
    },
  });

  // Check-In mutation for Mood/Energy
  const checkInMutation = useMutation({
    mutationFn: (data: any) => api.recordCheckIn(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wellness-summary'] });
      queryClient.invalidateQueries({ queryKey: ['wellness-metrics'] });
      toast.success('Check-in recorded', 'Mood and energy ratings updated.');
      onClose();
    },
    onError: (err: any) => {
      toast.error('Check-in failed', err.message);
    },
  });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const targetDate = defaultDate || new Date().toISOString().split('T')[0];
    const timestamp = new Date(`${targetDate}T${recordedTime}:00.000Z`).toISOString();

    if (category === WellnessMetricType.MOOD || category === WellnessMetricType.ENERGY) {
      checkInMutation.mutate({
        moodScore,
        energyScore,
        notes: notes.trim() || undefined,
        checkInDate: targetDate,
      });
      return;
    }

    const payload = {
      type: category,
      value: Number(value),
      unit,
      notes: category === WellnessMetricType.EXERCISE ? `${exerciseType}: ${notes}`.trim() : notes.trim() || undefined,
      recordedAt: timestamp,
    };

    if (recordToEdit) {
      updateMutation.mutate({ id: recordToEdit.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending || checkInMutation.isPending;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#202033]/60 backdrop-blur-xs animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="wellness-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-2xl border border-[#E5E2F5] shadow-[0_20px_60px_rgba(139,69,245,0.22)] max-w-lg w-full overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#E5E2F5] flex items-center justify-between bg-gradient-to-r from-white to-[#FAF9FF]">
          <div>
            <h3 id="wellness-modal-title" className="text-sm font-extrabold text-[#202033] tracking-tight">
              {recordToEdit ? 'Edit Wellness Record' : 'Add Wellness Record'}
            </h3>
            <p className="text-[11px] text-[#74738A] font-medium mt-0.5">
              Privately log hydration, workouts, sleep duration, breaks, and daily energy.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl border border-[#E5E2F5] bg-white hover:bg-[#F4F3FF] text-[#74738A] hover:text-[#202033] flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Category Selector Tabs */}
          {!recordToEdit && (
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#74738A] block mb-2">
                Select Activity / Metric
              </label>
              <div className="grid grid-cols-5 gap-1.5 bg-[#F4F3FF] p-1 rounded-xl border border-[#E5E2F5]">
                {[
                  { type: WellnessMetricType.HYDRATION, label: 'Water', icon: Droplet },
                  { type: WellnessMetricType.EXERCISE, label: 'Workout', icon: Footprints },
                  { type: WellnessMetricType.SLEEP, label: 'Sleep', icon: Moon },
                  { type: WellnessMetricType.BREAK, label: 'Break', icon: Coffee },
                  { type: WellnessMetricType.MOOD, label: 'Mood', icon: Smile },
                ].map((item) => {
                  const Icon = item.icon;
                  const isSelected = category === item.type;
                  return (
                    <button
                      key={item.type}
                      type="button"
                      onClick={() => setCategory(item.type)}
                      className={`flex flex-col items-center justify-center p-2 rounded-lg text-[10px] font-bold transition-all ${
                        isSelected
                          ? 'bg-white text-[#8B45F5] shadow-xs'
                          : 'text-[#74738A] hover:text-[#202033]'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5 mb-1" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Context-Aware Fields: Hydration */}
          {category === WellnessMetricType.HYDRATION && (
            <div className="space-y-3 bg-[#FAF9FF] p-3.5 rounded-xl border border-[#DDD8F8]">
              <div className="flex items-center gap-2 text-xs font-bold text-[#3B82F6]">
                <Droplet className="w-4 h-4" />
                <span>Hydration Intake</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-[#74738A] block mb-1">Volume</label>
                  <input
                    type="number"
                    min="50"
                    max="5000"
                    step="50"
                    required
                    value={value}
                    onChange={(e) => setValue(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs font-bold border border-[#E5E2F5] rounded-xl bg-white text-[#202033] focus:outline-none focus:border-[#8B45F5]"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-[#74738A] block mb-1">Unit</label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-bold border border-[#E5E2F5] rounded-xl bg-white text-[#202033] focus:outline-none focus:border-[#8B45F5]"
                  >
                    <option value="ml">Milliliters (ml)</option>
                    <option value="cups">Cups (240ml)</option>
                    <option value="oz">Fluid Ounces (oz)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Context-Aware Fields: Exercise */}
          {category === WellnessMetricType.EXERCISE && (
            <div className="space-y-3 bg-[#F0FDF4] p-3.5 rounded-xl border border-[#DCFCE7]">
              <div className="flex items-center gap-2 text-xs font-bold text-[#16A36A]">
                <Footprints className="w-4 h-4" />
                <span>Exercise & Workout Session</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-[#74738A] block mb-1">Activity Type</label>
                  <select
                    value={exerciseType}
                    onChange={(e) => setExerciseType(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-bold border border-[#DCFCE7] rounded-xl bg-white text-[#202033] focus:outline-none focus:border-[#16A36A]"
                  >
                    <option value="Workout">Strength / Gym</option>
                    <option value="Running">Running / Jogging</option>
                    <option value="Walking">Walking / Stroll</option>
                    <option value="Cycling">Cycling</option>
                    <option value="Yoga">Yoga / Stretching</option>
                    <option value="Swimming">Swimming</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-[#74738A] block mb-1">Duration (minutes)</label>
                  <input
                    type="number"
                    min="5"
                    max="360"
                    required
                    value={value}
                    onChange={(e) => setValue(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs font-bold border border-[#DCFCE7] rounded-xl bg-white text-[#202033] focus:outline-none focus:border-[#16A36A]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Context-Aware Fields: Sleep */}
          {category === WellnessMetricType.SLEEP && (
            <div className="space-y-3 bg-[#F4F3FF] p-3.5 rounded-xl border border-[#EDE9FE]">
              <div className="flex items-center gap-2 text-xs font-bold text-[#8B45F5]">
                <Moon className="w-4 h-4" />
                <span>Sleep Duration & Rest</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-[#74738A] block mb-1">Total Hours Slept</label>
                  <input
                    type="number"
                    min="1"
                    max="24"
                    step="0.25"
                    required
                    value={value}
                    onChange={(e) => setValue(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs font-bold border border-[#EDE9FE] rounded-xl bg-white text-[#202033] focus:outline-none focus:border-[#8B45F5]"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-[#74738A] block mb-1">Unit</label>
                  <input
                    type="text"
                    disabled
                    value="hours"
                    className="w-full px-3 py-2 text-xs font-bold border border-[#EDE9FE] rounded-xl bg-gray-50 text-gray-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Context-Aware Fields: Breaks */}
          {category === WellnessMetricType.BREAK && (
            <div className="space-y-3 bg-[#FFFBEB] p-3.5 rounded-xl border border-[#FEF3C7]">
              <div className="flex items-center gap-2 text-xs font-bold text-[#F59E0B]">
                <Coffee className="w-4 h-4" />
                <span>Rest & Refresh Break</span>
              </div>
              <div>
                <label className="text-[10px] font-bold text-[#74738A] block mb-1">Break Duration (minutes)</label>
                <input
                  type="number"
                  min="5"
                  max="120"
                  required
                  value={value}
                  onChange={(e) => setValue(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs font-bold border border-[#FEF3C7] rounded-xl bg-white text-[#202033] focus:outline-none focus:border-[#F59E0B]"
                />
              </div>
            </div>
          )}

          {/* Context-Aware Fields: Mood & Energy */}
          {(category === WellnessMetricType.MOOD || category === WellnessMetricType.ENERGY) && (
            <div className="space-y-3 bg-[#FDF4FF] p-3.5 rounded-xl border border-[#F5D0FE]">
              <div className="flex items-center gap-2 text-xs font-bold text-[#C026D3]">
                <Smile className="w-4 h-4" />
                <span>Daily Mood & Energy Self-Rating</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-[#74738A] block mb-1">
                    Mood Score (1 = Low, 5 = Great): {moodScore}/5
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={moodScore}
                    onChange={(e) => setMoodScore(Number(e.target.value))}
                    className="w-full accent-[#C026D3] cursor-pointer"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-[#74738A] block mb-1">
                    Energy Score (1 = Drained, 5 = Peak): {energyScore}/5
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={energyScore}
                    onChange={(e) => setEnergyScore(Number(e.target.value))}
                    className="w-full accent-[#8B45F5] cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Time & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-[#74738A] block mb-1">Logged Time</label>
              <input
                type="time"
                value={recordedTime}
                onChange={(e) => setRecordedTime(e.target.value)}
                className="w-full px-3 py-2 text-xs font-bold border border-[#E5E2F5] rounded-xl bg-white text-[#202033] focus:outline-none focus:border-[#8B45F5]"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-[#74738A] block mb-1">Optional Notes</label>
              <input
                type="text"
                placeholder="e.g. Post-lunch recovery"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 text-xs font-medium border border-[#E5E2F5] rounded-xl bg-white text-[#202033] focus:outline-none focus:border-[#8B45F5]"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#F0F2FA]">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 text-xs font-semibold text-[#74738A] hover:bg-[#F4F3FF] rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 bg-[#8B45F5] hover:bg-[#7839D6] text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              {isSaving ? 'Saving Record...' : recordToEdit ? 'Save Changes' : 'Add Record'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
