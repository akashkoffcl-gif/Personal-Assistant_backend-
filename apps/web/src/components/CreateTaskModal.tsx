'use client';

import React, { useState } from 'react';
import { X, CheckCircle2 } from 'lucide-react';
import { TaskCategory, Priority, SchedulingMode } from '@assistant/shared';

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<any>;
}

export function CreateTaskModal({ isOpen, onClose, onSubmit }: CreateTaskModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<TaskCategory>(TaskCategory.WORK);
  const [priority, setPriority] = useState<Priority>(Priority.MEDIUM);
  const [schedulingMode, setSchedulingMode] = useState<SchedulingMode>(SchedulingMode.FLEXIBLE);
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [scheduledStartTime, setScheduledStartTime] = useState('');
  const [deadline, setDeadline] = useState('');
  const [bufferMinutes, setBufferMinutes] = useState(5);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      setLoading(true);
      setErrorMessage(null);
      await onSubmit({
        title: title.trim(),
        description: description.trim() || undefined,
        category,
        priority,
        schedulingMode,
        estimatedDurationMinutes: Number(durationMinutes),
        scheduledStartTime: scheduledStartTime ? new Date(scheduledStartTime).toISOString() : undefined,
        deadline: deadline ? new Date(deadline).toISOString() : undefined,
        bufferMinutes: Number(bufferMinutes),
      });
      setTitle('');
      setDescription('');
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Error creating task');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white max-w-lg w-full rounded-xl border border-slate-200 shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-sm text-slate-900">Create New Task</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          {errorMessage && (
            <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 font-semibold flex items-center gap-2">
              <span>⚠️</span>
              <span>{errorMessage}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Task Title *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Prepare Quarter Deliverables..."
              className="w-full px-3 py-2 text-xs font-semibold border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as TaskCategory)}
                className="w-full px-2.5 py-1.5 text-xs font-medium border border-slate-200 rounded-lg text-slate-800 bg-white"
              >
                <option value={TaskCategory.WORK}>Work</option>
                <option value={TaskCategory.ROUTINE}>Daily Routine</option>
                <option value={TaskCategory.PLANNING}>Day Planning</option>
                <option value={TaskCategory.EMERGENCY}>Emergency</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                className="w-full px-2.5 py-1.5 text-xs font-medium border border-slate-200 rounded-lg text-slate-800 bg-white"
              >
                <option value={Priority.LOW}>Low Priority</option>
                <option value={Priority.MEDIUM}>Medium</option>
                <option value={Priority.HIGH}>High Priority</option>
                <option value={Priority.URGENT}>Urgent</option>
              </select>
            </div>
          </div>

          {/* Duration Presets */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700">Estimated Duration</label>
              <span className="text-xs font-semibold text-blue-600">{durationMinutes} minutes</span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[15, 30, 45, 60].map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => setDurationMinutes(mins)}
                  className={`py-1 text-xs font-medium rounded-lg transition-colors border ${
                    durationMinutes === mins
                      ? 'bg-blue-50 text-blue-700 border-blue-200 font-semibold'
                      : 'bg-white text-slate-600 hover:bg-slate-50 border-slate-200'
                  }`}
                >
                  {mins} min
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Scheduling Mode
              </label>
              <select
                value={schedulingMode}
                onChange={(e) => setSchedulingMode(e.target.value as SchedulingMode)}
                className="w-full px-2.5 py-1.5 text-xs font-medium border border-slate-200 rounded-lg text-slate-800 bg-white"
              >
                <option value={SchedulingMode.FLEXIBLE}>Flexible (Movable)</option>
                <option value={SchedulingMode.FIXED}>Fixed Appointment (Pinned)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Start Time (Optional)
              </label>
              <input
                type="datetime-local"
                value={scheduledStartTime}
                onChange={(e) => setScheduledStartTime(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Description & Notes (Optional)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Context, subtasks, or objectives..."
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
              className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-xs disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
