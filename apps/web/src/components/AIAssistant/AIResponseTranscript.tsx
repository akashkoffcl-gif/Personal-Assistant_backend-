'use client';

import React from 'react';
import { Volume2, VolumeX, RotateCcw, X, Copy, Check } from 'lucide-react';
import { AvatarState } from './types';

interface AIResponseTranscriptProps {
  state: AvatarState;
  transcriptText: string;
  assistantSpokenText: string;
  isSpeaking: boolean;
  onStopSpeaking: () => void;
  onRepeatSpeech: () => void;
  onDismiss: () => void;
  className?: string;
}

export const AIResponseTranscript: React.FC<AIResponseTranscriptProps> = ({
  state,
  transcriptText,
  assistantSpokenText,
  isSpeaking,
  onStopSpeaking,
  onRepeatSpeech,
  onDismiss,
  className = '',
}) => {
  const [copied, setCopied] = React.useState(false);

  // If there's neither user transcript nor assistant reply, hide
  if (!transcriptText && !assistantSpokenText) return null;

  const handleCopy = () => {
    const textToCopy = assistantSpokenText || transcriptText;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={`relative max-w-xl w-full bg-white/95 backdrop-blur-xl border border-[#DDD8F8] rounded-2xl p-4 shadow-[0_12px_36px_rgba(139,69,245,0.12)] transition-all animate-in fade-in slide-in-from-bottom-2 ${className}`}
      role="region"
      aria-live="polite"
    >
      {/* Top Header */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#F0F2FA] text-[11px] font-bold text-[#74738A]">
        <div className="flex items-center gap-1.5">
          <span
            className={`w-2 h-2 rounded-full ${
              state === 'listening'
                ? 'bg-[#38BDF8] animate-ping'
                : isSpeaking
                ? 'bg-[#10B981] animate-pulse'
                : 'bg-[#8B45F5]'
            }`}
          />
          <span className="uppercase tracking-wider">
            {state === 'listening'
              ? 'Listening...'
              : isSpeaking
              ? 'AI Vocalizing'
              : 'AI Assistant Response'}
          </span>
        </div>

        <div className="flex items-center gap-1">
          {assistantSpokenText && (
            <>
              <button
                onClick={handleCopy}
                className="p-1 rounded-md hover:bg-[#F4F3FF] text-[#74738A] hover:text-[#8B45F5] transition-colors"
                title="Copy response"
                aria-label="Copy response"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-[#10B981]" /> : <Copy className="w-3.5 h-3.5" />}
              </button>

              <button
                onClick={onRepeatSpeech}
                className="p-1 rounded-md hover:bg-[#F4F3FF] text-[#74738A] hover:text-[#8B45F5] transition-colors"
                title="Repeat voice output"
                aria-label="Repeat voice output"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </>
          )}

          {isSpeaking && (
            <button
              onClick={onStopSpeaking}
              className="px-2 py-0.5 rounded-full bg-[#E05268]/10 text-[#E05268] hover:bg-[#E05268]/20 text-[10px] font-black flex items-center gap-1 transition-colors"
              title="Stop speaking"
              aria-label="Stop speaking"
            >
              <VolumeX className="w-3 h-3" />
              <span>Stop</span>
            </button>
          )}

          <button
            onClick={onDismiss}
            className="p-1 rounded-md hover:bg-slate-100 text-[#74738A] hover:text-[#202033] transition-colors ml-1"
            title="Dismiss transcript"
            aria-label="Dismiss transcript"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Transcript Content */}
      <div className="text-xs sm:text-sm text-[#202033] leading-relaxed max-h-40 overflow-y-auto pr-1">
        {state === 'listening' && transcriptText ? (
          <p className="italic text-[#6935C8] font-medium">&ldquo;{transcriptText}&rdquo;</p>
        ) : assistantSpokenText ? (
          <p className="font-normal text-[#202033] whitespace-pre-wrap">{assistantSpokenText}</p>
        ) : (
          <p className="italic text-[#74738A]">Listening for your voice...</p>
        )}
      </div>
    </div>
  );
};

