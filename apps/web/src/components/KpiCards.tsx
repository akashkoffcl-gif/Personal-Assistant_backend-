'use client';

import React from 'react';
import {
  CheckCircle2,
  Repeat,
  Briefcase,
  Activity,
  ArrowUpRight,
  TrendingUp,
  AlertCircle,
  Zap,
} from 'lucide-react';
import { DailyKpiSummary } from '@assistant/shared';

interface KpiCardsProps {
  kpi?: DailyKpiSummary;
  wellnessTrendLabel?: string;
  loading?: boolean;
  activeFilter?: 'tasks' | 'routines' | 'work' | 'wellness' | null;
  onSelectCard?: (cardType: 'tasks' | 'routines' | 'work' | 'wellness') => void;
  onQuickAction?: (action: 'new-task' | 'check-in' | 'emergency') => void;
}

export function KpiCards({
  kpi,
  wellnessTrendLabel = 'Sufficient data active',
  loading,
  activeFilter,
  onSelectCard,
  onQuickAction,
}: KpiCardsProps) {
  const completionRate = kpi?.completionRatePercent || 0;
  const routineAdherence = kpi?.routineAdherencePercent || 0;
  const workCompleted = kpi?.workTasksCompleted || 0;
  const workTotal = kpi?.workTasksTotal || 0;
  const overdueCount = kpi?.overdueTasksCount || 0;
  const workPercent = workTotal > 0 ? Math.round((workCompleted / workTotal) * 100) : 0;

  const cards = [
    {
      id: 'tasks' as const,
      title: 'Task Completion',
      value: `${completionRate}%`,
      subtitle: `${kpi?.completedTasks || 0} of ${kpi?.totalTasks || 0} tasks done`,
      progress: completionRate,
      icon: CheckCircle2,
      textColor: 'text-emerald-700',
      accentGlow: 'group-hover:border-emerald-300',
      pillBg: 'bg-emerald-500/10 text-emerald-700 border-emerald-300/60',
      barColor: 'from-emerald-400 to-teal-500',
      quickLabel: 'View Schedule',
    },
    {
      id: 'routines' as const,
      title: 'Routine Adherence',
      value: `${routineAdherence}%`,
      subtitle: `${kpi?.routinesCompleted || 0} of ${kpi?.routinesTotal || 0} habits logged`,
      progress: routineAdherence,
      icon: Repeat,
      textColor: 'text-sky-700',
      accentGlow: 'group-hover:border-sky-300',
      pillBg: 'bg-sky-500/10 text-sky-700 border-sky-300/60',
      barColor: 'from-sky-400 to-cyan-500',
      quickLabel: 'View Habits',
    },
    {
      id: 'work' as const,
      title: 'Work Progress',
      value: `${workPercent}%`,
      subtitle: `${workCompleted} of ${workTotal} milestones`,
      progress: workPercent,
      icon: Briefcase,
      textColor: 'text-indigo-700',
      accentGlow: 'group-hover:border-indigo-300',
      pillBg: 'bg-indigo-500/10 text-indigo-700 border-indigo-300/60',
      barColor: 'from-indigo-400 to-sky-500',
      badge: overdueCount > 0 ? `${overdueCount} Overdue` : undefined,
      quickLabel: overdueCount > 0 ? 'Resolve Overdue' : 'Work Tasks',
    },
    {
      id: 'wellness' as const,
      title: 'Wellness Trend',
      value: wellnessTrendLabel,
      subtitle: 'Behavioral consistency baseline',
      progress: 85,
      icon: Activity,
      textColor:
        wellnessTrendLabel === 'Consistent' || wellnessTrendLabel === 'Improving'
          ? 'text-emerald-700'
          : wellnessTrendLabel === 'Needs attention'
          ? 'text-rose-700'
          : 'text-slate-700',
      accentGlow: 'group-hover:border-purple-300',
      pillBg: 'bg-purple-500/10 text-purple-700 border-purple-300/60',
      barColor: 'from-purple-400 to-pink-500',
      quickLabel: 'Check-in Now',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((c) => {
        const Icon = c.icon;
        const isSelected = activeFilter === c.id;

        return (
          <div
            key={c.id}
            onClick={() => onSelectCard?.(c.id)}
            className={`glass-card rounded-2xl p-5 border cursor-pointer relative overflow-hidden group select-none transition-all duration-300 ${
              isSelected
                ? 'ring-2 ring-sky-400 border-white/90 shadow-glass-glow bg-white/95 scale-[1.02]'
                : `border-white/80 ${c.accentGlow}`
            }`}
            role="button"
            tabIndex={0}
            title={`Click to filter or explore ${c.title}`}
          >
            {/* Top row: Label + Icon */}
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                {c.title}
              </span>
              <div
                className={`p-2 rounded-xl border transition-transform duration-300 group-hover:scale-110 shadow-xs ${c.pillBg}`}
              >
                <Icon className="w-4 h-4" />
              </div>
            </div>

            {/* Metric Value */}
            <div className="mt-3 flex items-baseline justify-between gap-2">
              <span className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${c.textColor}`}>
                {loading ? (
                  <span className="inline-block w-16 h-7 bg-slate-200/60 animate-pulse rounded-lg" />
                ) : (
                  c.value
                )}
              </span>

              {c.badge && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-700 border border-rose-300/60 animate-pulse flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 text-rose-600" />
                  {c.badge}
                </span>
              )}
            </div>

            {/* Subtitle */}
            <p className="text-xs text-slate-500 mt-1 font-medium">{c.subtitle}</p>

            {/* Interactive Progress Bar */}
            <div className="mt-3 w-full bg-slate-200/50 rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-full rounded-full bg-gradient-to-r ${c.barColor} transition-all duration-700 ease-out`}
                style={{ width: `${Math.min(100, Math.max(8, c.progress))}%` }}
              />
            </div>

            {/* Hover Action Strip */}
            <div className="mt-3 pt-2.5 border-t border-slate-200/60 flex items-center justify-between text-[11px] font-semibold text-slate-500 group-hover:text-assistant-navy transition-colors">
              <span className="flex items-center gap-1">
                <Zap className="w-3 h-3 text-sky-500" />
                {c.quickLabel}
              </span>
              <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-sky-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
            </div>
          </div>
        );
      })}
    </div>
  );
}
