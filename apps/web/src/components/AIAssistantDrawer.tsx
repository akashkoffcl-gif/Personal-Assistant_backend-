'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { toast } from '@/components/Toast';
import { AIAvatar } from '@/components/AIAvatar';
import {
  Sparkles,
  X,
  Send,
  Bot,
  User,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  Maximize2,
  Mic,
  MicOff,
  Copy,
  RotateCcw,
  ShieldCheck,
  Check,
  Square,
  Volume2,
  VolumeX,
} from 'lucide-react';

interface AIAssistantDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSmartPlanner?: () => void;
  onOpenFullWorkspace?: () => void;
}

export const AIAssistantDrawer: React.FC<AIAssistantDrawerProps> = ({
  isOpen,
  onClose,
  onOpenSmartPlanner,
  onOpenFullWorkspace,
}) => {
  const queryClient = useQueryClient();

  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [voiceMuted, setVoiceMuted] = useState(false);
  const [messages, setMessages] = useState<Array<{
    id: string;
    role: string;
    content: string;
    toolUsed?: string | null;
    proposedAction?: any;
  }>>([
    {
      id: 'welcome',
      role: 'ASSISTANT',
      content:
        "Hello Selma! I'm your Personal Assistant AI, powered by Google Gemini. I have live access to your schedule, productivity metrics, knowledge notes, and finances. How can I assist you today?",
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const [isDictating, setIsDictating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [isOpen, messages]);

  // Speech Recognition
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = true;
      rec.lang = 'en-US';
      rec.onresult = (e: any) => {
        let transcript = '';
        for (let i = 0; i < e.results.length; i++) {
          transcript += e.results[i][0].transcript;
        }
        if (transcript) setInputText((prev) => (prev ? `${prev} ${transcript}` : transcript));
      };
      rec.onend = () => setIsDictating(false);
      rec.onerror = () => setIsDictating(false);
      recognitionRef.current = rec;
    }
  }, []);

  const toggleDictation = () => {
    if (!recognitionRef.current) {
      toast.info('Voice Fallback', 'Speech recognition unavailable in this browser.');
      return;
    }
    if (isDictating) {
      recognitionRef.current.stop();
      setIsDictating(false);
    } else {
      setIsDictating(true);
      recognitionRef.current.start();
    }
  };

  // Send Mutation
  const sendMessageMutation = useMutation({
    mutationFn: (text: string) => api.sendAIChatMessage(text, activeConversationId || undefined),
    onSuccess: (data: any) => {
      if (!activeConversationId && data.conversationId) {
        setActiveConversationId(data.conversationId);
      }

      setMessages((prev) => [
        ...prev,
        {
          id: data.message.id || String(Date.now()),
          role: 'ASSISTANT',
          content: data.message.content,
          toolUsed: data.toolUsed,
          proposedAction: data.proposedAction,
        },
      ]);

      if (!voiceMuted && 'speechSynthesis' in window && data?.message?.content) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(data.message.content);
        utterance.rate = 1.05;
        window.speechSynthesis.speak(utterance);
      }
    },
    onError: (err: any) => {
      toast.error('AI Request Failed', err?.message || 'Failed connecting to assistant.');
    },
  });

  // Action Execution Mutation
  const executeActionMutation = useMutation({
    mutationFn: ({ actionId, confirmed }: { actionId: string; confirmed: boolean }) =>
      api.executeAIAction(actionId, confirmed),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks-all'] });
      queryClient.invalidateQueries({ queryKey: ['daily-kpi'] });

      if (variables.confirmed) {
        toast.success('Action Confirmed', 'The requested change has been committed.');
      } else {
        toast.info('Action Rejected');
      }

      setMessages((prev) =>
        prev.map((m) =>
          m.proposedAction?.id === variables.actionId
            ? { ...m, proposedAction: { ...m.proposedAction, status: variables.confirmed ? 'EXECUTED' : 'REJECTED' } }
            : m,
        ),
      );
    },
    onError: (err: any) => {
      toast.error('Execution Failed', err?.message || 'Could not execute the action.');
    },
  });

  const handleSend = () => {
    const trimmed = inputText.trim();
    if (!trimmed || sendMessageMutation.isPending) return;

    setMessages((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        role: 'USER',
        content: trimmed,
      },
    ]);

    setInputText('');
    sendMessageMutation.mutate(trimmed);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to Clipboard');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-xs flex justify-end animate-fade-in">
      <div className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col border-l border-[#E5E2F5] animate-slide-left">
        {/* Drawer Header */}
        <div className="p-4 border-b border-[#F0F2FA] flex items-center justify-between shrink-0 bg-[#FBFBFE]">
          <div className="flex items-center gap-2.5">
            <AIAvatar
              state={sendMessageMutation.isPending ? 'thinking' : 'idle'}
              size="sm"
            />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-[#202033] tracking-tight">AI Assistant</h3>
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#ECFDF5] text-[#16A36A] border border-[#A7F3D0]">
                  Grounded
                </span>
              </div>
              <p className="text-[10px] text-[#74738A]">Gemini 1.5 &bull; Personal Operating Partner</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {onOpenFullWorkspace && (
              <button
                onClick={() => {
                  onClose();
                  onOpenFullWorkspace();
                }}
                className="p-2 rounded-xl text-[#74738A] hover:text-[#8B45F5] hover:bg-[#F4F3FF] transition-colors"
                title="Expand into Full Workspace"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={() => setVoiceMuted(!voiceMuted)}
              className="p-2 rounded-xl text-[#74738A] hover:text-[#8B45F5] hover:bg-[#F4F3FF] transition-colors"
              title={voiceMuted ? 'Unmute voice playback' : 'Mute voice playback'}
            >
              {voiceMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-[#74738A] hover:text-[#202033] hover:bg-[#F4F3FF] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 custom-scrollbar bg-white">
          {messages.map((m) => {
            const isUser = m.role === 'USER';

            return (
              <div
                key={m.id}
                className={`flex gap-2.5 max-w-[85%] ${isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
              >
                <div
                  className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 mt-0.5 shadow-2xs ${
                    isUser
                      ? 'bg-[#8B45F5] text-white font-bold text-xs'
                      : 'bg-[#F4F3FF] border border-[#DDD8F8] text-[#8B45F5]'
                  }`}
                >
                  {isUser ? 'S' : <Bot className="w-3.5 h-3.5" />}
                </div>

                <div className={`space-y-1.5 min-w-0 ${isUser ? 'items-end' : 'items-start'}`}>
                  <div
                    className={`p-3 rounded-2xl text-xs font-medium leading-relaxed ${
                      isUser
                        ? 'bg-[#8B45F5] text-white rounded-tr-xs'
                        : 'bg-[#F8F7FF] text-[#202033] border border-[#E5E2F5] rounded-tl-xs whitespace-pre-line'
                    }`}
                  >
                    {m.content}
                  </div>

                  {/* Proposed Action Card */}
                  {m.proposedAction && m.proposedAction.status === 'PROPOSED' && (
                    <div className="p-3 rounded-xl bg-gradient-to-br from-[#F4F3FF] to-white border-2 border-[#8B45F5]/40 shadow-xs space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-[#6935C8]">
                        <ShieldCheck className="w-3.5 h-3.5 text-[#8B45F5]" />
                        <span>Action Proposal</span>
                      </div>
                      <p className="text-xs font-extrabold text-[#202033]">{m.proposedAction.description}</p>
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          onClick={() => executeActionMutation.mutate({ actionId: m.proposedAction.id, confirmed: true })}
                          disabled={executeActionMutation.isPending}
                          className="px-3 py-1.5 rounded-lg bg-[#8B45F5] hover:bg-[#7839D6] text-white font-bold text-xs flex items-center gap-1"
                        >
                          <Check className="w-3 h-3 stroke-[3]" />
                          <span>Confirm</span>
                        </button>
                        <button
                          onClick={() => executeActionMutation.mutate({ actionId: m.proposedAction.id, confirmed: false })}
                          disabled={executeActionMutation.isPending}
                          className="px-3 py-1.5 rounded-lg border border-[#E5E2F5] bg-white text-[#74738A] hover:bg-[#F4F3FF] text-xs font-bold"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  )}

                  {!isUser && (
                    <div className="flex items-center gap-2 text-[10px] text-[#74738A]">
                      <button
                        onClick={() => copyToClipboard(m.content)}
                        className="hover:text-[#8B45F5] flex items-center gap-0.5"
                      >
                        <Copy className="w-2.5 h-2.5" />
                        <span>Copy</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {sendMessageMutation.isPending && (
            <div className="flex items-center gap-2.5 mr-auto">
              <div className="w-7 h-7 rounded-xl bg-[#F4F3FF] border border-[#DDD8F8] flex items-center justify-center text-[#8B45F5]">
                <Bot className="w-3.5 h-3.5 animate-spin" />
              </div>
              <div className="p-2.5 rounded-2xl bg-[#F8F7FF] border border-[#DDD8F8] flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#8B45F5] animate-bounce" />
                <span className="w-1.5 h-1.5 rounded-full bg-[#8B45F5] animate-bounce [animation-delay:0.2s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-[#8B45F5] animate-bounce [animation-delay:0.4s]" />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Prompts Bar */}
        <div className="px-3 py-2 border-t border-[#F0F2FA] bg-[#FBFBFE] flex items-center gap-1.5 overflow-x-auto custom-scrollbar text-[10px]">
          {[
            '🎙️ Good morning. Brief me.',
            '⏱️ Start 25m Focus Session',
            '📅 Next scheduled meeting?',
            '💰 Show monthly budget',
          ].map((prompt, i) => (
            <button
              key={i}
              onClick={() => {
                setInputText(prompt);
                setMessages((prev) => [...prev, { id: String(Date.now()), role: 'USER', content: prompt }]);
                sendMessageMutation.mutate(prompt);
              }}
              className="px-2.5 py-1 rounded-lg border border-[#E5E2F5] bg-white hover:border-[#8B45F5] hover:bg-[#F4F3FF] text-[#202033] font-semibold whitespace-nowrap transition-colors"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Composer */}
        <div className="p-3 border-t border-[#F0F2FA] bg-white flex items-center gap-2 shrink-0">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask or command assistant..."
            className="flex-1 px-3.5 py-2.5 rounded-xl border border-[#E5E2F5] focus:outline-none focus:border-[#8B45F5] text-xs font-medium text-[#202033] bg-[#F8F7FF]"
          />

          <button
            onClick={toggleDictation}
            className={`p-2.5 rounded-xl transition-all ${
              isDictating
                ? 'bg-[#E05268] text-white animate-pulse'
                : 'bg-[#F4F3FF] hover:bg-[#EDE9FE] text-[#8B45F5]'
            }`}
            title={isDictating ? 'Stop dictating' : 'Dictate voice'}
          >
            {isDictating ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>

          <button
            onClick={handleSend}
            disabled={!inputText.trim() || sendMessageMutation.isPending}
            className="p-2.5 rounded-xl bg-[#8B45F5] hover:bg-[#7839D6] disabled:opacity-40 text-white shadow-xs transition-transform active:scale-95"
          >
            <Send className="w-4 h-4 stroke-[2.2]" />
          </button>
        </div>
      </div>
    </div>
  );
};
