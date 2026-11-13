import React from 'react';
import { format } from 'date-fns';
import { Plus, Bell, Sparkles } from 'lucide-react';
import { Button } from '../ui/Button';

export interface DashboardWelcomeProps {
  userName: string;
  selectedDate: string;
  onOpenCreateTask: () => void;
  onOpenCreateRoutine?: () => void;
  unreadNotificationsCount?: number;
  onOpenNotifications?: () => void;
  productivityScore?: number;
}

export const DashboardWelcome: React.FC<DashboardWelcomeProps> = ({
  userName,
  selectedDate,
  onOpenCreateTask,
  onOpenCreateRoutine,
  unreadNotificationsCount = 0,
  onOpenNotifications,
  productivityScore = 92,
}) => {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const formattedDate = format(new Date(selectedDate), 'EEEE, MMMM d, yyyy');

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-[#EAE7F1] rounded-2xl p-4 sm:p-5 shadow-[0_4px_16px_-2px_rgba(32,32,51,0.04)]">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#5636A9] to-[#7653D6] text-white flex items-center justify-center shrink-0 shadow-[0_2px_8px_rgba(118,83,214,0.3)]">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-base sm:text-lg font-black text-[#202033] tracking-tight leading-tight">
            {greeting}, {userName}!
          </h1>
          <p className="text-xs text-[#626176] font-medium mt-0.5">
            {formattedDate} • Productivity pace is <span className="text-[#168A5B] font-bold">{productivityScore}%</span>
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 self-start sm:self-auto">
        {onOpenNotifications && (
          <button
            onClick={onOpenNotifications}
            className="w-11 h-11 rounded-xl border border-[#EAE7F1] bg-[#F7F5FC] hover:bg-[#EAE7F1] text-[#202033] flex items-center justify-center relative transition-all"
            aria-label="View notifications"
          >
            <Bell className="w-4 h-4 text-[#626176]" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#DC4B55] ring-2 ring-white" />
            )}
          </button>
        )}
        {onOpenCreateRoutine && (
          <Button
            variant="secondary"
            size="sm"
            onClick={onOpenCreateRoutine}
            className="hidden sm:inline-flex"
          >
            + Routine
          </Button>
        )}
        <Button
          variant="primary"
          size="sm"
          onClick={onOpenCreateTask}
          leftIcon={<Plus className="w-3.5 h-3.5 stroke-[2.5]" />}
        >
          Quick Add
        </Button>
      </div>
    </div>
  );
};
