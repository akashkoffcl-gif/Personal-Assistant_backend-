'use client';

import React, { useState } from 'react';
import {
  LayoutDashboard,
  CalendarCheck,
  Briefcase,
  Repeat,
  MoreHorizontal,
  Activity,
  HeartPulse,
  FolderKanban,
  Settings,
  AlertTriangle,
  X,
  Target,
  Sparkles,
} from 'lucide-react';
import { NavTab } from './HorizontalNavbar';

interface BottomNavProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onOpenEmergency: () => void;
  onOpenAIAssistant?: () => void;
}

export function BottomNav({
  currentTab,
  onSelectTab,
  onOpenEmergency,
  onOpenAIAssistant,
}: BottomNavProps) {
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  // Phase 3 Master Standard: 5 primary touch navigation items
  const primaryTabs: Array<{ id: NavTab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
    { id: 'my-day', label: 'My Day', icon: CalendarCheck },
    { id: 'work', label: 'Work', icon: Briefcase },
    { id: 'routines', label: 'Routines', icon: Repeat },
  ];

  const secondaryModules: Array<{
    id: NavTab;
    label: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    accentColor: string;
  }> = [
    { id: 'usage-analytics', label: 'Analytics', description: 'Productivity trends & focus metrics', icon: Activity, accentColor: '#3985DB' },
    { id: 'wellness', label: 'Wellness', description: 'Rest, nutrition & routine pacing', icon: HeartPulse, accentColor: '#16A36A' },
    { id: 'projects', label: 'Projects', description: 'Milestones, tasks & team deliverables', icon: FolderKanban, accentColor: '#7653D6' },
    { id: 'goals', label: 'Goals', description: 'Quarterly OKRs & key results', icon: Target, accentColor: '#E5A12B' },
  ];

  return (
    <>
      {/* 1. Slide-up 'More' Sheet for Secondary Modules on Mobile */}
      {isMoreOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className="w-full bg-white rounded-t-3xl border-t border-[#EAE7F1] shadow-2xl p-5 pb-[calc(env(safe-area-inset-bottom,0px)+5.5rem)] animate-in slide-in-from-bottom duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#EAE7F1] mb-3">
              <span className="text-sm font-bold text-[#202033]">More Modules & Workspaces</span>
              <button
                onClick={() => setIsMoreOpen(false)}
                className="w-8 h-8 rounded-full bg-[#F7F5FC] text-[#747387] flex items-center justify-center hover:text-[#202033]"
                aria-label="Close menu"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {secondaryModules.map((mod) => {
                const Icon = mod.icon;
                const isCurrent = currentTab === mod.id;
                return (
                  <button
                    key={mod.id}
                    onClick={() => {
                      onSelectTab(mod.id);
                      setIsMoreOpen(false);
                    }}
                    className={`flex flex-col text-left p-3 rounded-2xl border transition-all min-h-[58px] ${
                      isCurrent
                        ? 'border-[#7653D6] bg-[#F7F5FC] shadow-xs'
                        : 'border-[#EAE7F1] bg-white hover:border-[#DAD6E5]'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div
                        className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `${mod.accentColor}15`, color: mod.accentColor }}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-bold text-[#202033]">{mod.label}</span>
                    </div>
                    <span className="text-[10px] text-[#747387] line-clamp-1">{mod.description}</span>
                  </button>
                );
              })}
            </div>

            {/* Emergency Schedule Mitigation Action */}
            <div className="mt-3 pt-3 border-t border-[#EAE7F1] flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-[#DC4B55] flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Emergency Schedule Replan
                </span>
                <span className="text-[10px] text-[#747387] block">Auto-shift flexible tasks without losing appointments</span>
              </div>
              <button
                onClick={() => {
                  setIsMoreOpen(false);
                  onOpenEmergency();
                }}
                className="px-3 py-1.5 rounded-xl bg-[#DC4B55]/10 text-[#DC4B55] hover:bg-[#DC4B55] hover:text-white text-xs font-bold transition-all min-h-[44px] flex items-center"
              >
                Replan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Fixed Mobile Bottom Navigation Bar with Safe-Area Standard */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#EAE7F1] px-2 pt-1.5 pb-[calc(env(safe-area-inset-bottom,0px)+0.35rem)] shadow-[0_-4px_20px_rgba(32,32,51,0.05)]"
        aria-label="Mobile Bottom Navigation"
      >
        <div className="flex items-center justify-around max-w-lg mx-auto">
          {primaryTabs.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => {
                  setIsMoreOpen(false);
                  onSelectTab(item.id);
                }}
                className={`flex flex-col items-center justify-center min-w-[56px] min-h-[48px] py-1 px-2 rounded-xl transition-all ${
                  isActive ? 'text-[#7653D6]' : 'text-[#747387] hover:text-[#202033]'
                }`}
                aria-current={isActive ? 'page' : undefined}
              >
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
                    isActive ? 'bg-[#7653D6]/10 text-[#7653D6] scale-105' : 'text-[#747387]'
                  }`}
                >
                  <Icon className="w-4 h-4 stroke-[2.2]" />
                </div>
                <span className="text-[11px] font-bold mt-0.5 tracking-tight">{item.label}</span>
              </button>
            );
          })}

          {/* 5th Tab: More Button */}
          <button
            onClick={() => setIsMoreOpen((prev) => !prev)}
            className={`flex flex-col items-center justify-center min-w-[56px] min-h-[48px] py-1 px-2 rounded-xl transition-all ${
              isMoreOpen || secondaryModules.some((m) => m.id === currentTab)
                ? 'text-[#7653D6]'
                : 'text-[#747387] hover:text-[#202033]'
            }`}
            aria-expanded={isMoreOpen}
            aria-label="More navigation workspaces"
          >
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
                isMoreOpen || secondaryModules.some((m) => m.id === currentTab)
                  ? 'bg-[#7653D6]/10 text-[#7653D6] scale-105'
                  : 'text-[#747387]'
              }`}
            >
              <MoreHorizontal className="w-4 h-4 stroke-[2.2]" />
            </div>
            <span className="text-[11px] font-bold mt-0.5 tracking-tight">More</span>
          </button>
        </div>
      </nav>
    </>
  );
}
