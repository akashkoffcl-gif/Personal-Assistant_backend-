'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '@/lib/api';
import { toast } from '@/components/Toast';

export type VoiceState =
  | 'IDLE'
  | 'REQUESTING_PERMISSION'
  | 'LISTENING'
  | 'PROCESSING'
  | 'GENERATING_RESPONSE'
  | 'SPEAKING'
  | 'WAITING_FOR_FOLLOWUP'
  | 'INTERRUPTED'
  | 'RECOVERING'
  | 'PAUSED'
  | 'STOPPED'
  | 'ERROR';

export interface UseVoiceInteractionOptions {
  onProposedAction?: (action: any) => void;
  onExecutionResult?: (result: any) => void;
  continuous?: boolean;
}

export function useVoiceInteraction(options: UseVoiceInteractionOptions = {}) {
  const { continuous = true, onProposedAction, onExecutionResult } = options;

  const [state, setState] = useState<VoiceState>('IDLE');
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [responseMessage, setResponseMessage] = useState<string | null>(null);
  const [proposedAction, setProposedAction] = useState<any>(null);
  const [voiceMuted, setVoiceMuted] = useState(false);
  const [browserSupported, setBrowserSupported] = useState(true);
  const [audioLevel, setAudioLevel] = useState(0); // 0-100 real audio meter
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [conversationHistory, setConversationHistory] = useState<
    Array<{ role: 'user' | 'assistant'; text: string; time: string }>
  >([]);

  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const isSessionActiveRef = useRef(false);
  const stateRef = useRef<VoiceState>('IDLE');
  stateRef.current = state;

  const lastProcessedTranscriptRef = useRef<string>('');
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize SpeechSynthesis and SpeechRecognition APIs
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if ('speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setBrowserSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      if (stateRef.current !== 'PAUSED' && stateRef.current !== 'STOPPED') {
        setState('LISTENING');
      }
    };

    recognition.onresult = (event: any) => {
      // Barge-in check: If user speaks while Nova is speaking, interrupt immediately!
      if (stateRef.current === 'SPEAKING' || synthRef.current?.speaking) {
        handleBargeIn();
      }

      let currentInterim = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const item = event.results[i];
        if (item.isFinal) {
          finalTranscript += item[0].transcript + ' ';
        } else {
          currentInterim += item[0].transcript;
        }
      }

      if (currentInterim) {
        setInterimTranscript(currentInterim);
      }

      if (finalTranscript.trim()) {
        const fullFinal = finalTranscript.trim();
        setTranscript((prev) => (prev ? `${prev} ${fullFinal}` : fullFinal));
        setInterimTranscript('');

        // Reset or schedule automatic silence submission if continuous
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = setTimeout(() => {
          submitFinalUtterance();
        }, 1200); // 1.2s natural speech pause detection
      }
    };

    recognition.onerror = (event: any) => {
      console.warn('[VoiceController] SpeechRecognition error:', event.error);
      if (event.error === 'not-allowed') {
        setState('ERROR');
        toast.error('Microphone Denied', 'Please grant microphone permissions in your browser.');
        isSessionActiveRef.current = false;
      } else if (event.error === 'network') {
        setState('RECOVERING');
        scheduleRestart(1500);
      } else if (event.error !== 'no-speech') {
        // Recoverable glitch
        if (isSessionActiveRef.current && stateRef.current !== 'STOPPED') {
          scheduleRestart(800);
        }
      }
    };

    recognition.onend = () => {
      // If session is still active and we are in LISTENING or WAITING, restart recognition
      if (
        isSessionActiveRef.current &&
        stateRef.current !== 'SPEAKING' &&
        stateRef.current !== 'PROCESSING' &&
        stateRef.current !== 'PAUSED' &&
        stateRef.current !== 'STOPPED'
      ) {
        scheduleRestart(300);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      isSessionActiveRef.current = false;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
      if (synthRef.current) synthRef.current.cancel();
      stopAudioMetering();
    };
  }, []);

  const scheduleRestart = (delayMs = 400) => {
    setTimeout(() => {
      if (
        isSessionActiveRef.current &&
        stateRef.current !== 'SPEAKING' &&
        stateRef.current !== 'PROCESSING' &&
        stateRef.current !== 'PAUSED' &&
        stateRef.current !== 'STOPPED'
      ) {
        try {
          recognitionRef.current?.start();
          setState('LISTENING');
        } catch (e) {
          // Ignore if already started
        }
      }
    }, delayMs);
  };

  // Real Audio Waveform Metering using Web Audio API
  const startAudioMetering = async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) return;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      audioContextRef.current = audioCtx;
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const updateMeter = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        const normalized = Math.min(100, Math.round((avg / 128) * 100));
        setAudioLevel(normalized);
        animFrameRef.current = requestAnimationFrame(updateMeter);
      };

      updateMeter();
    } catch (err) {
      console.warn('[VoiceController] Audio metering unavailable:', err);
    }
  };

  const stopAudioMetering = () => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    setAudioLevel(0);
  };

  // Natural Interruption (Barge-In)
  const handleBargeIn = useCallback(() => {
    if (synthRef.current?.speaking) {
      synthRef.current.cancel();
      setState('INTERRUPTED');
      setTimeout(() => {
        if (isSessionActiveRef.current) setState('LISTENING');
      }, 200);
    }
  }, []);

  // Speech Output with Adaptive Cadence and Segmented Phrasing
  const speakResponse = useCallback(
    (text: string, customRate = 1.05) => {
      if (voiceMuted || !synthRef.current || typeof window === 'undefined') {
        // If muted, return to listening after brief simulated pause
        if (continuous && isSessionActiveRef.current) {
          setState('LISTENING');
          scheduleRestart(200);
        }
        return;
      }

      synthRef.current.cancel();

      // Temporarily pause recognition during synthesis to avoid acoustic echo feedback
      try {
        recognitionRef.current?.stop();
      } catch {}

      // Natural speech preprocessing: strip markdown, code, and format pauses
      const cleanSpokenText = text
        .replace(/```[\s\S]*?```/g, '') // strip code blocks
        .replace(/[*_#`]/g, '') // strip markdown markers
        .replace(/\n\s*-\s*/g, '. ') // format bullet lists into distinct sentences
        .replace(/\n+/g, '. ') // format line breaks into natural breath pauses
        .replace(/\s+/g, ' ')
        .trim();

      const utterance = new SpeechSynthesisUtterance(cleanSpokenText);
      utterance.rate = customRate;
      utterance.pitch = 1.0;

      const voices = synthRef.current.getVoices();
      // Tiered voice selection prioritizing high-fidelity natural voices
      const naturalVoice = voices.find(
        (v) =>
          v.lang.startsWith('en') &&
          (v.name.includes('Google') ||
            v.name.includes('Natural') ||
            v.name.includes('Samantha') ||
            v.name.includes('Karen') ||
            v.name.includes('Daniel')),
      ) || voices.find((v) => v.lang.startsWith('en'));

      if (naturalVoice) utterance.voice = naturalVoice;

      utterance.onstart = () => {
        setState('SPEAKING');
      };

      utterance.onend = () => {
        // THE CRITICAL P0 TRANSITION: Return to LISTENING automatically!
        if (continuous && isSessionActiveRef.current) {
          setState('WAITING_FOR_FOLLOWUP');
          setTimeout(() => {
            if (isSessionActiveRef.current && stateRef.current !== 'PAUSED') {
              try {
                recognitionRef.current?.start();
                setState('LISTENING');
              } catch {}
            }
          }, 400);
        } else {
          setState('IDLE');
        }
      };

      utterance.onerror = (err) => {
        console.warn('[VoiceController] Speech synthesis error:', err);
        if (continuous && isSessionActiveRef.current) {
          setState('LISTENING');
          scheduleRestart(300);
        } else {
          setState('IDLE');
        }
      };

      synthRef.current.speak(utterance);
    },
    [continuous, voiceMuted],
  );

  // Send Utterance to Backend AI Engine with Context Preservation
  const submitFinalUtterance = useCallback(async () => {
    let textToSend = '';
    setTranscript((current) => {
      textToSend = current.trim();
      return '';
    });

    if (!textToSend || textToSend === lastProcessedTranscriptRef.current) return;
    lastProcessedTranscriptRef.current = textToSend;

    // Check for conversational termination commands
    const lower = textToSend.toLowerCase();
    if (
      lower.includes('stop listening') ||
      lower.includes('goodbye nova') ||
      lower.includes('end session') ||
      lower.includes('bye nova')
    ) {
      stopVoiceSession();
      speakResponse('Voice session ended. Let me know when you need me again.');
      return;
    }

    if (lower.includes('pause listening') || lower.includes('pause voice')) {
      pauseVoiceSession();
      speakResponse('Voice conversation paused. Say resume or click the microphone to continue.');
      return;
    }

    setState('PROCESSING');

    // Add User query to conversation history
    const userTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setConversationHistory((prev) => [...prev, { role: 'user', text: textToSend, time: userTime }]);

    try {
      setState('GENERATING_RESPONSE');
      const response = await api.sendAIChatMessage(textToSend, conversationId || undefined);

      if (response?.conversationId && !conversationId) {
        setConversationId(response.conversationId);
      }

      const reply =
        response?.message?.content ||
        response?.reply ||
        'I have processed your request.';
      setResponseMessage(reply);

      const assistantTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setConversationHistory((prev) => [
        ...prev,
        { role: 'assistant', text: reply, time: assistantTime },
      ]);

      if (response?.proposedAction) {
        setProposedAction(response.proposedAction);
        onProposedAction?.(response.proposedAction);
      }

      // Context-aware speech pacing: speed up if urgent or concise
      let speechRate = 1.05;
      if (response?.intentAnalysis?.userPacing === 'IN_A_HURRY' || response?.intentAnalysis?.urgency === 'HIGH') {
        speechRate = 1.15;
      } else if (response?.intentAnalysis?.userPacing === 'REFLECTIVE') {
        speechRate = 0.95;
      }

      // Automatically speak the response and trigger next turn
      speakResponse(reply, speechRate);
    } catch (err: any) {
      console.error('[VoiceController] AI Processing error:', err);
      setState('ERROR');
      toast.error('Voice Assistant Error', err?.message || 'Could not process voice request.');
      if (continuous && isSessionActiveRef.current) {
        setTimeout(() => {
          if (isSessionActiveRef.current) {
            setState('LISTENING');
            scheduleRestart(500);
          }
        }, 1500);
      }
    }
  }, [conversationId, speakResponse, continuous, onProposedAction]);

  // Public Session Lifecycle Controls
  const startVoiceSession = useCallback(async () => {
    if (!browserSupported) {
      toast.info('Voice Unsupported', 'Web Speech API is unavailable in this browser.');
      return;
    }

    setState('REQUESTING_PERMISSION');
    isSessionActiveRef.current = true;
    setSessionStartTime(Date.now());
    lastProcessedTranscriptRef.current = '';

    await startAudioMetering();

    try {
      recognitionRef.current?.start();
      setState('LISTENING');
      toast.info('Nova Listening', 'Continuous conversation active. Speak freely.');
    } catch (e) {
      // If already started, set state
      setState('LISTENING');
    }
  }, [browserSupported]);

  const pauseVoiceSession = useCallback(() => {
    isSessionActiveRef.current = false;
    try {
      recognitionRef.current?.stop();
    } catch {}
    if (synthRef.current) synthRef.current.cancel();
    setState('PAUSED');
  }, []);

  const resumeVoiceSession = useCallback(() => {
    isSessionActiveRef.current = true;
    try {
      recognitionRef.current?.start();
      setState('LISTENING');
    } catch {}
  }, []);

  const stopVoiceSession = useCallback(() => {
    isSessionActiveRef.current = false;
    try {
      recognitionRef.current?.stop();
    } catch {}
    if (synthRef.current) synthRef.current.cancel();
    stopAudioMetering();
    setState('STOPPED');
  }, []);

  const confirmAction = useCallback(
    async (confirmed: boolean) => {
      if (!proposedAction) return;
      try {
        const res = await api.executeAIAction(proposedAction.id, confirmed);
        if (confirmed) {
          toast.success('Action Executed', 'The requested change has been securely committed.');
          speakResponse('I have confirmed and executed your requested action.');
          onExecutionResult?.(res);
        } else {
          toast.info('Action Discarded', 'No modifications were made.');
          speakResponse('The proposed action was discarded.');
        }
        setProposedAction(null);
      } catch (err: any) {
        toast.error('Action Failed', err?.message || 'Could not execute action.');
        speakResponse('The action failed to execute. Please try again.');
      }
    },
    [proposedAction, speakResponse, onExecutionResult],
  );

  return {
    state,
    transcript,
    interimTranscript,
    responseMessage,
    proposedAction,
    audioLevel,
    isSpeaking: state === 'SPEAKING',
    isListening: state === 'LISTENING',
    isProcessing: state === 'PROCESSING' || state === 'GENERATING_RESPONSE',
    isPaused: state === 'PAUSED',
    browserSupported,
    voiceMuted,
    conversationHistory,
    sessionStartTime,
    setVoiceMuted,
    startVoiceSession,
    pauseVoiceSession,
    resumeVoiceSession,
    stopVoiceSession,
    handleBargeIn,
    confirmAction,
  };
}

