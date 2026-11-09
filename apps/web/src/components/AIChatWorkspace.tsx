'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { toast } from '@/components/Toast';
import { AIAvatar } from '@/components/AIAvatar';
import { formatINR } from '@/lib/currency';
import {
  Sparkles,
  Bot,
  User,
  Send,
  Mic,
  MicOff,
  Copy,
  RotateCcw,
  Plus,
  Search,
  Trash2,
  Edit2,
  Check,
  X,
  Volume2,
  VolumeX,
  ShieldCheck,
  Clock,
  Calendar,
  Wallet,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  ChevronLeft,
  Eye,
  EyeOff,
  Layers,
  ArrowRight,
} from 'lucide-react';

interface AIChatWorkspaceProps {
  onOpenVoiceModal?: () => void;
  onNavigateToTab?: (tab: string) => void;
}

export const AIChatWorkspace: React.FC<AIChatWorkspaceProps> = ({
  onOpenVoiceModal,
  onNavigateToTab,
}) => {
  const queryClient = useQueryClient();

  // State
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [conversationSearch, setConversationSearch] = useState('');
  const [inputMessage, setInputMessage] = useState('');
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);
  const [editingConvId, setEditingConvId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [voiceMuted, setVoiceMuted] = useState(false);
  const [showFinanceAmounts, setShowFinanceAmounts] = useState(false);
  const [isVoiceTranscribing, setIsVoiceTranscribing] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);

  // 1. Fetch Conversations List
  const { data: convData, refetch: refetchConversations } = useQuery({
    queryKey: ['ai-conversations'],
    queryFn: () => api.getAIConversations(),
    staleTime: 15000,
  });
  const conversations: any[] = Array.isArray(convData) ? convData : (convData as any)?.data || [];

  // 2. Fetch Active Conversation Messages
  const { data: activeConvData, isLoading: messagesLoading } = useQuery({
    queryKey: ['ai-conversation', activeConversationId],
    queryFn: () => (activeConversationId ? api.getAIConversationById(activeConversationId) : null),
    enabled: !!activeConversationId,
  });

  const messages = activeConvData?.messages || [
    {
      id: 'welcome',
      role: 'ASSISTANT',
      content:
        "Good day, Selma. I am your Intelligent Personal Operating Partner powered by Google Gemini. I have real-time access to your schedules, tasks, habits, focus studio, and finances.\n\nAsk me for an executive morning briefing, to schedule deep work, or to update tasks.",
      createdAt: new Date().toISOString(),
    },
  ];

  // 3. Fetch Executive Context for Right Panel
  const todayStr = new Date().toISOString().substring(0, 10);
  const { data: briefingData } = useQuery({
    queryKey: ['ai-briefing'],
    queryFn: () => api.getAIBriefing(),
    staleTime: 30000,
  });

  const { data: financeData } = useQuery({
    queryKey: ['finance-analytics', todayStr.substring(0, 7)],
    queryFn: () => api.getFinanceAnalytics(todayStr.substring(0, 7)),
    staleTime: 30000,
  });

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, messagesLoading]);

  // Speech Recognition Setup for Textarea Voice Input
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (e: any) => {
        let transcript = '';
        for (let i = 0; i < e.results.length; i++) {
          transcript += e.results[i][0].transcript;
        }
        if (transcript) setInputMessage((prev) => (prev ? `${prev} ${transcript}` : transcript));
      };
      recognition.onend = () => setIsVoiceTranscribing(false);
      recognition.onerror = () => setIsVoiceTranscribing(false);
      recognitionRef.current = recognition;
    }
  }, []);

  const toggleVoiceInput = () => {
    if (!recognitionRef.current) {
      toast.info('Voice Fallback', 'Speech recognition unavailable in this browser.');
      return;
    }
    if (isVoiceTranscribing) {
      recognitionRef.current.stop();
      setIsVoiceTranscribing(false);
    } else {
      setIsVoiceTranscribing(true);
      recognitionRef.current.start();
    }
  };

  // 4. Send Message Mutation
  const sendMutation = useMutation({
    mutationFn: (text: string) => api.sendAIChatMessage(text, activeConversationId || undefined),
    onSuccess: (data: any) => {
      if (!activeConversationId && data.conversationId) {
        setActiveConversationId(data.conversationId);
      }
      queryClient.invalidateQueries({ queryKey: ['ai-conversations'] });
      queryClient.invalidateQueries({ queryKey: ['ai-conversation', data.conversationId || activeConversationId] });
      setInputMessage('');

      if (!voiceMuted && 'speechSynthesis' in window && data?.message?.content) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(data.message.content);
        utterance.rate = 1.05;
        window.speechSynthesis.speak(utterance);
      }
    },
    onError: (err: any) => {
      toast.error('AI Chat Error', err?.message || 'Could not send message.');
    },
  });

  // 5. Action Execution Mutation
  const executeActionMutation = useMutation({
    mutationFn: ({ actionId, confirmed }: { actionId: string; confirmed: boolean }) =>
      api.executeAIAction(actionId, confirmed),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['ai-briefing'] });
      queryClient.invalidateQueries({ queryKey: ['ai-conversation', activeConversationId] });
      if (vars.confirmed) {
        toast.success('Action Confirmed', 'The operation was executed on your live system.');
      } else {
        toast.info('Action Rejected');
      }
    },
    onError: (err: any) => {
      toast.error('Execution Failed', err?.message || 'Action could not be executed.');
    },
  });

  // Rename Conversation Mutation
  const renameMutation = useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) => api.renameAIConversation(id, title),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-conversations'] });
      setEditingConvId(null);
      toast.success('Conversation Renamed');
    },
  });

  // Delete Conversation Mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteAIConversation(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['ai-conversations'] });
      if (activeConversationId === id) setActiveConversationId(null);
      toast.success('Conversation Deleted');
    },
  });

  const handleSendMessage = () => {
    const trimmed = inputMessage.trim();
    if (!trimmed || sendMutation.isPending) return;
    sendMutation.mutate(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to Clipboard');
  };

  // Filter conversations
  const filteredConversations = conversations.filter((c) =>
    (c.title || 'Untitled Chat').toLowerCase().includes(conversationSearch.toLowerCase()),
  );

  return (
    <div className="flex h-[calc(100vh-100px)] min-h-[580px] bg-white rounded-2xl sm:rounded-3xl border border-[#E5E2F5] shadow-[0_4px_24px_rgba(139,69,245,0.04)] overflow-hidden select-none">
      {/* =========================================================================
          ZONE 1: CONVERSATION NAVIGATION (LEFT 280px)
         ========================================================================= */}
      <div className="w-72 bg-[#FBFBFE] border-r border-[#E5E2F5] flex flex-col shrink-0">
        {/* Header & New Chat Button */}
        <div className="p-3.5 border-b border-[#E5E2F5] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#8B45F5] text-white flex items-center justify-center shadow-xs">
                <Bot className="w-4 h-4" />
              </div>
              <span className="text-xs font-black text-[#202033] tracking-tight">AI Conversations</span>
            </div>
          </div>

          <button
            onClick={() => {
              setActiveConversationId(null);
              setInputMessage('');
            }}
            className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-[#8B45F5] to-[#6935C8] hover:from-[#7839D6] hover:to-[#5B21B6] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all transform active:scale-98"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>New Conversation</span>
          </button>

          {/* Search Bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#74738A] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={conversationSearch}
              onChange={(e) => setConversationSearch(e.target.value)}
              placeholder="Search chats..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-[#E5E2F5] bg-white text-[11px] font-medium text-[#202033] focus:outline-none focus:border-[#8B45F5]"
            />
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
          {filteredConversations.length === 0 ? (
            <div className="p-4 text-center text-xs text-[#74738A]">
              No conversations found. Start a new session.
            </div>
          ) : (
            filteredConversations.map((c) => {
              const isActive = c.id === activeConversationId;
              const isEditing = editingConvId === c.id;

              return (
                <div
                  key={c.id}
                  onClick={() => !isEditing && setActiveConversationId(c.id)}
                  className={`p-2.5 rounded-xl transition-all cursor-pointer group flex items-center justify-between gap-2 ${
                    isActive
                      ? 'bg-[#F4F3FF] border border-[#DDD8F8] text-[#8B45F5] font-bold shadow-2xs'
                      : 'hover:bg-white border border-transparent text-[#202033]'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    {isEditing ? (
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="text"
                          value={editingTitle}
                          onChange={(e) => setEditingTitle(e.target.value)}
                          className="w-full text-xs px-1.5 py-0.5 rounded border border-[#8B45F5] focus:outline-none"
                          autoFocus
                        />
                        <button
                          onClick={() => renameMutation.mutate({ id: c.id, title: editingTitle })}
                          className="p-1 text-[#10B981] hover:bg-[#ECFDF5] rounded"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => setEditingConvId(null)}
                          className="p-1 text-[#E05268] hover:bg-[#FFEAEF] rounded"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <p className="text-xs truncate">{c.title || 'Untitled Chat'}</p>
                        <span className="text-[10px] text-[#74738A] block font-normal">
                          {c.updatedAt ? new Date(c.updatedAt).toLocaleDateString([], { month: 'short', day: 'numeric' }) : ''}
                        </span>
                      </>
                    )}
                  </div>

                  {/* Actions (Rename / Delete) */}
                  {!isEditing && (
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingConvId(c.id);
                          setEditingTitle(c.title || '');
                        }}
                        className="p-1 rounded text-[#74738A] hover:text-[#8B45F5] hover:bg-[#EAE9FF]"
                        title="Rename Chat"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm('Delete this conversation?')) {
                            deleteMutation.mutate(c.id);
                          }
                        }}
                        className="p-1 rounded text-[#74738A] hover:text-[#E05268] hover:bg-[#FFEAEF]"
                        title="Delete Chat"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* =========================================================================
          ZONE 2: CHAT WORKSPACE (CENTER FLEX-1)
         ========================================================================= */}
      <div className="flex-1 flex flex-col min-w-0 bg-white">
        {/* Top Workspace Header */}
        <div className="px-5 py-3 border-b border-[#F0F2FA] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <AIAvatar
              state={sendMutation.isPending ? 'thinking' : 'idle'}
              size="sm"
            />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs sm:text-sm font-extrabold text-[#202033] tracking-tight">
                  Executive Partner
                </h3>
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#ECFDF5] text-[#16A36A] border border-[#A7F3D0]">
                  Gemini 1.5 Grounded
                </span>
              </div>
              <p className="text-[10px] text-[#74738A] mt-0.5">
                Authoritative personal intelligence grounded in your system records.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOpenVoiceModal && (
              <button
                onClick={onOpenVoiceModal}
                className="px-3 py-1.5 rounded-xl border border-[#DDD8F8] bg-[#F4F3FF] hover:bg-[#EDE9FE] text-[#8B45F5] text-xs font-bold flex items-center gap-1.5 transition-colors"
                title="Open Dedicated Voice Studio"
              >
                <Mic className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Voice Assistant</span>
              </button>
            )}

            <button
              onClick={() => setVoiceMuted(!voiceMuted)}
              className={`p-2 rounded-xl border transition-colors ${
                voiceMuted
                  ? 'border-[#FECDD6] bg-[#FFEAEF] text-[#E05268]'
                  : 'border-[#E5E2F5] text-[#74738A] hover:bg-[#F4F3FF] hover:text-[#8B45F5]'
              }`}
              title={voiceMuted ? 'Voice output muted' : 'Voice output active'}
            >
              {voiceMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>

            <button
              onClick={() => setIsRightPanelOpen(!isRightPanelOpen)}
              className="p-2 rounded-xl border border-[#E5E2F5] text-[#74738A] hover:bg-[#F4F3FF] hover:text-[#202033] transition-colors"
              title={isRightPanelOpen ? 'Hide Context Panel' : 'Show Context Panel'}
            >
              {isRightPanelOpen ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 custom-scrollbar">
          {messages.map((m: any, idx: number) => {
            const isUser = m.role === 'USER';

            return (
              <div
                key={m.id || idx}
                className={`flex gap-3 max-w-2xl ${isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
              >
                {/* Avatar Icon */}
                <div
                  className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 mt-0.5 shadow-2xs ${
                    isUser
                      ? 'bg-[#8B45F5] text-white font-bold text-xs'
                      : 'bg-[#F4F3FF] border border-[#DDD8F8] text-[#8B45F5]'
                  }`}
                >
                  {isUser ? 'S' : <Bot className="w-4 h-4" />}
                </div>

                {/* Message Body */}
                <div className={`space-y-2 min-w-0 ${isUser ? 'items-end' : 'items-start'}`}>
                  <div
                    className={`p-3.5 rounded-2xl text-xs font-medium leading-relaxed shadow-2xs ${
                      isUser
                        ? 'bg-[#8B45F5] text-white rounded-tr-xs'
                        : 'bg-[#F8F7FF] text-[#202033] border border-[#E5E2F5] rounded-tl-xs whitespace-pre-line'
                    }`}
                  >
                    {m.content}
                  </div>

                  {/* Grounded Tool Results Card */}
                  {m.toolCalls && (
                    <div className="p-2.5 rounded-xl bg-white border border-[#DDD8F8] text-[11px] shadow-2xs flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-[#8B45F5] shrink-0" />
                      <span className="font-bold text-[#6935C8]">
                        Grounded with {m.toolCalls.tool?.replace(/_/g, ' ')}
                      </span>
                    </div>
                  )}

                  {/* Proposed Action Confirmation Card */}
                  {m.proposedAction && m.proposedAction.status === 'PROPOSED' && (
                    <div className="p-3.5 rounded-2xl bg-gradient-to-br from-[#F4F3FF] to-white border-2 border-[#8B45F5]/40 shadow-xs space-y-2.5">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-[#6935C8]">
                        <ShieldCheck className="w-4 h-4 text-[#8B45F5]" />
                        <span>Action Proposal</span>
                      </div>
                      <p className="text-xs font-extrabold text-[#202033]">{m.proposedAction.description}</p>
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          onClick={() => executeActionMutation.mutate({ actionId: m.proposedAction.id, confirmed: true })}
                          disabled={executeActionMutation.isPending}
                          className="px-3 py-1.5 rounded-xl bg-[#8B45F5] hover:bg-[#7839D6] text-white font-bold text-xs flex items-center gap-1"
                        >
                          <Check className="w-3 h-3 stroke-[3]" />
                          <span>Confirm</span>
                        </button>
                        <button
                          onClick={() => executeActionMutation.mutate({ actionId: m.proposedAction.id, confirmed: false })}
                          disabled={executeActionMutation.isPending}
                          className="px-3 py-1.5 rounded-xl border border-[#E5E2F5] bg-white text-[#74738A] hover:bg-[#F4F3FF] text-xs font-bold"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Actions: Copy */}
                  {!isUser && (
                    <div className="flex items-center gap-2 text-[10px] text-[#74738A]">
                      <button
                        onClick={() => copyToClipboard(m.content)}
                        className="hover:text-[#8B45F5] flex items-center gap-1 transition-colors"
                      >
                        <Copy className="w-3 h-3" />
                        <span>Copy</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Thinking Indicator */}
          {sendMutation.isPending && (
            <div className="flex items-center gap-3 mr-auto">
              <div className="w-7 h-7 rounded-xl bg-[#F4F3FF] border border-[#DDD8F8] flex items-center justify-center text-[#8B45F5]">
                <Bot className="w-4 h-4 animate-spin" />
              </div>
              <div className="p-3 rounded-2xl bg-[#F8F7FF] border border-[#DDD8F8] flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#8B45F5] animate-bounce" />
                <span className="w-1.5 h-1.5 rounded-full bg-[#8B45F5] animate-bounce [animation-delay:0.2s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-[#8B45F5] animate-bounce [animation-delay:0.4s]" />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Multiline Composer Area */}
        <div className="p-3 sm:p-4 border-t border-[#F0F2FA] space-y-2.5 shrink-0 bg-[#FBFBFE]">
          {/* Quick Prompts Bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar text-[10px]">
            {[
              '🎙️ Good morning. Brief me.',
              '⏱️ Start 25m Focus Session',
              '📅 What is my next meeting?',
              '💰 Show my monthly budget & spend',
              '✅ Top priorities today',
            ].map((prompt, i) => (
              <button
                key={i}
                onClick={() => {
                  setInputMessage(prompt);
                  sendMutation.mutate(prompt);
                }}
                disabled={sendMutation.isPending}
                className="px-2.5 py-1 rounded-lg border border-[#E5E2F5] bg-white hover:border-[#8B45F5] hover:bg-[#F4F3FF] text-[#202033] font-semibold whitespace-nowrap transition-colors"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Input Box */}
          <div className="relative flex items-end gap-2 bg-white rounded-2xl border border-[#DDD8F8] p-2 shadow-sm focus-within:border-[#8B45F5] focus-within:ring-2 focus-within:ring-[#8B45F5]/10 transition-all">
            <textarea
              ref={textareaRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything, request actions, or dictate... (Enter to send, Shift+Enter for newline)"
              rows={2}
              className="flex-1 resize-none bg-transparent text-xs font-medium text-[#202033] focus:outline-none p-1.5"
            />

            <div className="flex items-center gap-1.5 pb-0.5">
              <button
                onClick={toggleVoiceInput}
                className={`p-2 rounded-xl transition-all ${
                  isVoiceTranscribing
                    ? 'bg-[#E05268] text-white animate-pulse'
                    : 'bg-[#F4F3FF] hover:bg-[#EDE9FE] text-[#8B45F5]'
                }`}
                title={isVoiceTranscribing ? 'Stop voice input' : 'Dictate message'}
              >
                {isVoiceTranscribing ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>

              <button
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || sendMutation.isPending}
                className="p-2 rounded-xl bg-[#8B45F5] hover:bg-[#7839D6] disabled:opacity-40 text-white shadow-xs transition-transform active:scale-95"
                title="Send Message"
              >
                <Send className="w-4 h-4 stroke-[2.2]" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          ZONE 3: CONTEXT & ACTIONS PANEL (RIGHT 320px COLLAPSIBLE)
         ========================================================================= */}
      {isRightPanelOpen && (
        <div className="w-80 bg-[#FBFBFE] border-l border-[#E5E2F5] p-4 flex flex-col gap-4 overflow-y-auto shrink-0 custom-scrollbar">
          <div className="flex items-center justify-between pb-2 border-b border-[#E5E2F5]">
            <div className="flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-[#8B45F5]" />
              <h4 className="text-xs font-black text-[#202033] uppercase tracking-wider">
                Operating Context
              </h4>
            </div>
            <span className="text-[10px] font-bold text-[#16A36A]">Live Grounded</span>
          </div>

          {/* Today's Agenda Snippet */}
          <div className="bg-white p-3 rounded-xl border border-[#E5E2F5] space-y-2 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#74738A] flex items-center gap-1">
                <Calendar className="w-3 h-3 text-[#8B45F5]" />
                <span>Today&apos;s Agenda</span>
              </span>
              <span className="text-[10px] font-bold text-[#202033]">{briefingData?.tasksTotal || 0} scheduled</span>
            </div>
            {briefingData?.topPriorities && briefingData.topPriorities.length > 0 ? (
              <div className="space-y-1">
                {briefingData.topPriorities.slice(0, 3).map((p: string, i: number) => (
                  <p key={i} className="text-xs font-medium text-[#202033] truncate">
                    &bull; {p}
                  </p>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-[#74738A]">All priority slots clear.</p>
            )}
          </div>

          {/* Focus Studio Snippet */}
          <div className="bg-white p-3 rounded-xl border border-[#E5E2F5] space-y-2 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#74738A] flex items-center gap-1">
                <Clock className="w-3 h-3 text-[#6366F1]" />
                <span>Focus Studio</span>
              </span>
              <span className="text-[10px] font-bold text-[#6366F1]">
                {briefingData?.focusMinutesToday || 0}/{briefingData?.focusTargetMinutes || 120}m
              </span>
            </div>
            <div className="w-full bg-[#F4F4FD] h-1.5 rounded-full overflow-hidden">
              <div
                style={{
                  width: `${Math.min(
                    100,
                    Math.round(((briefingData?.focusMinutesToday || 0) / (briefingData?.focusTargetMinutes || 120)) * 100),
                  )}%`,
                }}
                className="bg-[#6366F1] h-full rounded-full transition-all"
              />
            </div>
          </div>

          {/* Privacy-Masked Finance Summary */}
          <div className="bg-white p-3 rounded-xl border border-[#E5E2F5] space-y-2 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#74738A] flex items-center gap-1">
                <Wallet className="w-3 h-3 text-[#10B981]" />
                <span>Finances</span>
              </span>
              <button
                onClick={() => setShowFinanceAmounts(!showFinanceAmounts)}
                className="text-[#74738A] hover:text-[#202033]"
              >
                {showFinanceAmounts ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              </button>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-[11px] text-[#74738A]">Net Worth</span>
              <span className="text-xs font-black text-[#202033]">
                {showFinanceAmounts
                  ? formatINR(financeData?.data?.netWorth || 0)
                  : '••••••'}
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-[11px] text-[#74738A]">Monthly Savings</span>
              <span className="text-xs font-bold text-[#16A36A]">
                {financeData?.data?.savingsRate || 70}%
              </span>
            </div>
          </div>

          {/* Quick Tab Jump */}
          <div className="pt-2 border-t border-[#E5E2F5] space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#74738A] block mb-1">
              Workspace Jump
            </span>
            {[
              { label: 'Smart Day Planner', tab: 'smart-planner' },
              { label: 'Personal Finance', tab: 'finance' },
              { label: 'Focus Studio', tab: 'focus' },
              { label: 'Command Center', tab: 'dashboard' },
            ].map((item, i) => (
              <button
                key={i}
                onClick={() => onNavigateToTab?.(item.tab)}
                className="w-full text-left px-2 py-1.5 rounded-lg text-xs font-semibold text-[#202033] hover:bg-white hover:text-[#8B45F5] transition-colors flex items-center justify-between"
              >
                <span>{item.label}</span>
                <ArrowRight className="w-3 h-3 text-[#9CA3AF]" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

