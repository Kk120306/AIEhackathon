# Phase 2 Implementation Plan: Backend Voice Input

## Goal

Add backend support for voice input without building the frontend yet.

The frontend will later record audio and upload it to the backend. For now, implement server routes that can:

1. Accept an audio file.
2. Transcribe it to text with OpenAI.
3. Optionally pass the transcript into the existing tutor endpoint flow.

OpenAI's speech-to-text API supports `transcriptions` and accepts audio files such as `mp3`, `mp4`, `mpeg`, `mpga`, `m4a`, `wav`, and `webm`, with file uploads limited to 25 MB. Current transcription models include `gpt-4o-mini-transcribe`, `gpt-4o-transcribe`, and `gpt-4o-transcribe-diarize`.

Source: OpenAI Speech to Text docs, `https://platform.openai.com/docs/guides/speech-to-text`.

## Backend Architecture

```text
Frontend later records audio
  -> POST /api/transcribe
  -> OpenAI audio.transcriptions
  -> transcript text
  -> frontend later calls POST /api/ask
```

Recommended MVP backend:

```text
POST /api/transcribe
  returns { transcript }

POST /api/ask
  accepts { message, conversationHistory? }
  returns { spoken_answer, tool_call? }
```

Optional convenience route:

```text
POST /api/voice-ask
  accepts audio + optional conversationHistory
  transcribes audio
  sends transcript to tutor logic
  returns { transcript, spoken_answer, tool_call? }
```

For Phase 2, implement `/api/transcribe` first. Add `/api/voice-ask` only if we want a single backend call from the future frontend.

## Files to Create

```text
friday-tutor/app/api/transcribe/route.ts
```

Optional:

```text
friday-tutor/app/api/voice-ask/route.ts
friday-tutor/lib/askTutor.ts
```

## Request Contract: `/api/transcribe`

Method:

```text
POST
```

Content type:

```text
multipart/form-data
```

Form fields:

```ts
{
  audio: File;
  language?: string;
}
```

Successful response:

```ts
{
  transcript: string;
}
```

Error response:

```ts
{
  error: string;
}
```

## Implementation Steps

### 1. Create the Route Handler

Create `friday-tutor/app/api/transcribe/route.ts`.

Imports:

```ts
import { NextRequest, NextResponse } from "next/server";
import { openai } from "@/lib/openai";
```

Export:

```ts
export async function POST(req: NextRequest) {
  // implementation
}
```

### 2. Parse Multipart Form Data

Use:

```ts
const formData = await req.formData();
const audio = formData.get("audio");
const language = formData.get("language");
```

Validate:

- `audio` exists.
- `audio` is a `File`.
- `audio.size > 0`.
- `audio.size <= 25 * 1024 * 1024`.
- MIME type or filename extension is one of the supported audio formats.

Return `400` for invalid input.

Example:

```ts
return NextResponse.json(
  { error: "audio file is required" },
  { status: 400 }
);
```

### 3. Call OpenAI Transcription

Use the OpenAI SDK audio transcription endpoint:

```ts
const transcription = await openai.audio.transcriptions.create({
  file: audio,
  model: "gpt-4o-mini-transcribe",
  language: typeof language === "string" ? language : undefined,
});
```

MVP model choice:

- Use `gpt-4o-mini-transcribe` for speed and cost.
- Upgrade to `gpt-4o-transcribe` if transcript quality becomes more important than cost.
- Avoid diarization for MVP unless the app needs multiple-speaker labeling.

### 4. Return Transcript

Return:

```ts
return NextResponse.json({
  transcript: transcription.text,
});
```

### 5. Add Error Handling

Wrap route logic in `try/catch`.

On error:

- Log the full error server-side.
- Return a generic `500`.
- Do not expose API keys or raw provider internals to the client.

Example:

```ts
console.error("Transcription API error:", error);

return NextResponse.json(
  { error: "Failed to transcribe audio" },
  { status: 500 }
);
```

## Optional Route: `/api/voice-ask`

If the future frontend should send one request instead of two, add:

```text
friday-tutor/app/api/voice-ask/route.ts
```

Request:

```text
multipart/form-data
```

Fields:

```ts
{
  audio: File;
  language?: string;
  conversationHistory?: string; // JSON-encoded messages
}
```

Response:

```ts
{
  transcript: string;
  spoken_answer: string;
  tool_call?: {
    name: string;
    args: object;
  };
}
```

To avoid duplicating tutor logic, extract the OpenAI tutor call from `/api/ask/route.ts` into:

```text
friday-tutor/lib/askTutor.ts
```

Suggested helper:

```ts
export async function askTutor({
  message,
  conversationHistory = [],
}: {
  message: string;
  conversationHistory?: Array<{
    role: "user" | "assistant" | "system";
    content: string;
  }>;
}) {
  // shared OpenAI chat completion + tool-call parsing
}
```

Then:

- `/api/ask` parses JSON and calls `askTutor`.
- `/api/voice-ask` parses audio, transcribes it, then calls `askTutor`.

## Manual Testing

Start the app:

```bash
cd friday-tutor
npm run dev
```

Test `/api/transcribe` with a local audio file:

```bash
curl -X POST http://localhost:3000/api/transcribe \
  -F "audio=@./sample.webm"
```

Expected:

```ts
{
  transcript: "Graph y equals x squared"
}
```

Test with language hint:

```bash
curl -X POST http://localhost:3000/api/transcribe \
  -F "audio=@./sample.webm" \
  -F "language=en"
```

Test missing file:

```bash
curl -X POST http://localhost:3000/api/transcribe
```

Expected:

```ts
{
  error: "audio file is required"
}
```

Status code: `400`.

## Acceptance Criteria

- `POST /api/transcribe` accepts multipart audio uploads.
- The route validates missing, empty, oversized, and unsupported files.
- The route uses the server-side OpenAI client from `lib/openai.ts`.
- The route returns `{ transcript: string }`.
- Errors are logged server-side.
- Client-facing errors are JSON and do not leak secrets.
- No frontend voice UI is required in this phase.

## Follow-Up Integration

When the frontend is ready, it can choose either flow:

Two-step flow:

```text
record audio
  -> POST /api/transcribe
  -> POST /api/ask with transcript
```

Single-step flow:

```text
record audio
  -> POST /api/voice-ask
  -> receive transcript + tutor response
```

The two-step flow is easier to debug. The single-step flow is simpler for the final user interaction.
