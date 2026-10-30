'use client';

import React from 'react';
import { AlertTriangle, X, ShieldAlert } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm Action',
  cancelLabel = 'Cancel',
  isDestructive = false,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/45 backdrop-blur-md animate-in fade-in duration-150">
      <div className="glass-panel max-w-md w-full bg-white/95 backdrop-blur-2xl rounded-3xl border border-white/80 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div
          className={`flex items-center justify-between px-6 py-4 text-white border-b ${
            isDestructive
              ? 'bg-gradient-to-r from-rose-600 to-red-600 border-rose-400/40'
              : 'glass-dark border-white/10'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {isDestructive ? (
              <AlertTriangle className="w-5 h-5 text-white animate-pulse" />
            ) : (
              <ShieldAlert className="w-5 h-5 text-sky-400" />
            )}
            <h3 className="font-extrabold text-base tracking-tight text-white">{title}</h3>
          </div>
          <button
            onClick={onCancel}
            disabled={loading}
            className="p-1.5 rounded-xl hover:bg-white/15 transition-all text-white/80 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
            {message}
          </p>

          <div className="flex items-center justify-end gap-2.5 mt-6 pt-4 border-t border-slate-200/60">
            <button
              type="button"
              disabled={loading}
              onClick={onCancel}
              className="px-4 py-2 text-xs font-bold text-slate-600 glass-card hover:border-slate-300 rounded-xl transition-all"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={onConfirm}
              className={`px-5 py-2 text-xs font-bold text-white rounded-xl shadow-xs transition-all flex items-center gap-2 ${
                isDestructive
                  ? 'bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 shadow-glass-glow-rose'
                  : 'bg-assistant-navy hover:bg-slate-800'
              }`}
            >
              {loading ? 'Processing...' : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
