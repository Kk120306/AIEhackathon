# AI Engineer Hackathon — ACE Tutor

This monorepo is the **Singapore (May 2026) AI Engineer Hackathon** submission: **ACE Tutor**, a voice-first Gemini-powered assistant for IB and Singapore A-Level study in Maths, Physics, and Chemistry.

**What sits where**

| Path | Contents |
| --- | --- |
| [`friday-tutor/`](friday-tutor/) | Production Next.js 14 application: Vertex Gemini chat + transcription, optional ElevenLabs TTS, Desmos/MolView/step visualisations, camera capture flow, learner dashboard fed from browser local analytics. |
| [`friday-tutor/README.md`](friday-tutor/README.md) | **Start here for:** features, UX walkthroughs, layout, APIs, env table, troubleshooting, deploy notes. |
| [`docs/`](docs/) | Human-facing planning artefacts (voice-input plans, backend notes)—not wired into runtime. |
| [`CLAUDE.md`](CLAUDE.md) | Maintainer cheat sheet written for Claude Code contributors; cross-check Convex-related bullets against the live `app/` tree since the Convex dashboard dependency may have drifted during the sprint. |

**Quick start**

```bash
cd friday-tutor
npm install && cp .env.example .env.local
# Fill GOOGLE_CLOUD_PROJECT + authenticate to Vertex (see friday-tutor/README.md)
npm run dev
```

Open http://localhost:3000/learn for the interactive tutor after configuring credentials.
