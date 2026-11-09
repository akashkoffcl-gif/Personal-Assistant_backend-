'use client';

import React from 'react';
import { ShieldAlert, CheckCircle2, XCircle, ArrowRight, Loader2 } from 'lucide-react';
import { ActionProposal } from './types';

interface AIActionConfirmationProps {
  proposal: ActionProposal;
  onConfirm: (actionId: string) => void;
  onReject: (actionId: string) => void;
  isExecuting?: boolean;
  className?: string;
}

export const AIActionConfirmation: React.FC<AIActionConfirmationProps> = ({
  proposal,
  onConfirm,
  onReject,
  isExecuting = false,
  className = '',
}) => {
  const getActionDetails = () => {
    switch (proposal.actionType) {
      case 'CREATE_TASK':
        return {
          title: 'Schedule New Task',
          badge: 'Task Mutation',
          desc: proposal.payload?.title || proposal.description,
          details: `Priority: ${proposal.payload?.priority || 'MEDIUM'} | Duration: ${proposal.payload?.estimatedDurationMinutes || 30}m`,
        };
      case 'START_FOCUS':
        return {
          title: 'Initiate Focus Studio Session',
          badge: 'Focus Block',
          desc: `${proposal.payload?.durationMinutes || 25} minutes Deep Work`,
          details: proposal.payload?.taskId ? `Linked to Task: ${proposal.payload.taskId}` : 'Standalone cognitive focus',
        };
      case 'CREATE_REMINDER':
        return {
          title: 'Set System Reminder',
          badge: 'Notification',
          desc: proposal.payload?.title || proposal.description,
          details: `Trigger time: ${proposal.payload?.triggerTime ? new Date(proposal.payload.triggerTime).toLocaleTimeString() : 'Upcoming'}`,
        };
      case 'CREATE_GOAL':
        return {
          title: 'Establish Strategic Goal',
          badge: 'Goal Tracking',
          desc: proposal.payload?.title || proposal.description,
          details: 'Will be tracked in Goals & Milestones Workspace',
        };
      case 'CREATE_NOTE':
        return {
          title: 'Record Knowledge Note',
          badge: 'Second Brain',
          desc: proposal.payload?.title || 'Quick Note',
          details: proposal.payload?.content?.slice(0, 80) || 'Capturing insights',
        };
      case 'MULTI_STEP_WORKFLOW':
        const steps = proposal.payload?.steps || [];
        return {
          title: `Autonomous Workflow Plan (${steps.length} Steps)`,
          badge: proposal.payload?.overallRisk === 'HIGH' ? 'High Risk Plan' : 'Multi-Step DAG',
          desc: proposal.payload?.title || proposal.description,
          details: `Operations: ${steps.map((s: any) => s.description).slice(0, 3).join(', ')}${steps.length > 3 ? ` +${steps.length - 3} more` : ''}`,
        };
      default:
        return {
          title: 'Execute Application Action',
          badge: 'Authorized Action',
          desc: proposal.description,
          details: JSON.stringify(proposal.payload),
        };
    }
  };

  const details = getActionDetails();

  return (
    <div
      className={`max-w-md w-full bg-white/95 backdrop-blur-xl border-2 border-[#8B45F5] rounded-2xl p-4 shadow-[0_12px_40px_rgba(139,69,245,0.2)] animate-in fade-in slide-in-from-bottom-3 ${className}`}
      role="alertdialog"
      aria-labelledby="action-confirm-heading"
    >
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#F0F2FA]">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-[#F4F3FF] border border-[#DDD8F8] flex items-center justify-center text-[#8B45F5]">
            <ShieldAlert className="w-3.5 h-3.5 stroke-[2.2]" />
          </div>
          <span id="action-confirm-heading" className="text-xs font-black text-[#202033]">
            {details.title}
          </span>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#8B45F5]/10 text-[#8B45F5]">
          {details.badge}
        </span>
      </div>

      <div className="space-y-1 mb-3">
        <p className="text-xs font-semibold text-[#202033] line-clamp-2">{details.desc}</p>
        <p className="text-[11px] text-[#74738A]">{details.details}</p>
      </div>

      <div className="flex items-center justify-end gap-2 pt-1 border-t border-[#F0F2FA]">
        <button
          disabled={isExecuting}
          onClick={() => onReject(proposal.id)}
          className="px-3 py-1.5 rounded-xl border border-[#E5E2F5] text-xs font-bold text-[#74738A] hover:bg-slate-50 transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          disabled={isExecuting}
          onClick={() => onConfirm(proposal.id)}
          className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-[#6935C8] to-[#8B45F5] hover:from-[#5A2BB5] hover:to-[#7839D6] text-xs font-black text-white shadow-sm flex items-center gap-1.5 transition-all transform active:scale-95 disabled:opacity-50"
        >
          {isExecuting ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Executing...</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Confirm & Execute</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

