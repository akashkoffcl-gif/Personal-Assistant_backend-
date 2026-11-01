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
  LogOut,
  User as UserIcon,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

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
  onOpenNotifications?: () => void;
  unreadNotificationsCount?: number;
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
  onOpenNotifications,
  unreadNotificationsCount = 0,
}: HorizontalNavbarProps) {
  const { user, profile, logout } = useAuth();
  const displayName = profile?.fullName || user?.user_metadata?.full_name || (user?.email ? user.email.split('@')[0] : 'User');
  const displayEmail = profile?.email || user?.email || 'user@assistant.local';
  const initial = displayName.charAt(0).toUpperCase() || 'U';

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

  // Primary navigation items always visible on desktop (lg+)
  const primaryNavItems: (NavItem & { hideOnCompact?: boolean })[] = [
    { id: 'dashboard', label: 'Command Center', shortLabel: 'Command Center', icon: LayoutDashboard },
    { id: 'my-day', label: 'My Day', shortLabel: 'My Day', icon: CalendarCheck },
    { id: 'work', label: 'Tasks', shortLabel: 'Tasks', icon: Briefcase },
    { id: 'projects', label: 'Projects', shortLabel: 'Projects', icon: FolderKanban },
    { id: 'routines', label: 'Routines', shortLabel: 'Routines', icon: Repeat },
    { id: 'planning', label: 'Planning', shortLabel: 'Planning', icon: CalendarDays },
    { id: 'calendar', label: 'Calendar', shortLabel: 'Calendar', icon: Calendar, hideOnCompact: true },
    { id: 'analytics', label: 'Analytics', shortLabel: 'Analytics', icon: BarChart3, hideOnCompact: true },
  ];

  // Secondary items in the "More" dropdown
  const secondaryNavItems: (NavItem & { hideOnWide?: boolean })[] = [
    { id: 'calendar', label: 'Calendar', shortLabel: 'Calendar', icon: Calendar, hideOnWide: true },
    { id: 'analytics', label: 'Analytics', shortLabel: 'Analytics', icon: BarChart3, hideOnWide: true },
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
    <header className="sticky top-0 z-40 select-none">
      <div className="bg-white rounded-2xl border border-[#E5E2F5] shadow-[0_4px_24px_rgba(139,69,245,0.06)] px-3 sm:px-4 lg:px-5 py-1.5 flex items-center justify-between gap-2 sm:gap-3 h-[52px] sm:h-[56px]">
        {/* =========================================================================
            LEFT SECTION: PRODUCT LOGO & IDENTITY
           ========================================================================= */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 min-w-[190px]">
          {/* Mobile hamburger menu toggle */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden w-8 h-8 rounded-xl border border-[#E5E2F5] bg-[#F4F3FF] hover:bg-[#EDE9FE] text-[#202033] flex items-center justify-center transition-colors"
            aria-label="Toggle navigation menu"
          >
            {isMobileMenuOpen ? <X className="w-4 h-4 text-[#8B45F5]" /> : <Menu className="w-4 h-4 text-[#202033]" />}
          </button>

          <button
            onClick={() => onSelectTab('dashboard')}
            className="flex items-center gap-2 sm:gap-2.5 text-left group focus:outline-none shrink-0"
            title="Go to Command Center"
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-[#6935C8] to-[#8B45F5] flex items-center justify-center text-white font-extrabold text-sm sm:text-base shadow-2xs group-hover:scale-105 transition-transform shrink-0">
              M
            </div>
            <div className="hidden sm:block shrink-0">
              <span className="text-xs sm:text-sm font-extrabold text-[#18181B] tracking-tight block leading-tight whitespace-nowrap">
                Personal Assistant
              </span>
              <span className="text-[9px] sm:text-[10px] text-[#717182] font-semibold block leading-tight whitespace-nowrap">
                Your Productivity Partner
              </span>
            </div>
          </button>
        </div>

        {/* =========================================================================
            CENTER SECTION: HORIZONTAL ICON + TEXT NAVIGATION
           ========================================================================= */}
        <nav
          className="hidden lg:flex items-center gap-0.5 xl:gap-1 flex-1 justify-center min-w-0"
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
                className={`items-center gap-1.5 px-2 xl:px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  item.hideOnCompact ? 'hidden 2xl:flex' : 'flex'
                } ${
                  isActive
                    ? 'bg-[#F4F3FF] text-[#8B45F5] border border-[#DDD8F8] shadow-2xs'
                    : 'text-[#717182] hover:text-[#18181B] hover:bg-[#F8F7FF]'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#8B45F5] stroke-[2.4]' : 'text-[#717182]'}`} />
                <span>{item.shortLabel}</span>
              </button>
            );
          })}

          {/* "More ▾" Dropdown Menu for secondary items */}
          <div className="relative" ref={moreMenuRef}>
            <button
              onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
              className={`flex items-center gap-1 px-2.5 xl:px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                isSecondaryActive
                  ? 'bg-[#F4F3FF] text-[#8B45F5] border border-[#DDD8F8] shadow-2xs'
                  : 'text-[#717182] hover:text-[#18181B] hover:bg-[#F8F7FF]'
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
                        item.hideOnWide ? '2xl:hidden' : ''
                      } ${
                        isActive
                          ? 'bg-[#8B45F5] text-white font-bold shadow-xs'
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
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Global Search Input (2xl+ displays) */}
          <div className="relative hidden 2xl:block w-36 2xl:w-44">
            <Search className="w-3.5 h-3.5 text-[#717182] absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search anything..."
              value={searchQuery}
              onChange={(e) => onSearchChange?.(e.target.value)}
              onFocus={onSearchFocus}
              className="w-full pl-7 pr-8 py-1.5 text-xs bg-[#F4F4FD] border border-[#E5E2F5] rounded-xl text-[#18181B] placeholder-[#717182] focus:outline-none focus:ring-1 focus:ring-[#8B45F5]/30 focus:border-[#8B45F5] transition-all"
            />
            <kbd className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-bold text-[#717182] bg-white border border-[#E5E2F5] px-1 py-0.2 rounded shadow-2xs pointer-events-none">
              ⌘K
            </kbd>
          </div>

          {/* Compact Search Trigger button (< 2xl) */}
          <button
            onClick={onSearchFocus}
            className="flex 2xl:hidden w-8 h-8 rounded-full border border-[#E5E2F5] bg-white hover:bg-[#F4F4FD] text-[#717182] hover:text-[#18181B] items-center justify-center transition-colors shadow-2xs"
            title="Search tasks, routines, projects (⌘K)"
            aria-label="Search"
          >
            <Search className="w-3.5 h-3.5 text-[#717182]" />
          </button>

          {/* Quick Add Button (+) with context dropdown */}
          <div className="relative" ref={quickAddRef}>
            <button
              onClick={() => setIsQuickAddOpen(!isQuickAddOpen)}
              className="w-8 h-8 rounded-full border border-[#E5E2F5] bg-white hover:bg-[#F4F4FD] text-[#18181B] flex items-center justify-center font-bold shadow-2xs transition-all"
              title="Quick Add Task or Habit"
              aria-label="Quick Add Menu"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5] text-[#18181B]" />
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

          {/* Notification Center Trigger with Badge */}
          <button
            onClick={onOpenNotifications || onTogglePush}
            disabled={pushLoading}
            className="w-8 h-8 rounded-full border border-[#E5E2F5] bg-white hover:bg-[#F4F4FD] flex items-center justify-center shadow-2xs transition-all relative text-[#18181B]"
            title={unreadNotificationsCount > 0 ? `${unreadNotificationsCount} unread notification(s)` : 'Notification Center'}
            aria-label="Notification Center"
          >
            <Bell className="w-3.5 h-3.5 text-[#18181B]" />
            <span className="w-4 h-4 rounded-full bg-[#E05268] text-white text-[9px] font-extrabold flex items-center justify-center absolute -top-1 -right-1 ring-1 ring-white">
              {unreadNotificationsCount > 0 ? unreadNotificationsCount : '3'}
            </span>
          </button>

          {/* Synced Status Badge matching reference */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#ECFDF5] border border-[#D1FAE5] text-[#16A36A] text-[11px] font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-[#16A36A] animate-pulse" />
            <span>Synced</span>
          </div>

          {/* Sync Refresh Button */}
          <button
            onClick={handleRefreshClick}
            disabled={isRefreshing}
            className="w-8 h-8 rounded-full border border-[#E5E2F5] bg-white hover:bg-[#F4F4FD] text-[#717182] hover:text-[#18181B] flex items-center justify-center shadow-2xs transition-all disabled:opacity-50"
            title="Synchronize records with Supabase & Redis"
            aria-label="Refresh Data"
          >
            <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin text-[#8B45F5]' : ''}`} />
          </button>

          {/* Profile Dropdown */}
          <div className="relative" ref={profileMenuRef}>
            <button
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              className="flex items-center gap-1.5 pl-1 sm:pl-2 border-l border-[#E5E2F5] focus:outline-none cursor-pointer"
              aria-label="User profile menu"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#C4B5FD] to-[#8B45F5] border border-[#DDD8F5] flex items-center justify-center overflow-hidden shrink-0 shadow-2xs text-white font-extrabold text-xs">
                <span>{initial}</span>
              </div>
              <div className="hidden md:block text-left min-w-0 max-w-[120px]">
                <span className="text-xs font-bold text-[#18181B] block leading-tight truncate">
                  {displayName}
                </span>
                <span className="text-[10px] text-[#717182] font-medium block leading-tight truncate">
                  {displayEmail}
                </span>
              </div>
              <ChevronDown className="w-3 h-3 text-[#717182] hidden md:block" />
            </button>

            {isProfileMenuOpen && (
              <div className="absolute right-0 mt-2 w-60 bg-white rounded-2xl border border-[#E5E2F5] shadow-[0_10px_35px_rgba(139,69,245,0.12)] p-2 z-50 animate-fade-in">
                <div className="px-3 py-2 border-b border-[#E5E2F5] mb-1">
                  <div className="font-extrabold text-xs text-[#202033] truncate">{displayName}</div>
                  <div className="text-[11px] text-[#74738A] truncate">{displayEmail}</div>
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

                <div className="border-t border-[#E5E2F5] my-1" />

                <button
                  onClick={async () => {
                    setIsProfileMenuOpen(false);
                    await logout();
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
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
