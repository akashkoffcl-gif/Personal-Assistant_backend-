'use client';

import React, { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AIAvatar, AIAvatarState } from '@/components/AIAvatar';
import { useVoiceInteraction, VoiceState } from '@/hooks/useVoiceInteraction';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Sparkles,
  X,
  AlertCircle,
  Pause,
  Play,
  Check,
  Clock,
  Radio,
} from 'lucide-react';

interface VoiceAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTaskCreated?: () => void;
}

export const VoiceAssistantModal: React.FC<VoiceAssistantModalProps> = ({
  isOpen,
  onClose,
  onTaskCreated,
}) => {
  const queryClient = useQueryClient();

  const {
    state,
    transcript,
    interimTranscript,
    responseMessage,
    proposedAction,
    audioLevel,
    isSpeaking,
    isListening,
    isProcessing,
    isPaused,
    browserSupported,
    voiceMuted,
    conversationHistory,
    sessionStartTime,
    setVoiceMuted,
    startVoiceSession,
    pauseVoiceSession,
    resumeVoiceSession,
    stopVoiceSession,
    handleBargeIn,
    confirmAction,
  } = useVoiceInteraction({
    continuous: true,
    onExecutionResult: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['day-plan'] });
      onTaskCreated?.();
    },
  });

  // Automatically start voice session when modal is opened, stop on close
  useEffect(() => {
    if (isOpen) {
      startVoiceSession();
    } else {
      stopVoiceSession();
    }
  }, [isOpen]);

  // Session Duration Timer
  const [elapsedSec, setElapsedSec] = useState(0);
  useEffect(() => {
    if (!isOpen || !sessionStartTime || state === 'STOPPED') {
      setElapsedSec(0);
      return;
    }
    const interval = setInterval(() => {
      setElapsedSec(Math.floor((Date.now() - sessionStartTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen, sessionStartTime, state]);

  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (!isOpen) return null;

  // Map VoiceState to AIAvatarState
  const mapAvatarState = (vs: VoiceState): AIAvatarState => {
    switch (vs) {
      case 'LISTENING':
      case 'WAITING_FOR_FOLLOWUP':
        return 'listening';
      case 'PROCESSING':
      case 'GENERATING_RESPONSE':
        return 'thinking';
      case 'SPEAKING':
        return 'speaking';
      case 'ERROR':
        return 'error';
      default:
        return 'idle';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-slate-900/95 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80 bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-semibold text-white tracking-wide text-base">NOVA Voice Assistant</h2>
                <span className="flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                  <Radio className="w-3 h-3 animate-ping" />
                  Continuous Mode
                </span>
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-2">
                <span>Duration: {formatDuration(elapsedSec)}</span>
                <span>•</span>
                <span className="capitalize">{state.toLowerCase().replace(/_/g, ' ')}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setVoiceMuted(!voiceMuted)}
              className="p-2 rounded-xl bg-slate-800/60 hover:bg-slate-700/60 text-slate-400 hover:text-white transition-colors"
              title={voiceMuted ? 'Unmute Audio' : 'Mute Audio'}
            >
              {voiceMuted ? <VolumeX className="w-5 h-5 text-rose-400" /> : <Volume2 className="w-5 h-5" />}
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800/60 hover:bg-slate-700/60 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Center Visualizer & Avatar */}
        <div className="flex flex-col items-center justify-center py-6 px-6 bg-gradient-to-b from-purple-950/10 via-transparent to-transparent">
          <div className="relative cursor-pointer" onClick={isSpeaking ? handleBargeIn : undefined}>
            <AIAvatar state={mapAvatarState(state)} size="lg" />
            {isSpeaking && (
              <span className="absolute -bottom-2 bg-purple-600 text-[10px] text-white px-2 py-0.5 rounded-full font-medium shadow-lg animate-bounce">
                Click or speak to interrupt
              </span>
            )}
          </div>

          {/* Real Audio Waveform Visualizer */}
          <div className="flex items-center gap-1.5 h-10 mt-5">
            {[...Array(16)].map((_, i) => {
              const height = isListening
                ? Math.max(6, Math.min(36, Math.round((audioLevel * (1 + (i % 4) * 0.2)))))
                : isSpeaking
                ? 16 + Math.sin(Date.now() / 150 + i) * 12
                : isProcessing
                ? 8 + Math.cos(Date.now() / 200 + i) * 6
                : 4;

              return (
                <div
                  key={i}
                  style={{ height: `${height}px` }}
                  className={`w-1.5 rounded-full transition-all duration-75 ${
                    isListening
                      ? 'bg-purple-500 shadow-sm shadow-purple-500/50'
                      : isSpeaking
                      ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50'
                      : isProcessing
                      ? 'bg-amber-400 animate-pulse'
                      : 'bg-slate-700'
                  }`}
                />
              );
            })}
          </div>

          {/* Current Live Utterance Banner */}
          <div className="w-full text-center mt-3 min-h-[32px] px-4">
            {interimTranscript && (
              <p className="text-sm font-medium text-purple-300 italic animate-pulse">
                &ldquo;{interimTranscript}&rdquo;
              </p>
            )}
            {!interimTranscript && transcript && (
              <p className="text-sm font-medium text-slate-200">
                &ldquo;{transcript}&rdquo;
              </p>
            )}
            {!interimTranscript && !transcript && isListening && (
              <p className="text-xs text-slate-500">
                Listening... (Ask a question or request an action)
              </p>
            )}
          </div>
        </div>

        {/* Conversation Multi-Turn Transcript */}
        <div className="flex-1 overflow-y-auto px-6 py-3 space-y-3 min-h-[160px] max-h-[240px] border-t border-b border-slate-800/60 bg-slate-950/20">
          {conversationHistory.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-xs">
              No messages yet in this session. Say &ldquo;Hey Nova, what are my tasks today?&rdquo;
            </div>
          ) : (
            conversationHistory.map((item, idx) => (
              <div
                key={idx}
                className={`flex flex-col ${item.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mb-1">
                  <span>{item.role === 'user' ? 'You' : 'Nova'}</span>
                  <span>•</span>
                  <span>{item.time}</span>
                </div>
                <div
                  className={`px-4 py-2.5 rounded-2xl max-w-[85%] text-xs leading-relaxed ${
                    item.role === 'user'
                      ? 'bg-purple-600/20 border border-purple-500/30 text-purple-100 rounded-tr-sm'
                      : 'bg-slate-800/80 border border-slate-700/50 text-slate-200 rounded-tl-sm'
                  }`}
                >
                  {item.text}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pending Approval Card */}
        {proposedAction && (
          <div className="p-4 mx-6 my-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-amber-200">Action Confirmation Required</h4>
                <p className="text-xs text-slate-300">{proposedAction.description || 'Proceed with requested mutation?'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => confirmAction(true)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition-colors"
              >
                <Check className="w-3.5 h-3.5" /> Confirm
              </button>
              <button
                onClick={() => confirmAction(false)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
              >
                <X className="w-3.5 h-3.5" /> Discard
              </button>
            </div>
          </div>
        )}

        {/* Controls Footer */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-950/60 border-t border-slate-800/80">
          <div className="flex items-center gap-2">
            {isPaused ? (
              <button
                onClick={resumeVoiceSession}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition-colors"
              >
                <Play className="w-4 h-4" /> Resume Listening
              </button>
            ) : (
              <button
                onClick={pauseVoiceSession}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
              >
                <Pause className="w-4 h-4" /> Pause
              </button>
            )}
            <button
              onClick={stopVoiceSession}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 text-xs font-medium transition-colors"
            >
              <MicOff className="w-4 h-4" /> End Session
            </button>
          </div>

          <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            <span>Speak naturally. Nova will respond & resume listening.</span>
          </div>
        </div>

      </div>
    </div>
  );
};
