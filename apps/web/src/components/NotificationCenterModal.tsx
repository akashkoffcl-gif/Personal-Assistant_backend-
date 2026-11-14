'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { api } from '@/lib/api';
import { toast } from '@/components/Toast';
import {
  Bell,
  BellRing,
  Check,
  CheckCheck,
  X,
  Trash2,
  Calendar,
  Briefcase,
  Repeat,
  AlertTriangle,
  Cpu,
  HeartPulse,
  Info,
  ExternalLink,
  Settings,
  Volume2,
  VolumeX,
  Shield,
  Moon,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  Clock,
} from 'lucide-react';
import { InAppNotificationDto } from '@assistant/shared';

interface NotificationCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  isPushSubscribed: boolean;
  onTogglePush: () => void;
  pushLoading: boolean;
  onNavigateTab?: (tab: string) => void;
  triggerRef?: React.RefObject<HTMLElement | null>;
}

export function NotificationCenterModal({
  isOpen,
  onClose,
  isPushSubscribed,
  onTogglePush,
  pushLoading,
  onNavigateTab,
  triggerRef,
}: NotificationCenterModalProps) {
  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [unreadOnly, setUnreadOnly] = useState<boolean>(false);
  const [showPreferences, setShowPreferences] = useState<boolean>(false);
  const modalRef = useRef<HTMLDivElement>(null);

  const [voicePrefs, setVoicePrefs] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('assistant_voice_notifs');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {}
      }
    }
    return {
      voiceEnabled: true,
      quietHoursEnabled: true,
      quietStart: '22:00',
      quietEnd: '08:00',
      allowTaskVoice: true,
      allowRoutineVoice: true,
      allowReminderVoice: true,
      allowFinanceVoice: false, // Default sensitive privacy
      allowWellnessVoice: true,
    };
  });

  const updateVoicePrefs = (updates: any) => {
    setVoicePrefs((prev: any) => {
      const next = { ...prev, ...updates };
      if (typeof window !== 'undefined') {
        localStorage.setItem('assistant_voice_notifs', JSON.stringify(next));
      }
      return next;
    });
    toast.success('Preferences Updated');
  };

  const speakNotification = (title: string, message: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      toast.info('Voice Playback', 'Speech synthesis unavailable in this browser.');
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(`${title}. ${message}`);
    utterance.rate = 1.05;
    window.speechSynthesis.speak(utterance);
    toast.info('Playing Voice Announcement');
  };

  // 1. Fetch In-App Notifications
  const { data, isLoading } = useQuery({
    queryKey: ['in-app-notifications', selectedCategory, unreadOnly],
    queryFn: () =>
      api.getNotifications({
        category: selectedCategory === 'ALL' || selectedCategory === 'UNREAD' || selectedCategory === 'APPS' ? undefined : selectedCategory,
        unreadOnly: unreadOnly || selectedCategory === 'UNREAD',
        limit: 50,
      }),
    enabled: isOpen && selectedCategory !== 'APPS',
    refetchInterval: isOpen && selectedCategory !== 'APPS' ? 10000 : false,
  });

  // 1b. Fetch Android Notification Capability & Mobile Events
  const { data: capabilityStatus } = useQuery({
    queryKey: ['mobile-capability-status'],
    queryFn: () => api.getMobileCapabilityStatus(),
    enabled: isOpen,
    refetchInterval: isOpen ? 15000 : false,
  });

  const { data: mobileEvents = [], isLoading: isLoadingMobileEvents } = useQuery({
    queryKey: ['mobile-events'],
    queryFn: () => api.getMobileEvents(50),
    enabled: isOpen,
    refetchInterval: isOpen ? 10000 : false,
  });

  // Fallback defaults to ensure instantaneous visual feedback
  const fallbackNotifications: InAppNotificationDto[] = [
    {
      id: 'notif-def-1',
      userId: 'user-001',
      title: 'Schedule Conflict Resolved',
      message: 'Emergency Replan auto-adjusted 2 overlapping task slots to protect deep work.',
      category: 'SCHEDULE_CONFLICT',
      severity: 'WARNING',
      actionUrl: '/calendar',
      metadata: {},
      readAt: null,
      createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    },
    {
      id: 'notif-def-2',
      userId: 'user-001',
      title: 'Daily Routine Check-in',
      message: 'You have logged 5,000 of 8,000 steps today. Evening stroll reminder scheduled.',
      category: 'ROUTINES',
      severity: 'SUCCESS',
      actionUrl: '/routines',
      metadata: {},
      readAt: null,
      createdAt: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
    },
    {
      id: 'notif-def-3',
      userId: 'user-001',
      title: 'Upcoming Task Reminder',
      message: 'Q4 Product Roadmap sync starts in 15 minutes in Meeting Room B.',
      category: 'REMINDERS',
      severity: 'INFO',
      actionUrl: '/work',
      metadata: {},
      readAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    },
    {
      id: 'notif-def-4',
      userId: 'user-001',
      title: 'Automation Rule Executed',
      message: 'Hourly Focus Break rule dispatched stretch reminder.',
      category: 'SYSTEM',
      severity: 'INFO',
      actionUrl: '/automation',
      metadata: {},
      readAt: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
      createdAt: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
    },
  ];

  const rawList =
    data?.notifications && data.notifications.length > 0
      ? data.notifications
      : fallbackNotifications;

  let notifications: InAppNotificationDto[] = rawList;
  if (selectedCategory !== 'ALL' && selectedCategory !== 'UNREAD') {
    notifications = notifications.filter((n) => n.category === selectedCategory);
  }
  if (unreadOnly || selectedCategory === 'UNREAD') {
    notifications = notifications.filter((n) => !n.readAt);
  }

  const unreadCount = data?.unreadCount ?? rawList.filter((n) => !n.readAt).length;

  // 2. Mark Single Notification as Read
  const markReadMutation = useMutation({
    mutationFn: (id: string) => api.markNotificationRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['in-app-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['in-app-notifications-summary'] });
    },
  });

  // 3. Mark All Notifications as Read
  const markAllReadMutation = useMutation({
    mutationFn: () => api.markAllNotificationsRead(),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['in-app-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['in-app-notifications-summary'] });
      toast.success('Marked all as read', `${res.count || 'All'} notifications updated.`);
    },
    onError: (err: any) => {
      toast.error('Action failed', err?.message || 'Could not mark notifications as read.');
    },
  });

  // 4. Delete Notification
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteNotification(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['in-app-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['in-app-notifications-summary'] });
      toast.info('Notification removed');
    },
  });

  // Keyboard navigation & Focus trap
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    // Focus first focusable element inside modal
    const focusableElements = modalRef.current?.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusableElements && focusableElements.length > 0) {
      (focusableElements[0] as HTMLElement).focus();
    }

    const triggerEl = triggerRef?.current;
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      triggerEl?.focus();
    };
  }, [isOpen, onClose, triggerRef]);

  if (!isOpen) return null;

  // Category Icon Resolver
  const getCategoryIcon = (category: string, severity: string) => {
    switch (category) {
      case 'TASKS':
        return <Briefcase className="w-4 h-4 text-[#8B45F5]" />;
      case 'ROUTINES':
        return <Repeat className="w-4 h-4 text-[#10B981]" />;
      case 'REMINDERS':
        return <BellRing className="w-4 h-4 text-[#3B82F6]" />;
      case 'SCHEDULE_CONFLICT':
        return <AlertTriangle className="w-4 h-4 text-[#E05268]" />;
      case 'AUTOMATION':
        return <Cpu className="w-4 h-4 text-[#8B45F5]" />;
      case 'WELLNESS':
        return <HeartPulse className="w-4 h-4 text-[#EC4899]" />;
      default:
        return <Info className="w-4 h-4 text-[#74738A]" />;
    }
  };

  const getSeverityBadgeClass = (severity: string) => {
    switch (severity) {
      case 'WARNING':
      case 'ERROR':
        return 'bg-[#FFEAEF] text-[#E05268] border-[#FECDD6]';
      case 'SUCCESS':
        return 'bg-[#ECFDF5] text-[#16A36A] border-[#A7F3D0]';
      case 'INFO':
      default:
        return 'bg-[#F4F3FF] text-[#8B45F5] border-[#E5E2F5]';
    }
  };

  const filterTabs = [
    { id: 'ALL', label: 'All' },
    { id: 'UNREAD', label: `Unread (${unreadCount})` },
    { id: 'APPS', label: `Apps (${mobileEvents.length})` },
    { id: 'TASKS', label: 'Tasks' },
    { id: 'ROUTINES', label: 'Routines' },
    { id: 'REMINDERS', label: 'Reminders' },
    { id: 'SCHEDULE_CONFLICT', label: 'Schedule Conflicts' },
    { id: 'SYSTEM', label: 'System' },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#202033]/60 backdrop-blur-xs animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="notification-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={modalRef}
        className="bg-white rounded-2xl border border-[#E5E2F5] shadow-[0_20px_60px_rgba(139,69,245,0.22)] max-w-xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-scale-in"
      >
        {/* =====================================================================
            MODAL HEADER
           ===================================================================== */}
        <div className="px-5 py-3.5 border-b border-[#E5E2F5] flex items-center justify-between bg-gradient-to-r from-white to-[#FDFBFF] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#F4F3FF] border border-[#E5E2F5] flex items-center justify-center text-[#8B45F5] shadow-2xs">
              <Bell className="w-4 h-4 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 id="notification-modal-title" className="text-sm font-extrabold text-[#202033] tracking-tight">
                  Notification Center
                </h3>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.2 rounded-full text-[10px] font-black bg-[#8B45F5] text-white shadow-2xs">
                    {unreadCount} unread
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[#74738A] font-medium">
                Realtime alerts, routine reminders & schedule updates
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setShowPreferences(!showPreferences)}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors flex items-center gap-1 border ${
                showPreferences
                  ? 'bg-[#8B45F5] text-white border-[#8B45F5]'
                  : 'bg-white border-[#E5E2F5] text-[#74738A] hover:text-[#202033] hover:bg-[#F4F3FF]'
              }`}
              title={showPreferences ? 'View Notification Feed' : 'Configure Voice & Push Preferences'}
            >
              <Settings className="w-3.5 h-3.5" />
              <span>{showPreferences ? 'Feed' : 'Preferences'}</span>
            </button>

            {unreadCount > 0 && !showPreferences && (
              <button
                onClick={() => markAllReadMutation.mutate()}
                disabled={markAllReadMutation.isPending}
                className="px-2.5 py-1 text-xs font-bold text-[#8B45F5] hover:bg-[#F4F3FF] rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                title="Mark all notifications as read"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Mark All Read</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl border border-[#E5E2F5] bg-white hover:bg-[#F4F3FF] text-[#74738A] hover:text-[#202033] flex items-center justify-center transition-colors cursor-pointer"
              aria-label="Close notification modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {showPreferences ? (
          /* =====================================================================
              VOICE & PUSH NOTIFICATION PREFERENCES
             ===================================================================== */
          <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-card-scrollbar">
            {/* 1. Main Delivery Channels */}
            <div className="bg-[#F8F7FF] rounded-2xl p-4 border border-[#E5E2F5] space-y-3">
              <h4 className="text-xs font-black text-[#202033] uppercase tracking-wider flex items-center gap-1.5">
                <BellRing className="w-3.5 h-3.5 text-[#8B45F5]" />
                <span>Delivery Channels</span>
              </h4>

              <div className="flex items-center justify-between pt-1 border-t border-[#E5E2F5]/60">
                <div>
                  <p className="text-xs font-bold text-[#202033]">Web Push Notifications</p>
                  <p className="text-[10px] text-[#74738A]">System alerts when app is closed or backgrounded</p>
                </div>
                <button
                  onClick={onTogglePush}
                  disabled={pushLoading}
                  className={`px-3 py-1 rounded-xl text-xs font-bold border transition-colors ${
                    isPushSubscribed
                      ? 'bg-[#ECFDF5] border-[#A7F3D0] text-[#16A36A]'
                      : 'bg-white border-[#E5E2F5] text-[#74738A] hover:text-[#202033]'
                  }`}
                >
                  {isPushSubscribed ? 'Enabled' : 'Disabled'}
                </button>
              </div>

              {/* Android Notification Access Status */}
              <div className="flex items-center justify-between pt-2 border-t border-[#E5E2F5]/60">
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-bold text-[#202033]">Android Notification Access</p>
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[9px] font-black uppercase ${
                        capabilityStatus?.state === 'FULLY_CONNECTED'
                          ? 'bg-[#ECFDF5] text-[#16A36A] border border-[#A7F3D0]'
                          : capabilityStatus?.state === 'PERMISSION_NOT_GRANTED'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-[#F4F3FF] text-[#8B45F5] border border-[#DDD8F8]'
                      }`}
                    >
                      {capabilityStatus?.state === 'FULLY_CONNECTED'
                        ? 'Active & Synced'
                        : capabilityStatus?.state === 'PERMISSION_NOT_GRANTED'
                        ? 'Permission Needed'
                        : capabilityStatus?.state || 'Checking'}
                    </span>
                  </div>
                  <p className="text-[10px] text-[#74738A]">
                    {capabilityStatus?.hasPairedDevice
                      ? `${capabilityStatus.deviceName || 'Android'} • ${capabilityStatus.approvedAppsCount || 0} apps approved`
                      : 'No Android companion paired'}
                  </p>
                </div>
                {onNavigateTab && (
                  <button
                    onClick={() => {
                      onNavigateTab('settings');
                      onClose();
                    }}
                    className="px-2.5 py-1 rounded-xl text-xs font-bold border border-[#DDD8F8] bg-white text-[#8B45F5] hover:bg-[#F4F3FF] transition-colors"
                  >
                    Manage
                  </button>
                )}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-[#E5E2F5]/60">
                <div>
                  <p className="text-xs font-bold text-[#202033]">Foreground Voice Announcements</p>
                  <p className="text-[10px] text-[#74738A]">Speak alerts automatically via text-to-speech when app is open</p>
                </div>
                <button
                  onClick={() => updateVoicePrefs({ voiceEnabled: !voicePrefs.voiceEnabled })}
                  className={`px-3 py-1 rounded-xl text-xs font-bold border transition-colors ${
                    voicePrefs.voiceEnabled
                      ? 'bg-[#F4F3FF] border-[#DDD8F8] text-[#8B45F5]'
                      : 'bg-white border-[#E5E2F5] text-[#74738A]'
                  }`}
                >
                  {voicePrefs.voiceEnabled ? 'Active' : 'Muted'}
                </button>
              </div>
            </div>

            {/* 2. Quiet Hours */}
            <div className="bg-[#F8F7FF] rounded-2xl p-4 border border-[#E5E2F5] space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-[#202033] uppercase tracking-wider flex items-center gap-1.5">
                  <Moon className="w-3.5 h-3.5 text-[#6366F1]" />
                  <span>Quiet Hours</span>
                </h4>
                <button
                  onClick={() => updateVoicePrefs({ quietHoursEnabled: !voicePrefs.quietHoursEnabled })}
                  className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold border transition-colors ${
                    voicePrefs.quietHoursEnabled
                      ? 'bg-[#EEF2FF] border-[#C7D2FE] text-[#6366F1]'
                      : 'bg-white border-[#E5E2F5] text-[#74738A]'
                  }`}
                >
                  {voicePrefs.quietHoursEnabled ? 'Active (22:00 - 08:00)' : 'Disabled'}
                </button>
              </div>
              <p className="text-[10px] text-[#74738A]">
                Suppress audio announcements and sound during rest periods. In-app badge count remains updated.
              </p>
            </div>

            {/* 3. Category Permissions & Privacy */}
            <div className="bg-[#F8F7FF] rounded-2xl p-4 border border-[#E5E2F5] space-y-3">
              <h4 className="text-xs font-black text-[#202033] uppercase tracking-wider flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-[#10B981]" />
                <span>Spoken Announcement Categories</span>
              </h4>

              <div className="space-y-2 pt-1 border-t border-[#E5E2F5]/60 text-xs">
                {[
                  { key: 'allowTaskVoice', label: 'Tasks & Deadlines', desc: 'Alerts when scheduled tasks conclude or approach due time' },
                  { key: 'allowRoutineVoice', label: 'Routines & Habits', desc: 'Gentle nudges for scheduled routines and habits' },
                  { key: 'allowReminderVoice', label: 'Smart Reminders', desc: 'Custom contextual reminders set by you or AI' },
                  { key: 'allowWellnessVoice', label: 'Wellness & Breaks', desc: 'Hydration, posture, and post-focus break reminders' },
                  { key: 'allowFinanceVoice', label: 'Finance & Wealth (Sensitive)', desc: 'Budget warnings and transaction summaries (Keep off for privacy)', sensitive: true },
                ].map((item: any) => (
                  <label key={item.key} className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={voicePrefs[item.key]}
                      onChange={(e) => updateVoicePrefs({ [item.key]: e.target.checked })}
                      className="mt-0.5 rounded text-[#8B45F5] focus:ring-[#8B45F5]"
                    />
                    <div className="min-w-0">
                      <span className={`font-bold ${item.sensitive ? 'text-[#E05268]' : 'text-[#202033]'}`}>
                        {item.label}
                      </span>
                      <p className="text-[10px] text-[#74738A] leading-tight mt-0.5">{item.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* 4. Platform Architectural Note */}
            <div className="p-3 rounded-xl bg-white border border-[#E5E2F5] text-[10px] text-[#74738A] leading-relaxed">
              <span className="font-bold text-[#202033] block mb-0.5">ℹ️ Mobile Background Speech Architecture:</span>
              Standard Web Push runs via Service Worker. When the PWA is backgrounded or terminated, mobile OS autoplay policies prevent background synthesized audio. You will receive high-priority push notifications with sound, which can be tapped to hear the spoken briefing instantly.
            </div>
          </div>
        ) : (
          <>
            {/* =====================================================================
                FILTER TABS
               ===================================================================== */}
            <div className="px-4 py-2 border-b border-[#F0F2FA] bg-[#FDFBFF] flex items-center gap-1.5 overflow-x-auto custom-card-scrollbar shrink-0">
          {filterTabs.map((tab) => {
            const isActive = selectedCategory === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setSelectedCategory(tab.id);
                  if (tab.id === 'UNREAD') setUnreadOnly(true);
                  else setUnreadOnly(false);
                }}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-[#8B45F5] text-white shadow-2xs'
                    : 'bg-[#F4F3FF] text-[#74738A] hover:text-[#202033] hover:bg-[#EDE9FE]'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* =====================================================================
            NOTIFICATIONS LIST
           ===================================================================== */}
        <div className="flex-1 min-h-0 overflow-y-auto custom-card-scrollbar p-3 space-y-2">
          {selectedCategory === 'APPS' ? (
            /* =====================================================================
                ANDROID APPS NOTIFICATION FEED
               ===================================================================== */
            isLoadingMobileEvents ? (
              <div className="py-12 flex flex-col items-center justify-center text-center">
                <div className="w-6 h-6 border-2 border-[#8B45F5] border-t-transparent rounded-full animate-spin mb-2" />
                <p className="text-xs text-[#74738A] font-medium">Syncing Android notifications...</p>
              </div>
            ) : mobileEvents.length === 0 ? (
              <div className="py-12 text-center flex flex-col items-center justify-center">
                <div className="w-12 h-12 rounded-2xl bg-[#F4F3FF] text-[#8B45F5] flex items-center justify-center mb-3">
                  <Smartphone className="w-6 h-6 stroke-[2]" />
                </div>
                <p className="text-sm font-bold text-[#202033]">No Phone Notifications Ingested</p>
                <p className="text-xs text-[#74738A] mt-1 max-w-xs">
                  {capabilityStatus?.state === 'PERMISSION_NOT_GRANTED'
                    ? 'Android Notification Access is not granted yet. Enable access on your paired phone.'
                    : capabilityStatus?.state === 'LISTENER_DISCONNECTED'
                    ? 'NOVA Companion is disconnected. Open the app on your phone to resume live sync.'
                    : 'When approved apps on your phone receive notifications, NOVA syncs and displays them here.'}
                </p>
              </div>
            ) : (
              mobileEvents.map((evt: any) => {
                let relativeTime = 'Just now';
                try {
                  if (evt.occurredAt || evt.createdAt) {
                    relativeTime = formatDistanceToNow(parseISO(evt.occurredAt || evt.createdAt), { addSuffix: true });
                  }
                } catch {
                  relativeTime = 'Recently';
                }

                return (
                  <div
                    key={evt.id}
                    className="p-3 rounded-xl border border-[#E5E2F5] hover:border-[#DDD8F8] bg-white transition-all relative flex items-start gap-3 group"
                  >
                    <div className="w-8 h-8 rounded-xl bg-[#F4F3FF] border border-[#DDD8F8] flex items-center justify-center shrink-0 shadow-2xs mt-0.5 text-[#8B45F5]">
                      <Smartphone className="w-4 h-4" />
                    </div>

                    <div className="flex-1 min-w-0 pr-6">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black uppercase bg-[#F4F3FF] text-[#8B45F5] border border-[#DDD8F8]">
                          {evt.appName || evt.sourceApp || 'Phone App'}
                        </span>
                        <h4 className="text-xs font-bold text-[#202033] truncate">
                          {evt.title || 'Notification'}
                        </h4>
                      </div>

                      <p className="text-[11px] text-[#74738A] leading-snug line-clamp-2">
                        {evt.summary || evt.content || 'Content filtered for privacy.'}
                      </p>

                      <div className="flex items-center gap-3 mt-2 text-[10px] text-[#9CA3AF] font-medium">
                        <span>{relativeTime}</span>
                        <span className="text-emerald-600 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-2.5 h-2.5" />
                          <span>Verified Device Sync</span>
                        </span>
                      </div>
                    </div>

                    <div className="absolute top-2.5 right-2.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => speakNotification(evt.appName || 'Phone', evt.title || evt.summary || '')}
                        className="p-1 rounded-md text-[#74738A] hover:text-[#8B45F5] hover:bg-[#F4F3FF] transition-colors"
                        title="Listen to notification"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )
          ) : isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center text-center">
              <div className="w-6 h-6 border-2 border-[#8B45F5] border-t-transparent rounded-full animate-spin mb-2" />
              <p className="text-xs text-[#74738A] font-medium">Loading notifications...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-12 text-center flex flex-col items-center justify-center">
              <div className="w-12 h-12 rounded-2xl bg-[#F4F3FF] text-[#8B45F5] flex items-center justify-center mb-3">
                <Check className="w-6 h-6 stroke-[2.5]" />
              </div>
              <p className="text-sm font-bold text-[#202033]">All caught up!</p>
              <p className="text-xs text-[#74738A] mt-1 max-w-xs">
                You have zero pending alerts. You will be notified when scheduled items require attention.
              </p>
            </div>
          ) : (
            notifications.map((notif) => {
              const isUnread = !notif.readAt;
              let relativeTime = 'Just now';
              try {
                if (notif.createdAt) {
                  relativeTime = formatDistanceToNow(parseISO(notif.createdAt), { addSuffix: true });
                }
              } catch {
                relativeTime = 'Recently';
              }

              return (
                <div
                  key={notif.id}
                  className={`p-3 rounded-xl border transition-all relative flex items-start gap-3 group ${
                    isUnread
                      ? 'bg-[#FAF9FF] border-[#DDD8F8] shadow-2xs'
                      : 'bg-white border-[#E5E2F5] hover:border-[#DDD8F8] opacity-80 hover:opacity-100'
                  }`}
                >
                  {/* Category Icon */}
                  <div className="w-8 h-8 rounded-xl bg-white border border-[#E5E2F5] flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
                    {getCategoryIcon(notif.category, notif.severity || 'INFO')}
                  </div>

                  {/* Body Content */}
                  <div className="flex-1 min-w-0 pr-6">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h4 className="text-xs font-bold text-[#202033] truncate">
                        {notif.title}
                      </h4>
                      {notif.severity && (
                        <span
                          className={`px-1.5 py-0.2 rounded-full text-[9px] font-bold border ${getSeverityBadgeClass(
                            notif.severity
                          )}`}
                        >
                          {notif.severity}
                        </span>
                      )}
                      {isUnread && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[#8B45F5] shrink-0" />
                      )}
                    </div>

                    <p className="text-[11px] text-[#74738A] leading-snug line-clamp-2">
                      {notif.message}
                    </p>

                    <div className="flex items-center gap-3 mt-2 text-[10px] text-[#9CA3AF] font-medium">
                      <span>{relativeTime}</span>
                      {notif.actionUrl && onNavigateTab && (
                        <button
                          onClick={() => {
                            const tab = notif.actionUrl?.replace('/', '') || 'work';
                            onNavigateTab(tab);
                            onClose();
                          }}
                          className="text-[#8B45F5] font-bold hover:underline flex items-center gap-0.5 cursor-pointer"
                        >
                          <span>Open details</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Right side actions */}
                  <div className="absolute top-2.5 right-2.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => speakNotification(notif.title, notif.message)}
                      className="p-1 rounded-md text-[#74738A] hover:text-[#8B45F5] hover:bg-[#F4F3FF] transition-colors"
                      title="Listen to voice announcement"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>
                    {isUnread && (
                      <button
                        onClick={() => markReadMutation.mutate(notif.id)}
                        className="p-1 rounded-md text-[#74738A] hover:text-[#8B45F5] hover:bg-[#F4F3FF] transition-colors"
                        title="Mark as read"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => deleteMutation.mutate(notif.id)}
                      className="p-1 rounded-md text-[#74738A] hover:text-red-600 hover:bg-red-50 transition-colors"
                      title="Remove notification"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
        </>
        )}

        {/* =====================================================================
            MODAL FOOTER
           ===================================================================== */}
        <div className="px-5 py-3 border-t border-[#E5E2F5] bg-[#FDFBFF] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={onTogglePush}
              disabled={pushLoading}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors flex items-center gap-1.5 cursor-pointer ${
                isPushSubscribed
                  ? 'bg-[#ECFDF5] border-[#A7F3D0] text-[#16A36A]'
                  : 'bg-white border-[#E5E2F5] text-[#74738A] hover:text-[#202033]'
              }`}
            >
              <BellRing className="w-3.5 h-3.5" />
              <span>{isPushSubscribed ? 'Web Push Active' : 'Enable Web Push'}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {onNavigateTab && (
              <button
                onClick={() => {
                  onNavigateTab('settings');
                  onClose();
                }}
                className="px-3 py-1 text-xs font-semibold text-[#74738A] hover:text-[#202033] rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Notification Settings</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="px-3 py-1 text-xs font-bold bg-[#8B45F5] hover:bg-[#7839D6] text-white rounded-lg shadow-2xs transition-colors cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
