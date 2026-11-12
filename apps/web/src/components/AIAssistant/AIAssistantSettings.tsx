'use client';

import React from 'react';
import { Settings, Volume2, Shield, Moon, Sliders, X, Sparkles, Mic, Activity } from 'lucide-react';
import { AIAssistantSettingsState } from './types';

interface AIAssistantSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AIAssistantSettingsState;
  onUpdateSettings: (newSettings: Partial<AIAssistantSettingsState>) => void;
  availableVoices: SpeechSynthesisVoice[];
  className?: string;
}

export const AIAssistantSettings: React.FC<AIAssistantSettingsProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  availableVoices,
  className = '',
}) => {
  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto ${className}`}
      role="dialog"
      aria-labelledby="assistant-settings-title"
    >
      <div className="bg-white rounded-3xl p-4 sm:p-6 max-w-lg w-full max-h-[85vh] overflow-y-auto border border-[#DDD8F8] shadow-2xl space-y-4 animate-in fade-in zoom-in-95 my-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#F0F2FA]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#F4F3FF] border border-[#DDD8F8] flex items-center justify-center text-[#8B45F5]">
              <Settings className="w-4 h-4 stroke-[2.2]" />
            </div>
            <div>
              <h3 id="assistant-settings-title" className="text-sm font-black text-[#202033]">
                AI Companion Settings
              </h3>
              <p className="text-[11px] text-[#74738A]">Voice persona, quiet hours & privacy controls</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-100 text-[#74738A] transition-colors"
            aria-label="Close settings"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 0. Assistant Identity & Wake Word */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-[#F4F3FF] to-[#FAF9FF] border border-[#DDD8F8] space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#8B45F5]" />
            <span className="text-xs font-black text-[#202033]">Assistant Identity & Voice Activation</span>
          </div>
          <div>
            <label className="block text-[11px] font-bold text-[#202033] mb-1">
              Customizable Assistant Name
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={settings.assistantName}
                onChange={(e) => onUpdateSettings({ assistantName: e.target.value })}
                onBlur={(e) => {
                  const trimmed = e.target.value.trim();
                  if (!trimmed || trimmed.length < 2) {
                    onUpdateSettings({ assistantName: 'Nova' });
                  }
                }}
                placeholder="e.g. Nova, Jarvis, Friday"
                className="flex-1 px-3 py-1.5 rounded-xl border border-[#DDD8F8] bg-white text-xs font-bold text-[#8B45F5] focus:outline-hidden focus:border-[#8B45F5]"
              />
              <span className="text-[10px] text-[#74738A] font-semibold">Call by this name to activate</span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-[#E5E2F5]/60">
            <div>
              <span className="text-xs font-bold text-[#202033] flex items-center gap-1.5">
                <Mic className="w-3.5 h-3.5 text-[#10B981]" />
                <span>Screen-Wide Voice Wake Word</span>
              </span>
              <span className="text-[10px] text-[#74738A] block">
                Saying &ldquo;{settings.assistantName || 'Nova'}&rdquo; anywhere on screen activates the assistant
              </span>
            </div>
            <input
              type="checkbox"
              checked={settings.wakeWordEnabled}
              onChange={(e) => onUpdateSettings({ wakeWordEnabled: e.target.checked })}
              className="w-4 h-4 accent-[#8B45F5] rounded cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-[#E5E2F5]/60">
            <div>
              <span className="text-xs font-bold text-[#202033] flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-[#6366F1]" />
                <span>Autonomous Progress Analysis</span>
              </span>
              <span className="text-[10px] text-[#74738A] block">
                Continuously analyzes tasks, focus, routines & goals in background
              </span>
            </div>
            <input
              type="checkbox"
              checked={settings.autoBackgroundAnalysis}
              onChange={(e) => onUpdateSettings({ autoBackgroundAnalysis: e.target.checked })}
              className="w-4 h-4 accent-[#8B45F5] rounded cursor-pointer"
            />
          </div>
        </div>

        {/* 1. Voice Synthesis Selection */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-[#202033] flex items-center gap-1.5">
            <Volume2 className="w-3.5 h-3.5 text-[#8B45F5]" />
            <span>Spoken Voice Persona</span>
          </label>
          <select
            value={settings.voiceURI}
            onChange={(e) => onUpdateSettings({ voiceURI: e.target.value })}
            className="w-full px-3 py-2 rounded-xl border border-[#E5E2F5] bg-[#F8F7FF] text-xs font-medium text-[#202033] focus:outline-hidden focus:border-[#8B45F5]"
          >
            <option value="">Default System Natural Voice</option>
            {availableVoices.map((v) => (
              <option key={v.voiceURI} value={v.voiceURI}>
                {v.name} ({v.lang})
              </option>
            ))}
          </select>
        </div>

        {/* 2. Speech Rate */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-bold text-[#202033]">
            <span className="flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-[#10B981]" />
              <span>Speech Speed Rate</span>
            </span>
            <span className="font-mono text-[#8B45F5]">{settings.speechRate.toFixed(2)}x</span>
          </div>
          <input
            type="range"
            min="0.8"
            max="1.4"
            step="0.05"
            value={settings.speechRate}
            onChange={(e) => onUpdateSettings({ speechRate: parseFloat(e.target.value) })}
            className="w-full accent-[#8B45F5] cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-[#74738A]">
            <span>Calm (0.8x)</span>
            <span>Standard (1.0x)</span>
            <span>Fast (1.4x)</span>
          </div>
        </div>

        {/* 3. Auto Spoken Responses Toggle */}
        <div className="flex items-center justify-between p-3 rounded-2xl bg-[#F8F7FF] border border-[#E5E2F5]">
          <div>
            <span className="text-xs font-bold text-[#202033] block">Automatic Vocal Speech</span>
            <span className="text-[11px] text-[#74738A] block">Speak answers aloud via text-to-speech</span>
          </div>
          <input
            type="checkbox"
            checked={settings.autoVoiceResponse}
            onChange={(e) => onUpdateSettings({ autoVoiceResponse: e.target.checked })}
            className="w-4 h-4 accent-[#8B45F5] rounded cursor-pointer"
          />
        </div>

        {/* 4. Quiet Hours */}
        <div className="p-3 rounded-2xl bg-[#F8F7FF] border border-[#E5E2F5] space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Moon className="w-3.5 h-3.5 text-[#6366F1]" />
              <span className="text-xs font-bold text-[#202033]">Quiet Hours (No Vocal Alerts)</span>
            </div>
            <input
              type="checkbox"
              checked={settings.quietHoursEnabled}
              onChange={(e) => onUpdateSettings({ quietHoursEnabled: e.target.checked })}
              className="w-4 h-4 accent-[#8B45F5] rounded cursor-pointer"
            />
          </div>
          {settings.quietHoursEnabled && (
            <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
              <div>
                <label className="block text-[10px] text-[#74738A] font-medium mb-0.5">Start Time</label>
                <input
                  type="time"
                  value={settings.quietHoursStart}
                  onChange={(e) => onUpdateSettings({ quietHoursStart: e.target.value })}
                  className="w-full px-2 py-1 rounded-lg border border-[#DDD8F8] bg-white font-mono text-xs"
                />
              </div>
              <div>
                <label className="block text-[10px] text-[#74738A] font-medium mb-0.5">End Time</label>
                <input
                  type="time"
                  value={settings.quietHoursEnd}
                  onChange={(e) => onUpdateSettings({ quietHoursEnd: e.target.value })}
                  className="w-full px-2 py-1 rounded-lg border border-[#DDD8F8] bg-white font-mono text-xs"
                />
              </div>
            </div>
          )}
        </div>

        {/* 5. Financial Privacy Masking */}
        <div className="flex items-center justify-between p-3 rounded-2xl bg-[#F8F7FF] border border-[#E5E2F5]">
          <div className="pr-3">
            <span className="text-xs font-bold text-[#202033] flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-[#F59E0B]" />
              <span>Mask Financial Figures</span>
            </span>
            <span className="text-[11px] text-[#74738A] block">
              Mask rupee amounts (₹) during spoken responses in public spaces
            </span>
          </div>
          <input
            type="checkbox"
            checked={settings.maskFinanceAmounts}
            onChange={(e) => onUpdateSettings({ maskFinanceAmounts: e.target.checked })}
            className="w-4 h-4 accent-[#8B45F5] rounded cursor-pointer shrink-0"
          />
        </div>

        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-2xl bg-[#8B45F5] hover:bg-[#7839D6] text-white text-xs font-black transition-colors shadow-sm"
        >
          Save & Apply Preferences
        </button>
      </div>
    </div>
  );
};

