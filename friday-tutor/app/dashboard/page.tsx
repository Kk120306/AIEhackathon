"use client";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState } from "react";
import Link from "next/link";
import SessionList from "./components/SessionList";
import MetricsSection from "./components/MetricsSection";
import StruggleAreas from "./components/StruggleAreas";
import type { Session, Message, AggregatedTopicProgress } from "./types";

export default function DashboardPage() {
  const studentName =
    typeof window !== "undefined"
      ? (new URLSearchParams(window.location.search).get("student") ?? "Student")
      : "Student";

  const rawSessions      = useQuery(api.sessions.getAllSessions, { studentName }) ?? [];
  const rawActiveSessions = useQuery(api.sessions.getActiveSessions, {}) ?? [];
  const rawAggProgress   = useQuery(api.sessions.getAggregatedProgress, { studentName }) ?? [];

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const effectiveSelectedId: string | null =
    selectedId ?? (rawSessions[0]?._id as string) ?? null;

  const rawMessages = useQuery(
    api.sessions.getSessionMessages,
    effectiveSelectedId
      ? { sessionId: effectiveSelectedId as any }
      : "skip"
  ) ?? [];

  // Normalize Convex documents to local types
  const sessions: Session[] = rawSessions.map((s) => ({
    _id: s._id as string,
    studentName: s.studentName,
    startTime: s.startTime,
    endTime: s.endTime,
    topics: s.topics,
    isActive: s.isActive,
  }));

  const activeSessions: Session[] = rawActiveSessions.map((s) => ({
    _id: s._id as string,
    studentName: s.studentName,
    startTime: s.startTime,
    endTime: s.endTime,
    topics: s.topics,
    isActive: s.isActive,
  }));

  // Scale accuracy from 0–1 fraction → 0–100 percent for MetricsSection display
  const aggProgress: AggregatedTopicProgress[] = rawAggProgress.map((p) => ({
    topic: p.topic,
    accuracy: p.accuracy !== null ? Math.round(p.accuracy * 100) : null,
    totalQuestions: p.totalQuestions,
    struggledTopics: p.struggledTopics,
  }));

  const messages: Message[] = rawMessages.map((m) => ({
    _id: m._id as string,
    sessionId: m.sessionId as string,
    role: m.role,
    content: m.content,
    timestamp: m.timestamp,
    topicTag: m.topicTag,
  }));

  return (
    <main className="min-h-screen bg-black text-white p-6">
      {/* Header */}
      <section className="mb-8 flex items-start justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-purple-400">
            Parents Dashboard
          </p>
          <h1 className="mt-2 text-4xl font-bold">Monitoring {studentName}</h1>
          <p className="mt-2 text-sm text-gray-400">
            Real-time view of tutoring sessions, progress, and struggle areas.
          </p>
        </div>
        <Link
          href="/"
          className="rounded-xl border border-gray-700 bg-gray-900 px-4 py-2 text-sm text-gray-300 hover:border-gray-500 hover:text-white transition-colors"
        >
          ← Back to Tutor
        </Link>
      </section>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[300px_1fr]">
        {/* LEFT: Session list */}
        <div>
          <p className="mb-3 text-xs uppercase tracking-widest text-gray-500">
            Sessions
          </p>
          <SessionList
            sessions={sessions}
            selectedId={effectiveSelectedId}
            activeSessions={activeSessions}
            onSelect={setSelectedId}
          />
        </div>

        {/* RIGHT: Metrics + Struggle Areas + Activity Feed */}
        <div className="flex flex-col gap-6">
          <div>
            <p className="mb-3 text-xs uppercase tracking-widest text-gray-500">
              Progress
            </p>
            <MetricsSection progress={aggProgress} />
          </div>

          <div>
            <p className="mb-3 text-xs uppercase tracking-widest text-gray-500">
              Struggle Areas
            </p>
            <StruggleAreas progress={aggProgress} />
          </div>

          <div>
            <p className="mb-3 text-xs uppercase tracking-widest text-gray-500">
              Activity Feed
            </p>
            <div className="rounded-2xl border border-gray-800 bg-gray-950 p-4 flex flex-col gap-3 max-h-96 overflow-y-auto">
              {messages.length === 0 ? (
                <p className="text-sm text-gray-500">
                  {effectiveSelectedId
                    ? "No messages in this session."
                    : "Select a session to view messages."}
                </p>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg._id}
                    className={`flex gap-3 ${msg.role === "assistant" ? "flex-row" : "flex-row-reverse"}`}
                  >
                    <div
                      className={`rounded-xl px-4 py-2 text-sm max-w-[80%] ${
                        msg.role === "assistant"
                          ? "bg-gray-800 text-gray-200"
                          : "bg-green-900/40 text-green-100"
                      }`}
                    >
                      <p>{msg.content}</p>
                      {msg.topicTag && (
                        <span className="mt-1 inline-block rounded bg-gray-700 px-2 py-0.5 text-xs text-gray-400">
                          {msg.topicTag}
                        </span>
                      )}
                      <p className="mt-1 text-xs text-gray-500">
                        {new Date(msg.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
