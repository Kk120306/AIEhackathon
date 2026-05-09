"use client";

import Image from "next/image";
import type { AppStatus } from "../types";

/** Keep in sync with TEACHER_CHARACTER_BRIEF_MAX in lib/teacherPortrait.ts */
export const TEACHER_CHARACTER_INPUT_MAX = 280;

export const TEACHER_BRIEF_STORAGE_KEY = "ace_teacher_character_brief";
export const TEACHER_PORTRAIT_BUNDLE_KEY = "ace_teacher_portrait_bundle_v2";
/** Legacy single data-URL slot (migrated once into bundle). */
const LEGACY_PORTRAIT_KEY = "ace_teacher_portrait_v1";

export type TeacherPortraitBundle = {
  brief: string;
  dataUrl: string;
};

function statusCaption(status: AppStatus): string {
  switch (status) {
    case "idle":
      return "Ready when you are.";
    case "listening":
      return "Listening carefully…";
    case "transcribing":
      return "Making sense of what you said…";
    case "thinking":
      return "Working through your question…";
    case "speaking":
      return "Talking you through it — listen or read the panel.";
    case "error":
      return "Something went wrong — you can tap to start again.";
    default:
      return "";
  }
}

function FallbackTutorGraphic({
  speaking,
  listeningPulse,
}: {
  speaking: boolean;
  listeningPulse: number;
}) {
  const ringScale = 1 + Math.min(listeningPulse, 1) * 0.28;
  return (
    <svg viewBox="0 0 220 260" className="h-full w-full" aria-hidden>
      <defs>
        <linearGradient id="aceTeacherGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="55%" stopColor="#4f46e5" />
          <stop offset="100%" stopColor="#312e81" />
        </linearGradient>
        <linearGradient id="aceTeacherFace" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#3f3f46" />
          <stop offset="100%" stopColor="#27272a" />
        </linearGradient>
      </defs>

      <g transform={`translate(110 118) scale(${ringScale}) translate(-110 -118)`}>
        <circle
          cx="110"
          cy="118"
          r="92"
          fill="none"
          stroke="rgba(129,140,248,0.35)"
          strokeWidth="2"
          className="transition-transform duration-100"
        />
        <circle
          cx="110"
          cy="118"
          r="78"
          fill="none"
          stroke="rgba(94,234,212,0.22)"
          strokeWidth="1.5"
          className="transition-transform duration-100"
        />
      </g>

      <ellipse cx="110" cy="210" rx="72" ry="36" fill="url(#aceTeacherGrad)" opacity={0.45} />

      <circle cx="110" cy="110" r="58" fill="url(#aceTeacherFace)" stroke="#52525b" strokeWidth="1.5" />

      <ellipse cx="92" cy="102" rx="6" ry="7" fill="#a1a1aa" />
      <ellipse cx="128" cy="102" rx="6" ry="7" fill="#a1a1aa" />

      <g className={speaking ? "ace-teacher-mouth-bob" : ""}>
        <rect
          x="96"
          y="120"
          width="28"
          height={speaking ? 14 : 7}
          rx="5"
          fill="#d4d4d8"
          style={{ transition: "height 0.12s ease-out" }}
        />
      </g>

      <path
        d="M48 198 Q110 172 172 198 L188 250 H32 Z"
        fill="#312e81"
        stroke="#4338ca"
        strokeWidth="1"
      />
    </svg>
  );
}

export function readPortraitBundle(): TeacherPortraitBundle | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(TEACHER_PORTRAIT_BUNDLE_KEY);
    if (!raw) return null;
    const o = JSON.parse(raw) as { brief?: unknown; dataUrl?: unknown };
    if (typeof o.brief !== "string" || typeof o.dataUrl !== "string") return null;
    return { brief: o.brief, dataUrl: o.dataUrl };
  } catch {
    return null;
  }
}

export function writePortraitBundle(bundle: TeacherPortraitBundle): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      TEACHER_PORTRAIT_BUNDLE_KEY,
      JSON.stringify({ brief: bundle.brief, dataUrl: bundle.dataUrl })
    );
  } catch {
    // quota / private mode
  }
}

export function readStoredTeacherBrief(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(TEACHER_BRIEF_STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

export function writeStoredTeacherBrief(brief: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(TEACHER_BRIEF_STORAGE_KEY, brief);
  } catch {
    // ignore
  }
}

/** One-time migrate legacy portrait blob into bundle when brief still empty. */
export function tryMigrateLegacyPortrait(): TeacherPortraitBundle | null {
  if (typeof window === "undefined") return null;
  try {
    const brief = readStoredTeacherBrief();
    const legacy = window.localStorage.getItem(LEGACY_PORTRAIT_KEY);
    if (!legacy) return null;
    window.localStorage.removeItem(LEGACY_PORTRAIT_KEY);
    if (brief !== "") {
      return null;
    }
    const bundle: TeacherPortraitBundle = { brief: "", dataUrl: legacy };
    writePortraitBundle(bundle);
    return bundle;
  } catch {
    return null;
  }
}

export default function TeacherPresence({
  status,
  audioLevel,
  portraitDataUrl,
  portraitLoading,
  portraitFailed,
  characterBrief,
  onCharacterBriefChange,
  onApplyCharacter,
}: {
  status: AppStatus;
  audioLevel: number;
  portraitDataUrl: string | null;
  portraitLoading: boolean;
  portraitFailed: boolean;
  characterBrief: string;
  onCharacterBriefChange: (value: string) => void;
  onApplyCharacter: () => void;
}) {
  const speaking = status === "speaking";
  const thinking = status === "thinking" || status === "transcribing";

  const normalizedMic =
    typeof audioLevel === "number" && Number.isFinite(audioLevel)
      ? Math.max(0, Math.min(1, audioLevel))
      : 0;

  const len = characterBrief.length;

  return (
    <section
      aria-label="Tutor presence"
      className="relative overflow-hidden rounded-xl border border-zinc-800 bg-gradient-to-br from-zinc-900 via-zinc-900 to-indigo-950/40 p-3 shadow-inner shadow-black/20 sm:p-3.5"
    >
      <div
        aria-hidden
        className={`pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-indigo-600/12 blur-3xl ${
          thinking ? "ace-teacher-think-glow" : ""
        }`}
      />

      <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative mx-auto shrink-0 sm:mx-0">
          <div
            className={`relative h-[132px] w-[100px] overflow-hidden rounded-xl border border-zinc-700/90 bg-zinc-950 shadow-md ring-1 shadow-black/25 ${
              speaking ? "ace-teacher-speak-ring" : ""
            } ${thinking ? "ace-teacher-think-ring" : ""}`}
          >
            {portraitLoading && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-zinc-950/90">
                <div className="flex flex-col items-center gap-1.5 px-2 text-center">
                  <span className="h-7 w-7 animate-spin rounded-full border-2 border-indigo-400 border-t-transparent" />
                  <span className="text-[10px] font-medium text-zinc-400">Preparing…</span>
                </div>
              </div>
            )}

            {portraitDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={portraitDataUrl}
                alt=""
                className={`h-full w-full object-cover object-top ${speaking ? "ace-teacher-portrait-ken" : ""}`}
              />
            ) : (
              <div className="flex h-full w-full items-end justify-center bg-zinc-900 pb-2 pt-4">
                <FallbackTutorGraphic
                  speaking={speaking}
                  listeningPulse={status === "listening" ? normalizedMic : 0}
                />
              </div>
            )}

            {!portraitLoading && portraitDataUrl && (
              <div className="pointer-events-none absolute bottom-1 right-1 flex h-6 w-6 items-center justify-center rounded-md border border-white/10 bg-black/35 p-0.5 shadow-md backdrop-blur-sm">
                <Image src="/ace-logo.png" alt="" width={20} height={20} className="rounded opacity-90" />
              </div>
            )}
          </div>
          {portraitFailed && (
            <p className="mt-1.5 max-w-[100px] text-center text-[9px] leading-snug text-zinc-500">
              Custom portrait unavailable — standby illustration.
            </p>
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col justify-center gap-1 sm:pr-2 sm:pt-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-indigo-400/90">
            Your tutor
          </p>
          <div className="flex flex-wrap items-baseline gap-1.5">
            <h2 className="text-lg font-bold tracking-tight text-white">ACE</h2>
            <span className="text-xs text-zinc-500">voice + visuals</span>
          </div>
          <p
            className={`text-xs leading-snug sm:line-clamp-2 ${
              status === "listening" ? "text-teal-200/95" : "text-zinc-400"
            }`}
          >
            {statusCaption(status)}
          </p>

          {status === "listening" && (
            <div className="mt-0.5 flex h-6 items-end gap-0.5 rounded-md border border-teal-800/40 bg-teal-950/25 px-1.5 py-1">
              {Array.from({ length: 8 }).map((_, i) => {
                const h = 4 + normalizedMic * 16 * (0.45 + ((i * 7) % 5) * 0.11);
                return (
                  <span
                    // eslint-disable-next-line react/no-array-index-key
                    key={i}
                    className="w-1 rounded-sm bg-teal-400/80 transition-[height] duration-75"
                    style={{ height: `${h}px` }}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>

      <details className="group relative mt-2 border-t border-zinc-800/70 pt-0">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 py-2 text-[11px] font-semibold text-zinc-500 hover:text-zinc-300 [&::-webkit-details-marker]:hidden">
          <span>Customize portrait</span>
          <span aria-hidden className="text-[10px] text-zinc-600 transition-transform group-open:rotate-180">
            ▼
          </span>
        </summary>
        <div className="pb-1 pt-0.5">
          <label htmlFor="teacher-character-brief" className="sr-only">
            Tutor look (optional)
          </label>
          <p className="mb-2 text-[10px] leading-relaxed text-zinc-600">
            Optional description — Imagen runs only when you tap generate.
          </p>
          <textarea
            id="teacher-character-brief"
            value={characterBrief}
            onChange={(e) =>
              onCharacterBriefChange(e.target.value.slice(0, TEACHER_CHARACTER_INPUT_MAX))
            }
            rows={2}
            disabled={portraitLoading}
            placeholder='e.g. friendly woman in her 40s, navy cardigan'
            className="w-full resize-none rounded-lg border border-zinc-700 bg-zinc-950/80 px-2.5 py-2 text-xs text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
          />
          <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2">
            <span className="text-[10px] tabular-nums text-zinc-600">{len}/{TEACHER_CHARACTER_INPUT_MAX}</span>
            <button
              type="button"
              onClick={onApplyCharacter}
              disabled={portraitLoading}
              className="rounded-md bg-indigo-600 px-3 py-1.5 text-[11px] font-semibold text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {portraitLoading ? "Generating…" : "Generate"}
            </button>
          </div>
        </div>
      </details>
    </section>
  );
}
