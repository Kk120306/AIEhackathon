import type { AggregatedTopicProgress } from "../types";

function accuracyColor(accuracy: number | null): string {
  if (accuracy === null) return "bg-gray-600";
  if (accuracy < 60) return "bg-red-500";
  if (accuracy < 80) return "bg-yellow-500";
  return "bg-green-500";
}

export default function MetricsSection({
  progress,
}: {
  progress: AggregatedTopicProgress[];
}) {
  const maxQuestions = Math.max(...progress.map((p) => p.totalQuestions), 1);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {/* Accuracy by Topic */}
      <div className="rounded-2xl border border-gray-800 bg-gray-950 p-6">
        <p className="text-sm uppercase tracking-widest text-blue-400 mb-4">
          Accuracy by Topic
        </p>

        {progress.length === 0 ? (
          <p className="text-sm text-gray-500">No data yet.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {progress.map((p) => (
              <div key={p.topic}>
                <div className="flex justify-between mb-1">
                  <span className="text-sm text-gray-300">{p.topic}</span>
                  <span className="text-xs text-gray-400">
                    {p.accuracy !== null ? `${p.accuracy}%` : "—"}
                  </span>
                </div>
                <div className="h-3 w-full rounded-full bg-gray-800">
                  <div
                    className={`h-3 rounded-full transition-all duration-500 ease-out ${accuracyColor(p.accuracy)}`}
                    style={{ width: `${p.accuracy ?? 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Questions per Topic */}
      <div className="rounded-2xl border border-gray-800 bg-gray-950 p-6">
        <p className="text-sm uppercase tracking-widest text-blue-400 mb-4">
          Questions Asked by Topic
        </p>

        {progress.length === 0 ? (
          <p className="text-sm text-gray-500">No data yet.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {progress.map((p) => (
              <div key={p.topic}>
                <div className="flex justify-between mb-1">
                  <span className="text-sm text-gray-300">{p.topic}</span>
                  <span className="text-xs text-gray-400">
                    {p.totalQuestions} Qs
                  </span>
                </div>
                <div className="h-3 w-full rounded-full bg-gray-800">
                  <div
                    className="h-3 rounded-full bg-blue-500 transition-all duration-500 ease-out"
                    style={{
                      width: `${(p.totalQuestions / maxQuestions) * 100}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
