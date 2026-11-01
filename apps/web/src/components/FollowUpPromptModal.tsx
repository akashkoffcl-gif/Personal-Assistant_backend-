'use client';

import React, { useState } from 'react';
import {
  CheckCircle2,
  Clock,
  Calendar,
  AlertCircle,
  X,
  Sparkles,
  ArrowRight,
  Plus,
  Minus,
  RotateCcw,
} from 'lucide-react';
import { api } from '@/lib/api';

export interface FollowUpItem {
  id: string;
  type: 'TASK' | 'ROUTINE';
  targetId: string;
  occurrenceId?: string;
  title: string;
  scheduledTimeText: string;
  scheduledStartTime?: string;
  scheduledEndTime?: string;
  category?: string;
  priority?: string;
  targetQuantity?: number;
  actualQuantity?: number;
  unit?: string;
}

interface FollowUpPromptModalProps {
  isOpen: boolean;
  item: FollowUpItem | null;
  onClose: () => void;
  onSuccess: (action: string) => void;
}

export function FollowUpPromptModal({
  isOpen,
  item,
  onClose,
  onSuccess,
}: FollowUpPromptModalProps) {
  const [activeStep, setActiveStep] = useState<'CHOICE' | 'PARTIAL' | 'STILL_WORKING' | 'RESCHEDULE' | 'SKIP'>('CHOICE');
  const [submitting, setSubmitting] = useState(false);

  // Partial progress form state
  const [progressPercent, setProgressPercent] = useState<number>(50);
  const [remainingNotes, setRemainingNotes] = useState<string>('');

  // Still working state
  const [extraMinutes, setExtraMinutes] = useState<number>(30);

  // Reschedule state
  const [rescheduleDate, setRescheduleDate] = useState<string>(
    new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString().slice(0, 16),
  );

  // Routine quantity state
  const [routineQuantity, setRoutineQuantity] = useState<number>(
    item?.actualQuantity || item?.targetQuantity || 1,
  );

  // Skip reason state
  const [skipReason, setSkipReason] = useState<string>('');

  if (!isOpen || !item) return null;

  const isRoutine = item.type === 'ROUTINE';

  const handleAction = async (action: 'COMPLETED' | 'PARTIALLY_COMPLETED' | 'STILL_WORKING' | 'RESCHEDULE' | 'SKIPPED') => {
    setSubmitting(true);
    try {
      let revisedEndTime: string | undefined;
      if (action === 'STILL_WORKING') {
        const base = item.scheduledEndTime ? new Date(item.scheduledEndTime).getTime() : Date.now();
        revisedEndTime = new Date(base + extraMinutes * 60 * 1000).toISOString();
      }

      await api.respondToFollowUp({
        followUpId: item.id,
        taskId: item.type === 'TASK' ? item.targetId : undefined,
        routineId: item.type === 'ROUTINE' ? item.targetId : undefined,
        occurrenceId: item.occurrenceId,
        action,
        progressPercent: action === 'PARTIALLY_COMPLETED' ? progressPercent : undefined,
        revisedEndTime,
        rescheduleDate: action === 'RESCHEDULE' ? new Date(rescheduleDate).toISOString() : undefined,
        actualQuantity: isRoutine ? routineQuantity : undefined,
        notes: action === 'PARTIALLY_COMPLETED' ? remainingNotes : action === 'SKIPPED' ? skipReason : undefined,
      });

      onSuccess(action);
      onClose();
    } catch (err: any) {
      alert(`Could not save response: ${err?.message || 'Server error'}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in select-none">
      <div className="bg-white rounded-3xl border border-[#E5E2F5] shadow-[0_20px_50px_rgba(139,69,245,0.18)] max-w-md w-full overflow-hidden flex flex-col animate-scale-up">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#F4F3FF] via-[#EDE9FE] to-[#F4F3FF] px-5 py-4 border-b border-[#E5E2F5] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#6935C8] to-[#8B45F5] text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-[#202033] tracking-tight">
                {isRoutine ? 'Routine Check-In' : 'Scheduled Task Follow-Up'}
              </h3>
              <p className="text-[11px] text-[#74738A] font-medium">
                {isRoutine ? 'Scheduled time has elapsed' : 'Your scheduled time has ended'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full border border-[#E5E2F5] bg-white text-[#74738A] hover:text-[#202033] flex items-center justify-center hover:bg-[#F4F3FF] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4">
          {/* Target Activity Card */}
          <div className="bg-[#FAF9FF] border border-[#E5E2F5] rounded-2xl p-3.5 space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-bold text-[#8B45F5] uppercase tracking-wider text-[10px]">
                {item.category || (isRoutine ? 'Routine' : 'Task')}
              </span>
              <span className="text-[#74738A] font-semibold flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-[#8B45F5]" />
                {item.scheduledTimeText}
              </span>
            </div>
            <h4 className="text-base font-bold text-[#202033] leading-snug">{item.title}</h4>

            {/* If quantity routine, show target */}
            {isRoutine && item.targetQuantity && (
              <div className="pt-2 border-t border-[#EAE9FF] flex items-center justify-between text-xs">
                <span className="text-[#74738A]">Target Quantity:</span>
                <span className="font-extrabold text-[#202033]">
                  {item.targetQuantity} {item.unit || ''}
                </span>
              </div>
            )}
          </div>

          {/* Prompt Question */}
          {activeStep === 'CHOICE' && (
            <div className="space-y-3">
              <p className="text-sm font-bold text-[#202033] text-center">How did it go?</p>

              {/* Routine Quantity Stepper if applicable */}
              {isRoutine && item.targetQuantity && (
                <div className="bg-white border border-[#E5E2F5] rounded-xl p-3 flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#202033]">Actual Completed:</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setRoutineQuantity(Math.max(0, routineQuantity - 1))}
                      className="w-7 h-7 rounded-lg border border-[#E5E2F5] flex items-center justify-center hover:bg-[#F4F3FF]"
                    >
                      <Minus className="w-3 h-3 text-[#202033]" />
                    </button>
                    <span className="font-extrabold text-sm text-[#8B45F5] w-12 text-center">
                      {routineQuantity} {item.unit || ''}
                    </span>
                    <button
                      onClick={() => setRoutineQuantity(routineQuantity + 1)}
                      className="w-7 h-7 rounded-lg border border-[#E5E2F5] flex items-center justify-center hover:bg-[#F4F3FF]"
                    >
                      <Plus className="w-3 h-3 text-[#202033]" />
                    </button>
                  </div>
                </div>
              )}

              {/* Action Buttons Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                {/* 1. Completed */}
                <button
                  onClick={() => handleAction('COMPLETED')}
                  disabled={submitting}
                  className="sm:col-span-2 py-2.5 px-4 bg-gradient-to-r from-[#10B981] to-[#059669] hover:from-[#059669] hover:to-[#047857] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4 text-white" />
                  <span>Completed</span>
                </button>

                {/* 2. Partially Completed */}
                <button
                  onClick={() => setActiveStep('PARTIAL')}
                  disabled={submitting}
                  className="py-2 px-3 bg-white hover:bg-[#F4F3FF] border border-[#DDD8F8] text-[#8B45F5] rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-[#8B45F5]" />
                  <span>Partially Done</span>
                </button>

                {/* 3. Still Working */}
                {!isRoutine && (
                  <button
                    onClick={() => setActiveStep('STILL_WORKING')}
                    disabled={submitting}
                    className="py-2 px-3 bg-white hover:bg-[#F4F3FF] border border-[#E5E2F5] text-[#202033] rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Clock className="w-3.5 h-3.5 text-[#74738A]" />
                    <span>Still Working</span>
                  </button>
                )}

                {/* 4. Reschedule */}
                <button
                  onClick={() => setActiveStep('RESCHEDULE')}
                  disabled={submitting}
                  className="py-2 px-3 bg-white hover:bg-[#F4F3FF] border border-[#E5E2F5] text-[#202033] rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <Calendar className="w-3.5 h-3.5 text-[#74738A]" />
                  <span>Reschedule</span>
                </button>

                {/* 5. Skipped */}
                <button
                  onClick={() => setActiveStep('SKIP')}
                  disabled={submitting}
                  className="py-2 px-3 bg-white hover:bg-[#FFF1F2] border border-[#FECDD6] text-[#E11D48] rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <AlertCircle className="w-3.5 h-3.5 text-[#E11D48]" />
                  <span>Skipped</span>
                </button>
              </div>
            </div>
          )}

          {/* Sub-step: Partial Progress */}
          {activeStep === 'PARTIAL' && (
            <div className="space-y-3">
              <h5 className="text-xs font-bold text-[#202033]">Record Partial Progress</h5>
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-[#74738A]">
                  <span>Progress:</span>
                  <span className="font-bold text-[#8B45F5]">{progressPercent}%</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="90"
                  step="5"
                  value={progressPercent}
                  onChange={(e) => setProgressPercent(Number(e.target.value))}
                  className="w-full accent-[#8B45F5] cursor-pointer"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[#74738A] block mb-1">
                  Remaining work / notes (optional):
                </label>
                <textarea
                  value={remainingNotes}
                  onChange={(e) => setRemainingNotes(e.target.value)}
                  placeholder="What is left to finish?"
                  rows={2}
                  className="w-full p-2.5 text-xs bg-[#F4F3FF] border border-[#E5E2F5] rounded-xl text-[#202033] focus:outline-none focus:border-[#8B45F5]"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setActiveStep('CHOICE')}
                  className="flex-1 py-2 rounded-xl border border-[#E5E2F5] text-xs font-semibold text-[#74738A] hover:bg-[#F4F3FF]"
                >
                  Back
                </button>
                <button
                  onClick={() => handleAction('PARTIALLY_COMPLETED')}
                  disabled={submitting}
                  className="flex-1 py-2 rounded-xl bg-[#8B45F5] text-white text-xs font-bold hover:bg-[#7839D6] transition-colors"
                >
                  Save Progress
                </button>
              </div>
            </div>
          )}

          {/* Sub-step: Still Working */}
          {activeStep === 'STILL_WORKING' && (
            <div className="space-y-3">
              <h5 className="text-xs font-bold text-[#202033]">Extend Working Time</h5>
              <p className="text-[11px] text-[#74738A]">How much more time do you need?</p>

              <div className="grid grid-cols-3 gap-2">
                {[15, 30, 60].map((mins) => (
                  <button
                    key={mins}
                    onClick={() => setExtraMinutes(mins)}
                    className={`py-2 rounded-xl border text-xs font-bold transition-all ${
                      extraMinutes === mins
                        ? 'border-[#8B45F5] bg-[#F4F3FF] text-[#8B45F5]'
                        : 'border-[#E5E2F5] bg-white text-[#202033] hover:bg-[#F4F3FF]'
                    }`}
                  >
                    +{mins} mins
                  </button>
                ))}
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setActiveStep('CHOICE')}
                  className="flex-1 py-2 rounded-xl border border-[#E5E2F5] text-xs font-semibold text-[#74738A] hover:bg-[#F4F3FF]"
                >
                  Back
                </button>
                <button
                  onClick={() => handleAction('STILL_WORKING')}
                  disabled={submitting}
                  className="flex-1 py-2 rounded-xl bg-[#8B45F5] text-white text-xs font-bold hover:bg-[#7839D6] transition-colors"
                >
                  Extend Time
                </button>
              </div>
            </div>
          )}

          {/* Sub-step: Reschedule */}
          {activeStep === 'RESCHEDULE' && (
            <div className="space-y-3">
              <h5 className="text-xs font-bold text-[#202033]">Reschedule Activity</h5>
              <div>
                <label className="text-[11px] font-semibold text-[#74738A] block mb-1">
                  New Start Date & Time:
                </label>
                <input
                  type="datetime-local"
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  className="w-full p-2.5 text-xs bg-[#F4F3FF] border border-[#E5E2F5] rounded-xl text-[#202033] focus:outline-none focus:border-[#8B45F5]"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setActiveStep('CHOICE')}
                  className="flex-1 py-2 rounded-xl border border-[#E5E2F5] text-xs font-semibold text-[#74738A] hover:bg-[#F4F3FF]"
                >
                  Back
                </button>
                <button
                  onClick={() => handleAction('RESCHEDULE')}
                  disabled={submitting}
                  className="flex-1 py-2 rounded-xl bg-[#8B45F5] text-white text-xs font-bold hover:bg-[#7839D6] transition-colors"
                >
                  Confirm Reschedule
                </button>
              </div>
            </div>
          )}

          {/* Sub-step: Skipped */}
          {activeStep === 'SKIP' && (
            <div className="space-y-3">
              <h5 className="text-xs font-bold text-[#202033]">Skip Activity</h5>
              <div>
                <label className="text-[11px] font-semibold text-[#74738A] block mb-1">
                  Reason for skipping (optional):
                </label>
                <textarea
                  value={skipReason}
                  onChange={(e) => setSkipReason(e.target.value)}
                  placeholder="e.g. Schedule conflict, feeling unwell, postponed..."
                  rows={2}
                  className="w-full p-2.5 text-xs bg-[#F4F3FF] border border-[#E5E2F5] rounded-xl text-[#202033] focus:outline-none focus:border-[#8B45F5]"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setActiveStep('CHOICE')}
                  className="flex-1 py-2 rounded-xl border border-[#E5E2F5] text-xs font-semibold text-[#74738A] hover:bg-[#F4F3FF]"
                >
                  Back
                </button>
                <button
                  onClick={() => handleAction('SKIPPED')}
                  disabled={submitting}
                  className="flex-1 py-2 rounded-xl bg-[#E11D48] text-white text-xs font-bold hover:bg-[#BE123C] transition-colors"
                >
                  Confirm Skip
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

