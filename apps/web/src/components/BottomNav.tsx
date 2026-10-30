'use client';

import React from 'react';
import {
  LayoutDashboard,
  CalendarCheck,
  Repeat,
  Briefcase,
  AlertOctagon,
  HeartPulse,
} from 'lucide-react';
import { NavTab } from './Sidebar';

interface BottomNavProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onOpenEmergency: () => void;
}

export function BottomNav({ currentTab, onSelectTab, onOpenEmergency }: BottomNavProps) {
  const items: Array<{ id: NavTab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
    { id: 'my-day', label: 'My Day', icon: CalendarCheck },
    { id: 'routines', label: 'Routines', icon: Repeat },
    { id: 'work', label: 'Work', icon: Briefcase },
    { id: 'wellness', label: 'Wellness', icon: HeartPulse },
  ];

  return (
    <nav className="lg:hidden fixed bottom-3 left-3 right-3 z-40 glass-panel rounded-2xl border border-white/80 px-2 py-1.5 shadow-2xl backdrop-blur-2xl">
      <div className="flex items-center justify-around">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`flex flex-col items-center py-1 px-2.5 rounded-xl text-[10px] font-bold transition-all ${
                isActive
                  ? 'text-sky-600 scale-105'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <div
                className={`p-1.5 rounded-xl transition-all ${
                  isActive
                    ? 'bg-gradient-to-tr from-sky-400 to-sky-500 text-slate-950 shadow-glass-glow'
                    : 'glass-card text-slate-500'
                }`}
              >
                <Icon className="w-4 h-4" />
              </div>
              <span className="mt-1">{item.label}</span>
            </button>
          );
        })}

        <button
          onClick={onOpenEmergency}
          className="flex flex-col items-center py-1 px-2.5 rounded-xl text-[10px] font-bold text-rose-600 hover:scale-105 transition-all"
        >
          <div className="p-1.5 rounded-xl bg-gradient-to-tr from-rose-500 to-red-600 text-white shadow-glass-glow-rose">
            <AlertOctagon className="w-4 h-4 animate-pulse" />
          </div>
          <span className="mt-1">Urgent</span>
        </button>
      </div>
    </nav>
  );
}
