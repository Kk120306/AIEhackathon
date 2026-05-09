"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import MicButton from "./Components/MicButton";
import AnswerPanel from "./Components/AnswerPanel";
import VisualizationPanel from "./Components/VisualizationPanel";
import CameraPanel, { type CameraPanelHandle } from "./Components/CameraPanel";
import { useVoiceRecorder } from "./hooks/useVoiceRecorder";
import { useVoicePreference } from "./hooks/useVoicePreference";
import { useAnalytics } from "./hooks/useAnalytics";
import Link from "next/link";

// ── Types ──────────────────────────────────────────────────────────────────────

export type ConversationMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

export type TutorToolCall = {
  name: string;
  args: Record<string, unknown>;
};

export type TutorResponse = {
  spoken_answer: string;
  tool_call?: TutorToolCall;
  topic?: string;
  is_correct?: boolean;
  follow_up_questions?: string[];
};

export type AppStatus =
  | "idle"
  | "listening"
  | "transcribing"
  | "thinking"
  | "speaking"
  | "error";

// ── Constants ──────────────────────────────────────────────────────────────────

const LISTEN_RESUME_DELAY_MS = 500;
const SILENCE_RETRY_LIMIT = 2;

const CAMERA_TRIGGERS = [
  "take a picture", "take a photo", "take a photograph",
  "look at this", "read this", "show you this",
  "what is this", "what's this", "what does this say",
  "can you see", "scan this", "photograph this",
  "capture this", "analyze this", "analyse this",
];

function detectCameraTrigger(text: string): boolean {
  const lower = text.toLowerCase();
  return CAMERA_TRIGGERS.some((p) => lower.includes(p));
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function Home() {
  const [question, setQuestion] = useState("");
  const [response, setResponse] = useState<TutorResponse | null>(null);
  const [followUpQuestions, setFollowUpQuestions] = useState<string[]>([]);
  const [status, setStatus] = useState<AppStatus>("idle");
  const [error, setError] = useState("");
  const [audioLevel, setAudioLevel] = useState(0);
  const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>([]);
  const [isConversationActive, setIsConversationActive] = useState(false);

  const { voiceId } = useVoicePreference();
  const { startSession, recordExchange, endSession } = useAnalytics();
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  const cameraRef = useRef<CameraPanelHandle>(null);
  // Refs to avoid stale closures in async callbacks
  const isConversationActiveRef = useRef(false);
  const silenceRetriesRef = useRef(0);
  const startListeningRef = useRef<() => void>(() => {});
  const voiceIdRef = useRef(voiceId);

  useEffect(() => { voiceIdRef.current = voiceId; }, [voiceId]);

  useEffect(() => {
    isConversationActiveRef.current = isConversationActive;
  }, [isConversationActive]);

  useEffect(() => {
    return () => {
      currentAudioRef.current?.pause();
      currentAudioRef.current = null;
    };
  }, []);

  // After Friday finishes speaking, re-open the mic if still active
  const resumeListening = useCallback(() => {
    if (!isConversationActiveRef.current) return;
    setTimeout(() => {
      if (isConversationActiveRef.current) {
        silenceRetriesRef.current = 0;
        startListeningRef.current();
      }
    }, LISTEN_RESUME_DELAY_MS);
  }, []);

  const speakFallback = useCallback(
    (text: string) => {
      if (!("speechSynthesis" in window)) {
        setStatus("idle");
        if (isConversationActiveRef.current) resumeListening();
        return;
      }
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95;
      utterance.pitch = 1.05;
      utterance.onend = () => {
        if (isConversationActiveRef.current) resumeListening();
        else setStatus("idle");
      };
      utterance.onerror = () => setStatus("idle");
      window.speechSynthesis.speak(utterance);
    },
    [resumeListening]
  );

  const speak = useCallback(
    async (text: string) => {
      currentAudioRef.current?.pause();
      currentAudioRef.current = null;

      try {
        const res = await fetch("/api/speak", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, voiceId: voiceIdRef.current }),
        });

        if (!res.ok) {
          // ElevenLabs rejected (free plan, bad key, etc.) — fall back to browser TTS
          speakFallback(text);
          return;
        }

        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        currentAudioRef.current = audio;

        audio.onended = () => {
          URL.revokeObjectURL(url);
          currentAudioRef.current = null;
          if (isConversationActiveRef.current) resumeListening();
          else setStatus("idle");
        };
        audio.onerror = () => {
          URL.revokeObjectURL(url);
          currentAudioRef.current = null;
          speakFallback(text);
        };

        await audio.play();
      } catch {
        speakFallback(text);
      }
    },
    [resumeListening, speakFallback]
  );

  const askBackend = useCallback(
    async (q: string, imageBase64?: string) => {
      const message = q.trim();
      if (!message) return;
      currentAudioRef.current?.pause();
      currentAudioRef.current = null;
      setStatus("thinking");
      setResponse(null);
      setError("");

      try {
        const res = await fetch("/api/ask", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message,
            conversationHistory,
            ...(imageBase64 ? { imageBase64, imageMimeType: "image/jpeg" } : {}),
          }),
        });
        const payload = await res.json();
        if (!res.ok) throw new Error(payload.error ?? "Friday could not answer that yet.");

        const nextResponse = payload as TutorResponse;
        setResponse(nextResponse);
        if (nextResponse.follow_up_questions?.length) {
          setFollowUpQuestions(nextResponse.follow_up_questions);
        }
        setConversationHistory((h) => [
          ...h,
          { role: "user", content: message },
          { role: "assistant", content: nextResponse.spoken_answer },
        ]);

        recordExchange({
          question: message,
          answer: nextResponse.spoken_answer,
          topic: nextResponse.topic,
          is_correct: nextResponse.is_correct,
          toolUsed: nextResponse.tool_call?.name,
        });

        if (nextResponse.spoken_answer) {
          setStatus("speaking");
          speak(nextResponse.spoken_answer);
        } else {
          resumeListening();
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Something went wrong.";
        setError(msg);
        setStatus("error");
        setIsConversationActive(false);
        isConversationActiveRef.current = false;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [conversationHistory, speak, resumeListening, recordExchange]
  );

  const handleQuestion = useCallback(
    async (q: string) => {
      let imageBase64: string | undefined;
      if (detectCameraTrigger(q)) {
        const dataUrl = cameraRef.current?.captureFrame() ?? null;
        if (dataUrl) imageBase64 = dataUrl.split(",")[1];
      }
      await askBackend(q, imageBase64);
    },
    [askBackend]
  );

  const handleNoSpeech = useCallback(() => {
    silenceRetriesRef.current += 1;
    if (silenceRetriesRef.current >= SILENCE_RETRY_LIMIT) {
      silenceRetriesRef.current = 0;
      setIsConversationActive(false);
      isConversationActiveRef.current = false;
      setError("No speech detected. Tap the button to start again.");
      setStatus("error");
      return;
    }
    if (isConversationActiveRef.current) {
      setTimeout(() => {
        if (isConversationActiveRef.current) startListeningRef.current();
      }, LISTEN_RESUME_DELAY_MS);
    }
  }, []);

  const handleTranscript = useCallback(
    (transcript: string) => {
      setQuestion(transcript);
      silenceRetriesRef.current = 0;
      handleQuestion(transcript);
    },
    [handleQuestion]
  );

  const { isRecording, startListening, stopListening, submitNow } = useVoiceRecorder({
    setStatus,
    setError,
    onTranscript: handleTranscript,
    onNoSpeech: handleNoSpeech,
    onAudioLevel: setAudioLevel,
  });

  useEffect(() => {
    startListeningRef.current = startListening;
  }, [startListening]);

  const startConversation = useCallback(() => {
    setError("");
    setIsConversationActive(true);
    isConversationActiveRef.current = true;
    silenceRetriesRef.current = 0;
    startSession();
    startListening();
  }, [startListening, startSession]);

  const stopConversation = useCallback(() => {
    setIsConversationActive(false);
    isConversationActiveRef.current = false;
    stopListening();
    currentAudioRef.current?.pause();
    currentAudioRef.current = null;
    window.speechSynthesis?.cancel();
    setStatus("idle");
    setAudioLevel(0);
    endSession();
  }, [stopListening, endSession]);

  const handleToggleConversation = useCallback(() => {
    if (!isConversationActive) {
      startConversation();
    } else if (isRecording) {
      // Tap while recording → submit current audio immediately
      submitNow();
    } else {
      // Tap while thinking/speaking → end conversation
      stopConversation();
    }
  }, [isConversationActive, isRecording, startConversation, stopConversation, submitNow]);

  const handleTypedSubmit = () => {
    // Text input never activates the voice loop — mic stays off
    handleQuestion(question);
  };

  const statusLabel: Record<AppStatus, string> = {
    idle: "Ready — tap to start",
    listening: "Listening…",
    transcribing: "Got it, processing…",
    thinking: "Thinking…",
    speaking: "Friday is speaking…",
    error: "Error",
  };

  const demoQuestions = [
    "Show me how y equals x squared changes into y equals 2 times x minus 3 squared plus 1.",
    "Explain Le Chatelier's principle for A-Level chemistry.",
    "Explain Newton's second law and how to use F equals ma in exam questions.",
  ];

  return (
    <main className="min-h-screen bg-black text-white p-6">
      <section className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-green-400">Friday Tutor</p>
          <h1 className="mt-2 text-4xl font-bold">
            Voice-first AI Tutor for IB &amp; Singapore A-Levels
          </h1>
          <p className="mt-3 max-w-3xl text-gray-400">
            Start a conversation and talk to Friday hands-free. Ask about Maths, Physics, or
            Chemistry — Friday answers verbally and opens visual tools when needed.
          </p>
        </div>
        <Link
          href="/dashboard"
          className="rounded-xl border border-gray-700 bg-gray-900 px-4 py-2 text-sm text-gray-300 hover:border-purple-500 hover:text-white transition-colors whitespace-nowrap"
        >
          Parent Dashboard →
        </Link>
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* LEFT PANEL */}
        <div className="rounded-2xl border border-gray-800 bg-gray-950 p-6">
          <CameraPanel ref={cameraRef} />

          <MicButton
            isConversationActive={isConversationActive}
            isRecording={isRecording}
            audioLevel={audioLevel}
            status={status}
            onToggle={handleToggleConversation}
          />

          <p className={`mt-4 text-sm font-semibold ${status === "error" ? "text-red-400" : "text-green-400"}`}>
            {statusLabel[status]}
          </p>

          {error && (
            <div className="mt-3 rounded-xl border border-red-800 bg-red-950/60 p-3 text-sm text-red-200">
              {error}
            </div>
          )}

          {/* Typed fallback — collapsed by default */}
          <details className="mt-6 group">
            <summary className="cursor-pointer text-sm font-semibold text-gray-500 hover:text-gray-300 list-none flex items-center gap-2">
              <span className="group-open:hidden">▶</span>
              <span className="hidden group-open:inline">▼</span>
              Type a question instead
            </summary>
            <div className="mt-3">
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Example: Show me how y = x² transforms into y = 2(x - 3)² + 1"
                className="h-28 w-full resize-none rounded-xl border border-gray-700 bg-black p-4 text-white outline-none focus:border-green-400"
              />
              <button
                onClick={handleTypedSubmit}
                disabled={status === "thinking" || status === "transcribing"}
                className="mt-3 rounded-xl bg-green-500 px-5 py-3 font-bold text-black hover:bg-green-400 disabled:cursor-not-allowed disabled:bg-gray-700 disabled:text-gray-400"
              >
                Ask Friday
              </button>
            </div>
          </details>

          {/* Demo prompts / Follow-up questions */}
          {conversationHistory.length === 0 ? (
            <div className="mt-6">
              <p className="mb-3 text-sm font-semibold text-gray-300">Try a demo question</p>
              <div className="grid gap-3">
                {demoQuestions.map((demo, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setQuestion(demo);
                      askBackend(demo);
                    }}
                    className="rounded-xl border border-gray-700 bg-gray-900 p-3 text-left text-sm text-gray-300 hover:border-green-400 hover:text-white"
                  >
                    {demo}
                  </button>
                ))}
              </div>
            </div>
          ) : followUpQuestions.length > 0 ? (
            <div className="mt-6">
              <p className="mb-3 text-sm font-semibold text-gray-300">Follow-up questions</p>
              <div className="grid gap-3">
                {followUpQuestions.map((q, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setQuestion(q);
                      askBackend(q);
                    }}
                    className="rounded-xl border border-gray-700 bg-gray-900 p-3 text-left text-sm text-gray-300 hover:border-green-400 hover:text-white"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <AnswerPanel question={question} response={response} />
        </div>

        {/* RIGHT PANEL */}
        <div className="rounded-2xl border border-gray-800 bg-gray-950 p-6">
          <div className="mb-4">
            <p className="text-sm uppercase tracking-[0.2em] text-blue-400">Visual Explanation</p>
            <h2 className="mt-1 text-2xl font-bold">Desmos / MolView / Steps Panel</h2>
          </div>
          <VisualizationPanel response={response} />
        </div>
      </section>
    </main>
  );
}
