import React from 'react';
import { format } from 'date-fns';
import { Clock, CalendarCheck, AlertTriangle } from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';

export interface UpcomingActivitiesProps {
  timelineItems: Array<{
    id: string;
    time: string;
    title: string;
    category: string;
    priority: 'High' | 'Medium' | 'Low';
    status: 'Completed' | 'In Progress' | 'Upcoming';
    rawItem?: any;
  }>;
  onNavigateTab: (tab: string) => void;
}

export const UpcomingActivities: React.FC<UpcomingActivitiesProps> = ({
  timelineItems,
  onNavigateTab,
}) => {
  const upcomingOnly = timelineItems
    .filter((item) => item.status !== 'Completed')
    .slice(0, 4);

  return (
    <Card padding="md" className="flex flex-col h-full">
      <div className="flex items-center justify-between pb-3 border-b border-[#EAE7F1] mb-3">
        <div>
          <h2 className="text-sm font-bold text-[#202033]">Upcoming Chronological Schedule</h2>
          <p className="text-xs text-[#626176]">Sorted in your local timezone</p>
        </div>
        <button
          onClick={() => onNavigateTab('my-day')}
          className="text-xs font-bold text-[#7653D6] hover:text-[#5636A9] transition-colors min-h-[44px] min-w-[44px] flex items-center justify-end"
        >
          My Day
        </button>
      </div>

      <div className="space-y-2.5 flex-1">
        {upcomingOnly.length === 0 ? (
          <div className="py-6 text-center text-[#626176] text-xs">
            <CalendarCheck className="w-8 h-8 text-[#168A5B] mx-auto mb-2 opacity-80" />
            <p className="font-bold text-[#202033]">Your timeline is clear for now</p>
            <p className="mt-0.5">No immediate items scheduled.</p>
          </div>
        ) : (
          upcomingOnly.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between p-2.5 rounded-xl border border-[#EAE7F1] hover:border-[#DAD6E5] bg-white transition-all"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-[#7653D6]/10 text-[#7653D6] flex items-center justify-center shrink-0">
                  <Clock className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-[#202033] truncate">{item.title}</h4>
                  <span className="text-[11px] text-[#626176] block truncate">
                    {item.time} • {item.category}
                  </span>
                </div>
              </div>
              <Badge
                variant={
                  item.priority === 'High'
                    ? 'danger'
                    : item.priority === 'Medium'
                    ? 'warning'
                    : 'neutral'
                }
                size="sm"
              >
                {item.priority}
              </Badge>
            </div>
          ))
        )}
      </div>
    </Card>
  );
};
