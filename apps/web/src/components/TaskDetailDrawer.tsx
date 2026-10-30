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
  Sparkles,
  Check,
  RotateCcw,
} from 'lucide-react';
import { format, addMinutes, differenceInMinutes } from 'date-fns';
import { TaskDto, TaskStatus, Priority, SchedulingMode, TaskCategory } from '@assistant/shared';
import { api } from '@/lib/api';

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
  const [localSubtasks, setLocalSubtasks] = useState<TaskDto[]>([]);

  useEffect(() => {
    if (task) {
      setTitle(task.title || '');
      setDescription(task.description || '');
      setNotes(task.notes || '');
      setDurationMinutes(task.estimatedDurationMinutes || 30);
      setPriority(task.priority || Priority.MEDIUM);
      setSchedulingMode(task.schedulingMode || SchedulingMode.FLEXIBLE);
      setStatus(task.status || TaskStatus.TODO);
      setLocalSubtasks(task.subtasks || []);

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

  // Handle scheduledStartTime change -> update scheduledEndTime
  const handleStartTimeChange = (startStr: string) => {
    setScheduledStartTime(startStr);
    if (startStr && durationMinutes > 0) {
      const newEnd = addMinutes(new Date(startStr), durationMinutes);
      setScheduledEndTime(newEnd.toISOString().slice(0, 16));
    }
  };

  const handleAddSubtask = async () => {
    if (!newSubtaskTitle.trim()) return;
    try {
      const subtask = await api.createTask({
        title: newSubtaskTitle.trim(),
        parentTaskId: task.id,
        category: task.category,
        priority: Priority.MEDIUM,
        schedulingMode: SchedulingMode.FLEXIBLE,
        estimatedDurationMinutes: 15,
      });
      setLocalSubtasks((prev) => [...prev, subtask]);
      setNewSubtaskTitle('');
    } catch (err: any) {
      console.error('Failed to create subtask:', err);
    }
  };

  const handleToggleSubtask = async (subtaskId: string, currentStatus: TaskStatus) => {
    const newStatus = currentStatus === TaskStatus.COMPLETED ? TaskStatus.TODO : TaskStatus.COMPLETED;
    try {
      if (newStatus === TaskStatus.COMPLETED) {
        await api.completeTask(subtaskId);
      } else {
        await api.updateTask(subtaskId, { status: TaskStatus.TODO });
      }
      setLocalSubtasks((prev) =>
        prev.map((s) => (s.id === subtaskId ? { ...s, status: newStatus } : s)),
      );
    } catch (err) {
      console.error('Failed to toggle subtask:', err);
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
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/45 backdrop-blur-md animate-in fade-in duration-200">
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-8">
        <div className="w-screen max-w-lg glass-panel bg-white/90 backdrop-blur-2xl border-l border-white/80 shadow-2xl flex flex-col animate-in slide-in-from-right duration-250">
          {/* Header */}
          <div className="px-6 py-4 glass-dark text-white flex items-center justify-between border-b border-white/10">
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-white/10 uppercase tracking-wider border border-white/15">
                {task.category}
              </span>
              <span className="text-xs text-sky-300 font-semibold flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-sky-400" />
                {task.schedulingMode}
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-white/15 transition-all text-white/80 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Glass Tab Navigation */}
          <div className="flex border-b border-slate-200/80 px-6 bg-white/50 backdrop-blur-md">
            {[
              { id: 'details', label: 'Details' },
              { id: 'subtasks', label: `Subtasks (${localSubtasks.length})` },
              { id: 'history', label: `History (${taskEvents.length})` },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-3 text-xs font-bold border-b-2 mr-5 transition-all ${activeTab === tab.id
                    ? 'border-sky-500 text-slate-900 font-black'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Drawer Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {activeTab === 'details' && (
              <>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Task Title *
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm font-bold glass-input rounded-xl"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Status
                    </label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as TaskStatus)}
                      className="w-full px-3 py-2 text-xs font-semibold glass-input rounded-xl text-slate-800"
                    >
                      <option value={TaskStatus.TODO}>To Do (Active)</option>
                      <option value={TaskStatus.IN_PROGRESS}>In Progress</option>
                      <option value={TaskStatus.COMPLETED}>Completed</option>
                      <option value={TaskStatus.SKIPPED}>Skipped</option>
                      <option value={TaskStatus.CANCELLED}>Cancelled</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Priority
                    </label>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as Priority)}
                      className="w-full px-3 py-2 text-xs font-semibold glass-input rounded-xl text-slate-800"
                    >
                      <option value={Priority.LOW}>Low</option>
                      <option value={Priority.MEDIUM}>Medium</option>
                      <option value={Priority.HIGH}>High</option>
                      <option value={Priority.URGENT}>Urgent</option>
                    </select>
                  </div>
                </div>

                {/* Scheduling Times & Duration Recalculation */}
                <div className="p-4 rounded-2xl glass-card border border-white/90 space-y-3.5 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-sky-500" /> Schedule & Duration
                    </span>
                    <select
                      value={schedulingMode}
                      onChange={(e) => setSchedulingMode(e.target.value as SchedulingMode)}
                      className="px-2.5 py-1 text-[11px] font-bold border border-slate-200 rounded-lg bg-white text-slate-800"
                    >
                      <option value={SchedulingMode.FLEXIBLE}>FLEXIBLE (Auto-Movable)</option>
                      <option value={SchedulingMode.FIXED}>FIXED (Immovable Slot)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Scheduled Start Time
                    </label>
                    <input
                      type="datetime-local"
                      value={scheduledStartTime}
                      onChange={(e) => handleStartTimeChange(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs glass-input rounded-xl"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-bold text-slate-600">
                          Duration ({durationMinutes}m)
                        </label>
                      </div>
                      <input
                        type="range"
                        min="5"
                        max="240"
                        step="5"
                        value={durationMinutes}
                        onChange={(e) => handleDurationChange(Number(e.target.value))}
                        className="w-full accent-sky-500 cursor-pointer"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        Scheduled End Time
                      </label>
                      <input
                        type="datetime-local"
                        value={scheduledEndTime}
                        onChange={(e) => handleEndTimeChange(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs glass-input rounded-xl"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Description & Objectives
                  </label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Task details and context..."
                    className="w-full px-3.5 py-2 text-xs glass-input rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Notes, Links & Checkpoints
                  </label>
                  <textarea
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Scratchpad, notes, or links for this task..."
                    className="w-full px-3.5 py-2 text-xs glass-input rounded-xl"
                  />
                </div>
              </>
            )}

            {/* TAB 2: INTERACTIVE SUBTASKS */}
            {activeTab === 'subtasks' && (
              <div className="space-y-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newSubtaskTitle}
                    onChange={(e) => setNewSubtaskTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddSubtask();
                      }
                    }}
                    placeholder="Type subtask and press Enter..."
                    className="flex-1 px-3.5 py-2 text-xs glass-input rounded-xl"
                  />
                  <button
                    type="button"
                    onClick={handleAddSubtask}
                    className="px-3.5 py-2 text-xs font-bold text-slate-900 glass-button-primary rounded-xl flex items-center gap-1 shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" /> Add
                  </button>
                </div>

                <div className="space-y-2">
                  {localSubtasks.length === 0 ? (
                    <div className="py-10 text-center glass-card rounded-2xl border border-dashed border-slate-300 p-6">
                      <ListTodo className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-xs font-semibold text-slate-500">
                        No subtasks added yet. Break down complex tasks into bite-sized steps.
                      </p>
                    </div>
                  ) : (
                    localSubtasks.map((st) => {
                      const isSubDone = st.status === TaskStatus.COMPLETED;
                      return (
                        <div
                          key={st.id}
                          onClick={() => handleToggleSubtask(st.id, st.status)}
                          className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${isSubDone
                              ? 'bg-emerald-50/50 border-emerald-200/70'
                              : 'glass-card border-white/90 hover:border-sky-300 shadow-xs'
                            }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div
                              className={`w-5 h-5 rounded-lg flex items-center justify-center border transition-all ${isSubDone
                                  ? 'bg-emerald-500 border-emerald-500 text-white'
                                  : 'border-slate-300 bg-white text-transparent'
                                }`}
                            >
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                            </div>
                            <span
                              className={`text-xs font-bold truncate ${isSubDone ? 'line-through text-slate-400' : 'text-slate-900'
                                }`}
                            >
                              {st.title}
                            </span>
                          </div>
                          <span className="text-[10px] font-bold text-slate-400">
                            {isSubDone ? 'Done' : 'Active'}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* TAB 3: LIFECYCLE AUDIT TRAIL */}
            {activeTab === 'history' && (
              <div className="space-y-3">
                {taskEvents.length === 0 ? (
                  <p className="text-xs text-slate-400 py-10 text-center glass-card rounded-2xl border border-dashed border-slate-300">
                    No task lifecycle events recorded yet.
                  </p>
                ) : (
                  taskEvents.map((evt: any, i: number) => (
                    <div
                      key={evt.id || i}
                      className="p-3 rounded-xl glass-card border border-white/80 text-xs flex items-start gap-2.5 shadow-xs"
                    >
                      <History className="w-4 h-4 text-sky-500 shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <span className="font-bold text-slate-900 block">{evt.eventType}</span>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {format(new Date(evt.createdAt), 'MMM d, yyyy h:mm a')}
                        </p>
                        {evt.previousStatus && evt.newStatus && (
                          <p className="text-[11px] text-slate-600 mt-0.5">
                            Transition: <span className="font-semibold">{evt.previousStatus}</span>{' '}
                            ➔ <span className="font-bold text-sky-600">{evt.newStatus}</span>
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
          <div className="p-4 glass-panel border-t border-white/80 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => onDelete(task.id)}
              className="p-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-all flex items-center gap-1.5"
            >
              <Trash2 className="w-4 h-4" /> Delete
            </button>

            <div className="flex items-center gap-2">
              {task.status !== TaskStatus.COMPLETED && (
                <button
                  type="button"
                  onClick={() => onSnooze(task.id, 15)}
                  className="px-3 py-1.5 text-xs font-bold text-slate-700 glass-card hover:border-sky-300 rounded-xl transition-all shadow-xs"
                >
                  Snooze 15m
                </button>
              )}
              <button
                type="button"
                disabled={loading}
                onClick={handleSave}
                className="px-4 py-1.5 text-xs font-bold text-white bg-assistant-navy hover:bg-slate-800 rounded-xl shadow-xs transition-all hover:scale-102 active:scale-95"
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
