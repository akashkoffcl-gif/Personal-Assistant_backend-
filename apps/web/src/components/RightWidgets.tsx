'use client';

import React, { useState } from 'react';
import {
  Clock,
  Star,
  Bell,
  BellRing,
  Droplet,
  Send,
  Coffee,
  Play,
  RotateCcw,
  Smile,
} from 'lucide-react';
import { TaskDto, WellnessSummaryDto, Priority } from '@assistant/shared';

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
    <div className="space-y-3.5">
      {/* 1. Hydration Tracker Widget */}
      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <div className="p-1 rounded-md bg-blue-50 text-blue-600">
              <Droplet className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Hydration Tracker
              </h4>
              <p className="text-[11px] text-slate-500">Target: {targetWater} ml</p>
            </div>
          </div>
          <span className="text-xs font-semibold text-blue-700 px-2 py-0.5 rounded bg-blue-50 border border-blue-200">
            {currentWater} / {targetWater} ml ({waterPercent}%)
          </span>
        </div>

        {/* Clean Progress Gauge */}
        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden mb-3">
          <div
            className="h-full rounded-full bg-blue-600 transition-all duration-500"
            style={{ width: `${Math.max(4, waterPercent)}%` }}
          />
        </div>

        {/* Quick Add Buttons */}
        <div className="grid grid-cols-4 gap-1.5">
          <button
            onClick={() => onLogHydration(250)}
            className="px-2 py-1 rounded-md bg-white hover:bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 transition-colors text-center shadow-2xs"
          >
            +250ml
          </button>
          <button
            onClick={() => onLogHydration(500)}
            className="px-2 py-1 rounded-md bg-white hover:bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 transition-colors text-center shadow-2xs"
          >
            +500ml
          </button>
          <button
            onClick={() => onLogHydration(750)}
            className="px-2 py-1 rounded-md bg-white hover:bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 transition-colors text-center shadow-2xs"
          >
            +750ml
          </button>
          <button
            onClick={() => onLogHydration(-250)}
            disabled={currentWater < 250}
            className="px-2 py-1 rounded-md bg-white hover:bg-slate-50 border border-slate-200 text-xs font-medium text-slate-500 hover:text-red-600 transition-colors text-center disabled:opacity-40"
          >
            -250ml
          </button>
        </div>
      </div>

      {/* 2. Instant Check-in Widget */}
      {onQuickCheckIn && (
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="p-1 rounded-md bg-amber-50 text-amber-600">
                <Smile className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Instant Check-in
              </h4>
            </div>
            <span className="text-[11px] text-slate-400">1-Tap Log</span>
          </div>

          <p className="text-xs text-slate-500 mb-2.5">
            Log current energy & mental focus level:
          </p>

          <div className="grid grid-cols-5 gap-1.5">
            {[
              { val: 5, emoji: '⚡', label: 'Peak' },
              { val: 4, emoji: '😊', label: 'Good' },
              { val: 3, emoji: '🧘', label: 'Flow' },
              { val: 2, emoji: '🥱', label: 'Tired' },
              { val: 1, emoji: '😫', label: 'Low' },
            ].map((btn) => (
              <button
                key={btn.val}
                onClick={() => onQuickCheckIn(btn.val, btn.val)}
                className="flex flex-col items-center justify-center p-1.5 rounded-md border border-slate-200 hover:border-blue-500 hover:bg-blue-50/30 transition-colors"
                title={`Log ${btn.label} (Score: ${btn.val}/5)`}
              >
                <span className="text-sm">{btn.emoji}</span>
                <span className="text-[10px] font-semibold text-slate-700 mt-0.5">{btn.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 3. Focus Timer Widget */}
      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="p-1 rounded-md bg-slate-100 text-slate-700">
              <Clock className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Focus & Recharge
            </h4>
          </div>
          <span
            className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
              timerRunning ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-600'
            }`}
          >
            {timerRunning ? (timerType === 'focus' ? 'Focusing' : 'Break') : 'Idle'}
          </span>
        </div>

        {/* Timer Display */}
        <div className="text-center py-1.5 mb-2.5">
          <span className="text-2xl font-bold font-mono text-slate-900">
            {formatTimer(timerSeconds)}
          </span>
        </div>

        {/* Timer Control Buttons */}
        <div className="flex items-center gap-2">
          {!timerRunning ? (
            <>
              <button
                onClick={() => handleStartTimer('focus')}
                className="flex-1 py-1.5 px-3 rounded-md text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors flex items-center justify-center gap-1.5 shadow-xs"
              >
                <Play className="w-3 h-3 fill-current" />
                25m Focus
              </button>
              <button
                onClick={() => handleStartTimer('break')}
                className="py-1.5 px-3 rounded-md text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 transition-colors flex items-center gap-1"
              >
                <Coffee className="w-3 h-3 text-slate-500" />
                5m Break
              </button>
            </>
          ) : (
            <button
              onClick={() => {
                setTimerRunning(false);
                setTimerSeconds(25 * 60);
              }}
              className="w-full py-1.5 px-3 rounded-md text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 transition-colors flex items-center justify-center gap-1.5"
            >
              <RotateCcw className="w-3 h-3" />
              Reset Session
            </button>
          )}
        </div>
      </div>

      {/* 4. Priority Queue */}
      {topPriorities.length > 0 && (
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Priority Action Queue
              </h4>
            </div>
            <span className="text-[10px] font-semibold text-red-700 px-1.5 py-0.5 rounded bg-red-50 border border-red-200">
              {topPriorities.length} Tasks
            </span>
          </div>

          <div className="space-y-1.5">
            {topPriorities.map((task) => (
              <div
                key={task.id}
                className="p-2 rounded-lg border border-slate-200 bg-slate-50/50 flex items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-900 truncate">{task.title}</p>
                  <p className="text-[10px] text-slate-500">
                    {task.estimatedDurationMinutes ? `${task.estimatedDurationMinutes}m • ` : ''}
                    Priority: {task.priority}
                  </p>
                </div>
                <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-red-50 text-red-700 uppercase">
                  {task.priority}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. Notification Dispatcher Status */}
      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-2">
            {isPushSubscribed ? (
              <BellRing className="w-4 h-4 text-emerald-600" />
            ) : (
              <Bell className="w-4 h-4 text-slate-400" />
            )}
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Push Delivery
            </h4>
          </div>
          <span
            className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
              isPushSubscribed ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
            }`}
          >
            {isPushSubscribed ? 'Active' : 'Disabled'}
          </span>
        </div>

        <p className="text-xs text-slate-500 mb-2.5">
          {isPushSubscribed
            ? 'Web Push active for schedule reminders & emergencies.'
            : 'Push notifications are currently turned off.'}
        </p>

        {isPushSubscribed && (
          <button
            onClick={onTestPush}
            disabled={pushLoading}
            className="w-full py-1.5 px-3 rounded-md text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 transition-colors flex items-center justify-center gap-1.5 shadow-2xs"
          >
            <Send className="w-3.5 h-3.5 text-blue-600" />
            <span>Test Push Delivery</span>
          </button>
        )}
      </div>
    </div>
  );
}
