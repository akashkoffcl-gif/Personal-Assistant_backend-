'use client';

import React, { useState } from 'react';
import {
  Plus,
  Bell,
  BellRing,
  AlertTriangle,
  RefreshCw,
  Search,
  ChevronDown,
  Repeat,
  CheckCircle2,
  Calendar,
} from 'lucide-react';
import { NavTab } from './Sidebar';

interface HeaderProps {
  currentTab?: NavTab;
  onSelectTab?: (tab: NavTab) => void;
  onOpenCreateTask: () => void;
  onOpenCreateRoutine?: () => void;
  onOpenEmergency: () => void;
  isPushSubscribed: boolean;
  onTogglePush: () => void;
  pushLoading: boolean;
  pushMessage?: string | null;
  onRefresh: () => void;
  onSearchFocus?: () => void;
  searchQuery?: string;
  onSearchChange?: (val: string) => void;
  selectedDate?: string;
}

const TAB_TITLES: Record<NavTab, { title: string; category: string }> = {
  dashboard: { title: 'Command Center', category: 'Overview' },
  'my-day': { title: 'My Day', category: 'Overview' },
  work: { title: 'Work & Tasks', category: 'Productivity' },
  projects: { title: 'Projects Workspace', category: 'Productivity' },
  routines: { title: 'Habits & Routines', category: 'Productivity' },
  planning: { title: 'Day Planning', category: 'Productivity' },
  calendar: { title: 'Calendar Views', category: 'Productivity' },
  analytics: { title: 'Personal Productivity Analytics', category: 'Intelligence' },
  'usage-analytics': { title: 'Application Usage Analytics', category: 'Intelligence' },
  automation: { title: 'Automation Rules', category: 'Intelligence' },
  wellness: { title: 'Health & Wellness', category: 'Wellness' },
  emergency: { title: 'Emergency Replan', category: 'System' },
  settings: { title: 'System Settings', category: 'System' },
};

export function Header({
  currentTab = 'dashboard',
  onSelectTab,
  onOpenCreateTask,
  onOpenCreateRoutine,
  onOpenEmergency,
  isPushSubscribed,
  onTogglePush,
  pushLoading,
  pushMessage,
  onRefresh,
  onSearchFocus,
  searchQuery = '',
  onSearchChange,
  selectedDate,
}: HeaderProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);

  const handleRefreshClick = () => {
    setIsRefreshing(true);
    onRefresh();
    setTimeout(() => setIsRefreshing(false), 700);
  };

  const currentInfo = TAB_TITLES[currentTab] || { title: 'Dashboard', category: 'Workspace' };

  return (
    <header className="mb-6 z-30 select-none">
      <div className="bg-white rounded-2xl border border-[#E5E2F5] shadow-[0_4px_20px_rgba(139,69,245,0.05)] px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
        {/* =========================================================================
            LEFT: BREADCRUMB & WORKSPACE TITLE
           ========================================================================= */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-[#74738A] uppercase tracking-wider">
                {currentInfo.category}
              </span>
              <span className="text-[#E5E2F5]">•</span>
              <span className="text-[11px] font-medium text-[#8B45F5] flex items-center gap-1">
                <Calendar className="w-3 h-3 inline" />
                {selectedDate || 'Today'}
              </span>
            </div>
            <h1 className="text-base sm:text-lg font-extrabold text-[#202033] tracking-tight truncate">
              {currentInfo.title}
            </h1>
          </div>
        </div>

        {/* =========================================================================
            CENTER: GLOBAL SEARCH INPUT (⌘K)
           ========================================================================= */}
        <div className="hidden md:flex items-center flex-1 max-w-md mx-2">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-[#74738A] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search tasks, routines, projects, analytics... (⌘K)"
              value={searchQuery}
              onChange={(e) => onSearchChange?.(e.target.value)}
              onFocus={onSearchFocus}
              className="w-full pl-9 pr-12 py-1.5 text-xs bg-[#F4F3FF] border border-[#E5E2F5] rounded-xl text-[#202033] placeholder-[#74738A] focus:outline-none focus:ring-2 focus:ring-[#8B45F5]/30 focus:border-[#8B45F5] transition-all"
            />
            <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-[#74738A] bg-white border border-[#E5E2F5] px-1.5 py-0.5 rounded shadow-2xs">
              ⌘K
            </kbd>
          </div>
        </div>

        {/* =========================================================================
            RIGHT: CONTROLS & USER PROFILE
           ========================================================================= */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {/* Quick Add Button (+) with Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsQuickAddOpen(!isQuickAddOpen)}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl border border-[#E5E2F5] bg-[#F4F3FF] hover:bg-[#EDE9FE] text-[#202033] flex items-center justify-center font-bold shadow-2xs transition-all"
              title="Quick Add Task or Habit"
            >
              <Plus className="w-4 h-4 stroke-[2.5] text-[#8B45F5]" />
            </button>

            {isQuickAddOpen && (
              <div
                className="absolute right-0 mt-2 w-48 bg-white rounded-xl border border-[#E5E2F5] shadow-lg py-1.5 z-50 animate-fade-in"
                onMouseLeave={() => setIsQuickAddOpen(false)}
              >
                <button
                  onClick={() => {
                    setIsQuickAddOpen(false);
                    onOpenCreateTask();
                  }}
                  className="w-full text-left px-3.5 py-2 text-xs font-semibold text-[#202033] hover:bg-[#F4F3FF] flex items-center gap-2 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5 text-[#8B45F5]" />
                  <span>New Task</span>
                </button>
                {onOpenCreateRoutine && (
                  <button
                    onClick={() => {
                      setIsQuickAddOpen(false);
                      onOpenCreateRoutine();
                    }}
                    className="w-full text-left px-3.5 py-2 text-xs font-semibold text-[#202033] hover:bg-[#F4F3FF] flex items-center gap-2 transition-colors"
                  >
                    <Repeat className="w-3.5 h-3.5 text-[#E5A12A]" />
                    <span>Add Routine / Habit</span>
                  </button>
                )}
                <div className="border-t border-[#E5E2F5] my-1" />
                <button
                  onClick={() => {
                    setIsQuickAddOpen(false);
                    onOpenEmergency();
                  }}
                  className="w-full text-left px-3.5 py-2 text-xs font-semibold text-[#E05268] hover:bg-[#FFEAEF] flex items-center gap-2 transition-colors"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-[#E05268]" />
                  <span>Emergency Replan</span>
                </button>
              </div>
            )}
          </div>

          {/* Emergency Replan Button (Pill) */}
          <button
            onClick={onOpenEmergency}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FFEAEF] hover:bg-[#FED7DF] border border-[#FECDD6] text-[#E05268] text-xs font-bold transition-all shadow-2xs"
            title="Emergency Replanning"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Emergency Replan</span>
          </button>

          {/* Sync Refresh Button */}
          <button
            onClick={handleRefreshClick}
            disabled={isRefreshing}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl border border-[#E5E2F5] bg-white hover:bg-[#F4F3FF] text-[#74738A] hover:text-[#202033] flex items-center justify-center shadow-2xs transition-all disabled:opacity-50"
            title="Synchronize records with Supabase & Redis"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#8B45F5]' : ''}`}
            />
          </button>

          {/* Web Push Notification Toggle */}
          <button
            onClick={onTogglePush}
            disabled={pushLoading}
            className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl border border-[#E5E2F5] bg-white hover:bg-[#F4F3FF] flex items-center justify-center shadow-2xs transition-all relative ${
              isPushSubscribed ? 'text-[#8B45F5]' : 'text-[#74738A]'
            }`}
            title={pushMessage || (isPushSubscribed ? 'Push Notifications Active' : 'Enable Web Push')}
          >
            {isPushSubscribed ? (
              <BellRing className="w-4 h-4 text-[#8B45F5]" />
            ) : (
              <Bell className="w-4 h-4 text-[#74738A]" />
            )}
            {isPushSubscribed && (
              <span className="w-1.5 h-1.5 rounded-full bg-[#16A36A] absolute top-2 right-2" />
            )}
          </button>

          {/* User Profile Pill */}
          <div className="flex items-center gap-2 pl-1 border-l border-[#E5E2F5]">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#6935C8] to-[#8B45F5] flex items-center justify-center text-xs font-bold text-white shrink-0 shadow-2xs">
              SK
            </div>
            <div className="hidden xl:block text-left min-w-0">
              <span className="text-xs font-bold text-[#202033] block leading-tight truncate">
                Selma Knight
              </span>
              <span className="text-[10px] text-[#74738A] font-medium block leading-tight truncate">
                selma@gmail.com
              </span>
            </div>
            <ChevronDown className="w-3 h-3 text-[#74738A] hidden xl:block" />
          </div>
        </div>
      </div>
    </header>
  );
}
