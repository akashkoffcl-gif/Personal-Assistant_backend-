'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Shield,
  Mic,
  Bell,
  Radio,
  BatteryCharging,
  Settings,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ExternalLink,
  Volume2,
  VolumeX,
  Play,
  Square,
  Lock,
  Smartphone,
  Info,
} from 'lucide-react';
import { toast } from '@/components/Toast';

interface DevicePermissionState {
  recordAudioGranted: boolean;
  postNotificationsGranted: boolean;
  notificationListenerGranted: boolean;
  batteryOptimizationIgnored: boolean;
  sdkInt?: number;
}

interface VoiceRuntimeState {
  state: string;
  isWakeWordActive: boolean;
  isTtsActive: boolean;
  isRecognitionAvailable: boolean;
  lastTranscript?: string | null;
  lastError?: string | null;
}

export function DevicePermissionsManager() {
  const [isBridgeAvailable, setIsBridgeAvailable] = useState<boolean>(false);
  const [permissions, setPermissions] = useState<DevicePermissionState>({
    recordAudioGranted: false,
    postNotificationsGranted: false,
    notificationListenerGranted: false,
    batteryOptimizationIgnored: false,
  });
  const [voiceStatus, setVoiceStatus] = useState<VoiceRuntimeState>({
    state: 'DISABLED',
    isWakeWordActive: false,
    isTtsActive: false,
    isRecognitionAvailable: false,
  });
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Poll / Query Android Bridge State
  const inspectDeviceState = useCallback(() => {
    if (typeof window === 'undefined') return;

    const bridge = (window as any).NovaAndroidBridge;
    if (bridge) {
      setIsBridgeAvailable(true);

      // 1. Permissions status
      if (typeof bridge.getDevicePermissionStatus === 'function') {
        try {
          const raw = bridge.getDevicePermissionStatus();
          const parsed = JSON.parse(raw);
          setPermissions({
            recordAudioGranted: Boolean(parsed.recordAudioGranted),
            postNotificationsGranted: Boolean(parsed.postNotificationsGranted),
            notificationListenerGranted: Boolean(parsed.notificationListenerGranted),
            batteryOptimizationIgnored: Boolean(parsed.batteryOptimizationIgnored),
            sdkInt: parsed.sdkInt,
          });
        } catch (e) {
          console.error('Failed to parse permission status from bridge', e);
        }
      }

      // 2. Voice runtime status
      if (typeof bridge.getVoiceStatus === 'function') {
        try {
          const rawVoice = bridge.getVoiceStatus();
          const parsedVoice = JSON.parse(rawVoice);
          setVoiceStatus(parsedVoice);
        } catch (e) {
          console.error('Failed to parse voice status from bridge', e);
        }
      }
    } else {
      setIsBridgeAvailable(false);
    }
  }, []);

  // Initial inspection & Auto-refresh on window focus (e.g. returning from Android system settings)
  useEffect(() => {
    inspectDeviceState();

    const handleFocus = () => {
      inspectDeviceState();
    };

    window.addEventListener('focus', handleFocus);
    const interval = setInterval(inspectDeviceState, 4000);

    return () => {
      window.removeEventListener('focus', handleFocus);
      clearInterval(interval);
    };
  }, [inspectDeviceState]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    inspectDeviceState();
    setTimeout(() => {
      setIsRefreshing(false);
      toast.success('Device Status Refreshed', 'Reflected real-time Android system state.');
    }, 400);
  };

  const handleRequestMic = () => {
    const bridge = (window as any).NovaAndroidBridge;
    if (bridge?.requestMicrophonePermission) {
      bridge.requestMicrophonePermission();
      setTimeout(inspectDeviceState, 1000);
    } else {
      toast.info('Desktop Web Mode', 'Microphone permissions are requested automatically when initiating browser voice.');
    }
  };

  const handleRequestNotifications = () => {
    const bridge = (window as any).NovaAndroidBridge;
    if (bridge?.requestNotificationPermission) {
      bridge.requestNotificationPermission();
      setTimeout(inspectDeviceState, 1000);
    } else {
      toast.info('Desktop Web Mode', 'Use browser push notification controls.');
    }
  };

  const handleOpenListenerSettings = () => {
    const bridge = (window as any).NovaAndroidBridge;
    if (bridge?.openNotificationAccessSettings) {
      bridge.openNotificationAccessSettings();
    } else {
      toast.info('Notification Access', 'Notification listener access is specific to the Android Companion app.');
    }
  };

  const handleOpenBatterySettings = () => {
    const bridge = (window as any).NovaAndroidBridge;
    if (bridge?.openBatteryOptimizationSettings) {
      bridge.openBatteryOptimizationSettings();
    } else {
      toast.info('Battery Optimization', 'Configure system battery optimizations in Android settings.');
    }
  };

  const handleOpenAppSettings = () => {
    const bridge = (window as any).NovaAndroidBridge;
    if (bridge?.openAppSettings) {
      bridge.openAppSettings();
    } else {
      toast.info('App Settings', 'Open Android system Settings > Apps > NOVA Companion.');
    }
  };

  const handleToggleVoiceService = (start: boolean) => {
    const bridge = (window as any).NovaAndroidBridge;
    if (!bridge) {
      toast.error('Native Only', 'Foreground voice service requires the unified Android APK.');
      return;
    }

    if (start) {
      if (!permissions.recordAudioGranted) {
        toast.error('Permission Required', 'Microphone permission must be granted before starting the voice service.');
        handleRequestMic();
        return;
      }
      bridge.startVoiceForegroundService();
      toast.success('Voice Service Starting', 'Persistent notification initialized.');
    } else {
      bridge.stopVoiceForegroundService();
      toast.info('Voice Service Stopped', 'Microphone stream and audio focus released.');
    }
    setTimeout(inspectDeviceState, 500);
  };

  const handleToggleWakeWord = (enable: boolean) => {
    const bridge = (window as any).NovaAndroidBridge;
    if (!bridge?.setWakeWordEnabled) {
      toast.error('Native Only', 'Wake-word spotting requires native Android SpeechRecognizer.');
      return;
    }
    bridge.setWakeWordEnabled(enable);
    setTimeout(inspectDeviceState, 300);
  };

  const handleTestVoiceOutput = () => {
    const bridge = (window as any).NovaAndroidBridge;
    if (!bridge?.testVoiceOutput) {
      toast.error('Native Only', 'Testing native voice output requires the unified Android APK.');
      return;
    }
    try {
      const res = bridge.testVoiceOutput('Hello! This is NOVA. Native Android voice output is working properly.');
      const parsed = JSON.parse(res);
      if (parsed.success) {
        toast.success('Voice Test Triggered', 'Speaking through Android TextToSpeech engine.');
      } else {
        toast.error('Voice Test Failed', parsed.error || 'TTS error');
      }
    } catch (e: any) {
      toast.error('Test Execution Error', e.message);
    }
    setTimeout(inspectDeviceState, 500);
  };

  return (
    <div className="space-y-6">
      {/* HEADER & ENVIRONMENT BADGE */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-[#E5E2F5] shadow-[0_4px_20px_rgba(139,69,245,0.04)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#F0F2FA]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#F4F3FF] border border-[#DDD8F8] flex items-center justify-center text-[#8B45F5]">
              <Shield className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                  Device Permissions & Capabilities
                </h3>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                    isBridgeAvailable
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}
                >
                  {isBridgeAvailable ? 'Native Android APK' : 'Browser Web Shell'}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Inspect and manage Android OS runtime permissions, background services, and intelligence access.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="px-3 py-1.5 rounded-xl border border-[#DDD8F8] bg-white hover:bg-[#F4F3FF] text-[#74738A] hover:text-[#202033] text-xs font-bold transition-all flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            {isBridgeAvailable && (
              <button
                onClick={handleOpenAppSettings}
                className="px-3 py-1.5 rounded-xl border border-[#DDD8F8] bg-white hover:bg-[#F4F3FF] text-[#8B45F5] text-xs font-bold transition-all flex items-center gap-1.5"
                title="Open system App Info"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>App Settings</span>
              </button>
            )}
          </div>
        </div>

        {/* SECTION 1: CORE PERMISSION GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
          {/* Card 1: Microphone Runtime Permission */}
          <div className="p-4 rounded-xl border border-[#E5E2F5] bg-[#F8F7FC] space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-white border border-[#DDD8F8] flex items-center justify-center text-[#8B45F5]">
                  <Mic className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Microphone (Audio Capture)</h4>
                  <p className="text-[10px] text-slate-500 font-mono">android.permission.RECORD_AUDIO</p>
                </div>
              </div>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold flex items-center gap-1 border ${
                  permissions.recordAudioGranted
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-red-50 text-red-700 border-red-200'
                }`}
              >
                {permissions.recordAudioGranted ? (
                  <>
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Granted
                  </>
                ) : (
                  <>
                    <XCircle className="w-3 h-3 text-red-600" /> Denied
                  </>
                )}
              </span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Required for in-app voice commands, conversational chat, and acoustic keyword spotting.
            </p>
            <div className="flex items-center justify-between pt-1">
              {!permissions.recordAudioGranted ? (
                <button
                  onClick={handleRequestMic}
                  className="px-3 py-1.5 rounded-xl bg-[#8B45F5] hover:bg-[#7839D6] text-white text-xs font-bold transition-colors shadow-2xs"
                >
                  Enable Microphone
                </button>
              ) : (
                <span className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Audio Ready
                </span>
              )}
              <button
                onClick={handleOpenAppSettings}
                className="text-[11px] text-[#74738A] hover:text-[#8B45F5] underline flex items-center gap-0.5"
              >
                <span>Settings</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </button>
            </div>
          </div>

          {/* Card 2: Notifications Runtime Permission */}
          <div className="p-4 rounded-xl border border-[#E5E2F5] bg-[#F8F7FC] space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-white border border-[#DDD8F8] flex items-center justify-center text-[#8B45F5]">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Post Notifications</h4>
                  <p className="text-[10px] text-slate-500 font-mono">android.permission.POST_NOTIFICATIONS</p>
                </div>
              </div>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold flex items-center gap-1 border ${
                  permissions.postNotificationsGranted
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-red-50 text-red-700 border-red-200'
                }`}
              >
                {permissions.postNotificationsGranted ? (
                  <>
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Granted
                  </>
                ) : (
                  <>
                    <XCircle className="w-3 h-3 text-red-600" /> Denied
                  </>
                )}
              </span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Required on Android 13–16 for reminder alerts, background alarms, and persistent foreground voice service notifications.
            </p>
            <div className="flex items-center justify-between pt-1">
              {!permissions.postNotificationsGranted ? (
                <button
                  onClick={handleRequestNotifications}
                  className="px-3 py-1.5 rounded-xl bg-[#8B45F5] hover:bg-[#7839D6] text-white text-xs font-bold transition-colors shadow-2xs"
                >
                  Enable Notifications
                </button>
              ) : (
                <span className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Notifications Active
                </span>
              )}
              <button
                onClick={handleOpenAppSettings}
                className="text-[11px] text-[#74738A] hover:text-[#8B45F5] underline flex items-center gap-0.5"
              >
                <span>Settings</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </button>
            </div>
          </div>

          {/* Card 3: Notification Listener Service Access */}
          <div className="p-4 rounded-xl border border-[#E5E2F5] bg-[#F8F7FC] space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-white border border-[#DDD8F8] flex items-center justify-center text-[#8B45F5]">
                  <Radio className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Notification Listener Access</h4>
                  <p className="text-[10px] text-slate-500 font-mono">NotificationListenerService</p>
                </div>
              </div>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold flex items-center gap-1 border ${
                  permissions.notificationListenerGranted
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}
              >
                {permissions.notificationListenerGranted ? (
                  <>
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Active & Synced
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-3 h-3 text-amber-600" /> Access Needed
                  </>
                )}
              </span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Allows NOVA to read and sanitize approved status-bar notifications for phone intelligence and proactive AI assistance.
            </p>
            <div className="flex items-center justify-between pt-1">
              <button
                onClick={handleOpenListenerSettings}
                className="px-3 py-1.5 rounded-xl border border-[#DDD8F8] bg-white hover:bg-[#F4F3FF] text-[#8B45F5] text-xs font-bold transition-colors shadow-2xs"
              >
                {permissions.notificationListenerGranted ? 'Review System Access' : 'Grant on Phone'}
              </button>
              <span className="text-[10px] text-slate-400 font-medium">Banking & UPI Excluded</span>
            </div>
          </div>

          {/* Card 4: Battery Optimization State */}
          <div className="p-4 rounded-xl border border-[#E5E2F5] bg-[#F8F7FC] space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-white border border-[#DDD8F8] flex items-center justify-center text-[#8B45F5]">
                  <BatteryCharging className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Battery Optimization (Doze)</h4>
                  <p className="text-[10px] text-slate-500 font-mono">REQUEST_IGNORE_BATTERY_OPTIMIZATIONS</p>
                </div>
              </div>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold flex items-center gap-1 border ${
                  permissions.batteryOptimizationIgnored
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-blue-50 text-blue-700 border-blue-200'
                }`}
              >
                {permissions.batteryOptimizationIgnored ? 'Unrestricted' : 'Optimized'}
              </span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Allowing unrestricted battery prevents Android from killing background telemetry sync and notification workers.
            </p>
            <div className="flex items-center justify-between pt-1">
              <button
                onClick={handleOpenBatterySettings}
                className="px-3 py-1.5 rounded-xl border border-[#DDD8F8] bg-white hover:bg-[#F4F3FF] text-[#8B45F5] text-xs font-bold transition-colors shadow-2xs"
              >
                Configure Battery
              </button>
              <span className="text-[10px] text-slate-400 font-medium">Standard OS Doze</span>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: NATIVE VOICE SUBSYSTEM CONTROLS */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-[#E5E2F5] shadow-[0_4px_20px_rgba(139,69,245,0.04)] space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#F0F2FA]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#F4F3FF] border border-[#DDD8F8] flex items-center justify-center text-[#8B45F5]">
              <Volume2 className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900">Foreground Microphone Service & Voice Subsystem</h4>
              <p className="text-[11px] text-slate-500">
                Android 14–16 compliant ongoing microphone service with transient audio focus ducking
              </p>
            </div>
          </div>
          <span
            className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase border ${
              voiceStatus.state === 'LISTENING' || voiceStatus.state === 'PROCESSING' || voiceStatus.state === 'RESPONDING'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : voiceStatus.state === 'READY'
                ? 'bg-blue-50 text-blue-700 border-blue-200'
                : 'bg-slate-100 text-slate-600 border-slate-200'
            }`}
          >
            {voiceStatus.state}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-[#F8F7FF] border border-[#E5E2F5] space-y-1">
            <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider block">Wake-Word Spotter</span>
            <span className="font-extrabold text-slate-900">
              {voiceStatus.isWakeWordActive ? 'Active ("Hey Nova", "Jarvis")' : 'Disabled'}
            </span>
            <p className="text-[10px] text-slate-400">Software phrase matcher</p>
          </div>
          <div className="p-3 rounded-xl bg-[#F8F7FF] border border-[#E5E2F5] space-y-1">
            <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider block">Speech Synthesizer</span>
            <span className="font-extrabold text-slate-900">
              {voiceStatus.isTtsActive ? 'Speaking Output...' : 'Idle / Standby'}
            </span>
            <p className="text-[10px] text-slate-400">Android TextToSpeech engine</p>
          </div>
          <div className="p-3 rounded-xl bg-[#F8F7FF] border border-[#E5E2F5] space-y-1">
            <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider block">Recognizer Availability</span>
            <span className="font-extrabold text-slate-900">
              {voiceStatus.isRecognitionAvailable ? 'Available On-Device' : 'Unavailable'}
            </span>
            <p className="text-[10px] text-slate-400">Platform SpeechRecognizer</p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-3 pt-2">
          {voiceStatus.state === 'DISABLED' || voiceStatus.state === 'READY' ? (
            <button
              onClick={() => handleToggleVoiceService(true)}
              className="px-4 py-2 rounded-xl bg-[#8B45F5] hover:bg-[#7839D6] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Start Voice Foreground Service</span>
            </button>
          ) : (
            <button
              onClick={() => handleToggleVoiceService(false)}
              className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>Stop Voice Service</span>
            </button>
          )}

          <button
            onClick={() => handleToggleWakeWord(!voiceStatus.isWakeWordActive)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-colors ${
              voiceStatus.isWakeWordActive
                ? 'bg-[#EEF2FF] border-[#C7D2FE] text-[#6366F1]'
                : 'bg-white border-[#DDD8F8] text-[#74738A] hover:bg-[#F4F3FF]'
            }`}
          >
            {voiceStatus.isWakeWordActive ? 'Disable Wake-Word' : 'Enable Wake-Word Spotting'}
          </button>

          <button
            onClick={handleTestVoiceOutput}
            className="px-3.5 py-2 rounded-xl text-xs font-bold border border-[#DDD8F8] bg-white text-[#74738A] hover:bg-[#F4F3FF] transition-colors flex items-center gap-1.5"
          >
            <Volume2 className="w-3.5 h-3.5 text-[#8B45F5]" />
            <span>Test Voice Output</span>
          </button>
        </div>

        {/* Architecture Notice */}
        <div className="p-3.5 rounded-xl bg-[#F8F7FF] border border-[#E5E2F5] text-xs text-slate-500 space-y-1">
          <p className="font-bold text-slate-700 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-[#8B45F5]" />
            <span>Android 16 Lifecycle Notice</span>
          </p>
          <p className="leading-relaxed text-[11px]">
            In compliance with Android 14–16 microphone foreground service restrictions, voice activation must be initiated by explicit user gesture and maintains an ongoing persistent notification while active. Wake-word spotting is powered by active software phrase matching; always-on zero-power DSP detection is restricted by system security policies to the OEM assistant.
          </p>
        </div>
      </div>
    </div>
  );
}
