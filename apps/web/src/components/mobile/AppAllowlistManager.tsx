'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Smartphone,
  Shield,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Lock,
  ExternalLink,
  Info,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { toast } from '@/components/Toast';

export interface DiscoveredAppEntry {
  packageName: string;
  appName: string;
  isApproved: boolean;
  isSecurityBlocked: boolean;
  category: string;
}

interface AppAllowlistManagerProps {
  onOpenSettings?: () => void;
}

export function AppAllowlistManager({ onOpenSettings }: AppAllowlistManagerProps) {
  const [apps, setApps] = useState<DiscoveredAppEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'APPROVED' | 'UNAPPROVED' | 'BLOCKED'>('ALL');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isNativeBridgeAvailable, setIsNativeBridgeAvailable] = useState<boolean>(false);

  // Fetch backend capability status for server-side verification
  const { data: capabilityStatus, refetch: refetchCapability } = useQuery({
    queryKey: ['mobile-capability-status'],
    queryFn: () => api.getMobileCapabilityStatus(),
    refetchInterval: 15000,
  });

  const loadDiscoveredApps = () => {
    if (typeof window !== 'undefined' && (window as any).NovaAndroidBridge?.getInstalledEligibleApps) {
      setIsNativeBridgeAvailable(true);
      try {
        setIsRefreshing(true);
        const raw = (window as any).NovaAndroidBridge.getInstalledEligibleApps();
        const parsed: DiscoveredAppEntry[] = JSON.parse(raw);
        setApps(parsed);
      } catch (err) {
        console.error('Failed to load apps from native bridge:', err);
        toast.error('Discovery Error', 'Unable to retrieve installed applications from Android');
      } finally {
        setIsRefreshing(false);
      }
    } else {
      setIsNativeBridgeAvailable(false);
    }
  };

  useEffect(() => {
    loadDiscoveredApps();
  }, []);

  const handleToggleApproval = (packageName: string, currentApproved: boolean) => {
    if (typeof window !== 'undefined' && (window as any).NovaAndroidBridge?.setAppApproval) {
      const success = (window as any).NovaAndroidBridge.setAppApproval(packageName, !currentApproved);
      if (success) {
        setApps((prev) =>
          prev.map((a) => (a.packageName === packageName ? { ...a, isApproved: !currentApproved } : a))
        );
        refetchCapability();
        toast.success(
          !currentApproved ? 'Application Approved' : 'Approval Revoked',
          `${packageName} notification capture ${!currentApproved ? 'enabled' : 'disabled'}`
        );
      } else {
        toast.error('Security Exclusion', 'Mandatory security exclusions (Banking, UPI, Authenticator) cannot be approved.');
      }
    }
  };

  const handleOpenAndroidSettings = () => {
    if (typeof window !== 'undefined' && (window as any).NovaAndroidBridge?.openNotificationAccessSettings) {
      (window as any).NovaAndroidBridge.openNotificationAccessSettings();
    } else {
      toast.info('Mobile Companion', 'Please open Android Settings > Notification Access on your device.');
    }
  };

  const categories = useMemo(() => {
    const set = new Set<string>();
    apps.forEach((a) => {
      if (a.category && a.category !== 'OTHER' && a.category !== 'SECURITY_EXCLUDED') {
        set.add(a.category);
      }
    });
    return Array.from(set).sort();
  }, [apps]);

  const filteredApps = useMemo(() => {
    return apps.filter((app) => {
      // 1. Search Query
      const query = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !query ||
        app.appName.toLowerCase().includes(query) ||
        app.packageName.toLowerCase().includes(query);

      // 2. Category Filter
      const matchesCategory =
        selectedCategory === 'ALL' || app.category === selectedCategory;

      // 3. Status Filter
      const matchesStatus =
        statusFilter === 'ALL'
          ? true
          : statusFilter === 'APPROVED'
          ? app.isApproved
          : statusFilter === 'UNAPPROVED'
          ? !app.isApproved && !app.isSecurityBlocked
          : app.isSecurityBlocked;

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [apps, searchQuery, selectedCategory, statusFilter]);

  const approvedCount = apps.filter((a) => a.isApproved).length;
  const blockedCount = apps.filter((a) => a.isSecurityBlocked).length;

  return (
    <div className="space-y-6">
      {/* SECTION 1 & 2: DEVICE CONNECTION & NOTIFICATION ACCESS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Device Connection Card */}
        <div className="p-5 rounded-2xl bg-white border border-[#E5E2F5] shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#F4F3FF] border border-[#DDD8F8] flex items-center justify-center text-[#8B45F5]">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-black text-[#202033] uppercase tracking-wider">Device Connection</h4>
                <p className="text-[11px] text-[#74738A]">
                  {capabilityStatus?.hasPairedDevice
                    ? capabilityStatus.deviceName || 'Android Companion'
                    : 'No device paired'}
                </p>
              </div>
            </div>
            <span
              className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                capabilityStatus?.hasPairedDevice
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}
            >
              {capabilityStatus?.hasPairedDevice ? 'Paired & Active' : 'Unpaired'}
            </span>
          </div>

          <p className="text-xs text-[#74738A]">
            {capabilityStatus?.hasPairedDevice
              ? `Paired Android device receives, sanitizes, and streams notifications to your personal operating environment.`
              : `To pair, open the NOVA application on your Android phone and sign in with your credentials.`}
          </p>
        </div>

        {/* Notification Access Card */}
        <div className="p-5 rounded-2xl bg-white border border-[#E5E2F5] shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#F4F3FF] border border-[#DDD8F8] flex items-center justify-center text-[#8B45F5]">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-black text-[#202033] uppercase tracking-wider">Notification Access</h4>
                <p className="text-[11px] text-[#74738A]">Android OS Listener Permission</p>
              </div>
            </div>
            <span
              className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                capabilityStatus?.isPermissionGranted
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}
            >
              {capabilityStatus?.isPermissionGranted ? 'Granted' : 'Permission Required'}
            </span>
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-[#74738A]">
              {capabilityStatus?.isListenerConnected ? 'Listener active in background' : 'Listener standby'}
            </span>
            {isNativeBridgeAvailable && (
              <button
                onClick={handleOpenAndroidSettings}
                className="px-3 py-1.5 rounded-xl bg-[#8B45F5] hover:bg-[#7839D6] text-white text-xs font-bold transition-colors flex items-center gap-1.5 shadow-2xs"
              >
                <span>OS Settings</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* SECTION 3: INSTALLED APP ALLOWLIST */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white border border-[#E5E2F5] shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E5E2F5]">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-extrabold text-[#202033] tracking-tight">
                Installed App Allowlist
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-[#F4F3FF] text-[#8B45F5] border border-[#DDD8F8]">
                {approvedCount} Approved
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-red-50 text-red-700 border border-red-200">
                {blockedCount} Excluded
              </span>
            </div>
            <p className="text-xs text-[#74738A] mt-0.5">
              Privacy-first control: Choose exactly which applications NOVA is permitted to observe.
            </p>
          </div>

          <button
            onClick={loadDiscoveredApps}
            disabled={isRefreshing}
            className="self-start sm:self-auto px-3 py-1.5 rounded-xl border border-[#E5E2F5] hover:border-[#DDD8F8] bg-white text-xs font-bold text-[#74738A] hover:text-[#202033] transition-colors flex items-center gap-1.5"
            title="Scan installed applications on phone"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#8B45F5]' : ''}`} />
            <span>Refresh Apps</span>
          </button>
        </div>

        {/* Browser Fallback State when not running inside Android APK */}
        {!isNativeBridgeAvailable ? (
          <div className="py-12 px-6 rounded-xl border border-dashed border-[#E5E2F5] bg-[#FDFBFF] text-center flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-2xl bg-[#F4F3FF] text-[#8B45F5] flex items-center justify-center mb-3">
              <Smartphone className="w-6 h-6 stroke-[2]" />
            </div>
            <h4 className="text-sm font-bold text-[#202033]">Android Companion Required</h4>
            <p className="text-xs text-[#74738A] max-w-md mt-1 mb-4">
              Connect NOVA Android Companion on your physical device to dynamically manage installed applications, allowlist permissions, and live notification capture.
            </p>
            {capabilityStatus?.hasPairedDevice && (
              <div className="p-3 rounded-lg bg-white border border-[#E5E2F5] text-xs text-[#74738A] max-w-sm">
                <span className="font-bold text-[#202033] block mb-0.5">Server Verified Companion:</span>
                Device: <strong className="text-[#202033]">{capabilityStatus.deviceName}</strong> • Last Sync:{' '}
                {capabilityStatus.lastSyncAt ? new Date(capabilityStatus.lastSyncAt).toLocaleString() : 'Recent'}
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Search & Filter Toolbar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#74738A]" />
                <input
                  type="text"
                  placeholder="Search installed applications..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-[#E5E2F5] rounded-xl focus:outline-none focus:border-[#8B45F5]"
                />
              </div>

              {/* Status Filter Buttons */}
              <div className="flex items-center gap-1 overflow-x-auto custom-card-scrollbar">
                {[
                  { id: 'ALL', label: 'All' },
                  { id: 'APPROVED', label: 'Approved' },
                  { id: 'UNAPPROVED', label: 'Pending' },
                  { id: 'BLOCKED', label: 'Excluded' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setStatusFilter(tab.id as any)}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors whitespace-nowrap ${
                      statusFilter === tab.id
                        ? 'bg-[#8B45F5] text-white shadow-2xs'
                        : 'bg-[#F4F3FF] text-[#74738A] hover:text-[#202033]'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Category Filter Pills */}
            {categories.length > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto custom-card-scrollbar pb-1">
                <button
                  onClick={() => setSelectedCategory('ALL')}
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold border transition-colors ${
                    selectedCategory === 'ALL'
                      ? 'bg-[#8B45F5] text-white border-[#8B45F5]'
                      : 'bg-white text-[#74738A] border-[#E5E2F5]'
                  }`}
                >
                  All Categories
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold border transition-colors whitespace-nowrap ${
                      selectedCategory === cat
                        ? 'bg-[#8B45F5] text-white border-[#8B45F5]'
                        : 'bg-white text-[#74738A] border-[#E5E2F5]'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}

            {/* Applications List */}
            <div className="border border-[#E5E2F5] rounded-xl overflow-hidden divide-y divide-[#E5E2F5] max-h-96 overflow-y-auto custom-card-scrollbar">
              {filteredApps.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#74738A]">
                  No applications match your filter criteria.
                </div>
              ) : (
                filteredApps.map((app) => (
                  <div
                    key={app.packageName}
                    className="p-3 sm:p-3.5 flex items-center justify-between hover:bg-[#FDFBFF] transition-colors gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-bold text-[#202033] truncate">{app.appName}</span>
                        <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black uppercase bg-[#F4F3FF] text-[#74738A]">
                          {app.category}
                        </span>
                      </div>
                      <p className="text-[10px] text-[#74738A] truncate font-mono">{app.packageName}</p>
                    </div>

                    <div className="shrink-0 flex items-center gap-2">
                      {app.isSecurityBlocked ? (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-50 border border-red-200 text-red-700 text-[10px] font-bold">
                          <Lock className="w-3 h-3 text-red-600" />
                          <span>Security Excluded</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleToggleApproval(app.packageName, app.isApproved)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                            app.isApproved
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100'
                              : 'bg-[#F4F3FF] text-[#8B45F5] border border-[#DDD8F8] hover:bg-[#EDE9FE]'
                          }`}
                        >
                          {app.isApproved ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Approved</span>
                            </>
                          ) : (
                            <span>Enable</span>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>

      {/* SECTION 4 & 5: NOTIFICATION SYNCHRONIZATION & PRIVACY POLICY */}
      <div className="p-4 rounded-xl bg-[#F8F7FF] border border-[#E5E2F5] space-y-2 text-xs text-[#74738A]">
        <h4 className="font-bold text-[#202033] flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-[#8B45F5]" />
          <span>Security & Synchronization Architecture</span>
        </h4>
        <p className="leading-relaxed">
          Approved notifications are sanitized on-device in real-time (redacting OTPs, verification PINs, and payment card numbers). Sanitized events are persisted locally in a Room database and dispatched to the backend via WorkManager with network constraints and 60-second duplicate suppression. Banking and UPI applications remain permanently excluded by native policy.
        </p>
      </div>
    </div>
  );
}
