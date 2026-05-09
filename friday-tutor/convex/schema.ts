// Run `npx convex dev` in friday-tutor/ to initialize the Convex project (requires browser login).
// Then add CONVEX_DEPLOYMENT and NEXT_PUBLIC_CONVEX_URL to .env.local

import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  sessions: defineTable({
    studentName: v.string(),
    startTime:   v.number(),
    endTime:     v.optional(v.number()),
    topics:      v.array(v.string()),
    isActive:    v.boolean(),
  }).index("by_student", ["studentName"])
    .index("by_active",  ["isActive"]),

  messages: defineTable({
    sessionId:  v.id("sessions"),
    role:       v.union(v.literal("user"), v.literal("assistant")),
    content:    v.string(),
    timestamp:  v.number(),
    topicTag:   v.optional(v.string()),
  }).index("by_session", ["sessionId"]),

  progress: defineTable({
    sessionId:       v.id("sessions"),
    topic:           v.string(),
    correctAnswers:  v.number(),
    totalQuestions:  v.number(),
    struggledTopics: v.array(v.string()),
  }).index("by_session",          ["sessionId"])
    .index("by_topic_in_session", ["sessionId", "topic"]),
});
