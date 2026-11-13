import React from 'react';
import { NavTab } from '../HorizontalNavbar';
import { BottomNav } from '../BottomNav';

export interface AppShellProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onOpenEmergency: () => void;
  onOpenAIAssistant?: () => void;
  header: React.ReactNode;
  children: React.ReactNode;
  overlays?: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({
  currentTab,
  onSelectTab,
  onOpenEmergency,
  onOpenAIAssistant,
  header,
  children,
  overlays,
}) => {
  return (
    <div className="min-h-screen bg-[#F7F5FC] text-[#202033] flex flex-col selection:bg-[#7653D6]/20 selection:text-[#5636A9]">
      {/* Desktop & Mobile Responsive Header */}
      {header}

      {/* Main Content Viewport with Responsive Padding & Safe-Area Bounds */}
      <div
        className={`flex-1 flex flex-col w-full mx-auto transition-all ${
          currentTab === 'dashboard' || currentTab === 'usage-analytics'
            ? 'min-h-0 pb-20 lg:pb-6'
            : 'px-3 sm:px-5 lg:px-6 max-w-[1680px] space-y-6 pb-24 lg:pb-8'
        }`}
      >
        {children}
      </div>

      {/* Mobile-First Fixed 5-Tab Bottom Navigation Bar */}
      <BottomNav
        currentTab={currentTab}
        onSelectTab={onSelectTab}
        onOpenEmergency={onOpenEmergency}
        onOpenAIAssistant={onOpenAIAssistant}
      />

      {/* Global Overlays, Portals, and AI Experiences */}
      {overlays}
    </div>
  );
};
