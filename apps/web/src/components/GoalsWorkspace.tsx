'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useToast } from '@/components/Toast';
import { format, differenceInDays } from 'date-fns';
import {
  Target,
  Plus,
  CheckCircle2,
  Circle,
  Calendar,
  Clock,
  Sparkles,
  ChevronRight,
  TrendingUp,
  AlertCircle,
  Edit2,
  Trash2,
  Award,
  BarChart2,
  Filter,
  CheckSquare,
  Flame,
} from 'lucide-react';

export const GoalsWorkspace: React.FC = () => {
  const queryClient = useQueryClient();
  const toast = useToast();

  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<any>(null);
  const [activeMilestoneGoalId, setActiveMilestoneGoalId] = useState<string | null>(null);
  const [newMilestoneTitle, setNewMilestoneTitle] = useState('');
  const [newMilestoneDueDate, setNewMilestoneDueDate] = useState('');

  // 1. Queries
  const { data: goalsData, isLoading } = useQuery({
    queryKey: ['goals', selectedTypeFilter, selectedStatusFilter],
    queryFn: () =>
      api.getGoals({
        type: selectedTypeFilter !== 'ALL' ? selectedTypeFilter : undefined,
        status: selectedStatusFilter !== 'ALL' ? selectedStatusFilter : undefined,
      }),
  });
  const goals = goalsData || [];

  const { data: summaryData } = useQuery({
    queryKey: ['goals-summary'],
    queryFn: () => api.getGoalsSummary(),
  });
  const summary = summaryData || {
    totalGoals: 0,
    activeGoals: 0,
    completedGoals: 0,
    averageProgress: 0,
    approachingDeadlinesCount: 0,
    totalMilestones: 0,
    completedMilestones: 0,
  };

  // 2. Mutations
  const createGoalMutation = useMutation({
    mutationFn: (data: any) => api.createGoal(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['goals-summary'] });
      toast.success('Goal Created', 'New strategic objective established.');
      setIsCreateModalOpen(false);
    },
    onError: (err: any) => toast.error('Failed to create goal', err?.message),
  });

  const updateGoalMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.updateGoal(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['goals-summary'] });
      toast.success('Goal Updated', 'Changes saved successfully.');
      setEditingGoal(null);
    },
    onError: (err: any) => toast.error('Failed to update goal', err?.message),
  });

  const deleteGoalMutation = useMutation({
    mutationFn: (id: string) => api.deleteGoal(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['goals-summary'] });
      toast.info('Goal Removed', 'Objective archived/deleted.');
    },
    onError: (err: any) => toast.error('Delete failed', err?.message),
  });

  const addMilestoneMutation = useMutation({
    mutationFn: ({ goalId, data }: { goalId: string; data: any }) => api.addGoalMilestone(goalId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['goals-summary'] });
      toast.success('Milestone Added', 'New checkpoint created.');
      setActiveMilestoneGoalId(null);
      setNewMilestoneTitle('');
      setNewMilestoneDueDate('');
    },
    onError: (err: any) => toast.error('Failed to add milestone', err?.message),
  });

  const toggleMilestoneMutation = useMutation({
    mutationFn: ({ goalId, milestoneId, isCompleted }: { goalId: string; milestoneId: string; isCompleted: boolean }) =>
      api.updateGoalMilestone(goalId, milestoneId, { isCompleted }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['goals-summary'] });
      toast.success('Milestone Updated', 'Goal progression recalculated.');
    },
    onError: (err: any) => toast.error('Failed to update milestone', err?.message),
  });

  const deleteMilestoneMutation = useMutation({
    mutationFn: ({ goalId, milestoneId }: { goalId: string; milestoneId: string }) =>
      api.deleteGoalMilestone(goalId, milestoneId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['goals-summary'] });
      toast.info('Milestone Deleted');
    },
  });

  return (
    <div className="space-y-6">
      {/* 1. TOP HEADER & CONTROLS */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#E5E2F5] shadow-[0_4px_20px_rgba(139,69,245,0.04)] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#8B45F5] bg-[#F4F3FF] px-2.5 py-0.5 rounded-full border border-[#E5E2F5]">
              Phase 28 • Strategic Objectives
            </span>
            <span className="text-xs text-[#74738A] font-semibold">Vision & Execution</span>
          </div>
          <h2 className="text-lg sm:text-xl font-black text-[#202033] tracking-tight">
            Goals & Milestone Management
          </h2>
          <p className="text-xs text-[#74738A] mt-0.5">
            Break high-level life and work vision into manageable milestones with automatic progress tracking.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Timeframe Filter */}
          <div className="flex items-center bg-[#F4F3FF] p-1 rounded-xl border border-[#E5E2F5] text-xs font-semibold">
            {['ALL', 'DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY', 'LIFE'].map((type) => (
              <button
                key={type}
                onClick={() => setSelectedTypeFilter(type)}
                className={`px-2.5 py-1 rounded-lg transition-all text-[11px] ${
                  selectedTypeFilter === type
                    ? 'bg-[#8B45F5] text-white font-bold shadow-2xs'
                    : 'text-[#74738A] hover:text-[#202033]'
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2 text-xs font-bold text-white bg-[#8B45F5] hover:bg-[#7839D6] rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Create Goal</span>
          </button>
        </div>
      </div>

      {/* 2. SUMMARY KPI STATS CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-2xl p-4 border border-[#E5E2F5] shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-[#F4F3FF] text-[#8B45F5] flex items-center justify-center shrink-0">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-[#74738A] uppercase tracking-wider block">
              Active Objectives
            </span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-xl font-black text-[#202033]">{summary.activeGoals}</span>
              <span className="text-xs text-[#74738A]">/ {summary.totalGoals} total</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-[#E5E2F5] shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-[#EAFBF1] text-[#10B981] flex items-center justify-center shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-[11px] font-bold text-[#74738A] uppercase tracking-wider block">
              Average Progress
            </span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xl font-black text-[#202033]">{summary.averageProgress}%</span>
              <div className="flex-1 bg-[#F4F3FF] h-2 rounded-full overflow-hidden">
                <div
                  className="bg-[#10B981] h-full rounded-full transition-all duration-500"
                  style={{ width: `${summary.averageProgress}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-[#E5E2F5] shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-[#F4F3FF] text-[#8B45F5] flex items-center justify-center shrink-0">
            <CheckSquare className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-[#74738A] uppercase tracking-wider block">
              Milestones Done
            </span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-xl font-black text-[#202033]">{summary.completedMilestones}</span>
              <span className="text-xs text-[#74738A]">/ {summary.totalMilestones} checks</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-[#E5E2F5] shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-[#FFF1F2] text-[#E05268] flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-[#74738A] uppercase tracking-wider block">
              Approaching Deadlines
            </span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-xl font-black text-[#202033]">{summary.approachingDeadlinesCount}</span>
              <span className="text-xs text-[#E05268] font-semibold">next 7 days</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. GOALS LIST / CARDS */}
      {isLoading ? (
        <div className="p-12 text-center text-xs text-[#74738A] bg-white rounded-2xl border border-[#E5E2F5]">
          Loading strategic objectives...
        </div>
      ) : goals.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-[#E5E2F5] space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-[#F4F3FF] text-[#8B45F5] flex items-center justify-center mx-auto">
            <Target className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-[#202033]">No Goals Created Yet</h3>
          <p className="text-xs text-[#74738A] max-w-sm mx-auto">
            Establish long-term life and career goals, quarterly milestones, or monthly focus targets.
          </p>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2 text-xs font-bold text-white bg-[#8B45F5] hover:bg-[#7839D6] rounded-xl transition-colors shadow-2xs inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Create Your First Goal</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {goals.map((goal: any) => {
            const daysLeft = goal.targetDate ? differenceInDays(new Date(goal.targetDate), new Date()) : null;
            const isOverdue = daysLeft !== null && daysLeft < 0 && goal.status !== 'COMPLETED';
            const isCompleted = goal.status === 'COMPLETED' || goal.progressPercent >= 100;

            return (
              <div
                key={goal.id}
                className="bg-white rounded-2xl border border-[#E5E2F5] shadow-xs hover:shadow-md transition-shadow p-5 flex flex-col justify-between gap-4"
              >
                {/* Header & Meta */}
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: goal.color || '#8B45F5' }}
                      />
                      <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-[#F4F3FF] text-[#8B45F5] border border-[#E5E2F5]">
                        {goal.type}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isCompleted
                            ? 'bg-[#EAFBF1] text-[#10B981]'
                            : goal.status === 'PAUSED'
                            ? 'bg-[#FEF3C7] text-[#D97706]'
                            : 'bg-[#F4F3FF] text-[#6935C8]'
                        }`}
                      >
                        {goal.status}
                      </span>
                      {goal.priority === 'URGENT' || goal.priority === 'HIGH' ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FFEAEF] text-[#E05268]">
                          {goal.priority}
                        </span>
                      ) : null}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setEditingGoal(goal)}
                        className="p-1.5 text-[#74738A] hover:text-[#8B45F5] hover:bg-[#F4F3FF] rounded-lg transition-colors"
                        title="Edit Goal"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Delete goal '${goal.title}'?`)) {
                            deleteGoalMutation.mutate(goal.id);
                          }
                        }}
                        className="p-1.5 text-[#74738A] hover:text-[#E05268] hover:bg-[#FFEAEF] rounded-lg transition-colors"
                        title="Delete Goal"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <h3 className="text-base font-bold text-[#202033] tracking-tight">
                    {goal.title}
                  </h3>
                  {goal.description && (
                    <p className="text-xs text-[#74738A] mt-1 leading-relaxed line-clamp-2">
                      {goal.description}
                    </p>
                  )}

                  {/* Deadline & Target Date */}
                  <div className="flex items-center gap-3 mt-3 text-xs text-[#74738A]">
                    {goal.targetDate && (
                      <span className="flex items-center gap-1 font-medium">
                        <Calendar className="w-3.5 h-3.5 text-[#8B45F5]" />
                        Target: {format(new Date(goal.targetDate), 'MMM d, yyyy')}
                      </span>
                    )}
                    {daysLeft !== null && (
                      <span
                        className={`font-semibold ${
                          isOverdue ? 'text-[#E05268]' : daysLeft <= 7 ? 'text-[#D97706]' : 'text-[#74738A]'
                        }`}
                      >
                        {isOverdue
                          ? `${Math.abs(daysLeft)}d overdue`
                          : daysLeft === 0
                          ? 'Due today'
                          : `${daysLeft} days remaining`}
                      </span>
                    )}
                  </div>
                </div>

                {/* Progress Bar & Metric */}
                <div className="p-3 rounded-xl bg-[#F4F3FF]/70 border border-[#E5E2F5]/80 space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-[#202033]">Progress Completion</span>
                    <span className="font-mono text-[#8B45F5] font-black">{goal.progressPercent}%</span>
                  </div>
                  <div className="w-full bg-[#E5E2F5] h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isCompleted ? 'bg-[#10B981]' : 'bg-[#8B45F5]'
                      }`}
                      style={{ width: `${Math.max(2, goal.progressPercent)}%` }}
                    />
                  </div>
                </div>

                {/* Milestones Checklist */}
                <div className="space-y-2 pt-2 border-t border-[#E5E2F5]">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-[#202033] uppercase tracking-wider flex items-center gap-1.5">
                      <CheckSquare className="w-3.5 h-3.5 text-[#8B45F5]" />
                      Milestones ({goal.milestones?.filter((m: any) => m.isCompleted).length || 0}/
                      {goal.milestones?.length || 0})
                    </span>
                    <button
                      onClick={() => setActiveMilestoneGoalId(activeMilestoneGoalId === goal.id ? null : goal.id)}
                      className="text-[11px] font-bold text-[#8B45F5] hover:underline flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      Add Milestone
                    </button>
                  </div>

                  {/* Inline Add Milestone Form */}
                  {activeMilestoneGoalId === goal.id && (
                    <div className="p-2.5 rounded-xl bg-[#F4F3FF] border border-[#E5E2F5] space-y-2">
                      <input
                        type="text"
                        placeholder="Milestone description..."
                        value={newMilestoneTitle}
                        onChange={(e) => setNewMilestoneTitle(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs font-medium border border-[#E5E2F5] rounded-lg bg-white text-[#202033]"
                      />
                      <div className="flex items-center justify-between gap-2">
                        <input
                          type="date"
                          value={newMilestoneDueDate}
                          onChange={(e) => setNewMilestoneDueDate(e.target.value)}
                          className="px-2 py-1 text-xs font-medium border border-[#E5E2F5] rounded-lg bg-white text-[#74738A]"
                        />
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => setActiveMilestoneGoalId(null)}
                            className="px-2.5 py-1 text-xs font-semibold text-[#74738A] hover:bg-[#E5E2F5] rounded-lg"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => {
                              if (!newMilestoneTitle.trim()) return;
                              addMilestoneMutation.mutate({
                                goalId: goal.id,
                                data: {
                                  title: newMilestoneTitle.trim(),
                                  dueDate: newMilestoneDueDate || undefined,
                                },
                              });
                            }}
                            className="px-3 py-1 text-xs font-bold text-white bg-[#8B45F5] hover:bg-[#7839D6] rounded-lg"
                          >
                            Add
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Milestones List */}
                  {goal.milestones && goal.milestones.length > 0 ? (
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {goal.milestones.map((m: any) => (
                        <div
                          key={m.id}
                          className="flex items-center justify-between gap-2 p-1.5 rounded-lg hover:bg-[#F4F3FF]/50 transition-colors group text-xs"
                        >
                          <button
                            onClick={() =>
                              toggleMilestoneMutation.mutate({
                                goalId: goal.id,
                                milestoneId: m.id,
                                isCompleted: !m.isCompleted,
                              })
                            }
                            className="flex items-center gap-2 text-left flex-1 min-w-0"
                          >
                            {m.isCompleted ? (
                              <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0" />
                            ) : (
                              <Circle className="w-4 h-4 text-[#74738A] group-hover:text-[#8B45F5] shrink-0" />
                            )}
                            <span
                              className={`truncate font-medium ${
                                m.isCompleted ? 'line-through text-[#74738A]' : 'text-[#202033]'
                              }`}
                            >
                              {m.title}
                            </span>
                          </button>

                          <div className="flex items-center gap-1">
                            {m.dueDate && (
                              <span className="text-[10px] text-[#74738A] shrink-0">
                                {format(new Date(m.dueDate), 'MMM d')}
                              </span>
                            )}
                            <button
                              onClick={() => deleteMilestoneMutation.mutate({ goalId: goal.id, milestoneId: m.id })}
                              className="opacity-0 group-hover:opacity-100 p-1 text-[#74738A] hover:text-[#E05268] rounded transition-opacity"
                              title="Delete milestone"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-[#74738A] italic">No milestones defined yet.</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 4. CREATE GOAL MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl p-5 sm:p-6 max-w-lg w-full border border-[#E5E2F5] shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E2F5]">
              <h3 className="text-base font-bold text-[#202033]">Establish Strategic Goal</h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-xs text-[#74738A] hover:text-[#202033] font-bold"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.target as HTMLFormElement;
                const title = (form.elements.namedItem('title') as HTMLInputElement).value;
                const description = (form.elements.namedItem('description') as HTMLTextAreaElement).value;
                const type = (form.elements.namedItem('type') as HTMLSelectElement).value;
                const priority = (form.elements.namedItem('priority') as HTMLSelectElement).value;
                const targetDate = (form.elements.namedItem('targetDate') as HTMLInputElement).value;
                const color = (form.elements.namedItem('color') as HTMLInputElement).value;

                createGoalMutation.mutate({
                  title,
                  description: description || undefined,
                  type,
                  priority,
                  targetDate: targetDate || undefined,
                  color,
                });
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block font-semibold text-[#202033] mb-1">Goal Title *</label>
                <input
                  name="title"
                  type="text"
                  required
                  placeholder="e.g. Master TypeScript & Microservices Architecture"
                  className="w-full px-3 py-2 border border-[#E5E2F5] rounded-xl bg-white text-[#202033] focus:outline-none focus:border-[#8B45F5]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#202033] mb-1">Description / Intent</label>
                <textarea
                  name="description"
                  rows={2}
                  placeholder="Why does this goal matter and what is the target outcome?"
                  className="w-full px-3 py-2 border border-[#E5E2F5] rounded-xl bg-white text-[#202033] focus:outline-none focus:border-[#8B45F5]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#202033] mb-1">Time Horizon</label>
                  <select
                    name="type"
                    defaultValue="MONTHLY"
                    className="w-full px-3 py-2 border border-[#E5E2F5] rounded-xl bg-white text-[#202033]"
                  >
                    <option value="DAILY">Daily</option>
                    <option value="WEEKLY">Weekly</option>
                    <option value="MONTHLY">Monthly</option>
                    <option value="QUARTERLY">Quarterly</option>
                    <option value="YEARLY">Yearly</option>
                    <option value="LIFE">Lifetime Vision</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-[#202033] mb-1">Priority</label>
                  <select
                    name="priority"
                    defaultValue="MEDIUM"
                    className="w-full px-3 py-2 border border-[#E5E2F5] rounded-xl bg-white text-[#202033]"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#202033] mb-1">Target Completion Date</label>
                  <input
                    name="targetDate"
                    type="date"
                    className="w-full px-3 py-2 border border-[#E5E2F5] rounded-xl bg-white text-[#202033]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#202033] mb-1">Theme Accent Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      name="color"
                      type="color"
                      defaultValue="#8B45F5"
                      className="w-8 h-8 rounded-lg cursor-pointer border border-[#E5E2F5]"
                    />
                    <span className="text-[11px] text-[#74738A]">Identifier badge</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-[#E5E2F5] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#74738A] hover:bg-[#F4F3FF] rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createGoalMutation.isPending}
                  className="px-5 py-2 text-xs font-bold text-white bg-[#8B45F5] hover:bg-[#7839D6] rounded-xl transition-all shadow-xs"
                >
                  {createGoalMutation.isPending ? 'Creating...' : 'Create Objective'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. EDIT GOAL MODAL */}
      {editingGoal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl p-5 sm:p-6 max-w-lg w-full border border-[#E5E2F5] shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E2F5]">
              <h3 className="text-base font-bold text-[#202033]">Edit Goal</h3>
              <button
                onClick={() => setEditingGoal(null)}
                className="text-xs text-[#74738A] hover:text-[#202033] font-bold"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.target as HTMLFormElement;
                const title = (form.elements.namedItem('title') as HTMLInputElement).value;
                const description = (form.elements.namedItem('description') as HTMLTextAreaElement).value;
                const type = (form.elements.namedItem('type') as HTMLSelectElement).value;
                const status = (form.elements.namedItem('status') as HTMLSelectElement).value;
                const priority = (form.elements.namedItem('priority') as HTMLSelectElement).value;
                const progressPercent = Number((form.elements.namedItem('progressPercent') as HTMLInputElement).value);
                const targetDate = (form.elements.namedItem('targetDate') as HTMLInputElement).value;

                updateGoalMutation.mutate({
                  id: editingGoal.id,
                  data: {
                    title,
                    description,
                    type,
                    status,
                    priority,
                    progressPercent,
                    targetDate: targetDate || undefined,
                  },
                });
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block font-semibold text-[#202033] mb-1">Goal Title</label>
                <input
                  name="title"
                  type="text"
                  required
                  defaultValue={editingGoal.title}
                  className="w-full px-3 py-2 border border-[#E5E2F5] rounded-xl bg-white text-[#202033]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#202033] mb-1">Description</label>
                <textarea
                  name="description"
                  rows={2}
                  defaultValue={editingGoal.description || ''}
                  className="w-full px-3 py-2 border border-[#E5E2F5] rounded-xl bg-white text-[#202033]"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-semibold text-[#202033] mb-1">Status</label>
                  <select
                    name="status"
                    defaultValue={editingGoal.status}
                    className="w-full px-2 py-2 border border-[#E5E2F5] rounded-xl bg-white text-[#202033]"
                  >
                    <option value="NOT_STARTED">Not Started</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="PAUSED">Paused</option>
                    <option value="ARCHIVED">Archived</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-[#202033] mb-1">Type</label>
                  <select
                    name="type"
                    defaultValue={editingGoal.type}
                    className="w-full px-2 py-2 border border-[#E5E2F5] rounded-xl bg-white text-[#202033]"
                  >
                    <option value="DAILY">Daily</option>
                    <option value="WEEKLY">Weekly</option>
                    <option value="MONTHLY">Monthly</option>
                    <option value="QUARTERLY">Quarterly</option>
                    <option value="YEARLY">Yearly</option>
                    <option value="LIFE">Lifetime</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-[#202033] mb-1">Priority</label>
                  <select
                    name="priority"
                    defaultValue={editingGoal.priority}
                    className="w-full px-2 py-2 border border-[#E5E2F5] rounded-xl bg-white text-[#202033]"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#202033] mb-1">Manual Progress %</label>
                  <input
                    name="progressPercent"
                    type="number"
                    min="0"
                    max="100"
                    defaultValue={editingGoal.progressPercent}
                    className="w-full px-3 py-2 border border-[#E5E2F5] rounded-xl bg-white text-[#202033]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#202033] mb-1">Target Date</label>
                  <input
                    name="targetDate"
                    type="date"
                    defaultValue={editingGoal.targetDate ? format(new Date(editingGoal.targetDate), 'yyyy-MM-dd') : ''}
                    className="w-full px-3 py-2 border border-[#E5E2F5] rounded-xl bg-white text-[#202033]"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-[#E5E2F5] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingGoal(null)}
                  className="px-4 py-2 text-xs font-semibold text-[#74738A] hover:bg-[#F4F3FF] rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateGoalMutation.isPending}
                  className="px-5 py-2 text-xs font-bold text-white bg-[#8B45F5] hover:bg-[#7839D6] rounded-xl transition-all shadow-xs"
                >
                  {updateGoalMutation.isPending ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

