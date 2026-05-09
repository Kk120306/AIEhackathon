"use client";

import type { AppStatus } from "../types";

interface MicButtonProps {
  isConversationActive: boolean;
  isRecording: boolean;
  audioLevel: number; // 0–1 normalised
  status: AppStatus;
  onToggle: () => void;
}

const BAR_BASE = [0.4, 0.7, 1, 0.7, 0.4];

export default function MicButton({
  isConversationActive,
  isRecording,
  audioLevel,
  status,
  onToggle,
}: MicButtonProps) {
  // Only truly block the button during processing; recording is tappable (tap = send)
  const isBusy = status === "transcribing" || status === "thinking";

  const label = isBusy
    ? status === "transcribing"
      ? "Processing…"
      : "Thinking…"
    : isConversationActive
    ? isRecording
      ? "Listening — tap to send"
      : "Friday is responding…"
    : "Start Conversation";

  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={isBusy}
      aria-label={isConversationActive ? "End conversation" : "Start conversation"}
      className={[
        "relative flex items-center justify-center gap-4",
        "w-full rounded-2xl px-6 py-5 font-bold text-lg transition-all duration-200 select-none",
        "disabled:cursor-not-allowed",
        isConversationActive
          ? "bg-red-600 hover:bg-red-500 text-white disabled:bg-red-900 disabled:text-red-400"
          : "bg-green-500 hover:bg-green-400 text-black disabled:bg-gray-700 disabled:text-gray-400",
      ].join(" ")}
    >
      {/* Soft glow while conversation is active */}
      {isConversationActive && (
        <span className="absolute inset-0 rounded-2xl animate-pulse bg-current opacity-10 pointer-events-none" />
      )}

      {/* Live audio level bars while recording */}
      {isRecording ? (
        <span className="flex items-end gap-[3px] h-6 shrink-0" aria-hidden="true">
          {BAR_BASE.map((base, i) => {
            const height = Math.max(base * 0.3, base * audioLevel) * 24;
            return (
              <span
                key={i}
                style={{ height: `${height}px`, transition: "height 80ms ease" }}
                className="w-[4px] rounded-full bg-current"
              />
            );
          })}
        </span>
      ) : (
        <span className="text-2xl shrink-0" aria-hidden="true">
          {isConversationActive ? "⏹" : "🎙️"}
        </span>
      )}

      <span>{label}</span>

      {isConversationActive && (
        <span className="ml-auto text-xs font-normal opacity-60">tap to end</span>
      )}
    </button>
  );
}
