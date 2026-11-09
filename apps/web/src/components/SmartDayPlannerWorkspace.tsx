'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { toast } from '@/components/Toast';
import {
  Sparkles,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Sliders,
  Flame,
  Layers,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  RefreshCw,
  XCircle,
  Zap,
  Info,
} from 'lucide-react';

interface SmartDayPlannerWorkspaceProps {
  initialDate?: string;
  onNavigateToCalendar?: () => void;
}

export const SmartDayPlannerWorkspace: React.FC<SmartDayPlannerWorkspaceProps> = ({
  initialDate,
  onNavigateToCalendar,
}) => {
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState<string>(
    initialDate || new Date().toISOString().split('T')[0]
  );
  const [bufferMinutes, setBufferMinutes] = useState<number>(10);
  const [deepWorkFocus, setDeepWorkFocus] = useState<boolean>(true);
  const [activeProposal, setActiveProposal] = useState<any>(null);

  // 1. Fetch Existing Proposals for Date
  const { data: existingProposalsData, isLoading: isLoadingProposals } = useQuery({
    queryKey: ['smart-proposals', selectedDate],
    queryFn: () => api.getProposals(selectedDate),
  });

  React.useEffect(() => {
    if (existingProposalsData) {
      const proposals = Array.isArray(existingProposalsData)
        ? existingProposalsData
        : (existingProposalsData as any)?.data || [];
      if (proposals.length > 0 && !activeProposal) {
        setActiveProposal(proposals[0]);
      }
    }
  }, [existingProposalsData, activeProposal]);

  // 2. Fetch Tasks for Current Day
  const { data: tasksData, isLoading: isLoadingTasks } = useQuery({
    queryKey: ['tasks', selectedDate],
    queryFn: () => api.getTasks({ date: selectedDate }),
  });
  const tasks = Array.isArray(tasksData) ? tasksData : (tasksData as any)?.data || [];

  // 3. Propose Smart Plan Mutation
  const proposeMutation = useMutation({
    mutationFn: () => api.proposeSmartDayPlan(selectedDate, { bufferMinutes, deepWorkFocus }),
    onSuccess: (proposal: any) => {
      const cleanProposal = proposal?.data || proposal;
      setActiveProposal(cleanProposal);
      queryClient.invalidateQueries({ queryKey: ['smart-proposals', selectedDate] });
      toast.success('Schedule Synthesized', 'AI resolved task overlaps and optimized energy slots.');
    },
    onError: (err: any) => {
      toast.error('Synthesis Failed', err?.message || 'Could not generate schedule proposal.');
    },
  });

  // 4. Apply Smart Plan Mutation
  const applyMutation = useMutation({
    mutationFn: (proposalId: string) => api.applySmartDayPlan(proposalId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks-all'] });
      queryClient.invalidateQueries({ queryKey: ['day-plan'] });
      queryClient.invalidateQueries({ queryKey: ['daily-kpi'] });
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
      queryClient.invalidateQueries({ queryKey: ['smart-proposals', selectedDate] });
      toast.success('Schedule Applied!', 'Committed to calendar with verified zero-overlap protection.');
      if (activeProposal) {
        setActiveProposal({ ...activeProposal, status: 'APPLIED' });
      }
    },
    onError: (err: any) => {
      toast.error('Commit Failed', err?.message || 'Failed to commit proposed schedule.');
    },
  });

  // Navigation handlers
  const handlePrevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d.toISOString().split('T')[0]);
    setActiveProposal(null);
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(d.toISOString().split('T')[0]);
    setActiveProposal(null);
  };

  const proposedSlots = activeProposal?.proposedSchedule || [];
  const originalSlots = activeProposal?.originalSchedule || [];
  const diffMetrics = activeProposal?.diffMetrics || {
    totalTasks: proposedSlots.length,
    conflictsResolved: 0,
    deepWorkBlocksCount: proposedSlots.filter((s: any) => s.isDeepWork).length,
    totalFocusMinutes: proposedSlots.reduce((acc: number, s: any) => acc + (s.durationMinutes || 0), 0),
  };

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      {/* 1. WORKSPACE HEADER */}
      <div className="bg-white rounded-2xl border border-[#E5E2F5] p-5 sm:p-6 shadow-[0_4px_24px_rgba(139,69,245,0.06)] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-[#F4F3FF] border border-[#DDD8F8] flex items-center justify-center text-[#8B45F5] shadow-xs">
            <Sparkles className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-[#202033] tracking-tight">
                AI Smart Day Planner
              </h1>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#8B45F5] text-white">
                Cognitive Orchestrator
              </span>
            </div>
            <p className="text-xs text-[#74738A] mt-0.5">
              Energy-matched schedule optimization, conflict resolution, and deterministic daily commitment.
            </p>
          </div>
        </div>

        {/* Date Selector & Generator Trigger */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center bg-[#F4F3FF] rounded-xl p-1 border border-[#E5E2F5]">
            <button
              onClick={handlePrevDay}
              className="p-1.5 rounded-lg hover:bg-white text-[#74738A] hover:text-[#202033] transition-colors"
              title="Previous Day"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="px-3 py-1 text-xs font-bold text-[#202033] flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#8B45F5]" />
              <span>{selectedDate}</span>
            </div>
            <button
              onClick={handleNextDay}
              className="p-1.5 rounded-lg hover:bg-white text-[#74738A] hover:text-[#202033] transition-colors"
              title="Next Day"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => proposeMutation.mutate()}
            disabled={proposeMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#6935C8] to-[#8B45F5] hover:opacity-95 text-white text-xs font-bold shadow-xs transition-opacity disabled:opacity-60"
          >
            <Sparkles className={`w-3.5 h-3.5 ${proposeMutation.isPending ? 'animate-spin' : ''}`} />
            <span>{proposeMutation.isPending ? 'Optimizing Day...' : 'Synthesize Proposal'}</span>
          </button>
        </div>
      </div>

      {/* 2. OPTIMIZATION PARAMETERS & METRICS BANNER */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Buffer Selector */}
        <div className="bg-white rounded-2xl border border-[#E5E2F5] p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-bold text-[#74738A]">
            <span>Cognitive Recovery Buffer</span>
            <Clock className="w-4 h-4 text-[#8B45F5]" />
          </div>
          <div className="flex items-center gap-1.5 mt-3">
            {[5, 10, 15, 20].map((mins) => (
              <button
                key={mins}
                onClick={() => setBufferMinutes(mins)}
                className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition-all ${
                  bufferMinutes === mins
                    ? 'bg-[#8B45F5] text-white shadow-2xs'
                    : 'bg-[#F4F3FF] text-[#525266] hover:bg-[#EAE9FF]'
                }`}
              >
                {mins}m
              </button>
            ))}
          </div>
          <p className="text-[10px] text-[#74738A] mt-2">
            Automated intervals between deep work blocks to prevent cognitive fatigue.
          </p>
        </div>

        {/* Deep Work Switch */}
        <div className="bg-white rounded-2xl border border-[#E5E2F5] p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-bold text-[#74738A]">
            <span>Deep Work Priority</span>
            <Flame className="w-4 h-4 text-[#E5A12A]" />
          </div>
          <div className="flex items-center justify-between mt-3">
            <span className="text-xs font-extrabold text-[#202033]">
              {deepWorkFocus ? 'Morning Peak Alignment' : 'Sequential Queue'}
            </span>
            <button
              onClick={() => setDeepWorkFocus(!deepWorkFocus)}
              className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${
                deepWorkFocus ? 'bg-[#8B45F5]' : 'bg-[#DDD8F8]'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white shadow-xs transition-transform ${
                  deepWorkFocus ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
          <p className="text-[10px] text-[#74738A] mt-2">
            Positions high-priority tasks into 9:00 AM - 11:30 AM peak cognitive slot.
          </p>
        </div>

        {/* Conflicts Resolved */}
        <div className="bg-white rounded-2xl border border-[#E5E2F5] p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-bold text-[#74738A]">
            <span>Conflicts Resolved</span>
            <ShieldCheck className="w-4 h-4 text-[#16A36A]" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-[#16A36A]">
              {diffMetrics.conflictsResolved || 0}
            </span>
            <span className="text-xs text-[#74738A] ml-1.5 font-medium">overlaps cleared</span>
          </div>
          <p className="text-[10px] text-[#74738A] mt-2">
            Zero calendar collisions guaranteed across commitments.
          </p>
        </div>

        {/* Total Focus Allocated */}
        <div className="bg-white rounded-2xl border border-[#E5E2F5] p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-bold text-[#74738A]">
            <span>Scheduled Deep Work</span>
            <Zap className="w-4 h-4 text-[#8B45F5]" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-[#8B45F5]">
              {Math.round(diffMetrics.totalFocusMinutes / 60)}h {diffMetrics.totalFocusMinutes % 60}m
            </span>
            <span className="text-xs text-[#74738A] ml-1.5 font-medium">
              across {diffMetrics.deepWorkBlocksCount || 0} blocks
            </span>
          </div>
          <p className="text-[10px] text-[#74738A] mt-2">
            Matches daily recommended cognitive ceiling.
          </p>
        </div>
      </div>

      {/* 3. PROPOSAL COMPARISON & TIMELINE */}
      {activeProposal ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column (5 cols): AI Optimization Rationale & Schedule Diff */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white rounded-2xl border border-[#E5E2F5] p-5 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-[#F0F2FA]">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#74738A]">
                    Synthesis Rationale
                  </span>
                  <span
                    className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                      activeProposal.status === 'APPLIED'
                        ? 'bg-[#D1FADF] text-[#16A36A]'
                        : 'bg-[#FEF0C7] text-[#E5A12A]'
                    }`}
                  >
                    {activeProposal.status}
                  </span>
                </div>
                <span className="text-xs text-[#74738A]">
                  ID: {activeProposal.id?.substring(0, 8)}
                </span>
              </div>

              <p className="text-xs text-[#202033] mt-3 leading-relaxed font-medium">
                {activeProposal.explanation}
              </p>

              {/* Status & Commitment Controls */}
              <div className="mt-5 pt-4 border-t border-[#F0F2FA] flex items-center justify-between gap-3">
                {activeProposal.status === 'APPLIED' ? (
                  <div className="w-full py-2.5 rounded-xl bg-[#D1FADF] text-[#16A36A] font-bold text-xs flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Schedule Committed to Production Calendar</span>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={() => setActiveProposal(null)}
                      className="px-4 py-2.5 rounded-xl border border-[#E5E2F5] text-xs font-bold text-[#74738A] hover:bg-[#F4F3FF] transition-colors"
                    >
                      Discard
                    </button>
                    <button
                      onClick={() => applyMutation.mutate(activeProposal.id)}
                      disabled={applyMutation.isPending}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-[#6935C8] to-[#8B45F5] hover:opacity-95 text-white font-bold text-xs shadow-xs transition-opacity disabled:opacity-60"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{applyMutation.isPending ? 'Committing...' : 'Approve & Apply Plan'}</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Original vs Proposed Schedule Diff Card */}
            <div className="bg-white rounded-2xl border border-[#E5E2F5] p-5 shadow-xs">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#74738A] mb-3">
                Schedule Diff Overview
              </h3>
              <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
                {proposedSlots.map((slot: any, idx: number) => {
                  const startTime = new Date(slot.proposedStartTime).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  });
                  return (
                    <div
                      key={idx}
                      className="p-3 rounded-xl border border-[#E5E2F5] bg-[#F4F3FF]/40 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-5 h-5 rounded-md bg-[#DDD8F8] text-[#8B45F5] text-[10px] font-black flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-[#202033] truncate">
                            {slot.title}
                          </p>
                          <p className="text-[10px] text-[#74738A] mt-0.5">
                            {slot.durationMinutes}m block • {slot.rationale || 'Energy aligned'}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs font-mono font-bold text-[#8B45F5] shrink-0 ml-2">
                        {startTime}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column (7 cols): Full Visual Hourly Timeline */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-[#E5E2F5] p-5 sm:p-6 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-[#F0F2FA] mb-4">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#8B45F5]" />
                  <h3 className="text-sm font-bold text-[#202033]">
                    Proposed Hourly Timeline (9:00 AM - 6:00 PM)
                  </h3>
                </div>
                <span className="text-xs text-[#74738A] font-medium">
                  {bufferMinutes}m recovery buffers active
                </span>
              </div>

              {/* Timeline Slot Stream */}
              <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-[#E5E2F5]">
                {proposedSlots.map((slot: any, idx: number) => {
                  const startTime = new Date(slot.proposedStartTime).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  });
                  const endTime = new Date(slot.proposedEndTime).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  return (
                    <div key={idx} className="relative group">
                      {/* Timeline Node */}
                      <div
                        className={`absolute -left-6 top-1.5 w-5 h-5 rounded-full border-2 border-white flex items-center justify-center shadow-xs ${
                          slot.isDeepWork
                            ? 'bg-gradient-to-tr from-[#6935C8] to-[#8B45F5] text-white'
                            : 'bg-[#DDD8F8] text-[#6935C8]'
                        }`}
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-white" />
                      </div>

                      {/* Schedule Block Card */}
                      <div
                        className={`p-3.5 rounded-xl border transition-all ${
                          slot.isDeepWork
                            ? 'border-[#DDD8F8] bg-gradient-to-r from-[#F4F3FF] to-white'
                            : 'border-[#E5E2F5] bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-bold text-[#8B45F5]">
                              {startTime} - {endTime}
                            </span>
                            {slot.isDeepWork && (
                              <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-[#8B45F5] text-white">
                                Deep Work Peak
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-[#74738A] font-medium">
                            {slot.durationMinutes} min
                          </span>
                        </div>

                        <h4 className="text-sm font-bold text-[#202033] mt-1.5">
                          {slot.title}
                        </h4>

                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#F0F2FA] text-[11px] text-[#74738A]">
                          <span>{slot.rationale || 'Optimal cognitive bandwidth match.'}</span>
                          <span className="font-semibold text-[#16A36A]">Protected</span>
                        </div>
                      </div>

                      {/* Recovery Buffer Indicator */}
                      {idx < proposedSlots.length - 1 && (
                        <div className="pl-3 py-1 flex items-center gap-2 text-[10px] text-[#74738A] font-medium">
                          <div className="w-1.5 h-1.5 rounded-full bg-[#16A36A]" />
                          <span>+{bufferMinutes}m cognitive recovery buffer</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-[#F0F2FA] flex items-center justify-between text-xs text-[#74738A]">
              <span>Deterministic Plan Generator v3.0</span>
              <button
                onClick={onNavigateToCalendar}
                className="font-bold text-[#8B45F5] hover:underline"
              >
                Open Full Calendar & Planning →
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Empty / Initial State */
        <div className="bg-white rounded-2xl border border-[#E5E2F5] p-12 text-center shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-[#F4F3FF] border border-[#DDD8F8] flex items-center justify-center text-[#8B45F5] mx-auto mb-4">
            <Sparkles className="w-7 h-7 stroke-[2]" />
          </div>
          <h3 className="text-lg font-bold text-[#202033]">
            No Schedule Synthesized for {selectedDate}
          </h3>
          <p className="text-xs text-[#74738A] max-w-md mx-auto mt-1 leading-relaxed">
            Generate an AI-driven proposal to allocate today&apos;s tasks and routine commitments into energy-matched focus windows with zero overlaps.
          </p>
          <button
            onClick={() => proposeMutation.mutate()}
            disabled={proposeMutation.isPending}
            className="mt-6 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#6935C8] to-[#8B45F5] hover:opacity-95 text-white text-xs font-bold shadow-xs transition-opacity"
          >
            {proposeMutation.isPending ? 'Generating Proposal...' : 'Synthesize Daily Schedule'}
          </button>
        </div>
      )}
    </div>
  );
};