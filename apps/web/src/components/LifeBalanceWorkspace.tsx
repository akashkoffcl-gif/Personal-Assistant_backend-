'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
  Scale,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Briefcase,
  Heart,
  Timer,
  Wallet,
  Moon,
  Repeat,
  BookOpen,
  Coffee,
  Zap,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  briefcase: Briefcase,
  heart: Heart,
  timer: Timer,
  wallet: Wallet,
  moon: Moon,
  repeat: Repeat,
  'book-open': BookOpen,
  coffee: Coffee,
};

export const LifeBalanceWorkspace: React.FC = () => {
  const { data: balanceData, isLoading: balanceLoading } = useQuery({
    queryKey: ['life-balance'],
    queryFn: () => api.getLifeBalance(),
  });
  const balance = balanceData || {
    harmonyIndex: 78,
    evaluatedDate: new Date().toISOString().substring(0, 10),
    dimensions: [],
    primaryRecommendation: 'Maintain focus pacing and prioritize sleep recovery.',
  };

  const { data: predictiveData, isLoading: predictiveLoading } = useQuery({
    queryKey: ['predictive-analytics'],
    queryFn: () => api.getPredictiveAnalytics(),
  });
  const predictive = predictiveData || {
    predictedDailyCompletionRate: 85,
    confidenceScore: 88,
    peakPerformanceHours: '9:00 AM - 11:30 AM',
    secondaryPeakHours: '3:00 PM - 4:30 PM',
    burnoutRiskScore: 22,
    burnoutLevel: 'OPTIMAL',
    avgDailyFocusMinutes: 110,
    overdueTaskCount: 0,
    explainableFactors: [],
    recommendations: [],
  };

  return (
    <div className="space-y-6">
      {/* 1. TOP HEADER & CONTROLS */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#E5E2F5] shadow-[0_4px_20px_rgba(139,69,245,0.04)] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#8B45F5] bg-[#F4F3FF] px-2.5 py-0.5 rounded-full border border-[#E5E2F5]">
              Phase 33 & 34 • Holistic Operating Intelligence
            </span>
            <span className="text-xs text-[#74738A] font-semibold">8 Life Dimensions & Predictive Modeling</span>
          </div>
          <h2 className="text-lg sm:text-xl font-black text-[#202033] tracking-tight">
            Life Balance & Predictive Productivity
          </h2>
          <p className="text-xs text-[#74738A] mt-0.5">
            Holistic equilibrium across work, health, finances, routines, and rest with explainable AI forecasting.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3.5 py-1.5 rounded-xl bg-[#F4F3FF] border border-[#E5E2F5] flex items-center gap-2 text-xs">
            <span className="text-[#74738A] font-medium">Equilibrium Index:</span>
            <span className="font-black text-sm text-[#8B45F5]">{balance.harmonyIndex}/100</span>
          </div>
        </div>
      </div>

      {/* 2. PREDICTIVE PRODUCTIVITY INTELLIGENCE HERO (PHASE 33) */}
      <div className="bg-gradient-to-r from-white via-white to-[#F4F3FF] rounded-2xl p-5 border border-[#E5E2F5] shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-[#E5E2F5]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#6935C8] to-[#8B45F5] text-white flex items-center justify-center shadow-2xs">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#202033] uppercase tracking-wider">
                Predictive Productivity Forecasting
              </h3>
              <p className="text-[11px] text-[#74738A]">
                Machine-derived performance trajectory based on 14-day velocity and biological curves
              </p>
            </div>
          </div>

          <span className="text-xs font-bold text-[#8B45F5] bg-[#F4F3FF] px-3 py-1 rounded-full border border-[#E5E2F5]">
            Forecast Confidence: {predictive.confidenceScore}%
          </span>
        </div>

        {/* 4 Forecast Metric Badges */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white p-3.5 rounded-xl border border-[#E5E2F5] shadow-2xs">
            <span className="text-[10px] font-bold text-[#74738A] uppercase tracking-wider block">
              Forecasted Completion Rate
            </span>
            <span className="text-xl font-black text-[#10B981] mt-0.5 block">
              {predictive.predictedDailyCompletionRate}%
            </span>
            <span className="text-[10px] text-[#74738A]">Weighted 14-day trajectory</span>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-[#E5E2F5] shadow-2xs">
            <span className="text-[10px] font-bold text-[#74738A] uppercase tracking-wider block">
              Cognitive Peak Window
            </span>
            <span className="text-sm font-black text-[#8B45F5] mt-1 block">
              {predictive.peakPerformanceHours}
            </span>
            <span className="text-[10px] text-[#74738A]">Secondary: {predictive.secondaryPeakHours}</span>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-[#E5E2F5] shadow-2xs">
            <span className="text-[10px] font-bold text-[#74738A] uppercase tracking-wider block">
              Burnout Risk Index
            </span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xl font-black text-[#202033]">{predictive.burnoutRiskScore}/100</span>
              <span
                className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                  predictive.burnoutLevel === 'HIGH'
                    ? 'bg-[#FFEAEF] text-[#E05268]'
                    : predictive.burnoutLevel === 'MODERATE'
                    ? 'bg-[#FEF3C7] text-[#D97706]'
                    : 'bg-[#EAFBF1] text-[#10B981]'
                }`}
              >
                {predictive.burnoutLevel}
              </span>
            </div>
            <span className="text-[10px] text-[#74738A]">Sustainable workload indicator</span>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-[#E5E2F5] shadow-2xs">
            <span className="text-[10px] font-bold text-[#74738A] uppercase tracking-wider block">
              Daily Focus Target
            </span>
            <span className="text-xl font-black text-[#202033] mt-0.5 block">
              {predictive.avgDailyFocusMinutes}m
            </span>
            <span className="text-[10px] text-[#74738A]">Pacing vs 120m ideal</span>
          </div>
        </div>

        {/* Explainable Predictive Factors */}
        {predictive.explainableFactors && predictive.explainableFactors.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-[#E5E2F5]">
            <span className="text-[11px] font-extrabold uppercase text-[#74738A] tracking-wider block">
              Explainable Predictive Factors
            </span>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
              {predictive.explainableFactors.map((ef: any, idx: number) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-xl bg-white border border-[#E5E2F5] text-xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#202033]">{ef.factor}</span>
                    <span
                      className={`font-mono text-[10px] font-extrabold px-1.5 py-0.2 rounded ${
                        ef.impact === 'POSITIVE'
                          ? 'bg-[#EAFBF1] text-[#10B981]'
                          : ef.impact === 'NEGATIVE'
                          ? 'bg-[#FFEAEF] text-[#E05268]'
                          : 'bg-[#F4F3FF] text-[#6935C8]'
                      }`}
                    >
                      {ef.weight}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#74738A] leading-snug">{ef.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 3. 8 LIFE DIMENSIONS GRID (PHASE 34) */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Scale className="w-4 h-4 text-[#8B45F5]" />
            <h3 className="text-sm font-bold text-[#202033] uppercase tracking-wider">
              8 Life Dimensions Wheel
            </h3>
          </div>
          <span className="text-xs font-semibold text-[#74738A]">Target Benchmark: ≥ 75% per dimension</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {balance.dimensions.map((dim: any) => {
            const Icon = iconMap[dim.icon] || Scale;
            const isOptimal = dim.score >= dim.target;

            return (
              <div
                key={dim.id}
                className="bg-white rounded-2xl border border-[#E5E2F5] p-4 shadow-xs hover:shadow-md transition-all flex flex-col justify-between gap-3 relative overflow-hidden"
              >
                <div
                  className="absolute top-0 left-0 right-0 h-1"
                  style={{ backgroundColor: dim.color || '#8B45F5' }}
                />

                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `${dim.color}15`, color: dim.color }}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-[#202033] tracking-tight">{dim.name}</h4>
                      <span className="text-[10px] text-[#74738A]">Target: {dim.target}%</span>
                    </div>
                  </div>

                  <span
                    className={`text-sm font-black font-mono ${
                      isOptimal ? 'text-[#10B981]' : 'text-[#8B45F5]'
                    }`}
                  >
                    {dim.score}%
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="w-full bg-[#E5E2F5] h-2 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(100, dim.score)}%`,
                        backgroundColor: dim.color || '#8B45F5',
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-[#74738A]">
                    <span>{isOptimal ? 'Equilibrium Met' : 'Needs Reinforcement'}</span>
                    <span>{dim.score}/100</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. AI STRATEGIC INTERVENTION BANNER */}
      <div className="p-4 rounded-2xl bg-[#F4F3FF] border border-[#E5E2F5] flex items-start gap-3.5 shadow-xs">
        <Sparkles className="w-5 h-5 text-[#8B45F5] shrink-0 mt-0.5" />
        <div className="space-y-1 text-xs">
          <h4 className="font-bold text-[#202033] uppercase tracking-wider">
            Holistic Life Balance Recommendation
          </h4>
          <p className="text-[#74738A] leading-relaxed">{balance.primaryRecommendation}</p>
        </div>
      </div>
    </div>
  );
};

