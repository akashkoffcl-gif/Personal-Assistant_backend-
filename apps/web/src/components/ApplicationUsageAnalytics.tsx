'use client';

import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
  Activity,
  BarChart2,
  Calendar,
  CheckCircle2,
  Clock,
  Cpu,
  Download,
  Filter,
  Layers,
  PieChart,
  RefreshCw,
  Search,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  BellRing,
  Check,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { format } from 'date-fns';
import {
  UsageEventDto,
  UsageTrendPoint,
  ModuleUsagePoint,
  FeatureAdoptionPoint,
  UsageOverviewDto,
  AutomationUsageSummary,
  ReminderOutcomeSummary,
} from '@assistant/shared';

export function ApplicationUsageAnalytics() {
  const [timeRangeDays, setTimeRangeDays] = useState<number>(7);
  const [selectedModuleFilter, setSelectedModuleFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');
  const [eventSearchQuery, setEventSearchQuery] = useState<string>('');
  const [eventPage, setEventPage] = useState<number>(0);
  const pageSize = 10;

  // 1. Overview KPIs
  const {
    data: overview,
    isLoading: overviewLoading,
    refetch: refetchOverview,
  } = useQuery<UsageOverviewDto>({
    queryKey: ['usage-overview', timeRangeDays],
    queryFn: () => api.getUsageOverview(timeRangeDays),
  });

  // 2. Daily Trends
  const {
    data: trends = [],
    isLoading: trendsLoading,
    refetch: refetchTrends,
  } = useQuery<UsageTrendPoint[]>({
    queryKey: ['usage-trends', timeRangeDays],
    queryFn: () => api.getUsageTrends(timeRangeDays),
  });

  // 3. Module Distribution
  const {
    data: modules = [],
    isLoading: modulesLoading,
    refetch: refetchModules,
  } = useQuery<ModuleUsagePoint[]>({
    queryKey: ['usage-modules', timeRangeDays],
    queryFn: () => api.getUsageModules(timeRangeDays),
  });

  // 4. Feature Adoption
  const {
    data: features = [],
    isLoading: featuresLoading,
    refetch: refetchFeatures,
  } = useQuery<FeatureAdoptionPoint[]>({
    queryKey: ['usage-features', timeRangeDays],
    queryFn: () => api.getUsageFeatures(timeRangeDays),
  });

  // 5. Automation Summary
  const { data: automationSummary, refetch: refetchAutomation } = useQuery<AutomationUsageSummary>({
    queryKey: ['usage-automation', timeRangeDays],
    queryFn: () => api.getUsageAutomation(timeRangeDays),
  });

  // 6. Reminder Summary
  const { data: reminderSummary, refetch: refetchReminders } = useQuery<ReminderOutcomeSummary>({
    queryKey: ['usage-reminders', timeRangeDays],
    queryFn: () => api.getUsageReminders(timeRangeDays),
  });

  // 7. Paginated Raw Audit Events
  const {
    data: eventData,
    isLoading: eventsLoading,
    refetch: refetchEvents,
  } = useQuery<{ items: UsageEventDto[]; total: number }>({
    queryKey: ['usage-events', selectedModuleFilter, selectedStatusFilter, eventPage],
    queryFn: () =>
      api.getUsageEvents({
        module: selectedModuleFilter === 'all' ? undefined : selectedModuleFilter,
        status: selectedStatusFilter === 'all' ? undefined : selectedStatusFilter,
        limit: pageSize,
        page: eventPage + 1,
      }),
  });

  const refreshAll = () => {
    refetchOverview();
    refetchTrends();
    refetchModules();
    refetchFeatures();
    refetchAutomation();
    refetchReminders();
    refetchEvents();
  };

  // Filter events client-side by query if search entered
  const filteredEvents = useMemo<UsageEventDto[]>(() => {
    const raw: UsageEventDto[] = eventData?.items || [];
    if (!eventSearchQuery.trim()) return raw;
    const q = eventSearchQuery.toLowerCase();
    return raw.filter(
      (e: UsageEventDto) =>
        e.eventName.toLowerCase().includes(q) ||
        e.module.toLowerCase().includes(q) ||
        e.feature.toLowerCase().includes(q) ||
        (e.action && e.action.toLowerCase().includes(q)),
    );
  }, [eventData, eventSearchQuery]);

  // Export Events JSON
  const handleExportEvents = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(filteredEvents, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `usage_events_${format(new Date(), 'yyyy-MM-dd')}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="space-y-6">
      {/* =========================================================================
          TOP BANNER & CONTROLS
         ========================================================================= */}
      <div className="bg-white rounded-2xl border border-[#E5E2F5] p-5 shadow-[0_4px_20px_rgba(139,69,245,0.05)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#8B45F5] bg-[#F4F3FF] px-2.5 py-0.5 rounded-full border border-[#E5E2F5]">
              Domain B • Application Telemetry
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#16A36A]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#16A36A] animate-pulse" />
              Live Event Logging
            </span>
          </div>
          <h2 className="text-xl font-black text-[#202033] tracking-tight">
            Application Usage Analytics
          </h2>
          <p className="text-xs text-[#74738A] font-medium mt-0.5">
            Operational telemetry, feature adoption rates, automation engine reliability, and reminder delivery outcomes.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          {/* Time range buttons */}
          <div className="bg-[#F4F3FF] p-1 rounded-xl border border-[#E5E2F5] flex items-center gap-1">
            {[7, 14, 30].map((days) => (
              <button
                key={days}
                onClick={() => setTimeRangeDays(days)}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                  timeRangeDays === days
                    ? 'bg-[#8B45F5] text-white shadow-2xs'
                    : 'text-[#74738A] hover:text-[#202033]'
                }`}
              >
                {days}D
              </button>
            ))}
          </div>

          {/* Refresh button */}
          <button
            onClick={refreshAll}
            className="w-9 h-9 rounded-xl border border-[#E5E2F5] bg-white hover:bg-[#F4F3FF] text-[#74738A] hover:text-[#202033] flex items-center justify-center shadow-2xs transition-all"
            title="Refresh Usage Metrics"
          >
            <RefreshCw className="w-4 h-4 text-[#8B45F5]" />
          </button>
        </div>
      </div>

      {/* =========================================================================
          EXECUTIVE KPI CARDS (8 METRICS)
         ========================================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 sm:gap-4">
        {/* KPI 1: Interactions */}
        <div className="bg-white rounded-2xl border border-[#E5E2F5] p-4 shadow-[0_4px_20px_rgba(139,69,245,0.04)]">
          <span className="text-[10px] font-bold text-[#74738A] uppercase tracking-wider block">
            Interactions
          </span>
          <span className="text-xl sm:text-2xl font-black text-[#202033] mt-1 block">
            {overview?.totalInteractions ?? 0}
          </span>
          <span className="text-[10px] font-bold text-[#16A36A] flex items-center gap-0.5 mt-1">
            <TrendingUp className="w-2.5 h-2.5" />
            +{overview?.periodComparisonPercent ?? 0}% vs prior
          </span>
        </div>

        {/* KPI 2: Active Days */}
        <div className="bg-white rounded-2xl border border-[#E5E2F5] p-4 shadow-[0_4px_20px_rgba(139,69,245,0.04)]">
          <span className="text-[10px] font-bold text-[#74738A] uppercase tracking-wider block">
            Active Days
          </span>
          <span className="text-xl sm:text-2xl font-black text-[#202033] mt-1 block">
            {overview?.activeDays ?? 0} / {timeRangeDays}
          </span>
          <span className="text-[10px] text-[#74738A] block mt-1">
            Active app sessions
          </span>
        </div>

        {/* KPI 3: Top Module */}
        <div className="bg-white rounded-2xl border border-[#E5E2F5] p-4 shadow-[0_4px_20px_rgba(139,69,245,0.04)]">
          <span className="text-[10px] font-bold text-[#74738A] uppercase tracking-wider block">
            Top Module
          </span>
          <span className="text-sm font-black text-[#8B45F5] mt-1.5 block truncate capitalize">
            {overview?.mostUsedModule || 'None'}
          </span>
          <span className="text-[10px] text-[#74738A] block mt-1">
            Highest interaction
          </span>
        </div>

        {/* KPI 4: Top Feature */}
        <div className="bg-white rounded-2xl border border-[#E5E2F5] p-4 shadow-[0_4px_20px_rgba(139,69,245,0.04)]">
          <span className="text-[10px] font-bold text-[#74738A] uppercase tracking-wider block">
            Top Feature
          </span>
          <span className="text-sm font-black text-[#6935C8] mt-1.5 block truncate">
            {overview?.mostUsedFeature || 'None'}
          </span>
          <span className="text-[10px] text-[#74738A] block mt-1">
            Most adopted action
          </span>
        </div>

        {/* KPI 5: Feature Adoption */}
        <div className="bg-white rounded-2xl border border-[#E5E2F5] p-4 shadow-[0_4px_20px_rgba(139,69,245,0.04)]">
          <span className="text-[10px] font-bold text-[#74738A] uppercase tracking-wider block">
            Adoption Rate
          </span>
          <span className="text-xl sm:text-2xl font-black text-[#202033] mt-1 block">
            {overview?.featuresAdoptedPercent ?? 0}%
          </span>
          <span className="text-[10px] text-[#74738A] block mt-1">
            Catalog features
          </span>
        </div>

        {/* KPI 6: Automation Success */}
        <div className="bg-white rounded-2xl border border-[#E5E2F5] p-4 shadow-[0_4px_20px_rgba(139,69,245,0.04)]">
          <span className="text-[10px] font-bold text-[#74738A] uppercase tracking-wider block">
            Automation
          </span>
          <span className="text-xl sm:text-2xl font-black text-[#16A36A] mt-1 block">
            {overview?.automationSuccessRatePercent ?? 100}%
          </span>
          <span className="text-[10px] text-[#74738A] block mt-1">
            Rule execution rate
          </span>
        </div>

        {/* KPI 7: Reminder Delivery */}
        <div className="bg-white rounded-2xl border border-[#E5E2F5] p-4 shadow-[0_4px_20px_rgba(139,69,245,0.04)]">
          <span className="text-[10px] font-bold text-[#74738A] uppercase tracking-wider block">
            Reminders
          </span>
          <span className="text-xl sm:text-2xl font-black text-[#8B45F5] mt-1 block">
            {overview?.reminderSuccessRatePercent ?? 100}%
          </span>
          <span className="text-[10px] text-[#74738A] block mt-1">
            Push delivered
          </span>
        </div>

        {/* KPI 8: Failed Actions */}
        <div className="bg-white rounded-2xl border border-[#E5E2F5] p-4 shadow-[0_4px_20px_rgba(139,69,245,0.04)]">
          <span className="text-[10px] font-bold text-[#74738A] uppercase tracking-wider block">
            Failed Actions
          </span>
          <span
            className={`text-xl sm:text-2xl font-black mt-1 block ${
              (overview?.failedActionsCount ?? 0) > 0 ? 'text-[#E05268]' : 'text-[#16A36A]'
            }`}
          >
            {overview?.failedActionsCount ?? 0}
          </span>
          <span className="text-[10px] text-[#74738A] block mt-1">
            Exceptions logged
          </span>
        </div>
      </div>

      {/* =========================================================================
          SECTION A & B: TREND CHART + MODULE DISTRIBUTION
         ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* SECTION A: Usage Trends Bar Chart (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-[#E5E2F5] p-6 shadow-[0_4px_20px_rgba(139,69,245,0.05)]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-extrabold text-[#202033] tracking-tight">
                Interaction Volume
              </h3>
              <p className="text-xs text-[#74738A]">
                Daily successful interactions vs operational failures
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs font-semibold">
              <span className="inline-flex items-center gap-1.5 text-[#202033]">
                <span className="w-2.5 h-2.5 rounded-full bg-[#8B45F5]" />
                Successful
              </span>
              <span className="inline-flex items-center gap-1.5 text-[#74738A]">
                <span className="w-2.5 h-2.5 rounded-full bg-[#E05268]" />
                Failed
              </span>
            </div>
          </div>

          {/* Bar Chart Visualization styled like reference */}
          <div className="h-48 flex items-end justify-between gap-2 pt-6 pb-2">
            {trends.length === 0 ? (
              <div className="w-full h-full flex items-center justify-center text-xs text-[#74738A]">
                No interaction trend data in selected period
              </div>
            ) : (
              trends.map((t, idx) => {
                const max = Math.max(...trends.map((x) => x.interactions), 10);
                const heightPercent = Math.max(Math.round((t.interactions / max) * 100), 10);
                const isHighest = t.interactions === max && max > 0;

                return (
                  <div key={t.date} className="flex-1 flex flex-col items-center gap-2 group relative">
                    {/* Tooltip on hover */}
                    <div className="absolute -top-8 bg-[#202033] text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-sm opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                      {t.interactions} events ({t.failed} err)
                    </div>

                    <div className="w-full flex items-end justify-center h-36">
                      <div
                        style={{ height: `${heightPercent}%` }}
                        className={`w-full max-w-[28px] rounded-xl transition-all ${
                          isHighest
                            ? 'bg-[#8B45F5] shadow-sm'
                            : 'bg-[#F4F3FF] hover:bg-[#EDE9FE]'
                        }`}
                      />
                    </div>
                    <span className="text-[11px] font-bold text-[#74738A] group-hover:text-[#202033]">
                      {t.date.split('-').slice(1).join('/')}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* SECTION B: Module Distribution (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-[#E5E2F5] p-6 shadow-[0_4px_20px_rgba(139,69,245,0.05)]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-extrabold text-[#202033] tracking-tight">
                Module Distribution
              </h3>
              <p className="text-xs text-[#74738A]">Share of telemetry across workspaces</p>
            </div>
            <span className="text-xs font-bold text-[#8B45F5] bg-[#F4F3FF] px-2.5 py-1 rounded-full border border-[#E5E2F5]">
              {modules.length} Active Modules
            </span>
          </div>

          <div className="space-y-3">
            {modules.length === 0 ? (
              <p className="text-xs text-[#74738A] py-8 text-center">
                No module events recorded yet.
              </p>
            ) : (
              modules.map((m) => (
                <div key={m.module} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-[#202033] flex items-center gap-1.5">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: m.color }}
                      />
                      {m.displayName}
                    </span>
                    <span className="text-[#74738A] font-semibold">
                      {m.interactions} ({m.percent}%)
                    </span>
                  </div>
                  <div className="w-full h-2 bg-[#F4F3FF] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${m.percent}%`,
                        backgroundColor: m.color,
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* =========================================================================
          SECTION C: FEATURE ADOPTION INDEX
         ========================================================================= */}
      <div className="bg-white rounded-2xl border border-[#E5E2F5] p-6 shadow-[0_4px_20px_rgba(139,69,245,0.05)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <h3 className="text-base font-extrabold text-[#202033] tracking-tight">
              Feature Adoption Catalog
            </h3>
            <p className="text-xs text-[#74738A]">
              Telemetry ranking of core capabilities adopted by the user
            </p>
          </div>
          <div className="text-xs font-bold text-[#16A36A] bg-[#DCFCE7] px-3 py-1 rounded-full">
            {features.filter((f) => f.isAdopted).length} of {features.length} Features Adopted
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {features.map((f) => (
            <div
              key={f.feature}
              className={`p-3.5 rounded-xl border transition-all ${
                f.isAdopted
                  ? 'bg-white border-[#E5E2F5] shadow-2xs'
                  : 'bg-[#F4F3FF]/50 border-dashed border-[#E5E2F5]'
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <h4 className="text-xs font-bold text-[#202033]">{f.displayName}</h4>
                  <span className="text-[10px] text-[#74738A] uppercase font-semibold">
                    {f.module}
                  </span>
                </div>
                {f.isAdopted ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#16A36A] bg-[#DCFCE7] px-2 py-0.5 rounded-full">
                    <Check className="w-2.5 h-2.5" />
                    Adopted
                  </span>
                ) : (
                  <span className="text-[10px] font-bold text-[#74738A] bg-[#E5E2F5] px-2 py-0.5 rounded-full">
                    Pending
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between text-[11px] text-[#74738A] mt-2 pt-2 border-t border-[#F4F3FF]">
                <span>Interactions: <strong className="text-[#202033]">{f.interactions}</strong></span>
                <span>
                  {f.lastUsedAt
                    ? `Last: ${format(new Date(f.lastUsedAt), 'MMM d')}`
                    : 'Not yet'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* =========================================================================
          SECTION D & E: AUTOMATION RELIABILITY & REMINDER OUTCOMES
         ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Automation Execution Reliability (6 cols) */}
        <div className="lg:col-span-6 bg-white rounded-2xl border border-[#E5E2F5] p-6 shadow-[0_4px_20px_rgba(139,69,245,0.05)]">
          <div className="flex items-center gap-2 mb-4">
            <Cpu className="w-5 h-5 text-[#8B45F5]" />
            <div>
              <h3 className="text-base font-extrabold text-[#202033]">
                Automation Engine Reliability
              </h3>
              <p className="text-xs text-[#74738A]">
                Rule evaluations, execution success rate, and cooldown suppression
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="p-3 rounded-xl bg-[#F4F3FF] border border-[#E5E2F5]">
              <span className="text-[10px] font-bold text-[#74738A] uppercase">Total Runs</span>
              <span className="text-lg font-black text-[#202033] block mt-0.5">
                {automationSummary?.totalExecutions ?? 0}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-[#DCFCE7]/40 border border-[#DCFCE7]">
              <span className="text-[10px] font-bold text-[#16A36A] uppercase">Successful</span>
              <span className="text-lg font-black text-[#16A36A] block mt-0.5">
                {automationSummary?.successfulExecutions ?? 0}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-[#FFEAEF] border border-[#FECDD6]">
              <span className="text-[10px] font-bold text-[#E05268] uppercase">Suppressed</span>
              <span className="text-lg font-black text-[#E05268] block mt-0.5">
                {automationSummary?.cooldownSkips ?? 0}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <h5 className="text-xs font-bold text-[#202033]">Top Executed Rules</h5>
            {automationSummary?.ruleBreakdown?.length ? (
              automationSummary.ruleBreakdown.map((r) => (
                <div
                  key={r.ruleId}
                  className="flex items-center justify-between text-xs p-2 rounded-lg bg-[#F4F3FF]"
                >
                  <span className="font-semibold text-[#202033]">{r.name}</span>
                  <span className="font-bold text-[#8B45F5]">{r.count} runs</span>
                </div>
              ))
            ) : (
              <p className="text-xs text-[#74738A]">No automation triggers recorded yet.</p>
            )}
          </div>
        </div>

        {/* Reminder Delivery Outcomes (6 cols) */}
        <div className="lg:col-span-6 bg-white rounded-2xl border border-[#E5E2F5] p-6 shadow-[0_4px_20px_rgba(139,69,245,0.05)]">
          <div className="flex items-center gap-2 mb-4">
            <BellRing className="w-5 h-5 text-[#8B45F5]" />
            <div>
              <h3 className="text-base font-extrabold text-[#202033]">
                Reminder Delivery Outcomes
              </h3>
              <p className="text-xs text-[#74738A]">
                Web push delivery verification and interaction outcomes
              </p>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2.5 mb-4">
            <div className="p-3 rounded-xl bg-[#F4F3FF] border border-[#E5E2F5]">
              <span className="text-[10px] font-bold text-[#74738A] uppercase">Attempts</span>
              <span className="text-lg font-black text-[#202033] block mt-0.5">
                {reminderSummary?.attempted ?? 0}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-[#DCFCE7]/40 border border-[#DCFCE7]">
              <span className="text-[10px] font-bold text-[#16A36A] uppercase">Delivered</span>
              <span className="text-lg font-black text-[#16A36A] block mt-0.5">
                {reminderSummary?.confirmed ?? 0}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-[#EDE9FE] border border-[#DDD6FE]">
              <span className="text-[10px] font-bold text-[#6935C8] uppercase">Retries</span>
              <span className="text-lg font-black text-[#6935C8] block mt-0.5">
                {reminderSummary?.retryCount ?? 0}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-[#FFEAEF] border border-[#FECDD6]">
              <span className="text-[10px] font-bold text-[#E05268] uppercase">Failed</span>
              <span className="text-lg font-black text-[#E05268] block mt-0.5">
                {reminderSummary?.failed ?? 0}
              </span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#F4F3FF] border border-[#E5E2F5] flex items-center justify-between">
            <span className="text-xs font-semibold text-[#202033]">Delivery Rate</span>
            <span className="text-sm font-black text-[#16A36A]">
              {reminderSummary?.deliveryRatePercent ?? 100}%
            </span>
          </div>
        </div>
      </div>

      {/* =========================================================================
          SECTION F: INTERACTION EVENT AUDIT LOG
         ========================================================================= */}
      <div className="bg-white rounded-2xl border border-[#E5E2F5] p-6 shadow-[0_4px_20px_rgba(139,69,245,0.05)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-base font-extrabold text-[#202033] tracking-tight">
              Usage Event Audit Log
            </h3>
            <p className="text-xs text-[#74738A]">
              Authoritative chronological record of application interactions and operational telemetry
            </p>
          </div>

          {/* Controls: Filter & Export */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Module filter */}
            <select
              value={selectedModuleFilter}
              onChange={(e) => {
                setSelectedModuleFilter(e.target.value);
                setEventPage(0);
              }}
              className="text-xs bg-[#F4F3FF] border border-[#E5E2F5] rounded-xl px-2.5 py-1.5 text-[#202033] font-semibold focus:outline-none"
            >
              <option value="all">All Modules</option>
              <option value="tasks">Tasks</option>
              <option value="routines">Routines</option>
              <option value="projects">Projects</option>
              <option value="planning">Planning</option>
              <option value="calendar">Calendar</option>
              <option value="wellness">Wellness</option>
              <option value="automation">Automation</option>
              <option value="analytics">Analytics</option>
            </select>

            {/* Status filter */}
            <select
              value={selectedStatusFilter}
              onChange={(e) => {
                setSelectedStatusFilter(e.target.value);
                setEventPage(0);
              }}
              className="text-xs bg-[#F4F3FF] border border-[#E5E2F5] rounded-xl px-2.5 py-1.5 text-[#202033] font-semibold focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="success">Success</option>
              <option value="failed">Failed</option>
            </select>

            {/* Export JSON */}
            <button
              onClick={handleExportEvents}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#8B45F5] hover:bg-[#7839D6] text-white text-xs font-bold rounded-xl shadow-2xs transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export</span>
            </button>
          </div>
        </div>

        {/* Search within events */}
        <div className="relative mb-3">
          <Search className="w-3.5 h-3.5 text-[#74738A] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search events by name, feature, or action..."
            value={eventSearchQuery}
            onChange={(e) => setEventSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#F4F3FF] border border-[#E5E2F5] rounded-xl text-[#202033] placeholder-[#74738A] focus:outline-none"
          />
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-xl border border-[#E5E2F5]">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F4F3FF] border-b border-[#E5E2F5] text-[#74738A] uppercase font-bold text-[10px]">
              <tr>
                <th className="px-3.5 py-2.5">Time</th>
                <th className="px-3.5 py-2.5">Event</th>
                <th className="px-3.5 py-2.5">Module</th>
                <th className="px-3.5 py-2.5">Feature</th>
                <th className="px-3.5 py-2.5">Action</th>
                <th className="px-3.5 py-2.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E2F5] text-[#202033]">
              {eventsLoading ? (
                <tr>
                  <td colSpan={6} className="px-3.5 py-6 text-center text-[#74738A]">
                    Loading telemetry audit events...
                  </td>
                </tr>
              ) : filteredEvents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3.5 py-6 text-center text-[#74738A]">
                    No telemetry events match your criteria.
                  </td>
                </tr>
              ) : (
                filteredEvents.map((ev) => (
                  <tr key={ev.id} className="hover:bg-[#F4F3FF]/40 transition-colors">
                    <td className="px-3.5 py-2.5 text-[#74738A] whitespace-nowrap font-medium text-[11px]">
                      {format(new Date(ev.occurredAt), 'MMM d, HH:mm:ss')}
                    </td>
                    <td className="px-3.5 py-2.5 font-bold">{ev.eventName}</td>
                    <td className="px-3.5 py-2.5 capitalize text-[#74738A]">{ev.module}</td>
                    <td className="px-3.5 py-2.5">{ev.feature}</td>
                    <td className="px-3.5 py-2.5 text-[#74738A]">{ev.action}</td>
                    <td className="px-3.5 py-2.5 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          ev.status === 'success'
                            ? 'bg-[#DCFCE7] text-[#16A36A]'
                            : 'bg-[#FFEAEF] text-[#E05268]'
                        }`}
                      >
                        {ev.status === 'success' ? (
                          <Check className="w-2.5 h-2.5" />
                        ) : (
                          <AlertTriangle className="w-2.5 h-2.5" />
                        )}
                        {ev.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination controls */}
        <div className="flex items-center justify-between mt-3 text-xs text-[#74738A]">
          <span>
            Showing page {eventPage + 1} ({filteredEvents.length} items on page, {eventData?.total || 0} total)
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setEventPage((p) => Math.max(0, p - 1))}
              disabled={eventPage === 0}
              className="p-1 rounded-lg border border-[#E5E2F5] bg-white hover:bg-[#F4F3FF] disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setEventPage((p) => p + 1)}
              disabled={(eventPage + 1) * pageSize >= (eventData?.total || 0)}
              className="p-1 rounded-lg border border-[#E5E2F5] bg-white hover:bg-[#F4F3FF] disabled:opacity-40"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

