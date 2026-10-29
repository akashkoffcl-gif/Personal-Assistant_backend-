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
  const navItems: Array<{ id: NavTab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: 'dashboard', label: 'Command Center', icon: LayoutDashboard },
    { id: 'my-day', label: 'My Day', icon: CalendarCheck },
    { id: 'projects', label: 'Projects', icon: FolderKanban },
    { id: 'routines', label: 'Routines', icon: Repeat },
    { id: 'work', label: 'Work', icon: Briefcase },
    { id: 'planning', label: 'Planning', icon: CalendarDays },
    { id: 'emergency', label: 'Emergency', icon: AlertTriangle },
    { id: 'wellness', label: 'Health & Wellness', icon: HeartPulse },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'calendar', label: 'Calendar', icon: Calendar },
    { id: 'automation', label: 'Automation Rules', icon: Cpu },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="hidden lg:flex flex-col w-64 bg-assistant-navy text-white min-h-screen p-4 border-r border-slate-800 select-none">
      <div className="flex items-center gap-3 px-3 py-4 mb-4 border-b border-slate-700/60">
        <div className="w-9 h-9 rounded-xl bg-assistant-sky flex items-center justify-center text-assistant-navy font-bold shadow-md">
          PA
        </div>
        <div>
          <h1 className="font-semibold text-base tracking-tight text-white">Assistant PWA</h1>
          <p className="text-xs text-assistant-sky/90 font-medium">Personal & Wellness</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1">
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
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-assistant-sky text-assistant-navy shadow-sm'
                  : isEmergency
                  ? 'text-red-400 hover:bg-red-950/40'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Icon className={`w-4 h-4 ${isEmergency && !isActive ? 'text-assistant-red' : ''}`} />
              <span>{item.label}</span>
              {isEmergency && (
                <span className="ml-auto text-[10px] uppercase font-bold bg-assistant-red/20 text-red-400 px-1.5 py-0.5 rounded">
                  Urgent
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="mt-auto pt-4 border-t border-slate-800 text-xs text-slate-400 px-3">
        <p className="font-medium text-slate-300">PWA Online Engine</p>
        <p className="text-[11px] text-slate-500 mt-0.5">VAPID Push & BullMQ Sync</p>
      </div>
    </aside>
  );
}

