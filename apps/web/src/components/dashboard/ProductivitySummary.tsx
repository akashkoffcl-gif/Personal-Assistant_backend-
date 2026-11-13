import React from 'react';
import { CheckCircle2, RotateCcw, AlertTriangle, Timer, ArrowUpRight } from 'lucide-react';
import { Card } from '../ui/Card';

export interface ProductivitySummaryProps {
  completedTasks: number;
  totalTasks: number;
  taskPercentage: number;
  routineAdherence: number;
  completedRoutines: number;
  totalRoutines: number;
  overdueCount: number;
  focusTimeText: string;
  onNavigateTab: (tab: string, meta?: any) => void;
}

export const ProductivitySummary: React.FC<ProductivitySummaryProps> = ({
  completedTasks,
  totalTasks,
  taskPercentage,
  routineAdherence,
  completedRoutines,
  totalRoutines,
  overdueCount,
  focusTimeText,
  onNavigateTab,
}) => {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {/* Metric 1: Tasks */}
      <Card
        variant="interactive"
        padding="sm"
        onClick={() => onNavigateTab('work', { filter: 'completed' })}
        className="border-l-4 border-l-[#168A5B] flex flex-col justify-between"
      >
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] font-bold text-[#626176] uppercase tracking-wider">
            Tasks Completed
          </span>
          <div className="w-6 h-6 rounded-lg bg-[#168A5B]/10 text-[#168A5B] flex items-center justify-center">
            <CheckCircle2 className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="flex items-baseline justify-between mt-1">
          <span className="text-xl sm:text-2xl font-black text-[#202033] tracking-tight">
            {completedTasks}/{totalTasks}
          </span>
          <span className="text-xs font-bold text-[#168A5B]">{taskPercentage}%</span>
        </div>
      </Card>

      {/* Metric 2: Routines */}
      <Card
        variant="interactive"
        padding="sm"
        onClick={() => onNavigateTab('routines')}
        className="border-l-4 border-l-[#7653D6] flex flex-col justify-between"
      >
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] font-bold text-[#626176] uppercase tracking-wider">
            Routine Adherence
          </span>
          <div className="w-6 h-6 rounded-lg bg-[#7653D6]/10 text-[#7653D6] flex items-center justify-center">
            <RotateCcw className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="flex items-baseline justify-between mt-1">
          <span className="text-xl sm:text-2xl font-black text-[#7653D6] tracking-tight">
            {routineAdherence}%
          </span>
          <span className="text-[11px] text-[#626176] font-medium">
            {completedRoutines}/{totalRoutines} Done
          </span>
        </div>
      </Card>

      {/* Metric 3: Overdue */}
      <Card
        variant="interactive"
        padding="sm"
        onClick={() => onNavigateTab('work', { filter: 'overdue' })}
        className={`border-l-4 ${
          overdueCount > 0 ? 'border-l-[#C43D4B]' : 'border-l-[#168A5B]'
        } flex flex-col justify-between`}
      >
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] font-bold text-[#626176] uppercase tracking-wider">
            Overdue Tasks
          </span>
          <div
            className={`w-6 h-6 rounded-lg ${
              overdueCount > 0 ? 'bg-[#C43D4B]/10 text-[#C43D4B]' : 'bg-[#168A5B]/10 text-[#168A5B]'
            } flex items-center justify-center`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="flex items-baseline justify-between mt-1">
          <span
            className={`text-xl sm:text-2xl font-black tracking-tight ${
              overdueCount > 0 ? 'text-[#C43D4B]' : 'text-[#202033]'
            }`}
          >
            {overdueCount}
          </span>
          <span className="text-[11px] text-[#626176] font-medium">
            {overdueCount === 0 ? 'All up to date' : 'Requires attention'}
          </span>
        </div>
      </Card>

      {/* Metric 4: Focus Time */}
      <Card
        variant="interactive"
        padding="sm"
        onClick={() => onNavigateTab('focus')}
        className="border-l-4 border-l-[#3276C9] flex flex-col justify-between"
      >
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] font-bold text-[#626176] uppercase tracking-wider">
            Deep Work Focus
          </span>
          <div className="w-6 h-6 rounded-lg bg-[#3276C9]/10 text-[#3276C9] flex items-center justify-center">
            <Timer className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="flex items-baseline justify-between mt-1">
          <span className="text-xl sm:text-2xl font-black text-[#202033] tracking-tight">
            {focusTimeText}
          </span>
          <span className="text-[11px] text-[#3276C9] font-bold flex items-center gap-0.5">
            Focus Studio <ArrowUpRight className="w-3 h-3" />
          </span>
        </div>
      </Card>
    </div>
  );
};
