import type { Message } from "../types";

export default function ActivityFeed({ messages }: { messages: Message[] }) {
  if (messages.length === 0) {
    return (
      <p className="text-sm text-gray-500">
        No messages in this session yet.
      </p>
    );
  }

  return (
    <div className="max-h-64 overflow-y-auto space-y-3 pr-1">
      {messages.map((m) => {
        const time = new Date(m.timestamp).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });
        const content =
          m.content.length > 200 ? m.content.slice(0, 200) + "..." : m.content;
        const isUser = m.role === "user";

        return (
          <div key={m._id} className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span
                className={
                  isUser
                    ? "bg-gray-800 rounded px-1.5 py-0.5 text-xs text-gray-400"
                    : "bg-green-900 rounded px-1.5 py-0.5 text-xs text-green-300"
                }
              >
                {isUser ? "Student" : "Friday"}
              </span>
              <span className="text-xs text-gray-600">{time}</span>
              {m.topicTag && (
                <span className="bg-blue-900/50 text-blue-300 text-xs px-1.5 py-0.5 rounded ml-1">
                  {m.topicTag}
                </span>
              )}
            </div>
            <p className="text-sm text-gray-300 pl-1">{content}</p>
          </div>
        );
      })}
    </div>
  );
}
