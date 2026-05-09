"use client";

import { useState } from "react";
import MicButton from "./components/MicButton";
import AnswerPanel from "./components/AnswerPanel";
import VisualizationPanel from "./components/VisualizationPanel";

export default function Home() {
  const [question, setQuestion] = useState("");
  const [response, setResponse] = useState<any>(null);
  const [status, setStatus] = useState("idle");

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

  const askBackend = async (q: string) => {
    if (!q.trim()) return;

    setStatus("thinking");
    setResponse(null);

    // TEMPORARY MOCK RESPONSE
    // Use this until Kai's backend is ready.
    const mockResponse = {
      subject: "Mathematics",
      topic: "Graph Transformation",
      spoken_answer:
        "Of course. Start with y equals x squared. The expression x minus 3 shifts the graph 3 units to the right. The coefficient 2 stretches the graph vertically, making it narrower. Finally, the plus 1 shifts the graph 1 unit upward.",
      needs_visualization: true,
      visualization_tool: "desmos",
      visualization_url: "https://www.desmos.com/calculator",
      display_steps: [
        "Start with the base graph: y = x².",
        "Replace x with (x - 3), which shifts the graph 3 units to the right.",
        "Multiply the function by 2, which stretches the graph vertically.",
        "Add 1 outside the bracket, which shifts the graph 1 unit upward.",
      ],
      exam_tip:
        "For graph transformations, identify horizontal shifts inside the bracket first, then vertical stretches and vertical translations.",
    };

    setTimeout(() => {
      setResponse(mockResponse);
      setStatus("speaking");
      speak(mockResponse.spoken_answer);
    }, 1000);
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