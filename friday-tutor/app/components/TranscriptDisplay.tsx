"use client";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface TranscriptDisplayProps {
  history: Message[];
}

export default function TranscriptDisplay({ history }: TranscriptDisplayProps) {
  const messages = history.filter((m) => m.role === "user" || m.role === "assistant");

  if (messages.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 text-sm">
        Tap the mic and ask Friday a question.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 overflow-y-auto h-full pr-1">
      {messages.map((msg, i) => (
        <div
          key={i}
          className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
        >
          <div
            className={`
              max-w-[85%] px-4 py-2 rounded-2xl text-sm leading-relaxed
              ${msg.role === "user"
                ? "bg-indigo-600 text-white rounded-br-sm"
                : "bg-gray-100 text-gray-800 rounded-bl-sm"}
            `}
          >
            {msg.content}
          </div>
        </div>
      ))}
    </div>
  );
}
