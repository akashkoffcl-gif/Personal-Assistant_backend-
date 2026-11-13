import React from 'react';
import { ProjectDto } from '@assistant/shared';
import { FolderKanban, ArrowRight } from 'lucide-react';
import { Card } from '../ui/Card';
import { ProgressBar } from '../ui/ProgressBar';

export interface ActiveProjectsProps {
  projects: ProjectDto[];
  onNavigateTab: (tab: string) => void;
  onSelectProject?: (project: ProjectDto) => void;
}

export const ActiveProjects: React.FC<ActiveProjectsProps> = ({
  projects,
  onNavigateTab,
  onSelectProject,
}) => {
  const displayProjects = projects.slice(0, 3);

  return (
    <Card padding="md" className="flex flex-col h-full">
      <div className="flex items-center justify-between pb-3 border-b border-[#EAE7F1] mb-3">
        <div>
          <h2 className="text-sm font-bold text-[#202033]">Active Project Deliverables</h2>
          <p className="text-xs text-[#626176]">Progress across ongoing deliverables</p>
        </div>
        <button
          onClick={() => onNavigateTab('projects')}
          className="text-xs font-bold text-[#7653D6] hover:text-[#5636A9] flex items-center gap-1 transition-colors min-h-[44px] min-w-[44px] justify-end"
        >
          All projects <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="space-y-3 flex-1">
        {displayProjects.length === 0 ? (
          <div className="py-6 text-center text-[#626176] text-xs">
            <FolderKanban className="w-8 h-8 text-[#DAD6E5] mx-auto mb-2" />
            <p className="font-bold text-[#202033]">No active projects</p>
            <p className="mt-0.5">Create your first project to organize multi-step work.</p>
          </div>
        ) : (
          displayProjects.map((p) => {
            const progress = (p as any).progressPercent ?? 45;
            return (
              <div
                key={p.id}
                onClick={() => onSelectProject?.(p)}
                className="p-3 rounded-xl border border-[#EAE7F1] hover:border-[#DAD6E5] hover:bg-[#F7F5FC]/50 transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-[#202033] truncate group-hover:text-[#7653D6] transition-colors">
                    {p.title}
                  </span>
                  <span className="text-xs font-bold text-[#7653D6]">{progress}%</span>
                </div>
                <ProgressBar value={progress} size="sm" variant="primary" />
              </div>
            );
          })
        )}
      </div>
    </Card>
  );
};
