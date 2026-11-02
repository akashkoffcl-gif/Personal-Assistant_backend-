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
  const pageSize = 8;

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

  // Filter events client-side by search query if present
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

  // Max value for interaction trend bars
  const maxInteractions = useMemo(() => {
    return Math.max(...trends.map((t) => t.interactions), 10);
  }, [trends]);

  return (
    <div className="w-full flex flex-col gap-2 lg:h-[calc(100vh-76px)] lg:max-h-[calc(100vh-76px)] lg:overflow-hidden select-none">
      {/* =========================================================================
          ROW 1: COMPACT HEADER WITH CONTROLS (h-[44px])
         ========================================================================= */}
      <div className="h-[44px] shrink-0 bg-white rounded-xl border border-[#E5E2F5] px-3.5 py-1.5 flex items-center justify-between shadow-[0_2px_10px_rgba(139,69,245,0.03)]">
        <div className="flex items-center gap-2.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#8B45F5] bg-[#F4F3FF] px-2 py-0.5 rounded-md border border-[#E5E2F5]">
            Domain B • Telemetry
          </span>
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#16A36A]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#16A36A] animate-pulse" />
            Live Event Logging
          </span>
          <h2 className="text-sm font-extrabold text-[#202033] tracking-tight hidden sm:inline">
            Application Usage Analytics
          </h2>
          <span className="text-[11px] text-[#74738A] font-medium hidden xl:inline">
            — Feature adoption, engine reliability & push telemetry
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Time range buttons */}
          <div className="bg-[#F4F3FF] p-0.5 rounded-lg border border-[#E5E2F5] flex items-center gap-0.5">
            {[7, 14, 30].map((days) => (
              <button
                key={days}
                onClick={() => setTimeRangeDays(days)}
                className={`px-2.5 py-0.5 text-[11px] font-bold rounded-md transition-all ${
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
            className="w-7 h-7 rounded-lg border border-[#E5E2F5] bg-white hover:bg-[#F4F3FF] text-[#74738A] hover:text-[#202033] flex items-center justify-center shadow-2xs transition-all"
            title="Refresh Metrics"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#8B45F5]" />
          </button>

          {/* Export JSON */}
          <button
            onClick={handleExportEvents}
            className="flex items-center gap-1 px-2.5 py-1 bg-[#8B45F5] hover:bg-[#7839D6] text-white text-[11px] font-bold rounded-lg shadow-2xs transition-all"
          >
            <Download className="w-3 h-3" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          ROW 2: EIGHT COMPACT KPI CARDS (h-[60px])
         ========================================================================= */}
      <div className="h-[60px] shrink-0 grid grid-cols-4 lg:grid-cols-8 gap-1.5 sm:gap-2">
        {/* KPI 1: Interactions */}
        <div className="bg-white rounded-xl border border-[#E5E2F5] p-2 flex flex-col justify-between shadow-[0_2px_8px_rgba(139,69,245,0.03)] border-l-[3px] border-l-[#8B45F5]">
          <span className="text-[9px] font-bold text-[#74738A] uppercase tracking-wider truncate">
            Interactions
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-base font-black text-[#202033] leading-none">
              {overview?.totalInteractions ?? 0}
            </span>
            <span className="text-[9px] font-bold text-[#16A36A] flex items-center">
              +{overview?.periodComparisonPercent ?? 0}%
            </span>
          </div>
        </div>

        {/* KPI 2: Active Days */}
        <div className="bg-white rounded-xl border border-[#E5E2F5] p-2 flex flex-col justify-between shadow-[0_2px_8px_rgba(139,69,245,0.03)] border-l-[3px] border-l-[#16A36A]">
          <span className="text-[9px] font-bold text-[#74738A] uppercase tracking-wider truncate">
            Active Days
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-base font-black text-[#202033] leading-none">
              {overview?.activeDays ?? 0} <span className="text-[10px] text-[#74738A] font-normal">/{timeRangeDays}</span>
            </span>
            <span className="text-[9px] text-[#74738A] font-medium">Sessions</span>
          </div>
        </div>

        {/* KPI 3: Top Module */}
        <div className="bg-white rounded-xl border border-[#E5E2F5] p-2 flex flex-col justify-between shadow-[0_2px_8px_rgba(139,69,245,0.03)] border-l-[3px] border-l-[#6935C8]">
          <span className="text-[9px] font-bold text-[#74738A] uppercase tracking-wider truncate">
            Top Module
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-xs font-black text-[#8B45F5] truncate capitalize leading-none">
              {overview?.mostUsedModule || 'None'}
            </span>
            <span className="text-[9px] text-[#74738A]">Rank #1</span>
          </div>
        </div>

        {/* KPI 4: Top Feature */}
        <div className="bg-white rounded-xl border border-[#E5E2F5] p-2 flex flex-col justify-between shadow-[0_2px_8px_rgba(139,69,245,0.03)] border-l-[3px] border-l-[#F59E0B]">
          <span className="text-[9px] font-bold text-[#74738A] uppercase tracking-wider truncate">
            Top Feature
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-xs font-black text-[#6935C8] truncate leading-none">
              {overview?.mostUsedFeature || 'None'}
            </span>
            <span className="text-[9px] text-[#74738A]">Leader</span>
          </div>
        </div>

        {/* KPI 5: Adoption Rate */}
        <div className="bg-white rounded-xl border border-[#E5E2F5] p-2 flex flex-col justify-between shadow-[0_2px_8px_rgba(139,69,245,0.03)] border-l-[3px] border-l-[#10B981]">
          <span className="text-[9px] font-bold text-[#74738A] uppercase tracking-wider truncate">
            Adoption Rate
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-base font-black text-[#202033] leading-none">
              {overview?.featuresAdoptedPercent ?? 0}%
            </span>
            <span className="text-[9px] text-[#74738A]">Features</span>
          </div>
        </div>

        {/* KPI 6: Automation Success */}
        <div className="bg-white rounded-xl border border-[#E5E2F5] p-2 flex flex-col justify-between shadow-[0_2px_8px_rgba(139,69,245,0.03)] border-l-[3px] border-l-[#16A36A]">
          <span className="text-[9px] font-bold text-[#74738A] uppercase tracking-wider truncate">
            Automation
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-base font-black text-[#16A36A] leading-none">
              {overview?.automationSuccessRatePercent ?? 100}%
            </span>
            <span className="text-[9px] text-[#74738A]">Success</span>
          </div>
        </div>

        {/* KPI 7: Push Delivery */}
        <div className="bg-white rounded-xl border border-[#E5E2F5] p-2 flex flex-col justify-between shadow-[0_2px_8px_rgba(139,69,245,0.03)] border-l-[3px] border-l-[#8B45F5]">
          <span className="text-[9px] font-bold text-[#74738A] uppercase tracking-wider truncate">
            Reminders
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-base font-black text-[#8B45F5] leading-none">
              {overview?.reminderSuccessRatePercent ?? 100}%
            </span>
            <span className="text-[9px] text-[#74738A]">Delivery</span>
          </div>
        </div>

        {/* KPI 8: Failed Actions */}
        <div className="bg-white rounded-xl border border-[#E5E2F5] p-2 flex flex-col justify-between shadow-[0_2px_8px_rgba(139,69,245,0.03)] border-l-[3px] border-l-[#E05268]">
          <span className="text-[9px] font-bold text-[#74738A] uppercase tracking-wider truncate">
            Failed Actions
          </span>
          <div className="flex items-baseline justify-between">
            <span
              className={`text-base font-black leading-none ${
                (overview?.failedActionsCount ?? 0) > 0 ? 'text-[#E05268]' : 'text-[#16A36A]'
              }`}
            >
              {overview?.failedActionsCount ?? 0}
            </span>
            <span className="text-[9px] text-[#74738A]">Errors</span>
          </div>
        </div>
      </div>

      {/* =========================================================================
          ROW 3: MAIN ANALYTICS GRID (TWO COLUMNS, flex-1 min-h-[200px])
         ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 flex-1 min-h-[210px] max-h-[290px]">
        {/* LEFT COLUMN: INTERACTION VOLUME BAR CHART (7 COLS) */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-[#E5E2F5] p-3 shadow-[0_2px_10px_rgba(139,69,245,0.03)] flex flex-col justify-between">
          <div className="flex items-center justify-between shrink-0 mb-1">
            <div>
              <h3 className="text-xs font-bold text-[#202033] tracking-tight">
                Interaction Volume
              </h3>
              <p className="text-[10px] text-[#74738A]">
                Daily successful interactions vs operational failures
              </p>
            </div>
            <div className="flex items-center gap-2.5 text-[10px] font-semibold">
              <span className="inline-flex items-center gap-1 text-[#202033]">
                <span className="w-2 h-2 rounded-full bg-[#8B45F5]" />
                Successful
              </span>
              <span className="inline-flex items-center gap-1 text-[#74738A]">
                <span className="w-2 h-2 rounded-full bg-[#E05268]" />
                Failed
              </span>
            </div>
          </div>

          {/* Bar Chart */}
          <div className="flex-1 flex items-end justify-between gap-1.5 pt-2 pb-1 min-h-[120px]">
            {trends.length === 0 ? (
              <div className="w-full h-full flex items-center justify-center text-xs text-[#74738A]">
                No interaction trend data in selected period
              </div>
            ) : (
              trends.map((t) => {
                const heightPercent = Math.max(Math.round((t.interactions / maxInteractions) * 100), 12);
                const isHighest = t.interactions === maxInteractions && maxInteractions > 0;

                return (
                  <div key={t.date} className="flex-1 flex flex-col items-center gap-1 group relative h-full justify-end">
                    {/* Tooltip on hover */}
                    <div className="absolute -top-7 bg-[#202033] text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-sm opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20">
                      {t.interactions} events ({t.failed} err)
                    </div>

                    <div className="w-full flex items-end justify-center flex-1">
                      <div
                        style={{ height: `${heightPercent}%` }}
                        className={`w-full max-w-[24px] rounded-t-md transition-all ${
                          isHighest
                            ? 'bg-[#8B45F5] shadow-xs'
                            : 'bg-[#EDE9FE] hover:bg-[#DDD6FE]'
                        }`}
                      />
                    </div>
                    <span className="text-[10px] font-bold text-[#74738A] group-hover:text-[#202033] truncate">
                      {t.date.split('-').slice(1).join('/')}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: MODULE DISTRIBUTION (5 COLS) */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-[#E5E2F5] p-3 shadow-[0_2px_10px_rgba(139,69,245,0.03)] flex flex-col justify-between">
          <div className="flex items-center justify-between shrink-0 mb-1">
            <div>
              <h3 className="text-xs font-bold text-[#202033] tracking-tight">
                Module Distribution
              </h3>
              <p className="text-[10px] text-[#74738A]">Telemetry share across app domains</p>
            </div>
            <span className="text-[10px] font-bold text-[#8B45F5] bg-[#F4F3FF] px-2 py-0.5 rounded-md border border-[#E5E2F5]">
              {modules.length} Modules
            </span>
          </div>

          <div className="space-y-1.5 flex-1 custom-card-scrollbar overflow-y-auto pr-1">
            {modules.length === 0 ? (
              <p className="text-xs text-[#74738A] py-6 text-center">
                No module events recorded yet.
              </p>
            ) : (
              modules.map((m) => (
                <div
                  key={m.module}
                  onClick={() => {
                    setSelectedModuleFilter(selectedModuleFilter === m.module ? 'all' : m.module);
                    setEventPage(0);
                  }}
                  className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                    selectedModuleFilter === m.module
                      ? 'bg-[#F4F3FF] border-[#8B45F5]'
                      : 'bg-white border-transparent hover:bg-[#F4F3FF]/50'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] mb-0.5">
                    <span className="font-bold text-[#202033] flex items-center gap-1.5">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: m.color }}
                      />
                      {m.displayName}
                    </span>
                    <span className="text-[#74738A] font-semibold text-[10px]">
                      {m.interactions} ({m.percent}%)
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-[#F4F3FF] rounded-full overflow-hidden">
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
          ROW 4: SECONDARY ANALYTICS (5 COMPACT CARDS IN 1 ROW, h-[145px])
         ========================================================================= */}
      <div className="h-[145px] shrink-0 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-2">
        {/* CARD 1: FEATURE ADOPTION */}
        <div className="bg-white rounded-xl border border-[#E5E2F5] p-2.5 shadow-[0_2px_8px_rgba(139,69,245,0.03)] flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <h4 className="text-[11px] font-bold text-[#202033] flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-[#8B45F5]" /> Feature Adoption
            </h4>
            <span className="text-[9px] font-bold text-[#16A36A] bg-[#DCFCE7] px-1.5 py-0.2 rounded">
              {features.filter((f) => f.isAdopted).length}/{features.length}
            </span>
          </div>
          <div className="space-y-1 flex-1 custom-card-scrollbar overflow-y-auto pr-1">
            {features.slice(0, 4).map((f) => (
              <div key={f.feature} className="flex items-center justify-between text-[10px]">
                <span className="truncate text-[#202033] max-w-[95px] font-medium">{f.displayName}</span>
                {f.isAdopted ? (
                  <span className="text-[9px] text-[#16A36A] font-bold flex items-center gap-0.5">
                    <Check className="w-2.5 h-2.5" /> {f.interactions}
                  </span>
                ) : (
                  <span className="text-[9px] text-[#74738A]">Pending</span>
                )}
              </div>
            ))}
          </div>
          <div className="pt-1 border-t border-[#F4F3FF] text-[9px] text-[#74738A] flex justify-between">
            <span>Catalog coverage</span>
            <span className="font-bold text-[#202033]">{overview?.featuresAdoptedPercent ?? 0}%</span>
          </div>
        </div>

        {/* CARD 2: AUTOMATION RELIABILITY */}
        <div className="bg-white rounded-xl border border-[#E5E2F5] p-2.5 shadow-[0_2px_8px_rgba(139,69,245,0.03)] flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <h4 className="text-[11px] font-bold text-[#202033] flex items-center gap-1">
              <Cpu className="w-3 h-3 text-[#8B45F5]" /> Automation Engine
            </h4>
            <span className="text-[9px] font-bold text-[#16A36A] bg-[#DCFCE7] px-1.5 py-0.2 rounded">
              {automationSummary?.successfulExecutions ?? 0} ok
            </span>
          </div>
          <div className="grid grid-cols-3 gap-1 my-1 text-center">
            <div className="p-1 rounded bg-[#F4F3FF] border border-[#E5E2F5]">
              <span className="text-[8px] text-[#74738A] uppercase block">Runs</span>
              <span className="text-xs font-black text-[#202033]">{automationSummary?.totalExecutions ?? 0}</span>
            </div>
            <div className="p-1 rounded bg-[#DCFCE7]/40 border border-[#DCFCE7]">
              <span className="text-[8px] text-[#16A36A] uppercase block">Pass</span>
              <span className="text-xs font-black text-[#16A36A]">{automationSummary?.successfulExecutions ?? 0}</span>
            </div>
            <div className="p-1 rounded bg-[#FFEAEF] border border-[#FECDD6]">
              <span className="text-[8px] text-[#E05268] uppercase block">Skip</span>
              <span className="text-xs font-black text-[#E05268]">{automationSummary?.cooldownSkips ?? 0}</span>
            </div>
          </div>
          <div className="pt-1 border-t border-[#F4F3FF] text-[9px] text-[#74738A] flex justify-between">
            <span>Reliability</span>
            <span className="font-bold text-[#16A36A]">{overview?.automationSuccessRatePercent ?? 100}%</span>
          </div>
        </div>

        {/* CARD 3: NOTIFICATION OUTCOMES */}
        <div className="bg-white rounded-xl border border-[#E5E2F5] p-2.5 shadow-[0_2px_8px_rgba(139,69,245,0.03)] flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <h4 className="text-[11px] font-bold text-[#202033] flex items-center gap-1">
              <BellRing className="w-3 h-3 text-[#8B45F5]" /> Reminder Outcomes
            </h4>
            <span className="text-[9px] font-bold text-[#8B45F5] bg-[#F4F3FF] px-1.5 py-0.2 rounded border border-[#E5E2F5]">
              {reminderSummary?.deliveryRatePercent ?? 100}%
            </span>
          </div>
          <div className="grid grid-cols-4 gap-1 my-1 text-center">
            <div className="p-1 rounded bg-[#F4F3FF]">
              <span className="text-[8px] text-[#74738A] block">Try</span>
              <span className="text-xs font-black text-[#202033]">{reminderSummary?.attempted ?? 0}</span>
            </div>
            <div className="p-1 rounded bg-[#DCFCE7]/50">
              <span className="text-[8px] text-[#16A36A] block">Deliv</span>
              <span className="text-xs font-black text-[#16A36A]">{reminderSummary?.confirmed ?? 0}</span>
            </div>
            <div className="p-1 rounded bg-[#EDE9FE]">
              <span className="text-[8px] text-[#6935C8] block">Retry</span>
              <span className="text-xs font-black text-[#6935C8]">{reminderSummary?.retryCount ?? 0}</span>
            </div>
            <div className="p-1 rounded bg-[#FFEAEF]">
              <span className="text-[8px] text-[#E05268] block">Fail</span>
              <span className="text-xs font-black text-[#E05268]">{reminderSummary?.failed ?? 0}</span>
            </div>
          </div>
          <div className="pt-1 border-t border-[#F4F3FF] text-[9px] text-[#74738A] flex justify-between">
            <span>Push Delivery</span>
            <span className="font-bold text-[#16A36A]">Confirmed</span>
          </div>
        </div>

        {/* CARD 4: FAILED ACTION BREAKDOWN */}
        <div className="bg-white rounded-xl border border-[#E5E2F5] p-2.5 shadow-[0_2px_8px_rgba(139,69,245,0.03)] flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <h4 className="text-[11px] font-bold text-[#202033] flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 text-[#E05268]" /> Failed Actions
            </h4>
            <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
              (overview?.failedActionsCount ?? 0) > 0 ? 'bg-[#FFEAEF] text-[#E05268]' : 'bg-[#DCFCE7] text-[#16A36A]'
            }`}>
              {overview?.failedActionsCount ?? 0} errors
            </span>
          </div>
          <div className="space-y-1 flex-1 custom-card-scrollbar overflow-y-auto pr-1">
            {(overview?.failedActionsCount ?? 0) === 0 ? (
              <div className="h-full flex items-center justify-center text-[10px] text-[#16A36A] font-semibold gap-1">
                <Check className="w-3 h-3" /> Zero operational errors
              </div>
            ) : (
              filteredEvents
                .filter((e) => e.status === 'failed')
                .slice(0, 3)
                .map((ev) => (
                  <div key={ev.id} className="text-[10px] p-1 rounded bg-[#FFEAEF] border border-[#FECDD6]">
                    <span className="font-bold text-[#E05268] block truncate">{ev.eventName}</span>
                    <span className="text-[9px] text-[#74738A]">{ev.module} • {format(new Date(ev.occurredAt), 'HH:mm')}</span>
                  </div>
                ))
            )}
          </div>
          <div className="pt-1 border-t border-[#F4F3FF] text-[9px] text-[#74738A] flex justify-between">
            <span>Exception status</span>
            <span className="font-bold text-[#202033]">Isolated</span>
          </div>
        </div>

        {/* CARD 5: RECENT APPLICATION EVENTS AUDIT */}
        <div className="bg-white rounded-xl border border-[#E5E2F5] p-2.5 shadow-[0_2px_8px_rgba(139,69,245,0.03)] flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <h4 className="text-[11px] font-bold text-[#202033] flex items-center gap-1">
              <Activity className="w-3 h-3 text-[#8B45F5]" /> Recent Events
            </h4>
            <div className="flex items-center gap-1 text-[9px] text-[#74738A]">
              <button
                onClick={() => setEventPage((p) => Math.max(0, p - 1))}
                disabled={eventPage === 0}
                className="hover:text-[#202033] disabled:opacity-30"
              >
                <ChevronLeft className="w-3 h-3" />
              </button>
              <span>{eventPage + 1}</span>
              <button
                onClick={() => setEventPage((p) => p + 1)}
                disabled={(eventPage + 1) * pageSize >= (eventData?.total || 0)}
                className="hover:text-[#202033] disabled:opacity-30"
              >
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>
          <div className="space-y-1 flex-1 custom-card-scrollbar overflow-y-auto pr-1">
            {filteredEvents.slice(0, 3).map((ev) => (
              <div key={ev.id} className="flex items-center justify-between text-[10px] p-1 rounded bg-[#F4F3FF]/70">
                <div className="truncate max-w-[110px]">
                  <span className="font-bold text-[#202033] block truncate">{ev.eventName}</span>
                  <span className="text-[8px] text-[#74738A] uppercase">{ev.module}</span>
                </div>
                <span className={`text-[8px] font-bold px-1 py-0.2 rounded ${
                  ev.status === 'success' ? 'bg-[#DCFCE7] text-[#16A36A]' : 'bg-[#FFEAEF] text-[#E05268]'
                }`}>
                  {ev.status === 'success' ? 'OK' : 'ERR'}
                </span>
              </div>
            ))}
          </div>
          <div className="pt-1 border-t border-[#F4F3FF] text-[9px] text-[#74738A] flex justify-between">
            <span>Total logged</span>
            <span className="font-bold text-[#202033]">{eventData?.total || 0}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
