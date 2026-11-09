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
  Search,
  ChevronDown,
  Menu,
  X,
  LogOut,
  Timer,
  Target,
  BookOpen,
  Wallet,
  Scale,
  History,
  Sparkles,
  Mic,
  Bot,
  Brain,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { ConfirmDialog } from './ConfirmDialog';

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
  | 'settings'
  | 'focus'
  | 'goals'
  | 'knowledge'
  | 'finance'
  | 'life-balance'
  | 'timeline'
  | 'predictive'
  | 'smart-planner'
  | 'ai-chat';

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
  onOpenVoiceAssistant?: () => void;
  onOpenAIAssistant?: () => void;
}

interface NavItemConfig {
  id: NavTab;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  visibility: 'always' | 'xl' | '1500' | '1720' | 'dropdown-only';
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
  onOpenVoiceAssistant,
  onOpenAIAssistant,
}: HorizontalNavbarProps) {
  const { user, profile, logout } = useAuth();
  const displayName = profile?.fullName || user?.user_metadata?.full_name || (user?.email ? user.email.split('@')[0] : 'Selma Knight');
  const displayEmail = profile?.email || user?.email || 'demo@assistant.local';
  const initial = displayName.charAt(0).toUpperCase() || 'S';

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);

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

  // 1. Primary Navigation Items with tiered responsive visibility (unified Calendar & Planning)
  const primaryNavList: NavItemConfig[] = [
    { id: 'dashboard', label: 'Command Center', shortLabel: 'Command Center', icon: LayoutDashboard, visibility: 'always' },
    { id: 'my-day', label: 'My Day', shortLabel: 'My Day', icon: CalendarCheck, visibility: 'always' },
    { id: 'work', label: 'Tasks', shortLabel: 'Tasks', icon: Briefcase, visibility: 'always' },
    { id: 'projects', label: 'Projects', shortLabel: 'Projects', icon: FolderKanban, visibility: 'xl' },
    { id: 'routines', label: 'Routines', shortLabel: 'Routines', icon: Repeat, visibility: 'xl' },
    { id: 'calendar', label: 'Calendar & Planning', shortLabel: 'Calendar', icon: Calendar, visibility: '1500' },
    { id: 'analytics', label: 'Analytics', shortLabel: 'Analytics', icon: BarChart3, visibility: '1720' },
  ];

  // 2. Secondary Dropdown Items in "More ▾"
  const secondaryDropdownList: NavItemConfig[] = [
    { id: 'ai-chat', label: 'AI Executive Chat', shortLabel: 'AI Chat', icon: Bot, visibility: 'dropdown-only', badge: 'New', badgeColor: 'bg-[#10B981] text-white' },
    { id: 'focus', label: 'Focus Studio & Pomodoro', shortLabel: 'Focus Studio', icon: Timer, visibility: 'dropdown-only', badge: 'Pro', badgeColor: 'bg-[#8B45F5] text-white' },
    { id: 'goals', label: 'Goals & Milestones', shortLabel: 'Goals', icon: Target, visibility: 'dropdown-only' },
    { id: 'smart-planner', label: 'AI Smart Day Planner', shortLabel: 'Smart Planner', icon: Sparkles, visibility: 'dropdown-only' },
    { id: 'knowledge', label: 'Personal Knowledge Hub', shortLabel: 'Knowledge', icon: BookOpen, visibility: 'dropdown-only' },
    { id: 'finance', label: 'Personal Finance', shortLabel: 'Finance', icon: Wallet, visibility: 'dropdown-only' },
    { id: 'predictive', label: 'Predictive Productivity', shortLabel: 'Predictive', icon: Brain, visibility: 'dropdown-only' },
    { id: 'life-balance', label: 'Life Balance Dashboard', shortLabel: 'Life Balance', icon: Scale, visibility: 'dropdown-only' },
    { id: 'timeline', label: 'Activity Timeline', shortLabel: 'Timeline', icon: History, visibility: 'dropdown-only' },
    { id: 'projects', label: 'Projects', shortLabel: 'Projects', icon: FolderKanban, visibility: 'dropdown-only' },
    { id: 'routines', label: 'Routines', shortLabel: 'Routines', icon: Repeat, visibility: 'dropdown-only' },
    { id: 'calendar', label: 'Calendar & Planning', shortLabel: 'Calendar', icon: Calendar, visibility: 'dropdown-only' },
    { id: 'analytics', label: 'Analytics', shortLabel: 'Analytics', icon: BarChart3, visibility: 'dropdown-only' },
    { id: 'usage-analytics', label: 'App Usage Analytics', shortLabel: 'App Usage', icon: Activity, visibility: 'dropdown-only' },
    { id: 'automation', label: 'Automation Rules', shortLabel: 'Automation', icon: Cpu, visibility: 'dropdown-only' },
    { id: 'wellness', label: 'Health & Wellness', shortLabel: 'Wellness', icon: HeartPulse, visibility: 'dropdown-only' },
    { id: 'settings', label: 'System Settings', shortLabel: 'Settings', icon: Settings, visibility: 'dropdown-only' },
  ];

  // Check if current tab is one of the secondary dropdown items
  const isDropdownActive = [
    'ai-chat',
    'focus',
    'goals',
    'smart-planner',
    'knowledge',
    'finance',
    'predictive',
    'life-balance',
    'timeline',
    'usage-analytics',
    'automation',
    'wellness',
    'settings',
  ].includes(currentTab);

  const activeDropdownItem = secondaryDropdownList.find((item) => item.id === currentTab);

  return (
    <header className="sticky top-0 z-40 select-none w-full">
      <div className="bg-white rounded-2xl border border-[#E5E2F5] shadow-[0_4px_24px_rgba(139,69,245,0.06)] px-3 sm:px-4 lg:px-5 py-1.5 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 sm:gap-4 lg:gap-6 h-[52px] sm:h-[56px] w-full min-w-0">
        {/* =========================================================================
            ZONE 1: LEFT — BRAND IDENTITY
           ========================================================================= */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 justify-self-start pr-1 sm:pr-3">
          {/* Mobile hamburger menu toggle (< lg) */}
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
              <span className="text-xs sm:text-sm font-extrabold text-[#202033] tracking-tight block leading-tight whitespace-nowrap">
                Personal Assistant
              </span>
              <span className="text-[9px] sm:text-[10px] text-[#74738A] font-semibold block leading-tight whitespace-nowrap">
                Your Productivity Partner
              </span>
            </div>
          </button>
        </div>

        {/* =========================================================================
            ZONE 2: CENTER — PRIMARY NAVIGATION
           ========================================================================= */}
        <nav
          className="hidden lg:flex items-center justify-center gap-1 xl:gap-1.5 2xl:gap-2 min-w-0 justify-self-center"
          aria-label="Main Navigation"
        >
          {primaryNavList.map((item) => {
            const Icon = item.icon;
            const isActive = item.id === 'calendar' ? (currentTab === 'calendar' || currentTab === 'planning') : currentTab === item.id;
            const visibilityClass =
              item.visibility === 'always'
                ? 'flex'
                : item.visibility === 'xl'
                ? 'hidden xl:flex'
                : item.visibility === '1500'
                ? 'hidden min-[1500px]:flex'
                : 'hidden min-[1720px]:flex';

            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150 whitespace-nowrap ${visibilityClass} ${
                  isActive
                    ? 'bg-[#F4F3FF] text-[#8B45F5] font-bold border border-[#DDD8F8]/60 shadow-[0_1px_3px_rgba(139,69,245,0.08)]'
                    : 'text-[#525266] hover:text-[#181829] hover:bg-[#F4F3FF]/70'
                }`}
              >
                <Icon
                  className={`w-3.5 h-3.5 shrink-0 ${
                    isActive ? 'text-[#8B45F5] stroke-[2.3]' : 'text-[#74738A] group-hover:text-[#202033]'
                  }`}
                />
                <span>{item.shortLabel}</span>
              </button>
            );
          })}

          {/* "More ▾" Dropdown Menu */}
          <div className="relative" ref={moreMenuRef}>
            <button
              onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150 whitespace-nowrap ${
                isDropdownActive
                  ? 'bg-[#F4F3FF] text-[#8B45F5] font-bold border border-[#DDD8F8]/60 shadow-[0_1px_3px_rgba(139,69,245,0.08)]'
                  : 'text-[#525266] hover:text-[#181829] hover:bg-[#F4F3FF]/70'
              }`}
              title="More workspace modules"
              aria-haspopup="true"
              aria-expanded={isMoreMenuOpen}
            >
              <span>{isDropdownActive ? activeDropdownItem?.shortLabel || 'More' : 'More'}</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isMoreMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {isMoreMenuOpen && (
              <div className="absolute left-1/2 -translate-x-1/2 mt-2 w-64 max-h-[calc(100vh-100px)] overflow-y-auto bg-white rounded-2xl border border-[#E5E2F5] shadow-[0_10px_35px_rgba(139,69,245,0.14)] p-2 z-50 animate-fade-in custom-scrollbar">
                {/* Breakpoint-dependent overflow items (< 1720px / < 1500px / < xl) */}
                <div className="min-[1720px]:hidden border-b border-[#F0F2FA] pb-1.5 mb-1.5">
                  <div className="px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-[#74738A]">
                    Primary Workspaces
                  </div>
                  <button
                    onClick={() => {
                      onSelectTab('calendar');
                      setIsMoreMenuOpen(false);
                    }}
                    className={`min-[1500px]:hidden w-full flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                      currentTab === 'calendar' || currentTab === 'planning'
                        ? 'bg-[#8B45F5] text-white font-bold'
                        : 'text-[#202033] hover:bg-[#F4F3FF] hover:text-[#6935C8]'
                    }`}
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Calendar & Planning</span>
                  </button>
                  <button
                    onClick={() => {
                      onSelectTab('analytics');
                      setIsMoreMenuOpen(false);
                    }}
                    className={`min-[1720px]:hidden w-full flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                      currentTab === 'analytics'
                        ? 'bg-[#8B45F5] text-white font-bold'
                        : 'text-[#202033] hover:bg-[#F4F3FF] hover:text-[#6935C8]'
                    }`}
                  >
                    <BarChart3 className="w-3.5 h-3.5" />
                    <span>Analytics</span>
                  </button>
                  <div className="xl:hidden">
                    <button
                      onClick={() => {
                        onSelectTab('projects');
                        setIsMoreMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                        currentTab === 'projects'
                          ? 'bg-[#8B45F5] text-white font-bold'
                          : 'text-[#202033] hover:bg-[#F4F3FF] hover:text-[#6935C8]'
                      }`}
                    >
                      <FolderKanban className="w-3.5 h-3.5" />
                      <span>Projects</span>
                    </button>
                    <button
                      onClick={() => {
                        onSelectTab('routines');
                        setIsMoreMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                        currentTab === 'routines'
                          ? 'bg-[#8B45F5] text-white font-bold'
                          : 'text-[#202033] hover:bg-[#F4F3FF] hover:text-[#6935C8]'
                      }`}
                    >
                      <Repeat className="w-3.5 h-3.5" />
                      <span>Routines</span>
                    </button>
                  </div>
                </div>

                {/* CATEGORY: PLAN */}
                <div className="px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-[#74738A]">
                  Plan
                </div>
                <button
                  onClick={() => {
                    onSelectTab('goals');
                    setIsMoreMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                    currentTab === 'goals'
                      ? 'bg-[#8B45F5] text-white font-bold'
                      : 'text-[#202033] hover:bg-[#F4F3FF] hover:text-[#6935C8]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Target className="w-3.5 h-3.5" />
                    <span>Goals & Milestones</span>
                  </div>
                </button>
                <button
                  onClick={() => {
                    onSelectTab('smart-planner');
                    setIsMoreMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                    currentTab === 'smart-planner'
                      ? 'bg-[#8B45F5] text-white font-bold'
                      : 'text-[#202033] hover:bg-[#F4F3FF] hover:text-[#6935C8]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-[#8B45F5]" />
                    <span>AI Smart Day Planner</span>
                  </div>
                  <span className="text-[8px] font-bold px-1.5 py-0.2 rounded-full bg-[#8B45F5] text-white">
                    AI
                  </span>
                </button>

                {/* CATEGORY: EXECUTE */}
                <div className="border-t border-[#F0F2FA] my-1" />
                <div className="px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-[#74738A]">
                  Execute
                </div>
                <button
                  onClick={() => {
                    onSelectTab('focus');
                    setIsMoreMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                    currentTab === 'focus'
                      ? 'bg-[#8B45F5] text-white font-bold'
                      : 'text-[#202033] hover:bg-[#F4F3FF] hover:text-[#6935C8]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Timer className="w-3.5 h-3.5" />
                    <span>Focus Studio & Pomodoro</span>
                  </div>
                  <span className="text-[8px] font-bold px-1.5 py-0.2 rounded-full bg-[#8B45F5] text-white">
                    Pro
                  </span>
                </button>

                {/* CATEGORY: UNDERSTAND */}
                <div className="border-t border-[#F0F2FA] my-1" />
                <div className="px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-[#74738A]">
                  Understand
                </div>
                <button
                  onClick={() => {
                    onSelectTab('predictive');
                    setIsMoreMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                    currentTab === 'predictive'
                      ? 'bg-[#8B45F5] text-white font-bold'
                      : 'text-[#202033] hover:bg-[#F4F3FF] hover:text-[#6935C8]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Brain className="w-3.5 h-3.5 text-[#8B45F5]" />
                    <span>Predictive Intelligence</span>
                  </div>
                  <span className="text-[8px] font-bold px-1.5 py-0.2 rounded-full bg-[#8B45F5] text-white">
                    New
                  </span>
                </button>
                <button
                  onClick={() => {
                    onSelectTab('life-balance');
                    setIsMoreMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                    currentTab === 'life-balance'
                      ? 'bg-[#8B45F5] text-white font-bold'
                      : 'text-[#202033] hover:bg-[#F4F3FF] hover:text-[#6935C8]'
                  }`}
                >
                  <Scale className="w-3.5 h-3.5" />
                  <span>Life Balance Dashboard</span>
                </button>
                <button
                  onClick={() => {
                    onSelectTab('usage-analytics');
                    setIsMoreMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                    currentTab === 'usage-analytics'
                      ? 'bg-[#8B45F5] text-white font-bold'
                      : 'text-[#202033] hover:bg-[#F4F3FF] hover:text-[#6935C8]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Activity className="w-3.5 h-3.5" />
                    <span>App Usage Analytics</span>
                  </div>
                </button>

                {/* CATEGORY: REMEMBER */}
                <div className="border-t border-[#F0F2FA] my-1" />
                <div className="px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-[#74738A]">
                  Remember
                </div>
                <button
                  onClick={() => {
                    onSelectTab('knowledge');
                    setIsMoreMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                    currentTab === 'knowledge'
                      ? 'bg-[#8B45F5] text-white font-bold'
                      : 'text-[#202033] hover:bg-[#F4F3FF] hover:text-[#6935C8]'
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Personal Knowledge Hub</span>
                </button>
                <button
                  onClick={() => {
                    onSelectTab('timeline');
                    setIsMoreMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                    currentTab === 'timeline'
                      ? 'bg-[#8B45F5] text-white font-bold'
                      : 'text-[#202033] hover:bg-[#F4F3FF] hover:text-[#6935C8]'
                  }`}
                >
                  <History className="w-3.5 h-3.5" />
                  <span>Activity Timeline</span>
                </button>

                {/* CATEGORY: FINANCE */}
                <div className="border-t border-[#F0F2FA] my-1" />
                <div className="px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-[#74738A]">
                  Finance
                </div>
                <button
                  onClick={() => {
                    onSelectTab('finance');
                    setIsMoreMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                    currentTab === 'finance'
                      ? 'bg-[#8B45F5] text-white font-bold'
                      : 'text-[#202033] hover:bg-[#F4F3FF] hover:text-[#6935C8]'
                  }`}
                >
                  <Wallet className="w-3.5 h-3.5" />
                  <span>Personal Finance Overview</span>
                </button>

                {/* CATEGORY: INTELLIGENCE & VOICE */}
                <div className="border-t border-[#F0F2FA] my-1" />
                <div className="px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-[#74738A]">
                  Intelligence & Voice
                </div>
                <button
                  onClick={() => {
                    setIsMoreMenuOpen(false);
                    onOpenAIAssistant?.();
                  }}
                  className="w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs font-semibold text-[#202033] hover:bg-[#F4F3FF] hover:text-[#6935C8] transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Bot className="w-3.5 h-3.5 text-[#8B45F5]" />
                    <span>AI Executive Assistant</span>
                  </div>
                  <span className="text-[8px] font-bold px-1.5 py-0.2 rounded-full bg-[#8B45F5] text-white">
                    Gemini
                  </span>
                </button>
                <button
                  onClick={() => {
                    setIsMoreMenuOpen(false);
                    onOpenVoiceAssistant?.();
                  }}
                  className="w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs font-semibold text-[#202033] hover:bg-[#F4F3FF] hover:text-[#6935C8] transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Mic className="w-3.5 h-3.5 text-[#8B45F5]" />
                    <span>Voice-Controlled Assistant</span>
                  </div>
                  <span className="text-[8px] font-bold px-1.5 py-0.2 rounded-full bg-[#16A36A] text-white">
                    Live
                  </span>
                </button>

                {/* CATEGORY: TOOLS & SETTINGS */}
                <div className="border-t border-[#F0F2FA] my-1" />
                <div className="px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-[#74738A]">
                  Tools & System
                </div>
                <button
                  onClick={() => {
                    onSelectTab('wellness');
                    setIsMoreMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                    currentTab === 'wellness'
                      ? 'bg-[#8B45F5] text-white font-bold'
                      : 'text-[#202033] hover:bg-[#F4F3FF] hover:text-[#6935C8]'
                  }`}
                >
                  <HeartPulse className="w-3.5 h-3.5" />
                  <span>Health & Wellness</span>
                </button>
                <button
                  onClick={() => {
                    onSelectTab('automation');
                    setIsMoreMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                    currentTab === 'automation'
                      ? 'bg-[#8B45F5] text-white font-bold'
                      : 'text-[#202033] hover:bg-[#F4F3FF] hover:text-[#6935C8]'
                  }`}
                >
                  <Cpu className="w-3.5 h-3.5" />
                  <span>Automation Rules</span>
                </button>
                <button
                  onClick={() => {
                    onSelectTab('settings');
                    setIsMoreMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                    currentTab === 'settings'
                      ? 'bg-[#8B45F5] text-white font-bold'
                      : 'text-[#202033] hover:bg-[#F4F3FF] hover:text-[#6935C8]'
                  }`}
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span>System Settings</span>
                </button>
              </div>
            )}
          </div>
        </nav>

        {/* =========================================================================
            ZONE 3: RIGHT — UTILITIES & PROFILE
           ========================================================================= */}
        <div className="flex items-center justify-end gap-1.5 sm:gap-2 xl:gap-2.5 shrink-0 justify-self-end">
          {/* Global Search Input (1720px+ displays) */}
          <div className="relative hidden min-[1720px]:block w-36 2xl:w-44">
            <Search className="w-3.5 h-3.5 text-[#74738A] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search anything..."
              value={searchQuery}
              onChange={(e) => onSearchChange?.(e.target.value)}
              onFocus={onSearchFocus}
              className="w-full pl-7 pr-8 py-1.5 text-xs bg-[#F4F3FF]/70 border border-[#E5E2F5] rounded-xl text-[#202033] placeholder-[#74738A] focus:outline-none focus:ring-1 focus:ring-[#8B45F5]/30 focus:border-[#8B45F5] focus:bg-white transition-all"
            />
            <kbd className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-bold text-[#74738A] bg-white border border-[#E5E2F5] px-1 py-0.2 rounded shadow-2xs pointer-events-none">
              ⌘K
            </kbd>
          </div>

          {/* Compact Search Trigger button (< 1720px) */}
          <button
            onClick={onSearchFocus}
            className="flex min-[1720px]:hidden w-8 h-8 rounded-xl border border-[#E5E2F5] bg-white hover:bg-[#F4F3FF] text-[#74738A] hover:text-[#202033] items-center justify-center transition-colors shadow-2xs"
            title="Search tasks, routines, projects (⌘K)"
            aria-label="Search"
          >
            <Search className="w-3.5 h-3.5" />
          </button>

          {/* Quick Add Button (+) with context dropdown */}
          <div className="relative" ref={quickAddRef}>
            <button
              onClick={() => setIsQuickAddOpen(!isQuickAddOpen)}
              className="w-8 h-8 rounded-xl border border-[#E5E2F5] bg-white hover:bg-[#F4F3FF] text-[#202033] hover:text-[#8B45F5] flex items-center justify-center font-bold shadow-2xs transition-all"
              title="Quick Add Task or Habit"
              aria-label="Quick Add Menu"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>

            {isQuickAddOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl border border-[#E5E2F5] shadow-[0_10px_35px_rgba(139,69,245,0.12)] p-1.5 z-50 animate-fade-in">
                <button
                  onClick={() => {
                    setIsQuickAddOpen(false);
                    onOpenCreateTask();
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-semibold text-[#202033] hover:bg-[#F4F3FF] hover:text-[#6935C8] rounded-xl flex items-center gap-2 transition-colors"
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
                    className="w-full text-left px-3 py-2 text-xs font-semibold text-[#202033] hover:bg-[#F4F3FF] hover:text-[#8B45F5] rounded-xl flex items-center gap-2 transition-colors"
                  >
                    <Repeat className="w-3.5 h-3.5 text-[#8B45F5]" />
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

          {/* Voice-Controlled Assistant Trigger */}
          <button
            onClick={onOpenVoiceAssistant}
            className="w-8 h-8 rounded-xl border border-[#E5E2F5] bg-white hover:bg-[#F4F3FF] flex items-center justify-center shadow-2xs transition-all text-[#202033] hover:text-[#8B45F5]"
            title="Voice-Controlled Assistant (Click to Speak)"
            aria-label="Voice Assistant"
          >
            <Mic className="w-3.5 h-3.5 text-[#8B45F5]" />
          </button>

          {/* Notification Center Trigger with Badge */}
          <button
            onClick={onOpenNotifications || onTogglePush}
            disabled={pushLoading}
            className="w-8 h-8 rounded-xl border border-[#E5E2F5] bg-white hover:bg-[#F4F3FF] flex items-center justify-center shadow-2xs transition-all relative text-[#202033] hover:text-[#8B45F5]"
            title={unreadNotificationsCount > 0 ? `${unreadNotificationsCount} unread notification(s)` : 'Notification Center'}
            aria-label="Notification Center"
          >
            <Bell className="w-3.5 h-3.5" />
            <span className="w-4 h-4 rounded-full bg-[#E05268] text-white text-[9px] font-extrabold flex items-center justify-center absolute -top-1 -right-1 ring-2 ring-white">
              {unreadNotificationsCount > 0 ? unreadNotificationsCount : '3'}
            </span>
          </button>

          {/* Synced Status Badge */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#ECFDF5] border border-[#D1FAE5] text-[#16A36A] text-[11px] font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-[#16A36A] animate-pulse" />
            <span>Synced</span>
          </div>

          {/* Sync Refresh Button */}
          <button
            onClick={handleRefreshClick}
            disabled={isRefreshing}
            className="w-8 h-8 rounded-xl border border-[#E5E2F5] bg-white hover:bg-[#F4F3FF] text-[#74738A] hover:text-[#202033] flex items-center justify-center shadow-2xs transition-all disabled:opacity-50"
            title="Synchronize records with Supabase & Redis"
            aria-label="Refresh Data"
          >
            <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin text-[#8B45F5]' : ''}`} />
          </button>

          {/* Profile Dropdown with Distinct Spacing & Left Border */}
          <div className="relative pl-1.5 sm:pl-2.5 border-l border-[#E5E2F5]" ref={profileMenuRef}>
            <button
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              className="flex items-center gap-2 focus:outline-none cursor-pointer group"
              aria-label="User profile menu"
            >
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#C4B5FD] to-[#8B45F5] border border-[#DDD8F5] flex items-center justify-center overflow-hidden shrink-0 shadow-2xs text-white font-extrabold text-xs group-hover:ring-2 group-hover:ring-[#8B45F5]/30 transition-all">
                <span>{initial}</span>
              </div>
              <div className="hidden md:block text-left min-w-0 max-w-[125px]">
                <span className="text-xs font-bold text-[#202033] block leading-tight truncate group-hover:text-[#8B45F5] transition-colors">
                  {displayName}
                </span>
                <span className="text-[10px] text-[#74738A] font-medium block leading-tight truncate">
                  {displayEmail}
                </span>
              </div>
              <ChevronDown className="w-3 h-3 text-[#74738A] hidden md:block group-hover:text-[#202033] transition-colors" />
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
                  onClick={() => {
                    setIsProfileMenuOpen(false);
                    setShowSignOutConfirm(true);
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

          {/* Full grid of all modules */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 mb-3 max-h-[340px] overflow-y-auto">
            {[
              { id: 'dashboard' as NavTab, label: 'Command Center', icon: LayoutDashboard },
              { id: 'ai-chat' as NavTab, label: 'AI Executive Chat', icon: Bot },
              { id: 'my-day' as NavTab, label: 'My Day', icon: CalendarCheck },
              { id: 'work' as NavTab, label: 'Tasks', icon: Briefcase },
              { id: 'projects' as NavTab, label: 'Projects', icon: FolderKanban },
              { id: 'routines' as NavTab, label: 'Routines', icon: Repeat },
              { id: 'focus' as NavTab, label: 'Focus Studio', icon: Timer },
              { id: 'goals' as NavTab, label: 'Goals', icon: Target },
              { id: 'smart-planner' as NavTab, label: 'Smart Planner', icon: Sparkles },
              { id: 'knowledge' as NavTab, label: 'Knowledge Hub', icon: BookOpen },
              { id: 'finance' as NavTab, label: 'Personal Finance', icon: Wallet },
              { id: 'predictive' as NavTab, label: 'Predictive Intel', icon: Brain },
              { id: 'life-balance' as NavTab, label: 'Life Balance', icon: Scale },
              { id: 'timeline' as NavTab, label: 'Activity Timeline', icon: History },
              { id: 'calendar' as NavTab, label: 'Calendar & Planning', icon: Calendar },
              { id: 'analytics' as NavTab, label: 'Analytics', icon: BarChart3 },
              { id: 'usage-analytics' as NavTab, label: 'App Usage', icon: Activity },
              { id: 'automation' as NavTab, label: 'Automation', icon: Cpu },
              { id: 'wellness' as NavTab, label: 'Wellness', icon: HeartPulse },
            ].map((item) => {
              const Icon = item.icon;
              const isActive = item.id === 'calendar' ? (currentTab === 'calendar' || currentTab === 'planning') : currentTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onSelectTab(item.id);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`flex items-center gap-2 p-2 rounded-xl text-xs font-semibold transition-colors ${
                    isActive
                      ? 'bg-[#8B45F5] text-white font-bold shadow-xs'
                      : 'text-[#202033] bg-[#F4F3FF] hover:bg-[#EDE9FE]'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-[#8B45F5]'}`} />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* Mobile Profile & Actions Footer */}
          <div className="border-t border-[#E5E2F5] pt-3 flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#C4B5FD] to-[#8B45F5] text-white font-bold text-xs flex items-center justify-center shrink-0">
                {initial}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-[#202033] truncate">{displayName}</p>
                <p className="text-[10px] text-[#74738A] truncate">{displayEmail}</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => {
                  onSelectTab('settings');
                  setIsMobileMenuOpen(false);
                }}
                className="w-8 h-8 rounded-xl border border-[#E5E2F5] bg-white text-[#74738A] flex items-center justify-center hover:bg-[#F4F3FF]"
                title="Settings"
              >
                <Settings className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => {
                  onOpenEmergency();
                  setIsMobileMenuOpen(false);
                }}
                className="px-2.5 py-1.5 rounded-xl bg-[#FFEAEF] text-[#E05268] text-xs font-bold flex items-center gap-1"
                title="Emergency Replan"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Replan</span>
              </button>
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setShowSignOutConfirm(true);
                }}
                className="w-8 h-8 rounded-xl border border-red-200 bg-red-50 text-red-600 flex items-center justify-center hover:bg-red-100 transition-colors"
                title="Sign Out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Profile / Account Sign-Out Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showSignOutConfirm}
        title="Sign Out of Personal Assistant"
        message="Are you sure you want to sign out of your personal workspace? All active session tokens and local workspace caches will be securely invalidated."
        confirmLabel="Sign Out"
        cancelLabel="Stay Signed In"
        isDestructive={true}
        onConfirm={async () => {
          setShowSignOutConfirm(false);
          await logout();
        }}
        onCancel={() => setShowSignOutConfirm(false)}
      />
    </header>
  );
}
