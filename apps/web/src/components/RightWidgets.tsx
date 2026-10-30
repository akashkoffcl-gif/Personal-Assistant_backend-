'use client';

import React, { useState } from 'react';
import {
  Zap,
  Star,
  Clock,
  Heart,
  Bell,
  BellRing,
  Droplet,
  Dumbbell,
  Moon,
  Plus,
  Send,
  Coffee,
  Play,
  RotateCcw,
  Sparkles,
  Smile,
  AlertTriangle,
} from 'lucide-react';
import { TaskDto, WellnessSummaryDto, Priority } from '@assistant/shared';
import { format } from 'date-fns';

interface RightWidgetsProps {
  tasks: TaskDto[];
  wellness?: WellnessSummaryDto;
  isPushSubscribed: boolean;
  onTestPush: () => void;
  onOpenCreateTask: () => void;
  onOpenEmergency: () => void;
  onLogHydration: (amount: number) => void;
  onQuickCheckIn?: (energy: number, mood: number) => void;
  onLogBreak?: () => void;
  pushLoading?: boolean;
}

export function RightWidgets({
  tasks,
  wellness,
  isPushSubscribed,
  onTestPush,
  onOpenCreateTask,
  onOpenEmergency,
  onLogHydration,
  onQuickCheckIn,
  onLogBreak,
  pushLoading,
}: RightWidgetsProps) {
  const [timerSeconds, setTimerSeconds] = useState(25 * 60);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerType, setTimerType] = useState<'focus' | 'break'>('focus');

  // Hydration calculations
  const currentWater = wellness?.hydrationTotalMl || 0;
  const targetWater = 2500;
  const waterPercent = Math.min(100, Math.round((currentWater / targetWater) * 100));

  const topPriorities = tasks
    .filter(
      (t) =>
        (t.priority === Priority.HIGH || t.priority === Priority.URGENT) &&
        t.status !== 'COMPLETED',
    )
    .slice(0, 3);

  // Focus Timer controls
  React.useEffect(() => {
    let interval: any;
    if (timerRunning && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev - 1);
      }, 1000);
    } else if (timerSeconds === 0 && timerRunning) {
      setTimerRunning(false);
      if (timerType === 'focus' && onLogBreak) {
        onLogBreak();
      }
    }
    return () => clearInterval(interval);
  }, [timerRunning, timerSeconds, timerType, onLogBreak]);

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleStartTimer = (type: 'focus' | 'break') => {
    setTimerType(type);
    setTimerSeconds(type === 'focus' ? 25 * 60 : 5 * 60);
    setTimerRunning(true);
  };

  return (
    <div className="space-y-4">
      {/* 1. Interactive Hydration Visualizer Widget */}
      <div className="glass-panel rounded-2xl p-4 sm:p-5 border border-white/80 shadow-glass">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-sky-500/15 text-sky-600 border border-sky-300/60 shadow-xs">
              <Droplet className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Hydration Tracker
              </h4>
              <p className="text-[11px] text-slate-500 font-medium">Daily Target: {targetWater} ml</p>
            </div>
          </div>
          <span className="text-xs font-black text-sky-600 px-2 py-0.5 rounded-full bg-sky-500/10 border border-sky-200">
            {waterPercent}%
          </span>
        </div>

        {/* Visual Animated Fluid Gauge */}
        <div className="relative w-full h-8 bg-slate-200/50 rounded-xl overflow-hidden border border-sky-200/50 mb-3 shadow-inner">
          <div
            className="absolute top-0 left-0 bottom-0 bg-gradient-to-r from-sky-400 via-sky-500 to-cyan-400 transition-all duration-700 ease-out shadow-glass-glow flex items-center justify-end pr-2"
            style={{ width: `${Math.max(6, waterPercent)}%` }}
          >
            {waterPercent >= 20 && (
              <span className="text-[10px] font-bold text-white tracking-wide">
                {currentWater} ml
              </span>
            )}
          </div>
          {waterPercent < 20 && (
            <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-slate-500">
              {currentWater} / {targetWater} ml
            </div>
          )}
        </div>

        {/* Interactive Quick Add Buttons */}
        <div className="grid grid-cols-4 gap-1.5">
          <button
            onClick={() => onLogHydration(250)}
            className="px-2 py-1.5 rounded-xl glass-card text-xs font-bold text-sky-700 hover:bg-sky-500/15 hover:border-sky-300 transition-all text-center shadow-xs"
            title="Log single cup of water"
          >
            +250ml
          </button>
          <button
            onClick={() => onLogHydration(500)}
            className="px-2 py-1.5 rounded-xl glass-card text-xs font-bold text-sky-700 hover:bg-sky-500/15 hover:border-sky-300 transition-all text-center shadow-xs"
            title="Log standard water bottle"
          >
            +500ml
          </button>
          <button
            onClick={() => onLogHydration(750)}
            className="px-2 py-1.5 rounded-xl glass-card text-xs font-bold text-sky-700 hover:bg-sky-500/15 hover:border-sky-300 transition-all text-center shadow-xs"
            title="Log large canteen"
          >
            +750ml
          </button>
          <button
            onClick={() => onLogHydration(-250)}
            disabled={currentWater < 250}
            className="px-2 py-1.5 rounded-xl glass-card text-xs font-medium text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all text-center disabled:opacity-30 shadow-xs"
            title="Undo last log"
          >
            -250ml
          </button>
        </div>
      </div>

      {/* 2. Interactive Energy & Mood Check-in Widget */}
      {onQuickCheckIn && (
        <div className="glass-panel rounded-2xl p-4 sm:p-5 border border-white/80 shadow-glass">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-xl bg-amber-500/15 text-amber-600 border border-amber-300/60 shadow-xs">
                <Smile className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Instant Check-in
              </h4>
            </div>
            <span className="text-[10px] text-slate-400 font-medium">1-Tap Log</span>
          </div>

          <p className="text-xs text-slate-500 mb-3 font-medium">
            How are your mental energy & focus levels right now?
          </p>

          <div className="grid grid-cols-5 gap-1">
            {[
              { val: 5, emoji: '⚡', label: 'Peak', color: 'hover:border-amber-400 hover:bg-amber-50' },
              { val: 4, emoji: '😊', label: 'Good', color: 'hover:border-emerald-400 hover:bg-emerald-50' },
              { val: 3, emoji: '🧘', label: 'Flow', color: 'hover:border-sky-400 hover:bg-sky-50' },
              { val: 2, emoji: '🥱', label: 'Tired', color: 'hover:border-purple-400 hover:bg-purple-50' },
              { val: 1, emoji: '😫', label: 'Stress', color: 'hover:border-rose-400 hover:bg-rose-50' },
            ].map((btn) => (
              <button
                key={btn.val}
                onClick={() => onQuickCheckIn(btn.val, btn.val)}
                className={`flex flex-col items-center justify-center p-2 rounded-xl glass-card transition-all hover:scale-105 active:scale-95 shadow-xs ${btn.color}`}
                title={`Log ${btn.label} (Score: ${btn.val}/5)`}
              >
                <span className="text-base">{btn.emoji}</span>
                <span className="text-[10px] font-bold text-slate-600 mt-0.5">{btn.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 3. Interactive Focus & Recharge Timer Widget */}
      <div className="glass-panel rounded-2xl p-4 sm:p-5 border border-white/80 shadow-glass">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-purple-500/15 text-purple-600 border border-purple-300/60 shadow-xs">
              <Clock className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Focus & Recharge
            </h4>
          </div>
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              timerRunning
                ? 'bg-emerald-500/20 text-emerald-700 animate-pulse'
                : 'bg-slate-200/60 text-slate-600'
            }`}
          >
            {timerRunning ? (timerType === 'focus' ? 'Focusing' : 'Resting') : 'Idle'}
          </span>
        </div>

        {/* Timer Display */}
        <div className="text-center py-2 mb-3">
          <span className="text-3xl font-black font-mono tracking-tight text-slate-900">
            {formatTimer(timerSeconds)}
          </span>
        </div>

        {/* Timer Control Buttons */}
        <div className="flex items-center gap-2">
          {!timerRunning ? (
            <>
              <button
                onClick={() => handleStartTimer('focus')}
                className="flex-1 py-1.5 px-3 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 transition-all shadow-glass-glow flex items-center justify-center gap-1.5"
              >
                <Play className="w-3 h-3 fill-current" />
                25m Focus
              </button>
              <button
                onClick={() => handleStartTimer('break')}
                className="py-1.5 px-3 rounded-xl text-xs font-bold glass-card text-purple-700 hover:bg-purple-50 hover:border-purple-300 transition-all flex items-center gap-1 shadow-xs"
              >
                <Coffee className="w-3 h-3 text-purple-500" />
                5m Break
              </button>
            </>
          ) : (
            <button
              onClick={() => {
                setTimerRunning(false);
                setTimerSeconds(25 * 60);
              }}
              className="w-full py-1.5 px-3 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-all flex items-center justify-center gap-1.5"
            >
              <RotateCcw className="w-3 h-3" />
              Reset Session
            </button>
          )}
        </div>
      </div>

      {/* 4. Top Urgent / High Priority Tasks Strip */}
      {topPriorities.length > 0 && (
        <div className="glass-panel rounded-2xl p-4 sm:p-5 border border-white/80 shadow-glass">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Priority Action Queue
              </h4>
            </div>
            <span className="text-[10px] font-bold text-rose-600 px-2 py-0.5 rounded-full bg-rose-50 border border-rose-200">
              {topPriorities.length} Needs Attention
            </span>
          </div>

          <div className="space-y-2">
            {topPriorities.map((task) => (
              <div
                key={task.id}
                className="p-2.5 rounded-xl glass-card border border-amber-200/60 flex items-center justify-between gap-2 shadow-xs"
              >
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900 truncate">{task.title}</p>
                  <p className="text-[10px] text-slate-500 font-medium">
                    {task.estimatedDurationMinutes ? `${task.estimatedDurationMinutes}m • ` : ''}
                    Priority: {task.priority}
                  </p>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 uppercase">
                  {task.priority}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. Notification Dispatcher Status */}
      <div className="glass-panel rounded-2xl p-4 sm:p-5 border border-white/80 shadow-glass">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {isPushSubscribed ? (
              <BellRing className="w-4 h-4 text-emerald-600 animate-pulse" />
            ) : (
              <Bell className="w-4 h-4 text-slate-400" />
            )}
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Push Notification Delivery
            </h4>
          </div>
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              isPushSubscribed
                ? 'bg-emerald-500/15 text-emerald-700 border border-emerald-300/60'
                : 'bg-slate-200/60 text-slate-600'
            }`}
          >
            {isPushSubscribed ? 'Active' : 'Disabled'}
          </span>
        </div>

        <p className="text-xs text-slate-500 mb-3 font-medium">
          {isPushSubscribed
            ? 'Web Push subscriptions active for reminders & emergencies.'
            : 'Push notifications are currently turned off.'}
        </p>

        {isPushSubscribed && (
          <button
            onClick={onTestPush}
            disabled={pushLoading}
            className="w-full py-1.5 px-3 rounded-xl text-xs font-bold glass-card text-slate-700 hover:text-emerald-700 hover:border-emerald-300 transition-all flex items-center justify-center gap-1.5 shadow-xs"
          >
            <Send className="w-3.5 h-3.5 text-emerald-500" />
            <span>Test Web Push Notification</span>
          </button>
        )}
      </div>
    </div>
  );
}
