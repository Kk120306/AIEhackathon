# Parent Dashboard – Implementation Plan

## Overview

Add a real-time parent-facing analytics dashboard at `/app/dashboard/page.tsx` that pulls tutoring session data from a Convex backend. Parents can monitor live and historical sessions, see accuracy metrics, identify struggle areas, and review a recent-activity feed.

---

## 1. Current Architecture (context)

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| AI / tutor | Google Gemini 2.5-flash via `lib/askTutor.ts` |
| API routes | `POST /api/ask`, `POST /api/transcribe` |
| Database | **None yet** – adding Convex |
| Styling | Tailwind CSS |

The main session loop lives in `app/page.tsx`:
- User speaks → `MicButton` transcribes → `/api/ask` → Gemini returns `{ spoken_answer, tool_call? }` → conversation history stored in React state only (no persistence today).

---

## 2. Convex Setup

### 2.1 Install & init

```bash
cd friday-tutor
npm install convex
npx convex dev           # creates convex/ folder, .env.local CONVEX_DEPLOYMENT
```

Set `CONVEX_DEPLOYMENT` and `NEXT_PUBLIC_CONVEX_URL` in `.env.local`.

### 2.2 ConvexProvider wrapper

Wrap the root layout (`app/layout.tsx`) with `<ConvexProvider client={convex}>` so all pages can use Convex hooks.

```tsx
// app/layout.tsx  (addition)
import { ConvexProvider, ConvexReactClient } from "convex/react";
const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <ConvexProvider client={convex}>{children}</ConvexProvider>
      </body>
    </html>
  );
}
```

---

## 3. Convex Schema

File: `convex/schema.ts`

```ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  sessions: defineTable({
    studentName: v.string(),
    startTime:   v.number(),          // Unix ms
    endTime:     v.optional(v.number()),
    topics:      v.array(v.string()), // e.g. ["Algebra", "Quadratics"]
    isActive:    v.boolean(),
  }).index("by_student", ["studentName"])
    .index("by_active",  ["isActive"]),

  messages: defineTable({
    sessionId:  v.id("sessions"),
    role:       v.union(v.literal("user"), v.literal("assistant")),
    content:    v.string(),
    timestamp:  v.number(),           // Unix ms
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
```

### Field notes

| Table | Key design decisions |
|---|---|
| `sessions` | `isActive` flag lets the dashboard subscribe only to live sessions in real time. `topics[]` is accumulated as the tutor detects subject changes. |
| `messages` | Mirrors the `conversationHistory` array in React state; `topicTag` is set by the backend when a topic switch is detected. |
| `progress` | One row per `(session, topic)` pair so accuracy can be tracked per-subject across multiple sessions. `struggledTopics[]` holds sub-concepts where accuracy < 60 %. |

---

## 4. Convex Functions

### 4.1 Mutations (`convex/sessions.ts`)

#### `startSession`
Called at the start of a tutoring session (when the student first asks a question).

```ts
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
```

#### `endSession`
Called when the tab closes or the student explicitly ends the session.

```ts
export const endSession = mutation({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, { sessionId }) => {
    await ctx.db.patch(sessionId, {
      endTime: Date.now(),
      isActive: false,
    });
  },
});
```

#### `addTopicToSession`
Appends a newly detected topic to `sessions.topics` (deduplicates).

```ts
export const addTopicToSession = mutation({
  args: { sessionId: v.id("sessions"), topic: v.string() },
  handler: async (ctx, { sessionId, topic }) => {
    const session = await ctx.db.get(sessionId);
    if (!session || session.topics.includes(topic)) return;
    await ctx.db.patch(sessionId, { topics: [...session.topics, topic] });
  },
});
```

#### `saveMessage`
Persists each conversation turn (user + assistant) after `/api/ask` returns.

```ts
export const saveMessage = mutation({
  args: {
    sessionId: v.id("sessions"),
    role:      v.union(v.literal("user"), v.literal("assistant")),
    content:   v.string(),
    topicTag:  v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("messages", { ...args, timestamp: Date.now() });
  },
});
```

#### `upsertProgress`
Increments answer counters and updates struggled topics.

```ts
export const upsertProgress = mutation({
  args: {
    sessionId:       v.id("sessions"),
    topic:           v.string(),
    isCorrect:       v.boolean(),
    struggledTopics: v.array(v.string()),
  },
  handler: async (ctx, { sessionId, topic, isCorrect, struggledTopics }) => {
    const existing = await ctx.db
      .query("progress")
      .withIndex("by_topic_in_session", (q) =>
        q.eq("sessionId", sessionId).eq("topic", topic)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        correctAnswers:  existing.correctAnswers + (isCorrect ? 1 : 0),
        totalQuestions:  existing.totalQuestions + 1,
        struggledTopics: [...new Set([...existing.struggledTopics, ...struggledTopics])],
      });
    } else {
      await ctx.db.insert("progress", {
        sessionId,
        topic,
        correctAnswers:  isCorrect ? 1 : 0,
        totalQuestions:  1,
        struggledTopics,
      });
    }
  },
});
```

### 4.2 Queries (`convex/sessions.ts`)

#### `getAllSessions`
Returns all sessions for a student, sorted newest-first.

```ts
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
```

#### `getActiveSessions`
Returns currently active sessions (for real-time monitoring).

```ts
export const getActiveSessions = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("sessions")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();
  },
});
```

#### `getSessionMessages`
Returns all messages for a session in chronological order.

```ts
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
```

#### `getSessionProgress`
Returns per-topic progress rows for a session.

```ts
export const getSessionProgress = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, { sessionId }) => {
    return await ctx.db
      .query("progress")
      .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
      .collect();
  },
});
```

#### `getAggregatedProgress` (computed)
Returns aggregated accuracy per topic across ALL sessions for a student, suitable for the dashboard charts.

```ts
export const getAggregatedProgress = query({
  args: { studentName: v.string() },
  handler: async (ctx, { studentName }) => {
    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_student", (q) => q.eq("studentName", studentName))
      .collect();

    const sessionIds = new Set(sessions.map((s) => s._id));
    const allProgress = await ctx.db.query("progress").collect();

    // Filter to this student, group by topic
    const byTopic: Record<string, { correct: number; total: number; struggled: string[] }> = {};
    for (const row of allProgress) {
      if (!sessionIds.has(row.sessionId)) continue;
      if (!byTopic[row.topic]) byTopic[row.topic] = { correct: 0, total: 0, struggled: [] };
      byTopic[row.topic].correct += row.correctAnswers;
      byTopic[row.topic].total  += row.totalQuestions;
      byTopic[row.topic].struggled = [
        ...new Set([...byTopic[row.topic].struggled, ...row.struggledTopics]),
      ];
    }

    return Object.entries(byTopic).map(([topic, data]) => ({
      topic,
      accuracy: data.total > 0 ? Math.round((data.correct / data.total) * 100) : null,
      totalQuestions: data.total,
      struggledTopics: data.struggled,
    }));
  },
});
```

---

## 5. Integration: Tutoring Session → Convex

### 5.1 Session lifecycle hooks in `app/page.tsx`

Add four Convex mutations via `useMutation`:

```tsx
const startSessionMutation   = useMutation(api.sessions.startSession);
const endSessionMutation     = useMutation(api.sessions.endSession);
const saveMessageMutation    = useMutation(api.sessions.saveMessage);
const upsertProgressMutation = useMutation(api.sessions.upsertProgress);
```

**On first question asked** (inside `askBackend`, before the fetch):
```ts
if (!sessionId) {
  const id = await startSessionMutation({ studentName: "Student" }); // or from auth
  setSessionId(id);
}
```

**After `/api/ask` returns** (inside `askBackend`):
```ts
await saveMessageMutation({ sessionId, role: "user",      content: message });
await saveMessageMutation({ sessionId, role: "assistant", content: nextResponse.spoken_answer, topicTag: nextResponse.topic });
```

**On window unload / explicit end**:
```ts
useEffect(() => {
  const handleUnload = () => { if (sessionId) endSessionMutation({ sessionId }); };
  window.addEventListener("beforeunload", handleUnload);
  return () => window.removeEventListener("beforeunload", handleUnload);
}, [sessionId]);
```

### 5.2 Topic detection (optional enhancement)

The Gemini response can be extended with a `topic` field via a short classification step in `lib/askTutor.ts` or via a Convex action that calls Gemini:

```ts
// In lib/askTutor.ts – add to returned shape
topic?: string;   // e.g. "Quadratic Equations"
```

Add a system instruction instructing Gemini to always include the subject area in its JSON response.

### 5.3 Progress detection

When Gemini's response includes structured feedback (e.g. `"correct": true` from a function call or pattern-matched text), call `upsertProgress` with the topic and correctness flag. This can also be done in a **Convex action** (server-side) to avoid client-side logic.

---

## 6. Dashboard: `app/dashboard/page.tsx`

### 6.1 Page layout

```
┌─────────────────────────────────────────────────────┐
│  Friday Tutor – Parent Dashboard        [Student ▾] │
├──────────────┬──────────────────────────────────────┤
│              │  Learning Metrics                     │
│  Session     │  ┌──────────┐  ┌──────────────────┐  │
│  List        │  │ Accuracy │  │  Time per Topic  │  │
│              │  │  chart   │  │      chart       │  │
│  • Today 4m  │  └──────────┘  └──────────────────┘  │
│  • Wed  12m  ├──────────────────────────────────────┤
│  • Tue  8m   │  Struggle Areas          (red cards) │
│              │  ┌───────────┐  ┌───────────┐        │
│              │  │ Quadratics│  │  Vectors  │        │
│              │  └───────────┘  └───────────┘        │
│              ├──────────────────────────────────────┤
│              │  Recent Activity Feed                │
│              │  ✦ [Today 14:02] Asked about limits  │
│              │  ✦ [Today 13:58] Answered correctly…│
└──────────────┴──────────────────────────────────────┘
```

### 6.2 Component breakdown

| Component | File | Responsibility |
|---|---|---|
| `DashboardPage` | `app/dashboard/page.tsx` | Data fetching orchestration, layout |
| `SessionList` | `app/dashboard/components/SessionList.tsx` | Left-rail list; click to drill in |
| `MetricsSection` | `app/dashboard/components/MetricsSection.tsx` | Accuracy + time-per-topic charts |
| `StruggleAreas` | `app/dashboard/components/StruggleAreas.tsx` | Red-highlighted weak topics |
| `ActivityFeed` | `app/dashboard/components/ActivityFeed.tsx` | Chronological message feed |
| `LiveBadge` | `app/dashboard/components/LiveBadge.tsx` | Pulsing "LIVE" indicator for active sessions |

### 6.3 Data wiring (Convex subscriptions = `useQuery`)

`useQuery` in Convex is **reactive** — the component re-renders whenever the underlying data changes, giving real-time updates with zero polling code.

```tsx
// app/dashboard/page.tsx
"use client";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export default function DashboardPage() {
  const studentName = "Student"; // later: from auth / URL param
  const sessions    = useQuery(api.sessions.getAllSessions,   { studentName });
  const active      = useQuery(api.sessions.getActiveSessions, {});
  const aggProgress = useQuery(api.sessions.getAggregatedProgress, { studentName });

  const [selectedSession, setSelectedSession] = useState(sessions?.[0]?._id ?? null);
  const messages = useQuery(
    api.sessions.getSessionMessages,
    selectedSession ? { sessionId: selectedSession } : "skip"
  );
  const progress = useQuery(
    api.sessions.getSessionProgress,
    selectedSession ? { sessionId: selectedSession } : "skip"
  );
  // ...
}
```

### 6.4 Charts (no heavy library dependency)

Use **inline SVG** or lightweight **recharts** (already Tailwind-compatible):

```bash
npm install recharts
```

- **Accuracy bar chart** – `BarChart` from recharts, one bar per topic, fill red if < 60 %, green if ≥ 80 %.
- **Time per topic** – `PieChart` / `RadialBarChart` – time derived from message timestamps grouped by `topicTag`.

### 6.5 Struggle-area cards

```tsx
const struggles = aggProgress
  ?.filter((p) => p.accuracy !== null && p.accuracy < 60)
  ?? [];

<div className="grid grid-cols-2 gap-3">
  {struggles.map((s) => (
    <div key={s.topic} className="rounded-xl border border-red-300 bg-red-50 p-4">
      <p className="font-semibold text-red-700">{s.topic}</p>
      <p className="text-sm text-red-500">{s.accuracy}% accuracy</p>
      {s.struggledTopics.map((t) => (
        <span key={t} className="mt-1 inline-block rounded bg-red-100 px-2 py-0.5 text-xs text-red-600">
          {t}
        </span>
      ))}
    </div>
  ))}
</div>
```

### 6.6 Recent Activity Feed

Pulls `messages` for the selected session (or the latest session) and renders each turn with a timestamp, avatar, and condensed content preview. Assistant turns > 200 chars are truncated with "read more".

---

## 7. Real-time Active Session Monitoring

When `active.length > 0`, the dashboard shows a **"LIVE" banner** at the top. Clicking it selects the active session and subscribes to its `messages` in real time via `useQuery`. Because Convex queries are reactive, every new message the student sends (via `saveMessage` mutation from `app/page.tsx`) will appear in the parent's feed within milliseconds.

```tsx
{active?.map((s) => (
  <div key={s._id} className="flex items-center gap-2 rounded-full bg-green-100 px-3 py-1">
    <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
    <span className="text-sm font-medium text-green-700">Live session – {s.studentName}</span>
    <button onClick={() => setSelectedSession(s._id)}>Watch</button>
  </div>
))}
```

---

## 8. File Checklist

```
friday-tutor/
├── convex/
│   ├── schema.ts               ← new: 3 tables
│   ├── sessions.ts             ← new: mutations + queries
│   └── _generated/             ← auto-generated by npx convex dev
├── app/
│   ├── layout.tsx              ← modify: add ConvexProvider
│   ├── page.tsx                ← modify: call mutations during session lifecycle
│   └── dashboard/
│       ├── page.tsx            ← new: dashboard root
│       └── components/
│           ├── SessionList.tsx
│           ├── MetricsSection.tsx
│           ├── StruggleAreas.tsx
│           ├── ActivityFeed.tsx
│           └── LiveBadge.tsx
└── .env.local                  ← add: CONVEX_DEPLOYMENT, NEXT_PUBLIC_CONVEX_URL
```

---

## 9. Implementation Order

1. **Convex init** – run `npx convex dev`, add provider to `layout.tsx`, verify env vars.
2. **Schema** – write `convex/schema.ts`; run `npx convex dev` to push and generate types.
3. **Mutations** – implement `startSession`, `endSession`, `saveMessage`, `upsertProgress`.
4. **Queries** – implement `getAllSessions`, `getActiveSessions`, `getSessionMessages`, `getSessionProgress`, `getAggregatedProgress`.
5. **Session integration** – wire mutations into `app/page.tsx` session lifecycle.
6. **Dashboard scaffold** – `app/dashboard/page.tsx` with `useQuery` hooks and layout.
7. **Components** – `SessionList`, `MetricsSection`, `StruggleAreas`, `ActivityFeed`, `LiveBadge`.
8. **Charts** – install recharts, build `MetricsSection` with accuracy + time-per-topic.
9. **Polish** – loading skeletons, empty states, mobile-responsive layout.
10. **Test real-time** – open dashboard in one tab, run a tutoring session in another, verify live updates.

---

## 10. Open Questions / Decisions

| Question | Options | Recommendation |
|---|---|---|
| Student identity | hardcoded name / URL param / auth | Start with URL param `?student=...`, add NextAuth later |
| Topic detection | client regex / Gemini JSON field / Convex action | Extend Gemini response with `topic` field (minimal change) |
| Progress correctness signal | explicit Gemini field / heuristic / manual parent flag | Add `"is_correct": boolean` to tutor response JSON; fall back to null |
| Multi-student support | single student for now | Schema already supports multiple students via `by_student` index |
| Auth for dashboard | none for hackathon | Simple password gate via middleware is fine for demo |
