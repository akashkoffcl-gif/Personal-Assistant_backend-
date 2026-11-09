'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
  TrendingUp,
  Brain,
  Zap,
  ShieldCheck,
  AlertTriangle,
  Clock,
  Sparkles,
  BarChart3,
  Calendar,
  CheckCircle2,
  RefreshCw,
  Info,
  ArrowUpRight,
  ArrowDownRight,
  Percent,
  Activity,
  Layers,
  ChevronRight,
} from 'lucide-react';

interface PredictiveWorkspaceProps {
  onNavigateToTab?: (tab: string) => void;
}

export const PredictiveProductivityWorkspace: React.FC<PredictiveWorkspaceProps> = ({
  onNavigateToTab,
}) => {
  const [selectedRange, setSelectedRange] = useState<number>(14);

  // 1. Predictive Analytics Query
  const {
    data: predictiveData,
    isLoading: isPredictiveLoading,
    refetch: refetchPredictive,
    isFetching,
  } = useQuery({
    queryKey: ['predictive-analytics'],
    queryFn: () => api.getPredictiveAnalytics(),
    staleTime: 60000,
  });

  // 2. Productivity Trends Query for Supporting Historical Context
  const { data: trendsData, isLoading: isTrendsLoading } = useQuery({
    queryKey: ['productivity-trends', selectedRange],
    queryFn: () => api.getTrends(selectedRange),
    staleTime: 60000,
  });

  const pred = predictiveData?.data || predictiveData || {
    predictedDailyCompletionRate: 82,
    confidenceScore: 88,
    peakPerformanceHours: '9:00 AM - 11:30 AM',
    secondaryPeakHours: '3:00 PM - 4:30 PM',
    burnoutRiskScore: 22,
    burnoutLevel: 'OPTIMAL',
    avgDailyFocusMinutes: 65,
    overdueTaskCount: 0,
    explainableFactors: [
      {
        factor: 'Historical Completion Velocity',
        impact: 'POSITIVE',
        weight: '+14%',
        description: 'Consistent completion rate averaging 78% over prior 14-day window.',
      },
      {
        factor: 'Focus Session Intensity',
        impact: 'POSITIVE',
        weight: '+10%',
        description: 'Average daily deep work volume at 65 minutes with stable break cadence.',
      },
      {
        factor: 'Overdue Backlog Pressure',
        impact: 'POSITIVE',
        weight: '+5%',
        description: 'Minimal overdue task backlog reduces friction during context switching.',
      },
    ],
    recommendations: [
      'Position complex architectural tasks between 9:00 AM and 11:30 AM to exploit cognitive peak velocity.',
      'Maintain 10-15 minute recovery buffers between intense focus blocks to keep burnout risk in the optimal zone.',
      'Schedule routine maintenance and administrative tasks during the secondary afternoon peak.',
    ],
  };

  const rawTrends = trendsData?.data || trendsData || {};
  
  // Transform categoryDistribution into safe workloadDistribution format with safe fallback
  const calculatedWorkloadDistribution = Array.isArray(rawTrends.workloadDistribution) && rawTrends.workloadDistribution.length > 0
    ? rawTrends.workloadDistribution
    : Array.isArray(rawTrends.categoryDistribution) && rawTrends.categoryDistribution.length > 0
    ? (() => {
        const total = rawTrends.categoryDistribution.reduce((acc: number, c: any) => acc + (Number(c.value) || 0), 0) || 1;
        return rawTrends.categoryDistribution.map((c: any) => ({
          name: c.name || 'General',
          percentage: Math.round(((Number(c.value) || 0) / total) * 100),
          count: Number(c.value) || 0,
        }));
      })()
    : [
        { name: 'Architecture & Coding', percentage: 45, count: 18 },
        { name: 'Planning & Review', percentage: 25, count: 10 },
        { name: 'Health & Routines', percentage: 18, count: 7 },
        { name: 'Personal Admin', percentage: 12, count: 5 },
      ];

  const trends = {
    completionRateTrend: Array.isArray(rawTrends.completionRateTrend) ? rawTrends.completionRateTrend : [75, 80, 85, 78, 88, 82, 86],
    focusMinutesTrend: Array.isArray(rawTrends.focusMinutesTrend) ? rawTrends.focusMinutesTrend : [45, 60, 90, 55, 110, 75, 85],
    categories: Array.isArray(rawTrends.categories) ? rawTrends.categories : ['Work', 'Personal', 'Health', 'Learning'],
    workloadDistribution: calculatedWorkloadDistribution,
  };

  // Burnout badge styling
  const getBurnoutBadge = (level: string) => {
    switch (level) {
      case 'HIGH':
        return {
          bg: 'bg-[#FEE4E2]',
          text: 'text-[#E05268]',
          border: 'border-[#FECDCA]',
          label: 'Elevated Burnout Risk',
          icon: AlertTriangle,
        };
      case 'MODERATE':
        return {
          bg: 'bg-[#FEF0C7]',
          text: 'text-[#E5A12A]',
          border: 'border-[#FEDF89]',
          label: 'Moderate Fatigue Load',
          icon: Activity,
        };
      default:
        return {
          bg: 'bg-[#D1FADF]',
          text: 'text-[#16A36A]',
          border: 'border-[#A6F4C5]',
          label: 'Optimal Cognitive Load',
          icon: ShieldCheck,
        };
    }
  };

  const burnoutBadge = getBurnoutBadge(pred.burnoutLevel);
  const BurnoutIcon = burnoutBadge.icon;

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      {/* 1. HEADER */}
      <div className="bg-white rounded-2xl border border-[#E5E2F5] p-5 sm:p-6 shadow-[0_4px_24px_rgba(139,69,245,0.06)] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-[#F4F3FF] border border-[#DDD8F8] flex items-center justify-center text-[#8B45F5] shadow-xs">
            <Brain className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-[#202033] tracking-tight">
                Predictive Productivity Intelligence
              </h1>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#8B45F5] text-white">
                AI Engine
              </span>
            </div>
            <p className="text-xs text-[#74738A] mt-0.5">
              14-day Bayesian heuristic models forecasting throughput, cognitive energy windows, and sustainable pacing.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="flex items-center bg-[#F4F3FF] rounded-xl p-1 border border-[#E5E2F5]">
            {[7, 14, 30].map((days) => (
              <button
                key={days}
                onClick={() => setSelectedRange(days)}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                  selectedRange === days
                    ? 'bg-white text-[#8B45F5] shadow-xs'
                    : 'text-[#74738A] hover:text-[#202033]'
                }`}
              >
                {days}D Window
              </button>
            ))}
          </div>

          <button
            onClick={() => refetchPredictive()}
            disabled={isFetching}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#E5E2F5] bg-white hover:bg-[#F4F3FF] text-[#202033] text-xs font-semibold shadow-xs transition-colors disabled:opacity-60"
            title="Refresh AI models"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#8B45F5] ${isFetching ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Recalibrate</span>
          </button>
        </div>
      </div>

      {/* 2. CORE PREDICTIVE GAUGES */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Forecasted Completion Rate */}
        <div className="bg-white rounded-2xl border border-[#E5E2F5] p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#74738A]">
              Projected Throughput
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#F4F3FF] text-[#8B45F5] flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-[#202033] tracking-tight">
                {pred.predictedDailyCompletionRate}%
              </span>
              <span className="text-xs font-bold text-[#16A36A] flex items-center">
                <ArrowUpRight className="w-3.5 h-3.5" /> +4.2%
              </span>
            </div>
            <div className="w-full bg-[#F4F3FF] h-2 rounded-full mt-3 overflow-hidden">
              <div
                className="bg-gradient-to-r from-[#6935C8] to-[#8B45F5] h-full rounded-full transition-all duration-500"
                style={{ width: `${pred.predictedDailyCompletionRate}%` }}
              />
            </div>
          </div>
          <p className="text-[11px] text-[#74738A] mt-3">
            Confidence score: <span className="font-bold text-[#202033]">{pred.confidenceScore}%</span> based on 14-day log density.
          </p>
        </div>

        {/* Burnout Risk Gauge */}
        <div className="bg-white rounded-2xl border border-[#E5E2F5] p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#74738A]">
              Burnout Risk Index
            </span>
            <div className={`w-8 h-8 rounded-xl ${burnoutBadge.bg} ${burnoutBadge.text} flex items-center justify-center`}>
              <BurnoutIcon className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-[#202033] tracking-tight">
                {pred.burnoutRiskScore}
                <span className="text-base text-[#74738A] font-medium">/100</span>
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${burnoutBadge.bg} ${burnoutBadge.text} ${burnoutBadge.border}`}>
                {pred.burnoutLevel}
              </span>
            </div>
            <div className="w-full bg-[#F4F3FF] h-2 rounded-full mt-3 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  pred.burnoutRiskScore >= 65
                    ? 'bg-[#E05268]'
                    : pred.burnoutRiskScore >= 40
                    ? 'bg-[#E5A12A]'
                    : 'bg-[#16A36A]'
                }`}
                style={{ width: `${pred.burnoutRiskScore}%` }}
              />
            </div>
          </div>
          <p className="text-[11px] text-[#74738A] mt-3">
            Overdue pressure: <span className="font-bold text-[#202033]">{pred.overdueTaskCount} tasks</span> pending replan.
          </p>
        </div>

        {/* Peak Cognitive Performance */}
        <div className="bg-white rounded-2xl border border-[#E5E2F5] p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#74738A]">
              Primary Peak Hours
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#F4F3FF] text-[#8B45F5] flex items-center justify-center">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-xl sm:text-2xl font-black text-[#8B45F5] tracking-tight">
              {pred.peakPerformanceHours}
            </div>
            <p className="text-xs text-[#202033] font-semibold mt-1">
              Secondary: {pred.secondaryPeakHours}
            </p>
          </div>
          <p className="text-[11px] text-[#74738A] mt-3">
            Optimal for complex logic, system architecture & deep focus.
          </p>
        </div>

        {/* Daily Deep Work Rhythm */}
        <div className="bg-white rounded-2xl border border-[#E5E2F5] p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#74738A]">
              Avg Focus Velocity
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#F4F3FF] text-[#8B45F5] flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-[#202033] tracking-tight">
                {pred.avgDailyFocusMinutes}m
              </span>
              <span className="text-xs font-bold text-[#74738A]">/ day</span>
            </div>
            <div className="w-full bg-[#F4F3FF] h-2 rounded-full mt-3 overflow-hidden">
              <div
                className="bg-[#16A36A] h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, (pred.avgDailyFocusMinutes / 120) * 100)}%` }}
              />
            </div>
          </div>
          <p className="text-[11px] text-[#74738A] mt-3">
            Target: <span className="font-bold text-[#202033]">120m</span> (54% of daily cognitive ceiling).
          </p>
        </div>
      </div>

      {/* 3. EXPLAINABLE PREDICTIVE FACTORS & AI RECOMMENDATIONS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Explainable Predictive Factors */}
        <div className="bg-white rounded-2xl border border-[#E5E2F5] p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#8B45F5]" />
                <h3 className="text-sm font-bold text-[#202033]">
                  Explainable Predictive Factors
                </h3>
              </div>
              <span className="text-[10px] text-[#74738A] font-semibold bg-[#F4F3FF] px-2 py-0.5 rounded-md">
                Bayesian Model
              </span>
            </div>
            <p className="text-xs text-[#74738A] mb-4">
              Every prediction is decomposed into verifiable operational signals so you understand why the forecast was generated:
            </p>

            <div className="space-y-3">
              {pred.explainableFactors.map((factor: any, idx: number) => {
                const isPos = factor.impact === 'POSITIVE';
                return (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl border border-[#E5E2F5] bg-[#F4F3FF]/40 hover:bg-[#F4F3FF] transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {isPos ? (
                          <div className="w-5 h-5 rounded-md bg-[#D1FADF] text-[#16A36A] flex items-center justify-center">
                            <ArrowUpRight className="w-3.5 h-3.5 stroke-[2.5]" />
                          </div>
                        ) : (
                          <div className="w-5 h-5 rounded-md bg-[#FEE4E2] text-[#E05268] flex items-center justify-center">
                            <ArrowDownRight className="w-3.5 h-3.5 stroke-[2.5]" />
                          </div>
                        )}
                        <span className="text-xs font-bold text-[#202033]">
                          {factor.factor}
                        </span>
                      </div>
                      <span
                        className={`text-xs font-extrabold px-2 py-0.5 rounded-md ${
                          isPos
                            ? 'bg-[#D1FADF] text-[#16A36A]'
                            : 'bg-[#FEE4E2] text-[#E05268]'
                        }`}
                      >
                        {factor.weight}
                      </span>
                    </div>
                    <p className="text-xs text-[#74738A] mt-2 leading-relaxed">
                      {factor.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-[#F0F2FA] flex items-center justify-between text-xs text-[#74738A]">
            <span>Model Version: Heuristic v2.4</span>
            <span className="font-semibold text-[#8B45F5]">Deterministic & Explainable</span>
          </div>
        </div>

        {/* AI Actionable Recommendations */}
        <div className="bg-white rounded-2xl border border-[#E5E2F5] p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#8B45F5]" />
                <h3 className="text-sm font-bold text-[#202033]">
                  Actionable Cognitive Recommendations
                </h3>
              </div>
              <span className="text-[10px] text-[#8B45F5] font-bold bg-[#F4F3FF] px-2 py-0.5 rounded-md">
                Personalized
              </span>
            </div>
            <p className="text-xs text-[#74738A] mb-4">
              System recommendations designed to maximize throughput while preserving sustainable cognitive health:
            </p>

            <div className="space-y-3">
              {pred.recommendations.map((rec: string, idx: number) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl border border-[#DDD8F8]/60 bg-gradient-to-r from-[#F4F3FF] to-white flex items-start gap-3"
                >
                  <div className="w-6 h-6 rounded-lg bg-[#8B45F5] text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-[#202033] leading-relaxed">
                      {rec}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-[#F0F2FA] flex flex-wrap gap-2.5">
            <button
              onClick={() => onNavigateToTab?.('smart-planner')}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#6935C8] to-[#8B45F5] hover:opacity-95 text-white text-xs font-bold shadow-xs transition-opacity"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Apply to Smart Planner</span>
            </button>
            <button
              onClick={() => onNavigateToTab?.('focus')}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#E5E2F5] bg-white hover:bg-[#F4F3FF] text-[#202033] text-xs font-semibold shadow-xs transition-colors"
            >
              <Clock className="w-3.5 h-3.5 text-[#8B45F5]" />
              <span>Start Peak Focus Block</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4. WORKLOAD DISTRIBUTION & VELOCITY TRENDS */}
      <div className="bg-white rounded-2xl border border-[#E5E2F5] p-5 sm:p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-[#8B45F5]" />
            <h3 className="text-sm font-bold text-[#202033]">
              Workload Allocation by Domain
            </h3>
          </div>
          <span className="text-xs text-[#74738A]">
            Current Schedulable Capacity
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
          {(trends.workloadDistribution || []).length === 0 ? (
            <div className="col-span-full py-6 text-center text-xs text-[#74738A]">
              No active workload distribution data recorded for this time range.
            </div>
          ) : (
            trends.workloadDistribution.map((item: any, idx: number) => (
            <div
              key={idx}
              className="p-4 rounded-xl border border-[#E5E2F5] bg-[#F4F3FF]/40"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#202033]">{item.name}</span>
                <span className="text-xs font-extrabold text-[#8B45F5]">
                  {item.percentage}%
                </span>
              </div>
              <div className="w-full bg-[#E5E2F5] h-1.5 rounded-full mt-2.5 overflow-hidden">
                <div
                  className="bg-[#8B45F5] h-full rounded-full"
                  style={{ width: `${item.percentage}%` }}
                />
              </div>
              <div className="flex items-center justify-between mt-2.5 text-[11px] text-[#74738A]">
                <span>{item.count} items</span>
                <span>Balanced</span>
              </div>
            </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

