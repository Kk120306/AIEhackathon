# ACE Tutor

**ACE** is a **voice-first AI tutor** aimed at students working toward **IB Diploma** and **Singapore A-Level** outcomes in **Mathematics**, **Physics**, and **Chemistry**. Instead of hunting through notes or forcing long typing sessions during revision, learners speak naturally, optionally point the camera at a question on paper or a screen, and receive answers that balance **exam-style rigour** (marking-awareness in the prompt) with **readable explanations**.

The UX is optimised for short revision loops: listen, ask a follow-up, see a graph or molecule or worked steps when the model decides a visual artefact helps, then move on. A **parent- or learner-facing dashboard** summarizes recent sessions from data stored locally in the browser so progress is inspectable without a separate accounts system for the MVP.

This repository was built for the **AI Engineer Hackathon** (Singapore, May 2026), an open in-person build with strong representation from Gemini, cloud, voice, and toolchain sponsors. The runnable application lives under **`friday-tutor/`**; brainstorming and phase plans live in **`/docs`** at the repository root.

---

## What ACE does in practice

### Learning session (`/learn`)

1. **Start** — the student opens `/learn`, allows microphone access, and optionally configures a tutor “presence” (custom brief + generated portrait backed by Vertex Imagen APIs when enabled).
2. **Ask aloud** — they press-and-hold or use the mic control; audio is uploaded to **`POST /api/transcribe`**, which returns transcript text via Gemini.
3. **Multimodal follow-up** — they can invoke the **camera** to capture homework or textbook problems. ACE sends the transcript together with **image bytes** to **`POST /api/ask`** so the model can read the framing of the paper question, not only the spoken wording. Voice phrases such as “take a picture”, “retake”, “send it”, and “cancel the photo” are recognised in-session so hands stay off the keyboard when possible (`app/learn/page.tsx`).
4. **Answer** — the backend returns structured JSON parsed in **`lib/askTutor.ts`**: a **`spoken_answer`** (read aloud via the Web Speech API and optionally replaced or augmented by **`POST /api/speak`** when ElevenLabs is configured), an optional richer **`display_answer`** for on-screen typography (LaTeX-friendly where applicable), optional **`follow_up_questions`**, **`topic`** and **`is_correct`** hints for analytics, and an optional **`tool_call`** for visualisations.

### Landing and analytics

- **`/`** — marketing narrative and entry into the product (“Start Learning” goes to `/learn`).
- **`/dashboard`** — reads **`localStorage`**-backed history via **`app/hooks/useAnalytics.ts`** (key `ace_tutor_analytics`, capped at roughly the last fifty sessions). It surfaces session duration, per-topic counts, correctness where reported, subjects inferred from topic strings (`math`, `physics`, `chemistry`, `other`), and chronological exchanges for drill-down without a backend database requirement for the MVP.

---

## Gemini tools (function calling)

The tutor can emit one of three tool calls defined in **`lib/tools.ts`**; **`app/Components/VisualizationPanel.tsx`** and siblings render the payloads:

| Tool | When it fires | Student sees |
| --- | --- | --- |
| `show_desmos_graph` | Graphs, sketches, intersections, transformations | Desmos embed with one or more LaTeX expressions |
| `show_molecule_3d` | Discrete structures, ions, SMILES-safe species | MolView embed (optional PubChem CID or SMILES) |
| `show_steps_breakdown` | Multi-step numerics, derivations, organised working | Numbered panel with KaTeX-friendly step strings |

To add another visualisation pipeline, declare a **`FunctionDeclaration`** in **`lib/tools.ts`**, extend **`SYSTEM_PROMPT`** in **`lib/prompts.ts`**, branch on `tool_call.name` in **`VisualizationPanel`**, and add any small presenter component beside the existing Desmos/MolView/step panels. **`/CLAUDE.md`** at repo root summarizes the project layout and reviewer expectations.

---

## Optional media and polish

Routes under **`app/api/`** stitch in sponsor-relevant modality when credentials exist:

| Route | Purpose |
| --- | --- |
| **`/api/generate-image`** | Illustrations or supplementary figures (Imagen class model, **`lib/generateImage.ts`**) |
| **`/api/generate-video`** | Short motion clips polling an async Gemini video model (**`lib/generateVideo.ts`**) |
| **`/api/teacher-portrait`** | One-off character portrait bundles for **`TeacherPresence`** (**`lib/teacherPortrait.ts`**) |
| **`/api/voices`** | Lists ElevenLabs voices when **`ELEVENLABS_API_KEY`** is present |
| **`/api/speak`** | Streams or returns audio for **`spoken_answer`** text via ElevenLabs |

If ElevenLabs is not configured, the client falls back to **`window.speechSynthesis`** for zero-config demos.

---

## Tech stack

- **Framework:** Next.js 14 (**App Router**), TypeScript, React 18  
- **Styling:** Tailwind CSS (**`tailwind.config`** + **`app/globals.css`**)  
- **AI:** `@google/genai` against **Vertex AI** (see **`lib/gemini.ts`**) for chat, transcription, and optionally Imagen/video  
- **Voice (optional):** ElevenLabs REST from **`app/api/speak`** and **`app/api/voices`**  
- **Math on screen:** KaTeX via **`remark-math`** / **`rehype-katex`** where answers are rendered as markdown-ish content  
- **Client state:** Conversation array, **`AppStatus`** machine (`idle` → `listening` → `transcribing` → `thinking` → `speaking` → `error`), camera capture refs, **`useVoiceRecorder`** / **`useVoicePreference`**

---

## Repository layout (`friday-tutor`)

```
friday-tutor/
├── app/
│   ├── page.tsx              # Landing
│   ├── learn/page.tsx        # Full tutor session wiring
│   ├── dashboard/page.tsx    # Historical analytics UI
│   ├── api/                  # Route handlers (ask, transcribe, speak, …)
│   ├── Components/           # Panels, mic, visualisation shells, teacher presence
│   ├── hooks/                # Recorder, voice prefs, analytics persistence
│   └── types.ts              # Conversation + TutorResponse + UI status types
├── lib/
│   ├── gemini.ts             # Vertex client bootstrap
│   ├── askTutor.ts           # Chat + parse + optional follow-up question synthesis
│   ├── prompts.ts            # SYSTEM_PROMPT
│   ├── tools.ts              # Gemini function declarations
│   ├── generateImage.ts / generateVideo.ts / teacherPortrait.ts
└── convex/                   # Legacy / experimental Convex files (dashboard path does not depend on Convex today)
```

---

## Prerequisites

- **Node.js 18 or newer**
- Google Cloud **project** with **Vertex AI API** enabled for the models you select
- Working **Application Default Credentials** locally:
  - **`gcloud auth application-default login`**, **or**
  - **`GOOGLE_APPLICATION_CREDENTIALS`** pointing to a JSON key for a principal that may call Vertex AI-generative endpoints

Microphone-capable Chrome, Edge, or Safari is assumed for **`/learn`**. HTTPS or `localhost` is required for **`getUserMedia`**.

---

## Setup

Run everything from **`friday-tutor/`**:

```bash
cd friday-tutor
npm install
cp .env.example .env.local
# Populate at least GOOGLE_CLOUD_PROJECT — see below
npm run dev
```

- **Landing:** http://localhost:3000  
- **Tutor:** http://localhost:3000/learn  
- **Dashboard:** http://localhost:3000/dashboard  

---

## Environment variables

|`Variable` | `Required` | `Purpose` |
| --- | --- | --- |
| `GOOGLE_CLOUD_PROJECT` | **Yes** | GCP project identifier passed to **`GoogleGenAI`** in **`lib/gemini.ts`** |
| `GOOGLE_CLOUD_LOCATION` | No | Defaults to **`global`** |
| `GEMINI_CHAT_MODEL` | No | Chat model id (default **`gemini-1.5-flash-8b`** in **`lib/askTutor.ts`**) |
| `GEMINI_TRANSCRIPTION_MODEL` | No | Speech-to-text model (default **`gemini-1.5-flash-8b`** in **`app/api/transcribe/route.ts`**) |
| `ELEVENLABS_API_KEY` | No | Enables ElevenLabs list + speech routes |
| `ELEVENLABS_DEFAULT_VOICE_ID` | No | Fallback voice for **`/api/speak`** |
| `IMAGEN_MODEL` | No | Image generation (**`lib/generateImage.ts`**) |
| `TEACHER_PORTRAIT_IMAGEN_MODEL` | No | Portrait-only override (**`lib/teacherPortrait.ts`**) |
| `GEMINI_VIDEO_MODEL` | No | Async video preset (**`lib/generateVideo.ts`**) |
| `GEMINI_VIDEO_POLL_MS` | No | Poll cadence during video job wait |
| `GEMINI_VIDEO_MAX_POLLS` | No | Hard cap before surfacing timeout |
| `GOOGLE_APPLICATION_CREDENTIALS` | No* | *Required implicitly* if ADC is not already available to the Node process |

---

## Scripts

```bash
npm run dev      # next dev — hot reload during hackathon demos
npm run build    # next build — production compilation
npm run start    # next start — serves .next output
npm run lint     # next lint — ESLint via Next preset
```

There is **no** Jest/Vitest/Playwright suite checked in yet; validate changes manually on `/learn` and `/dashboard`.

---

## Deploying

Choose any host that supports the **Node** runtime Next 14 expects (Vercel, Cloud Run, etc.). Provision the **same variables** plus a **service account** or workload identity that can mint Vertex credentials in production—the build must complete `next build`; runtime calls to Vertex originate from **`getGeminiClient()`** on each server invocation.

---

## Troubleshooting quick hits

- **`Missing GOOGLE_CLOUD_PROJECT`** — ensure `.env.local` is beside **`package.json`** and restart **`npm run dev`**.
- **`Permission denied`** on Vertex calls — inspect IAM roles (Vertex AI User / service-consumer) on the credential you use locally.
- **Silent mic** — check browser OS-level permissions; **`/learn`** relies on **`MediaRecorder`**.
- **No ElevenLabs audio** — leave key blank and rely on **`speechSynthesis`**, or confirm key + **`/api/voices`** returns voices in Network tab.

---

## Meta

For repository-wide norms, scripted commands, and an older Convex-oriented mental model retained in **`/CLAUDE.md`**, compare that document with **`app/dashboard/page.tsx`** (which presently uses **`useAnalytics`** only).
