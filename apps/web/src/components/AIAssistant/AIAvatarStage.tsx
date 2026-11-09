'use client';

import React from 'react';
import { AIAvatarModel } from './AIAvatarModel';
import { AIWaveform } from './AIWaveform';
import { AvatarState } from './types';

interface AIAvatarStageProps {
  state: AvatarState;
  audioVolume?: number;
  onClickAvatar?: () => void;
  className?: string;
}

export const AIAvatarStage: React.FC<AIAvatarStageProps> = ({
  state,
  audioVolume = 0,
  onClickAvatar,
  className = '',
}) => {
  return (
    <div
      className={`relative flex items-center justify-center gap-3 select-none ${className}`}
    >
      {/* Ambient backdrop glow behind stage */}
      <div
        className={`absolute -inset-4 rounded-full filter blur-xl transition-all duration-700 pointer-events-none -z-10 ${
          state === 'listening'
            ? 'bg-[#38BDF8]/20 scale-125'
            : state === 'thinking'
            ? 'bg-[#8B45F5]/25 scale-110'
            : state === 'speaking'
            ? 'bg-[#10B981]/25 scale-125'
            : state === 'executing'
            ? 'bg-[#2563EB]/20 scale-115'
            : state === 'success'
            ? 'bg-[#059669]/30 scale-130'
            : state === 'error'
            ? 'bg-[#E11D48]/25 scale-115'
            : 'bg-[#8B45F5]/10 scale-100'
        }`}
      />

      {/* Left Waveform Channel */}
      <AIWaveform state={state} audioVolume={audioVolume} side="left" className="hidden sm:flex" />

      {/* Center 3D Avatar Model */}
      <div className="relative group">
        <AIAvatarModel
          state={state}
          audioVolume={audioVolume}
          size={105}
          onClick={onClickAvatar}
        />
      </div>

      {/* Right Waveform Channel */}
      <AIWaveform state={state} audioVolume={audioVolume} side="right" className="hidden sm:flex" />
    </div>
  );
};

