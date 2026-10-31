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
  LayoutDashboard,
  CalendarDays,
  Repeat,
  Briefcase,
  FolderKanban,
  BarChart3,
  HeartPulse,
  Settings,
  ChevronDown,
  Sparkles,
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
}

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
}: HeaderProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  const handleRefreshClick = () => {
    setIsRefreshing(true);
    onRefresh();
    setTimeout(() => setIsRefreshing(false), 700);
  };

  // Main navigation pill links matching reference
  const pillNavItems: Array<{ id: NavTab; label: string; icon: any }> = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'work', label: 'Report', icon: Briefcase },
    { id: 'analytics', label: 'AI Analytic', icon: BarChart3 },
    { id: 'my-day', label: 'Schedule', icon: CalendarDays },
  ];

  // Extended workspaces dropdown items
  const extendedItems: Array<{ id: NavTab; label: string }> = [
    { id: 'routines', label: 'Habits & Routines' },
    { id: 'projects', label: 'Projects Workspace' },
    { id: 'planning', label: 'Day Planning' },
    { id: 'wellness', label: 'Health & Wellness' },
    { id: 'calendar', label: 'Calendar Views' },
    { id: 'automation', label: 'Automation Rules' },
    { id: 'settings', label: 'System Settings' },
  ];

  return (
    <header className="mb-6 z-30 select-none">
      <div className="bg-white rounded-[26px] border border-[#E8EAF5] shadow-[0_8px_30px_rgb(24,27,46,0.035)] px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4">
        {/* =========================================================================
            LEFT: BRAND / LOGO (Letter badge + Name)
           ========================================================================= */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-[#EDE9FE] text-[#7C3AED] flex items-center justify-center font-extrabold text-base sm:text-lg shadow-2xs select-none">
            M
          </div>
          <span className="text-base sm:text-lg font-extrabold text-[#18181B] tracking-tight">
            Marketer
          </span>
        </div>

        {/* =========================================================================
            CENTER: FLOATING PILL TABS (Dashboard, Report, AI Analytic, Schedule)
           ========================================================================= */}
        <nav className="hidden md:flex items-center gap-1.5 lg:gap-2">
          {pillNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onSelectTab?.(item.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs lg:text-sm font-semibold transition-all ${
                  isActive
                    ? 'bg-[#18181B] text-white shadow-xs'
                    : 'text-[#717182] hover:text-[#18181B] hover:bg-[#F4F4FD]'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-[#717182]'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}

          {/* Extended tabs dropdown for Routines, Projects, Wellness, Settings */}
          <div className="relative">
            <button
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              className={`flex items-center gap-1 px-3 py-2 rounded-full text-xs lg:text-sm font-semibold transition-all ${
                extendedItems.some((e) => e.id === currentTab)
                  ? 'bg-[#F4F4FD] text-[#7C3AED]'
                  : 'text-[#717182] hover:text-[#18181B] hover:bg-[#F4F4FD]'
              }`}
            >
              <span>Workspaces</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>

            {isProfileMenuOpen && (
              <div
                className="absolute left-0 mt-2 w-48 bg-white rounded-2xl border border-[#E8EAF5] shadow-lg py-2 z-50 animate-fade-in"
                onMouseLeave={() => setIsProfileMenuOpen(false)}
              >
                {extendedItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      onSelectTab?.(item.id);
                      setIsProfileMenuOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-xs font-semibold hover:bg-[#F4F4FD] transition-colors ${
                      currentTab === item.id ? 'text-[#7C3AED] bg-[#F4F4FD]' : 'text-[#18181B]'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </nav>

        {/* =========================================================================
            RIGHT: QUICK ACTION (+), NOTIFICATION (🔔), PROFILE AVATAR
           ========================================================================= */}
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
          {/* Quick Add Button (+) with Action Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsQuickAddOpen(!isQuickAddOpen)}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full border border-[#E8EAF5] bg-white hover:bg-[#F4F4FD] text-[#18181B] flex items-center justify-center font-bold text-lg shadow-2xs transition-all"
              title="Quick Add Task or Habit"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
            </button>

            {isQuickAddOpen && (
              <div
                className="absolute right-0 mt-2 w-48 bg-white rounded-2xl border border-[#E8EAF5] shadow-lg py-2 z-50 animate-fade-in"
                onMouseLeave={() => setIsQuickAddOpen(false)}
              >
                <button
                  onClick={() => {
                    setIsQuickAddOpen(false);
                    onOpenCreateTask();
                  }}
                  className="w-full text-left px-4 py-2 text-xs font-semibold text-[#18181B] hover:bg-[#F4F4FD] flex items-center gap-2"
                >
                  <Plus className="w-3.5 h-3.5 text-[#7C3AED]" />
                  <span>New Task</span>
                </button>
                {onOpenCreateRoutine && (
                  <button
                    onClick={() => {
                      setIsQuickAddOpen(false);
                      onOpenCreateRoutine();
                    }}
                    className="w-full text-left px-4 py-2 text-xs font-semibold text-[#18181B] hover:bg-[#F4F4FD] flex items-center gap-2"
                  >
                    <Repeat className="w-3.5 h-3.5 text-amber-500" />
                    <span>Add Routine / Habit</span>
                  </button>
                )}
                <button
                  onClick={() => {
                    setIsQuickAddOpen(false);
                    onOpenEmergency();
                  }}
                  className="w-full text-left px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 flex items-center gap-2"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                  <span>Emergency Replan</span>
                </button>
              </div>
            )}
          </div>

          {/* Sync Refresh Button */}
          <button
            onClick={handleRefreshClick}
            disabled={isRefreshing}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full border border-[#E8EAF5] bg-white hover:bg-[#F4F4FD] text-[#717182] hover:text-[#18181B] flex items-center justify-center shadow-2xs transition-all disabled:opacity-50"
            title="Synchronize records with Supabase & Redis"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#7C3AED]' : ''}`}
            />
          </button>

          {/* Notification Bell (🔔) */}
          <button
            onClick={onTogglePush}
            disabled={pushLoading}
            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full border border-[#E8EAF5] bg-white hover:bg-[#F4F4FD] flex items-center justify-center shadow-2xs transition-all relative ${
              isPushSubscribed ? 'text-[#7C3AED]' : 'text-[#717182]'
            }`}
            title={pushMessage || (isPushSubscribed ? 'Push Notifications Active' : 'Enable Web Push')}
          >
            {isPushSubscribed ? (
              <BellRing className="w-4 h-4 text-[#7C3AED]" />
            ) : (
              <Bell className="w-4 h-4 text-[#717182]" />
            )}
            {isPushSubscribed && (
              <span className="w-1.5 h-1.5 rounded-full bg-[#FF647C] absolute top-2 right-2.5" />
            )}
          </button>

          {/* User Profile Pill matching reference image */}
          <div className="flex items-center gap-2 sm:gap-2.5 pl-1 sm:pl-2">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#FF647C]/15 border border-[#FF647C]/30 flex items-center justify-center text-sm font-bold text-[#FF647C] shrink-0 overflow-hidden select-none">
              👩‍🦰
            </div>
            <div className="hidden sm:block text-left min-w-0">
              <span className="text-xs font-bold text-[#18181B] block leading-tight truncate">
                Selma Knight
              </span>
              <span className="text-[10px] text-[#717182] font-medium block leading-tight truncate">
                selma@gmail.com
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-[#717182] hidden sm:block" />
          </div>
        </div>
      </div>
    </header>
  );
}
