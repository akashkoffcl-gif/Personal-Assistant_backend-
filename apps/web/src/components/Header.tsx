'use client';

import React, { useState } from 'react';
import {
  Plus,
  Bell,
  BellRing,
  AlertOctagon,
  RefreshCw,
  Search,
  Sparkles,
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
    <header className="sticky top-0 z-30 px-4 sm:px-6 py-3 glass-panel border-b border-white/70 shadow-glass backdrop-blur-xl">
      <div className="flex items-center justify-between gap-4">
        {/* Left: Branding & Date Badge */}
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-extrabold tracking-tight bg-gradient-to-r from-slate-900 via-assistant-navy to-slate-800 bg-clip-text text-transparent">
                Command Center
              </h2>
              <span className="hidden sm:inline-flex items-center gap-1.5 text-xs px-2.5 py-0.5 rounded-full glass-pill text-slate-700 font-semibold border border-white/80 shadow-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {format(today, 'EEEE, MMM d')}
              </span>
            </div>
            <p className="text-[11px] text-assistant-coolGrey font-medium hidden md:block">
              Intelligent Task, Routine & Wellness Ecosystem
            </p>
          </div>
        </div>

        {/* Center/Right: Interactive Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Quick Search Trigger */}
          {onSearchFocus && (
            <button
              onClick={onSearchFocus}
              className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl glass-input text-xs text-slate-500 hover:text-slate-800 hover:border-sky-300 transition-all cursor-pointer shadow-xs group"
              title="Quick Search (Ctrl + K)"
            >
              <Search className="w-3.5 h-3.5 text-slate-400 group-hover:text-assistant-sky transition-colors" />
              <span>Search tasks, projects...</span>
              <kbd className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-slate-500 bg-white/80 rounded border border-slate-200 shadow-2xs">
                <Command className="w-2.5 h-2.5" /> K
              </kbd>
            </button>
          )}

          {/* Refresh Data Button with Spin Animation */}
          <button
            onClick={handleRefreshClick}
            disabled={isRefreshing}
            className="p-2 text-slate-600 hover:text-assistant-navy glass-card rounded-xl transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
            title="Synchronize records with Supabase & Redis"
          >
            <RefreshCw
              className={`w-4 h-4 transition-transform ${isRefreshing ? 'animate-spin text-assistant-sky' : ''}`}
            />
          </button>

          {/* Web Push Notification Toggle with Glowing Beacon */}
          <button
            onClick={onTogglePush}
            disabled={pushLoading}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all hover:scale-[1.02] active:scale-95 border ${
              isPushSubscribed
                ? 'bg-emerald-500/10 text-emerald-700 border-emerald-300/60 shadow-glass-glow-emerald backdrop-blur-md'
                : 'glass-card text-slate-600 hover:text-slate-900 border-white/80'
            }`}
            title={pushMessage || (isPushSubscribed ? 'Web Push Active' : 'Enable Web Push')}
          >
            {isPushSubscribed ? (
              <>
                <BellRing className="w-3.5 h-3.5 text-emerald-600 animate-bounce" />
                <span className="hidden sm:inline">Push Active</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
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
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-rose-500 to-red-600 text-white hover:from-rose-600 hover:to-red-700 transition-all hover:scale-[1.02] active:scale-95 shadow-glass-glow-rose border border-rose-400/40"
            title="Auto-rearrange schedule around an urgent event"
          >
            <AlertOctagon className="w-3.5 h-3.5 animate-pulse" />
            <span className="hidden sm:inline">Emergency Replan</span>
            <span className="sm:hidden">Emergency</span>
          </button>

          {/* Quick Add Task Button */}
          <button
            onClick={onOpenCreateTask}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold text-slate-900 glass-button-primary border border-sky-300/60 shadow-glass-glow"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>New Task</span>
          </button>
        </div>
      </div>
    </header>
  );
}
