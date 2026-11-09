'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  Maximize2,
  Minimize2,
  Sliders,
  Flame,
  Target,
  BarChart2,
  History,
  FolderKanban,
  CheckSquare,
  AlertCircle,
  Volume2,
  VolumeX,
} from 'lucide-react';

interface FocusStudioProps {
  tasks?: any[];
  projects?: any[];
  onCompleteTask?: (id: string) => void;
  onOpenCreateTask?: () => void;
}

export const FocusStudioWorkspace: React.FC<FocusStudioProps> = () => {
  const queryClient = useQueryClient();

  const [deepWorkMode, setDeepWorkMode] = useState(false);
  const [selectedTask, setSelectedTask] = useState<string>('');
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [sessionNotes, setSessionNotes] = useState<string>('');
  const [sessionType, setSessionType] = useState<'FOCUS' | 'SHORT_BREAK' | 'LONG_BREAK'>('FOCUS');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // 1. Queries
  const { data: prefData } = useQuery({
    queryKey: ['focus-preferences'],
    queryFn: () => api.getFocusPreferences(),
  });
  const preferences = prefData?.data || prefData || {
    focusDurationMinutes: 25,
    shortBreakMinutes: 5,
    longBreakMinutes: 15,
    dailyTargetMinutes: 120,
    soundEnabled: true,
  };

  const { data: currentData, refetch: refetchCurrent } = useQuery({
    queryKey: ['focus-current'],
    queryFn: () => api.getCurrentFocusSession(),
    refetchInterval: 5000,
  });
  const currentSessionInfo = currentData?.data !== undefined ? currentData.data : currentData;
  const activeSession = currentSessionInfo?.session;

  const { data: historyData } = useQuery({
    queryKey: ['focus-history'],
    queryFn: () => api.getFocusHistory(1, 10),
  });
  const history = historyData?.data?.sessions || historyData?.sessions || [];

  const { data: analyticsData } = useQuery({
    queryKey: ['focus-analytics'],
    queryFn: () => api.getFocusAnalytics(),
  });
  const analytics = analyticsData?.data || analyticsData || {
    todayFocusMinutes: 0,
    dailyTargetMinutes: 120,
    dailyTargetProgressPercent: 0,
    weekFocusMinutes: 0,
    completedSessionsCount: 0,
    interruptionCount: 0,
    recentDaysTrend: [],
  };

  const { data: tasksData } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => api.getTasks({ status: 'TODO' as any }),
  });
  const tasks = Array.isArray(tasksData) ? tasksData : (tasksData as any)?.data || [];

  const { data: projectsData } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.getProjects(),
  });
  const projects = Array.isArray(projectsData) ? projectsData : (projectsData as any)?.data || [];

  // Local seconds state derived from server
  const [displaySeconds, setDisplaySeconds] = useState<number>(() => {
    return preferences.focusDurationMinutes * 60;
  });

  // Keep display seconds in sync with active session or chosen tab
  useEffect(() => {
    if (activeSession) {
      if (currentSessionInfo) {
        setDisplaySeconds(currentSessionInfo.remainingSeconds);
      }
    } else {
      if (sessionType === 'FOCUS') setDisplaySeconds(preferences.focusDurationMinutes * 60);
      else if (sessionType === 'SHORT_BREAK') setDisplaySeconds(preferences.shortBreakMinutes * 60);
      else if (sessionType === 'LONG_BREAK') setDisplaySeconds(preferences.longBreakMinutes * 60);
    }
  }, [activeSession, sessionType, preferences, currentSessionInfo]);

  // Local tick loop
  useEffect(() => {
    if (!activeSession || activeSession.status !== 'ACTIVE') return;

    const timer = setInterval(() => {
      setDisplaySeconds((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [activeSession]);

  // Format mm:ss
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // 2. Mutations
  const startMutation = useMutation({
    mutationFn: (durationMins: number) =>
      api.startFocusSession({
        plannedDurationMinutes: durationMins,
        sessionType,
        taskId: selectedTask || undefined,
        projectId: selectedProject || undefined,
        notes: sessionNotes || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['focus-current'] });
      queryClient.invalidateQueries({ queryKey: ['focus-analytics'] });
      toast.info('Focus session started. Enter deep focus.');
    },
    onError: (err: any) => toast.error('Focus Start Failed', err?.message || 'Failed to start session'),
  });

  const pauseMutation = useMutation({
    mutationFn: (id: string) => api.pauseFocusSession(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['focus-current'] });
      toast.warning('Session paused. Interruption logged.');
    },
  });

  const resumeMutation = useMutation({
    mutationFn: (id: string) => api.resumeFocusSession(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['focus-current'] });
      toast.info('Session resumed. Welcome back.');
    },
  });

  const completeMutation = useMutation({
    mutationFn: (id: string) => api.completeFocusSession(id, sessionNotes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['focus-current'] });
      queryClient.invalidateQueries({ queryKey: ['focus-history'] });
      queryClient.invalidateQueries({ queryKey: ['focus-analytics'] });
      toast.success('Outstanding work! Focus session completed.');
      setSessionNotes('');
    },
  });

  const abandonMutation = useMutation({
    mutationFn: (id: string) => api.abandonFocusSession(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['focus-current'] });
      queryClient.invalidateQueries({ queryKey: ['focus-history'] });
      queryClient.invalidateQueries({ queryKey: ['focus-analytics'] });
      toast.warning('Session abandoned.');
    },
  });

  const updatePrefMutation = useMutation({
    mutationFn: (newPref: any) => api.updateFocusPreferences(newPref),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['focus-preferences'] });
      toast.success('Focus preferences updated.');
      setIsSettingsOpen(false);
    },
  });

  // Calculate Progress Percent for circular ring
  const plannedSecs = activeSession
    ? activeSession.plannedDuration
    : (sessionType === 'FOCUS'
        ? preferences.focusDurationMinutes
        : sessionType === 'SHORT_BREAK'
        ? preferences.shortBreakMinutes
        : preferences.longBreakMinutes) * 60;

  const elapsedSecs = plannedSecs - displaySeconds;
  const progressPercent = Math.min(100, Math.max(0, (elapsedSecs / plannedSecs) * 100));

  // Determine current active duration minutes to start
  const getSelectedDurationMinutes = () => {
    if (sessionType === 'FOCUS') return preferences.focusDurationMinutes;
    if (sessionType === 'SHORT_BREAK') return preferences.shortBreakMinutes;
    return preferences.longBreakMinutes;
  };

  return (
    <div
      className={`min-h-[85vh] transition-all duration-300 ${
        deepWorkMode
          ? 'fixed inset-0 z-50 bg-[#141226] text-white flex flex-col justify-center items-center p-6'
          : 'space-y-6 max-w-7xl mx-auto pb-12'
      }`}
    >
      {/* Top Header */}
      {!deepWorkMode && (
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#E5E2F5] shadow-xs">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-[#F4F3FF] text-[#8B45F5] rounded-xl">
                <Sparkles className="w-5 h-5" />
              </span>
              <h1 className="text-2xl font-bold text-[#202033]">Focus Studio & Deep Work</h1>
            </div>
            <p className="text-sm text-[#74738A] mt-1">
              Scientific Pomodoro flow, distraction-free execution, and real-time session tracking.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setDeepWorkMode(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[#F4F3FF] hover:bg-[#EAE9FF] text-[#6935C8] font-medium text-sm rounded-xl transition-colors border border-[#E5E2F5]"
            >
              <Maximize2 className="w-4 h-4" />
              <span>Deep Work Mode</span>
            </button>

            <button
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 text-[#74738A] hover:text-[#202033] hover:bg-[#F4F3FF] rounded-xl transition-colors border border-[#E5E2F5]"
              title="Focus Settings"
            >
              <Sliders className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Main Focus Area */}
      <div className={`grid ${deepWorkMode ? 'grid-cols-1 w-full max-w-2xl' : 'grid-cols-1 lg:grid-cols-12'} gap-6`}>
        {/* Left Column: Pomodoro Engine */}
        <div
          className={`${
            deepWorkMode
              ? 'col-span-1 bg-[#1E1B38] border border-[#3A3563] text-white'
              : 'lg:col-span-7 bg-white border border-[#E5E2F5]'
          } p-8 rounded-3xl shadow-xs flex flex-col items-center justify-center relative overflow-hidden`}
        >
          {deepWorkMode && (
            <button
              onClick={() => setDeepWorkMode(false)}
              className="absolute top-6 right-6 p-2 rounded-xl bg-[#2A264D] hover:bg-[#383363] text-gray-300 transition-colors"
              title="Exit Deep Work Mode"
            >
              <Minimize2 className="w-5 h-5" />
            </button>
          )}

          {/* Mode Switcher Tabs */}
          {!activeSession && (
            <div className="flex items-center gap-2 p-1.5 bg-[#F4F3FF] dark:bg-[#252244] rounded-2xl mb-8 border border-[#E5E2F5] dark:border-transparent">
              <button
                onClick={() => setSessionType('FOCUS')}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                  sessionType === 'FOCUS'
                    ? 'bg-[#8B45F5] text-white shadow-xs'
                    : 'text-[#74738A] hover:text-[#202033]'
                }`}
              >
                Focus ({preferences.focusDurationMinutes}m)
              </button>
              <button
                onClick={() => setSessionType('SHORT_BREAK')}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                  sessionType === 'SHORT_BREAK'
                    ? 'bg-[#8B45F5] text-white shadow-xs'
                    : 'text-[#74738A] hover:text-[#202033]'
                }`}
              >
                Short Break ({preferences.shortBreakMinutes}m)
              </button>
              <button
                onClick={() => setSessionType('LONG_BREAK')}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                  sessionType === 'LONG_BREAK'
                    ? 'bg-[#8B45F5] text-white shadow-xs'
                    : 'text-[#74738A] hover:text-[#202033]'
                }`}
              >
                Long Break ({preferences.longBreakMinutes}m)
              </button>
            </div>
          )}

          {/* Circular Countdown Ring */}
          <div className="relative w-64 h-64 md:w-80 md:h-80 flex items-center justify-center mb-8">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="44"
                className={`${deepWorkMode ? 'stroke-[#2D2854]' : 'stroke-[#F4F3FF]'}`}
                strokeWidth="6"
                fill="none"
              />
              <circle
                cx="50"
                cy="50"
                r="44"
                className="stroke-[#8B45F5] transition-all duration-1000 ease-linear"
                strokeWidth="6"
                strokeDasharray="276.46"
                strokeDashoffset={276.46 - (276.46 * progressPercent) / 100}
                strokeLinecap="round"
                fill="none"
              />
            </svg>

            <div className="absolute flex flex-col items-center">
              <span className="text-5xl md:text-6xl font-black tracking-tight font-mono">
                {formatTime(displaySeconds)}
              </span>
              <span
                className={`text-xs font-bold uppercase tracking-wider mt-2 px-3 py-1 rounded-full ${
                  activeSession?.status === 'ACTIVE'
                    ? 'bg-[#ECFDF5] text-[#16A36A]'
                    : activeSession?.status === 'PAUSED'
                    ? 'bg-[#FFFBEB] text-[#D97706]'
                    : 'bg-[#F4F3FF] text-[#8B45F5]'
                }`}
              >
                {activeSession ? activeSession.status : sessionType}
              </span>

              {activeSession?.task && (
                <span className="text-xs text-[#74738A] mt-2 max-w-[180px] truncate font-medium">
                  Task: {activeSession.task.title}
                </span>
              )}
            </div>
          </div>

          {/* Primary Action Controls */}
          <div className="flex items-center gap-4">
            {!activeSession ? (
              <button
                onClick={() => startMutation.mutate(getSelectedDurationMinutes())}
                disabled={startMutation.isPending}
                className="flex items-center gap-2.5 px-8 py-3.5 bg-[#8B45F5] hover:bg-[#7835DC] text-white rounded-2xl font-bold text-base shadow-md hover:shadow-lg transition-all transform active:scale-95"
              >
                <Play className="w-5 h-5 fill-current" />
                <span>Start Session</span>
              </button>
            ) : (
              <>
                {activeSession.status === 'ACTIVE' ? (
                  <button
                    onClick={() => pauseMutation.mutate(activeSession.id)}
                    className="flex items-center gap-2 px-6 py-3 bg-[#F4F3FF] hover:bg-[#EAE9FF] text-[#202033] rounded-2xl font-semibold text-sm transition-all border border-[#E5E2F5]"
                  >
                    <Pause className="w-4 h-4 fill-current" />
                    <span>Pause</span>
                  </button>
                ) : (
                  <button
                    onClick={() => resumeMutation.mutate(activeSession.id)}
                    className="flex items-center gap-2 px-6 py-3 bg-[#8B45F5] text-white rounded-2xl font-semibold text-sm shadow-xs hover:bg-[#7835DC] transition-all"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>Resume</span>
                  </button>
                )}

                <button
                  onClick={() => completeMutation.mutate(activeSession.id)}
                  className="flex items-center gap-2 px-6 py-3 bg-[#16A36A] hover:bg-[#14955F] text-white rounded-2xl font-semibold text-sm shadow-xs transition-all"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Finish</span>
                </button>

                <button
                  onClick={() => abandonMutation.mutate(activeSession.id)}
                  className="p-3 text-[#E05268] hover:bg-[#FFF1F2] rounded-2xl transition-colors border border-[#FFE4E6]"
                  title="Abandon Session"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </>
            )}
          </div>

          {/* Context Linking (Task / Project Selectors) */}
          {!activeSession && !deepWorkMode && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full mt-8 pt-6 border-t border-[#F0EDFD]">
              <div>
                <label className="text-xs font-semibold text-[#74738A] mb-1.5 flex items-center gap-1.5">
                  <CheckSquare className="w-3.5 h-3.5 text-[#8B45F5]" />
                  <span>Link to Task</span>
                </label>
                <select
                  value={selectedTask}
                  onChange={(e) => setSelectedTask(e.target.value)}
                  className="w-full text-xs bg-[#F9F9FB] border border-[#E5E2F5] rounded-xl px-3 py-2 text-[#202033] focus:outline-hidden focus:border-[#8B45F5]"
                >
                  <option value="">No task selected</option>
                  {tasks.map((t: any) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#74738A] mb-1.5 flex items-center gap-1.5">
                  <FolderKanban className="w-3.5 h-3.5 text-[#8B45F5]" />
                  <span>Link to Project</span>
                </label>
                <select
                  value={selectedProject}
                  onChange={(e) => setSelectedProject(e.target.value)}
                  className="w-full text-xs bg-[#F9F9FB] border border-[#E5E2F5] rounded-xl px-3 py-2 text-[#202033] focus:outline-hidden focus:border-[#8B45F5]"
                >
                  <option value="">No project selected</option>
                  {projects.map((p: any) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Targets, Analytics & Recent History */}
        {!deepWorkMode && (
          <div className="lg:col-span-5 space-y-6">
            {/* Daily Target Progress Card */}
            <div className="bg-white p-6 rounded-3xl border border-[#E5E2F5] shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-[#74738A] uppercase tracking-wider flex items-center gap-1.5">
                  <Target className="w-4 h-4 text-[#8B45F5]" />
                  Daily Focus Target
                </span>
                <span className="text-sm font-extrabold text-[#8B45F5]">
                  {analytics.todayFocusMinutes} / {analytics.dailyTargetMinutes}m
                </span>
              </div>

              <div className="w-full bg-[#F4F3FF] h-3 rounded-full overflow-hidden mb-3">
                <div
                  className="bg-linear-to-r from-[#8B45F5] to-[#6935C8] h-full rounded-full transition-all duration-500"
                  style={{ width: `${analytics.dailyTargetProgressPercent}%` }}
                />
              </div>

              <div className="flex justify-between items-center text-xs text-[#74738A]">
                <span>{analytics.dailyTargetProgressPercent}% achieved</span>
                <span>{Math.max(0, analytics.dailyTargetMinutes - analytics.todayFocusMinutes)}m remaining</span>
              </div>
            </div>

            {/* 7-Day Consistency Bar Chart */}
            <div className="bg-white p-6 rounded-3xl border border-[#E5E2F5] shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-[#D97706]" />
                  <h3 className="text-sm font-bold text-[#202033]">7-Day Consistency</h3>
                </div>
                <span className="text-xs text-[#74738A] font-medium">
                  {analytics.weekFocusMinutes}m total this week
                </span>
              </div>

              <div className="flex items-end justify-between h-28 pt-4 gap-2">
                {analytics.recentDaysTrend?.map((item: any, idx: number) => {
                  const maxMins = Math.max(120, ...analytics.recentDaysTrend.map((d: any) => d.minutes));
                  const heightPercent = Math.min(100, Math.round((item.minutes / maxMins) * 100));

                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-1.5">
                      <div className="w-full bg-[#F4F3FF] h-20 rounded-lg flex items-end overflow-hidden p-0.5">
                        <div
                          className={`w-full rounded-md transition-all duration-500 ${
                            item.minutes >= 60 ? 'bg-[#8B45F5]' : item.minutes > 0 ? 'bg-[#C4B5FD]' : 'bg-transparent'
                          }`}
                          style={{ height: `${heightPercent}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-semibold text-[#74738A]">{item.day}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Recent Sessions List */}
            <div className="bg-white p-6 rounded-3xl border border-[#E5E2F5] shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4 text-[#8B45F5]" />
                  <h3 className="text-sm font-bold text-[#202033]">Recent Sessions</h3>
                </div>
                <span className="text-xs text-[#74738A]">{history.length} logged</span>
              </div>

              <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                {history.length === 0 ? (
                  <p className="text-xs text-[#74738A] py-4 text-center">No focus sessions recorded yet.</p>
                ) : (
                  history.map((s: any) => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-[#F9F9FB] border border-[#F0EDFD] text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            s.status === 'COMPLETED' ? 'bg-[#16A36A]' : 'bg-[#E05268]'
                          }`}
                        />
                        <div>
                          <p className="font-semibold text-[#202033]">
                            {s.task?.title || s.sessionType}
                          </p>
                          <p className="text-[10px] text-[#74738A]">
                            {new Date(s.startedAt).toLocaleDateString([], {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="font-bold text-[#8B45F5]">
                          {Math.round(s.actualDuration / 60)}m
                        </span>
                        {s.interruptionCount > 0 && (
                          <p className="text-[9px] text-[#D97706]">{s.interruptionCount} pauses</p>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Focus Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-[#E5E2F5] shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#E5E2F5] pb-3">
              <h3 className="font-bold text-base text-[#202033]">Focus Settings</h3>
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-sm"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.target as HTMLFormElement;
                updatePrefMutation.mutate({
                  focusDurationMinutes: Number((form.elements.namedItem('focusMinutes') as HTMLInputElement).value),
                  shortBreakMinutes: Number((form.elements.namedItem('shortBreakMinutes') as HTMLInputElement).value),
                  longBreakMinutes: Number((form.elements.namedItem('longBreakMinutes') as HTMLInputElement).value),
                  dailyTargetMinutes: Number((form.elements.namedItem('dailyTarget') as HTMLInputElement).value),
                });
              }}
              className="space-y-4 text-xs"
            >
              <div>
                <label className="font-semibold text-[#202033] block mb-1">Focus Duration (minutes)</label>
                <input
                  name="focusMinutes"
                  type="number"
                  min="5"
                  max="120"
                  defaultValue={preferences.focusDurationMinutes}
                  className="w-full px-3 py-2 border border-[#E5E2F5] rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-[#202033] block mb-1">Short Break (m)</label>
                  <input
                    name="shortBreakMinutes"
                    type="number"
                    min="1"
                    max="30"
                    defaultValue={preferences.shortBreakMinutes}
                    className="w-full px-3 py-2 border border-[#E5E2F5] rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-semibold text-[#202033] block mb-1">Long Break (m)</label>
                  <input
                    name="longBreakMinutes"
                    type="number"
                    min="5"
                    max="60"
                    defaultValue={preferences.longBreakMinutes}
                    className="w-full px-3 py-2 border border-[#E5E2F5] rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-[#202033] block mb-1">Daily Target (minutes)</label>
                <input
                  name="dailyTarget"
                  type="number"
                  min="15"
                  max="600"
                  defaultValue={preferences.dailyTargetMinutes}
                  className="w-full px-3 py-2 border border-[#E5E2F5] rounded-xl"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsSettingsOpen(false)}
                  className="px-4 py-2 border border-[#E5E2F5] rounded-xl font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatePrefMutation.isPending}
                  className="px-5 py-2 bg-[#8B45F5] text-white rounded-xl font-bold hover:bg-[#7835DC]"
                >
                  Save Settings
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

