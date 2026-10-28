'use client';

import React from 'react';
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
  pushLoading,
}: RightWidgetsProps) {
  const topPriorities = tasks
    .filter((t) => (t.priority === Priority.HIGH || t.priority === Priority.URGENT) && t.status !== 'COMPLETED')
    .slice(0, 3);

  const upcomingTasks = tasks
    .filter((t) => t.status !== 'COMPLETED' && t.scheduledStartTime)
    .slice(0, 3);

  return (
    <div className="space-y-4">
      {/* 1. Quick Actions */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4">
        <div className="flex items-center gap-2 mb-3">
          <Zap className="w-4 h-4 text-assistant-sky" />
          <h4 className="text-xs font-bold text-assistant-navy uppercase tracking-wider">Quick Actions</h4>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={onOpenCreateTask}
            className="flex items-center justify-center gap-1.5 p-2 rounded-lg bg-assistant-paleSky hover:bg-sky-100 text-assistant-navy text-xs font-semibold transition-colors border border-sky-200"
          >
            <Plus className="w-3.5 h-3.5 text-assistant-sky stroke-[2.5]" />
            <span>New Task</span>
          </button>
          <button
            onClick={onOpenEmergency}
            className="flex items-center justify-center gap-1.5 p-2 rounded-lg bg-red-50 hover:bg-red-100 text-assistant-red text-xs font-semibold transition-colors border border-red-200"
          >
            <span>🚨 Emergency</span>
          </button>
          <button
            onClick={() => onLogHydration(250)}
            className="flex items-center justify-center gap-1.5 p-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-medium transition-colors border border-slate-200 col-span-2"
          >
            <Droplet className="w-3.5 h-3.5 text-assistant-sky" />
            <span>Quick Log: +250ml Water</span>
          </button>
        </div>
      </div>

      {/* 2. Notification Status */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {isPushSubscribed ? (
              <BellRing className="w-4 h-4 text-assistant-green" />
            ) : (
              <Bell className="w-4 h-4 text-assistant-coolGrey" />
            )}
            <h4 className="text-xs font-bold text-assistant-navy uppercase tracking-wider">
              Push Delivery
            </h4>
          </div>
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              isPushSubscribed ? 'bg-emerald-100 text-assistant-green' : 'bg-slate-100 text-slate-500'
            }`}
          >
            {isPushSubscribed ? 'Active' : 'Disabled'}
          </span>
        </div>
        <p className="text-[11px] text-assistant-coolGrey mb-3">
          {isPushSubscribed
            ? 'Background BullMQ jobs & browser push active on this device.'
            : 'Enable browser notifications in the top bar to receive reminders.'}
        </p>
        <button
          onClick={onTestPush}
          disabled={pushLoading}
          className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-assistant-navy transition-colors"
        >
          <Send className="w-3 h-3 text-assistant-sky" />
          <span>{pushLoading ? 'Sending...' : 'Test Push Notification'}</span>
        </button>
      </div>

      {/* 3. Top Priorities */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4">
        <div className="flex items-center gap-2 mb-3">
          <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
          <h4 className="text-xs font-bold text-assistant-navy uppercase tracking-wider">Top Priorities</h4>
        </div>
        {topPriorities.length === 0 ? (
          <p className="text-xs text-assistant-coolGrey">No urgent priorities pending.</p>
        ) : (
          <div className="space-y-2">
            {topPriorities.map((task) => (
              <div
                key={task.id}
                className="p-2 rounded-lg bg-amber-50/50 border border-amber-200/70 text-xs"
              >
                <p className="font-semibold text-assistant-navy truncate">{task.title}</p>
                <p className="text-[11px] text-amber-700 mt-0.5">
                  {task.category} • {task.priority} Priority
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. Today's Wellness Summary */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4">
        <div className="flex items-center gap-2 mb-3">
          <Heart className="w-4 h-4 text-assistant-red" />
          <h4 className="text-xs font-bold text-assistant-navy uppercase tracking-wider">
            Today's Wellness
          </h4>
        </div>
        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
            <span className="flex items-center gap-1.5 text-slate-600">
              <Droplet className="w-3.5 h-3.5 text-assistant-sky" /> Hydration
            </span>
            <span className="font-bold text-assistant-navy">
              {wellness?.hydrationTotalMl || 0} ml
            </span>
          </div>

          <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
            <span className="flex items-center gap-1.5 text-slate-600">
              <Dumbbell className="w-3.5 h-3.5 text-assistant-green" /> Exercise
            </span>
            <span className="font-bold text-assistant-navy">
              {wellness?.exerciseDurationMinutes || 0} min
            </span>
          </div>

          <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
            <span className="flex items-center gap-1.5 text-slate-600">
              <Moon className="w-3.5 h-3.5 text-indigo-500" /> Sleep
            </span>
            <span className="font-bold text-assistant-navy">
              {wellness?.sleepHours || 0} hrs
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
