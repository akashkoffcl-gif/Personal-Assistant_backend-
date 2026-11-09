'use client';

import React from 'react';
import { Sparkles, Target, Zap, Clock, Wallet, BookOpen, AlertCircle } from 'lucide-react';

interface AIQuickSuggestionsProps {
  onSelectSuggestion: (text: string) => void;
  disabled?: boolean;
  className?: string;
}

const DEFAULT_SUGGESTIONS = [
  { text: 'Brief my day.', icon: Sparkles, color: 'text-[#8B45F5]' },
  { text: 'What should I focus on?', icon: Target, color: 'text-[#10B981]' },
  { text: 'My spending this month', icon: Wallet, color: 'text-[#F59E0B]' },
  { text: 'Start a 25-minute focus session', icon: Zap, color: 'text-[#3B82F6]' },
  { text: 'Which tasks are overdue?', icon: AlertCircle, color: 'text-[#EF4444]' },
  { text: 'How are my goals progressing?', icon: Clock, color: 'text-[#8B45F5]' },
  { text: 'Record a quick note', icon: BookOpen, color: 'text-[#6366F1]' },
];

export const AIQuickSuggestions: React.FC<AIQuickSuggestionsProps> = ({
  onSelectSuggestion,
  disabled = false,
  className = '',
}) => {
  return (
    <div
      className={`flex items-center gap-2 overflow-x-auto no-scrollbar py-1 max-w-full px-2 mask-linear-fade ${className}`}
      role="toolbar"
      aria-label="Quick voice & prompt suggestions"
    >
      {DEFAULT_SUGGESTIONS.map((s, idx) => {
        const Icon = s.icon;
        return (
          <button
            key={idx}
            disabled={disabled}
            onClick={() => onSelectSuggestion(s.text)}
            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/90 backdrop-blur-md border border-[#E5E2F5] text-xs font-semibold text-[#202033] shadow-xs hover:border-[#8B45F5] hover:bg-[#F4F3FF] hover:text-[#8B45F5] transition-all transform active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
          >
            <Icon className={`w-3.5 h-3.5 ${s.color}`} />
            <span>{s.text}</span>
          </button>
        );
      })}
    </div>
  );
};

