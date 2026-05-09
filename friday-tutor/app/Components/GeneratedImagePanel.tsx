"use client";

type Props = {
  imageBase64: string;
  mimeType: string;
  prompt: string;
  onClose: () => void;
  onRegenerate?: () => void;
  isRegenerating?: boolean;
};

export default function GeneratedImagePanel({
  imageBase64,
  mimeType,
  prompt,
  onClose,
  onRegenerate,
  isRegenerating,
}: Props) {
  const dataUrl = `data:${mimeType};base64,${imageBase64}`;

  return (
    <div className="space-y-3 rounded-xl border border-zinc-700 bg-zinc-900 p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-indigo-400">
          <span aria-hidden>✨</span>
          AI Illustration
        </p>
        <div className="flex items-center gap-2">
          {onRegenerate && (
            <button
              type="button"
              onClick={onRegenerate}
              disabled={isRegenerating}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-[11px] font-medium text-zinc-300 transition-colors hover:border-zinc-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
              title="Generate a fresh illustration with the same prompt"
            >
              {isRegenerating ? (
                <>
                  <span
                    aria-hidden
                    className="inline-block h-2.5 w-2.5 animate-spin rounded-full border-[1.5px] border-zinc-400 border-t-transparent"
                  />
                  Regenerating…
                </>
              ) : (
                <>↻ Regenerate</>
              )}
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-[11px] font-medium text-zinc-400 transition-colors hover:border-zinc-500 hover:text-white"
            title="Close the illustration and return to ACE's answer"
          >
            ✕ Close
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-zinc-800 bg-black">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={dataUrl}
          alt={prompt}
          className="block h-auto w-full"
        />
      </div>

      <details className="text-[11px] text-zinc-500">
        <summary className="cursor-pointer hover:text-zinc-300">
          Prompt used
        </summary>
        <p className="mt-1.5 leading-relaxed text-zinc-400">{prompt}</p>
      </details>
    </div>
  );
}
