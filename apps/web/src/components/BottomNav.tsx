'use client';

import React from 'react';
import {
  LayoutDashboard,
  CalendarCheck,
  Repeat,
  Briefcase,
  AlertTriangle,
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
    { id: 'work', label: 'Work', icon: Briefcase },
    { id: 'routines', label: 'Routines', icon: Repeat },
    { id: 'wellness', label: 'Wellness', icon: HeartPulse },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 px-3 py-1 shadow-lg">
      <div className="flex items-center justify-around">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`flex flex-col items-center py-1 px-2 text-[11px] font-medium transition-colors ${
                isActive ? 'text-blue-600' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <div
                className={`p-1 rounded-md transition-colors ${
                  isActive ? 'bg-blue-50 text-blue-600' : 'text-slate-500'
                }`}
              >
                <Icon className="w-4 h-4" />
              </div>
              <span className="mt-0.5">{item.label}</span>
            </button>
          );
        })}

        <button
          onClick={onOpenEmergency}
          className="flex flex-col items-center py-1 px-2 text-[11px] font-medium text-red-600 hover:text-red-700"
        >
          <div className="p-1 rounded-md bg-red-50 text-red-600">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <span className="mt-0.5">Urgent</span>
        </button>
      </div>
    </nav>
  );
}
