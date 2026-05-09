import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// ─── Mutations ───────────────────────────────────────────────────────────────

export const startSession = mutation({
  args: { studentName: v.string() },
  handler: async (ctx, { studentName }) => {
    return await ctx.db.insert("sessions", {
      studentName,
      startTime: Date.now(),
      topics: [],
      isActive: true,
    });
  },
});

export const endSession = mutation({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, { sessionId }) => {
    await ctx.db.patch(sessionId, {
      endTime: Date.now(),
      isActive: false,
    });
  },
});

export const addTopicToSession = mutation({
  args: {
    sessionId: v.id("sessions"),
    topic: v.string(),
  },
  handler: async (ctx, { sessionId, topic }) => {
    const session = await ctx.db.get(sessionId);
    if (!session) return;
    if (session.topics.includes(topic)) return;
    await ctx.db.patch(sessionId, {
      topics: [...session.topics, topic],
    });
  },
});

export const saveMessage = mutation({
  args: {
    sessionId: v.id("sessions"),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
    topicTag: v.optional(v.string()),
  },
  handler: async (ctx, { sessionId, role, content, topicTag }) => {
    return await ctx.db.insert("messages", {
      sessionId,
      role,
      content,
      timestamp: Date.now(),
      topicTag,
    });
  },
});

export const upsertProgress = mutation({
  args: {
    sessionId: v.id("sessions"),
    topic: v.string(),
    isCorrect: v.optional(v.boolean()),
  },
  handler: async (ctx, { sessionId, topic, isCorrect }) => {
    const existing = await ctx.db
      .query("progress")
      .withIndex("by_topic_in_session", (q) =>
        q.eq("sessionId", sessionId).eq("topic", topic)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        totalQuestions: existing.totalQuestions + 1,
        correctAnswers:
          isCorrect === true
            ? existing.correctAnswers + 1
            : existing.correctAnswers,
      });
    } else {
      await ctx.db.insert("progress", {
        sessionId,
        topic,
        totalQuestions: 1,
        correctAnswers: isCorrect === true ? 1 : 0,
        struggledTopics: [],
      });
    }
  },
});

// ─── Queries ─────────────────────────────────────────────────────────────────

export const getAllSessions = query({
  args: { studentName: v.string() },
  handler: async (ctx, { studentName }) => {
    return await ctx.db
      .query("sessions")
      .withIndex("by_student", (q) => q.eq("studentName", studentName))
      .order("desc")
      .collect();
  },
});

export const getActiveSessions = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("sessions")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();
  },
});

export const getSessionMessages = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, { sessionId }) => {
    return await ctx.db
      .query("messages")
      .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
      .order("asc")
      .collect();
  },
});

export const getSessionProgress = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, { sessionId }) => {
    return await ctx.db
      .query("progress")
      .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
      .collect();
  },
});

export const getAggregatedProgress = query({
  args: { studentName: v.string() },
  handler: async (ctx, { studentName }) => {
    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_student", (q) => q.eq("studentName", studentName))
      .collect();

    const sessionIds = new Set(sessions.map((s) => s._id));

    // Collect all progress rows across every session for this student
    const allProgress: Array<{
      topic: string;
      correctAnswers: number;
      totalQuestions: number;
      struggledTopics: string[];
    }> = [];

    for (const sessionId of sessionIds) {
      const rows = await ctx.db
        .query("progress")
        .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
        .collect();
      allProgress.push(...rows);
    }

    // Group by topic
    const grouped = new Map<
      string,
      { correctAnswers: number; totalQuestions: number; struggledTopics: Set<string> }
    >();

    for (const row of allProgress) {
      const existing = grouped.get(row.topic);
      if (existing) {
        existing.correctAnswers += row.correctAnswers;
        existing.totalQuestions += row.totalQuestions;
        row.struggledTopics.forEach((t) => existing.struggledTopics.add(t));
      } else {
        grouped.set(row.topic, {
          correctAnswers: row.correctAnswers,
          totalQuestions: row.totalQuestions,
          struggledTopics: new Set(row.struggledTopics),
        });
      }
    }

    return Array.from(grouped.entries()).map(([topic, data]) => ({
      topic,
      accuracy:
        data.totalQuestions > 0
          ? data.correctAnswers / data.totalQuestions
          : null,
      totalQuestions: data.totalQuestions,
      struggledTopics: Array.from(data.struggledTopics),
    }));
  },
});
