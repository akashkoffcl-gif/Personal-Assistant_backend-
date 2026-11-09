'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useToast } from '@/components/Toast';
import { format } from 'date-fns';
import {
  Sparkles,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Sliders,
  Flame,
  Zap,
  Check,
  X,
} from 'lucide-react';

interface SmartDayPlannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultDate?: string;
}

export const SmartDayPlannerModal: React.FC<SmartDayPlannerModalProps> = ({
  isOpen,
  onClose,
  defaultDate,
}) => {
  const queryClient = useQueryClient();
  const toast = useToast();

  const [date, setDate] = useState<string>(
    defaultDate || new Date().toISOString().substring(0, 10),
  );
  const [bufferMinutes, setBufferMinutes] = useState<number>(10);
  const [deepWorkFocus, setDeepWorkFocus] = useState<boolean>(true);
  const [activeProposal, setActiveProposal] = useState<any>(null);

  // Propose mutation
  const proposeMutation = useMutation({
    mutationFn: () => api.proposeSmartDayPlan(date, { bufferMinutes, deepWorkFocus }),
    onSuccess: (proposal) => {
      setActiveProposal(proposal);
      toast.success('Schedule Optimized', 'AI analyzed tasks and resolved timeline collisions.');
    },
    onError: (err: any) => toast.error('Planner Error', err?.message),
  });

  // Apply mutation
  const applyMutation = useMutation({
    mutationFn: (proposalId: string) => api.applySmartDayPlan(proposalId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks-all'] });
      queryClient.invalidateQueries({ queryKey: ['day-plan'] });
      queryClient.invalidateQueries({ queryKey: ['daily-kpi'] });
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
      toast.success('Schedule Applied!', 'Calendar and day plan updated successfully.');
      onClose();
    },
    onError: (err: any) => toast.error('Apply Failed', err?.message),
  });

  if (!isOpen) return null;

  const proposedSlots = activeProposal?.proposedSchedule || [];
  const diffMetrics = activeProposal?.diffMetrics || {};

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl p-5 sm:p-6 max-w-2xl w-full border border-[#E5E2F5] shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#E5E2F5]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#6935C8] to-[#8B45F5] text-white flex items-center justify-center shadow-2xs">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#202033] tracking-tight">
                AI Smart Day Planner
              </h3>
              <p className="text-xs text-[#74738A]">
                Algorithmic scheduling with energy curve matching & collision resolution
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-[#74738A] hover:text-[#202033] rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Controls Bar */}
        <div className="p-3.5 rounded-xl bg-[#F4F3FF]/70 border border-[#E5E2F5] flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[#202033]">Target Date:</span>
            <input
              type="date"
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                setActiveProposal(null);
              }}
              className="px-2.5 py-1 border border-[#E5E2F5] rounded-lg bg-white font-semibold text-[#202033]"
            />
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 font-medium text-[#202033] cursor-pointer">
              <input
                type="checkbox"
                checked={deepWorkFocus}
                onChange={(e) => setDeepWorkFocus(e.target.checked)}
                className="rounded text-[#8B45F5] focus:ring-[#8B45F5]"
              />
              <span>Deep Work Priority</span>
            </label>

            <button
              onClick={() => proposeMutation.mutate()}
              disabled={proposeMutation.isPending}
              className="px-4 py-1.5 text-xs font-bold text-white bg-[#8B45F5] hover:bg-[#7839D6] rounded-xl shadow-xs transition-all flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{proposeMutation.isPending ? 'Generating...' : 'Generate Plan'}</span>
            </button>
          </div>
        </div>

        {/* Body: Timeline Preview or Empty State */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1 min-h-[250px]">
          {!activeProposal ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 border border-dashed border-[#E5E2F5] rounded-xl space-y-2">
              <Calendar className="w-8 h-8 text-[#8B45F5] opacity-80" />
              <h4 className="text-sm font-bold text-[#202033]">Ready to optimize your schedule</h4>
              <p className="text-xs text-[#74738A] max-w-sm">
                Click &apos;Generate Plan&apos; to arrange tasks into optimal focus slots without collisions.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Diff Metrics Banner */}
              <div className="grid grid-cols-3 gap-2">
                <div className="p-2.5 rounded-xl bg-white border border-[#E5E2F5] text-center">
                  <span className="text-[10px] uppercase font-bold text-[#74738A] block">Tasks Positioned</span>
                  <span className="text-base font-black text-[#202033]">{diffMetrics.totalTasks || 0}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-white border border-[#E5E2F5] text-center">
                  <span className="text-[10px] uppercase font-bold text-[#74738A] block">Focus Time</span>
                  <span className="text-base font-black text-[#8B45F5]">{diffMetrics.totalFocusMinutes || 0}m</span>
                </div>
                <div className="p-2.5 rounded-xl bg-white border border-[#E5E2F5] text-center">
                  <span className="text-[10px] uppercase font-bold text-[#74738A] block">Collisions Resolved</span>
                  <span className="text-base font-black text-[#10B981]">{diffMetrics.conflictsResolved || 0}</span>
                </div>
              </div>

              {/* Proposed Timeline Slots */}
              <div className="space-y-2">
                {proposedSlots.map((slot: any, idx: number) => {
                  const startTime = format(new Date(slot.proposedStartTime), 'h:mm a');
                  const endTime = format(new Date(slot.proposedEndTime), 'h:mm a');

                  return (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-white border border-[#E5E2F5] shadow-xs flex items-start justify-between gap-3"
                    >
                      <div className="flex items-start gap-3">
                        <div className="font-mono text-xs font-bold text-[#8B45F5] shrink-0 pt-0.5">
                          {startTime}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-xs text-[#202033]">{slot.title}</span>
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-[#F4F3FF] text-[#8B45F5]">
                              {slot.durationMinutes}m
                            </span>
                            {slot.isDeepWork && (
                              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-[#FFFBEB] text-[#D97706] flex items-center gap-0.5">
                                <Flame className="w-2.5 h-2.5" /> Deep Work
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-[#74738A] mt-0.5">{slot.rationale}</p>
                        </div>
                      </div>

                      <span className="text-[10px] font-mono font-semibold text-[#74738A] shrink-0">
                        Until {endTime}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-[#E5E2F5] flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-[#74738A] hover:bg-[#F4F3FF] rounded-xl"
          >
            Cancel
          </button>

          {activeProposal && (
            <button
              onClick={() => applyMutation.mutate(activeProposal.id)}
              disabled={applyMutation.isPending}
              className="px-5 py-2 text-xs font-bold text-white bg-[#8B45F5] hover:bg-[#7839D6] rounded-xl shadow-xs transition-all flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>{applyMutation.isPending ? 'Applying...' : 'Approve & Apply Schedule'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

