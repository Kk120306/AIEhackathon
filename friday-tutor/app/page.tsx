"use client";

import { useState, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import MicButton from "./components/MicButton";
import AnswerPanel from "./components/AnswerPanel";
import VisualizationPanel from "./components/VisualizationPanel";

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
};

export type AppStatus =
  | "idle"
  | "listening"
  | "transcribing"
  | "thinking"
  | "speaking"
  | "error";

export default function Home() {
  const [question, setQuestion] = useState("");
  const [response, setResponse] = useState<TutorResponse | null>(null);
  const [status, setStatus] = useState<AppStatus>("idle");
  const [error, setError] = useState("");
  const [conversationHistory, setConversationHistory] = useState<
    ConversationMessage[]
  >([]);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const startSessionMutation   = useMutation(api.sessions.startSession);
  const endSessionMutation     = useMutation(api.sessions.endSession);
  const saveMessageMutation    = useMutation(api.sessions.saveMessage);
  const addTopicMutation       = useMutation(api.sessions.addTopicToSession);
  const upsertProgressMutation = useMutation(api.sessions.upsertProgress);

  useEffect(() => {
    const handleUnload = () => {
      if (sessionId) endSessionMutation({ sessionId });
    };
    window.addEventListener("beforeunload", handleUnload);
    return () => window.removeEventListener("beforeunload", handleUnload);
  }, [sessionId, endSessionMutation]);

  useEffect(() => {
    return () => {
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const stopAudio = () => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }

    setStatus((currentStatus) =>
      currentStatus === "speaking" ? "idle" : currentStatus
    );
  };

  const speak = (text: string) => {
    if (!text) return;
    if (!("speechSynthesis" in window)) {
      setStatus("idle");
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.pitch = 1.05;
    utterance.volume = 1;

    utterance.onend = () => {
      setStatus("idle");
    };

    utterance.onerror = () => {
      setStatus("idle");
    };

    window.speechSynthesis.speak(utterance);
  };

  const askBackend = async (q: string) => {
    const message = q.trim();
    if (!message) return;

    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }

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
        }),
      });

      const payload = await res.json();

      if (!res.ok) {
        throw new Error(payload.error ?? "Friday could not answer that yet.");
      }

      const nextResponse = payload as TutorResponse;

      // Session lifecycle
      let currentSessionId = sessionId;
      if (!currentSessionId) {
        currentSessionId = await startSessionMutation({ studentName: "Student" });
        setSessionId(currentSessionId);
      }

      // Persist both turns
      await saveMessageMutation({
        sessionId: currentSessionId,
        role: "user",
        content: message,
      });
      await saveMessageMutation({
        sessionId: currentSessionId,
        role: "assistant",
        content: nextResponse.spoken_answer,
        topicTag: nextResponse.topic,
      });

      // Track topic
      if (nextResponse.topic) {
        await addTopicMutation({
          sessionId: currentSessionId,
          topic: nextResponse.topic,
        });
      }

      // Track progress (only when is_correct is defined)
      if (nextResponse.topic && nextResponse.is_correct !== undefined) {
        await upsertProgressMutation({
          sessionId: currentSessionId,
          topic: nextResponse.topic,
          isCorrect: nextResponse.is_correct,
        });
      }

      setResponse(nextResponse);
      setConversationHistory((history) => [
        ...history,
        { role: "user", content: message },
        { role: "assistant", content: nextResponse.spoken_answer },
      ]);

      if (nextResponse.spoken_answer) {
        setStatus("speaking");
        speak(nextResponse.spoken_answer);
      } else {
        setStatus("idle");
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Something went wrong.";
      setError(message);
      setStatus("error");
    }
  };

  const handleTypedSubmit = () => {
    askBackend(question);
  };

  const demoQuestions = [
    "Show me how y equals x squared changes into y equals 2 times x minus 3 squared plus 1.",
    "Explain Le Chatelier's principle for A-Level chemistry.",
    "Explain Newton's second law and how to use F equals ma in exam questions.",
  ];

  return (
    <main className="min-h-screen bg-black text-white p-6">
      <div className="mb-4 flex justify-end">
        <a href="/dashboard" className="text-xs text-gray-500 hover:text-gray-300 underline">
          Parent Dashboard →
        </a>
      </div>
      <section className="mb-8">
        <p className="text-sm uppercase tracking-[0.3em] text-green-400">
          Friday Tutor
        </p>

        <h1 className="mt-2 text-4xl font-bold">
          Voice-first AI Tutor for IB & Singapore A-Levels
        </h1>

        <p className="mt-3 max-w-3xl text-gray-400">
          Ask Friday a Math, Physics, or Chemistry question. Friday will answer
          verbally and open visual tools when the concept needs to be shown.
        </p>
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* LEFT PANEL */}
        <div className="rounded-2xl border border-gray-800 bg-gray-950 p-6">
          <div className="flex items-center gap-4">
            <MicButton
              setQuestion={setQuestion}
              askBackend={askBackend}
              setStatus={setStatus}
              setError={setError}
            />

            <button
              type="button"
              onClick={stopAudio}
              disabled={status !== "speaking"}
              className="rounded-xl border border-red-900 bg-red-950 px-5 py-3 font-bold text-red-100 hover:border-red-500 hover:bg-red-900 disabled:cursor-not-allowed disabled:border-gray-800 disabled:bg-gray-900 disabled:text-gray-600"
            >
              Stop audio
            </button>

            <div>
              <p className="text-sm text-gray-400">System status</p>
              <p className="font-semibold text-green-400">
                {status === "idle" && "Ready"}
                {status === "listening" && "Listening..."}
                {status === "transcribing" && "Transcribing..."}
                {status === "thinking" && "Thinking..."}
                {status === "speaking" && "Friday is speaking..."}
                {status === "error" && "Error"}
              </p>
            </div>
          </div>

          <div className="mt-6">
            <label className="text-sm font-semibold text-gray-300">
              Type fallback question
            </label>

            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Example: Show me how y = x² transforms into y = 2(x - 3)² + 1"
              className="mt-2 h-28 w-full resize-none rounded-xl border border-gray-700 bg-black p-4 text-white outline-none focus:border-green-400"
            />

            <button
              onClick={handleTypedSubmit}
              disabled={status === "thinking" || status === "transcribing"}
              className="mt-3 rounded-xl bg-green-500 px-5 py-3 font-bold text-black hover:bg-green-400 disabled:cursor-not-allowed disabled:bg-gray-700 disabled:text-gray-400"
            >
              Ask Friday
            </button>
          </div>

          {error && (
            <div className="mt-4 rounded-xl border border-red-800 bg-red-950/60 p-3 text-sm text-red-200">
              {error}
            </div>
          )}

          <div className="mt-6">
            <p className="mb-3 text-sm font-semibold text-gray-300">
              Demo prompts
            </p>

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

          <AnswerPanel question={question} response={response} />
        </div>

        {/* RIGHT PANEL */}
        <div className="rounded-2xl border border-gray-800 bg-gray-950 p-6">
          <div className="mb-4">
            <p className="text-sm uppercase tracking-[0.2em] text-blue-400">
              Visual Explanation
            </p>

            <h2 className="mt-1 text-2xl font-bold">
              Desmos / MolView / PhET Panel
            </h2>
          </div>

          <VisualizationPanel response={response} />
        </div>
      </section>
    </main>
  );
}
