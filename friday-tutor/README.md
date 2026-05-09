# ACE Tutor

ACE is a voice-first AI tutor oriented to **IB Diploma** and **Singapore A-Level** work in Maths, Physics, and Chemistry. Students speak (or optionally show a camera frame), get structured spoken answers back, and can trigger **graphs** (Desmos), **3D molecules** (MolView), or **numbered worked steps** when the model calls the right tools.

This repository was built for the **AI Engineer Hackathon** (Singapore, May 2026): an open build day with Gemini- and infra-related sponsor tracks. The Next.js application lives under `friday-tutor/` alongside planning notes in `/docs`.

## Features

- **Voice loop** — record speech, transcribe with Gemini (`/api/transcribe`), reason with Gemini chat + tools (`/api/ask`), optional **ElevenLabs** speech (`/api/speak`) and voice listing (`/api/voices`).
- **Visual tutor tools** — `show_desmos_graph`, `show_molecule_3d`, `show_steps_breakdown` (declared in `lib/tools.ts`, rendered from `/learn`).
- **Optional rich media** — image generation portrait/illustrations and short video snippets via dedicated API routes (Imagen / Veo-style models—see env table below).
- **Student dashboard** — `/dashboard` summarizes recent sessions via client-side analytics (`app/hooks/useAnalytics.ts`).
- **Marketing landing** — `/` introduces the product; `/learn` is the main tutoring session.

## Prerequisites

- **Node.js 18+** (match your Next.js 14 toolchain).
- A **Google Cloud project** with **Vertex AI** enabled and billing as required by your account.
- **Application Default Credentials** for that project (typically `gcloud auth application-default login` on your machine, or `GOOGLE_APPLICATION_CREDENTIALS` pointing at a service account JSON with Vertex AI access).

## Setup

Commands are run from **`friday-tutor/`**:

```bash
cd friday-tutor
npm install
cp .env.example .env.local
# Edit .env.local — see Environment variables below
npm run dev
```

Open **http://localhost:3000** for the landing page, or **http://localhost:3000/learn** for the tutor.

## Environment variables

Copy `.env.example` to `.env.local` and configure at least **`GOOGLE_CLOUD_PROJECT`**.

| Variable | Required | Purpose |
| --- | --- | --- |
| `GOOGLE_CLOUD_PROJECT` | Yes | GCP project ID for Vertex-backed `@google/genai`. |
| `GOOGLE_CLOUD_LOCATION` | No | Defaults to **`global`** in `lib/gemini.ts`. |
| `GEMINI_CHAT_MODEL` | No | Defaults to **`gemini-1.5-flash-8b`**. |
| `GEMINI_TRANSCRIPTION_MODEL` | No | Defaults to **`gemini-1.5-flash-8b`**. |
| `ELEVENLABS_API_KEY` | No | Enables `/api/speak` and `/api/voices`; without it those routes degrade gracefully. |
| `ELEVENLABS_DEFAULT_VOICE_ID` | No | Fallback voice ID for speak API. |
| `IMAGEN_MODEL` | No | Imagen ID for `/api/generate-image` (`lib/generateImage.ts`). |
| `TEACHER_PORTRAIT_IMAGEN_MODEL` | No | Overrides portrait model (`lib/teacherPortrait.ts`). |
| `GEMINI_VIDEO_MODEL` | No | Defaults in `lib/generateVideo.ts` (Veo-class preview ID). |
| `GEMINI_VIDEO_POLL_MS` | No | Polling interval for async video generation. |
| `GEMINI_VIDEO_MAX_POLLS` | No | Max polls before timing out video generation. |

Application Default Credentials are read by the Google client libraries automatically; set **`GOOGLE_APPLICATION_CREDENTIALS`** locally if you are not using `gcloud` user credentials.

## Scripts

```bash
npm run dev      # Next.js dev server
npm run build    # Production build
npm run start    # Run production server
npm run lint     # ESLint (next lint)
```

There is no automated test suite in this repo yet.

## Architecture (short)

| Area | Role |
| --- | --- |
| `lib/gemini.ts` | Singleton Vertex AI `GoogleGenAI` client. |
| `lib/askTutor.ts` | Chat session, tool calls, JSON parsing, follow-up question generation. |
| `lib/prompts.ts` | System instructions for the tutor. |
| `lib/tools.ts` | Gemini `FunctionDeclaration` list for visualisations. |
| `app/learn/page.tsx` | Main student experience (mic, camera, panels, state). |
| `app/api/*` | `ask`, `transcribe`, `speak`, `voices`, `generate-image`, `generate-video`, `teacher-portrait`. |

Data flow in one line: **microphone (and optional image) → transcribe → ask → UI + optional TTS**, with tool outputs rendered in `app/Components/VisualizationPanel.tsx` and related components.

## Deploying

Any Node-friendly host that supports Next.js 14 works; set the same environment variables in the provider’s dashboard and ensure the runtime can reach Vertex AI with valid credentials (service account or workload identity in production).

## Documentation for contributors

Repository-wide conventions and deeper file-by-file notes live in **`/CLAUDE.md`** at the repo root (paths, commands, and extension points for new tools).
