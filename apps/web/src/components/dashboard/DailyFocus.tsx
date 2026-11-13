import React from 'react';
import { TaskDto, Priority, TaskStatus } from '@assistant/shared';
import { CheckCircle2, Clock, ArrowRight, Circle } from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

export interface DailyFocusProps {
  tasks: TaskDto[];
  onCompleteTask: (taskId: string) => void;
  onNavigateTab: (tab: string) => void;
  onSelectTask?: (task: TaskDto) => void;
}

export const DailyFocus: React.FC<DailyFocusProps> = ({
  tasks,
  onCompleteTask,
  onNavigateTab,
  onSelectTask,
}) => {
  // Sort by priority (URGENT -> HIGH -> MEDIUM -> LOW) and filter non-completed
  const focusTasks = tasks
    .filter((t) => t.status !== TaskStatus.COMPLETED)
    .sort((a, b) => {
      const pOrder = { [Priority.URGENT]: 4, [Priority.HIGH]: 3, [Priority.MEDIUM]: 2, [Priority.LOW]: 1 };
      return (pOrder[b.priority] || 2) - (pOrder[a.priority] || 2);
    })
    .slice(0, 3);

  const getPriorityBadge = (priority: Priority) => {
    switch (priority) {
      case Priority.URGENT:
        return <Badge variant="danger" size="sm">Urgent</Badge>;
      case Priority.HIGH:
        return <Badge variant="warning" size="sm">High</Badge>;
      case Priority.MEDIUM:
        return <Badge variant="info" size="sm">Medium</Badge>;
      default:
        return <Badge variant="neutral" size="sm">Low</Badge>;
    }
  };

  return (
    <Card padding="md" className="flex flex-col h-full">
      <div className="flex items-center justify-between pb-3 border-b border-[#EAE7F1] mb-3">
        <div>
          <h2 className="text-sm font-bold text-[#202033]">Today&apos;s High-Impact Focus</h2>
          <p className="text-xs text-[#626176]">Top 3 priorities demanding your immediate attention</p>
        </div>
        <button
          onClick={() => onNavigateTab('work')}
          className="text-xs font-bold text-[#7653D6] hover:text-[#5636A9] flex items-center gap-1 transition-colors min-h-[44px] min-w-[44px] justify-end"
        >
          View all <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="space-y-2.5 flex-1">
        {focusTasks.length === 0 ? (
          <div className="py-6 text-center text-[#626176] text-xs">
            <CheckCircle2 className="w-8 h-8 text-[#168A5B] mx-auto mb-2 opacity-80" />
            <p className="font-bold text-[#202033]">All core priorities completed!</p>
            <p className="mt-0.5">Take a break or review upcoming milestones.</p>
          </div>
        ) : (
          focusTasks.map((task) => (
            <div
              key={task.id}
              onClick={() => onSelectTask?.(task)}
              className="flex items-center justify-between p-3 rounded-xl border border-[#EAE7F1] hover:border-[#DAD6E5] hover:bg-[#F7F5FC]/50 transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onCompleteTask(task.id);
                  }}
                  className="w-6 h-6 rounded-lg border border-[#DAD6E5] text-transparent hover:text-[#168A5B] hover:border-[#168A5B] flex items-center justify-center shrink-0 transition-all min-h-[44px] min-w-[44px]"
                  title="Mark task as complete"
                  aria-label={`Mark task ${task.title} as complete`}
                >
                  <Circle className="w-4 h-4 text-[#DAD6E5] group-hover:text-[#168A5B]" />
                </button>
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-[#202033] truncate group-hover:text-[#7653D6] transition-colors">
                    {task.title}
                  </h4>
                  {task.scheduledStartTime && (
                    <span className="text-[11px] text-[#626176] flex items-center gap-1 mt-0.5">
                      <Clock className="w-3 h-3" />
                      {new Date(task.scheduledStartTime).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  )}
                </div>
              </div>
              <div className="shrink-0 pl-2">{getPriorityBadge(task.priority)}</div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
};
