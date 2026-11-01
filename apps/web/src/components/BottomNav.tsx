'use client';

import React from 'react';
import {
  LayoutDashboard,
  CalendarCheck,
  Repeat,
  Briefcase,
  AlertTriangle,
  HeartPulse,
  Activity,
} from 'lucide-react';
import { NavTab } from './HorizontalNavbar';

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
    { id: 'usage-analytics', label: 'Analytics', icon: Activity },
    { id: 'wellness', label: 'Wellness', icon: HeartPulse },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-[#E5E2F5] px-2 py-1 shadow-lg">
      <div className="flex items-center justify-around">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`flex flex-col items-center py-1 px-1.5 text-[10px] font-bold transition-colors ${
                isActive ? 'text-[#8B45F5]' : 'text-[#74738A] hover:text-[#202033]'
              }`}
            >
              <div
                className={`p-1 rounded-xl transition-colors ${
                  isActive ? 'bg-[#F4F3FF] text-[#8B45F5]' : 'text-[#74738A]'
                }`}
              >
                <Icon className="w-4 h-4" />
              </div>
              <span className="mt-0.5 truncate max-w-[50px]">{item.label}</span>
            </button>
          );
        })}

        <button
          onClick={onOpenEmergency}
          className="flex flex-col items-center py-1 px-1.5 text-[10px] font-bold text-[#E05268] hover:text-[#C4384E]"
        >
          <div className="p-1 rounded-xl bg-[#FFEAEF] text-[#E05268]">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <span className="mt-0.5">Urgent</span>
        </button>
      </div>
    </nav>
  );
}
