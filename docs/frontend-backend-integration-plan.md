# Frontend Backend Integration Plan

## Goal

Move `friday-tutor` from placeholder content to live backend data by routing typed
and spoken student questions through the existing Next.js API routes.

## Current Backend Contracts

### `POST /api/ask`

Request:

```ts
{
  message: string;
  conversationHistory?: Array<{
    role: "user" | "assistant" | "system";
    content: string;
  }>;
}
```

Response:

```ts
{
  spoken_answer: string;
  tool_call?: {
    name: string;
    args: Record<string, unknown>;
  };
}
```

### `POST /api/transcribe`

Request:

```ts
FormData {
  audio: File;
  language?: string;
}
```

Response:

```ts
{
  transcript: string;
}
```

## Implementation Steps

1. Replace the mock response in `app/page.tsx` with a real `/api/ask` request.
2. Store a lightweight in-memory `conversationHistory` array on the client and
   send it with each ask request.
3. Render `spoken_answer` directly in `AnswerPanel`.
4. Render optional `tool_call` results in `VisualizationPanel`:
   - `show_desmos_graph`: show the Desmos calculator plus expression chips.
   - `show_molecule_3d`: open a molecule lookup panel using MolView.
   - `show_steps_breakdown`: show numbered working steps.
5. Replace browser speech-recognition-only mic input with `MediaRecorder` audio
   capture that uploads to `/api/transcribe`, then sends the transcript to
   `/api/ask`.
6. Add explicit status and error states for listening, transcribing, thinking,
   speaking, and failure.
7. Verify with TypeScript/lint and run the Next.js dev server for manual testing.

## Follow-up Options

- Add persisted sessions once Convex or database storage is introduced.
- Add richer Desmos state encoding so expressions are preloaded in the iframe.
- Replace the MolView iframe with an in-app 3Dmol.js viewer for tighter control.
