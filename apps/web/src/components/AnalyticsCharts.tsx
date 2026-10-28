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
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 text-center text-sm text-assistant-coolGrey">
        Calculating analytics from persistent records...
      </div>
    );
  }

  const completionTrends = data?.completionTrends || [];
  const routineAdherenceTrends = data?.routineAdherenceTrends || [];
  const categoryDistribution = data?.categoryDistribution || [];
  const workStatusBreakdown = data?.workStatusBreakdown || [];
  const wellnessTrends = data?.wellnessTrends || [];

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h3 className="text-base font-bold text-assistant-navy">Interactive Performance Analytics</h3>
          <p className="text-xs text-assistant-coolGrey">Data-backed trends & completion distributions</p>
        </div>

        {/* Date Range Selection */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
          {[7, 14, 30].map((d) => (
            <button
              key={d}
              onClick={() => onSelectDays(d)}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                days === d
                  ? 'bg-white text-assistant-navy shadow-xs'
                  : 'text-assistant-coolGrey hover:text-assistant-navy'
              }`}
            >
              Last {d} Days
            </button>
          ))}
        </div>
      </div>

      {/* Chart Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-100 mb-6">
        {[
          { id: 'trends', label: '1. Completion Trends' },
          { id: 'routines', label: '2. Routine Adherence' },
          { id: 'categories', label: '3. Category Distribution' },
          { id: 'work', label: '4. Work Breakdown' },
          { id: 'wellness', label: '5. Wellness Trends' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveChart(tab.id as any)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
              activeChart === tab.id
                ? 'bg-assistant-paleSky text-assistant-navy border border-sky-200'
                : 'text-assistant-coolGrey hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Dynamic Chart Display */}
      <div className="h-72 w-full">
        {activeChart === 'trends' && (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={completionTrends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748B' }} />
              <YAxis tick={{ fontSize: 11, fill: '#64748B' }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#142B4A', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
              />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Line type="monotone" dataKey="total" name="Total Tasks" stroke="#64748B" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="completed" name="Completed" stroke="#16A34A" strokeWidth={2.5} />
            </LineChart>
          </ResponsiveContainer>
        )}

        {activeChart === 'routines' && (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={routineAdherenceTrends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="routineColor" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#38BDF8" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#38BDF8" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748B' }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#64748B' }} unit="%" />
              <Tooltip
                contentStyle={{ backgroundColor: '#142B4A', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
              />
              <Area type="monotone" dataKey="adherence" name="Adherence %" stroke="#38BDF8" fillOpacity={1} fill="url(#routineColor)" />
            </AreaChart>
          </ResponsiveContainer>
        )}

        {activeChart === 'categories' && (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={categoryDistribution}
                cx="50%"
                cy="50%"
                innerRadius={65}
                outerRadius={95}
                paddingAngle={4}
                dataKey="value"
                nameKey="name"
              >
                {categoryDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: '#142B4A', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
              />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
            </PieChart>
          </ResponsiveContainer>
        )}

        {activeChart === 'work' && (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={workStatusBreakdown} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="status" tick={{ fontSize: 11, fill: '#64748B' }} />
              <YAxis tick={{ fontSize: 11, fill: '#64748B' }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#142B4A', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
              />
              <Bar dataKey="count" name="Work Tasks" radius={[4, 4, 0, 0]}>
                {workStatusBreakdown.map((entry, index) => (
                  <Cell key={`bar-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}

        {activeChart === 'wellness' && (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={wellnessTrends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748B' }} />
              <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#64748B' }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: '#64748B' }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#142B4A', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
              />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Line yAxisId="left" type="monotone" dataKey="hydration" name="Hydration (ml)" stroke="#38BDF8" strokeWidth={2} />
              <Line yAxisId="right" type="monotone" dataKey="exercise" name="Exercise (min)" stroke="#16A34A" strokeWidth={2} />
              <Line yAxisId="right" type="monotone" dataKey="sleep" name="Sleep (hrs)" stroke="#818CF8" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

