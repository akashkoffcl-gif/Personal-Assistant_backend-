'use client';

import React, { useState } from 'react';
import { X, Calendar, Clock, Flag, Tag } from 'lucide-react';
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

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      setLoading(true);
      await onSubmit({
        title,
        description: description || undefined,
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
      alert(`Error creating task: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-4 bg-assistant-navy text-white">
          <h3 className="font-bold text-base">Create New Task</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          <div>
            <label className="block text-xs font-semibold text-assistant-navy mb-1">Title *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Prepare Quarter Deliverables..."
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-assistant-sky"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-assistant-navy mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as TaskCategory)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-assistant-sky"
              >
                <option value={TaskCategory.WORK}>Work Reminders</option>
                <option value={TaskCategory.ROUTINE}>Daily Routine</option>
                <option value={TaskCategory.PLANNING}>Day Planning</option>
                <option value={TaskCategory.EMERGENCY}>Emergency</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-assistant-navy mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-assistant-sky"
              >
                <option value={Priority.LOW}>Low</option>
                <option value={Priority.MEDIUM}>Medium</option>
                <option value={Priority.HIGH}>High</option>
                <option value={Priority.URGENT}>Urgent</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-assistant-navy mb-1">Scheduling Mode</label>
              <select
                value={schedulingMode}
                onChange={(e) => setSchedulingMode(e.target.value as SchedulingMode)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-assistant-sky"
              >
                <option value={SchedulingMode.FLEXIBLE}>Flexible (Auto-reschedulable)</option>
                <option value={SchedulingMode.FIXED}>Fixed (Immovable Slot)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-assistant-navy mb-1">Estimated Duration</label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="5"
                  max="720"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-assistant-sky"
                />
                <span className="text-xs text-assistant-coolGrey">min</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-assistant-navy mb-1">Scheduled Start Time</label>
              <input
                type="datetime-local"
                value={scheduledStartTime}
                onChange={(e) => setScheduledStartTime(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-assistant-sky"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-assistant-navy mb-1">Deadline (Optional)</label>
              <input
                type="datetime-local"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-assistant-sky"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-assistant-navy mb-1">Description / Notes</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add optional notes or checklist..."
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
              className="px-5 py-2 text-xs font-bold text-assistant-navy bg-assistant-sky hover:bg-sky-400 rounded-lg shadow-sm transition-colors"
            >
              {loading ? 'Saving...' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
