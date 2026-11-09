'use client';

import React from 'react';
import { AvatarState } from './types';

interface AIWaveformProps {
  state: AvatarState;
  audioVolume?: number; // 0 to 1
  side: 'left' | 'right';
  className?: string;
}

export const AIWaveform: React.FC<AIWaveformProps> = ({
  state,
  audioVolume = 0,
  side,
  className = '',
}) => {
  const isAudioActive = state === 'listening' || state === 'speaking';
  const barCount = 5;

  // Generate bar heights based on state and audio volume
  const getBarHeight = (index: number) => {
    if (!isAudioActive) return 6; // Minimal calm height

    const baseHeight = state === 'speaking' ? 24 : 16;
    const dynamicFactor = audioVolume > 0 ? audioVolume * 1.8 : 0.6;
    const phaseOffset = side === 'left' ? index : barCount - 1 - index;
    const wave = Math.sin((Date.now() / 150) + phaseOffset * 0.9) * 0.5 + 0.5;

    return Math.max(6, Math.min(32, Math.round(baseHeight * wave * dynamicFactor)));
  };

  const [heights, setHeights] = React.useState<number[]>([6, 8, 12, 8, 6]);

  React.useEffect(() => {
    if (!isAudioActive) {
      setHeights([6, 6, 8, 6, 6]);
      return;
    }

    const interval = setInterval(() => {
      setHeights(Array.from({ length: barCount }, (_, i) => getBarHeight(i)));
    }, 70);

    return () => clearInterval(interval);
  }, [isAudioActive, state, audioVolume, side]);

  return (
    <div
      className={`flex items-center gap-1 select-none pointer-events-none transition-opacity duration-300 ${
        isAudioActive ? 'opacity-100' : 'opacity-35'
      } ${className}`}
      aria-hidden="true"
    >
      {heights.map((h, i) => (
        <span
          key={i}
          className={`w-1 rounded-full transition-all duration-100 ${
            state === 'speaking'
              ? 'bg-gradient-to-t from-[#10B981] to-[#34D399]'
              : state === 'listening'
              ? 'bg-gradient-to-t from-[#8B45F5] to-[#38BDF8]'
              : state === 'thinking'
              ? 'bg-gradient-to-t from-[#6935C8] to-[#C084FC]'
              : 'bg-[#DDD8F8]'
          }`}
          style={{ height: `${h}px` }}
        />
      ))}
    </div>
  );
};

