"use client";

import { useState } from "react";
import MicButton from "./components/MicButton";
import AnswerPanel from "./components/AnswerPanel";
import VisualizationPanel from "./components/VisualizationPanel";
import { getMockFridayResponse } from "./utils/mockFridayResponse";

export type FridayResponse = {
  subject: string;
  topic: string;
  spoken_answer: string;
  needs_visualization: boolean;
  visualization_tool:
    | "none"
    | "desmos"
    | "phet"
    | "molview"
    | "force_diagram"
    | "chem_mechanism";
  visualization_url?: string;
  display_steps: string[];
  diagram_data?: any;
  exam_tip?: string;
};

export default function Home() {
  const [question, setQuestion] = useState("");
  const [response, setResponse] = useState<FridayResponse | null>(null);
  const [status, setStatus] = useState<
    "idle" | "listening" | "thinking" | "speaking" | "error"
  >("idle");

  const USE_MOCK_BACKEND = true;

  const speak = (text: string) => {
    if (!text || typeof window === "undefined") return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.pitch = 1.05;
    utterance.volume = 1;

    utterance.onend = () => setStatus("idle");

    window.speechSynthesis.speak(utterance);
  };

  const askFriday = async (inputQuestion: string) => {
    const cleanQuestion = inputQuestion.trim();
    if (!cleanQuestion) return;

    setQuestion(cleanQuestion);
    setStatus("thinking");
    setResponse(null);

    try {
      let data: FridayResponse;

      if (USE_MOCK_BACKEND) {
        data = await getMockFridayResponse(cleanQuestion);
      } else {
        const res = await fetch("http://localhost:8000/ask", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ question: cleanQuestion }),
        });

        if (!res.ok) {
          throw new Error("Backend request failed");
        }

        data = await res.json();
      }

      setResponse(data);
      setStatus("speaking");
      speak(data.spoken_answer);
    } catch (error) {
      console.error(error);
      setStatus("error");
      setResponse({
        subject: "Unknown",
        topic: "Fallback",
        spoken_answer:
          "Sorry, I could not process that question. Please try again or use one of the demo prompts.",
        needs_visualization: false,
        visualization_tool: "none",
        display_steps: [],
        exam_tip: "In the demo, use the typed fallback if voice input fails.",
      });
    }
  };

  const demoQuestions = [
    "Show me how y equals x squared changes into y equals 2 times x minus 3 squared plus 1.",
    "A car is moving forward and experiences drag. Show me the forces acting on it.",
    "Explain nucleophilic substitution using bromoethane and hydroxide.",
    "Show me the molecular geometry of methane.",
    "Explain Newton's second law and how to use F equals ma in exam questions.",
  ];

  return (
    <main className="min-h-screen bg-black p-6 text-white">
      <section className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-green-400">
          Friday Tutor
        </p>

        <h1 className="mt-2 text-4xl font-bold">
          Voice-first AI Tutor for Singapore A-Level H2 Math, Physics &
          Chemistry
        </h1>

        <p className="mt-3 max-w-4xl text-gray-400">
          Ask Friday an academic question. Friday answers verbally, then chooses
          the best visualization: Desmos for Math, force diagrams or PhET for
          Physics, and MolView or mechanism cards for Chemistry.
        </p>
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-gray-800 bg-gray-950 p-6">
          <div className="flex items-center gap-4">
            <MicButton
              setQuestion={setQuestion}
              askFriday={askFriday}
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
              placeholder="Example: A car is moving forward and experiences drag. Show me the forces acting on it."
              className="mt-2 h-28 w-full resize-none rounded-xl border border-gray-700 bg-black p-4 text-white outline-none focus:border-green-400"
            />

            <button
              onClick={() => askFriday(question)}
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
                  onClick={() => askFriday(demo)}
                  className="rounded-xl border border-gray-700 bg-gray-900 p-3 text-left text-sm text-gray-300 hover:border-green-400 hover:text-white"
                >
                  {demo}
                </button>
              ))}
            </div>
          </div>

          <AnswerPanel question={question} response={response} />
        </div>

        <div className="rounded-2xl border border-gray-800 bg-gray-950 p-6">
          <div className="mb-4">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-400">
              Visual Explanation
            </p>

            <h2 className="mt-1 text-2xl font-bold">
              Desmos / MolView / PhET / Custom Diagrams
            </h2>
          </div>

          <VisualizationPanel response={response} />
        </div>
      </section>
    </main>
  );
}