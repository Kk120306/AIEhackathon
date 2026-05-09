import type { Session } from "../types";
import LiveBadge from "./LiveBadge";

export default function SessionList({
  sessions,
  selectedId,
  activeSessions,
  onSelect,
}: {
  sessions: Session[];
  selectedId: string | null;
  activeSessions: Session[];
  onSelect: (id: string) => void;
}) {
  if (sessions.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-800 bg-gray-950 p-6">
        <p className="text-sm text-gray-500">
          No sessions yet. Start a tutoring session to see data here.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-950 p-4 flex flex-col gap-3">
      {activeSessions.length > 0 && (
        <div className="mb-1">
          <LiveBadge
            isLive
            studentName={activeSessions[0].studentName}
            onWatch={() => onSelect(activeSessions[0]._id)}
          />
        </div>
      )}

      <div className="flex flex-col gap-2 overflow-y-auto">
        {sessions.map((s) => {
          const isSelected = s._id === selectedId;
          const date = new Date(s.startTime).toLocaleDateString();
          const duration = s.endTime
            ? `${Math.round((s.endTime - s.startTime) / 60000)} min`
            : "In progress";
          const visibleTopics = s.topics.slice(0, 3);
          const extraCount = s.topics.length - 3;

          return (
            <button
              key={s._id}
              onClick={() => onSelect(s._id)}
              className={`text-left rounded-xl border p-4 transition-colors ${
                isSelected
                  ? "border-green-500 bg-green-950/20"
                  : "border-gray-800 bg-gray-900 hover:border-gray-700"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-semibold text-white">{date}</span>
                <span
                  className={`text-xs ${s.isActive ? "text-green-400" : "text-gray-500"}`}
                >
                  {duration}
                </span>
              </div>

              <div className="flex flex-wrap gap-1 mt-2">
                {visibleTopics.map((topic) => (
                  <span
                    key={topic}
                    className="rounded bg-gray-800 px-2 py-0.5 text-xs text-gray-400"
                  >
                    {topic}
                  </span>
                ))}
                {extraCount > 0 && (
                  <span className="rounded bg-gray-800 px-2 py-0.5 text-xs text-gray-500">
                    +{extraCount} more
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
