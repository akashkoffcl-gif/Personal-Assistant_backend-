'use client';

import React from 'react';
import { Sparkles, Mic, Brain, Volume2, CheckCircle2, AlertCircle } from 'lucide-react';

export type AIAvatarState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'executing' | 'error';

interface AIAvatarProps {
  state: AIAvatarState;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  onClick?: () => void;
}

export const AIAvatar: React.FC<AIAvatarProps> = ({
  state,
  size = 'md',
  className = '',
  onClick,
}) => {
  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24',
    lg: 'w-32 h-32',
  }[size];

  const iconSizes = {
    sm: 'w-6 h-6',
    md: 'w-9 h-9',
    lg: 'w-12 h-12',
  }[size];

  return (
    <div
      onClick={onClick}
      className={`relative flex items-center justify-center select-none ${sizeClasses} ${className} ${
        onClick ? 'cursor-pointer group' : ''
      }`}
      aria-label={`AI Operating Assistant - State: ${state}`}
    >
      {/* Outer ambient glow rings */}
      <div
        className={`absolute inset-0 rounded-full transition-all duration-700 ${
          state === 'idle'
            ? 'bg-[#8B45F5]/10 animate-ping opacity-30 duration-3000'
            : state === 'listening'
            ? 'bg-[#8B45F5]/25 scale-125 animate-pulse'
            : state === 'thinking'
            ? 'bg-[#6935C8]/30 scale-110 animate-spin duration-3000'
            : state === 'speaking'
            ? 'bg-[#10B981]/25 scale-120 animate-pulse duration-700'
            : state === 'executing'
            ? 'bg-[#3B82F6]/25 scale-115 animate-pulse'
            : 'bg-[#E05268]/20 scale-110'
        }`}
      />

      {/* Secondary Soft Radial Gradient Aura */}
      <div
        className={`absolute inset-1.5 rounded-full transition-transform duration-500 blur-sm ${
          state === 'listening'
            ? 'bg-gradient-to-tr from-[#8B45F5] to-[#C4B5FD] opacity-60 scale-105'
            : state === 'thinking'
            ? 'bg-gradient-to-r from-[#6935C8] via-[#8B45F5] to-[#A78BFA] opacity-70 animate-spin duration-5000'
            : state === 'speaking'
            ? 'bg-gradient-to-tr from-[#10B981] via-[#8B45F5] to-[#A78BFA] opacity-70 animate-pulse'
            : state === 'error'
            ? 'bg-gradient-to-tr from-[#E05268] to-[#FECDD6] opacity-60'
            : 'bg-gradient-to-tr from-[#8B45F5]/40 to-[#DDD8F8]/50 opacity-40'
        }`}
      />

      {/* Core Sphere / Lens */}
      <div
        className={`relative z-10 w-full h-full rounded-full flex flex-col items-center justify-center border shadow-xl transition-all duration-500 ${
          state === 'listening'
            ? 'bg-gradient-to-br from-[#8B45F5] to-[#6935C8] border-white/60 text-white shadow-[#8B45F5]/40'
            : state === 'thinking'
            ? 'bg-gradient-to-br from-[#6935C8] via-[#7C3AED] to-[#5B21B6] border-[#DDD8F8] text-white shadow-[#6935C8]/40'
            : state === 'speaking'
            ? 'bg-gradient-to-br from-[#7C3AED] to-[#10B981] border-white/80 text-white shadow-[#10B981]/30'
            : state === 'executing'
            ? 'bg-gradient-to-br from-[#3B82F6] to-[#8B45F5] border-white text-white'
            : state === 'error'
            ? 'bg-gradient-to-br from-[#E05268] to-[#BE185D] border-white text-white'
            : 'bg-gradient-to-br from-white via-[#F4F3FF] to-[#EAE9FF] border-[#E5E2F5] text-[#8B45F5] shadow-[0_8px_30px_rgba(139,69,245,0.12)]'
        }`}
      >
        {/* Dynamic Center Graphic */}
        {state === 'idle' && (
          <div className="flex flex-col items-center justify-center">
            <Sparkles className={`${iconSizes} transition-transform duration-300 group-hover:scale-110`} />
            <span className="text-[9px] font-black uppercase tracking-widest opacity-80 mt-1">Ready</span>
          </div>
        )}

        {state === 'listening' && (
          <div className="flex flex-col items-center justify-center">
            <Mic className={`${iconSizes} animate-bounce`} />
            {/* Live Audio Waves */}
            <div className="flex items-center gap-0.5 mt-1.5 h-3">
              <span className="w-1 bg-white rounded-full animate-[pulse_0.4s_infinite_alternate] h-3" />
              <span className="w-1 bg-white rounded-full animate-[pulse_0.6s_infinite_alternate] h-2" />
              <span className="w-1 bg-white rounded-full animate-[pulse_0.3s_infinite_alternate] h-3.5" />
              <span className="w-1 bg-white rounded-full animate-[pulse_0.5s_infinite_alternate] h-1.5" />
            </div>
          </div>
        )}

        {state === 'thinking' && (
          <div className="flex flex-col items-center justify-center">
            <Brain className={`${iconSizes} animate-pulse`} />
            <span className="text-[9px] font-black uppercase tracking-wider text-white/90 mt-1 animate-pulse">Thinking</span>
          </div>
        )}

        {state === 'speaking' && (
          <div className="flex flex-col items-center justify-center">
            <Volume2 className={`${iconSizes} animate-pulse`} />
            <div className="flex items-center gap-0.5 mt-1.5 h-3">
              <span className="w-1 bg-white rounded-full animate-[pulse_0.3s_infinite_alternate] h-2" />
              <span className="w-1 bg-white rounded-full animate-[pulse_0.5s_infinite_alternate] h-3.5" />
              <span className="w-1 bg-white rounded-full animate-[pulse_0.4s_infinite_alternate] h-2.5" />
              <span className="w-1 bg-white rounded-full animate-[pulse_0.6s_infinite_alternate] h-3" />
            </div>
          </div>
        )}

        {state === 'executing' && (
          <div className="flex flex-col items-center justify-center">
            <CheckCircle2 className={`${iconSizes} animate-spin`} />
            <span className="text-[9px] font-black uppercase tracking-wider text-white/90 mt-1">Applying</span>
          </div>
        )}

        {state === 'error' && (
          <div className="flex flex-col items-center justify-center">
            <AlertCircle className={`${iconSizes}`} />
            <span className="text-[9px] font-black uppercase tracking-wider text-white/90 mt-1">Offline</span>
          </div>
        )}
      </div>
    </div>
  );
};

