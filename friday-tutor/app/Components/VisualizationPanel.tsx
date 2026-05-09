"use client";

import { useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import type { TutorResponse } from "../types";

// ── Desmos graph ──────────────────────────────────────────────────────────────

function DesmosPanel({ expressions }: { expressions: string[] }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const scriptId = "desmos-api";

    const init = () => {
      if (!containerRef.current) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const Desmos = (window as any).Desmos;
      if (!Desmos) return;
      const calc = Desmos.GraphingCalculator(containerRef.current, {
        expressionsCollapsed: true,
      });
      expressions.forEach((expr, i) => {
        calc.setExpression({ id: `expr${i}`, latex: expr });
      });
    };

    if (document.getElementById(scriptId)) {
      init();
      return;
    }
    const script = document.createElement("script");
    script.id = scriptId;
    script.src =
      "https://www.desmos.com/api/v1.10/calculator.js?apiKey=dcb31709b452b1cf9dc26972add0fda6";
    script.onload = init;
    document.head.appendChild(script);
  }, [expressions]);

  return (
    <div ref={containerRef} className="w-full h-[480px] rounded-xl overflow-hidden" />
  );
}

// ── 3D molecule ───────────────────────────────────────────────────────────────

function MoleculePanel({
  moleculeName,
  pubchemCid,
}: {
  moleculeName: string;
  pubchemCid?: string;
}) {
  const src = pubchemCid
    ? `https://embed.molview.org/v1/?mode=3Dmol&cid=${pubchemCid}`
    : `https://embed.molview.org/v1/?mode=3Dmol&q=${encodeURIComponent(moleculeName)}`;

  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-blue-300">{moleculeName}</p>
      <iframe
        src={src}
        title={`3D structure of ${moleculeName}`}
        className="w-full h-[480px] rounded-xl border border-gray-700"
        allow="fullscreen"
      />
    </div>
  );
}

// ── Steps breakdown ───────────────────────────────────────────────────────────

function StepsPanel({ steps, topic }: { steps: string[]; topic?: string }) {
  return (
    <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-5 space-y-3">
      {topic && (
        <p className="text-sm font-bold uppercase tracking-wider text-indigo-400">{topic}</p>
      )}
      <ol className="space-y-4">
        {steps.map((step, i) => (
          <li key={i} className="flex gap-3">
            <span className="flex-none w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center mt-0.5">
              {i + 1}
            </span>
            <div className="text-zinc-200 leading-relaxed prose prose-invert prose-sm max-w-none
              [&_.katex]:text-white
              [&_p]:mb-0 [&_p]:leading-relaxed">
              <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                {step}
              </ReactMarkdown>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

// ── Answer panel (shown in right panel when no tool is active) ────────────────

function AnswerDisplay({ response }: { response: TutorResponse }) {
  const content = response.display_answer ?? response.spoken_answer;
  return (
    <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-5">
      {response.topic && (
        <p className="mb-3 text-xs font-bold uppercase tracking-wider text-indigo-400">
          {response.topic}
        </p>
      )}
      <div className="text-zinc-100 prose prose-invert prose-sm max-w-none
        [&_.katex]:text-white
        [&_p]:leading-relaxed [&_p]:mb-3 [&_p:last-child]:mb-0
        [&_ul]:pl-5 [&_ul]:mb-3 [&_li]:mb-1
        [&_ol]:pl-5 [&_ol]:mb-3
        [&_strong]:font-semibold [&_strong]:text-white
        [&_code]:bg-zinc-800 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-indigo-300 [&_code]:text-xs">
        <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
          {content}
        </ReactMarkdown>
      </div>
      {typeof response.is_correct === "boolean" && (
        <p className={`mt-4 text-sm font-semibold ${response.is_correct ? "text-emerald-400" : "text-yellow-400"}`}>
          {response.is_correct ? "✓ Correct" : "Not quite — keep going!"}
        </p>
      )}
    </div>
  );
}

// ── Main panel ────────────────────────────────────────────────────────────────

export default function VisualizationPanel({
  response,
}: {
  response: TutorResponse | null;
}) {
  // No response yet — show placeholder
  if (!response) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/50">
        <p className="text-sm text-zinc-500">
          Friday&apos;s answer and visualisations will appear here.
        </p>
      </div>
    );
  }

  // Tool call present — render the appropriate visualisation
  if (response.tool_call) {
    const { name, args } = response.tool_call;

    if (name === "show_desmos_graph") {
      const expressions = Array.isArray(args.expressions)
        ? (args.expressions as string[])
        : [];
      return <DesmosPanel expressions={expressions} />;
    }

    if (name === "show_molecule_3d") {
      return (
        <MoleculePanel
          moleculeName={String(args.molecule_name ?? "")}
          pubchemCid={args.pubchem_cid ? String(args.pubchem_cid) : undefined}
        />
      );
    }

    if (name === "show_steps_breakdown") {
      const steps = Array.isArray(args.steps) ? (args.steps as string[]) : [];
      return <StepsPanel steps={steps} topic={args.topic ? String(args.topic) : undefined} />;
    }
  }

  // No tool call — show the answer with LaTeX in the right panel
  return <AnswerDisplay response={response} />;
}
