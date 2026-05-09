"use client";

import { useState, useRef, useCallback } from "react";

interface Props {
  onResult: (data: {
    text: string;
    toolCall: { name: string; args: Record<string, unknown> } | null;
    updatedHistory: unknown[];
  }) => void;
  history: unknown[];
  disabled?: boolean;
}

declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}

export default function VoiceInterface({ onResult, history, disabled }: Props) {
  const [listening, setListening] = useState(false);
  const [loading, setLoading] = useState(false);
  const [transcript, setTranscript] = useState("");
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const startListening = useCallback(() => {
    const SR = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!SR) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }
    const recognition = new SR();
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (e) => {
      const result = Array.from(e.results)
        .map((r) => r[0].transcript)
        .join("");
      setTranscript(result);
    };

    recognition.onend = async () => {
      setListening(false);
      const final = recognitionRef.current
        ? transcript
        : "";
      if (!final.trim()) return;
      setLoading(true);
      try {
        const res = await fetch("/api/ask", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ transcript: final, history }),
        });
        const data = await res.json();
        onResult(data);
      } finally {
        setLoading(false);
        setTranscript("");
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  }, [history, onResult, transcript]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        onClick={listening ? stopListening : startListening}
        disabled={loading || disabled}
        className={`relative w-16 h-16 rounded-full text-white font-semibold transition-all shadow-lg
          ${listening
            ? "bg-red-500 hover:bg-red-600"
            : "bg-indigo-600 hover:bg-indigo-700"
          }
          ${loading ? "opacity-50 cursor-not-allowed" : ""}
        `}
      >
        {listening && (
          <span className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-75" />
        )}
        <span className="relative text-2xl">{listening ? "⏹" : "🎤"}</span>
      </button>
      {transcript && (
        <p className="text-sm text-gray-500 italic max-w-xs text-center">
          {transcript}
        </p>
      )}
      {loading && (
        <p className="text-sm text-indigo-500 animate-pulse">
          Friday is thinking…
        </p>
      )}
    </div>
  );
}
