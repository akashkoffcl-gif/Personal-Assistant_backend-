'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Clock,
  Trash2,
  History,
  ListTodo,
  Plus,
  Check,
} from 'lucide-react';
import { format, addMinutes, differenceInMinutes } from 'date-fns';
import { TaskDto, TaskStatus, Priority, SchedulingMode } from '@assistant/shared';
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

  const handleDurationChange = (minutes: number) => {
    const validMinutes = Math.max(5, minutes);
    setDurationMinutes(validMinutes);
    if (scheduledStartTime) {
      const newEnd = addMinutes(new Date(scheduledStartTime), validMinutes);
      setScheduledEndTime(newEnd.toISOString().slice(0, 16));
    }
  };

  const handleStartTimeChange = (val: string) => {
    setScheduledStartTime(val);
    if (val && durationMinutes) {
      const newEnd = addMinutes(new Date(val), durationMinutes);
      setScheduledEndTime(newEnd.toISOString().slice(0, 16));
    }
  };

  const handleEndTimeChange = (val: string) => {
    setScheduledEndTime(val);
    if (scheduledStartTime && val) {
      const diff = differenceInMinutes(new Date(val), new Date(scheduledStartTime));
      if (diff > 0) {
        setDurationMinutes(diff);
      }
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      await onUpdate(task.id, {
        title,
        description,
        notes,
        priority,
        status,
        schedulingMode,
        estimatedDurationMinutes: durationMinutes,
        scheduledStartTime: scheduledStartTime ? new Date(scheduledStartTime).toISOString() : null,
        scheduledEndTime: scheduledEndTime ? new Date(scheduledEndTime).toISOString() : null,
      });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleAddSubtask = async () => {
    if (!newSubtaskTitle.trim()) return;
    try {
      const created = await api.createTask({
        title: newSubtaskTitle.trim(),
        parentTaskId: task.id,
        category: task.category,
        priority: task.priority,
        estimatedDurationMinutes: 15,
      });
      setLocalSubtasks((prev) => [...prev, created]);
      setNewSubtaskTitle('');
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleSubtask = async (subtaskId: string, currentStatus: TaskStatus) => {
    const nextStatus = currentStatus === TaskStatus.COMPLETED ? TaskStatus.TODO : TaskStatus.COMPLETED;
    try {
      if (nextStatus === TaskStatus.COMPLETED) {
        await api.completeTask(subtaskId);
      } else {
        await api.updateTask(subtaskId, { status: nextStatus });
      }
      setLocalSubtasks((prev) =>
        prev.map((s) => (s.id === subtaskId ? { ...s, status: nextStatus } : s)),
      );
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white border-l border-slate-200 shadow-2xl flex flex-col">
          {/* Header */}
          <div className="px-5 py-3.5 bg-white border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 uppercase">
                {task.category}
              </span>
              <span className="text-xs text-blue-600 font-medium">
                {task.schedulingMode}
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Tab Navigation */}
          <div className="flex border-b border-slate-200 px-5 bg-white">
            {[
              { id: 'details', label: 'Details' },
              { id: 'subtasks', label: `Subtasks (${localSubtasks.length})` },
              { id: 'history', label: `History (${taskEvents.length})` },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-2.5 text-xs font-semibold border-b-2 mr-4 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600 font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Drawer Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {activeTab === 'details' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Task Title *
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-semibold border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Status
                    </label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as TaskStatus)}
                      className="w-full px-2.5 py-1.5 text-xs font-medium border border-slate-200 rounded-lg text-slate-800 bg-white"
                    >
                      <option value={TaskStatus.TODO}>To Do (Active)</option>
                      <option value={TaskStatus.IN_PROGRESS}>In Progress</option>
                      <option value={TaskStatus.COMPLETED}>Completed</option>
                      <option value={TaskStatus.SKIPPED}>Skipped</option>
                      <option value={TaskStatus.CANCELLED}>Cancelled</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Priority
                    </label>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as Priority)}
                      className="w-full px-2.5 py-1.5 text-xs font-medium border border-slate-200 rounded-lg text-slate-800 bg-white"
                    >
                      <option value={Priority.LOW}>Low</option>
                      <option value={Priority.MEDIUM}>Medium</option>
                      <option value={Priority.HIGH}>High</option>
                      <option value={Priority.URGENT}>Urgent</option>
                    </select>
                  </div>
                </div>

                {/* Scheduling Times & Duration */}
                <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-blue-600" /> Schedule & Duration
                    </span>
                    <select
                      value={schedulingMode}
                      onChange={(e) => setSchedulingMode(e.target.value as SchedulingMode)}
                      className="px-2 py-1 text-[11px] font-semibold border border-slate-200 rounded-md bg-white text-slate-800"
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
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Duration ({durationMinutes}m)
                      </label>
                      <input
                        type="range"
                        min="5"
                        max="240"
                        step="5"
                        value={durationMinutes}
                        onChange={(e) => handleDurationChange(Number(e.target.value))}
                        className="w-full accent-blue-600 cursor-pointer"
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
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Description & Objectives
                  </label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Task details and context..."
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Notes & Links
                  </label>
                  <textarea
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Scratchpad, notes, or links for this task..."
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg text-slate-900"
                  />
                </div>
              </>
            )}

            {/* TAB 2: SUBTASKS */}
            {activeTab === 'subtasks' && (
              <div className="space-y-3.5">
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
                    className="flex-1 px-3 py-1.5 text-xs border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                  <button
                    type="button"
                    onClick={handleAddSubtask}
                    className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-1 transition-colors shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" /> Add
                  </button>
                </div>

                <div className="space-y-1.5">
                  {localSubtasks.length === 0 ? (
                    <div className="py-8 text-center rounded-lg border border-dashed border-slate-200 p-5 bg-slate-50">
                      <ListTodo className="w-6 h-6 text-slate-400 mx-auto mb-1" />
                      <p className="text-xs text-slate-500 font-medium">
                        No subtasks added yet. Break down complex tasks into steps.
                      </p>
                    </div>
                  ) : (
                    localSubtasks.map((st) => {
                      const isSubDone = st.status === TaskStatus.COMPLETED;
                      return (
                        <div
                          key={st.id}
                          onClick={() => handleToggleSubtask(st.id, st.status)}
                          className={`flex items-center justify-between p-2.5 rounded-lg border transition-colors cursor-pointer ${
                            isSubDone
                              ? 'bg-slate-50 border-slate-200'
                              : 'bg-white border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div
                              className={`w-4 h-4 rounded flex items-center justify-center border ${
                                isSubDone
                                  ? 'bg-emerald-600 border-emerald-600 text-white'
                                  : 'border-slate-300 bg-white text-transparent'
                              }`}
                            >
                              <Check className="w-3 h-3 stroke-[3]" />
                            </div>
                            <span
                              className={`text-xs font-medium truncate ${
                                isSubDone ? 'line-through text-slate-400' : 'text-slate-800'
                              }`}
                            >
                              {st.title}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400">
                            {isSubDone ? 'Done' : 'Active'}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* TAB 3: HISTORY */}
            {activeTab === 'history' && (
              <div className="space-y-2">
                {taskEvents.length === 0 ? (
                  <p className="text-xs text-slate-400 py-8 text-center rounded-lg border border-dashed border-slate-200 bg-slate-50">
                    No task lifecycle events recorded yet.
                  </p>
                ) : (
                  taskEvents.map((evt: any, i: number) => (
                    <div
                      key={evt.id || i}
                      className="p-2.5 rounded-lg border border-slate-200 bg-white text-xs flex items-start gap-2"
                    >
                      <History className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <span className="font-semibold text-slate-900 block">{evt.eventType}</span>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {format(new Date(evt.createdAt), 'MMM d, yyyy h:mm a')}
                        </p>
                        {evt.previousStatus && evt.newStatus && (
                          <p className="text-[11px] text-slate-600 mt-0.5">
                            Transition: <span className="font-medium">{evt.previousStatus}</span>{' '}
                            ➔ <span className="font-semibold text-blue-600">{evt.newStatus}</span>
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
          <div className="p-3.5 bg-white border-t border-slate-200 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => onDelete(task.id)}
              className="px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </button>

            <div className="flex items-center gap-2">
              {task.status !== TaskStatus.COMPLETED && (
                <button
                  type="button"
                  onClick={() => onSnooze(task.id, 15)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors"
                >
                  Snooze 15m
                </button>
              )}
              <button
                type="button"
                disabled={loading}
                onClick={handleSave}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors disabled:opacity-50"
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
