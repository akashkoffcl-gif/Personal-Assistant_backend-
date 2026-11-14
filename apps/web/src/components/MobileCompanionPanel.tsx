'use client';

import React, { useState, useEffect } from 'react';
import { Smartphone, RefreshCw, Trash2, CheckCircle2, Clock } from 'lucide-react';
import { api } from '@/lib/api';

interface MobileDevice {
  id: string;
  deviceName: string;
  deviceModel: string;
  osVersion: string;
  appVersion: string;
  status: 'PENDING_PAIRING' | 'PAIRED' | 'REVOKED' | 'BLOCKED';
  lastSeenAt: string | null;
  createdAt: string;
  pushTokens?: { id: string; isActive: boolean }[];
  permissions?: { permissionKey: string; isGranted: boolean }[];
}

export function MobileCompanionPanel() {
  const [devices, setDevices] = useState<MobileDevice[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchDevices = async () => {
    try {
      setIsLoading(true);
      const data = await api.getMobileDevices();
      setDevices(data || []);
    } catch (err) {
      console.error('Failed to load paired devices:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  const handleRevoke = async (deviceId: string) => {
    if (!confirm('Are you sure you want to revoke this device? It will lose access to NOVA actions and notifications.')) return;
    try {
      await api.revokeMobileDevice(deviceId);
      await fetchDevices();
    } catch (err) {
      console.error('Failed to revoke device:', err);
    }
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-md">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-violet-600/20 text-violet-400 rounded-xl border border-violet-500/30">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
              Android JARVIS Companions
              <span className="text-xs px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20 font-medium">
                Phase 54
              </span>
            </h3>
            <p className="text-xs text-slate-400">Manage paired Android devices and native action permissions</p>
          </div>
        </div>
        <button
          onClick={fetchDevices}
          disabled={isLoading}
          className="p-2 text-slate-400 hover:text-slate-200 transition-colors"
          title="Refresh devices"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {devices.length === 0 ? (
        <div className="py-8 text-center border border-dashed border-slate-800 rounded-xl">
          <Smartphone className="w-8 h-8 text-slate-600 mx-auto mb-2" />
          <p className="text-sm text-slate-400 font-medium">No paired mobile companions</p>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            Install the NOVA Android Companion app on your phone to link notification intelligence and mobile actions.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {devices.map((device) => (
            <div
              key={device.id}
              className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/50 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-200">{device.deviceName}</span>
                    <span className="text-xs text-slate-400">({device.deviceModel})</span>
                    {device.status === 'PAIRED' && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded">
                        <CheckCircle2 className="w-3 h-3" /> Paired
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                    <span>Android {device.osVersion}</span>
                    <span>•</span>
                    <span>App v{device.appVersion}</span>
                    {device.lastSeenAt && (
                      <>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Last active {new Date(device.lastSeenAt).toLocaleTimeString()}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleRevoke(device.id)}
                  className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                  title="Revoke device"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
