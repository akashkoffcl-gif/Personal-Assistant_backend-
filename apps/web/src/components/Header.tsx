'use client';

import React, { useState } from 'react';
import {
  Plus,
  Bell,
  BellRing,
  AlertTriangle,
  RefreshCw,
  Search,
  Command,
} from 'lucide-react';
import { format } from 'date-fns';

interface HeaderProps {
  onOpenCreateTask: () => void;
  onOpenEmergency: () => void;
  isPushSubscribed: boolean;
  onTogglePush: () => void;
  pushLoading: boolean;
  pushMessage?: string | null;
  onRefresh: () => void;
  onSearchFocus?: () => void;
}

export function Header({
  onOpenCreateTask,
  onOpenEmergency,
  isPushSubscribed,
  onTogglePush,
  pushLoading,
  pushMessage,
  onRefresh,
  onSearchFocus,
}: HeaderProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const today = new Date();

  const handleRefreshClick = () => {
    setIsRefreshing(true);
    onRefresh();
    setTimeout(() => setIsRefreshing(false), 700);
  };

  return (
    <header className="sticky top-0 z-30 px-4 sm:px-6 py-2.5 bg-white border-b border-slate-200">
      <div className="flex items-center justify-between gap-4">
        {/* Left: Branding & Date Context */}
        <div className="flex items-center gap-3 min-w-0">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                Command Center
              </h2>
              <span className="hidden sm:inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                {format(today, 'EEE, MMM d, yyyy')}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 hidden md:block">
              Task, Routine & Operational Overview
            </p>
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Universal Search Trigger */}
          {onSearchFocus && (
            <button
              onClick={onSearchFocus}
              className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-500 hover:bg-white hover:text-slate-800 hover:border-slate-300 transition-colors shadow-2xs"
              title="Search tasks and projects (Ctrl + K)"
            >
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <span>Search tasks, projects...</span>
              <kbd className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono text-slate-500 bg-white rounded border border-slate-200">
                <Command className="w-2.5 h-2.5" /> K
              </kbd>
            </button>
          )}

          {/* Sync / Refresh Button */}
          <button
            onClick={handleRefreshClick}
            disabled={isRefreshing}
            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors disabled:opacity-50"
            title="Synchronize records with Supabase & Redis"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`}
            />
          </button>

          {/* Web Push Notification Toggle */}
          <button
            onClick={onTogglePush}
            disabled={pushLoading}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              isPushSubscribed
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-white text-slate-600 hover:bg-slate-50 border-slate-200'
            }`}
            title={pushMessage || (isPushSubscribed ? 'Web Push Active' : 'Enable Web Push')}
          >
            {isPushSubscribed ? (
              <>
                <BellRing className="w-3.5 h-3.5 text-emerald-600" />
                <span className="hidden sm:inline">Push Active</span>
              </>
            ) : (
              <>
                <Bell className="w-3.5 h-3.5 text-slate-400" />
                <span className="hidden sm:inline">Enable Push</span>
              </>
            )}
          </button>

          {/* Emergency Replan Button */}
          <button
            onClick={onOpenEmergency}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 transition-colors"
            title="Auto-rearrange flexible schedule around an urgent event"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
            <span className="hidden sm:inline">Emergency Replan</span>
            <span className="sm:hidden">Emergency</span>
          </button>

          {/* New Task Button */}
          <button
            onClick={onOpenCreateTask}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors shadow-xs"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>New Task</span>
          </button>
        </div>
      </div>
    </header>
  );
}
