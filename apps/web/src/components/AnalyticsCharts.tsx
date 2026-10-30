'use client';

import React, { useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { BarChart3, TrendingUp, PieChart as PieIcon, Activity, Flame } from 'lucide-react';

interface AnalyticsChartsProps {
  data?: {
    completionTrends: Array<{ date: string; total: number; completed: number; rate: number }>;
    routineAdherenceTrends: Array<{ date: string; adherence: number }>;
    categoryDistribution: Array<{ name: string; value: number; color: string }>;
    workStatusBreakdown: Array<{ status: string; count: number; fill: string }>;
    wellnessTrends: Array<{ date: string; hydration: number; exercise: number; sleep: number }>;
  };
  days: number;
  onSelectDays: (days: number) => void;
  loading?: boolean;
}

export function AnalyticsCharts({ data, days, onSelectDays, loading }: AnalyticsChartsProps) {
  const [activeChart, setActiveChart] = useState<'trends' | 'routines' | 'categories' | 'work' | 'wellness'>('trends');

  if (loading) {
    return (
      <div className="glass-panel rounded-2xl p-8 text-center text-sm text-slate-400 border border-white/80 flex flex-col items-center gap-2">
        <div className="w-6 h-6 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
        <span>Calculating performance analytics from persistent database records...</span>
      </div>
    );
  }

  const completionTrends = data?.completionTrends || [];
  const routineAdherenceTrends = data?.routineAdherenceTrends || [];
  const categoryDistribution = data?.categoryDistribution || [];
  const workStatusBreakdown = data?.workStatusBreakdown || [];
  const wellnessTrends = data?.wellnessTrends || [];

  // Custom Glass Tooltip
  const CustomGlassTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="glass-dark text-white rounded-xl p-3 border border-white/10 shadow-2xl text-xs space-y-1">
          <p className="font-bold text-sky-300 border-b border-white/10 pb-1 mb-1">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={`item-${index}`} className="flex items-center justify-between gap-3">
              <span className="text-slate-300 flex items-center gap-1.5">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: entry.color || entry.fill }}
                />
                {entry.name}:
              </span>
              <span className="font-bold font-mono text-white">{entry.value}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="glass-panel rounded-2xl p-5 sm:p-6 border border-white/80 shadow-glass">
      {/* Header and Range Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">
              Interactive Performance Analytics
            </h3>
            <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-indigo-500/10 text-indigo-700 border border-indigo-300/50">
              {days}d Window
            </span>
          </div>
          <p className="text-xs text-assistant-coolGrey font-medium">
            Realtime metrics computed from daily summaries & event telemetry
          </p>
        </div>

        {/* Date Range Selection Glass Pills */}
        <div className="flex items-center gap-1 bg-white/60 p-1 rounded-xl border border-white/80 shadow-xs">
          {[7, 14, 30].map((d) => (
            <button
              key={d}
              onClick={() => onSelectDays(d)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                days === d
                  ? 'bg-gradient-to-r from-sky-400 to-sky-500 text-slate-950 shadow-glass-glow'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {d} Days
            </button>
          ))}
        </div>
      </div>

      {/* Chart Navigation Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-slate-200/60 mb-6">
        {[
          { id: 'trends', label: '1. Completion Trends', icon: TrendingUp },
          { id: 'routines', label: '2. Habit Consistency', icon: Flame },
          { id: 'categories', label: '3. Category Breakdown', icon: PieIcon },
          { id: 'work', label: '4. Work Milestones', icon: BarChart3 },
          { id: 'wellness', label: '5. Wellness History', icon: Activity },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeChart === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveChart(tab.id as any)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap border ${
                isActive
                  ? 'bg-assistant-navy text-white border-transparent shadow-xs'
                  : 'glass-card text-slate-600 hover:text-slate-900 border-white/80'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-sky-300' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* CHART 1: COMPLETION TRENDS */}
      {activeChart === 'trends' && (
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={completionTrends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="rateGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="totalGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#38BDF8" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#38BDF8" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748B' }} />
              <YAxis tick={{ fontSize: 11, fill: '#64748B' }} />
              <Tooltip content={<CustomGlassTooltip />} />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
              <Area
                type="monotone"
                dataKey="rate"
                name="Completion Rate (%)"
                stroke="#10B981"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#rateGradient)"
              />
              <Area
                type="monotone"
                dataKey="completed"
                name="Tasks Completed"
                stroke="#38BDF8"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#totalGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* CHART 2: ROUTINE ADHERENCE */}
      {activeChart === 'routines' && (
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={routineAdherenceTrends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="adherenceBar" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#38BDF8" />
                  <stop offset="100%" stopColor="#0284C7" />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748B' }} />
              <YAxis unit="%" tick={{ fontSize: 11, fill: '#64748B' }} />
              <Tooltip content={<CustomGlassTooltip />} />
              <Bar
                dataKey="adherence"
                name="Routine Adherence (%)"
                fill="url(#adherenceBar)"
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* CHART 3: CATEGORY DISTRIBUTION */}
      {activeChart === 'categories' && (
        <div className="h-72 w-full flex items-center justify-center">
          {categoryDistribution.length === 0 ? (
            <div className="text-sm text-slate-400">No task category records available.</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={95}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {categoryDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomGlassTooltip />} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      )}

      {/* CHART 4: WORK STATUS BREAKDOWN */}
      {activeChart === 'work' && (
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={workStatusBreakdown} layout="vertical" margin={{ top: 10, right: 30, left: 20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: '#64748B' }} />
              <YAxis dataKey="status" type="category" tick={{ fontSize: 11, fill: '#64748B' }} />
              <Tooltip content={<CustomGlassTooltip />} />
              <Bar dataKey="count" name="Tasks in Status" radius={[0, 6, 6, 0]}>
                {workStatusBreakdown.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* CHART 5: WELLNESS TRENDS */}
      {activeChart === 'wellness' && (
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={wellnessTrends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748B' }} />
              <YAxis tick={{ fontSize: 11, fill: '#64748B' }} />
              <Tooltip content={<CustomGlassTooltip />} />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
              <Line
                type="monotone"
                dataKey="hydration"
                name="Water Intake (ml)"
                stroke="#38BDF8"
                strokeWidth={2.5}
                dot={{ r: 4, fill: '#38BDF8' }}
              />
              <Line
                type="monotone"
                dataKey="exercise"
                name="Exercise (mins)"
                stroke="#10B981"
                strokeWidth={2.5}
                dot={{ r: 4, fill: '#10B981' }}
              />
              <Line
                type="monotone"
                dataKey="sleep"
                name="Sleep (hrs)"
                stroke="#8B5CF6"
                strokeWidth={2.5}
                dot={{ r: 4, fill: '#8B5CF6' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
