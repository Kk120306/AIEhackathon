"use client";

import { useEffect, useRef } from "react";
import type { TutorResponse } from "../page";

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
    <div className="rounded-xl border border-gray-700 bg-gray-900 p-5 space-y-3">
      {topic && (
        <p className="text-sm font-bold uppercase tracking-wider text-blue-400">{topic}</p>
      )}
      <ol className="space-y-3">
        {steps.map((step, i) => (
          <li key={i} className="flex gap-3">
            <span className="flex-none w-6 h-6 rounded-full bg-green-500 text-black text-xs font-bold flex items-center justify-center">
              {i + 1}
            </span>
            <span className="text-gray-200 leading-relaxed">{step}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

// ── Main panel ────────────────────────────────────────────────────────────────

export default function VisualizationPanel({
  response,
}: {
  response: TutorResponse | null;
}) {
  if (!response?.tool_call) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-gray-800 bg-gray-900">
        <p className="text-sm text-gray-500">
          Visualisation will appear here when Friday uses a tool.
        </p>
      </div>
    );
  }

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

  return null;
}
