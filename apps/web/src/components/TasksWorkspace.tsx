'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { format } from 'date-fns';
import {
  CheckSquare,
  Plus,
  Search,
  Filter,
  ArrowUpDown,
  CheckCircle2,
  Clock,
  AlertCircle,
  Tag,
  FolderKanban,
  Trash2,
  Edit2,
  Calendar,
  Check,
  ChevronDown,
  Timer,
  LayoutList,
  Columns,
} from 'lucide-react';
import { toast } from '@/components/Toast';

interface TasksWorkspaceProps {
  projects: any[];
  onOpenCreateTask: () => void;
  onSelectTask: (task: any) => void;
  onNavigateTab?: (tab: string) => void;
}

export const TasksWorkspace: React.FC<TasksWorkspaceProps> = ({
  projects,
  onOpenCreateTask,
  onSelectTask,
  onNavigateTab,
}) => {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProject, setSelectedProject] = useState<string>('ALL');
  const [selectedPriority, setSelectedPriority] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [activeTab, setActiveTab] = useState<'ALL' | 'TODO' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE'>('ALL');
  const [viewMode, setViewMode] = useState<'LIST' | 'BOARD'>('LIST');

  // Fetch Authoritative Tasks
  const { data: tasksData, isLoading } = useQuery({
    queryKey: ['tasks-management'],
    queryFn: () => api.getTasks(),
    staleTime: 15000,
  });

  const tasks: any[] = Array.isArray(tasksData) ? tasksData : (tasksData as any)?.data || [];

  // Mutations
  const completeTaskMutation = useMutation({
    mutationFn: (id: string) => api.completeTask(id),
    onSuccess: () => {
      toast.success('Task Completed', 'Task status updated.');
      queryClient.invalidateQueries({ queryKey: ['tasks-management'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['daily-kpi'] });
    },
    onError: (err: any) => {
      toast.error('Task Action Failed', err?.message || 'Could not update task.');
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (id: string) => api.deleteTask(id),
    onSuccess: () => {
      toast.success('Task Deleted', 'Record removed from workspace.');
      queryClient.invalidateQueries({ queryKey: ['tasks-management'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
    onError: (err: any) => {
      toast.error('Delete Failed', err?.message || 'Could not delete task.');
    },
  });

  // Calculate Metrics
  const totalTasks = tasks.length;
  const todoCount = tasks.filter((t) => t.status === 'TODO').length;
  const inProgressCount = tasks.filter((t) => t.status === 'IN_PROGRESS').length;
  const completedCount = tasks.filter((t) => t.status === 'COMPLETED').length;
  const now = new Date();
  const overdueCount = tasks.filter(
    (t) => t.status !== 'COMPLETED' && t.deadline && new Date(t.deadline) < now,
  ).length;

  // Filter Tasks
  const filteredTasks = tasks.filter((t) => {
    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = t.title?.toLowerCase().includes(q);
      const matchNotes = t.notes?.toLowerCase().includes(q);
      const matchProject = t.project?.title?.toLowerCase().includes(q);
      if (!matchTitle && !matchNotes && !matchProject) return false;
    }

    // Active status filter tab
    if (activeTab === 'TODO' && t.status !== 'TODO') return false;
    if (activeTab === 'IN_PROGRESS' && t.status !== 'IN_PROGRESS') return false;
    if (activeTab === 'COMPLETED' && t.status !== 'COMPLETED') return false;
    if (activeTab === 'OVERDUE') {
      const isOverdue = t.status !== 'COMPLETED' && t.deadline && new Date(t.deadline) < now;
      if (!isOverdue) return false;
    }

    // Secondary filters
    if (selectedProject !== 'ALL' && t.projectId !== selectedProject) return false;
    if (selectedPriority !== 'ALL' && t.priority !== selectedPriority) return false;
    if (selectedStatus !== 'ALL' && t.status !== selectedStatus) return false;

    return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* 1. Header with Actions */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#E5E2F5] shadow-[0_4px_24px_rgba(139,69,245,0.04)] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="p-2 rounded-xl bg-[#F4F3FF] text-[#8B45F5] border border-[#DDD8F8]">
            <CheckSquare className="w-5 h-5 stroke-[2.2]" />
          </span>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-[#202033] tracking-tight">
              Task Management
            </h1>
            <p className="text-xs text-[#74738A] font-medium">
              Enterprise work tracker, priorities, subtask trees & scheduling lifecycle
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-[#F4F3FF] p-1 rounded-2xl border border-[#E5E2F5]">
            <button
              onClick={() => setViewMode('LIST')}
              className={`p-1.5 rounded-xl transition-all ${
                viewMode === 'LIST'
                  ? 'bg-white text-[#8B45F5] shadow-xs'
                  : 'text-[#74738A] hover:text-[#202033]'
              }`}
              title="Table / List View"
            >
              <LayoutList className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('BOARD')}
              className={`p-1.5 rounded-xl transition-all ${
                viewMode === 'BOARD'
                  ? 'bg-white text-[#8B45F5] shadow-xs'
                  : 'text-[#74738A] hover:text-[#202033]'
              }`}
              title="Kanban Board View"
            >
              <Columns className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={onOpenCreateTask}
            className="px-4 py-2 rounded-xl bg-[#8B45F5] hover:bg-[#7839D6] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all transform active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>New Task</span>
          </button>
        </div>
      </div>

      {/* 2. Task Operational Metric Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <button
          onClick={() => setActiveTab('ALL')}
          className={`p-4 rounded-2xl border text-left transition-all ${
            activeTab === 'ALL'
              ? 'bg-[#F4F3FF] border-[#8B45F5] shadow-xs ring-1 ring-[#8B45F5]'
              : 'bg-white border-[#E5E2F5] hover:border-[#DDD8F8]'
          }`}
        >
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#74738A] block">
            Total Tasks
          </span>
          <span className="text-2xl font-black text-[#202033] mt-1 block">{totalTasks}</span>
          <span className="text-[10px] text-[#74738A] font-semibold">Workspace backlog</span>
        </button>

        <button
          onClick={() => setActiveTab('TODO')}
          className={`p-4 rounded-2xl border text-left transition-all ${
            activeTab === 'TODO'
              ? 'bg-[#F4F3FF] border-[#8B45F5] shadow-xs ring-1 ring-[#8B45F5]'
              : 'bg-white border-[#E5E2F5] hover:border-[#DDD8F8]'
          }`}
        >
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#6935C8] block">
            To Do
          </span>
          <span className="text-2xl font-black text-[#6935C8] mt-1 block">{todoCount}</span>
          <span className="text-[10px] text-[#74738A] font-semibold">Ready to start</span>
        </button>

        <button
          onClick={() => setActiveTab('IN_PROGRESS')}
          className={`p-4 rounded-2xl border text-left transition-all ${
            activeTab === 'IN_PROGRESS'
              ? 'bg-[#F4F3FF] border-[#8B45F5] shadow-xs ring-1 ring-[#8B45F5]'
              : 'bg-white border-[#E5E2F5] hover:border-[#DDD8F8]'
          }`}
        >
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#3B82F6] block">
            In Progress
          </span>
          <span className="text-2xl font-black text-[#3B82F6] mt-1 block">{inProgressCount}</span>
          <span className="text-[10px] text-[#74738A] font-semibold">Under active execution</span>
        </button>

        <button
          onClick={() => setActiveTab('COMPLETED')}
          className={`p-4 rounded-2xl border text-left transition-all ${
            activeTab === 'COMPLETED'
              ? 'bg-[#F4F3FF] border-[#8B45F5] shadow-xs ring-1 ring-[#8B45F5]'
              : 'bg-white border-[#E5E2F5] hover:border-[#DDD8F8]'
          }`}
        >
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#10B981] block">
            Completed
          </span>
          <span className="text-2xl font-black text-[#10B981] mt-1 block">{completedCount}</span>
          <span className="text-[10px] text-[#10B981] font-semibold">
            {totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0}% success rate
          </span>
        </button>

        <button
          onClick={() => setActiveTab('OVERDUE')}
          className={`p-4 rounded-2xl border text-left transition-all col-span-2 sm:col-span-1 ${
            activeTab === 'OVERDUE'
              ? 'bg-[#FFF5F7] border-[#E05268] shadow-xs ring-1 ring-[#E05268]'
              : 'bg-white border-[#E5E2F5] hover:border-[#DDD8F8]'
          }`}
        >
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#E05268] block">
            Overdue
          </span>
          <span className="text-2xl font-black text-[#E05268] mt-1 block">{overdueCount}</span>
          <span className="text-[10px] text-[#E05268] font-semibold">Missed deadline</span>
        </button>
      </div>

      {/* 3. Search and Multi-Dimensional Filter Bar */}
      <div className="bg-white rounded-2xl p-4 border border-[#E5E2F5] shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          {/* Search Bar */}
          <div className="sm:col-span-2 relative">
            <Search className="w-4 h-4 text-[#74738A] absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tasks by title, project, notes..."
              className="w-full pl-9 pr-8 py-2 rounded-xl border border-[#E5E2F5] bg-[#F8F7FF] text-xs font-medium text-[#202033] focus:outline-hidden focus:border-[#8B45F5]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2 text-xs font-bold text-[#74738A] hover:text-[#202033]"
              >
                ✕
              </button>
            )}
          </div>

          {/* Project Filter */}
          <div>
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[#E5E2F5] bg-[#F8F7FF] text-xs font-semibold text-[#202033] focus:outline-hidden focus:border-[#8B45F5]"
            >
              <option value="ALL">All Projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  📁 {p.title}
                </option>
              ))}
            </select>
          </div>

          {/* Priority Filter */}
          <div>
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[#E5E2F5] bg-[#F8F7FF] text-xs font-semibold text-[#202033] focus:outline-hidden focus:border-[#8B45F5]"
            >
              <option value="ALL">All Priorities</option>
              <option value="URGENT">Urgent Priority</option>
              <option value="HIGH">High Priority</option>
              <option value="MEDIUM">Medium Priority</option>
              <option value="LOW">Low Priority</option>
            </select>
          </div>
        </div>
      </div>

      {/* 4. Task List / Board Workspace */}
      {viewMode === 'LIST' ? (
        <div className="bg-white rounded-3xl border border-[#E5E2F5] shadow-xs overflow-hidden">
          {isLoading ? (
            <div className="p-12 text-center">
              <div className="w-8 h-8 rounded-full border-2 border-[#8B45F5] border-t-transparent animate-spin mx-auto mb-2" />
              <p className="text-xs font-bold text-[#202033]">Loading task register...</p>
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <CheckCircle2 className="w-8 h-8 text-slate-300 mx-auto" />
              <h4 className="text-xs font-bold text-[#202033]">No tasks found</h4>
              <p className="text-[11px] text-[#74738A]">Try adjusting your search or active filters.</p>
            </div>
          ) : (
            <div className="divide-y divide-[#F0F2FA]">
              {filteredTasks.map((t) => {
                const isDone = t.status === 'COMPLETED';
                const isOverdue = !isDone && t.deadline && new Date(t.deadline) < now;

                return (
                  <div
                    key={t.id}
                    className={`p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors hover:bg-[#F8F7FF] ${
                      isDone ? 'bg-[#FAF9FF]/60 opacity-75' : ''
                    }`}
                  >
                    <div
                      onClick={() => onSelectTask(t)}
                      className="flex-1 min-w-0 cursor-pointer"
                    >
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span
                          className={`text-xs sm:text-sm font-bold transition-colors ${
                            isDone ? 'line-through text-[#74738A]' : 'text-[#202033] hover:text-[#8B45F5]'
                          }`}
                        >
                          {t.title}
                        </span>

                        <span
                          className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                            t.status === 'COMPLETED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : t.status === 'IN_PROGRESS'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {t.status}
                        </span>

                        <span
                          className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded ${
                            t.priority === 'URGENT' || t.priority === 'HIGH'
                              ? 'bg-[#FEE2E2] text-[#DC2626]'
                              : 'bg-slate-100 text-[#74738A]'
                          }`}
                        >
                          {t.priority}
                        </span>

                        {t.project && (
                          <span className="text-[10px] font-bold px-2 py-0.2 rounded bg-[#F4F3FF] text-[#6935C8] border border-[#DDD8F8] flex items-center gap-1">
                            <FolderKanban className="w-3 h-3" />
                            {t.project.title}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-[11px] text-[#74738A] flex-wrap">
                        {t.estimatedDurationMinutes && (
                          <span>Duration: {t.estimatedDurationMinutes}m</span>
                        )}
                        {t.scheduledStartTime && (
                          <span>Scheduled: {format(new Date(t.scheduledStartTime), 'MMM d, h:mm a')}</span>
                        )}
                        {t.deadline && (
                          <span className={isOverdue ? 'text-[#E05268] font-bold' : ''}>
                            Due: {format(new Date(t.deadline), 'MMM d, yyyy')}
                          </span>
                        )}
                        {t.subtasks && t.subtasks.length > 0 && (
                          <span>
                            Subtasks: {t.subtasks.filter((s: any) => s.isCompleted).length}/{t.subtasks.length}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {!isDone && (
                        <button
                          onClick={() => completeTaskMutation.mutate(t.id)}
                          className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold transition-colors flex items-center gap-1"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Done</span>
                        </button>
                      )}

                      <button
                        onClick={() => onSelectTask(t)}
                        className="p-2 rounded-xl text-[#74738A] hover:text-[#202033] hover:bg-slate-100 transition-colors"
                        title="Edit task"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => {
                          if (window.confirm(`Delete task "${t.title}"?`)) {
                            deleteTaskMutation.mutate(t.id);
                          }
                        }}
                        className="p-2 rounded-xl text-[#74738A] hover:text-[#E05268] hover:bg-rose-50 transition-colors"
                        title="Delete task"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* Kanban Board View */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(['TODO', 'IN_PROGRESS', 'COMPLETED'] as const).map((colStatus) => {
            const colTasks = filteredTasks.filter((t) => t.status === colStatus);
            return (
              <div
                key={colStatus}
                className="bg-white rounded-3xl p-4 border border-[#E5E2F5] shadow-xs flex flex-col h-[600px]"
              >
                <div className="flex items-center justify-between pb-3 border-b border-[#F0F2FA] mb-3">
                  <h3 className="text-xs font-black uppercase tracking-wider text-[#202033]">
                    {colStatus === 'TODO' ? 'To Do' : colStatus === 'IN_PROGRESS' ? 'In Progress' : 'Completed'} ({colTasks.length})
                  </h3>
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      colStatus === 'COMPLETED'
                        ? 'bg-[#10B981]'
                        : colStatus === 'IN_PROGRESS'
                        ? 'bg-[#3B82F6]'
                        : 'bg-[#8B45F5]'
                    }`}
                  />
                </div>

                <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
                  {colTasks.length === 0 ? (
                    <div className="py-8 text-center text-xs text-[#74738A] italic">
                      No tasks in this lane
                    </div>
                  ) : (
                    colTasks.map((t) => (
                      <div
                        key={t.id}
                        onClick={() => onSelectTask(t)}
                        className="p-3.5 rounded-2xl border border-[#E5E2F5] hover:border-[#DDD8F8] bg-[#FAF9FF] transition-all cursor-pointer space-y-2 shadow-2xs"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-xs font-bold text-[#202033] line-clamp-2">
                            {t.title}
                          </span>
                          <span
                            className={`text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded ${
                              t.priority === 'HIGH' ? 'bg-[#FEE2E2] text-[#DC2626]' : 'bg-slate-200 text-[#202033]'
                            }`}
                          >
                            {t.priority}
                          </span>
                        </div>

                        {t.project && (
                          <div className="text-[10px] font-semibold text-[#6935C8]">
                            📁 {t.project.title}
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-1 border-t border-[#E5E2F5]/60 text-[10px] text-[#74738A]">
                          <span>{t.estimatedDurationMinutes}m</span>
                          {t.deadline && <span>Due {format(new Date(t.deadline), 'MMM d')}</span>}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

