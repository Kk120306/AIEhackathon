// Shared contracts between Convex, frontend, and integration agents
// Source of truth — all agents must import/reference these shapes

/**
 * What the Gemini tutor now returns (extended from original AskTutorResult).
 *
 * MIGRATION NOTE: The existing TutorResponse in app/page.tsx and
 * AskTutorResult in lib/askTutor.ts currently lack `topic` and `is_correct`.
 * Both must be updated to match this shape before Convex integration is wired.
 */
export type TutorResponse = {
  spoken_answer: string;
  tool_call?: {
    name: string;
    args: Record<string, unknown>;
  };
  topic?: string;       // e.g. "Quadratic Equations" — always present if Gemini detects a subject
  is_correct?: boolean; // present only when student attempted an answer; undefined = explanatory turn
};

/** One conversation turn stored per session */
export type SessionTurn = {
  timestamp: number;    // Unix ms
  question: string;     // student's question
  answer: string;       // Friday's spoken_answer
  topic?: string;
  is_correct?: boolean;
};

/**
 * Convex sessions table row shape (as returned by queries).
 *
 * NOTE: Convex returns rows with `_id` typed as `Id<"sessions">` (a branded
 * string subtype). This interface uses `string` for portability in non-Convex
 * contexts (e.g. dashboard components, unit tests). When passing `_id` back
 * into Convex mutations/queries you must cast: `sessionId as Id<"sessions">`.
 */
export type Session = {
  _id: string;          // Convex document ID
  studentName: string;
  startTime: number;    // Unix ms
  endTime?: number;     // Unix ms; undefined while session is active
  topics: string[];
  isActive: boolean;
};

/**
 * Convex messages table row shape.
 *
 * NOTE: Same Id<> caveat as Session._id above applies to both _id and sessionId.
 */
export type Message = {
  _id: string;
  sessionId: string;    // references sessions._id
  role: "user" | "assistant";
  content: string;
  timestamp: number;    // Unix ms
  topicTag?: string;
};

/**
 * Convex progress table row shape.
 * One row per (session × topic) pair.
 */
export type Progress = {
  _id: string;
  sessionId: string;    // references sessions._id
  topic: string;
  correctAnswers: number;
  totalQuestions: number;
  struggledTopics: string[];
};

/**
 * Aggregated across all sessions for a student — returned by getAggregatedProgress.
 * `accuracy` is null when no Q&A turns have been recorded for the topic yet.
 */
export type AggregatedTopicProgress = {
  topic: string;
  accuracy: number | null; // 0–100, null if no Q&A turns
  totalQuestions: number;
  struggledTopics: string[];
};
