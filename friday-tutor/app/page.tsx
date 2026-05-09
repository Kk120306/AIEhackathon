"use client";

import { useState, useRef } from "react";
import MicButton from "./components/MicButton";
import AnswerPanel from "./components/AnswerPanel";
import VisualizationPanel from "./components/VisualizationPanel";
import CameraPanel, { type CameraPanelHandle } from "./Components/CameraPanel";

const CAMERA_TRIGGERS = [
  "take a picture",
  "take a photo",
  "take a photograph",
  "look at this",
  "read this",
  "show you this",
  "what is this",
  "what's this",
  "what does this say",
  "can you see",
  "scan this",
  "photograph this",
  "capture this",
  "analyze this",
  "analyse this",
];

function detectCameraTrigger(text: string): boolean {
  const lower = text.toLowerCase();
  return CAMERA_TRIGGERS.some((p) => lower.includes(p));
}

export default function Home() {
  const [question, setQuestion] = useState("");
  const [response, setResponse] = useState<any>(null);
  const [status, setStatus] = useState("idle");
  const cameraRef = useRef<CameraPanelHandle>(null);

  const speak = (text: string) => {
    if (!text) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.pitch = 1.05;
    utterance.volume = 1;

    utterance.onend = () => {
      setStatus("idle");
    };

    window.speechSynthesis.speak(utterance);
  };

  const askBackend = async (q: string, imageBase64?: string) => {
    if (!q.trim()) return;

    setStatus("thinking");
    setResponse(null);

    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: q.trim(),
          ...(imageBase64 ? { imageBase64, imageMimeType: "image/jpeg" } : {}),
        }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error ?? "Friday could not answer.");
      setResponse(payload);
      setStatus("speaking");
      speak(payload.spoken_answer ?? "");
    } catch {
      setStatus("error");
    }
  };

  const handleQuestion = async (q: string) => {
    let imageBase64: string | undefined;
    if (detectCameraTrigger(q)) {
      const dataUrl = cameraRef.current?.captureFrame() ?? null;
      if (dataUrl) imageBase64 = dataUrl.split(",")[1];
    }
    await askBackend(q, imageBase64);
  };

  const handleTypedSubmit = () => {
    handleQuestion(question);
  };

  const demoQuestions = [
    "Show me how y equals x squared changes into y equals 2 times x minus 3 squared plus 1.",
    "Explain Le Chatelier's principle for A-Level chemistry.",
    "Explain Newton's second law and how to use F equals ma in exam questions.",
  ];

  return (
    <main className="min-h-screen bg-black text-white p-6">
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
          <CameraPanel ref={cameraRef} />

          <div className="flex items-center gap-4">
            <MicButton
              setQuestion={setQuestion}
              askBackend={handleQuestion}
              setStatus={setStatus}
            />

            <div>
              <p className="text-sm text-gray-400">System status</p>
              <p className="font-semibold text-green-400">
                {status === "idle" && "Ready"}
                {status === "listening" && "Listening..."}
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
              className="mt-3 rounded-xl bg-green-500 px-5 py-3 font-bold text-black hover:bg-green-400"
            >
              Ask Friday
            </button>
          </div>

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
                    handleQuestion(demo);
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