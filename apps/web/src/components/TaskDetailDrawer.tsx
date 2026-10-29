'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Clock,
  Calendar,
  AlertTriangle,
  Flame,
  CheckCircle2,
  Trash2,
  History,
  ListTodo,
  Plus,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { format, addMinutes, differenceInMinutes } from 'date-fns';
import { TaskDto, TaskStatus, Priority, SchedulingMode, TaskCategory } from '@assistant/shared';

interface TaskDetailDrawerProps {
  task: TaskDto | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (id: string, data: any) => Promise<any>;
  onComplete: (id: string) => Promise<any>;
  onDelete: (id: string) => Promise<any>;
  onSnooze: (id: string, minutes: number) => Promise<any>;
  taskEvents?: any[];
}

export function TaskDetailDrawer({
  task,
  isOpen,
  onClose,
  onUpdate,
  onComplete,
  onDelete,
  onSnooze,
  taskEvents = [],
}: TaskDetailDrawerProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [scheduledStartTime, setScheduledStartTime] = useState('');
  const [scheduledEndTime, setScheduledEndTime] = useState('');
  const [priority, setPriority] = useState<Priority>(Priority.MEDIUM);
  const [schedulingMode, setSchedulingMode] = useState<SchedulingMode>(SchedulingMode.FLEXIBLE);
  const [status, setStatus] = useState<TaskStatus>(TaskStatus.TODO);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'subtasks' | 'history'>('details');
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');

  useEffect(() => {
    if (task) {
      setTitle(task.title || '');
      setDescription(task.description || '');
      setNotes(task.notes || '');
      setDurationMinutes(task.estimatedDurationMinutes || 30);
      setPriority(task.priority || Priority.MEDIUM);
      setSchedulingMode(task.schedulingMode || SchedulingMode.FLEXIBLE);
      setStatus(task.status || TaskStatus.TODO);

      if (task.scheduledStartTime) {
        setScheduledStartTime(new Date(task.scheduledStartTime).toISOString().slice(0, 16));
      } else {
        setScheduledStartTime('');
      }

      if (task.scheduledEndTime) {
        setScheduledEndTime(new Date(task.scheduledEndTime).toISOString().slice(0, 16));
      } else if (task.scheduledStartTime && task.estimatedDurationMinutes) {
        const end = addMinutes(new Date(task.scheduledStartTime), task.estimatedDurationMinutes);
        setScheduledEndTime(end.toISOString().slice(0, 16));
      } else {
        setScheduledEndTime('');
      }
    }
  }, [task]);

  if (!isOpen || !task) return null;

  // Handle duration change -> update scheduledEndTime
  const handleDurationChange = (minutes: number) => {
    const validMinutes = Math.max(5, minutes);
    setDurationMinutes(validMinutes);
    if (scheduledStartTime) {
      const newEnd = addMinutes(new Date(scheduledStartTime), validMinutes);
      setScheduledEndTime(newEnd.toISOString().slice(0, 16));
    }
  };

  // Handle scheduledEndTime change -> recalculate duration
  const handleEndTimeChange = (endStr: string) => {
    setScheduledEndTime(endStr);
    if (scheduledStartTime && endStr) {
      const start = new Date(scheduledStartTime);
      const end = new Date(endStr);
      const diff = differenceInMinutes(end, start);
      if (diff > 0) {
        setDurationMinutes(diff);
      }
    }
  };

  // Handle scheduledStartTime change -> update scheduledEndTime based on current duration
  const handleStartTimeChange = (startStr: string) => {
    setScheduledStartTime(startStr);
    if (startStr && durationMinutes > 0) {
      const newEnd = addMinutes(new Date(startStr), durationMinutes);
      setScheduledEndTime(newEnd.toISOString().slice(0, 16));
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      await onUpdate(task.id, {
        title: title.trim(),
        description: description.trim() || undefined,
        notes: notes.trim() || undefined,
        priority,
        schedulingMode,
        status,
        estimatedDurationMinutes: Number(durationMinutes),
        scheduledStartTime: scheduledStartTime ? new Date(scheduledStartTime).toISOString() : null,
        scheduledEndTime: scheduledEndTime ? new Date(scheduledEndTime).toISOString() : null,
      });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
          {/* Header */}
          <div className="px-6 py-4 bg-assistant-navy text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-white/10 uppercase tracking-wider">
                {task.category}
              </span>
              <span className="text-xs text-assistant-sky font-semibold">
                {task.schedulingMode}
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tab Navigation */}
          <div className="flex border-b border-slate-200 px-6 bg-slate-50">
            <button
              onClick={() => setActiveTab('details')}
              className={`py-3 text-xs font-bold border-b-2 mr-4 transition-colors ${
                activeTab === 'details'
                  ? 'border-assistant-sky text-assistant-navy'
                  : 'border-transparent text-slate-500 hover:text-assistant-navy'
              }`}
            >
              Task Details
            </button>
            <button
              onClick={() => setActiveTab('subtasks')}
              className={`py-3 text-xs font-bold border-b-2 mr-4 transition-colors ${
                activeTab === 'subtasks'
                  ? 'border-assistant-sky text-assistant-navy'
                  : 'border-transparent text-slate-500 hover:text-assistant-navy'
              }`}
            >
              Subtasks ({task.subtasks?.length || 0})
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`py-3 text-xs font-bold border-b-2 transition-colors ${
                activeTab === 'history'
                  ? 'border-assistant-sky text-assistant-navy'
                  : 'border-transparent text-slate-500 hover:text-assistant-navy'
              }`}
            >
              History & Audit
            </button>
          </div>

          {/* Drawer Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {activeTab === 'details' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-assistant-navy mb-1">
                    Task Title *
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-semibold border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-assistant-sky"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-assistant-navy mb-1">
                      Status
                    </label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as TaskStatus)}
                      className="w-full px-3 py-2 text-xs font-medium border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-assistant-sky"
                    >
                      <option value={TaskStatus.TODO}>To Do</option>
                      <option value={TaskStatus.IN_PROGRESS}>In Progress</option>
                      <option value={TaskStatus.COMPLETED}>Completed</option>
                      <option value={TaskStatus.SKIPPED}>Skipped</option>
                      <option value={TaskStatus.CANCELLED}>Cancelled</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-assistant-navy mb-1">
                      Priority
                    </label>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as Priority)}
                      className="w-full px-3 py-2 text-xs font-medium border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-assistant-sky"
                    >
                      <option value={Priority.LOW}>Low</option>
                      <option value={Priority.MEDIUM}>Medium</option>
                      <option value={Priority.HIGH}>High</option>
                      <option value={Priority.URGENT}>Urgent</option>
                    </select>
                  </div>
                </div>

                {/* Scheduling Times */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-assistant-navy flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-assistant-sky" /> Schedule & Duration
                    </span>
                    <select
                      value={schedulingMode}
                      onChange={(e) => setSchedulingMode(e.target.value as SchedulingMode)}
                      className="px-2 py-0.5 text-[11px] font-semibold border border-slate-300 rounded bg-white text-assistant-navy"
                    >
                      <option value={SchedulingMode.FLEXIBLE}>FLEXIBLE (Auto-Movable)</option>
                      <option value={SchedulingMode.FIXED}>FIXED (Immovable Slot)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Scheduled Start Time
                    </label>
                    <input
                      type="datetime-local"
                      value={scheduledStartTime}
                      onChange={(e) => handleStartTimeChange(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Duration (Minutes)
                      </label>
                      <input
                        type="number"
                        min="5"
                        max="720"
                        value={durationMinutes}
                        onChange={(e) => handleDurationChange(Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Scheduled End Time
                      </label>
                      <input
                        type="datetime-local"
                        value={scheduledEndTime}
                        onChange={(e) => handleEndTimeChange(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-assistant-navy mb-1">
                    Description
                  </label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Task details and context..."
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-assistant-sky"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-assistant-navy mb-1">
                    Notes & Checkpoints
                  </label>
                  <textarea
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Personal notes, links, or scratchpad for this task..."
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-assistant-sky"
                  />
                </div>
              </>
            )}

            {activeTab === 'subtasks' && (
              <div className="space-y-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newSubtaskTitle}
                    onChange={(e) => setNewSubtaskTitle(e.target.value)}
                    placeholder="Add a new subtask..."
                    className="flex-1 px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-assistant-sky"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newSubtaskTitle.trim()) {
                        // Create subtask logic
                        setNewSubtaskTitle('');
                      }
                    }}
                    className="px-3 py-1.5 bg-assistant-navy text-white text-xs font-bold rounded-lg hover:bg-slate-800 flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add
                  </button>
                </div>

                <div className="space-y-2">
                  {(!task.subtasks || task.subtasks.length === 0) ? (
                    <p className="text-xs text-assistant-coolGrey py-8 text-center bg-slate-50 rounded-lg border border-dashed border-slate-200">
                      No subtasks added yet. Break down complex tasks into steps.
                    </p>
                  ) : (
                    task.subtasks.map((st) => (
                      <div
                        key={st.id}
                        className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 bg-white text-xs"
                      >
                        <span className={st.status === TaskStatus.COMPLETED ? 'line-through text-slate-400' : 'font-semibold text-assistant-navy'}>
                          {st.title}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {activeTab === 'history' && (
              <div className="space-y-3">
                {taskEvents.length === 0 ? (
                  <p className="text-xs text-assistant-coolGrey py-8 text-center bg-slate-50 rounded-lg border border-dashed border-slate-200">
                    No task lifecycle events recorded yet.
                  </p>
                ) : (
                  taskEvents.map((evt: any, i: number) => (
                    <div
                      key={evt.id || i}
                      className="p-3 rounded-lg border border-slate-200 bg-slate-50 text-xs flex items-start gap-2.5"
                    >
                      <History className="w-4 h-4 text-assistant-sky shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <span className="font-bold text-assistant-navy block">
                          {evt.eventType}
                        </span>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {format(new Date(evt.createdAt), 'MMM d, yyyy h:mm a')}
                        </p>
                        {evt.previousStatus && evt.newStatus && (
                          <p className="text-[11px] text-slate-600 mt-0.5">
                            Status changed: <span className="font-semibold">{evt.previousStatus}</span> ➔ <span className="font-semibold text-assistant-navy">{evt.newStatus}</span>
                          </p>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Drawer Footer Actions */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => onDelete(task.id)}
              className="p-2 text-xs font-semibold text-assistant-red hover:bg-red-50 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Trash2 className="w-4 h-4" /> Delete
            </button>

            <div className="flex items-center gap-2">
              {task.status !== TaskStatus.COMPLETED && (
                <button
                  type="button"
                  onClick={() => onSnooze(task.id, 15)}
                  className="px-3 py-1.5 text-xs font-semibold text-assistant-navy bg-white border border-slate-300 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Snooze 15m
                </button>
              )}
              <button
                type="button"
                disabled={loading}
                onClick={handleSave}
                className="px-4 py-1.5 text-xs font-bold text-white bg-assistant-navy hover:bg-slate-800 rounded-lg shadow-xs transition-colors"
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

