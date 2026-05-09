# Plan: friday-tutor — Voice-First AI Tutor (Next.js 14)

---

## Phase 1 Fix Plan — `lib/` Layer (Backend Track)

### Current Status

| File | Status | Issues |
|---|---|---|
| `lib/openai.ts` | ✅ Done | — |
| `lib/tools.ts` | ❌ Needs fix | Wrong tool names, wrong parameter shapes |
| `lib/prompts.ts` | ⚠️ Needs update | References old tool names |

### What Needs to Change

#### `lib/tools.ts`

Replace all 3 tool definitions to match the agreed spec:

1. **`show_desmos_graph`**
   - `expressions: string[]` (array of LaTeX strings, e.g. `["y=x^2", "y=2x+1"]`)
   - `explanation?: string` (optional narration for the student)
   - Remove: `latex`, `xMin`, `xMax`

2. **`show_molecule_3d`**
   - `molecule_name: string` (was `name`)
   - `smiles?: string` (keep)
   - `pubchem_cid?: string` (replace `pdb` — use PubChem CID for lookup)

3. **`show_steps_breakdown`** (currently missing — `show_force_diagram` exists instead)
   - `steps: string[]` (ordered array of solution steps)
   - `topic?: string` (optional label, e.g. "Quadratic Formula")

#### `lib/prompts.ts`

Update tool name references in the system prompt from:
- `show_desmos_graph`, `show_molecule_3d`, `show_force_diagram` → `show_desmos_graph`, `show_molecule_3d`, `show_steps_breakdown`

Add guidance on when to use `show_steps_breakdown` (worked solutions, multi-step derivations).

### Execution Order

1. Fix `lib/tools.ts` — rewrite all 3 tool definitions
2. Fix `lib/prompts.ts` — update tool name list and add steps guidance
3. Verify TypeScript compiles cleanly (`tsc --noEmit`)

---


## Context

Building a voice-first AI tutoring app for IB/A-Level students in an empty Git repo at `/Users/kaikameyama/repos/AIEhackathon`. The app uses OpenAI GPT-4o with function calling to interpret student questions (spoken) and trigger subject-specific visualizations — Desmos for mathematics, 3Dmol.js for chemistry, and custom SVG/Canvas for physics. The project name is `friday-tutor`.

---

## Architecture Overview

```
Browser (Voice In) → Web Speech API → Convex Action → GPT-4o (function calling)
                                              ↓                   ↓
                                    Convex DB (messages)   Tool call result
                                              ↓                   ↓
                               useQuery (real-time sync)   dispatched client-side to:
                                                           • DesmosPanel    (math)
                                                           • MoleculeViewer (chemistry)
                                                           • Custom SVG     (physics)
                                                           • StepsPanel     (steps)
```

Convex serves as the backend: **actions** call OpenAI, **mutations** persist messages, **queries** stream conversation history to the client in real time. No Next.js API routes needed.

---

## Step-by-Step Implementation

### Step 0 — Create docs folder with implementation plan

Create `AIEhackathon/docs/implementation-plan.md` containing this plan document, so it lives alongside the codebase as a reference.

---

### Step 1 — Scaffold Next.js 14 project + Convex

```bash
cd /Users/kaikameyama/repos/AIEhackathon
npx create-next-app@14 friday-tutor \
  --typescript --tailwind --app --no-src-dir \
  --import-alias "@/*" --eslint
cd friday-tutor
npm install openai convex
npm install --save-dev @types/node
npx convex dev --once   # initializes convex/ dir and links to project
```

> **Note:** The Next.js project lives at `AIEhackathon/friday-tutor/`. All paths below are relative to that root. `npx convex dev` will prompt for a Convex account and create `convex/` automatically.

---

### Step 2 — Create folder structure

```
friday-tutor/
├── app/
│   ├── components/
│   │   ├── VoiceInterface.tsx
│   │   ├── DesmosPanel.tsx
│   │   ├── MoleculeViewer.tsx
│   │   ├── StepsPanel.tsx
│   │   └── TranscriptDisplay.tsx
│   ├── layout.tsx         (wraps with <ConvexProvider>)
│   └── page.tsx           (root page wiring everything together)
├── convex/
│   ├── schema.ts          (DB schema: sessions, messages)
│   ├── messages.ts        (query: listMessages, mutation: addMessage)
│   └── ask.ts             (action: askTutor — calls OpenAI)
├── lib/
│   ├── tools.ts
│   └── prompts.ts
└── .env.local
```

> `lib/openai.ts` is **not needed** — Convex actions import `openai` directly. The OpenAI API key is stored in Convex environment variables (`npx convex env set OPENAI_API_KEY ...`), not `.env.local`.

---

### Step 3 — Environment variables

**.env.local** (Next.js client needs Convex URL):
```env
NEXT_PUBLIC_CONVEX_URL=https://<your-deployment>.convex.cloud
```

**Convex environment** (set via CLI — never exposed to browser):
```bash
npx convex env set OPENAI_API_KEY your_openai_api_key_here
```

---

### Step 4 — `convex/schema.ts`

```ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  sessions: defineTable({
    createdAt: v.number(),
  }),
  messages: defineTable({
    sessionId: v.id("sessions"),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
    toolCall: v.optional(
      v.object({
        name: v.string(),
        args: v.any(),
      })
    ),
    createdAt: v.number(),
  }).index("by_session", ["sessionId", "createdAt"]),
});
```

---

### Step 5 — `convex/messages.ts`

```ts
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const listMessages = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, { sessionId }) =>
    ctx.db
      .query("messages")
      .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
      .collect(),
});

export const addMessage = mutation({
  args: {
    sessionId: v.id("sessions"),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
    toolCall: v.optional(v.object({ name: v.string(), args: v.any() })),
  },
  handler: async (ctx, args) =>
    ctx.db.insert("messages", { ...args, createdAt: Date.now() }),
});

export const createSession = mutation({
  handler: async (ctx) =>
    ctx.db.insert("sessions", { createdAt: Date.now() }),
});
```

---

### Step 6 — `convex/ask.ts` (Convex Action — calls OpenAI)

```ts
import { action } from "./_generated/server";
import { v } from "convex/values";
import OpenAI from "openai";
import { tools } from "../lib/tools";
import { SYSTEM_PROMPT } from "../lib/prompts";
import { api } from "./_generated/api";

export const askTutor = action({
  args: {
    sessionId: v.id("sessions"),
    transcript: v.string(),
    history: v.array(v.any()),
  },
  handler: async (ctx, { sessionId, transcript, history }) => {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    await ctx.runMutation(api.messages.addMessage, {
      sessionId,
      role: "user",
      content: transcript,
    });

    const response = await client.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...history,
        { role: "user", content: transcript },
      ],
      tools,
      tool_choice: "auto",
    });

    const choice = response.choices[0];
    const msg = choice.message;
    const toolCall = msg.tool_calls?.[0] ?? null;

    await ctx.runMutation(api.messages.addMessage, {
      sessionId,
      role: "assistant",
      content: msg.content ?? "",
      toolCall: toolCall
        ? { name: toolCall.function.name, args: JSON.parse(toolCall.function.arguments) }
        : undefined,
    });

    return {
      text: msg.content ?? "",
      toolCall: toolCall
        ? { name: toolCall.function.name, args: JSON.parse(toolCall.function.arguments) }
        : null,
    };
  },
});
```

---

### Step 7 — `lib/prompts.ts`

System prompt for the IB/A-Level tutor persona.

```ts
export const SYSTEM_PROMPT = `
You are Friday, a patient and rigorous AI tutor specializing in IB and A-Level
Mathematics, Physics, and Chemistry. When a student asks a question:
1. Identify the subject and topic.
2. Explain the concept clearly with worked examples.
3. When relevant, call the appropriate visualization tool:
   - plot_function for any mathematical function or graph
   - show_molecule for any chemical structure or molecule
   - draw_physics_diagram for any mechanics, waves, or field diagram
   - show_steps to present a numbered worked solution
Always confirm units, significant figures, and IB/A-Level syllabus scope.
`;
```

---

### Step 8 — `lib/tools.ts`

OpenAI function-calling tool definitions. These are passed to the `/api/ask` route.

```ts
import type { ChatCompletionTool } from "openai/resources/chat";

export const tools: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "plot_function",
      description: "Plot a mathematical function or equation using Desmos.",
      parameters: {
        type: "object",
        properties: {
          latex: {
            type: "string",
            description: "LaTeX expression to plot, e.g. 'y=x^2+3x-2'",
          },
          xMin: { type: "number" },
          xMax: { type: "number" },
        },
        required: ["latex"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "show_molecule",
      description: "Render a 3D molecule using 3Dmol.js.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Common name, e.g. 'ethanol'" },
          smiles: { type: "string", description: "SMILES string if known" },
          pdb: { type: "string", description: "PDB data string if available" },
        },
        required: ["name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "draw_physics_diagram",
      description: "Draw a physics diagram (forces, waves, fields) on canvas.",
      parameters: {
        type: "object",
        properties: {
          type: {
            type: "string",
            enum: ["forces", "waves", "electric_field", "circuit", "projectile"],
          },
          params: {
            type: "object",
            description: "Diagram-specific parameters (masses, angles, amplitudes, etc.)",
          },
        },
        required: ["type"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "show_steps",
      description: "Display a numbered worked solution in the steps panel.",
      parameters: {
        type: "object",
        properties: {
          steps: {
            type: "array",
            items: { type: "string" },
            description: "Ordered array of solution steps in markdown/LaTeX",
          },
          title: { type: "string" },
        },
        required: ["steps"],
      },
    },
  },
];
```

---

### Step 9 — Components

#### `VoiceInterface.tsx`
- Uses the browser **Web Speech API** (`SpeechRecognition`) for real-time STT
- On recognition result, POSTs to `/api/ask` with the transcript
- Exposes a mic button (animated pulse while recording)
- Calls `onResult(data)` prop with the API response
- TypeScript: `declare global { interface Window { SpeechRecognition: ... } }`

#### `TranscriptDisplay.tsx`
- Receives `history: { role, content }[]` prop
- Renders chat bubbles (user right, assistant left) with Tailwind

#### `DesmosPanel.tsx`
- Loads Desmos JS via `next/script` (CDN: `https://www.desmos.com/api/v1.8/calculator.js?apiKey=dcb31709b452b1cf9dc26972add0fda5`)
- `useEffect` initializes `Desmos.GraphingCalculator` on a `div` ref
- Accepts `latex: string`, `xMin?: number`, `xMax?: number` props
- Re-evaluates expression when props change

#### `MoleculeViewer.tsx`
- Loads `3dmol` via CDN script or npm (`npm install 3dmol`)
- `useEffect` creates a `$3Dmol.createViewer()` on a ref div
- Fetches PDB from RCSB or uses SMILES → structure via a free API (e.g., `https://cactus.nci.nih.gov/chemical/structure/{name}/file?format=sdf`)
- Renders stick/sphere model

#### `StepsPanel.tsx`
- Accepts `steps: string[]`, `title?: string`
- Renders numbered list with KaTeX or `dangerouslySetInnerHTML` for LaTeX (install `katex` + `react-katex`)
- Smooth slide-in animation via Tailwind transitions

#### `draw_physics_diagram` (inside `StepsPanel` or separate `PhysicsDiagram.tsx`)
- Canvas-based SVG renderer
- Switch on `type`: render a force body diagram, wave, field lines, etc.
- MVP: handle `forces` and `waves` with simple SVG elements

---

### Step 10 — `app/page.tsx`

Root page wires all components. Uses Convex hooks:
- `useAction(api.ask.askTutor)` to call GPT-4o on voice input
- `useQuery(api.messages.listMessages, { sessionId })` for real-time message sync
- `useMutation(api.messages.createSession)` on first load

```tsx
"use client";
// State: sessionId, activePanel (null | "desmos" | "molecule" | "physics" | "steps"), panelProps
// Layout: two-column — TranscriptDisplay left 40%, visualization panel right 60%
// VoiceInterface floats at bottom
```

---

### Step 11 — `app/layout.tsx`

Wraps the app with `<ConvexProvider>` (required for all Convex hooks). Also adds KaTeX CSS and CDN `<Script>` tags for Desmos and 3Dmol.

---

## Additional Dependencies to Install

```bash
npm install katex react-katex 3dmol
npm install --save-dev @types/katex
```

> Convex is already installed in Step 1. The `convex/` folder is generated by `npx convex dev`.

---

## Verification Plan

1. **Build check:** `npm run build` in `friday-tutor/` — zero TypeScript errors
2. **Convex dev:** `npx convex dev` in parallel with `npm run dev` — Convex dashboard shows schema deployed
3. **Real-time sync:** Open two browser tabs → messages appear in both instantly via `useQuery`
4. **Voice → math:** Tap mic, say "plot y equals x squared" → Desmos panel renders parabola
5. **Voice → chemistry:** Say "show me the structure of ethanol" → 3Dmol viewer renders C2H5OH
6. **Voice → steps:** Say "solve x squared plus 3x minus 2 equals zero" → StepsPanel shows numbered working
7. **Convex action test:** Run `askTutor` directly from the Convex dashboard with a test transcript → verify DB row created
