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
  Activity,
  Sparkles,
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

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onOpenEmergency: () => void;
}

interface NavGroup {
  title: string;
  items: Array<{
    id: NavTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string;
    badgeColor?: string;
  }>;
}

export function Sidebar({ currentTab, onSelectTab, onOpenEmergency }: SidebarProps) {
  const navGroups: NavGroup[] = [
    {
      title: 'OVERVIEW',
      items: [
        { id: 'dashboard', label: 'Command Center', icon: LayoutDashboard },
        { id: 'my-day', label: 'My Day', icon: CalendarCheck },
      ],
    },
    {
      title: 'PRODUCTIVITY',
      items: [
        { id: 'work', label: 'Work & Tasks', icon: Briefcase },
        { id: 'projects', label: 'Projects', icon: FolderKanban },
        { id: 'routines', label: 'Habits & Routines', icon: Repeat },
        { id: 'planning', label: 'Day Planning', icon: CalendarDays },
        { id: 'calendar', label: 'Calendar Views', icon: Calendar },
      ],
    },
    {
      title: 'INTELLIGENCE',
      items: [
        { id: 'analytics', label: 'Personal Analytics', icon: BarChart3 },
        { id: 'usage-analytics', label: 'App Usage Analytics', icon: Activity, badge: 'New', badgeColor: 'bg-[#8B45F5] text-white' },
        { id: 'automation', label: 'Automation Rules', icon: Cpu },
      ],
    },
    {
      title: 'WELLNESS',
      items: [
        { id: 'wellness', label: 'Health & Wellness', icon: HeartPulse },
      ],
    },
    {
      title: 'SYSTEM',
      items: [
        { id: 'emergency', label: 'Emergency Replan', icon: AlertTriangle, badge: 'Urgent', badgeColor: 'bg-[#E05268] text-white' },
        { id: 'settings', label: 'Settings', icon: Settings },
      ],
    },
  ];

  return (
    <aside className="hidden lg:flex flex-col w-64 bg-[#F4F3FF] border-r border-[#E5E2F5] min-h-screen p-4 select-none z-20 shrink-0">
      {/* Brand Header */}
      <div className="flex items-center gap-3 px-2 py-3 mb-3 border-b border-[#E5E2F5]">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#6935C8] to-[#8B45F5] flex items-center justify-center text-white shadow-xs font-black text-base shrink-0">
          M
        </div>
        <div className="min-w-0">
          <h1 className="font-extrabold text-sm tracking-tight text-[#202033] leading-tight">
            Personal Assistant
          </h1>
          <p className="text-[11px] text-[#74738A] font-medium leading-tight">Lavender Enterprise</p>
        </div>
      </div>

      {/* Grouped Navigation Links */}
      <nav className="flex-1 space-y-4 overflow-y-auto pr-1">
        {navGroups.map((group) => (
          <div key={group.title} className="space-y-1">
            <h3 className="px-3 text-[10px] font-bold tracking-wider text-[#74738A] uppercase">
              {group.title}
            </h3>
            <div className="space-y-0.5">
              {group.items.map((item) => {
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
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs transition-all group relative text-left ${
                      isActive
                        ? 'bg-[#8B45F5] text-white font-bold shadow-xs'
                        : isEmergency
                        ? 'text-[#E05268] hover:bg-[#FFEAEF] font-semibold'
                        : 'text-[#202033] hover:bg-white/80 hover:text-[#6935C8] font-medium'
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 shrink-0 transition-colors ${
                        isActive
                          ? 'text-white stroke-[2.4]'
                          : isEmergency
                          ? 'text-[#E05268]'
                          : 'text-[#74738A] group-hover:text-[#8B45F5]'
                      }`}
                    />
                    <span className="truncate">{item.label}</span>

                    {item.badge && (
                      <span
                        className={`ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                          item.badgeColor || 'bg-[#EDE9FE] text-[#6935C8]'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}

                    {isActive && !item.badge && (
                      <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Sync Status Footer */}
      <div className="mt-3 p-3 rounded-xl bg-white border border-[#E5E2F5] shadow-2xs">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-[#74738A] text-[11px] font-medium">Authoritative Sync</span>
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#16A36A]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#16A36A] animate-pulse" />
            Live
          </span>
        </div>
        <p className="text-[10px] text-[#74738A]">Supabase PostgreSQL + BullMQ</p>
      </div>
    </aside>
  );
}
