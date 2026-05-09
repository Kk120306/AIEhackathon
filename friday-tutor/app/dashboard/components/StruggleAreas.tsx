import type { AggregatedTopicProgress } from "../types";

export default function StruggleAreas({
  progress,
}: {
  progress: AggregatedTopicProgress[];
}) {
  const struggleTopics = progress.filter(
    (p) => p.accuracy !== null && p.accuracy < 60
  );

  if (struggleTopics.length === 0) {
    return (
      <div className="rounded-xl border border-green-900 bg-green-950/20 p-4">
        <p className="text-sm text-green-400 font-medium">
          No struggle areas detected. Great work!
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {struggleTopics.map((p) => (
        <div
          key={p.topic}
          className="rounded-xl border border-red-900 bg-red-950/40 p-4"
        >
          <p className="text-red-300 font-semibold text-sm">{p.topic}</p>
          <p className="text-red-400 text-sm mt-1">{p.accuracy}% accuracy</p>
          {p.struggledTopics.length > 0 && (
            <div className="mt-2 flex flex-wrap">
              {p.struggledTopics.map((sub) => (
                <span
                  key={sub}
                  className="inline-block rounded bg-red-900/50 px-2 py-0.5 text-xs text-red-300 mr-1 mt-1"
                >
                  {sub}
                </span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
