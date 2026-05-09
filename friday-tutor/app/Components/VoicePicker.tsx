"use client";

import { useEffect, useState } from "react";

type ElevenLabsVoice = { voice_id: string; name: string };

type Props = {
  voiceId: string;
  setVoiceId: (id: string) => void;
};

export default function VoicePicker({ voiceId, setVoiceId }: Props) {
  const [voices, setVoices] = useState<ElevenLabsVoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);

  useEffect(() => {
    fetch("/api/voices")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setVoices(data);
        else setError("Could not load voices.");
      })
      .catch(() => setError("Could not load voices."))
      .finally(() => setLoading(false));
  }, []);

  const stopPreview = () => {
    audio?.pause();
    setAudio(null);
    setPlaying(false);
  };

  const preview = async () => {
    if (playing) {
      stopPreview();
      return;
    }
    setPreviewLoading(true);
    try {
      const res = await fetch("/api/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: "Hi! I'm ACE, your AI tutor. I'm here to help you ace your exams.",
          voiceId,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = new Audio(url);
      setAudio(a);
      setPlaying(true);
      a.onended = () => {
        setPlaying(false);
        URL.revokeObjectURL(url);
        setAudio(null);
      };
      await a.play();
    } catch {
      // silent
    } finally {
      setPreviewLoading(false);
    }
  };

  useEffect(() => {
    return () => stopPreview();
  }, []);

  return (
    <div className="space-y-2">
      <div>
        <label
          htmlFor="ace-voice-select"
          className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-zinc-500"
        >
          Speaking voice
        </label>
        {loading ? (
          <p className="text-xs text-zinc-500">Loading voices…</p>
        ) : error ? (
          <p className="text-xs text-red-400">{error}</p>
        ) : (
          <select
            id="ace-voice-select"
            value={voiceId}
            onChange={(e) => {
              stopPreview();
              setVoiceId(e.target.value);
            }}
            className="w-full cursor-pointer rounded-lg border border-zinc-700 bg-zinc-950/80 px-2.5 py-2 text-xs text-zinc-100 outline-none focus:border-indigo-500"
          >
            {voices.map((v) => (
              <option key={v.voice_id} value={v.voice_id} className="bg-zinc-900">
                {v.name}
              </option>
            ))}
          </select>
        )}
      </div>
      <button
        type="button"
        onClick={preview}
        disabled={previewLoading || loading || !!error}
        className="w-full rounded-md border border-indigo-700/60 bg-indigo-950/40 px-3 py-1.5 text-[11px] font-semibold text-indigo-200 transition-colors hover:bg-indigo-900/50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {previewLoading ? (
          <>
            <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-indigo-400 border-t-transparent align-middle" />
            {" "}Loading…
          </>
        ) : playing ? (
          "Stop preview"
        ) : (
          "Preview voice"
        )}
      </button>
    </div>
  );
}
