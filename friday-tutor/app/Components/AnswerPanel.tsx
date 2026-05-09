import type { TutorResponse } from "../types";

export default function AnswerPanel({
  question,
  response,
}: {
  question: string;
  response: TutorResponse | null;
}) {
  if (!question) return null;

  return (
    <div className="mt-6 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
        You asked
      </p>
      <p className="mt-1 text-sm text-zinc-200 leading-relaxed">{question}</p>
    </div>
  );
}
