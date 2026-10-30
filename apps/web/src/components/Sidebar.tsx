'use client';

import React from 'react';
import {
  LayoutDashboard,
  CalendarCheck,
  Repeat,
  Briefcase,
  CalendarDays,
  AlertTriangle,
  HeartPulse,
  BarChart3,
  Calendar,
  Settings,
  FolderKanban,
  Cpu,
  Sparkles,
  Radio,
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
  | 'calendar'
  | 'automation'
  | 'settings';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onOpenEmergency: () => void;
}

export function Sidebar({ currentTab, onSelectTab, onOpenEmergency }: SidebarProps) {
  const navItems: Array<{
    id: NavTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string;
  }> = [
    { id: 'dashboard', label: 'Command Center', icon: LayoutDashboard },
    { id: 'my-day', label: 'My Day', icon: CalendarCheck },
    { id: 'projects', label: 'Projects', icon: FolderKanban },
    { id: 'routines', label: 'Habits & Routines', icon: Repeat },
    { id: 'work', label: 'Work & Tasks', icon: Briefcase },
    { id: 'planning', label: 'Day Planning', icon: CalendarDays },
    { id: 'emergency', label: 'Emergency Replan', icon: AlertTriangle, badge: 'Urgent' },
    { id: 'wellness', label: 'Health & Wellness', icon: HeartPulse },
    { id: 'analytics', label: 'Analytics & Trends', icon: BarChart3 },
    { id: 'calendar', label: 'Calendar Views', icon: Calendar },
    { id: 'automation', label: 'Automation Rules', icon: Cpu },
    { id: 'settings', label: 'System Settings', icon: Settings },
  ];

  return (
    <aside className="hidden lg:flex flex-col w-64 glass-dark text-white min-h-screen p-4 border-r border-white/10 select-none z-20 backdrop-blur-2xl shadow-2xl">
      {/* Brand Header */}
      <div className="flex items-center gap-3 px-3 py-3.5 mb-5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md shadow-inner">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-400 via-sky-300 to-indigo-500 flex items-center justify-center text-slate-950 font-black text-sm shadow-glass-glow">
          <Sparkles className="w-5 h-5 text-slate-900" />
        </div>
        <div className="min-w-0">
          <h1 className="font-bold text-sm tracking-tight text-white flex items-center gap-1.5">
            Assistant PWA
            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-sky-400/20 text-sky-300 border border-sky-400/30">
              PRO
            </span>
          </h1>
          <p className="text-[11px] text-sky-200/70 font-medium truncate">Glassmorphism Edition</p>
        </div>
      </div>

      {/* Nav Menu */}
      <nav className="flex-1 space-y-1.5 overflow-y-auto pr-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          const isEmergency = item.id === 'emergency';

          return (
            <button
              key={item.id}
              onClick={() => {
                if (isEmergency) {
                  onOpenEmergency();
                } else {
                  onSelectTab(item.id);
                }
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all group relative ${
                isActive
                  ? 'bg-gradient-to-r from-sky-400 to-sky-500 text-slate-950 shadow-glass-glow font-bold'
                  : isEmergency
                  ? 'text-rose-400 hover:bg-rose-500/15 hover:border-rose-500/30 border border-transparent'
                  : 'text-slate-300 hover:bg-white/10 hover:text-white border border-transparent'
              }`}
            >
              <Icon
                className={`w-4 h-4 transition-transform group-hover:scale-110 ${
                  isActive
                    ? 'text-slate-950 stroke-[2.2]'
                    : isEmergency
                    ? 'text-rose-400'
                    : 'text-slate-400 group-hover:text-sky-300'
                }`}
              />
              <span className="truncate">{item.label}</span>

              {item.badge && (
                <span className="ml-auto text-[9px] uppercase font-extrabold tracking-wider bg-rose-500/25 text-rose-300 px-2 py-0.5 rounded-full border border-rose-400/30 animate-pulse">
                  {item.badge}
                </span>
              )}

              {isActive && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-slate-950 shadow-sm" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Realtime Live Engine Status Card */}
      <div className="mt-4 p-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md">
        <div className="flex items-center justify-between text-[11px] mb-1">
          <span className="text-slate-400 font-medium">Database & Engine</span>
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400">
            <Radio className="w-3 h-3 animate-pulse text-emerald-400" />
            Live Sync
          </span>
        </div>
        <p className="text-[10px] text-slate-400">Supabase + Redis Outbox</p>
      </div>
    </aside>
  );
}
