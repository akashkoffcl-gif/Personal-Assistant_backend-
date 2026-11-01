'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  LayoutDashboard,
  CalendarCheck,
  Briefcase,
  FolderKanban,
  Repeat,
  CalendarDays,
  Calendar,
  BarChart3,
  Activity,
  Cpu,
  HeartPulse,
  Settings,
  AlertTriangle,
  Plus,
  RefreshCw,
  Bell,
  BellRing,
  Search,
  ChevronDown,
  Menu,
  X,
  Sparkles,
  Download,
} from 'lucide-react';

export type NavTab =
  | 'dashboard'
  | 'my-day'
  | 'projects'
  | 'routines'
  | 'work'
  | 'planning'
  | 'emergency'
  | 'wellness'
  | 'analytics'
  | 'usage-analytics'
  | 'calendar'
  | 'automation'
  | 'settings';

export interface HorizontalNavbarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
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

interface NavItem {
  id: NavTab;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  badgeColor?: string;
}

export function HorizontalNavbar({
  currentTab,
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
}: HorizontalNavbarProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const quickAddRef = useRef<HTMLDivElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (quickAddRef.current && !quickAddRef.current.contains(event.target as Node)) {
        setIsQuickAddOpen(false);
      }
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setIsMoreMenuOpen(false);
      }
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleRefreshClick = () => {
    setIsRefreshing(true);
    onRefresh();
    setTimeout(() => setIsRefreshing(false), 700);
  };

  // Primary 6 navigation items always visible on desktop (lg+)
  const primaryNavItems: NavItem[] = [
    { id: 'dashboard', label: 'Command Center', shortLabel: 'Dashboard', icon: LayoutDashboard },
    { id: 'my-day', label: 'My Day', shortLabel: 'My Day', icon: CalendarCheck },
    { id: 'work', label: 'Tasks', shortLabel: 'Tasks', icon: Briefcase },
    { id: 'projects', label: 'Projects', shortLabel: 'Projects', icon: FolderKanban },
    { id: 'routines', label: 'Routines', shortLabel: 'Routines', icon: Repeat },
    { id: 'planning', label: 'Planning', shortLabel: 'Planning', icon: CalendarDays },
  ];

  // Secondary items in the "More" dropdown
  const secondaryNavItems: NavItem[] = [
    { id: 'calendar', label: 'Calendar Views', shortLabel: 'Calendar', icon: Calendar },
    { id: 'analytics', label: 'Personal Analytics', shortLabel: 'Analytics', icon: BarChart3 },
    { id: 'usage-analytics', label: 'App Usage Analytics', shortLabel: 'App Usage', icon: Activity, badge: 'New', badgeColor: 'bg-[#8B45F5] text-white' },
    { id: 'automation', label: 'Automation Rules', shortLabel: 'Automation', icon: Cpu },
    { id: 'wellness', label: 'Health & Wellness', shortLabel: 'Wellness', icon: HeartPulse },
  ];

  // All 11 navigation modules for mobile drawer
  const allModules = [...primaryNavItems, ...secondaryNavItems];

  // Check if an item inside the "More" dropdown is currently active
  const isSecondaryActive = secondaryNavItems.some((item) => item.id === currentTab);
  const activeSecondaryItem = secondaryNavItems.find((item) => item.id === currentTab);

  return (
    <header className="sticky top-0 z-40 select-none mb-6">
      <div className="bg-white rounded-2xl border border-[#E5E2F5] shadow-[0_4px_24px_rgba(139,69,245,0.06)] px-3 sm:px-5 lg:px-6 py-2.5 sm:py-3 flex items-center justify-between gap-2.5 sm:gap-4 h-[68px] sm:h-[72px]">
        {/* =========================================================================
            LEFT SECTION: PRODUCT LOGO & IDENTITY
           ========================================================================= */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Mobile hamburger menu toggle */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden w-9 h-9 rounded-xl border border-[#E5E2F5] bg-[#F4F3FF] hover:bg-[#EDE9FE] text-[#202033] flex items-center justify-center transition-colors"
            aria-label="Toggle navigation menu"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5 text-[#8B45F5]" /> : <Menu className="w-5 h-5 text-[#202033]" />}
          </button>

          <button
            onClick={() => onSelectTab('dashboard')}
            className="flex items-center gap-2 sm:gap-2.5 text-left group focus:outline-none"
            title="Go to Command Center"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-[#6935C8] to-[#8B45F5] flex items-center justify-center text-white font-extrabold text-base sm:text-lg shadow-2xs group-hover:scale-105 transition-transform shrink-0">
              M
            </div>
            <div className="hidden sm:block min-w-0">
              <span className="text-sm sm:text-base font-extrabold text-[#18181B] tracking-tight block leading-tight truncate">
                Personal Assistant
              </span>
              <span className="text-[10px] sm:text-[11px] text-[#717182] font-semibold block leading-tight truncate">
                Lavender Enterprise
              </span>
            </div>
          </button>
        </div>

        {/* =========================================================================
            CENTER SECTION: HORIZONTAL ICON + TEXT NAVIGATION
           ========================================================================= */}
        <nav
          className="hidden lg:flex items-center gap-1 flex-1 justify-center min-w-0"
          aria-label="Main Navigation"
        >
          {/* Primary items */}
          {primaryNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`flex items-center gap-1.5 px-3 xl:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-[#18181B] text-white shadow-xs'
                    : 'text-[#717182] hover:text-[#18181B] hover:bg-[#F4F4FD]'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white stroke-[2.4]' : 'text-[#717182]'}`} />
                <span className="hidden 2xl:inline">{item.label}</span>
                <span className="2xl:hidden">{item.shortLabel}</span>
              </button>
            );
          })}

          {/* "More ▾" Dropdown Menu for secondary items */}
          <div className="relative" ref={moreMenuRef}>
            <button
              onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
              className={`flex items-center gap-1 px-3 xl:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                isSecondaryActive
                  ? 'bg-[#18181B] text-white shadow-xs'
                  : 'text-[#717182] hover:text-[#18181B] hover:bg-[#F4F4FD]'
              }`}
              title="More workspace modules"
              aria-haspopup="true"
              aria-expanded={isMoreMenuOpen}
            >
              <span>{isSecondaryActive ? activeSecondaryItem?.shortLabel || 'More' : 'More'}</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isMoreMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {isMoreMenuOpen && (
              <div className="absolute left-1/2 -translate-x-1/2 mt-2 w-56 bg-white rounded-2xl border border-[#E5E2F5] shadow-[0_10px_35px_rgba(139,69,245,0.12)] p-2 z-50 animate-fade-in">
                <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#74738A]">
                  Workspaces & Intelligence
                </div>
                {secondaryNavItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentTab === item.id;

                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        onSelectTab(item.id);
                        setIsMoreMenuOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                        isActive
                          ? 'bg-[#18181B] text-white font-bold shadow-xs'
                          : 'text-[#202033] hover:bg-[#F4F3FF] hover:text-[#6935C8]'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-[#74738A]'}`} />
                        <span>{item.label}</span>
                      </div>
                      {item.badge && (
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                            isActive ? 'bg-white/20 text-white' : item.badgeColor || 'bg-[#EDE9FE] text-[#6935C8]'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </nav>

        {/* =========================================================================
            RIGHT SECTION: SEARCH, ACTIONS, SYNC, PROFILE
           ========================================================================= */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {/* Global Search Input (2xl+ wide) */}
          <div className="relative hidden 2xl:block w-44">
            <Search className="w-3.5 h-3.5 text-[#717182] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search (⌘K)..."
              value={searchQuery}
              onChange={(e) => onSearchChange?.(e.target.value)}
              onFocus={onSearchFocus}
              className="w-full pl-8 pr-10 py-1.5 text-xs bg-[#F4F4FD] border border-[#E5E2F5] rounded-xl text-[#18181B] placeholder-[#717182] focus:outline-none focus:ring-2 focus:ring-[#8B45F5]/30 focus:border-[#8B45F5] transition-all"
            />
            <kbd className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-bold text-[#717182] bg-white border border-[#E5E2F5] px-1 py-0.2 rounded shadow-2xs pointer-events-none">
              ⌘K
            </kbd>
          </div>

          {/* Compact Search Trigger button (< 2xl) */}
          <button
            onClick={onSearchFocus}
            className="hidden sm:flex 2xl:hidden w-9 h-9 rounded-full border border-[#E5E2F5] bg-white hover:bg-[#F4F4FD] text-[#717182] hover:text-[#18181B] items-center justify-center transition-colors shadow-2xs"
            title="Search tasks, routines, projects (⌘K)"
            aria-label="Search"
          >
            <Search className="w-4 h-4 text-[#717182]" />
          </button>

          {/* Quick Add Button (+) with context dropdown */}
          <div className="relative" ref={quickAddRef}>
            <button
              onClick={() => setIsQuickAddOpen(!isQuickAddOpen)}
              className="w-9 h-9 rounded-full border border-[#E5E2F5] bg-white hover:bg-[#F4F4FD] text-[#18181B] flex items-center justify-center font-bold shadow-2xs transition-all"
              title="Quick Add Task or Habit"
              aria-label="Quick Add Menu"
            >
              <Plus className="w-4 h-4 stroke-[2.5] text-[#18181B]" />
            </button>

            {isQuickAddOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl border border-[#E5E2F5] shadow-[0_10px_35px_rgba(139,69,245,0.12)] p-1.5 z-50 animate-fade-in">
                <button
                  onClick={() => {
                    setIsQuickAddOpen(false);
                    onOpenCreateTask();
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-semibold text-[#18181B] hover:bg-[#F4F4FD] hover:text-[#6935C8] rounded-xl flex items-center gap-2 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5 text-[#18181B]" />
                  <span>New Task</span>
                </button>
                {onOpenCreateRoutine && (
                  <button
                    onClick={() => {
                      setIsQuickAddOpen(false);
                      onOpenCreateRoutine();
                    }}
                    className="w-full text-left px-3 py-2 text-xs font-semibold text-[#18181B] hover:bg-[#F4F4FD] hover:text-[#E5A12A] rounded-xl flex items-center gap-2 transition-colors"
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
                  className="w-full text-left px-3 py-2 text-xs font-semibold text-[#E05268] hover:bg-[#FFEAEF] rounded-xl flex items-center gap-2 transition-colors"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-[#E05268]" />
                  <span>Emergency Replan</span>
                </button>
              </div>
            )}
          </div>

          {/* Emergency Replan Button (Desktop shortcut on wide displays) */}
          <button
            onClick={onOpenEmergency}
            className="hidden 2xl:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FFEAEF] hover:bg-[#FED7DF] border border-[#FECDD6] text-[#E05268] text-xs font-bold transition-all shadow-2xs"
            title="Emergency Replanning"
          >
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span className="whitespace-nowrap">Emergency Replan</span>
          </button>

          {/* Web Push Notification Toggle */}
          <button
            onClick={onTogglePush}
            disabled={pushLoading}
            className={`w-9 h-9 rounded-full border border-[#E5E2F5] bg-white hover:bg-[#F4F4FD] flex items-center justify-center shadow-2xs transition-all relative ${
              isPushSubscribed ? 'text-[#8B45F5]' : 'text-[#717182]'
            }`}
            title={pushMessage || (isPushSubscribed ? 'Push Notifications Active' : 'Enable Web Push')}
            aria-label="Push Notifications"
          >
            {isPushSubscribed ? <BellRing className="w-4 h-4 text-[#8B45F5]" /> : <Bell className="w-4 h-4 text-[#18181B]" />}
            {isPushSubscribed && (
              <span className="w-1.5 h-1.5 rounded-full bg-[#16A36A] absolute top-2 right-2" />
            )}
          </button>

          {/* Sync Refresh Button */}
          <button
            onClick={handleRefreshClick}
            disabled={isRefreshing}
            className="w-9 h-9 rounded-full border border-[#E5E2F5] bg-white hover:bg-[#F4F4FD] text-[#717182] hover:text-[#18181B] flex items-center justify-center shadow-2xs transition-all disabled:opacity-50"
            title="Synchronize records with Supabase & Redis"
            aria-label="Refresh Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#8B45F5]' : ''}`} />
          </button>

          {/* Profile Dropdown */}
          <div className="relative" ref={profileMenuRef}>
            <button
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              className="flex items-center gap-2 pl-1 sm:pl-2 border-l border-[#E5E2F5] focus:outline-none"
              aria-label="User profile menu"
            >
              <div className="w-9 h-9 rounded-full bg-[#E8E5FA] border border-[#DDD8F5] flex items-center justify-center overflow-hidden shrink-0 shadow-2xs text-[#6935C8] font-bold text-xs">
                <span className="text-sm select-none">👩‍💼</span>
              </div>
              <div className="hidden lg:block text-left min-w-0">
                <span className="text-xs font-bold text-[#18181B] block leading-tight truncate">
                  Selma Knight
                </span>
                <span className="text-[10px] text-[#717182] font-medium block leading-tight truncate">
                  selma@gmail.com
                </span>
              </div>
              <ChevronDown className="w-3 h-3 text-[#717182] hidden lg:block" />
            </button>

            {isProfileMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl border border-[#E5E2F5] shadow-[0_10px_35px_rgba(139,69,245,0.12)] p-2 z-50 animate-fade-in">
                <div className="px-3 py-2 border-b border-[#E5E2F5] mb-1">
                  <div className="font-extrabold text-xs text-[#202033]">Selma Knight</div>
                  <div className="text-[11px] text-[#74738A]">selma@gmail.com</div>
                  <div className="mt-1 text-[10px] font-bold text-[#16A36A] flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#16A36A]" /> Supabase Live Synced
                  </div>
                </div>

                <button
                  onClick={() => {
                    onSelectTab('settings');
                    setIsProfileMenuOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors ${
                    currentTab === 'settings'
                      ? 'bg-[#8B45F5] text-white font-bold'
                      : 'text-[#202033] hover:bg-[#F4F3FF] hover:text-[#6935C8]'
                  }`}
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span>System Settings</span>
                </button>

                <button
                  onClick={() => {
                    onSelectTab('emergency');
                    setIsProfileMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-[#E05268] hover:bg-[#FFEAEF] flex items-center gap-2 transition-colors"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Emergency Replan</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* =========================================================================
          MOBILE / TABLET EXPANDED NAVIGATION DRAWER (< 1024px)
         ========================================================================= */}
      {isMobileMenuOpen && (
        <div className="lg:hidden mt-2 bg-white rounded-2xl border border-[#E5E2F5] shadow-[0_12px_40px_rgba(139,69,245,0.15)] p-4 animate-fade-in">
          {/* Mobile Search input */}
          <div className="relative mb-3">
            <Search className="w-4 h-4 text-[#74738A] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search tasks, routines, projects..."
              value={searchQuery}
              onChange={(e) => onSearchChange?.(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-[#F4F3FF] border border-[#E5E2F5] rounded-xl text-[#202033] placeholder-[#74738A] focus:outline-none focus:border-[#8B45F5]"
            />
          </div>

          <div className="text-[10px] font-bold uppercase tracking-wider text-[#74738A] mb-2 px-1">
            Workspaces & Modules
          </div>

          {/* Full grid of all 11 modules */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 mb-3">
            {allModules.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onSelectTab(item.id);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all text-left ${
                    isActive
                      ? 'bg-[#8B45F5] text-white shadow-2xs'
                      : 'text-[#202033] bg-[#F4F3FF] hover:bg-[#EDE9FE]'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-white' : 'text-[#74738A]'}`} />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* Quick Actions in Mobile Menu */}
          <div className="pt-2 border-t border-[#E5E2F5] flex items-center justify-between gap-2">
            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                onOpenCreateTask();
              }}
              className="flex-1 py-2 px-3 rounded-xl bg-[#8B45F5] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Task</span>
            </button>
            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                onOpenEmergency();
              }}
              className="flex-1 py-2 px-3 rounded-xl bg-[#FFEAEF] border border-[#FECDD6] text-[#E05268] text-xs font-bold flex items-center justify-center gap-1.5"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Emergency</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
