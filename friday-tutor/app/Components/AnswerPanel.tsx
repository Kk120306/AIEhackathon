import type { TutorResponse } from "../types";

export default function AnswerPanel({
  question,
  response,
}: {
  question: string;
  response: TutorResponse | null;
}) {
  if (!question) return null;

  const isOutOfScope = response?.out_of_scope === true;

  return (
    <div className="mt-6 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
      <div className="flex items-center gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
          You asked
        </p>
        {isOutOfScope && (
          <span className="inline-flex items-center gap-1 rounded-full border border-amber-700/60 bg-amber-950/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-300">
            <span className="h-1 w-1 rounded-full bg-amber-400" />
            Outside IB / A-Level scope
          </span>
        )}
      </div>
      <p className="mt-1 text-sm text-zinc-200 leading-relaxed">{question}</p>
    </div>
  );
}
