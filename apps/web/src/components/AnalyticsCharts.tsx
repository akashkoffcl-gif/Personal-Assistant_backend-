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
      <div className="bg-white rounded-xl p-8 text-center text-xs text-slate-400 border border-slate-200 flex flex-col items-center gap-2">
        <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <span>Computing analytics from persistent records...</span>
      </div>
    );
  }

  const completionTrends = data?.completionTrends || [];
  const routineAdherenceTrends = data?.routineAdherenceTrends || [];
  const categoryDistribution = data?.categoryDistribution || [];
  const workStatusBreakdown = data?.workStatusBreakdown || [];
  const wellnessTrends = data?.wellnessTrends || [];

  // Clean Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 text-white rounded-lg p-2.5 shadow-lg border border-slate-800 text-xs space-y-1">
          <p className="font-semibold text-slate-200 border-b border-slate-800 pb-1 mb-1">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={`item-${index}`} className="flex items-center justify-between gap-3">
              <span className="text-slate-300 flex items-center gap-1.5">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: entry.color || entry.fill }}
                />
                {entry.name}:
              </span>
              <span className="font-semibold font-mono text-white">{entry.value}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs">
      {/* Header and Range Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-3 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-900 tracking-tight">
              Performance Analytics
            </h3>
            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-slate-100 text-slate-600">
              {days}d Window
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Realtime metrics computed from daily summaries & completed tasks
          </p>
        </div>

        {/* Date Range Selection */}
        <div className="flex items-center p-0.5 rounded-lg bg-slate-100 border border-slate-200">
          {[7, 14, 30].map((d) => (
            <button
              key={d}
              onClick={() => onSelectDays(d)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                days === d
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {d} Days
            </button>
          ))}
        </div>
      </div>

      {/* Chart Navigation Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-slate-100 mb-5">
        {[
          { id: 'trends', label: 'Completion Rate', icon: TrendingUp },
          { id: 'routines', label: 'Habit Consistency', icon: Flame },
          { id: 'categories', label: 'Category Breakdown', icon: PieIcon },
          { id: 'work', label: 'Work Milestones', icon: BarChart3 },
          { id: 'wellness', label: 'Wellness Trends', icon: Activity },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeChart === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveChart(tab.id as any)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap border ${
                isActive
                  ? 'bg-slate-900 text-white border-slate-900 font-semibold'
                  : 'bg-white text-slate-600 hover:bg-slate-50 border-slate-200'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* CHART 1: COMPLETION TRENDS */}
      {activeChart === 'trends' && (
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={completionTrends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748B' }} />
              <YAxis tick={{ fontSize: 11, fill: '#64748B' }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
              <Area
                type="monotone"
                dataKey="rate"
                name="Completion Rate (%)"
                stroke="#16A34A"
                strokeWidth={2}
                fill="#DCFCE7"
              />
              <Area
                type="monotone"
                dataKey="completed"
                name="Tasks Completed"
                stroke="#2563EB"
                strokeWidth={2}
                fill="#DBEAFE"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* CHART 2: ROUTINE ADHERENCE */}
      {activeChart === 'routines' && (
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={routineAdherenceTrends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748B' }} />
              <YAxis unit="%" tick={{ fontSize: 11, fill: '#64748B' }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar
                dataKey="adherence"
                name="Routine Adherence (%)"
                fill="#2563EB"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* CHART 3: CATEGORY DISTRIBUTION */}
      {activeChart === 'categories' && (
        <div className="h-64 w-full flex items-center justify-center">
          {categoryDistribution.length === 0 ? (
            <div className="text-xs text-slate-400">No task category records available.</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={4}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {categoryDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      )}

      {/* CHART 4: WORK STATUS BREAKDOWN */}
      {activeChart === 'work' && (
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={workStatusBreakdown} layout="vertical" margin={{ top: 10, right: 30, left: 20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: '#64748B' }} />
              <YAxis dataKey="status" type="category" tick={{ fontSize: 11, fill: '#64748B' }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" name="Tasks in Status" radius={[0, 4, 4, 0]}>
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
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={wellnessTrends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748B' }} />
              <YAxis tick={{ fontSize: 11, fill: '#64748B' }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
              <Line
                type="monotone"
                dataKey="hydration"
                name="Water Intake (ml)"
                stroke="#0284C7"
                strokeWidth={2}
                dot={{ r: 3, fill: '#0284C7' }}
              />
              <Line
                type="monotone"
                dataKey="exercise"
                name="Exercise (mins)"
                stroke="#16A34A"
                strokeWidth={2}
                dot={{ r: 3, fill: '#16A34A' }}
              />
              <Line
                type="monotone"
                dataKey="sleep"
                name="Sleep (hrs)"
                stroke="#7C3AED"
                strokeWidth={2}
                dot={{ r: 3, fill: '#7C3AED' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
