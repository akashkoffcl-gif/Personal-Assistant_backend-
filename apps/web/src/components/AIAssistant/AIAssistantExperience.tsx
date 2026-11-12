'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { toast } from '@/components/Toast';
import { AIAvatarStage } from './AIAvatarStage';
import { AIFloatingCommandBar } from './AIFloatingCommandBar';
import { AIQuickSuggestions } from './AIQuickSuggestions';
import { AIResponseTranscript } from './AIResponseTranscript';
import { AIActionConfirmation } from './AIActionConfirmation';
import { AIExpandedConversation } from './AIExpandedConversation';
import { AIAssistantSettings } from './AIAssistantSettings';
import {
  AvatarState,
  AssistantInvocationState,
  AssistantMessage,
  ActionProposal,
  AIAssistantSettingsState,
  WorkflowExecutionProgress,
} from './types';
import { UniversalWorkspaceNavigator } from '@/lib/workspace-navigation';

interface AIAssistantExperienceProps {
  onTaskCreated?: () => void;
  className?: string;
}

export const AIAssistantExperience: React.FC<AIAssistantExperienceProps> = ({
  onTaskCreated,
  className = '',
}) => {
  const queryClient = useQueryClient();

  // Assistant Formal Lifecycle State Machine
  const [lifecycleState, setLifecycleState] = useState<AssistantInvocationState>('HIDDEN');
  const [avatarState, setAvatarState] = useState<AvatarState>('idle');
  
  // Track lifecycleState in a mutable ref to eliminate asynchronous stale closures
  const lifecycleRef = useRef<AssistantInvocationState>('HIDDEN');
  useEffect(() => {
    lifecycleRef.current = lifecycleState;
  }, [lifecycleState]);

  const [inputText, setInputText] = useState('');
  const [userTranscript, setUserTranscript] = useState('');
  const [assistantSpokenText, setAssistantSpokenText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [audioVolume, setAudioVolume] = useState(0);

  // Conversation & Pending Actions State
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [pendingAction, setPendingAction] = useState<ActionProposal | null>(null);

  // Assistant Name & Settings State
  const [settings, setSettings] = useState<AIAssistantSettingsState>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('assistant_ai_settings');
        if (saved) return JSON.parse(saved);
      } catch (e) {}
    }
    return {
      assistantName: 'Nova',
      wakeWordEnabled: true, // Enabled for responsive voice activation when calling "Nova"
      voiceURI: '',
      speechRate: 1.0,
      autoVoiceResponse: true,
      quietHoursEnabled: true,
      quietHoursStart: '22:00',
      quietHoursEnd: '07:00',
      maskFinanceAmounts: true,
      hapticFeedback: true,
      autoBackgroundAnalysis: false, // Keep false by default to prevent unwanted background fetches
    };
  });

  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);

  // Speech Recognition & Synthesis references
  const requestRecognitionRef = useRef<any>(null);
  const wakeWordRecognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const autoCloseTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Inactivity auto-dismiss: if assistant is visible and idle for 30 seconds, return to HIDDEN
  const resetAutoCloseTimer = useCallback(() => {
    if (autoCloseTimerRef.current) clearTimeout(autoCloseTimerRef.current);
    autoCloseTimerRef.current = setTimeout(() => {
      // Only close if not speaking, not listening, and no pending action
      if (!isListening && !isSpeaking && !pendingAction && lifecycleState !== 'HIDDEN') {
        dismissAssistant();
      }
    }, 30000);
  }, [isListening, isSpeaking, pendingAction, lifecycleState]);

  // Clean dismiss handler
  const dismissAssistant = useCallback(() => {
    if (autoCloseTimerRef.current) clearTimeout(autoCloseTimerRef.current);
    if (synthRef.current) synthRef.current.cancel();
    if (requestRecognitionRef.current) {
      try { requestRecognitionRef.current.stop(); } catch (e) {}
    }
    setIsSpeaking(false);
    setIsListening(false);
    setIsExpanded(false);
    setIsMinimized(false);
    setAudioVolume(0);
    setAvatarState('idle');
    setLifecycleState('HIDDEN');
  }, []);

  // Update & persist settings helper
  const handleUpdateSettings = (newVals: Partial<AIAssistantSettingsState>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newVals };
      if (typeof window !== 'undefined') {
        localStorage.setItem('assistant_ai_settings', JSON.stringify(updated));
      }
      return updated;
    });
  };

  // Load Voices & Init Speech Synthesis
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis;

      const updateVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        setAvailableVoices(voices);

        if (voices.length > 0 && !settings.voiceURI) {
          const naturalVoice =
            voices.find((v) => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Online') || v.name.includes('Google'))) ||
            voices.find((v) => v.lang.startsWith('en')) ||
            voices[0];
          if (naturalVoice) {
            setSettings((prev) => ({ ...prev, voiceURI: naturalVoice.voiceURI }));
          }
        }
      };

      updateVoices();
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }

    // Manual Custom Event Triggers from Navbar / Hotkeys
    const handleVoiceTrigger = () => {
      activateAssistant('REQUEST_LISTENING');
    };
    const handleExpandTrigger = () => {
      if (lifecycleState === 'HIDDEN') {
        activateAssistant('ACTIVATING');
      } else {
        setIsExpanded((prev) => !prev);
      }
    };

    window.addEventListener('ai-assistant:start-voice', handleVoiceTrigger);
    window.addEventListener('ai-assistant:toggle-expand', handleExpandTrigger);

    // Global keyboard shortcuts: Escape dismisses/minimizes assistant
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && lifecycleRef.current !== 'HIDDEN') {
        dismissAssistant();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('ai-assistant:start-voice', handleVoiceTrigger);
      window.removeEventListener('ai-assistant:toggle-expand', handleExpandTrigger);
      window.removeEventListener('keydown', handleKeyDown);
      if (autoCloseTimerRef.current) clearTimeout(autoCloseTimerRef.current);
    };
  }, [lifecycleState]);

  const isWithinQuietHours = () => {
    if (!settings.quietHoursEnabled) return false;
    const now = new Date();
    const currentMins = now.getHours() * 60 + now.getMinutes();

    const [startH, startM] = settings.quietHoursStart.split(':').map(Number);
    const [endH, endM] = settings.quietHoursEnd.split(':').map(Number);
    const startMins = startH * 60 + startM;
    const endMins = endH * 60 + endM;

    if (startMins <= endMins) {
      return currentMins >= startMins && currentMins < endMins;
    } else {
      return currentMins >= startMins || currentMins < endMins;
    }
  };

  // Text-To-Speech Playback with Interruption Support
  const speakText = (text: string) => {
    if (!synthRef.current || typeof window === 'undefined') return;

    if (isWithinQuietHours()) {
      toast.info('Quiet Hours Active', 'Vocal response silenced in accordance with your schedule.');
      setLifecycleState('ACTIVATING');
      setAvatarState('idle');
      resetAutoCloseTimer();
      return;
    }

    let speechSanitized = text;
    if (settings.maskFinanceAmounts) {
      speechSanitized = text.replace(/₹\s*[\d,]+(\.\d+)?/g, 'masked financial amount');
    }
    speechSanitized = speechSanitized.replace(/[*_#`]/g, '').trim();

    synthRef.current.cancel();

    const utterance = new SpeechSynthesisUtterance(speechSanitized);
    utterance.rate = settings.speechRate;
    utterance.pitch = 1.0;

    if (settings.voiceURI) {
      const selected = availableVoices.find((v) => v.voiceURI === settings.voiceURI);
      if (selected) utterance.voice = selected;
    }

    utterance.onstart = () => {
      setIsSpeaking(true);
      setLifecycleState('SPEAKING');
      setAvatarState('speaking');
      setAudioVolume(0.8);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      setAudioVolume(0);
      setAvatarState('idle');
      resetAutoCloseTimer();

      // Guarded Continuous Voice Loop: Use lifecycleRef to evaluate current state reliably
      if (lifecycleRef.current !== 'HIDDEN' && settings.autoVoiceResponse) {
        // Small guard to let audio hardware fully switch from playback to record
        setTimeout(() => {
          if (lifecycleRef.current !== 'HIDDEN') {
            startRequestListening();
          }
        }, 350);
      } else {
        setLifecycleState('ACTIVATING');
      }
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
      setAudioVolume(0);
      setAvatarState('idle');
      resetAutoCloseTimer();
      if (lifecycleRef.current !== 'HIDDEN' && settings.autoVoiceResponse) {
        setTimeout(() => {
          if (lifecycleRef.current !== 'HIDDEN') {
            startRequestListening();
          }
        }, 350);
      } else {
        setLifecycleState('ACTIVATING');
      }
    };

    synthRef.current.speak(utterance);
  };

  const stopSpeaking = () => {
    if (synthRef.current) {
      synthRef.current.cancel();
    }
    setIsSpeaking(false);
    setAudioVolume(0);
    setAvatarState('idle');
    setLifecycleState('ACTIVATING');
    resetAutoCloseTimer();
  };

  // Speech Recognition for actual prompt request
  const startRequestListening = () => {
    if (typeof window === 'undefined') return;
    if (isSpeaking) stopSpeaking();

    console.log('[NOVA AUDIO] 🎙️ Starting Active Speech Recognition (Listening for prompt)...');

    // Release background wake-word recognition if active to prevent mic conflicts
    if (wakeWordRecognitionRef.current) {
      try {
        wakeWordRecognitionRef.current.stop();
        console.log('[NOVA AUDIO] ⏸️ Paused background wake listener for active foreground recording.');
      } catch (e) {}
    }

    // Terminate any previous foreground recognition instance cleanly
    if (requestRecognitionRef.current) {
      try {
        requestRecognitionRef.current.abort();
      } catch (e) {}
      requestRecognitionRef.current = null;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      toast.warning('Speech Recognition Unavailable', 'Browser does not support native speech recognition. Please type your query.');
      setLifecycleState('ACTIVATING');
      return;
    }

    const isMobile = /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        setLifecycleState('REQUEST_LISTENING');
        setAvatarState('listening');
        setUserTranscript('');
      };

      recognition.onresult = (event: any) => {
        let interim = '';
        let final = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            final += event.results[i][0].transcript;
          } else {
            interim += event.results[i][0].transcript;
          }
        }

        const currentSpoken = (final || interim).trim();
        if (currentSpoken) {
          setUserTranscript(currentSpoken);
          setAudioVolume(0.7);
          console.log(`[NOVA AUDIO] 🗣️ User Speech Detected: "${currentSpoken}" [isFinal: ${Boolean(final)}]`);
        }

        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        const textToSubmit = final || currentSpoken;
        if (textToSubmit) {
          // Responsive speech detection: submit within 700ms on final transcript, 1100ms on interim pauses
          const delayMs = final ? 700 : 1100;
          console.log(`[NOVA AUDIO] ⏱️ Silence detected. Submitting in ${delayMs}ms...`);
          silenceTimerRef.current = setTimeout(() => {
            console.log(`[NOVA AUDIO] 🚀 Submitting user query to AI: "${textToSubmit}"`);
            stopListening();
            handleSubmitMessage(textToSubmit);
          }, delayMs);
        }
      };

      recognition.onerror = (event: any) => {
        if (event.error === 'no-speech') {
          // On mobile & desktop, no-speech is normal silence: do not stop or flicker error state
          return;
        }
        if (event.error === 'aborted') return;
        console.warn('Speech recognition error:', event.error);
        setIsListening(false);
        setAvatarState('idle');
        setAudioVolume(0);
        resetAutoCloseTimer();
      };

      recognition.onend = () => {
        // Never auto-restart in a fast loop on mobile or if user already spoke/submitted
        if (isMobile) {
          setIsListening(false);
          setAudioVolume(0);
          if (avatarState === 'listening') setAvatarState('idle');
          resetAutoCloseTimer();
          return;
        }

        // On desktop, only restart if still actively in listening state
        if (lifecycleRef.current === 'REQUEST_LISTENING') {
          try {
            recognition.start();
            return;
          } catch (e) {}
        }
        setIsListening(false);
        setAudioVolume(0);
        if (avatarState === 'listening') {
          setAvatarState('idle');
        }
        resetAutoCloseTimer();
      };

      requestRecognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error('Failed starting speech recognition:', err);
      setIsListening(false);
      setAvatarState('error');
      setTimeout(() => {
        setAvatarState('idle');
        resetAutoCloseTimer();
      }, 2000);
    }
  };

  const stopListening = () => {
    if (requestRecognitionRef.current) {
      try {
        requestRecognitionRef.current.stop();
      } catch (e) {}
    }
    setIsListening(false);
    setAudioVolume(0);
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
      if (userTranscript) {
        handleSubmitMessage(userTranscript);
      }
    } else {
      startRequestListening();
    }
  };

  // Assistant Activation Sequence
  const activateAssistant = (targetState: AssistantInvocationState = 'REQUEST_LISTENING') => {
    setLifecycleState(targetState);
    resetAutoCloseTimer();

    if (targetState === 'REQUEST_LISTENING') {
      setTimeout(() => {
        startRequestListening();
      }, 150);
    }
  };

  // Background Wake Word Detection: Unified persistent listener
  useEffect(() => {
    if (!settings.wakeWordEnabled || typeof window === 'undefined') return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    let isEffectActive = true;

    const startWakeRec = () => {
      if (!isEffectActive || wakeWordRecognitionRef.current) return;

      try {
        const wakeRec = new SpeechRecognition();
        wakeRec.continuous = true;
        wakeRec.interimResults = true;
        wakeRec.lang = 'en-US';

        wakeRec.onstart = () => {
          console.log(`[NOVA WAKE-WORD] 🟢 Wake Listener READY. State=${lifecycleRef.current}. Name="${settings.assistantName || 'Nova'}"`);
        };

        wakeRec.onresult = (e: any) => {
          if (!isEffectActive) return;
          const rawTarget = (settings.assistantName || 'Nova').trim().toLowerCase();
          const targetName = rawTarget.length >= 2 ? rawTarget : 'nova';

          let latestSpeech = '';
          for (let i = e.resultIndex; i < e.results.length; ++i) {
            latestSpeech += ' ' + e.results[i][0].transcript;
          }
          const spoken = latestSpeech.toLowerCase().trim();
          if (!spoken) return;

          console.log(`[NOVA AUDIO] 👂 Heard: "${spoken}" [Mode: ${lifecycleRef.current}]`);

          // 1. If HIDDEN: Detect Wake Word to awaken
          if (lifecycleRef.current === 'HIDDEN') {
            const isWakeMatch =
              spoken.includes(targetName) ||
              spoken.includes(`hey ${targetName}`) ||
              spoken.includes(`ok ${targetName}`) ||
              spoken.includes(`hi ${targetName}`) ||
              spoken.includes('nova') ||
              spoken.includes('noa') ||
              spoken.includes('know a') ||
              spoken.includes('hey nova') ||
              spoken.includes('hi nova') ||
              spoken.includes('ok nova') ||
              spoken.includes('jo') ||
              spoken.includes('hey jo');

            if (isWakeMatch) {
              console.log(`[NOVA WAKE-WORD] ⚡ WAKE WORD ACTIVATED! Heard: "${spoken}"`);
              toast.info('Assistant Awakened', `Hello! How can ${settings.assistantName || 'Nova'} assist you?`);
              setLifecycleState('REQUEST_LISTENING');
              setAvatarState('listening');
              setUserTranscript('');
              resetAutoCloseTimer();
            }
          } 
          // 2. If ACTIVE (REQUEST_LISTENING): Capture actual speech prompt & submit!
          else if (lifecycleRef.current === 'REQUEST_LISTENING') {
            setUserTranscript(spoken);
            setAudioVolume(0.7);

            if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = setTimeout(() => {
              console.log(`[NOVA AUDIO] 🚀 Submitting user query to AI: "${spoken}"`);
              handleSubmitMessage(spoken);
            }, 900);
          }
        };

        wakeRec.onerror = (err: any) => {
          if (err.error !== 'no-speech' && err.error !== 'aborted') {
            console.warn('[NOVA WAKE-WORD] ⚠️ Listener note:', err.error);
          }
        };

        wakeRec.onend = () => {
          wakeWordRecognitionRef.current = null;
          if (isEffectActive && settings.wakeWordEnabled && lifecycleRef.current !== 'SPEAKING') {
            setTimeout(() => {
              if (isEffectActive && settings.wakeWordEnabled && lifecycleRef.current !== 'SPEAKING') {
                startWakeRec();
              }
            }, 300);
          }
        };

        wakeWordRecognitionRef.current = wakeRec;
        wakeRec.start();
      } catch (err) {
        console.warn('Failed starting wakeRec:', err);
      }
    };

    startWakeRec();

    return () => {
      isEffectActive = false;
      if (wakeWordRecognitionRef.current) {
        try {
          wakeWordRecognitionRef.current.abort();
        } catch (e) {}
        wakeWordRecognitionRef.current = null;
      }
    };
  }, [settings.wakeWordEnabled, settings.assistantName]);

  // Submit Message Mutation (PostgreSQL + Gemini Grounding)
  const chatMutation = useMutation({
    mutationFn: async (messageText: string) => {
      setLifecycleState('THINKING');
      setAvatarState('thinking');
      const res = await api.sendAIChatMessage(
        messageText,
        conversationId || undefined,
        settings.assistantName || 'Nova',
      );
      return res;
    },
    onSuccess: (data: any) => {
      const responsePayload = data?.data || data;
      const convId = responsePayload?.conversationId;
      if (convId) setConversationId(convId);

      const assistantMsg = responsePayload?.message;
      const replyContent = assistantMsg?.content || 'Understood and synchronized with your workspace.';
      const toolUsed = responsePayload?.toolUsed;
      const toolResults = assistantMsg?.toolResults;
      const proposedAction = responsePayload?.proposedAction;

      const newMsg: AssistantMessage = {
        id: assistantMsg?.id || String(Date.now()),
        role: 'assistant',
        content: replyContent,
        timestamp: new Date().toISOString(),
        toolUsed,
        toolResults,
        actionProposal: proposedAction || null,
      };

      // Client Navigation Bridge: Check if tool execution or response requests client-side navigation
      if (typeof window !== 'undefined') {
        const clientAction = responsePayload?.clientAction || toolResults?.clientAction;
        const targetTab = responsePayload?.tab || toolResults?.tab;
        const targetModal = responsePayload?.modal || toolResults?.modal;

        if (clientAction === 'NAVIGATE_TAB' && targetTab) {
          window.dispatchEvent(new CustomEvent('ai-assistant:navigate', { detail: { tab: targetTab } }));
        } else if (clientAction === 'OPEN_MODAL' && targetModal) {
          window.dispatchEvent(new CustomEvent('ai-assistant:open-modal', { detail: { modal: targetModal } }));
        } else if (toolUsed === 'navigate_to_tab' && targetTab) {
          window.dispatchEvent(new CustomEvent('ai-assistant:navigate', { detail: { tab: targetTab } }));
        }
      }

      setMessages((prev) => [...prev, newMsg]);
      setAssistantSpokenText(replyContent);

      if (proposedAction) {
        setPendingAction(proposedAction);
        setLifecycleState('AWAITING_CONFIRMATION');
      }

      setAvatarState('success');
      setTimeout(() => {
        if (settings.autoVoiceResponse) {
          speakText(replyContent);
        } else {
          setAvatarState('idle');
          setLifecycleState('ACTIVATING');
          resetAutoCloseTimer();
        }
      }, 300);
    },
    onError: (err: any) => {
      console.error('AI Chat Error:', err);
      setLifecycleState('ERROR');
      setAvatarState('error');
      toast.error('AI Assistance Error', err?.message || 'Failed connecting to AI service.');
      setTimeout(() => {
        setAvatarState('idle');
        setLifecycleState('ACTIVATING');
        resetAutoCloseTimer();
      }, 2500);
    },
  });

  // Multi-Step Workflow SSE Execution Stream
  const [workflowProgress, setWorkflowProgress] = useState<WorkflowExecutionProgress | null>(null);

  const executeMultiStepWorkflow = async (workflowId: string, payloadHash?: string, planVersion = 1) => {
    try {
      setLifecycleState('PLANNING');
      setAvatarState('planning');

      // 1. Approve workflow atomically
      await api.approveAIWorkflow(workflowId, payloadHash);
      setLifecycleState('EXECUTING');
      setAvatarState('executing');

      // 2. Open SSE stream for real-time progress
      const token = typeof window !== 'undefined' ? localStorage.getItem('supabase_access_token') || localStorage.getItem('access_token') : null;
      const apiEndpoint = process.env.NEXT_PUBLIC_API_URL
        ? `${process.env.NEXT_PUBLIC_API_URL.replace(/\/+$/, '')}/ai/workflows/${workflowId}/execute/stream`
        : `/api/v1/ai/workflows/${workflowId}/execute/stream`;
      const response = await fetch(apiEndpoint, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!response.ok) {
        throw new Error(`Execution stream failed with status ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error('ReadableStream not supported');

      let accumulated = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });

        const lines = accumulated.split('\n');
        accumulated = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const event = JSON.parse(line.replace('data: ', ''));
              setWorkflowProgress((prev) => ({
                workflowId,
                status: event.type,
                currentStepId: event.stepId,
                progressPercent: event.progressPercent || 0,
                message: event.message,
                steps: prev?.steps || [],
              }));

              if (event.type === 'STEP_STARTED') {
                setAssistantSpokenText(event.message);
              } else if (event.type === 'COMPLETED') {
                setAvatarState('success');
                setLifecycleState('ACTIVATING');
                toast.success('Workflow Completed', 'All operations executed and verified.');
                if (settings.autoVoiceResponse) {
                  speakText('All workflow operations executed and verified successfully.');
                }
              } else if (event.type === 'PARTIALLY_COMPLETED' || event.type === 'FAILED') {
                setAvatarState('warning');
                setLifecycleState('ACTIVATING');
                toast.warning('Workflow Interrupted', event.message);
                if (settings.autoVoiceResponse) {
                  speakText(`Workflow completed with rollback. ${event.message}`);
                }
              }
            } catch (e) {}
          }
        }
      }

      setPendingAction(null);
      queryClient.invalidateQueries();
    } catch (err: any) {
      console.error('Workflow execution error:', err);
      setAvatarState('error');
      setLifecycleState('ERROR');
      toast.error('Execution Failed', err?.message || 'Workflow execution error');
      setTimeout(() => {
        setAvatarState('idle');
        setLifecycleState('ACTIVATING');
      }, 2500);
    }
  };

  // Action Execution Mutation
  const executeActionMutation = useMutation({
    mutationFn: async (actionId: string) => {
      // Check if action is multi-step workflow
      if (pendingAction?.actionType === 'MULTI_STEP_WORKFLOW') {
        const hash = pendingAction.payload?.approvalSignature?.stepPayloadHash || pendingAction.payload?.stepPayloadHash;
        const version = pendingAction.payload?.planVersion || 1;
        return executeMultiStepWorkflow(actionId, hash, version);
      }

      setLifecycleState('EXECUTING_ACTION');
      setAvatarState('executing');
      return api.executeAIAction(actionId, true);
    },
    onSuccess: () => {
      setAvatarState('success');
      toast.success('Action Executed', 'Workspace records updated successfully.');
      setPendingAction(null);

      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks-all'] });
      queryClient.invalidateQueries({ queryKey: ['daily-kpi'] });
      queryClient.invalidateQueries({ queryKey: ['focus-summary'] });
      queryClient.invalidateQueries({ queryKey: ['finance-summary'] });
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      onTaskCreated?.();

      setTimeout(() => {
        setAvatarState('idle');
        setLifecycleState('ACTIVATING');
        resetAutoCloseTimer();
      }, 2000);
    },
    onError: (err: any) => {
      setLifecycleState('ERROR');
      setAvatarState('error');
      toast.error('Action Failed', err?.message || 'Could not execute requested action.');
      setTimeout(() => {
        setAvatarState('idle');
        setLifecycleState('ACTIVATING');
        resetAutoCloseTimer();
      }, 2500);
    },
  });

  // Dispatch User Message with Voice Command Interception
  const handleSubmitMessage = (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text) return;

    resetAutoCloseTimer();

    // 1. Voice Vocal Cancellation & Interruption Check
    const lower = text.toLowerCase();
    if (lower === 'cancel' || lower === 'cancel that' || lower === 'nevermind' || lower === 'stop') {
      stopSpeaking();
      stopListening();
      if (pendingAction) {
        setPendingAction(null);
        toast.info('Action Cancelled', 'Pending operation was discarded.');
        setAssistantSpokenText('Cancelled.');
        if (settings.autoVoiceResponse) speakText('Cancelled.');
      } else {
        setAssistantSpokenText('Understood. Stopped.');
        if (settings.autoVoiceResponse) speakText('Understood.');
      }
      setLifecycleState('ACTIVATING');
      setAvatarState('idle');
      return;
    }

    // 2. Voice Vocal Confirmation Check
    if ((lower === 'confirm' || lower === 'yes' || lower === 'proceed' || lower === 'do it' || lower === 'execute') && pendingAction) {
      toast.info('Confirmed by Voice', `Executing ${pendingAction.description}`);
      executeActionMutation.mutate(pendingAction.id);
      return;
    }

    // 3. Client-Side Workspace Navigation Check
    const resolvedWorkspace = UniversalWorkspaceNavigator.resolveWorkspace(text);
    if (resolvedWorkspace) {
      UniversalWorkspaceNavigator.navigateTo(resolvedWorkspace);
      const ack = `Navigating to ${resolvedWorkspace} workspace.`;
      setAssistantSpokenText(ack);
      setAvatarState('success');
      toast.info('Workspace Navigation', ack);
      if (settings.autoVoiceResponse) speakText(ack);
      setTimeout(() => setAvatarState('idle'), 1500);
      return;
    }

    // 4. Return to previous workspace
    if (lower.includes('go back') || lower.includes('previous workspace') || lower.includes('return to previous')) {
      const prev = UniversalWorkspaceNavigator.navigateBack();
      const ack = prev ? `Returned to ${prev}.` : 'No previous workspace in history.';
      setAssistantSpokenText(ack);
      if (settings.autoVoiceResponse) speakText(ack);
      return;
    }

    // 5. Normal Assistant Conversation & Intent Dispatch
    const userMsg: AssistantMessage = {
      id: String(Date.now()),
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setUserTranscript('');

    chatMutation.mutate(text);
  };

  // If HIDDEN, do not render any visible UI in normal layout
  if (lifecycleState === 'HIDDEN') {
    return (
      <>
        {/* Settings Modal can still open if requested explicitly */}
        {isSettingsOpen && (
          <AIAssistantSettings
            isOpen={isSettingsOpen}
            onClose={() => setIsSettingsOpen(false)}
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
            availableVoices={availableVoices}
          />
        )}
      </>
    );
  }

  // Active State Render: Opened strictly on-demand
  return (
    <aside
      className={`fixed bottom-16 lg:bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center w-[96vw] sm:w-[92vw] max-w-2xl select-none animate-in fade-in slide-in-from-bottom-4 duration-300 ${className}`}
      aria-label="Google Assistant 3D AI On-Demand Interface"
    >
      {/* Top Bar with Dismiss, Minimize, and Settings Controls */}
      <div className="w-full flex justify-between items-center mb-1.5 px-3">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-violet-600"></span>
          </span>
          <span className="text-xs font-semibold text-violet-800 tracking-wide uppercase">
            {settings.assistantName || 'Nova'} Active • {lifecycleState.replace('_', ' ')}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setIsMinimized((prev) => !prev)}
            className="px-2 py-0.5 rounded-full bg-white/80 text-slate-600 hover:text-slate-900 shadow-sm border border-slate-200/60 font-medium text-xs hover:bg-white transition-all flex items-center gap-1"
            title={isMinimized ? "Restore Assistant" : "Minimize Assistant"}
          >
            {isMinimized ? '🔼 Restore' : '🔽 Minimize'}
          </button>
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-1 rounded-full text-slate-500 hover:text-slate-800 hover:bg-white/80 transition-all text-xs"
            title="Assistant Voice & Behavior Settings"
          >
            ⚙️
          </button>
          <button
            onClick={dismissAssistant}
            className="px-2.5 py-0.5 rounded-full bg-white/90 text-slate-600 hover:text-slate-900 shadow-sm border border-slate-200/60 font-medium text-xs hover:bg-white transition-all flex items-center gap-1"
            title="Close Assistant (Esc)"
          >
            ✕ Dismiss
          </button>
        </div>
      </div>

      {/* When minimized, hide the bulky stages & suggestions to maintain full visibility of productivity cards */}
      {!isMinimized && (
        <>
          {/* 1. Contextual Quick Suggestions (When not expanded) */}
          {!isExpanded && (
            <div className="w-full flex justify-center mb-2">
              <AIQuickSuggestions
                onSelectSuggestion={(sug) => handleSubmitMessage(sug)}
                disabled={chatMutation.isPending || isListening}
              />
            </div>
          )}

          {/* 2. Response / Speech Transcript Card (When active) */}
          <div className="w-full flex justify-center mb-2">
            <AIResponseTranscript
              state={avatarState}
              transcriptText={userTranscript}
              assistantSpokenText={assistantSpokenText}
              isSpeaking={isSpeaking}
              onStopSpeaking={stopSpeaking}
              onRepeatSpeech={() => speakText(assistantSpokenText)}
              onDismiss={() => {
                setAssistantSpokenText('');
                setUserTranscript('');
                resetAutoCloseTimer();
              }}
            />
          </div>

          {/* 3. Consequential Action Confirmation Card (When pending) */}
          {pendingAction && (
            <div className="w-full flex justify-center mb-2">
              <AIActionConfirmation
                proposal={pendingAction}
                onConfirm={(id) => executeActionMutation.mutate(id)}
                onReject={() => {
                  setPendingAction(null);
                  resetAutoCloseTimer();
                }}
                isExecuting={executeActionMutation.isPending}
              />
            </div>
          )}

          {/* 4. Center 3D Avatar Stage */}
          <div className="-mb-6 relative z-10">
            <AIAvatarStage
              state={avatarState}
              audioVolume={audioVolume}
              onClickAvatar={() => {
                setIsExpanded((prev) => !prev);
                resetAutoCloseTimer();
              }}
            />
          </div>
        </>
      )}

      {/* 5. Floating Integrated Command Bar */}
      <div className="w-full flex justify-center">
        <AIFloatingCommandBar
          state={avatarState}
          inputText={inputText}
          onChangeInput={(val) => {
            setInputText(val);
            resetAutoCloseTimer();
          }}
          onSubmit={() => handleSubmitMessage()}
          isListening={isListening}
          onToggleListening={toggleListening}
          isSpeaking={isSpeaking}
          onStopSpeaking={stopSpeaking}
          isExpanded={isExpanded}
          onToggleExpand={() => {
            setIsExpanded((prev) => !prev);
            resetAutoCloseTimer();
          }}
          onOpenSettings={() => setIsSettingsOpen(true)}
          assistantName={settings.assistantName || 'Nova'}
          isLoading={chatMutation.isPending}
        />
      </div>

      {/* 6. Expanded Conversation Drawer (Connected to Bar) */}
      {!isMinimized && (
        <div className="w-full">
          <AIExpandedConversation
            isOpen={isExpanded}
            onClose={() => {
              setIsExpanded(false);
              resetAutoCloseTimer();
            }}
            messages={messages}
            pendingAction={pendingAction}
            onConfirmAction={(id) => executeActionMutation.mutate(id)}
            onRejectAction={() => {
              setPendingAction(null);
              resetAutoCloseTimer();
            }}
            onClearConversation={() => {
              setMessages([]);
              setPendingAction(null);
              setAssistantSpokenText('');
              resetAutoCloseTimer();
            }}
            onRetryLastMessage={() => {
              const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user');
              if (lastUserMsg) handleSubmitMessage(lastUserMsg.content);
            }}
            onSpeakMessage={(msgText) => speakText(msgText)}
            assistantName={settings.assistantName || 'Nova'}
          />
        </div>
      )}

      {/* 7. Settings Modal */}
      <AIAssistantSettings
        isOpen={isSettingsOpen}
        onClose={() => {
          setIsSettingsOpen(false);
          resetAutoCloseTimer();
        }}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
        availableVoices={availableVoices}
      />
    </aside>
  );
};
