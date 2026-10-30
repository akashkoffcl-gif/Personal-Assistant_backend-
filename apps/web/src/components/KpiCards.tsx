'use client';

import React from 'react';
import {
  CheckCircle2,
  Repeat,
  Briefcase,
  Activity,
  ArrowUpRight,
  AlertCircle,
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
  wellnessTrendLabel = 'Insufficient data',
  loading,
  activeFilter,
  onSelectCard,
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
      iconColor: 'text-emerald-600',
      iconBg: 'bg-emerald-50',
      barColor: 'bg-emerald-600',
      actionLabel: 'View Schedule',
    },
    {
      id: 'routines' as const,
      title: 'Routine Adherence',
      value: `${routineAdherence}%`,
      subtitle: `${kpi?.routinesCompleted || 0} of ${kpi?.routinesTotal || 0} habits logged`,
      progress: routineAdherence,
      icon: Repeat,
      iconColor: 'text-blue-600',
      iconBg: 'bg-blue-50',
      barColor: 'bg-blue-600',
      actionLabel: 'View Habits',
    },
    {
      id: 'work' as const,
      title: 'Work Progress',
      value: `${workPercent}%`,
      subtitle: `${workCompleted} of ${workTotal} milestones`,
      progress: workPercent,
      icon: Briefcase,
      iconColor: 'text-indigo-600',
      iconBg: 'bg-indigo-50',
      barColor: 'bg-indigo-600',
      badge: overdueCount > 0 ? `${overdueCount} Overdue` : undefined,
      actionLabel: overdueCount > 0 ? 'Resolve Overdue' : 'Work Tasks',
    },
    {
      id: 'wellness' as const,
      title: 'Wellness Trend',
      value: wellnessTrendLabel,
      subtitle: wellnessTrendLabel === 'Insufficient data' ? 'Behavioral consistency baseline' : 'Tracking indicators active',
      progress: wellnessTrendLabel === 'Insufficient data' ? 0 : 80,
      icon: Activity,
      iconColor: 'text-slate-700',
      iconBg: 'bg-slate-100',
      barColor: 'bg-blue-600',
      actionLabel: 'Check In Now',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
      {cards.map((c) => {
        const Icon = c.icon;
        const isSelected = activeFilter === c.id;

        return (
          <div
            key={c.id}
            onClick={() => onSelectCard?.(c.id)}
            className={`bg-white rounded-xl p-4 border transition-colors cursor-pointer select-none ${
              isSelected
                ? 'border-blue-600 ring-1 ring-blue-600 shadow-sm'
                : 'border-slate-200 hover:border-slate-300 shadow-xs'
            }`}
            role="button"
            tabIndex={0}
            title={`Filter by ${c.title}`}
          >
            {/* Top row: Label + Icon */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {c.title}
              </span>
              <div className={`p-1.5 rounded-lg ${c.iconBg} ${c.iconColor}`}>
                <Icon className="w-4 h-4" />
              </div>
            </div>

            {/* Metric Value */}
            <div className="mt-2.5 flex items-baseline justify-between gap-2">
              <span className="text-2xl font-bold text-slate-900 tracking-tight">
                {loading ? (
                  <span className="inline-block w-16 h-7 bg-slate-100 animate-pulse rounded" />
                ) : (
                  c.value
                )}
              </span>

              {c.badge && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-red-50 text-red-700 border border-red-200 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 text-red-600" />
                  {c.badge}
                </span>
              )}
            </div>

            {/* Subtitle */}
            <p className="text-xs text-slate-500 mt-0.5 font-normal truncate">{c.subtitle}</p>

            {/* Clean Progress Bar */}
            <div className="mt-2.5 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-full rounded-full ${c.barColor} transition-all duration-500`}
                style={{ width: `${Math.min(100, Math.max(c.progress > 0 ? 5 : 0, c.progress))}%` }}
              />
            </div>

            {/* Bottom Navigation Link */}
            <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-medium text-slate-500 hover:text-blue-600 transition-colors">
              <span>{c.actionLabel}</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />
            </div>
          </div>
        );
      })}
    </div>
  );
}
