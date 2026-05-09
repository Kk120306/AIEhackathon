"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { useVoicePreference } from "../hooks/useVoicePreference";
import { useAnalytics, type SessionRecord, type Subject } from "../hooks/useAnalytics";

type ElevenLabsVoice = { voice_id: string; name: string };

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDuration(ms?: number) {
  if (!ms) return "—";
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  if (m === 0) return `${s}s`;
  return `${m}m ${s}s`;
}

function formatDate(ts: number) {
  const d = new Date(ts);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function timeAgo(ts: number) {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

const SUBJECT_COLORS: Record<Subject, string> = {
  math:       "text-blue-400 bg-blue-950/60 border-blue-800",
  physics:    "text-amber-400 bg-amber-950/60 border-amber-800",
  chemistry:  "text-emerald-400 bg-emerald-950/60 border-emerald-800",
  other:      "text-zinc-400 bg-zinc-900 border-zinc-700",
};

const SUBJECT_BAR: Record<Subject, string> = {
  math:      "bg-blue-500",
  physics:   "bg-amber-500",
  chemistry: "bg-emerald-500",
  other:     "bg-gray-500",
};

const SUBJECT_LABEL: Record<Subject, string> = {
  math:      "Mathematics",
  physics:   "Physics",
  chemistry: "Chemistry",
  other:     "Other",
};

function subjectFromTopic(topic: string): Subject {
  const t = topic.toLowerCase();
  if (/quadratic|graph|function|equation|calculus|algebra|trig|geometry|vector|matrix|stat|probab|math|maths|number/.test(t)) return "math";
  if (/newton|force|motion|wave|energy|momentum|electric|magnetic|circuit|optic|quantum|thermal|physics|kinematics|dynamics/.test(t)) return "physics";
  if (/molecule|bond|reaction|acid|base|electron|periodic|element|compound|equilibrium|organic|chemistry|chatelier|mole|enthalpy/.test(t)) return "chemistry";
  return "other";
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5 flex flex-col gap-1">
      <p className="text-xs uppercase tracking-widest text-zinc-500">{label}</p>
      <p className={`text-3xl font-bold tabular-nums ${accent ?? "text-white"}`}>{value}</p>
      {sub && <p className="text-xs text-zinc-500">{sub}</p>}
    </div>
  );
}

function TopicsBreakdown({ sessions }: { sessions: SessionRecord[] }) {
  const freq = useMemo(() => {
    const map: Record<string, number> = {};
    for (const s of sessions) {
      for (const ex of s.exchanges) {
        if (ex.topic) map[ex.topic] = (map[ex.topic] ?? 0) + 1;
      }
    }
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12);
  }, [sessions]);

  const max = freq[0]?.[1] ?? 1;

  if (freq.length === 0) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
        <SectionHeader label="Topics Covered" />
        <p className="mt-4 text-sm text-zinc-600">No topics recorded yet.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
      <SectionHeader label="Topics Covered" badge={`${freq.length} topics`} />
      <div className="mt-5 space-y-3">
        {freq.map(([topic, count]) => {
          const subj = subjectFromTopic(topic);
          const pct = Math.round((count / max) * 100);
          return (
            <div key={topic}>
              <div className="mb-1 flex items-center justify-between">
                <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${SUBJECT_COLORS[subj]}`}>
                  {topic}
                </span>
                <span className="text-xs tabular-nums text-zinc-500">
                  {count} {count === 1 ? "question" : "questions"}
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-zinc-800">
                <div
                  className={`h-1.5 rounded-full transition-all ${SUBJECT_BAR[subj]}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SubjectMix({ sessions }: { sessions: SessionRecord[] }) {
  const breakdown = useMemo(() => {
    const counts: Record<Subject, number> = { math: 0, physics: 0, chemistry: 0, other: 0 };
    for (const s of sessions) {
      for (const ex of s.exchanges) {
        if (ex.topic) counts[subjectFromTopic(ex.topic)]++;
      }
    }
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    return { counts, total };
  }, [sessions]);

  const { counts, total } = breakdown;
  if (total === 0) return null;

  const subjects: Subject[] = ["math", "physics", "chemistry", "other"];

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
      <SectionHeader label="Subject Mix" />
      <div className="mt-4 flex h-3 w-full overflow-hidden rounded-full">
        {subjects.map((subj) => {
          const pct = total > 0 ? (counts[subj] / total) * 100 : 0;
          if (pct === 0) return null;
          return (
            <div
              key={subj}
              className={`h-full transition-all ${SUBJECT_BAR[subj]}`}
              style={{ width: `${pct}%` }}
            />
          );
        })}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        {subjects.filter((s) => counts[s] > 0).map((subj) => {
          const pct = total > 0 ? Math.round((counts[subj] / total) * 100) : 0;
          return (
            <div key={subj} className="flex items-center gap-2">
              <div className={`h-2.5 w-2.5 rounded-full ${SUBJECT_BAR[subj]}`} />
              <span className="text-xs text-zinc-400">{SUBJECT_LABEL[subj]}</span>
              <span className="ml-auto text-xs tabular-nums font-semibold text-white">{pct}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AccuracyRing({ correct, total }: { correct: number; total: number }) {
  if (total === 0) return null;
  const pct = Math.round((correct / total) * 100);
  const radius = 36;
  const circ = 2 * Math.PI * radius;
  const dash = (pct / 100) * circ;

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
      <SectionHeader label="Answer Accuracy" sub="Where is_correct was tracked" />
      <div className="mt-4 flex items-center gap-6">
        <svg width="100" height="100" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r={radius} fill="none" stroke="#27272a" strokeWidth="10" />
          <circle
            cx="50" cy="50" r={radius}
            fill="none"
            stroke={pct >= 70 ? "#22c55e" : pct >= 40 ? "#f59e0b" : "#ef4444"}
            strokeWidth="10"
            strokeDasharray={`${dash} ${circ - dash}`}
            strokeDashoffset={circ / 4}
            strokeLinecap="round"
          />
          <text x="50" y="55" textAnchor="middle" fill="white" fontSize="18" fontWeight="bold">
            {pct}%
          </text>
        </svg>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span className="text-xs text-zinc-400">Correct</span>
            <span className="ml-auto pl-4 text-xs tabular-nums text-white">{correct}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-red-500" />
            <span className="text-xs text-zinc-400">Incorrect</span>
            <span className="ml-auto pl-4 text-xs tabular-nums text-white">{total - correct}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-zinc-600" />
            <span className="text-xs text-zinc-400">Total</span>
            <span className="ml-auto pl-4 text-xs tabular-nums text-white">{total}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function SessionTimeline({ sessions }: { sessions: SessionRecord[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const recent = sessions.slice(0, 10);

  if (recent.length === 0) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
        <SectionHeader label="Session History" />
        <p className="mt-4 text-sm text-zinc-600">No sessions yet. Start a conversation with ACE!</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
      <SectionHeader label="Session History" badge={`${sessions.length} total`} />
      <div className="mt-5 space-y-3">
        {recent.map((session) => {
          const isOpen = expanded === session.id;
          const topicsRaw = session.exchanges.map((e) => e.topic).filter((t): t is string => Boolean(t));
          const uniqueTopics = topicsRaw.filter((t, i) => topicsRaw.indexOf(t) === i);
          const correctRate = session.correctCount + session.incorrectCount > 0
            ? Math.round((session.correctCount / (session.correctCount + session.incorrectCount)) * 100)
            : null;

          return (
            <div key={session.id} className="rounded-xl border border-zinc-800 overflow-hidden">
              <button
                onClick={() => setExpanded(isOpen ? null : session.id)}
                className="w-full flex items-center gap-3 p-4 text-left hover:bg-zinc-900/60 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-white">
                      {formatDate(session.startTime)}
                    </span>
                    <span className="text-xs text-zinc-500">{formatTime(session.startTime)}</span>
                    <span className="text-xs text-zinc-600">·</span>
                    <span className="text-xs text-zinc-500">{timeAgo(session.startTime)}</span>
                  </div>
                  <div className="mt-1.5 flex items-center gap-3 text-xs text-zinc-400">
                    <span>{session.questionsCount} questions</span>
                    <span className="text-zinc-700">·</span>
                    <span>{formatDuration(session.durationMs)}</span>
                    {correctRate !== null && (
                      <>
                        <span className="text-zinc-700">·</span>
                        <span className={correctRate >= 70 ? "text-emerald-400" : correctRate >= 40 ? "text-amber-400" : "text-red-400"}>
                          {correctRate}% accuracy
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-1 max-w-[180px] justify-end">
                  {uniqueTopics.slice(0, 3).map((t) => (
                    <span
                      key={t}
                      className={`rounded-full border px-2 py-0.5 text-xs ${SUBJECT_COLORS[subjectFromTopic(t)]}`}
                    >
                      {t}
                    </span>
                  ))}
                  {uniqueTopics.length > 3 && (
                    <span className="rounded-full border border-zinc-700 bg-zinc-900 px-2 py-0.5 text-xs text-zinc-500">
                      +{uniqueTopics.length - 3}
                    </span>
                  )}
                </div>
                <span className="ml-2 text-zinc-600 text-xs">{isOpen ? "▲" : "▼"}</span>
              </button>

              {isOpen && (
                <div className="border-t border-zinc-800 divide-y divide-zinc-800/60">
                  {session.exchanges.map((ex, i) => (
                    <div key={i} className="px-4 py-3">
                      <div className="flex items-start gap-2 mb-1.5">
                        <span className="shrink-0 mt-0.5 text-xs font-bold text-indigo-400">Q</span>
                        <p className="text-sm text-zinc-200">{ex.question}</p>
                      </div>
                      <div className="flex items-start gap-2 mb-1.5">
                        <span className="shrink-0 mt-0.5 text-xs font-bold text-emerald-400">A</span>
                        <p className="text-xs text-zinc-400 line-clamp-2">{ex.answer}</p>
                      </div>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {ex.topic && (
                          <span className={`rounded-full border px-2 py-0.5 text-xs ${SUBJECT_COLORS[subjectFromTopic(ex.topic)]}`}>
                            {ex.topic}
                          </span>
                        )}
                        {ex.is_correct === true && (
                          <span className="rounded-full border border-emerald-800 bg-emerald-950/50 px-2 py-0.5 text-xs text-emerald-400">
                            Correct
                          </span>
                        )}
                        {ex.is_correct === false && (
                          <span className="rounded-full border border-red-800 bg-red-950/50 px-2 py-0.5 text-xs text-red-400">
                            Incorrect
                          </span>
                        )}
                        {ex.toolUsed && (
                          <span className="rounded-full border border-indigo-800 bg-indigo-950/50 px-2 py-0.5 text-xs text-indigo-400">
                            {ex.toolUsed.replace(/_/g, " ")}
                          </span>
                        )}
                        <span className="ml-auto text-xs text-zinc-700">{formatTime(ex.timestamp)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ActivityChart({ sessions }: { sessions: SessionRecord[] }) {
  const data = useMemo(() => {
    // Last 7 days
    const days: { label: string; count: number; date: Date }[] = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      days.push({
        label: d.toLocaleDateString("en-GB", { weekday: "short" }),
        date: d,
        count: 0,
      });
    }
    for (const s of sessions) {
      const d = new Date(s.startTime);
      const dayIdx = days.findIndex(
        (day) =>
          day.date.getFullYear() === d.getFullYear() &&
          day.date.getMonth() === d.getMonth() &&
          day.date.getDate() === d.getDate()
      );
      if (dayIdx !== -1) days[dayIdx].count += s.questionsCount;
    }
    return days;
  }, [sessions]);

  const max = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
      <SectionHeader label="Activity This Week" sub="Questions asked per day" />
      <div className="mt-5 flex items-end gap-2 h-24">
        {data.map((day) => {
          const h = day.count === 0 ? 4 : Math.max(8, Math.round((day.count / max) * 88));
          const isToday =
            day.date.toDateString() === new Date().toDateString();
          return (
            <div key={day.label} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-xs tabular-nums text-zinc-500">
                {day.count > 0 ? day.count : ""}
              </span>
              <div className="w-full flex flex-col justify-end" style={{ height: 88 }}>
                <div
                  className={`w-full rounded-t-sm transition-all ${
                    isToday ? "bg-indigo-500" : day.count > 0 ? "bg-zinc-600" : "bg-zinc-800"
                  }`}
                  style={{ height: h }}
                />
              </div>
              <span className={`text-xs ${isToday ? "text-indigo-400 font-semibold" : "text-zinc-600"}`}>
                {day.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SectionHeader({ label, badge, sub }: { label: string; badge?: string; sub?: string }) {
  return (
    <div className="flex items-center gap-2">
      <p className="text-xs uppercase tracking-widest text-zinc-500">{label}</p>
      {badge && (
        <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">{badge}</span>
      )}
      {sub && <p className="text-xs text-zinc-700 ml-auto">{sub}</p>}
    </div>
  );
}

function ComingSoonFeatureBadge() {
  return (
    <span className="shrink-0 rounded-full border border-amber-500/35 bg-amber-950/80 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-400">
      Coming soon
    </span>
  );
}

function ParentalFeatureShell({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4 shadow-[inset_0_0_0_1px_rgba(245,158,11,0.06)]">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-zinc-200">{title}</p>
          {description && <p className="mt-0.5 text-xs text-zinc-500">{description}</p>}
        </div>
        <ComingSoonFeatureBadge />
      </div>
      {children}
    </div>
  );
}

/** Placeholder UI — parental controls ship later; no backend wiring yet. */
function ParentalControlsComingSoon() {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
      <div className="mb-6">
        <p className="text-xs uppercase tracking-widest text-amber-400">Parental controls</p>
        <h2 className="mt-1 text-2xl font-bold text-white">Tutor guidelines and limits</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Planned features for production — each block below shows what you will be able to configure.
        </p>
      </div>

      <div className="space-y-4">
        <ParentalFeatureShell
          title="Custom guidelines for ACE"
          description="Text you add will be merged into the tutor prompt so ACE follows your house rules (tone, level, topics to avoid)."
        >
          <label className="sr-only">Example parent guidelines</label>
          <textarea
            readOnly
            disabled
            rows={4}
            value="Example: Keep explanations under GCSE level. No direct homework answers — hints only. Steer away from video-game chat."
            className="w-full cursor-not-allowed resize-none rounded-lg border border-zinc-800 bg-zinc-900/80 px-3 py-2.5 text-sm text-zinc-300 outline-none disabled:opacity-90"
          />
        </ParentalFeatureShell>

        <ParentalFeatureShell
          title="Daily session time cap"
          description="Limit how long your child can use the tutor each day."
        >
          <div className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900/80 px-3 py-2.5">
            <span className="relative inline-flex h-6 w-11 shrink-0 rounded-full bg-zinc-700 opacity-60" aria-hidden>
              <span className="absolute left-1 top-1 h-4 w-4 rounded-full bg-zinc-500" />
            </span>
            <span className="text-sm text-zinc-400">Enable cap · example: max 45 minutes per day</span>
          </div>
        </ParentalFeatureShell>

        <ParentalFeatureShell
          title="Focus and mode presets"
          description="Quick presets like exam prep or single-subject focus (exact behaviour TBD)."
        >
          <div className="flex flex-wrap gap-2">
            {["Math only", "Block distractions", "Exam mode"].map((chip) => (
              <span
                key={chip}
                className="rounded-lg border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-xs font-medium text-zinc-400"
              >
                {chip}
              </span>
            ))}
          </div>
        </ParentalFeatureShell>

        <ParentalFeatureShell
          title="Stricter topic boundaries"
          description="Reduce off-subject tangents and keep the chat on learning."
        >
          <div className="flex items-center justify-between gap-4 rounded-lg border border-zinc-800 bg-zinc-900/80 px-3 py-3">
            <p className="text-xs text-zinc-500">When on, ACE steers back to academics more aggressively.</p>
            <span className="relative inline-flex h-6 w-11 shrink-0 rounded-full bg-zinc-700 opacity-60" aria-hidden>
              <span className="absolute right-1 top-1 h-4 w-4 rounded-full bg-zinc-500" />
            </span>
          </div>
        </ParentalFeatureShell>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            disabled
            className="rounded-xl border border-zinc-800 bg-zinc-800/50 py-2.5 text-sm font-semibold text-zinc-500 cursor-not-allowed"
          >
            Save parental settings
          </button>
          <div className="flex justify-end sm:justify-start">
            <ComingSoonFeatureBadge />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { voiceId, setVoiceId } = useVoicePreference();
  const { analytics, clearAnalytics } = useAnalytics();
  const [voices, setVoices] = useState<ElevenLabsVoice[]>([]);
  const [voicesLoading, setVoicesLoading] = useState(true);
  const [voicesError, setVoicesError] = useState("");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved">("idle");
  const [tab, setTab] = useState<"analytics" | "settings">("analytics");
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => {
    fetch("/api/voices")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setVoices(data);
        else setVoicesError("Could not load voices.");
      })
      .catch(() => setVoicesError("Could not load voices."))
      .finally(() => setVoicesLoading(false));
  }, []);

  const handleVoiceChange = (id: string) => {
    setVoiceId(id);
    setSaveStatus("saved");
    setTimeout(() => setSaveStatus("idle"), 2000);
  };

  const { sessions, totalQuestions, totalCorrect, totalIncorrect } = analytics;
  const totalSessions = sessions.length;
  const totalTopics = Object.keys(analytics.topicFrequency).length;
  const trackedAnswers = totalCorrect + totalIncorrect;
  const avgQuestionsPerSession =
    totalSessions > 0 ? Math.round(totalQuestions / totalSessions) : 0;

  // Calculate streak (consecutive days with at least one session)
  const streak = useMemo(() => {
    if (sessions.length === 0) return 0;
    const dates = sessions.map((s) => new Date(s.startTime).toDateString());
    const uniqueDates = dates.filter((d, i) => dates.indexOf(d) === i);
    uniqueDates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

    let count = 0;
    const cursor = new Date();
    for (const dateStr of uniqueDates) {
      const d = new Date(dateStr);
      const cursorStr = cursor.toDateString();
      if (d.toDateString() === cursorStr) {
        count++;
        cursor.setDate(cursor.getDate() - 1);
      } else {
        break;
      }
    }
    return count;
  }, [sessions]);

  return (
    <main className="min-h-screen bg-[#09090b] text-white">
      {/* ── Top bar ─────────────────────────────────────────── */}
      <header className="sticky top-0 z-10 border-b border-zinc-800 bg-[#09090b]/90 backdrop-blur-md px-4 py-3.5 sm:px-6">
        <div className="mx-auto max-w-6xl flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <Link href="/" className="flex min-w-0 shrink-0 items-center gap-2.5">
            <Image src="/ace-logo.png" alt="ACE logo" width={28} height={28} className="rounded-lg" />
            <div className="min-w-0 leading-tight">
              <span className="text-sm font-semibold text-white">ACE</span>
              <span className="mt-0.5 block text-xs font-medium text-zinc-500 sm:ml-2 sm:mt-0 sm:inline">
                Parent Dashboard
              </span>
            </div>
          </Link>

          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            {/* Tab switcher */}
            <div className="flex items-center rounded-lg border border-zinc-700 bg-zinc-900 p-1">
              {(["analytics", "settings"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`rounded-md px-4 py-1.5 text-xs font-medium transition-colors capitalize ${
                    tab === t
                      ? "bg-zinc-700 text-white"
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            <Link
              href="/learn"
              className="rounded-lg border border-zinc-700 bg-zinc-900 px-3.5 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:border-zinc-500 hover:text-white whitespace-nowrap"
            >
              ← Back to Tutor
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 space-y-8">

        {/* ── ANALYTICS TAB ───────────────────────────────── */}
        {tab === "analytics" && (
          <>
            {/* Summary stats */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
              <StatCard label="Sessions" value={totalSessions} />
              <StatCard label="Questions Asked" value={totalQuestions} />
              <StatCard label="Topics Learned" value={totalTopics} accent="text-indigo-400" />
              <StatCard label="Avg / Session" value={avgQuestionsPerSession} sub="questions" />
              <StatCard
                label="Accuracy"
                value={trackedAnswers > 0 ? `${Math.round((totalCorrect / trackedAnswers) * 100)}%` : "—"}
                accent={
                  trackedAnswers > 0
                    ? Math.round((totalCorrect / trackedAnswers) * 100) >= 70
                      ? "text-emerald-400"
                      : "text-amber-400"
                    : "text-zinc-500"
                }
              />
              <StatCard label="Day Streak" value={streak > 0 ? streak : "—"} sub={streak > 0 ? "days" : undefined} accent="text-orange-400" />
            </div>

            {/* Charts row */}
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <ActivityChart sessions={sessions} />
              </div>
              <SubjectMix sessions={sessions} />
            </div>

            {/* Topics + accuracy row */}
            <div className="grid gap-6 lg:grid-cols-2">
              <TopicsBreakdown sessions={sessions} />
              {trackedAnswers > 0 ? (
                <AccuracyRing correct={totalCorrect} total={trackedAnswers} />
              ) : (
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
                  <SectionHeader label="Answer Accuracy" />
                  <p className="mt-4 text-sm text-zinc-600">
                    Accuracy tracking kicks in once ACE marks answers as correct or incorrect during practice.
                  </p>
                </div>
              )}
            </div>

            {/* Session history */}
            <SessionTimeline sessions={sessions} />

            {/* Clear data */}
            {sessions.length > 0 && (
              <div className="flex justify-end">
                {confirmClear ? (
                  <div className="flex items-center gap-3 rounded-xl border border-red-800 bg-red-950/30 px-4 py-2">
                    <span className="text-sm text-red-300">Clear all analytics data?</span>
                    <button
                      onClick={() => { clearAnalytics(); setConfirmClear(false); }}
                      className="text-sm font-semibold text-red-400 hover:text-red-300"
                    >
                      Yes, clear
                    </button>
                  <button
                    onClick={() => setConfirmClear(false)}
                    className="text-sm text-zinc-500 hover:text-zinc-300"
                  >
                    Cancel
                  </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmClear(true)}
                    className="text-xs text-zinc-700 hover:text-zinc-500 transition-colors"
                  >
                    Clear analytics data
                  </button>
                )}
              </div>
            )}
          </>
        )}

        {/* ── SETTINGS TAB ────────────────────────────────── */}
        {tab === "settings" && (
          <div className="grid gap-8 lg:grid-cols-[minmax(0,22rem)_1fr] lg:items-start xl:grid-cols-[minmax(0,26rem)_1fr] xl:gap-10">
            <section className="min-w-0 lg:sticky lg:top-20">
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
                <p className="mb-1 text-xs uppercase tracking-widest text-indigo-400">Voice Settings</p>
                <h2 className="mb-1 text-xl font-bold sm:text-2xl">ACE&apos;s Voice</h2>
                <p className="mb-5 text-sm text-zinc-400">
                  Choose how ACE speaks to your child. Changes take effect immediately.
                </p>

                {voicesLoading ? (
                  <p className="text-sm text-zinc-500">Loading voices…</p>
                ) : voicesError ? (
                  <p className="text-sm text-red-400">{voicesError}</p>
                ) : (
                  <select
                    value={voiceId}
                    onChange={(e) => handleVoiceChange(e.target.value)}
                    className="w-full max-w-full cursor-pointer rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-white outline-none focus:border-zinc-500"
                  >
                    {voices.map((v) => (
                      <option key={v.voice_id} value={v.voice_id} className="bg-zinc-900">
                        {v.name}
                      </option>
                    ))}
                  </select>
                )}

                {saveStatus === "saved" && (
                  <p className="mt-3 text-xs text-green-400">Voice preference saved.</p>
                )}

                <VoicePreview voiceId={voiceId} />
              </div>
            </section>

            <section className="min-w-0">
              <ParentalControlsComingSoon />
            </section>
          </div>
        )}
      </div>
    </main>
  );
}

// ── Voice preview ─────────────────────────────────────────────────────────────

function VoicePreview({ voiceId }: { voiceId: string }) {
  const [loading, setLoading] = useState(false);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);

  const handlePreview = async () => {
    if (playing) {
      audio?.pause();
      setPlaying(false);
      return;
    }
    setLoading(true);
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
      a.onended = () => { setPlaying(false); URL.revokeObjectURL(url); };
      a.play();
    } catch {
      // preview failed silently
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handlePreview}
      disabled={loading}
      className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-indigo-700 bg-indigo-950/40 px-4 py-2.5 text-sm font-semibold text-indigo-300 hover:bg-indigo-900/50 disabled:cursor-not-allowed disabled:opacity-50 transition-colors sm:w-auto sm:justify-start"
    >
      {loading ? (
        <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-indigo-400 border-t-transparent" />
      ) : playing ? (
        `Stop preview`
      ) : (
        `Preview voice`
      )}
    </button>
  );
}
