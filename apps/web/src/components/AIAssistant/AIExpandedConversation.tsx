'use client';

import React, { useRef, useEffect } from 'react';
import {
  X,
  Trash2,
  Copy,
  RotateCcw,
  Check,
  User,
  Bot,
  ExternalLink,
  Volume2,
  ShieldAlert,
} from 'lucide-react';
import { AssistantMessage, ActionProposal } from './types';
import { AIActionConfirmation } from './AIActionConfirmation';

interface AIExpandedConversationProps {
  isOpen: boolean;
  onClose: () => void;
  messages: AssistantMessage[];
  pendingAction: ActionProposal | null;
  onConfirmAction: (id: string) => void;
  onRejectAction: (id: string) => void;
  onClearConversation: () => void;
  onRetryLastMessage: () => void;
  onSpeakMessage: (text: string) => void;
  assistantName?: string;
  className?: string;
}

export const AIExpandedConversation: React.FC<AIExpandedConversationProps> = ({
  isOpen,
  onClose,
  messages,
  pendingAction,
  onConfirmAction,
  onRejectAction,
  onClearConversation,
  onRetryLastMessage,
  onSpeakMessage,
  assistantName = 'Nova',
  className = '',
}) => {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  useEffect(() => {
    if (isOpen && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [isOpen, messages]);

  if (!isOpen) return null;

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div
      className={`fixed bottom-24 left-1/2 -translate-x-1/2 w-[92vw] max-w-2xl h-[65vh] max-h-[580px] bg-white/95 backdrop-blur-2xl border border-[#DDD8F8] rounded-3xl shadow-[0_20px_60px_rgba(139,69,245,0.22)] flex flex-col overflow-hidden z-40 animate-in fade-in slide-in-from-bottom-6 duration-300 ${className}`}
      role="region"
      aria-label="Expanded AI Conversation History"
    >
      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#F0F2FA] bg-[#FAF9FF] shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-[#6935C8] to-[#8B45F5] flex items-center justify-center text-white shadow-xs">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-black text-[#202033] tracking-tight">
              {assistantName} AI Companion
            </h3>
            <span className="text-[10px] text-[#74738A]">Synchronized with PostgreSQL & Gemini</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {messages.length > 0 && (
            <button
              onClick={() => {
                if (window.confirm('Clear all messages in this conversation session?')) {
                  onClearConversation();
                }
              }}
              className="p-1.5 rounded-xl hover:bg-rose-50 text-[#74738A] hover:text-[#E05268] transition-colors"
              title="Clear conversation"
              aria-label="Clear conversation"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-100 text-[#74738A] transition-colors"
            title="Minimize drawer"
            aria-label="Minimize drawer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages Stream */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-[#F4F3FF] border border-[#DDD8F8] flex items-center justify-center text-[#8B45F5]">
              <Bot className="w-6 h-6 stroke-[1.8]" />
            </div>
            <p className="text-xs font-bold text-[#202033]">{assistantName} Operating Session is Ready</p>
            <p className="text-[11px] text-[#74738A] max-w-xs">
              Call &ldquo;{assistantName}&rdquo; or speak a command to brief your day, analyze progress, start focus sessions, check finances in ₹, or manage tasks.
            </p>
          </div>
        ) : (
          messages.map((m) => {
            const isUser = m.role === 'user';
            return (
              <div
                key={m.id}
                className={`flex gap-2.5 max-w-[88%] ${isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
              >
                <div
                  className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 text-white text-xs ${
                    isUser
                      ? 'bg-[#8B45F5]'
                      : 'bg-[#6935C8] border border-white/40 shadow-xs'
                  }`}
                >
                  {isUser ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                </div>

                <div className="space-y-1">
                  {/* Tool Grounding Indicator */}
                  {!isUser && m.toolUsed && (
                    <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#F4F3FF] border border-[#DDD8F8] text-[10px] font-bold text-[#8B45F5] mb-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
                      <span>Grounded via {m.toolUsed.replace(/_/g, ' ')}</span>
                    </div>
                  )}

                  {/* Message Bubble */}
                  <div
                    className={`rounded-2xl p-3 text-xs leading-relaxed ${
                      isUser
                        ? 'bg-[#8B45F5] text-white rounded-tr-xs shadow-xs'
                        : 'bg-[#F8F7FF] text-[#202033] border border-[#E5E2F5] rounded-tl-xs shadow-2xs whitespace-pre-wrap'
                    }`}
                  >
                    {m.content}
                  </div>

                  {/* Message Action Controls */}
                  {!isUser && (
                    <div className="flex items-center gap-2 pt-0.5 px-1 text-[10px] text-[#74738A]">
                      <span>{new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      <button
                        onClick={() => handleCopy(m.id, m.content)}
                        className="hover:text-[#8B45F5] transition-colors"
                        title="Copy text"
                      >
                        {copiedId === m.id ? (
                          <span className="text-[#10B981] font-bold">Copied!</span>
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                      <button
                        onClick={() => onSpeakMessage(m.content)}
                        className="hover:text-[#8B45F5] transition-colors"
                        title="Speak aloud"
                      >
                        <Volume2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}

        {/* Embedded Consequential Action Proposal Card */}
        {pendingAction && (
          <div className="pt-2">
            <AIActionConfirmation
              proposal={pendingAction}
              onConfirm={onConfirmAction}
              onReject={onRejectAction}
            />
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
};

