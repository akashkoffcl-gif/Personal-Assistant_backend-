'use client';

import React from 'react';
import { CheckCircle2, Repeat, Briefcase, Activity, AlertCircle } from 'lucide-react';
import { DailyKpiSummary } from '@assistant/shared';

interface KpiCardsProps {
  kpi?: DailyKpiSummary;
  wellnessTrendLabel?: string;
  loading?: boolean;
  onSelectCard?: (cardType: 'tasks' | 'routines' | 'work' | 'wellness') => void;
}

export function KpiCards({ kpi, wellnessTrendLabel = 'Insufficient data', loading, onSelectCard }: KpiCardsProps) {
  const completionRate = kpi?.completionRatePercent || 0;
  const routineAdherence = kpi?.routineAdherencePercent || 0;
  const workCompleted = kpi?.workTasksCompleted || 0;
  const workTotal = kpi?.workTasksTotal || 0;
  const overdueCount = kpi?.overdueTasksCount || 0;

  const cards = [
    {
      id: 'tasks' as const,
      title: 'Task Completion',
      value: `${completionRate}%`,
      subtitle: `${kpi?.completedTasks || 0} of ${kpi?.totalTasks || 0} completed`,
      icon: CheckCircle2,
      color: 'text-assistant-green',
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-200',
    },
    {
      id: 'routines' as const,
      title: 'Routine Adherence',
      value: `${routineAdherence}%`,
      subtitle: `${kpi?.routinesCompleted || 0} of ${kpi?.routinesTotal || 0} routines`,
      icon: Repeat,
      color: 'text-assistant-sky',
      bgColor: 'bg-assistant-paleSky',
      borderColor: 'border-sky-200',
    },
    {
      id: 'work' as const,
      title: 'Work Progress',
      value: `${workTotal > 0 ? Math.round((workCompleted / workTotal) * 100) : 0}%`,
      subtitle: `${workCompleted} of ${workTotal} work items`,
      icon: Briefcase,
      color: 'text-assistant-navy',
      bgColor: 'bg-slate-100',
      borderColor: 'border-slate-200',
      badge: overdueCount > 0 ? `${overdueCount} Overdue` : undefined,
    },
    {
      id: 'wellness' as const,
      title: 'Wellness Trend',
      value: wellnessTrendLabel,
      subtitle: 'Behavioral consistency baseline',
      icon: Activity,
      color:
        wellnessTrendLabel === 'Consistent' || wellnessTrendLabel === 'Improving'
          ? 'text-assistant-green'
          : wellnessTrendLabel === 'Needs attention'
          ? 'text-assistant-red'
          : 'text-assistant-coolGrey',
      bgColor:
        wellnessTrendLabel === 'Consistent' || wellnessTrendLabel === 'Improving'
          ? 'bg-emerald-50'
          : wellnessTrendLabel === 'Needs attention'
          ? 'bg-red-50'
          : 'bg-slate-50',
      borderColor: 'border-slate-200',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <div
            key={c.id}
            onClick={() => onSelectCard?.(c.id)}
            className={`p-4 rounded-xl bg-white border ${c.borderColor} shadow-xs transition-all cursor-pointer hover:shadow-md hover:scale-[1.01]`}
            role="button"
            tabIndex={0}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-assistant-coolGrey uppercase tracking-wider">
                {c.title}
              </span>
              <div className={`p-2 rounded-lg ${c.bgColor}`}>
                <Icon className={`w-4 h-4 ${c.color}`} />
              </div>
            </div>

            <div className="mt-3 flex items-baseline gap-2">
              <span className={`text-2xl font-bold tracking-tight text-assistant-navy`}>
                {loading ? '...' : c.value}
              </span>
              {c.badge && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-assistant-red bg-red-100 px-2 py-0.5 rounded-full">
                  <AlertCircle className="w-3 h-3" />
                  {c.badge}
                </span>
              )}
            </div>

            <p className="mt-1 text-xs text-assistant-coolGrey truncate">{c.subtitle}</p>
          </div>
        );
      })}
    </div>
  );
}

