'use client';

import React, { useState } from 'react';
import { AlertTriangle, X, ArrowRight, CheckCircle2, ShieldCheck } from 'lucide-react';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white max-w-lg w-full rounded-xl border border-slate-200 shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-red-50 text-red-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">Emergency Replanner</h3>
              <p className="text-[11px] text-slate-500">Safe schedule rearrangement</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {errorMessage && (
          <div className="m-4 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 font-semibold flex items-center gap-2">
            <span>⚠️</span>
            <span>{errorMessage}</span>
          </div>
        )}

        {!result ? (
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            <div className="p-3 rounded-lg bg-red-50/60 border border-red-200 flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <p className="text-xs text-red-900 leading-relaxed font-normal">
                Injecting an emergency immediately shifts flexible tasks forward while
                preserving all fixed appointments and commitments.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Emergency Task Title *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Production Hotfix, Urgent Server Downtime..."
                className="w-full px-3 py-2 text-xs font-semibold border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-red-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Duration (Minutes)
                </label>
                <input
                  type="number"
                  min="15"
                  step="15"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Buffer (Minutes)
                </label>
                <input
                  type="number"
                  min="0"
                  step="5"
                  value={bufferMinutes}
                  onChange={(e) => setBufferMinutes(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Deadline (Optional)
              </label>
              <input
                type="datetime-local"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Context & Notes (Optional)
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Details of the unexpected event..."
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600"
              />
            </div>

            <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors shadow-xs disabled:opacity-50"
              >
                {loading ? 'Replanning Schedule...' : 'Apply Emergency Replan'}
              </button>
            </div>
          </form>
        ) : (
          <div className="p-5 space-y-4">
            <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <h4 className="text-xs font-bold text-emerald-900">Emergency Replanning Complete</h4>
                <p className="text-xs text-emerald-700 mt-0.5">
                  Plan updated to Version {result.planVersion || 2}. Flexible tasks have been safely shifted.
                </p>
              </div>
            </div>

            {result.changes && result.changes.length > 0 && (
              <div>
                <h5 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Shifted Tasks ({result.changes.length})
                </h5>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {result.changes.map((c: any, i: number) => (
                    <div
                      key={i}
                      className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-xs flex items-center justify-between"
                    >
                      <span className="font-medium text-slate-800 truncate">{c.taskTitle || c.taskId}</span>
                      <span className="text-[11px] font-semibold text-blue-600 flex items-center gap-1 shrink-0">
                        Shifted <ArrowRight className="w-3 h-3" /> {c.newStartTime ? format(new Date(c.newStartTime), 'h:mm a') : 'Later'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={handleDone}
              className="w-full py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-xs"
            >
              Done & View Schedule
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
