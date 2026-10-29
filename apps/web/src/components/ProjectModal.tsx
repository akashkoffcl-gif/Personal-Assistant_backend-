'use client';

import React, { useState } from 'react';
import { X, Briefcase, Calendar, Palette } from 'lucide-react';

interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    title: string;
    description?: string;
    color: string;
    targetDate?: string;
  }) => Promise<any>;
}

const PROJECT_COLORS = [
  '#142B4A', // Navy
  '#38BDF8', // Sky Blue
  '#16A34A', // Emerald Green
  '#9333EA', // Purple
  '#D97706', // Amber
  '#DC2626', // Red
  '#64748B', // Cool Grey
];

export function ProjectModal({ isOpen, onClose, onSubmit }: ProjectModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#142B4A');
  const [targetDate, setTargetDate] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      setLoading(true);
      await onSubmit({
        title: title.trim(),
        description: description.trim() || undefined,
        color,
        targetDate: targetDate ? new Date(targetDate).toISOString() : undefined,
      });
      setTitle('');
      setDescription('');
      setTargetDate('');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-4 bg-assistant-navy text-white">
          <div className="flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-assistant-sky" />
            <h3 className="font-bold text-sm sm:text-base">New Project Workspace</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-assistant-navy mb-1">
              Project Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Q4 Platform Launch, Mobile App Revamp..."
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-assistant-sky"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-assistant-navy mb-1">
              Target Delivery Date (Optional)
            </label>
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-assistant-sky"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-assistant-navy mb-2 flex items-center gap-1.5">
              <Palette className="w-4 h-4 text-assistant-sky" /> Accent Color
            </label>
            <div className="flex items-center gap-2.5">
              {PROJECT_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  style={{ backgroundColor: c }}
                  className={`w-7 h-7 rounded-full border-2 transition-all ${
                    color === c ? 'border-slate-900 scale-110 shadow-sm' : 'border-transparent hover:scale-105'
                  }`}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-assistant-navy mb-1">
              Description & Objectives
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Key project deliverables, goals, and milestones..."
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-assistant-sky"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-assistant-coolGrey hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-xs font-bold text-white bg-assistant-navy hover:bg-slate-800 rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
            >
              {loading ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

