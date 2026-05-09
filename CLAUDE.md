# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository layout

```
AIEhackathon/
├── friday-tutor/   # Next.js 14 app — the entire product lives here
│   ├── app/        # Next.js App Router pages, API routes, components
│   ├── convex/     # Convex backend (schema + mutations/queries)
│   └── lib/        # Shared server-side logic (Gemini client, tools, prompts)
└── docs/           # Planning docs (not code — for human reference)
```

All development commands must be run from `friday-tutor/`.

## Dev commands

```bash
cd friday-tutor

npm run dev      # Start Next.js on http://localhost:3000
npm run build    # Production build
npm run lint     # ESLint via next lint

# Convex (required for the parent dashboard)
npx convex dev   # Start Convex dev server — browser login required on first run
```

There is no test suite yet.

## Environment setup

Copy `friday-tutor/.env.example` to `friday-tutor/.env.local` and fill in:

| Variable | Required | Notes |
|---|---|---|
| `GOOGLE_CLOUD_PROJECT` | Yes | GCP project ID (not the numeric number) |
| `GOOGLE_APPLICATION_CREDENTIALS` | Yes | Absolute path to the service-account JSON key |
| `GOOGLE_CLOUD_LOCATION` | No | Defaults to `us-central1` |
| `GEMINI_CHAT_MODEL` | No | Defaults to `gemini-2.5-flash` |
| `GEMINI_TRANSCRIPTION_MODEL` | No | Defaults to `gemini-2.5-flash` |
| `CONVEX_DEPLOYMENT` | No* | Required only for the parent dashboard |
| `NEXT_PUBLIC_CONVEX_URL` | No* | Required only for the parent dashboard |

## Architecture overview

### AI layer (`lib/`)

- **`lib/gemini.ts`** — singleton `GoogleGenAI` client (Vertex AI, not the public API key path). Throws if `GOOGLE_CLOUD_PROJECT` is missing.
- **`lib/askTutor.ts`** — core logic: builds a Gemini chat session, injects `SYSTEM_PROMPT` and the tool declarations, sends the user message, and parses the response. Returns `AskTutorResult` with `spoken_answer`, optional `tool_call`, `topic`, and `is_correct`.
- **`lib/tools.ts`** — three Gemini `FunctionDeclaration` objects: `show_desmos_graph`, `show_molecule_3d`, `show_steps_breakdown`.
- **`lib/prompts.ts`** — `SYSTEM_PROMPT` that instructs Friday to always return raw JSON (`{ spoken_answer, topic, is_correct? }`), not markdown.

### API routes (`app/api/`)

- **`POST /api/ask`** — validates `{ message, conversationHistory[] }`, calls `askTutor`, returns `AskTutorResult`.
- **`POST /api/transcribe`** — accepts a multipart `audio` file (≤ 20 MB), sends base64-encoded audio to Gemini for transcription, returns `{ transcript }`.

### Frontend (`app/`)

- **`app/page.tsx`** — main tutor interface. Manages app state (`idle | listening | transcribing | thinking | speaking | error`), the conversation history array, and the Convex session lifecycle. Calls `/api/ask` on each user turn, then calls `window.speechSynthesis` to speak the `spoken_answer`.
- **`app/components/MicButton.tsx`** — records audio via MediaRecorder, POSTs to `/api/transcribe`, then calls `askBackend`.
- **`app/components/VisualizationPanel.tsx`** — switches between `DesmosPanel` and molecule/steps views based on `response.tool_call.name`.
- **`app/dashboard/`** — parent-facing dashboard that uses Convex real-time queries to display session history, topic coverage, and progress.

### Convex backend (`convex/`)

Three tables: `sessions`, `messages`, `progress`. Always read `convex/_generated/ai/guidelines.md` before editing any Convex file — it overrides general Convex knowledge from training data.

- Session lifecycle: `startSession` → `saveMessage` (per turn) → `addTopicToSession` → `upsertProgress` → `endSession` (on page unload).
- Parent dashboard queries: `getAllSessions`, `getSessionMessages`, `getSessionProgress`, `getAggregatedProgress`.

### Key data flow

```
Mic → /api/transcribe → text
text → /api/ask → { spoken_answer, tool_call?, topic, is_correct? }
                ↓                        ↓
       speechSynthesis           VisualizationPanel
                ↓
       Convex mutations (session, message, topic, progress)
```

### Adding a new visualisation tool

1. Add a `FunctionDeclaration` to `lib/tools.ts`.
2. Update `SYSTEM_PROMPT` in `lib/prompts.ts` with when to use it.
3. Add a new component under `app/components/` and handle the new `tool_call.name` in `VisualizationPanel`.
