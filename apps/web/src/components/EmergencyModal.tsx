'use client';

import React, { useState } from 'react';
import { AlertOctagon, X, Clock, AlertTriangle, ArrowRight, CheckCircle2, ShieldCheck } from 'lucide-react';
import { format } from 'date-fns';

interface EmergencyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    title: string;
    description?: string;
    estimatedDurationMinutes: number;
    deadline?: string;
    bufferMinutes: number;
  }) => Promise<any>;
}

export function EmergencyModal({ isOpen, onClose, onSubmit }: EmergencyModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [deadline, setDeadline] = useState('');
  const [bufferMinutes, setBufferMinutes] = useState(10);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<any | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      setLoading(true);
      setErrorMessage(null);
      const res = await onSubmit({
        title: title.trim(),
        description: description.trim() || undefined,
        estimatedDurationMinutes: Number(durationMinutes),
        deadline: deadline ? new Date(deadline).toISOString() : undefined,
        bufferMinutes: Number(bufferMinutes),
      });
      setResult(res);
    } catch (err: any) {
      setErrorMessage(err.message || 'Emergency replanning error');
    } finally {
      setLoading(false);
    }
  };

  const handleDone = () => {
    setResult(null);
    setTitle('');
    setDescription('');
    setErrorMessage(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-md animate-in fade-in duration-150">
      <div className="glass-panel max-w-lg w-full bg-white/90 backdrop-blur-2xl rounded-3xl border border-white/80 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-rose-600 via-rose-500 to-red-600 text-white border-b border-rose-400/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shadow-inner">
              <AlertOctagon className="w-5 h-5 text-white animate-pulse" />
            </div>
            <div>
              <h3 className="font-extrabold text-base tracking-tight">Emergency Schedule Replanner</h3>
              <p className="text-[11px] text-rose-100 font-medium">Automatic Conflict Solver</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-white/20 transition-all text-white/90 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMessage && (
          <div className="m-4 p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 font-bold flex items-center gap-2">
            <span>⚠️</span>
            <span>{errorMessage}</span>
          </div>
        )}

        {!result ? (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-300/40 flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <p className="text-xs text-rose-900 leading-relaxed font-medium">
                Injecting an emergency immediately shifts flexible tasks to the earliest feasible slots while
                strictly preserving hard appointments and appointments marked as FIXED.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Emergency Title *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Production Hotfix, Urgent Server Downtime, Family Emergency..."
                className="w-full px-3.5 py-2.5 text-sm font-bold glass-input rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Duration (Minutes)
                </label>
                <input
                  type="number"
                  min="15"
                  step="15"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Number(e.target.value))}
                  className="w-full px-3.5 py-2 text-xs font-semibold glass-input rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Recovery Buffer (Mins)
                </label>
                <input
                  type="number"
                  min="0"
                  step="5"
                  value={bufferMinutes}
                  onChange={(e) => setBufferMinutes(Number(e.target.value))}
                  className="w-full px-3.5 py-2 text-xs font-semibold glass-input rounded-xl"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Deadline (Optional)
              </label>
              <input
                type="datetime-local"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full px-3.5 py-2 text-xs glass-input rounded-xl"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Context & Notes (Optional)
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Details of the unexpected emergency..."
                className="w-full px-3.5 py-2 text-xs glass-input rounded-xl"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200/60">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-slate-600 glass-card hover:border-slate-300 rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 rounded-xl transition-all shadow-glass-glow-rose disabled:opacity-50"
              >
                {loading ? 'Replanning Schedule...' : '🚨 Trigger & Replan'}
              </button>
            </div>
          </form>
        ) : (
          <div className="p-6 space-y-4">
            <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-300/60 flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
              <div>
                <h4 className="text-sm font-bold text-emerald-900">Emergency Replanning Complete</h4>
                <p className="text-xs text-emerald-700">
                  Plan updated to Version {result.planVersion || 2}. Flexible tasks have been safe-shifted.
                </p>
              </div>
            </div>

            {result.changes && result.changes.length > 0 && (
              <div>
                <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Adjusted Schedule Items ({result.changes.length})
                </h5>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {result.changes.map((c: any, i: number) => (
                    <div
                      key={i}
                      className="p-3 rounded-xl glass-card border border-white/90 text-xs flex items-center justify-between shadow-xs"
                    >
                      <span className="font-bold text-slate-800 truncate">{c.taskTitle || c.taskId}</span>
                      <span className="text-[11px] font-bold text-sky-600 flex items-center gap-1 shrink-0">
                        Shifted <ArrowRight className="w-3 h-3" /> {c.newStartTime ? format(new Date(c.newStartTime), 'h:mm a') : 'Later'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={handleDone}
              className="w-full py-2.5 text-xs font-bold text-white bg-assistant-navy hover:bg-slate-800 rounded-xl shadow-xs transition-all"
            >
              Done & View Updated Schedule
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
