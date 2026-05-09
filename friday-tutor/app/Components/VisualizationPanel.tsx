"use client";

import { useEffect, useRef, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import type { GeneratedIllustration, TutorResponse } from "../types";
import GeneratedImagePanel from "./GeneratedImagePanel";

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

// ── Generate illustration (above Friday's answer / visualisation) ─────────────

function IllustrationActionBar({
  onGenerate,
  isGenerating,
}: {
  onGenerate: () => void;
  isGenerating: boolean;
}) {
  return (
    <div className="mb-1">
      <button
        type="button"
        onClick={onGenerate}
        disabled={isGenerating}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-950/40 transition-[filter,opacity] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
        title="Generate an educational diagram with Imagen"
      >
        {isGenerating ? (
          <>
            <span
              aria-hidden
              className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
            />
            Generating illustration…
          </>
        ) : (
          <>
            <span aria-hidden>✨</span>
            Generate illustration
          </>
        )}
      </button>
      <p className="mt-2 text-center text-[11px] text-zinc-500">
        Optional — illustration opens at the top; Friday&apos;s written answer stays below it
      </p>
    </div>
  );
}

// ── Answer panel (shown in right panel when no tool is active) ────────────────

function AnswerDisplay({ response }: { response: TutorResponse }) {
  const content = response.display_answer ?? response.spoken_answer;
  return (
    <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-5">
      <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-500">
        Friday&apos;s answer
      </p>
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
  generatedImage,
  onCloseImage,
  onRegenerateImage,
  isRegeneratingImage,
  onGenerateImage,
  isGeneratingImage,
}: {
  response: TutorResponse | null;
  generatedImage?: GeneratedIllustration | null;
  onCloseImage?: () => void;
  onRegenerateImage?: () => void;
  isRegeneratingImage?: boolean;
  onGenerateImage?: () => void;
  isGeneratingImage?: boolean;
}) {
  // Generated illustration at the top — written answer stays below for reference
  if (generatedImage) {
    return (
      <div className="space-y-4">
        <GeneratedImagePanel
          imageBase64={generatedImage.imageBase64}
          mimeType={generatedImage.mimeType}
          prompt={generatedImage.prompt}
          onClose={onCloseImage ?? (() => {})}
          onRegenerate={onRegenerateImage}
          isRegenerating={isRegeneratingImage}
        />
        {response ? <AnswerDisplay response={response} /> : null}
      </div>
    );
  }

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

  const showIllustrationBar =
    !response.out_of_scope && !!onGenerateImage;

  const wrapWithIllustrationBar = (viz: ReactNode) =>
    showIllustrationBar ? (
      <div className="space-y-4">
        <IllustrationActionBar
          onGenerate={onGenerateImage!}
          isGenerating={isGeneratingImage ?? false}
        />
        <AnswerDisplay response={response} />
        {viz}
      </div>
    ) : (
      <div className="space-y-4">
        <AnswerDisplay response={response} />
        {viz}
      </div>
    );

  // Tool call present — render the appropriate visualisation
  if (response.tool_call) {
    const { name, args } = response.tool_call;

    if (name === "show_desmos_graph") {
      const expressions = Array.isArray(args.expressions)
        ? (args.expressions as string[])
        : [];
      return wrapWithIllustrationBar(<DesmosPanel expressions={expressions} />);
    }

    if (name === "show_molecule_3d") {
      return wrapWithIllustrationBar(
        <MoleculePanel
          moleculeName={String(args.molecule_name ?? "")}
          pubchemCid={args.pubchem_cid ? String(args.pubchem_cid) : undefined}
        />
      );
    }

    if (name === "show_steps_breakdown") {
      const steps = Array.isArray(args.steps) ? (args.steps as string[]) : [];
      return wrapWithIllustrationBar(
        <StepsPanel steps={steps} topic={args.topic ? String(args.topic) : undefined} />
      );
    }
  }

  // No tool call — answer only (bar sits above the same AnswerDisplay)
  return showIllustrationBar ? (
    <div className="space-y-4">
      <IllustrationActionBar
        onGenerate={onGenerateImage!}
        isGenerating={isGeneratingImage ?? false}
      />
      <AnswerDisplay response={response} />
    </div>
  ) : (
    <AnswerDisplay response={response} />
  );
}
