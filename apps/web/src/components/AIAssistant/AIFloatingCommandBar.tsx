'use client';

import React, { useRef, useState } from 'react';
import {
  Mic,
  MicOff,
  Send,
  Square,
  MessageSquare,
  Settings,
  Sparkles,
  Loader2,
  VolumeX,
} from 'lucide-react';
import { AvatarState } from './types';

interface AIFloatingCommandBarProps {
  state: AvatarState;
  inputText: string;
  onChangeInput: (text: string) => void;
  onSubmit: () => void;
  isListening: boolean;
  onToggleListening: () => void;
  isSpeaking: boolean;
  onStopSpeaking: () => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onOpenSettings: () => void;
  assistantName?: string;
  isLoading?: boolean;
  className?: string;
}

export const AIFloatingCommandBar: React.FC<AIFloatingCommandBarProps> = ({
  state,
  inputText,
  onChangeInput,
  onSubmit,
  isListening,
  onToggleListening,
  isSpeaking,
  onStopSpeaking,
  isExpanded,
  onToggleExpand,
  onOpenSettings,
  assistantName = 'Nova',
  isLoading = false,
  className = '',
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <div
      className={`flex items-center gap-2 p-1.5 sm:p-2 bg-white/95 backdrop-blur-2xl border border-[#DDD8F8] rounded-full shadow-[0_12px_40px_rgba(139,69,245,0.18)] max-w-2xl w-full transition-all ${className}`}
      role="search"
      aria-label="AI Voice and Command Input Bar"
    >
      {/* Microphone Toggle Button */}
      <button
        onClick={onToggleListening}
        className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center shrink-0 transition-all transform active:scale-90 ${
          isListening
            ? 'bg-gradient-to-tr from-[#EF4444] to-[#F87171] text-white shadow-[0_0_15px_rgba(239,68,68,0.5)] animate-pulse'
            : 'bg-gradient-to-tr from-[#6935C8] to-[#8B45F5] hover:from-[#5A2BB5] hover:to-[#7839D6] text-white shadow-sm'
        }`}
        title={isListening ? 'Stop Listening (Recording)' : 'Click to Speak (Speech Recognition)'}
        aria-label={isListening ? 'Stop Listening' : 'Start Voice Input'}
      >
        {isListening ? (
          <MicOff className="w-4 h-4 sm:w-5 sm:h-5" />
        ) : (
          <Mic className="w-4 h-4 sm:w-5 sm:h-5" />
        )}
      </button>

      {/* Text Command Input */}
      <div className="flex-1 min-w-0 relative">
        <input
          ref={inputRef}
          type="text"
          value={inputText}
          onChange={(e) => onChangeInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            isListening
              ? `Listening to your voice... (Say "${assistantName}")`
              : state === 'thinking'
              ? 'Analyzing workspace records...'
              : `Ask ${assistantName}, say "brief my day", or speak...`
          }
          disabled={isLoading || isListening}
          className="w-full bg-transparent px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm text-[#202033] placeholder-[#74738A] focus:outline-hidden font-medium disabled:opacity-60"
        />
      </div>

      {/* Action Controls Group */}
      <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 pr-1">
        {/* Stop / Interrupt Speech Button (active when speaking) */}
        {isSpeaking && (
          <button
            onClick={onStopSpeaking}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#E05268]/10 hover:bg-[#E05268]/20 text-[#E05268] text-xs font-bold transition-colors"
            title="Interrupt AI Speech"
            aria-label="Stop speaking"
          >
            <VolumeX className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Interrupt</span>
          </button>
        )}

        {/* Send Button (if text entered) */}
        {inputText.trim().length > 0 && (
          <button
            onClick={onSubmit}
            disabled={isLoading}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#8B45F5] hover:bg-[#7839D6] text-white flex items-center justify-center transition-all transform active:scale-95 disabled:opacity-50"
            title="Send query"
            aria-label="Send message"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            )}
          </button>
        )}

        {/* Expand / Minimize History Drawer Button */}
        <button
          onClick={onToggleExpand}
          className={`p-2 rounded-full border transition-all ${
            isExpanded
              ? 'bg-[#8B45F5] text-white border-[#8B45F5] shadow-xs'
              : 'bg-[#F4F3FF] hover:bg-[#EAE9FF] text-[#8B45F5] border-[#DDD8F8]'
          }`}
          title={isExpanded ? 'Minimize conversation drawer' : 'Expand conversation history'}
          aria-label="Toggle Conversation History"
        >
          <MessageSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>

        {/* Settings Button */}
        <button
          onClick={onOpenSettings}
          className="p-2 rounded-full text-[#74738A] hover:text-[#202033] hover:bg-slate-100 transition-colors"
          title="Assistant preferences & voices"
          aria-label="AI Settings"
        >
          <Settings className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>
      </div>
    </div>
  );
};

