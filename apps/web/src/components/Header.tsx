'use client';

import React from 'react';
import { Plus, Bell, BellRing, AlertOctagon, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';

interface HeaderProps {
  onOpenCreateTask: () => void;
  onOpenEmergency: () => void;
  isPushSubscribed: boolean;
  onTogglePush: () => void;
  pushLoading: boolean;
  pushMessage?: string | null;
  onRefresh: () => void;
}

export function Header({
  onOpenCreateTask,
  onOpenEmergency,
  isPushSubscribed,
  onTogglePush,
  pushLoading,
  pushMessage,
  onRefresh,
}: HeaderProps) {
  const today = new Date();

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 px-4 sm:px-6 py-3.5 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg sm:text-xl font-bold text-assistant-navy">Daily Assistant</h2>
            <span className="hidden sm:inline-flex text-xs px-2 py-0.5 rounded-full bg-assistant-paleSky text-assistant-navy font-medium border border-sky-200">
              {format(today, 'EEEE, MMM d, yyyy')}
            </span>
          </div>
          <p className="text-xs text-assistant-coolGrey mt-0.5">
            Synchronized with Supabase & Redis Outbox
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Refresh Data */}
          <button
            onClick={onRefresh}
            className="p-2 text-slate-500 hover:text-assistant-navy hover:bg-slate-100 rounded-lg transition-colors"
            title="Refresh dashboard records"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {/* Web Push Notification Toggle */}
          <button
            onClick={onTogglePush}
            disabled={pushLoading}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              isPushSubscribed
                ? 'bg-emerald-50 border-emerald-200 text-assistant-green hover:bg-emerald-100'
                : 'bg-slate-50 border-slate-200 text-assistant-coolGrey hover:bg-slate-100'
            }`}
            title={pushMessage || (isPushSubscribed ? 'Notifications Active' : 'Enable Web Push')}
          >
            {isPushSubscribed ? <BellRing className="w-3.5 h-3.5 text-assistant-green" /> : <Bell className="w-3.5 h-3.5" />}
            <span className="hidden md:inline">{isPushSubscribed ? 'Push Active' : 'Enable Push'}</span>
          </button>

          {/* Emergency Trigger */}
          <button
            onClick={onOpenEmergency}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-assistant-red text-white hover:bg-red-700 transition-colors shadow-sm"
          >
            <AlertOctagon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Emergency Replan</span>
            <span className="sm:hidden">Urgent</span>
          </button>

          {/* Quick Add Task */}
          <button
            onClick={onOpenCreateTask}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-assistant-sky text-assistant-navy hover:bg-sky-400 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span className="hidden sm:inline">New Task</span>
          </button>
        </div>
      </div>
    </header>
  );
}
