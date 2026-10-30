'use client';

import React, { useState } from 'react';
import { X, Briefcase, Calendar, Palette, Check } from 'lucide-react';

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
  '#0F1E36', // Deep Navy
  '#38BDF8', // Sky Blue
  '#10B981', // Emerald Green
  '#8B5CF6', // Purple
  '#F59E0B', // Amber
  '#F43F5E', // Rose
  '#06B6D4', // Cyan
  '#64748B', // Cool Grey
];

export function ProjectModal({ isOpen, onClose, onSubmit }: ProjectModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#38BDF8');
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/45 backdrop-blur-md animate-in fade-in duration-150">
      <div className="glass-panel max-w-md w-full bg-white/90 backdrop-blur-2xl rounded-3xl border border-white/80 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 glass-dark text-white border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-300 flex items-center justify-center border border-indigo-400/30">
              <Briefcase className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <h3 className="font-extrabold text-base tracking-tight text-white">Create New Project</h3>
              <p className="text-[11px] text-indigo-200 font-medium">Workspace & Goal Tracker</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-white/15 transition-all text-white/80 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Project Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Q4 Platform Launch, Mobile App Revamp..."
              className="w-full px-3.5 py-2.5 text-sm font-bold glass-input rounded-xl"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Target Delivery Date (Optional)
            </label>
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="w-full px-3 py-2 text-xs font-bold glass-input rounded-xl"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-sky-500" /> Workspace Theme Accent
            </label>
            <div className="flex items-center gap-2 flex-wrap">
              {PROJECT_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full flex items-center justify-center transition-all hover:scale-110 shadow-xs ${
                    color === c ? 'ring-2 ring-offset-2 ring-sky-400 scale-110' : ''
                  }`}
                  style={{ backgroundColor: c }}
                  title={c}
                >
                  {color === c && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Project Goals & Milestones (Optional)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Objectives, team members, or key deliverables..."
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
              className="px-5 py-2 text-xs font-bold text-slate-900 glass-button-primary rounded-xl transition-all shadow-glass-glow disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
