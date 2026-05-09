"use client";

import { useState, useEffect, useCallback, useRef } from "react";

// ── Types ────────────────────────────────────────────────────────────────────

export type Subject = "math" | "physics" | "chemistry" | "other";

export type Exchange = {
  question: string;
  answer: string;
  topic?: string;
  is_correct?: boolean;
  toolUsed?: string;
  timestamp: number;
};

export type SessionRecord = {
  id: string;
  startTime: number;
  endTime?: number;
  durationMs?: number;
  questionsCount: number;
  correctCount: number;
  incorrectCount: number;
  topics: string[];
  exchanges: Exchange[];
};

export type AnalyticsData = {
  sessions: SessionRecord[];
  topicFrequency: Record<string, number>;
  totalQuestions: number;
  totalCorrect: number;
  totalIncorrect: number;
};

const STORAGE_KEY = "friday_tutor_analytics";
const MAX_SESSIONS = 50;

function guessSubject(topic?: string): Subject {
  if (!topic) return "other";
  const t = topic.toLowerCase();
  if (
    t.includes("quadratic") || t.includes("graph") || t.includes("function") ||
    t.includes("equation") || t.includes("calculus") || t.includes("algebra") ||
    t.includes("trigonometry") || t.includes("geometry") || t.includes("vector") ||
    t.includes("matrix") || t.includes("statistic") || t.includes("probability") ||
    t.includes("math") || t.includes("maths") || t.includes("number")
  ) return "math";
  if (
    t.includes("newton") || t.includes("force") || t.includes("motion") ||
    t.includes("wave") || t.includes("energy") || t.includes("momentum") ||
    t.includes("electric") || t.includes("magnetic") || t.includes("circuit") ||
    t.includes("optic") || t.includes("quantum") || t.includes("thermal") ||
    t.includes("physics") || t.includes("kinematics") || t.includes("dynamics")
  ) return "physics";
  if (
    t.includes("molecule") || t.includes("bond") || t.includes("reaction") ||
    t.includes("acid") || t.includes("base") || t.includes("electron") ||
    t.includes("periodic") || t.includes("element") || t.includes("compound") ||
    t.includes("equilibrium") || t.includes("organic") || t.includes("chemistry") ||
    t.includes("chatelier") || t.includes("mole") || t.includes("enthalpy")
  ) return "chemistry";
  return "other";
}

function emptyAnalytics(): AnalyticsData {
  return { sessions: [], topicFrequency: {}, totalQuestions: 0, totalCorrect: 0, totalIncorrect: 0 };
}

function loadFromStorage(): AnalyticsData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyAnalytics();
    return JSON.parse(raw) as AnalyticsData;
  } catch {
    return emptyAnalytics();
  }
}

function saveToStorage(data: AnalyticsData) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // storage quota — silently skip
  }
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useAnalytics() {
  const [analytics, setAnalytics] = useState<AnalyticsData>(emptyAnalytics);
  const activeSessionIdRef = useRef<string | null>(null);

  useEffect(() => {
    setAnalytics(loadFromStorage());
  }, []);

  const persist = useCallback((updater: (prev: AnalyticsData) => AnalyticsData) => {
    setAnalytics((prev) => {
      const next = updater(prev);
      saveToStorage(next);
      return next;
    });
  }, []);

  const startSession = useCallback(() => {
    const id = `session_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    activeSessionIdRef.current = id;

    const newSession: SessionRecord = {
      id,
      startTime: Date.now(),
      questionsCount: 0,
      correctCount: 0,
      incorrectCount: 0,
      topics: [],
      exchanges: [],
    };

    persist((prev) => ({
      ...prev,
      sessions: [newSession, ...prev.sessions].slice(0, MAX_SESSIONS),
    }));

    return id;
  }, [persist]);

  const recordExchange = useCallback(
    (exchange: Omit<Exchange, "timestamp">) => {
      const sessionId = activeSessionIdRef.current;
      if (!sessionId) return;

      const entry: Exchange = { ...exchange, timestamp: Date.now() };

      persist((prev) => {
        const sessions = prev.sessions.map((s) => {
          if (s.id !== sessionId) return s;
          const topics = exchange.topic && !s.topics.includes(exchange.topic)
            ? [...s.topics, exchange.topic]
            : s.topics;
          return {
            ...s,
            questionsCount: s.questionsCount + 1,
            correctCount: exchange.is_correct === true ? s.correctCount + 1 : s.correctCount,
            incorrectCount: exchange.is_correct === false ? s.incorrectCount + 1 : s.incorrectCount,
            topics,
            exchanges: [...s.exchanges, entry],
          };
        });

        const topicFrequency = exchange.topic
          ? { ...prev.topicFrequency, [exchange.topic]: (prev.topicFrequency[exchange.topic] ?? 0) + 1 }
          : prev.topicFrequency;

        return {
          sessions,
          topicFrequency,
          totalQuestions: prev.totalQuestions + 1,
          totalCorrect: exchange.is_correct === true ? prev.totalCorrect + 1 : prev.totalCorrect,
          totalIncorrect: exchange.is_correct === false ? prev.totalIncorrect + 1 : prev.totalIncorrect,
        };
      });
    },
    [persist]
  );

  const endSession = useCallback(() => {
    const sessionId = activeSessionIdRef.current;
    if (!sessionId) return;
    const endTime = Date.now();

    persist((prev) => ({
      ...prev,
      sessions: prev.sessions.map((s) =>
        s.id === sessionId
          ? { ...s, endTime, durationMs: endTime - s.startTime }
          : s
      ),
    }));

    activeSessionIdRef.current = null;
  }, [persist]);

  const clearAnalytics = useCallback(() => {
    const empty = emptyAnalytics();
    saveToStorage(empty);
    setAnalytics(empty);
    activeSessionIdRef.current = null;
  }, []);

  return {
    analytics,
    activeSessionId: activeSessionIdRef.current,
    startSession,
    recordExchange,
    endSession,
    clearAnalytics,
    guessSubject,
  };
}
