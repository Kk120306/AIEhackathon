"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import MicButton from "../Components/MicButton";
import AnswerPanel from "../Components/AnswerPanel";
import VisualizationPanel from "../Components/VisualizationPanel";
import CameraPanel, {
  type CameraPanelHandle,
  type CapturedImage,
} from "../Components/CameraPanel";
import { useVoiceRecorder } from "../hooks/useVoiceRecorder";
import { useVoicePreference } from "../hooks/useVoicePreference";
import { useAnalytics } from "../hooks/useAnalytics";
import type {
  AppStatus,
  ConversationMessage,
  GeneratedIllustration,
  TutorResponse,
} from "../types";
import Link from "next/link";
import Image from "next/image";

// ── Constants ──────────────────────────────────────────────────────────────────

const LISTEN_RESUME_DELAY_MS = 500;
const SILENCE_RETRY_LIMIT = 2;
const FEEDBACK_CLEAR_MS = 2500;

const DEFAULT_PHOTO_QUESTION =
  "Please read the question shown in this photo and walk me through the full solution step by step.";

function ThinkingOverlay({ question }: { question: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-40 flex items-center justify-center bg-[#09090b]/78 px-6 backdrop-blur-md"
    >
      <div className="friday-thinking-shell relative w-full max-w-sm overflow-hidden rounded-2xl border border-indigo-500/30 bg-zinc-950/90 p-6 text-center shadow-2xl shadow-indigo-950/50">
        <div aria-hidden className="friday-thinking-aurora" />

        <div className="relative mx-auto flex h-24 w-24 items-center justify-center">
          <div className="friday-orbit friday-orbit-one" />
          <div className="friday-orbit friday-orbit-two" />
          <Image
            src="/friday-logo.png"
            alt=""
            width={48}
            height={48}
            className="friday-logo-pulse rounded-2xl shadow-lg shadow-indigo-900/40"
            priority
          />
        </div>

        <h2 className="relative mt-5 text-lg font-bold tracking-tight text-white">
          Friday is thinking
        </h2>
        <p className="relative mt-2 line-clamp-2 text-sm leading-relaxed text-zinc-400">
          {question || "Building a clear answer..."}
        </p>

        <div className="relative mt-6 flex justify-center gap-2" aria-hidden>
          <span className="friday-thinking-dot" />
          <span className="friday-thinking-dot friday-thinking-dot-delay-one" />
          <span className="friday-thinking-dot friday-thinking-dot-delay-two" />
        </div>

        <div className="relative mt-5 h-1.5 overflow-hidden rounded-full bg-zinc-800">
          <div className="friday-thinking-bar h-full rounded-full" />
        </div>
      </div>
    </div>
  );
}

// ── Voice commands ─────────────────────────────────────────────────────────────

// Listed longest-first so e.g. "retake the photo" is consumed before plain
// "retake". All matched with word boundaries, case-insensitively.
const CAPTURE_PHRASES = [
  "take a photo of this", "take a photo of that",
  "take a picture of this", "take a picture of that",
  "take another photo", "take another picture",
  "snap a photo of this", "snap a picture of this",
  "snap a photo", "snap a picture",
  "take a photo", "take a picture", "take a pic",
  "take the photo", "take the picture",
  "snap this", "snap that", "snap it",
  "capture this", "capture that", "capture it",
];

const RETAKE_PHRASES = [
  "retake the photo", "retake the picture", "retake that",
  "redo the photo", "redo the picture",
  "try the photo again", "try that again",
  "another shot",
  "retake", "redo",
];

const SEND_PHRASES = [
  "send the photo to friday", "send it to friday", "send to friday",
  "send the photo", "send this photo", "send the picture", "send this picture",
  "use this photo", "use the photo", "use this picture",
  "send it",
];

const CANCEL_PHRASES = [
  "cancel the photo", "cancel the picture", "cancel that photo",
  "discard the photo", "discard the picture",
  "nevermind the photo", "never mind the photo",
  "without the photo", "no photo",
];

type ParsedCommand = {
  capture: boolean;
  retake: boolean;
  send: boolean;
  cancel: boolean;
  residual: string;
};

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function stripPhrases(text: string, phrases: string[]): { matched: boolean; text: string } {
  let matched = false;
  let out = text;
  for (const phrase of phrases) {
    const re = new RegExp(`\\b${escapeRegex(phrase)}\\b`, "gi");
    if (re.test(out)) {
      matched = true;
      out = out.replace(re, " ");
    }
  }
  return { matched, text: out };
}

function parseVoiceCommand(transcript: string): ParsedCommand {
  let text = transcript;

  const cancel = stripPhrases(text, CANCEL_PHRASES);
  text = cancel.text;
  const retake = stripPhrases(text, RETAKE_PHRASES);
  text = retake.text;
  const capture = stripPhrases(text, CAPTURE_PHRASES);
  text = capture.text;
  const send = stripPhrases(text, SEND_PHRASES);
  text = send.text;

  // Tidy the residual: collapse whitespace, drop leading filler / conjunctions
  // (and / then / please / now / so / ok / okay / um / uh) plus dangling
  // punctuation. Looped because "um, and explain" needs two passes.
  // \b lets us also consume a filler that's the entire residual (e.g. just "and").
  let residual = text.replace(/\s+/g, " ").trim();
  const fillerRe = /^(?:and|then|please|now|so|ok|okay|um|uh|hey|friday)\b[\s,]*/i;
  let prev: string;
  do {
    prev = residual;
    residual = residual.replace(fillerRe, "").replace(/^[\s,.!?-]+/, "").trim();
  } while (residual !== prev);
  if (/^[\s.,!?]*$/.test(residual)) residual = "";

  return {
    capture: capture.matched,
    retake: retake.matched,
    send: send.matched,
    cancel: cancel.matched,
    residual,
  };
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function LearnPage() {
  const [question, setQuestion] = useState("");
  const [response, setResponse] = useState<TutorResponse | null>(null);
  const [followUpQuestions, setFollowUpQuestions] = useState<string[]>([]);
  const [status, setStatus] = useState<AppStatus>("idle");
  const [error, setError] = useState("");
  const [audioLevel, setAudioLevel] = useState(0);
  const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>([]);
  const [isConversationActive, setIsConversationActive] = useState(false);
  const [voiceFeedback, setVoiceFeedback] = useState<{ text: string; tone: "info" | "warn" } | null>(null);
  const [generatedImage, setGeneratedImage] = useState<GeneratedIllustration | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);

  const { voiceId } = useVoicePreference();
  const { startSession, recordExchange, endSession } = useAnalytics();
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const currentAudioUrlRef = useRef<string | null>(null);

  const cameraRef = useRef<CameraPanelHandle>(null);
  const isConversationActiveRef = useRef(false);
  const silenceRetriesRef = useRef(0);
  const startListeningRef = useRef<() => void>(() => {});
  const voiceIdRef = useRef(voiceId);
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { voiceIdRef.current = voiceId; }, [voiceId]);

  useEffect(() => {
    isConversationActiveRef.current = isConversationActive;
  }, [isConversationActive]);

  const stopCurrentSpeech = useCallback(() => {
    currentAudioRef.current?.pause();
    currentAudioRef.current = null;

    if (currentAudioUrlRef.current) {
      URL.revokeObjectURL(currentAudioUrlRef.current);
      currentAudioUrlRef.current = null;
    }

    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  }, []);

  useEffect(() => {
    return () => {
      stopCurrentSpeech();
    };
  }, [stopCurrentSpeech]);

  // Clear any pending feedback timer on unmount so we don't setState on a
  // stale component.
  useEffect(() => {
    return () => {
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    };
  }, []);

  const flash = useCallback((text: string, tone: "info" | "warn" = "info") => {
    setVoiceFeedback({ text, tone });
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    feedbackTimerRef.current = setTimeout(() => {
      setVoiceFeedback(null);
      feedbackTimerRef.current = null;
    }, FEEDBACK_CLEAR_MS);
  }, []);

  // Make sure analytics always get a session end-time, even if the user closes
  // the tab, refreshes, or hard-navigates away mid-conversation. Without this
  // the dashboard shows "—" duration for every interrupted session.
  useEffect(() => {
    const flush = () => endSession();
    window.addEventListener("beforeunload", flush);
    window.addEventListener("pagehide", flush);
    return () => {
      window.removeEventListener("beforeunload", flush);
      window.removeEventListener("pagehide", flush);
      // Also flush when this page unmounts (route change to /dashboard, etc.).
      endSession();
    };
  }, [endSession]);

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
      stopCurrentSpeech();

      try {
        const res = await fetch("/api/speak", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, voiceId: voiceIdRef.current }),
        });

        if (!res.ok) {
          speakFallback(text);
          return;
        }

        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        currentAudioRef.current = audio;
        currentAudioUrlRef.current = url;

        audio.onended = () => {
          if (currentAudioUrlRef.current === url) {
            URL.revokeObjectURL(url);
            currentAudioUrlRef.current = null;
            currentAudioRef.current = null;
          }
          if (isConversationActiveRef.current) resumeListening();
          else setStatus("idle");
        };
        audio.onerror = () => {
          if (currentAudioUrlRef.current === url) {
            URL.revokeObjectURL(url);
            currentAudioUrlRef.current = null;
            currentAudioRef.current = null;
          }
          speakFallback(text);
        };

        await audio.play();
      } catch {
        speakFallback(text);
      }
    },
    [resumeListening, speakFallback, stopCurrentSpeech]
  );

  const askBackend = useCallback(
    async (q: string, image?: CapturedImage | { base64: string; mimeType?: string }) => {
      const message = q.trim();
      if (!message) return;
      stopCurrentSpeech();
      setQuestion(message);
      setStatus("thinking");
      setResponse(null);
      setGeneratedImage(null);
      setIsGeneratingImage(false);
      setError("");

      const imageBase64 = image?.base64;
      const imageMimeType = image?.mimeType ?? "image/jpeg";

      try {
        const res = await fetch("/api/ask", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message,
            conversationHistory,
            ...(imageBase64 ? { imageBase64, imageMimeType } : {}),
          }),
        });
        const payload = await res.json();
        if (!res.ok) throw new Error(payload.error ?? "Friday could not answer that yet.");

        const nextResponse = payload as TutorResponse;
        setResponse(nextResponse);
        if (nextResponse.follow_up_questions?.length) {
          setFollowUpQuestions(nextResponse.follow_up_questions);
        } else if (nextResponse.out_of_scope) {
          setFollowUpQuestions([]);
        }
        setConversationHistory((h) => [
          ...h,
          { role: "user", content: message },
          { role: "assistant", content: nextResponse.spoken_answer },
        ]);

        // Out-of-scope refusals shouldn't pollute the parent dashboard's
        // topic coverage or progress stats — they aren't real learning.
        if (!nextResponse.out_of_scope) {
          recordExchange({
            question: message,
            answer: nextResponse.spoken_answer,
            topic: nextResponse.topic,
            is_correct: nextResponse.is_correct,
            toolUsed: nextResponse.tool_call?.name,
          });
        }

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
    [conversationHistory, speak, resumeListening, recordExchange, stopCurrentSpeech]
  );

  const handleQuestion = useCallback(
    async (q: string) => {
      // Only attach a photo if the student explicitly captured one ("Take photo").
      // No photo → text-only question, like a normal chat.
      const image: CapturedImage | null = cameraRef.current?.takeArmedImage() ?? null;
      await askBackend(q, image ?? undefined);
    },
    [askBackend]
  );

  const handleGenerateImage = useCallback(async () => {
    if (!response || response.out_of_scope) return;
    const q = question.trim();
    if (!q) return;

    setIsGeneratingImage(true);
    setError("");

    try {
      const res = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: q,
          answer: response.display_answer ?? response.spoken_answer,
          topic: response.topic,
        }),
      });
      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload.error ?? "Couldn't generate an illustration.");
      }
      setGeneratedImage({
        imageBase64: payload.imageBase64,
        mimeType: payload.mimeType,
        prompt: payload.promptUsed,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Couldn't generate an illustration.";
      setError(msg);
    } finally {
      setIsGeneratingImage(false);
    }
  }, [question, response]);

  const handleCloseImage = useCallback(() => setGeneratedImage(null), []);

  const handleSendCapture = useCallback(
    (image: CapturedImage) => {
      const message = question.trim() || DEFAULT_PHOTO_QUESTION;
      askBackend(message, image);
    },
    [question, askBackend]
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

      const cmd = parseVoiceCommand(transcript);
      const camera = cameraRef.current;

      // No commands matched → behave exactly like before.
      if (!cmd.capture && !cmd.retake && !cmd.send && !cmd.cancel) {
        handleQuestion(transcript);
        return;
      }

      // Cancel: drop any armed photo. Doesn't affect the residual flow below.
      if (cmd.cancel) {
        camera?.discardArmed();
        flash("Photo discarded");
      }

      // Retake: discard the old, then capture a fresh frame. If the camera
      // isn't open, we can't actually retake — warn and keep going.
      if (cmd.retake) {
        camera?.discardArmed();
        if (camera?.isReady()) {
          const img = camera.captureNow();
          if (img) flash("Photo retaken");
          else flash("Couldn't grab a frame — try again", "warn");
        } else {
          flash("Open the camera first to take a photo", "warn");
        }
      }

      // Capture (possibly combined with extra question text)
      if (cmd.capture) {
        if (!camera?.isReady()) {
          flash("Open the camera first to take a photo", "warn");
          // Fall through: if there's residual text, still answer it as text.
        } else {
          const img = camera.captureNow();
          if (img && cmd.residual) {
            // "take a photo and explain this" → ship it now in one go.
            askBackend(cmd.residual, img);
            return;
          }
          if (img) {
            // Skip the flash if a Send command is about to fire on the same
            // utterance — the "thinking" state will replace it anyway.
            if (!cmd.send) flash("Photo captured — now ask your question");
          } else {
            flash("Couldn't grab a frame — try again", "warn");
          }
        }
      }

      // Send: ship whatever's armed (or just send a text-only question).
      if (cmd.send) {
        const armed = camera?.takeArmedImage() ?? null;
        const message = cmd.residual || (armed ? DEFAULT_PHOTO_QUESTION : "");
        if (!message) {
          // "send it" with nothing armed and no extra text → nothing to send;
          // resume listening so the conversation doesn't stall.
          flash("Nothing to send yet", "warn");
          if (isConversationActiveRef.current) resumeListening();
          return;
        }
        askBackend(message, armed ?? undefined);
        return;
      }

      // Pure command (e.g. "take a photo" alone with nothing armed) — keep
      // listening for the actual question. If there's residual text from a
      // capture/retake/cancel command, treat it as a normal question
      // (handleQuestion will auto-attach the freshly armed photo).
      if (cmd.residual) {
        handleQuestion(cmd.residual);
      } else if (isConversationActiveRef.current) {
        resumeListening();
      }
    },
    [handleQuestion, askBackend, flash, resumeListening]
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
    stopCurrentSpeech();
    setStatus("idle");
    setAudioLevel(0);
    endSession();
  }, [stopListening, stopCurrentSpeech, endSession]);

  const stopTalking = useCallback(() => {
    stopCurrentSpeech();
    setAudioLevel(0);
    setStatus("idle");

    if (isConversationActiveRef.current) {
      resumeListening();
    }
  }, [resumeListening, stopCurrentSpeech]);

  const handleToggleConversation = useCallback(() => {
    if (!isConversationActive) {
      startConversation();
    } else if (isRecording) {
      submitNow();
    } else {
      stopConversation();
    }
  }, [isConversationActive, isRecording, startConversation, stopConversation, submitNow]);

  const handleTypedSubmit = () => {
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
  const isWaitingForAnswer = status === "thinking" || status === "transcribing";

  return (
    <div className="min-h-screen bg-[#09090b] text-white">
      {isWaitingForAnswer && <ThinkingOverlay question={question} />}

      {/* ── Navbar ─────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-20 border-b border-zinc-800 bg-[#09090b]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <Link href="/" className="flex items-center gap-2.5">
            <Image src="/friday-logo.png" alt="Friday logo" width={28} height={28} className="rounded-lg" />
            <span className="text-sm font-semibold text-white">Friday</span>
          </Link>
          <nav className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="rounded-lg border border-zinc-700 bg-zinc-900 px-3.5 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:border-zinc-500 hover:text-white"
            >
              Parent Dashboard
            </Link>
          </nav>
        </div>
      </header>

      {/* ── Page content ───────────────────────────────────────────────────── */}
      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-6">
          <p className="text-xs font-medium uppercase tracking-widest text-indigo-400">
            Learning Session
          </p>
          <h1 className="mt-1.5 text-2xl font-bold tracking-tight">
            Ask Friday anything
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Maths, Physics, Chemistry — IB &amp; Singapore A-Levels.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* LEFT PANEL */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
            <CameraPanel ref={cameraRef} onSendCapture={handleSendCapture} />

            {voiceFeedback && (
              <div
                role="status"
                aria-live="polite"
                className={`mb-3 flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium ${
                  voiceFeedback.tone === "warn"
                    ? "border-amber-800/60 bg-amber-950/40 text-amber-200"
                    : "border-indigo-800/60 bg-indigo-950/40 text-indigo-200"
                }`}
              >
                <span aria-hidden>{voiceFeedback.tone === "warn" ? "⚠️" : "🎙️"}</span>
                {voiceFeedback.text}
              </div>
            )}

            <MicButton
              isConversationActive={isConversationActive}
              isRecording={isRecording}
              audioLevel={audioLevel}
              status={status}
              onToggle={handleToggleConversation}
            />

            <p
              className={`mt-4 text-sm font-medium ${
                status === "error" ? "text-red-400" : "text-emerald-400"
              }`}
            >
              {statusLabel[status]}
            </p>

            {status === "speaking" && (
              <button
                type="button"
                onClick={stopTalking}
                className="mt-3 inline-flex items-center gap-2 rounded-xl border border-red-700/70 bg-red-950/50 px-4 py-2 text-sm font-semibold text-red-100 transition-colors hover:border-red-500 hover:bg-red-900/60"
              >
                <span aria-hidden="true">■</span>
                Stop talking
              </button>
            )}

            {error && (
              <div className="mt-3 rounded-xl border border-red-800/60 bg-red-950/40 p-3 text-sm text-red-300">
                {error}
              </div>
            )}

            {/* Typed fallback */}
            <details className="mt-6 group">
              <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-medium text-zinc-500 hover:text-zinc-300">
                <span className="group-open:hidden">▶</span>
                <span className="hidden group-open:inline">▼</span>
                Type a question instead
              </summary>
              <div className="mt-3">
                <textarea
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Example: Show me how y = x² transforms into y = 2(x - 3)² + 1"
                  className="h-28 w-full resize-none rounded-xl border border-zinc-700 bg-zinc-950 p-4 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-indigo-500"
                />
                <button
                  onClick={handleTypedSubmit}
                  disabled={status === "thinking" || status === "transcribing"}
                  className="mt-3 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400"
                >
                  Ask Friday
                </button>
              </div>
            </details>

            {/* Demo prompts / Follow-up questions */}
            {conversationHistory.length === 0 ? (
              <div className="mt-6">
                <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-500">
                  Try a demo question
                </p>
                <div className="grid gap-2">
                  {demoQuestions.map((demo, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        setQuestion(demo);
                        askBackend(demo);
                      }}
                      className="rounded-xl border border-zinc-800 bg-zinc-900 p-3 text-left text-sm text-zinc-300 transition-colors hover:border-indigo-700 hover:text-white"
                    >
                      {demo}
                    </button>
                  ))}
                </div>
              </div>
            ) : followUpQuestions.length > 0 ? (
              <div className="mt-6">
                <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-500">
                  Follow-up questions
                </p>
                <div className="grid gap-2">
                  {followUpQuestions.map((q, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        setQuestion(q);
                        askBackend(q);
                      }}
                      className="rounded-xl border border-zinc-800 bg-zinc-900 p-3 text-left text-sm text-zinc-300 transition-colors hover:border-indigo-700 hover:text-white"
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
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
            <div className="mb-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-indigo-400">
                Visual Explanation
              </p>
              <h2 className="mt-1 text-lg font-bold">
                Desmos · MolView · Steps · Illustrations
              </h2>
            </div>
            <VisualizationPanel
              response={response}
              generatedImage={generatedImage}
              onCloseImage={handleCloseImage}
              onRegenerateImage={handleGenerateImage}
              isRegeneratingImage={isGeneratingImage}
              onGenerateImage={handleGenerateImage}
              isGeneratingImage={isGeneratingImage}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
