'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { format, isToday, isYesterday } from 'date-fns';
import {
  History,
  CheckCircle2,
  Timer,
  Repeat,
  Wallet,
  BookOpen,
  Filter,
  RefreshCw,
  Search,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

const categoryConfig: Record<
  string,
  { label: string; icon: React.ComponentType<{ className?: string }>; color: string }
> = {
  TASK: { label: 'Task Execution', icon: CheckCircle2, color: '#10B981' },
  FOCUS: { label: 'Focus Studio', icon: Timer, color: '#8B45F5' },
  ROUTINE: { label: 'Habits & Routines', icon: Repeat, color: '#F59E0B' },
  FINANCE: { label: 'Personal Finance', icon: Wallet, color: '#06B6D4' },
  KNOWLEDGE: { label: 'Knowledge Base', icon: BookOpen, color: '#EC4899' },
};

export const ActivityTimelineWorkspace: React.FC = () => {
  const [selectedFilter, setSelectedFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: timelineData, isLoading, refetch, isFetching } = useQuery<any[]>({
    queryKey: ['activity-timeline'],
    queryFn: () => api.getUnifiedTimeline(50),
  });
  const allEvents = timelineData || [];

  const filteredEvents = allEvents.filter((item: any) => {
    if (selectedFilter !== 'ALL' && item.category !== selectedFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        item.title.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.badgeText.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const formatTimestamp = (ts: string) => {
    try {
      const d = new Date(ts);
      if (isToday(d)) return `Today at ${format(d, 'h:mm a')}`;
      if (isYesterday(d)) return `Yesterday at ${format(d, 'h:mm a')}`;
      return format(d, 'MMM d, yyyy • h:mm a');
    } catch (e) {
      return ts;
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. TOP HEADER & CONTROLS */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#E5E2F5] shadow-[0_4px_20px_rgba(139,69,245,0.04)] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#8B45F5] bg-[#F4F3FF] px-2.5 py-0.5 rounded-full border border-[#E5E2F5]">
              Phase 35 • Unified Audit Feed
            </span>
            <span className="text-xs text-[#74738A] font-semibold">Chronological System Stream</span>
          </div>
          <h2 className="text-lg sm:text-xl font-black text-[#202033] tracking-tight">
            Personal Activity Timeline
          </h2>
          <p className="text-xs text-[#74738A] mt-0.5">
            Comprehensive multi-domain chronological event log documenting every action, focus block, and milestone.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#74738A]" />
            <input
              type="text"
              placeholder="Search audit events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs font-medium border border-[#E5E2F5] rounded-xl bg-white text-[#202033]"
            />
          </div>

          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-2 border border-[#E5E2F5] rounded-xl bg-white text-[#74738A] hover:text-[#8B45F5] hover:bg-[#F4F3FF] transition-colors"
            title="Refresh stream"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin text-[#8B45F5]' : ''}`} />
          </button>
        </div>
      </div>

      {/* 2. CATEGORY FILTER PILLS */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        {['ALL', 'TASK', 'FOCUS', 'ROUTINE', 'FINANCE', 'KNOWLEDGE'].map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedFilter(cat)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              selectedFilter === cat
                ? 'bg-[#8B45F5] text-white shadow-2xs'
                : 'bg-white text-[#74738A] border border-[#E5E2F5] hover:bg-[#F4F3FF] hover:text-[#202033]'
            }`}
          >
            {cat === 'ALL' ? 'All Activities' : categoryConfig[cat]?.label || cat}
          </button>
        ))}
      </div>

      {/* 3. TIMELINE FEED */}
      <div className="bg-white rounded-2xl border border-[#E5E2F5] p-5 sm:p-6 shadow-xs">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-[#74738A]">Loading unified activity log...</div>
        ) : filteredEvents.length === 0 ? (
          <div className="p-12 text-center text-xs text-[#74738A]">
            No recent activities recorded for the selected filter.
          </div>
        ) : (
          <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-[#E5E2F5]">
            {filteredEvents.map((event: any) => {
              const config = categoryConfig[event.category] || {
                label: 'Activity',
                icon: History,
                color: '#8B45F5',
              };
              const Icon = config.icon;

              return (
                <div key={event.id} className="relative group">
                  {/* Timeline Node Icon */}
                  <div
                    className="absolute -left-[27px] top-1 w-6 h-6 rounded-full flex items-center justify-center text-white shadow-2xs ring-4 ring-white"
                    style={{ backgroundColor: event.color || config.color }}
                  >
                    <Icon className="w-3 h-3" />
                  </div>

                  {/* Content Box */}
                  <div className="p-3.5 rounded-xl bg-[#F4F3FF]/40 border border-[#E5E2F5] hover:border-[#8B45F5]/40 transition-colors space-y-1">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span
                          className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full text-white"
                          style={{ backgroundColor: event.color || config.color }}
                        >
                          {event.badgeText || event.category}
                        </span>
                        <h4 className="text-xs font-bold text-[#202033] tracking-tight">{event.title}</h4>
                      </div>

                      <span className="text-[10px] font-medium font-mono text-[#74738A]">
                        {formatTimestamp(event.timestamp)}
                      </span>
                    </div>

                    <p className="text-xs text-[#74738A] leading-relaxed pt-0.5">{event.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

