'use client';

import React, { useState } from 'react';
import { AlertOctagon, X, Clock, AlertTriangle, ArrowRight, CheckCircle2 } from 'lucide-react';
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
  const [result, setResult] = useState<any | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      setLoading(true);
      const res = await onSubmit({
        title,
        description,
        estimatedDurationMinutes: Number(durationMinutes),
        deadline: deadline ? new Date(deadline).toISOString() : undefined,
        bufferMinutes: Number(bufferMinutes),
      });
      setResult(res);
    } catch (err: any) {
      alert(`Emergency replanning error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDone = () => {
    setResult(null);
    setTitle('');
    setDescription('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-4 bg-assistant-red text-white">
          <div className="flex items-center gap-2.5">
            <AlertOctagon className="w-5 h-5 text-white" />
            <h3 className="font-bold text-base">Emergency Task & Schedule Replanning</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-red-800 transition-colors text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {!result ? (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <p className="text-xs text-assistant-coolGrey leading-relaxed">
              Injecting an emergency immediately shifts flexible tasks to the earliest feasible slots
              while strictly preserving fixed appointments.
            </p>

            <div>
              <label className="block text-xs font-semibold text-assistant-navy mb-1">
                Emergency Title *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Production Hotfix, Urgent Client Call..."
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-assistant-sky"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-assistant-navy mb-1">
                  Duration (Minutes)
                </label>
                <input
                  type="number"
                  min="5"
                  max="480"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-assistant-sky"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-assistant-navy mb-1">
                  Buffer (Minutes)
                </label>
                <input
                  type="number"
                  min="0"
                  max="60"
                  value={bufferMinutes}
                  onChange={(e) => setBufferMinutes(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-assistant-sky"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-assistant-navy mb-1">
                Hard Deadline (Optional)
              </label>
              <input
                type="datetime-local"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-assistant-sky"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-assistant-navy mb-1">
                Description / Context
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Details about the unexpected urgency..."
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-assistant-sky"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-assistant-coolGrey hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2 text-xs font-bold text-white bg-assistant-red hover:bg-red-700 rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
              >
                {loading ? 'Reorganizing Plan...' : 'Trigger Replanning'}
              </button>
            </div>
          </form>
        ) : (
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-2 text-assistant-green font-bold text-sm">
              <CheckCircle2 className="w-5 h-5 text-assistant-green" />
              <span>Schedule Successfully Reorganized (Plan v{result.planVersion})</span>
            </div>

            {/* Conflicts Warning */}
            {result.conflicts && result.conflicts.length > 0 && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800 mb-1">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>{result.conflicts.length} Unresolved Schedule Conflict(s)</span>
                </div>
                <ul className="text-xs text-amber-700 list-disc list-inside space-y-0.5">
                  {result.conflicts.map((c: any, idx: number) => (
                    <li key={idx}>{c.reason}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Changes Summary */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-assistant-navy">
                Affected Tasks ({result.scheduleChanges?.length || 0})
              </span>
              <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                {result.scheduleChanges?.map((ch: any, i: number) => (
                  <div
                    key={i}
                    className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs flex items-center justify-between"
                  >
                    <span className="font-semibold text-assistant-navy truncate max-w-[160px]">
                      {ch.taskTitle || 'Task'}
                    </span>
                    <div className="flex items-center gap-1.5 text-slate-500">
                      <span>
                        {ch.originalStartTime ? format(new Date(ch.originalStartTime), 'h:mm a') : 'Unset'}
                      </span>
                      <ArrowRight className="w-3 h-3 text-assistant-sky" />
                      <span className="font-bold text-assistant-navy">
                        {ch.revisedStartTime ? format(new Date(ch.revisedStartTime), 'h:mm a') : 'Unset'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={handleDone}
              className="w-full mt-4 py-2.5 text-xs font-bold text-assistant-navy bg-assistant-sky hover:bg-sky-400 rounded-lg transition-colors"
            >
              Done & View Schedule
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
