'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { format } from 'date-fns';
import {
  FolderKanban,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  Calendar,
  ChevronRight,
  TrendingUp,
  Target,
  Layers,
  Flag,
  CheckSquare,
  Sparkles,
  ArrowRight,
  Briefcase,
  X,
  Edit2,
  Trash2,
} from 'lucide-react';
import { toast } from '@/components/Toast';

interface ProjectsWorkspaceProps {
  onOpenCreateProject?: () => void;
  onOpenCreateTask?: () => void;
  onNavigateTab?: (tab: string) => void;
  onSelectTask?: (task: any) => void;
}

export const ProjectsWorkspace: React.FC<ProjectsWorkspaceProps> = ({
  onOpenCreateProject,
  onOpenCreateTask,
  onNavigateTab,
  onSelectTask,
}) => {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'ALL' | 'ACTIVE' | 'COMPLETED' | 'AT_RISK'>('ALL');
  const [inspectingProject, setInspectingProject] = useState<any | null>(null);
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [newProjectForm, setNewProjectForm] = useState({
    name: '',
    description: '',
    color: '#8B45F5',
  });

  // Authoritative Projects fetch
  const { data: rawProjects = [], isLoading: isLoadingProjects } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.getProjects(),
  });

  // Authoritative Tasks fetch (to compute project task stats)
  const { data: rawTasks = [], isLoading: isLoadingTasks } = useQuery({
    queryKey: ['tasks', 'all'],
    queryFn: () => api.getTasks(),
  });

  // Create Project Mutation
  const createProjectMutation = useMutation({
    mutationFn: (data: { name: string; description?: string; color?: string }) =>
      api.createProject(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setIsNewProjectModalOpen(false);
      setNewProjectForm({ name: '', description: '', color: '#8B45F5' });
      toast.success('Project created successfully');
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Failed to create project');
    },
  });

  // Delete Project Mutation
  const deleteProjectMutation = useMutation({
    mutationFn: (id: string) => api.deleteProject(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      if (inspectingProject) setInspectingProject(null);
      toast.success('Project deleted');
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Failed to delete project');
    },
  });

  // Enrich projects with task calculations
  const projectsWithStats = (rawProjects || []).map((project: any) => {
    const projectTasks = (rawTasks || []).filter(
      (t: any) => t.projectId === project.id
    );
    const totalTasks = projectTasks.length;
    const completedTasks = projectTasks.filter(
      (t: any) => t.status === 'COMPLETED' || t.completed
    ).length;
    const inProgressTasks = projectTasks.filter(
      (t: any) => t.status === 'IN_PROGRESS'
    ).length;
    const overdueTasks = projectTasks.filter((t: any) => {
      if (t.status === 'COMPLETED' || t.completed) return false;
      if (!t.dueDate) return false;
      return new Date(t.dueDate) < new Date();
    }).length;

    const progressPct =
      totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    let health: 'ON_TRACK' | 'AT_RISK' | 'COMPLETED' | 'NEW' = 'ON_TRACK';
    if (totalTasks > 0 && completedTasks === totalTasks) {
      health = 'COMPLETED';
    } else if (overdueTasks > 0) {
      health = 'AT_RISK';
    } else if (totalTasks === 0) {
      health = 'NEW';
    }

    return {
      ...project,
      tasks: projectTasks,
      totalTasks,
      completedTasks,
      inProgressTasks,
      overdueTasks,
      progressPct,
      health,
    };
  });

  // Calculate Overview KPIs
  const totalProjectsCount = projectsWithStats.length;
  const activeProjectsCount = projectsWithStats.filter(
    (p: any) => p.health === 'ON_TRACK' || p.health === 'NEW'
  ).length;
  const atRiskProjectsCount = projectsWithStats.filter(
    (p: any) => p.health === 'AT_RISK'
  ).length;
  const completedProjectsCount = projectsWithStats.filter(
    (p: any) => p.health === 'COMPLETED'
  ).length;
  const overallAvgProgress =
    totalProjectsCount > 0
      ? Math.round(
          projectsWithStats.reduce((acc: number, p: any) => acc + p.progressPct, 0) /
            totalProjectsCount
        )
      : 0;

  // Filtered projects
  const filteredProjects = projectsWithStats.filter((p: any) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = p.name?.toLowerCase().includes(q);
      const matchDesc = p.description?.toLowerCase().includes(q);
      if (!matchName && !matchDesc) return false;
    }
    if (selectedFilter === 'ACTIVE') {
      return p.health === 'ON_TRACK' || p.health === 'NEW';
    }
    if (selectedFilter === 'COMPLETED') {
      return p.health === 'COMPLETED';
    }
    if (selectedFilter === 'AT_RISK') {
      return p.health === 'AT_RISK';
    }
    return true;
  });

  return (
    <div className="space-y-6 pb-20">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/80 backdrop-blur-md p-6 rounded-2xl border border-[#EAE9FF] shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-[#F4F3FF] text-[#8B45F5]">
              <FolderKanban className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-bold text-[#202033]">Projects & Portfolios</h1>
          </div>
          <p className="text-sm text-[#74738A]">
            Drive multi-phase initiatives, track milestones, and monitor task completion health across all objectives.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (onOpenCreateProject) onOpenCreateProject();
              else setIsNewProjectModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#8B45F5] hover:bg-[#7934E0] text-white text-sm font-semibold shadow-md shadow-[#8B45F5]/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Project</span>
          </button>
        </div>
      </div>

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-white p-4 rounded-xl border border-[#EAE9FF] shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#74738A]">Total Projects</span>
            <Layers className="w-4 h-4 text-[#8B45F5]" />
          </div>
          <div className="text-2xl font-bold text-[#202033] mt-2">
            {isLoadingProjects ? '...' : totalProjectsCount}
          </div>
          <span className="text-[11px] text-[#74738A] mt-1">Initiatives recorded</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#EAE9FF] shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#74738A]">Active & On Track</span>
            <TrendingUp className="w-4 h-4 text-[#10B981]" />
          </div>
          <div className="text-2xl font-bold text-[#10B981] mt-2">
            {isLoadingProjects ? '...' : activeProjectsCount}
          </div>
          <span className="text-[11px] text-[#10B981] mt-1">Healthy momentum</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#EAE9FF] shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#74738A]">At Risk / Overdue</span>
            <AlertCircle className="w-4 h-4 text-[#E05268]" />
          </div>
          <div className="text-2xl font-bold text-[#E05268] mt-2">
            {isLoadingProjects ? '...' : atRiskProjectsCount}
          </div>
          <span className="text-[11px] text-[#E05268] mt-1">Contains delayed tasks</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#EAE9FF] shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#74738A]">Completed</span>
            <CheckCircle2 className="w-4 h-4 text-[#6935C8]" />
          </div>
          <div className="text-2xl font-bold text-[#6935C8] mt-2">
            {isLoadingProjects ? '...' : completedProjectsCount}
          </div>
          <span className="text-[11px] text-[#6935C8] mt-1">100% tasks delivered</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#EAE9FF] shadow-sm flex flex-col justify-between col-span-2 md:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#74738A]">Avg Portfolio Progress</span>
            <Target className="w-4 h-4 text-[#8B45F5]" />
          </div>
          <div className="text-2xl font-bold text-[#202033] mt-2">
            {isLoadingProjects ? '...' : `${overallAvgProgress}%`}
          </div>
          <div className="w-full bg-[#EAE9FF] h-1.5 rounded-full mt-2 overflow-hidden">
            <div
              className="bg-gradient-to-r from-[#8B45F5] to-[#10B981] h-full rounded-full transition-all duration-500"
              style={{ width: `${overallAvgProgress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-[#EAE9FF] shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-[#74738A] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-[#F9F9FE] border border-[#EAE9FF] rounded-lg text-sm text-[#202033] focus:outline-none focus:border-[#8B45F5] transition-colors"
          />
        </div>

        {/* Tab Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          {[
            { id: 'ALL', label: 'All Projects', count: totalProjectsCount },
            { id: 'ACTIVE', label: 'Active', count: activeProjectsCount },
            { id: 'AT_RISK', label: 'At Risk', count: atRiskProjectsCount },
            { id: 'COMPLETED', label: 'Completed', count: completedProjectsCount },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedFilter(tab.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                selectedFilter === tab.id
                  ? 'bg-[#8B45F5] text-white shadow-sm'
                  : 'bg-[#F9F9FE] text-[#74738A] hover:bg-[#EAE9FF] hover:text-[#202033]'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  selectedFilter === tab.id
                    ? 'bg-white/20 text-white'
                    : 'bg-white text-[#74738A] border border-[#EAE9FF]'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Projects Grid */}
      {isLoadingProjects ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-[#EAE9FF]">
          <div className="w-8 h-8 border-3 border-[#8B45F5] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-[#74738A]">Loading projects...</p>
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-[#EAE9FF]">
          <FolderKanban className="w-12 h-12 text-[#8B45F5]/40 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-[#202033]">No projects found</h3>
          <p className="text-sm text-[#74738A] mt-1 max-w-sm mx-auto">
            {searchQuery
              ? 'No projects match your current search query. Try clearing the search.'
              : 'Create your first project to organize related tasks, deadlines, and milestones.'}
          </p>
          <button
            onClick={() => setIsNewProjectModalOpen(true)}
            className="mt-4 px-4 py-2 rounded-xl bg-[#8B45F5] text-white text-xs font-semibold hover:bg-[#7934E0] transition-colors inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create New Project</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredProjects.map((project: any) => {
            const projectColor = project.color || '#8B45F5';
            return (
              <div
                key={project.id}
                onClick={() => setInspectingProject(project)}
                className="bg-white rounded-2xl border border-[#EAE9FF] hover:border-[#8B45F5]/50 shadow-sm hover:shadow-md transition-all p-5 flex flex-col justify-between cursor-pointer group relative overflow-hidden"
              >
                {/* Color Top Border Strip */}
                <div
                  className="absolute top-0 left-0 right-0 h-1.5"
                  style={{ backgroundColor: projectColor }}
                />

                <div>
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white shadow-xs"
                        style={{ backgroundColor: projectColor }}
                      >
                        {project.name?.charAt(0)?.toUpperCase() || 'P'}
                      </div>
                      <div>
                        <h3 className="font-semibold text-base text-[#202033] group-hover:text-[#8B45F5] transition-colors line-clamp-1">
                          {project.name}
                        </h3>
                        <span className="text-[11px] text-[#74738A]">
                          {project.totalTasks} {project.totalTasks === 1 ? 'task' : 'tasks'}
                        </span>
                      </div>
                    </div>

                    {/* Health Tag */}
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        project.health === 'COMPLETED'
                          ? 'bg-[#10B981]/10 text-[#10B981]'
                          : project.health === 'AT_RISK'
                          ? 'bg-[#E05268]/10 text-[#E05268]'
                          : project.health === 'ON_TRACK'
                          ? 'bg-[#8B45F5]/10 text-[#8B45F5]'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {project.health === 'COMPLETED'
                        ? 'Completed'
                        : project.health === 'AT_RISK'
                        ? 'At Risk'
                        : project.health === 'ON_TRACK'
                        ? 'On Track'
                        : 'New'}
                    </span>
                  </div>

                  {/* Description */}
                  {project.description ? (
                    <p className="text-xs text-[#74738A] line-clamp-2 mb-4 leading-relaxed">
                      {project.description}
                    </p>
                  ) : (
                    <p className="text-xs text-[#74738A]/60 italic mb-4">No description provided</p>
                  )}

                  {/* Progress Bar */}
                  <div className="space-y-1.5 mb-4">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#74738A] font-medium">Task Progress</span>
                      <span className="font-bold text-[#202033]">{project.progressPct}%</span>
                    </div>
                    <div className="w-full bg-[#F4F3FF] h-2 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${project.progressPct}%`,
                          backgroundColor:
                            project.health === 'COMPLETED'
                              ? '#10B981'
                              : project.health === 'AT_RISK'
                              ? '#E05268'
                              : projectColor,
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Footer Metrics */}
                <div className="pt-3 border-t border-[#EAE9FF] flex items-center justify-between text-xs text-[#74738A]">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981]" />
                      <span className="font-semibold text-[#202033]">{project.completedTasks}</span> done
                    </span>
                    {project.overdueTasks > 0 && (
                      <span className="flex items-center gap-1 text-[#E05268]">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span className="font-semibold">{project.overdueTasks}</span> late
                      </span>
                    )}
                  </div>

                  <span className="text-[#8B45F5] font-medium flex items-center gap-1 text-[11px] group-hover:translate-x-1 transition-transform">
                    View Details
                    <ChevronRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Project Inspection Drawer / Modal */}
      {inspectingProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-[#EAE9FF] overflow-hidden flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="p-6 border-b border-[#EAE9FF] flex items-start justify-between bg-gradient-to-r from-white to-[#F4F3FF]">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-xs"
                  style={{ backgroundColor: inspectingProject.color || '#8B45F5' }}
                >
                  {inspectingProject.name?.charAt(0)?.toUpperCase() || 'P'}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-[#202033]">{inspectingProject.name}</h2>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        inspectingProject.health === 'COMPLETED'
                          ? 'bg-[#10B981]/10 text-[#10B981]'
                          : inspectingProject.health === 'AT_RISK'
                          ? 'bg-[#E05268]/10 text-[#E05268]'
                          : 'bg-[#8B45F5]/10 text-[#8B45F5]'
                      }`}
                    >
                      {inspectingProject.health}
                    </span>
                    <span className="text-xs text-[#74738A]">
                      {inspectingProject.totalTasks} total tasks
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (confirm(`Are you sure you want to delete project "${inspectingProject.name}"?`)) {
                      deleteProjectMutation.mutate(inspectingProject.id);
                    }
                  }}
                  className="p-2 rounded-lg text-[#74738A] hover:text-[#E05268] hover:bg-[#E05268]/10 transition-colors"
                  title="Delete Project"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setInspectingProject(null)}
                  className="p-2 rounded-lg text-[#74738A] hover:bg-[#EAE9FF] transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-6">
              {/* Description */}
              {inspectingProject.description && (
                <div>
                  <h4 className="text-xs font-semibold text-[#74738A] uppercase tracking-wider mb-1">
                    About Project
                  </h4>
                  <p className="text-sm text-[#202033] leading-relaxed">
                    {inspectingProject.description}
                  </p>
                </div>
              )}

              {/* Progress Summary */}
              <div className="bg-[#F9F9FE] p-4 rounded-xl border border-[#EAE9FF] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#202033]">Completion Rate</span>
                  <span className="text-sm font-bold text-[#8B45F5]">
                    {inspectingProject.progressPct}% ({inspectingProject.completedTasks} of {inspectingProject.totalTasks})
                  </span>
                </div>
                <div className="w-full bg-[#EAE9FF] h-2.5 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500 bg-[#8B45F5]"
                    style={{ width: `${inspectingProject.progressPct}%` }}
                  />
                </div>
              </div>

              {/* Associated Tasks List */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-semibold text-[#74738A] uppercase tracking-wider">
                    Tasks in Project ({inspectingProject.tasks?.length || 0})
                  </h4>
                  {onOpenCreateTask && (
                    <button
                      onClick={() => {
                        setInspectingProject(null);
                        onOpenCreateTask();
                      }}
                      className="text-xs text-[#8B45F5] font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Task
                    </button>
                  )}
                </div>

                {inspectingProject.tasks?.length === 0 ? (
                  <div className="text-center py-8 border border-dashed border-[#EAE9FF] rounded-xl">
                    <CheckSquare className="w-8 h-8 text-[#74738A]/40 mx-auto mb-2" />
                    <p className="text-xs text-[#74738A]">No tasks added to this project yet.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {inspectingProject.tasks.map((task: any) => {
                      const isDone = task.status === 'COMPLETED' || task.completed;
                      return (
                        <div
                          key={task.id}
                          onClick={() => {
                            if (onSelectTask) {
                              onSelectTask(task);
                            }
                          }}
                          className={`p-3 rounded-xl border transition-all flex items-center justify-between cursor-pointer ${
                            isDone
                              ? 'bg-gray-50/80 border-[#EAE9FF] opacity-75'
                              : 'bg-white border-[#EAE9FF] hover:border-[#8B45F5]'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span
                              className={`w-5 h-5 rounded-md flex items-center justify-center text-xs ${
                                isDone
                                  ? 'bg-[#10B981] text-white'
                                  : 'border-2 border-[#74738A]/40'
                              }`}
                            >
                              {isDone && <CheckCircle2 className="w-3.5 h-3.5" />}
                            </span>
                            <span
                              className={`text-sm font-medium ${
                                isDone
                                  ? 'line-through text-[#74738A]'
                                  : 'text-[#202033]'
                              }`}
                            >
                              {task.title}
                            </span>
                          </div>

                          <div className="flex items-center gap-3">
                            {task.priority && (
                              <span
                                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                  task.priority === 'HIGH' || task.priority === 'URGENT'
                                    ? 'bg-[#E05268]/10 text-[#E05268]'
                                    : task.priority === 'MEDIUM'
                                    ? 'bg-[#F59E0B]/10 text-[#F59E0B]'
                                    : 'bg-[#10B981]/10 text-[#10B981]'
                                }`}
                              >
                                {task.priority}
                              </span>
                            )}
                            {task.dueDate && (
                              <span className="text-[11px] text-[#74738A] flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {format(new Date(task.dueDate), 'MMM d')}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-[#EAE9FF] bg-gray-50 flex items-center justify-end">
              <button
                onClick={() => setInspectingProject(null)}
                className="px-4 py-2 rounded-xl bg-white border border-[#EAE9FF] text-[#202033] text-xs font-semibold hover:bg-gray-100 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Project Modal */}
      {isNewProjectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-[#EAE9FF] overflow-hidden">
            <div className="p-5 border-b border-[#EAE9FF] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FolderKanban className="w-5 h-5 text-[#8B45F5]" />
                <h3 className="font-bold text-base text-[#202033]">Create New Project</h3>
              </div>
              <button
                onClick={() => setIsNewProjectModalOpen(false)}
                className="p-1 rounded-lg text-[#74738A] hover:bg-[#EAE9FF] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!newProjectForm.name.trim()) {
                  toast.error('Project name is required');
                  return;
                }
                createProjectMutation.mutate(newProjectForm);
              }}
              className="p-5 space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold text-[#202033] mb-1">
                  Project Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Lavender OS 2.0"
                  value={newProjectForm.name}
                  onChange={(e) =>
                    setNewProjectForm({ ...newProjectForm, name: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-[#F9F9FE] border border-[#EAE9FF] rounded-lg text-sm text-[#202033] focus:outline-none focus:border-[#8B45F5]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#202033] mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Goals, deliverables, or scope..."
                  value={newProjectForm.description}
                  onChange={(e) =>
                    setNewProjectForm({ ...newProjectForm, description: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-[#F9F9FE] border border-[#EAE9FF] rounded-lg text-sm text-[#202033] focus:outline-none focus:border-[#8B45F5]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#202033] mb-1">
                  Accent Color
                </label>
                <div className="flex items-center gap-2">
                  {['#8B45F5', '#6935C8', '#10B981', '#3B82F6', '#F59E0B', '#E05268', '#EC4899'].map((c) => (
                    <button
                      type="button"
                      key={c}
                      onClick={() => setNewProjectForm({ ...newProjectForm, color: c })}
                      className={`w-7 h-7 rounded-full transition-transform cursor-pointer ${
                        newProjectForm.color === c ? 'scale-125 ring-2 ring-offset-2 ring-[#8B45F5]' : ''
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsNewProjectModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#74738A] hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createProjectMutation.isPending}
                  className="px-5 py-2 rounded-xl bg-[#8B45F5] hover:bg-[#7934E0] text-white text-xs font-semibold shadow-md shadow-[#8B45F5]/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  {createProjectMutation.isPending ? 'Creating...' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

