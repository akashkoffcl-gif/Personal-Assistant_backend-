'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { toast } from '@/components/Toast';
import {
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  Flame,
  Target,
  ArrowRight,
  ChevronRight,
  Sliders,
  History,
  AlertCircle,
} from 'lucide-react';

interface FocusStudioDashboardWidgetProps {
  onOpenFullStudio?: () => void;
  onOpenCreateTask?: () => void;
}

export const FocusStudioDashboardWidget: React.FC<FocusStudioDashboardWidgetProps> = ({
  onOpenFullStudio,
  onOpenCreateTask,
}) => {
  const queryClient = useQueryClient();

  const [selectedTaskId, setSelectedTaskId] = useState<string>('');
  const [selectedDurationMins, setSelectedDurationMins] = useState<number>(25);

  // 1. Fetch Preferences
  const { data: prefData } = useQuery({
    queryKey: ['focus-preferences'],
    queryFn: () => api.getFocusPreferences(),
    staleTime: 60000,
  });
  const preferences = prefData?.data || prefData || {
    focusDurationMinutes: 25,
    shortBreakMinutes: 5,
    longBreakMinutes: 15,
    dailyTargetMinutes: 120,
  };

  // 2. Fetch Current Active Focus Session
  const { data: currentData } = useQuery({
    queryKey: ['focus-current'],
    queryFn: () => api.getCurrentFocusSession(),
    refetchInterval: 4000,
  });
  const currentSessionInfo = currentData?.data !== undefined ? currentData.data : currentData;
  const activeSession = currentSessionInfo?.session;

  // 3. Fetch Analytics & Stats
  const { data: analyticsData } = useQuery({
    queryKey: ['focus-analytics'],
    queryFn: () => api.getFocusAnalytics(),
    staleTime: 30000,
  });
  const analytics = analyticsData?.data || analyticsData || {
    todayFocusMinutes: 45,
    dailyTargetMinutes: 120,
    dailyTargetProgressPercent: 38,
    weekFocusMinutes: 270,
    completedSessionsCount: 3,
    interruptionCount: 1,
  };

  // 4. Fetch Tasks for dropdown selection
  const { data: tasksData } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => api.getTasks({ status: 'TODO' as any }),
    staleTime: 30000,
  });
  const tasks = Array.isArray(tasksData) ? tasksData : (tasksData as any)?.data || [];

  // Local seconds state derived from server
  const [displaySeconds, setDisplaySeconds] = useState<number>(() => {
    return preferences.focusDurationMinutes * 60;
  });

  // Sync display seconds with server remaining seconds
  useEffect(() => {
    if (activeSession && currentSessionInfo) {
      setDisplaySeconds(currentSessionInfo.remainingSeconds);
    } else {
      setDisplaySeconds(selectedDurationMins * 60);
    }
  }, [activeSession, currentSessionInfo, selectedDurationMins, preferences.focusDurationMinutes]);

  // Tick loop while active
  useEffect(() => {
    if (!activeSession || activeSession.status !== 'ACTIVE') return;

    const timer = setInterval(() => {
      setDisplaySeconds((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [activeSession]);

  const formatTimer = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Mutations
  const startMutation = useMutation({
    mutationFn: () =>
      api.startFocusSession({
        plannedDurationMinutes: selectedDurationMins,
        sessionType: 'FOCUS',
        taskId: selectedTaskId || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['focus-current'] });
      queryClient.invalidateQueries({ queryKey: ['focus-analytics'] });
      toast.info('Focus session started. Enter deep focus.');
    },
    onError: (err: any) => toast.error('Focus Start Failed', err?.message || 'Could not start session'),
  });

  const pauseMutation = useMutation({
    mutationFn: (id: string) => api.pauseFocusSession(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['focus-current'] });
      toast.warning('Session paused. Interruption logged.');
    },
    onError: (err: any) => toast.error('Pause Failed', err?.message),
  });

  const resumeMutation = useMutation({
    mutationFn: (id: string) => api.resumeFocusSession(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['focus-current'] });
      toast.info('Session resumed.');
    },
    onError: (err: any) => toast.error('Resume Failed', err?.message),
  });

  const completeMutation = useMutation({
    mutationFn: (id: string) => api.completeFocusSession(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['focus-current'] });
      queryClient.invalidateQueries({ queryKey: ['focus-analytics'] });
      queryClient.invalidateQueries({ queryKey: ['daily-kpi'] });
      toast.success('Focus Block Completed!', 'Session logged to daily productivity metrics.');
    },
    onError: (err: any) => toast.error('Complete Failed', err?.message),
  });

  const abandonMutation = useMutation({
    mutationFn: (id: string) => api.abandonFocusSession(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['focus-current'] });
      toast.info('Session discarded.');
    },
    onError: (err: any) => toast.error('Discard Failed', err?.message),
  });

  const isSessionActive = Boolean(activeSession && activeSession.status === 'ACTIVE');
  const isSessionPaused = Boolean(activeSession && activeSession.status === 'PAUSED');

  return (
    <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-[#E5E2F5] shadow-[0_4px_20px_rgba(139,69,245,0.035)] flex flex-col justify-between h-full overflow-hidden">
      {/* 1. Header */}
      <div className="flex items-center justify-between pb-2 border-b border-[#F0F2FA] shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#F4F3FF] border border-[#DDD8F8] flex items-center justify-center text-[#8B45F5] shadow-2xs">
            <Clock className="w-4 h-4 stroke-[2.2]" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-black text-[#202033] tracking-tight">
              Focus Studio & Deep Work
            </h3>
          </div>
          {isSessionActive && (
            <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-[#D1FADF] text-[#16A36A] animate-pulse">
              LIVE FOCUS
            </span>
          )}
          {isSessionPaused && (
            <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-[#FEF0C7] text-[#E5A12A]">
              PAUSED
            </span>
          )}
        </div>

        <button
          onClick={onOpenFullStudio}
          className="text-xs font-bold text-[#8B45F5] hover:text-[#6935C8] flex items-center gap-0.5 transition-colors"
        >
          <span>Studio</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 2. Core Grid: Left = Timer & Controls, Right = Velocity & Stats */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 py-2 flex-1 items-center">
        {/* Left Column (7 cols): Timer & Controls */}
        <div className="md:col-span-7 flex flex-col justify-between bg-gradient-to-b from-[#F4F3FF]/70 to-white rounded-xl p-3 border border-[#DDD8F8]/60">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#74738A]">
              {activeSession ? (activeSession.sessionType || 'DEEP WORK') : 'POMODORO TIMER'}
            </span>
            {!activeSession && (
              <div className="flex items-center gap-1">
                {[15, 25, 45].map((mins) => (
                  <button
                    key={mins}
                    onClick={() => setSelectedDurationMins(mins)}
                    className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition-colors ${
                      selectedDurationMins === mins
                        ? 'bg-[#8B45F5] text-white shadow-2xs'
                        : 'bg-white text-[#74738A] hover:bg-[#EDE9FE]'
                    }`}
                  >
                    {mins}m
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Large Countdown Display */}
          <div className="text-center my-2">
            <span className="text-3xl sm:text-4xl font-mono font-black text-[#202033] tracking-tight">
              {formatTimer(displaySeconds)}
            </span>
            <p className="text-[10px] text-[#74738A] mt-0.5 truncate max-w-[240px] mx-auto">
              {activeSession?.task?.title
                ? `Task: ${activeSession.task.title}`
                : selectedTaskId
                ? `Ready: ${tasks.find((t: any) => t.id === selectedTaskId)?.title || 'Selected task'}`
                : 'Select task or start freeform focus'}
            </p>
          </div>

          {/* Task Dropdown when Idle */}
          {!activeSession && tasks.length > 0 && (
            <select
              value={selectedTaskId}
              onChange={(e) => setSelectedTaskId(e.target.value)}
              className="w-full text-[11px] p-1.5 mb-2 bg-white border border-[#E5E2F5] rounded-lg text-[#202033] focus:outline-none focus:border-[#8B45F5]"
            >
              <option value="">Link to task (Optional)...</option>
              {tasks.slice(0, 6).map((t: any) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
          )}

          {/* Control Buttons */}
          <div className="flex items-center justify-center gap-2">
            {!activeSession ? (
              <button
                onClick={() => startMutation.mutate()}
                disabled={startMutation.isPending}
                className="w-full py-2 rounded-xl bg-gradient-to-r from-[#6935C8] to-[#8B45F5] hover:opacity-95 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-opacity"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Start Focus</span>
              </button>
            ) : (
              <>
                {isSessionActive ? (
                  <button
                    onClick={() => pauseMutation.mutate(activeSession.id)}
                    className="flex-1 py-1.5 rounded-xl border border-[#DDD8F8] bg-white hover:bg-[#F4F3FF] text-[#202033] font-bold text-xs flex items-center justify-center gap-1 shadow-2xs transition-colors"
                  >
                    <Pause className="w-3.5 h-3.5 fill-current text-[#E5A12A]" />
                    <span>Pause</span>
                  </button>
                ) : (
                  <button
                    onClick={() => resumeMutation.mutate(activeSession.id)}
                    className="flex-1 py-1.5 rounded-xl bg-[#8B45F5] hover:bg-[#7839D6] text-white font-bold text-xs flex items-center justify-center gap-1 shadow-2xs transition-colors"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Resume</span>
                  </button>
                )}

                <button
                  onClick={() => completeMutation.mutate(activeSession.id)}
                  className="flex-1 py-1.5 rounded-xl bg-[#16A36A] hover:bg-[#138959] text-white font-bold text-xs flex items-center justify-center gap-1 shadow-2xs transition-colors"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Finish</span>
                </button>

                <button
                  onClick={() => abandonMutation.mutate(activeSession.id)}
                  className="p-1.5 rounded-xl border border-red-200 text-[#E05268] hover:bg-red-50 transition-colors"
                  title="Discard Session"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Right Column (5 cols): Today's Focus Stats */}
        <div className="md:col-span-5 flex flex-col justify-between space-y-2 pl-0 md:pl-2">
          {/* Target Progress Card */}
          <div className="p-2.5 rounded-xl border border-[#E5E2F5] bg-[#F4F3FF]/40">
            <div className="flex items-center justify-between text-[11px] font-bold text-[#74738A]">
              <span>Daily Target</span>
              <span className="text-[#202033]">
                {analytics.todayFocusMinutes || 0}m / {analytics.dailyTargetMinutes || 120}m
              </span>
            </div>
            <div className="w-full bg-[#E5E2F5] h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className="bg-gradient-to-r from-[#6935C8] to-[#8B45F5] h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(100, Math.round(((analytics.todayFocusMinutes || 0) / (analytics.dailyTargetMinutes || 120)) * 100))}%`,
                }}
              />
            </div>
          </div>

          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2 rounded-xl border border-[#E5E2F5] bg-white">
              <span className="text-[10px] font-bold uppercase text-[#74738A] block">
                Sessions
              </span>
              <span className="text-lg font-black text-[#202033] mt-0.5 block">
                {analytics.completedSessionsCount || 0}
              </span>
              <span className="text-[9px] text-[#16A36A] font-semibold">Done today</span>
            </div>
            <div className="p-2 rounded-xl border border-[#E5E2F5] bg-white">
              <span className="text-[10px] font-bold uppercase text-[#74738A] block">
                Week Total
              </span>
              <span className="text-lg font-black text-[#8B45F5] mt-0.5 block">
                {Math.round((analytics.weekFocusMinutes || 0) / 60)}h
              </span>
              <span className="text-[9px] text-[#74738A]">Deep work</span>
            </div>
          </div>

          <div className="flex items-center justify-between text-[10px] text-[#74738A] pt-1 border-t border-[#F0F2FA]">
            <span>Interruptions: {analytics.interruptionCount || 0}</span>
            <span className="font-semibold text-[#8B45F5]">Sustainable Load</span>
          </div>
        </div>
      </div>
    </div>
  );
};
