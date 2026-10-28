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
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 px-2 py-1 shadow-lg">
      <div className="flex items-center justify-around">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`flex flex-col items-center py-1.5 px-3 rounded-lg text-[10px] font-medium transition-colors ${
                isActive ? 'text-assistant-navy font-bold' : 'text-assistant-coolGrey hover:text-slate-800'
              }`}
            >
              <div
                className={`p-1 rounded-md transition-colors ${
                  isActive ? 'bg-assistant-paleSky text-assistant-navy' : ''
                }`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <span className="mt-0.5">{item.label}</span>
            </button>
          );
        })}

        <button
          onClick={onOpenEmergency}
          className="flex flex-col items-center py-1.5 px-3 rounded-lg text-[10px] font-bold text-assistant-red"
        >
          <div className="p-1 rounded-md bg-red-100 text-assistant-red">
            <AlertOctagon className="w-5 h-5" />
          </div>
          <span className="mt-0.5">Urgent</span>
        </button>
      </div>
    </nav>
  );
}

