'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Toaster as SonnerToaster, toast as sonnerToast } from 'sonner';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, Loader2 } from 'lucide-react';

// ============================================================================
// 1. TYPES & CONTRACTS
// ============================================================================
export type ToastType = 'success' | 'error' | 'warning' | 'info' | 'loading';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastOptions {
  id?: string | number;
  duration?: number;
  action?: ToastAction;
  cancel?: ToastAction;
  onDismiss?: () => void;
  onAutoClose?: () => void;
  className?: string;
  preventDuplicate?: boolean;
}

export interface ToastPromiseOptions<T> {
  loading: string;
  success: string | ((data: T) => string);
  error: string | ((error: any) => string);
  description?: string | ((data: T) => string);
  finally?: () => void;
}

// ============================================================================
// 2. DEDUPLICATION ENGINE
// ============================================================================
const recentToasts = new Map<string, number>();
const DEDUPE_WINDOW_MS = 1200;

function shouldDedupe(key: string): boolean {
  const now = Date.now();
  const lastTime = recentToasts.get(key);
  if (lastTime && now - lastTime < DEDUPE_WINDOW_MS) {
    return true;
  }
  recentToasts.set(key, now);
  // Housekeeping: remove old keys
  if (recentToasts.size > 50) {
    recentToasts.forEach((time, k) => {
      if (now - time > 10000) recentToasts.delete(k);
    });
  }
  return false;
}

// ============================================================================
// 3. UNIFIED GLOBAL TOAST API
// ============================================================================
export const toast = {
  success: (title: string, descriptionOrOptions?: string | ToastOptions, options?: ToastOptions) => {
    const isDesc = typeof descriptionOrOptions === 'string';
    const description = isDesc ? descriptionOrOptions : undefined;
    const opts = (isDesc ? options : descriptionOrOptions) || {};

    const dedupeKey = `success:${title}:${description || ''}`;
    if (opts.preventDuplicate !== false && shouldDedupe(dedupeKey)) return '';

    return sonnerToast.success(title, {
      description,
      duration: opts.duration || 4000,
      id: opts.id,
      action: opts.action,
      cancel: opts.cancel,
      onDismiss: opts.onDismiss,
      onAutoClose: opts.onAutoClose,
      icon: <CheckCircle2 className="w-4 h-4 text-[#16A36A] stroke-[2.4] shrink-0" />,
    });
  },

  error: (title: string, descriptionOrOptions?: string | ToastOptions, options?: ToastOptions) => {
    const isDesc = typeof descriptionOrOptions === 'string';
    const description = isDesc ? descriptionOrOptions : undefined;
    const opts = (isDesc ? options : descriptionOrOptions) || {};

    const dedupeKey = `error:${title}:${description || ''}`;
    if (opts.preventDuplicate !== false && shouldDedupe(dedupeKey)) return '';

    return sonnerToast.error(title, {
      description,
      duration: opts.duration || 5000,
      id: opts.id,
      action: opts.action,
      cancel: opts.cancel,
      onDismiss: opts.onDismiss,
      onAutoClose: opts.onAutoClose,
      icon: <AlertCircle className="w-4 h-4 text-[#E05268] stroke-[2.4] shrink-0" />,
    });
  },

  warning: (title: string, descriptionOrOptions?: string | ToastOptions, options?: ToastOptions) => {
    const isDesc = typeof descriptionOrOptions === 'string';
    const description = isDesc ? descriptionOrOptions : undefined;
    const opts = (isDesc ? options : descriptionOrOptions) || {};

    const dedupeKey = `warning:${title}:${description || ''}`;
    if (opts.preventDuplicate !== false && shouldDedupe(dedupeKey)) return '';

    return sonnerToast.warning(title, {
      description,
      duration: opts.duration || 4500,
      id: opts.id,
      action: opts.action,
      cancel: opts.cancel,
      onDismiss: opts.onDismiss,
      onAutoClose: opts.onAutoClose,
      icon: <AlertTriangle className="w-4 h-4 text-[#F59E0B] stroke-[2.4] shrink-0" />,
    });
  },

  info: (title: string, descriptionOrOptions?: string | ToastOptions, options?: ToastOptions) => {
    const isDesc = typeof descriptionOrOptions === 'string';
    const description = isDesc ? descriptionOrOptions : undefined;
    const opts = (isDesc ? options : descriptionOrOptions) || {};

    const dedupeKey = `info:${title}:${description || ''}`;
    if (opts.preventDuplicate !== false && shouldDedupe(dedupeKey)) return '';

    return sonnerToast.info(title, {
      description,
      duration: opts.duration || 4000,
      id: opts.id,
      action: opts.action,
      cancel: opts.cancel,
      onDismiss: opts.onDismiss,
      onAutoClose: opts.onAutoClose,
      icon: <Info className="w-4 h-4 text-[#8B45F5] stroke-[2.4] shrink-0" />,
    });
  },

  loading: (title: string, descriptionOrOptions?: string | ToastOptions, options?: ToastOptions) => {
    const isDesc = typeof descriptionOrOptions === 'string';
    const description = isDesc ? descriptionOrOptions : undefined;
    const opts = (isDesc ? options : descriptionOrOptions) || {};

    return sonnerToast.loading(title, {
      description,
      id: opts.id,
      action: opts.action,
      icon: <Loader2 className="w-4 h-4 text-[#8B45F5] animate-spin shrink-0" />,
    });
  },

  promise: <T,>(promise: Promise<T> | (() => Promise<T>), data: ToastPromiseOptions<T>) => {
    return sonnerToast.promise(promise, {
      loading: data.loading,
      success: data.success,
      error: data.error,
      finally: data.finally,
    });
  },

  dismiss: (toastId?: string | number) => {
    sonnerToast.dismiss(toastId);
  },
};

// ============================================================================
// 4. REACT CONTEXT & HOOK FOR SEAMLESS COMPONENT ACCESS
// ============================================================================
interface ToastContextValue {
  toast: typeof toast;
  success: (title: string, message?: string, options?: ToastOptions) => string | number;
  error: (title: string, message?: string, options?: ToastOptions) => string | number;
  warning: (title: string, message?: string, options?: ToastOptions) => string | number;
  info: (title: string, message?: string, options?: ToastOptions) => string | number;
  loading: (title: string, message?: string, options?: ToastOptions) => string | number;
  promise: typeof toast.promise;
  dismiss: typeof toast.dismiss;
}

const ToastContext = createContext<ToastContextValue>({
  toast,
  success: toast.success,
  error: toast.error,
  warning: toast.warning,
  info: toast.info,
  loading: toast.loading,
  promise: toast.promise,
  dismiss: toast.dismiss,
});

export function useToast() {
  return useContext(ToastContext);
}

// ============================================================================
// 5. GLOBAL TOAST PROVIDER & LAVENDER ENTERPRISE TOASTER
// ============================================================================
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [position, setPosition] = useState<'top-right' | 'top-center'>('top-right');

  // Dynamically adapt positioning: top-right on desktop, top-center on mobile
  useEffect(() => {
    function handleResize() {
      if (window.innerWidth < 640) {
        setPosition('top-center');
      } else {
        setPosition('top-right');
      }
    }
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const contextValue: ToastContextValue = {
    toast,
    success: toast.success,
    error: toast.error,
    warning: toast.warning,
    info: toast.info,
    loading: toast.loading,
    promise: toast.promise,
    dismiss: toast.dismiss,
  };

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <SonnerToaster
        position={position}
        expand={true}
        closeButton={true}
        visibleToasts={4}
        toastOptions={{
          style: {
            background: '#FFFFFF',
            border: '1px solid #E5E2F5',
            borderRadius: '18px',
            color: '#18181B',
            boxShadow: '0 12px 35px rgba(24, 27, 46, 0.08)',
            padding: '12px 16px',
            fontSize: '13px',
          },
          classNames: {
            toast: 'group lavender-enterprise-toast',
            title: 'text-xs sm:text-sm font-bold text-[#18181B] tracking-tight leading-snug',
            description: 'text-[11px] sm:text-xs text-[#717182] font-medium leading-relaxed mt-0.5',
            actionButton:
              'bg-[#18181B] hover:bg-black text-white text-[11px] font-bold px-3 py-1.5 rounded-xl transition-all shadow-2xs',
            cancelButton:
              'bg-[#F4F4FD] hover:bg-[#EBEBF5] text-[#717182] hover:text-[#18181B] text-[11px] font-semibold px-3 py-1.5 rounded-xl transition-all',
            closeButton:
              'bg-white hover:bg-[#F4F4FD] border border-[#E5E2F5] text-[#717182] hover:text-[#18181B] rounded-full p-1 transition-colors shadow-2xs',
          },
        }}
      />
    </ToastContext.Provider>
  );
}
