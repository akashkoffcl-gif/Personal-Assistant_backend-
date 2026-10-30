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
  CheckCircle2,
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
    { id: 'work', label: 'Work & Tasks', icon: Briefcase },
    { id: 'routines', label: 'Habits & Routines', icon: Repeat },
    { id: 'projects', label: 'Projects', icon: FolderKanban },
    { id: 'planning', label: 'Day Planning', icon: CalendarDays },
    { id: 'emergency', label: 'Emergency Replan', icon: AlertTriangle, badge: 'Urgent' },
    { id: 'wellness', label: 'Health & Wellness', icon: HeartPulse },
    { id: 'analytics', label: 'Analytics & Trends', icon: BarChart3 },
    { id: 'calendar', label: 'Calendar Views', icon: Calendar },
    { id: 'automation', label: 'Automation Rules', icon: Cpu },
    { id: 'settings', label: 'System Settings', icon: Settings },
  ];

  return (
    <aside className="hidden lg:flex flex-col w-60 bg-white border-r border-slate-200 min-h-screen p-3.5 select-none z-20 shrink-0">
      {/* Clean Enterprise Brand Header */}
      <div className="flex items-center gap-3 px-2.5 py-3 mb-4 border-b border-slate-100">
        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xs shrink-0">
          <CheckCircle2 className="w-4.5 h-4.5 stroke-[2.2]" />
        </div>
        <div className="min-w-0">
          <h1 className="font-bold text-sm tracking-tight text-slate-900 leading-tight">
            Personal Assistant
          </h1>
          <p className="text-[11px] text-slate-500 font-medium leading-tight">Enterprise Workspace</p>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto pr-0.5">
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
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-colors group relative text-left ${
                isActive
                  ? 'bg-blue-50 text-blue-700 font-semibold'
                  : isEmergency
                  ? 'text-red-600 hover:bg-red-50 font-medium'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'
              }`}
            >
              <Icon
                className={`w-4 h-4 shrink-0 transition-colors ${
                  isActive
                    ? 'text-blue-600 stroke-[2.2]'
                    : isEmergency
                    ? 'text-red-500'
                    : 'text-slate-400 group-hover:text-slate-600'
                }`}
              />
              <span className="truncate">{item.label}</span>

              {item.badge && (
                <span className="ml-auto text-[10px] font-semibold bg-red-100 text-red-700 px-1.5 py-0.2 rounded">
                  {item.badge}
                </span>
              )}

              {isActive && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-600" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Database & Sync Status Footer */}
      <div className="mt-3 p-2.5 rounded-lg bg-slate-50 border border-slate-200">
        <div className="flex items-center justify-between text-xs mb-0.5">
          <span className="text-slate-500 text-[11px] font-medium">Database Engine</span>
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Live Sync
          </span>
        </div>
        <p className="text-[10px] text-slate-400">Supabase + Redis Outbox</p>
      </div>
    </aside>
  );
}
