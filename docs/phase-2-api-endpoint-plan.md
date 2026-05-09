# Phase 2 Implementation Plan: Ask API Endpoint

## Goal

Build `friday-tutor/app/api/ask/route.ts`, a POST endpoint that accepts a student question, sends it to OpenAI with Friday's tutor prompt and tool definitions, then returns a spoken answer plus an optional visualization tool call.

This phase keeps the backend simple by using a Next.js route handler before introducing Convex persistence and real-time sync.

## Current Inputs

Existing files to reuse:

- `friday-tutor/lib/prompts.ts`
  - Exports `SYSTEM_PROMPT`.
  - Defines Friday's IB/A-Level tutoring behavior.
- `friday-tutor/lib/tools.ts`
  - Exports `tools`.
  - Defines the visualization tools:
    - `show_desmos_graph`
    - `show_molecule_3d`
    - `show_steps_breakdown`
- `friday-tutor/lib/openai.ts`
  - Exports an OpenAI client using `process.env.OPENAI_API_KEY`.

## Endpoint Contract

File:

```text
friday-tutor/app/api/ask/route.ts
```

Request body:

```ts
{
  message: string;
  conversationHistory?: Array<{
    role: "user" | "assistant" | "system";
    content: string;
  }>;
}
```

Successful response:

```ts
{
  spoken_answer: string;
  tool_call?: {
    name: string;
    args: object;
  };
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

Create `app/api/ask/route.ts` with:

- `import { NextRequest, NextResponse } from "next/server";`
- `import { openai } from "@/lib/openai";`
- `import { SYSTEM_PROMPT } from "@/lib/prompts";`
- `import { tools } from "@/lib/tools";`

Export:

```ts
export async function POST(req: NextRequest) {
  // implementation
}
```

### 2. Validate the Request Body

Parse JSON from the request.

Required validation:

- `message` must exist.
- `message` must be a non-empty string.
- `conversationHistory` is optional.
- If provided, `conversationHistory` must be an array.

Return `400` for invalid input:

```ts
return NextResponse.json(
  { error: "message is required" },
  { status: 400 }
);
```

### 3. Build the OpenAI Messages Array

Construct messages in this order:

```ts
[
  { role: "system", content: SYSTEM_PROMPT },
  ...conversationHistory,
  { role: "user", content: message }
]
```

Keep the endpoint stateless for now. The caller is responsible for sending previous turns as `conversationHistory`.

### 4. Prepare Function Calling

The current `lib/tools.ts` exports modern OpenAI `tools` objects:

```ts
{
  type: "function",
  function: {
    name,
    description,
    parameters
  }
}
```

The Phase 2 endpoint should use the legacy `functions` parameter requested in the brief. Convert the existing tool definitions at runtime:

```ts
const functions = tools.map((tool) => tool.function);
```

This avoids duplicating tool schemas and keeps `lib/tools.ts` as the single source of truth.

### 5. Call OpenAI

Use GPT-4 class model:

```ts
const response = await openai.chat.completions.create({
  model: "gpt-4-turbo",
  messages,
  functions,
  function_call: "auto",
});
```

Notes:

- `gpt-4-turbo` is preferred over plain `gpt-4` for latency and cost.
- The endpoint should use the existing `OPENAI_API_KEY` from the server environment.
- Since this is a server route, the API key is not exposed to the browser.

### 6. Process the Response

Read the first choice:

```ts
const choice = response.choices[0];
const assistantMessage = choice.message;
```

Extract spoken answer:

```ts
const spokenAnswer = assistantMessage.content ?? "";
```

Check for a function call:

```ts
const functionCall = assistantMessage.function_call;
```

If present:

- Use `functionCall.name` as the tool name.
- Parse `functionCall.arguments` as JSON.
- If parsing fails, log the raw arguments and return them as an empty object or return a controlled `500`.

Recommended behavior:

```ts
let toolCall;

if (functionCall) {
  toolCall = {
    name: functionCall.name,
    args: JSON.parse(functionCall.arguments || "{}"),
  };
}
```

### 7. Return JSON

Return:

```ts
return NextResponse.json({
  spoken_answer: spokenAnswer,
  ...(toolCall ? { tool_call: toolCall } : {}),
});
```

### 8. Add Error Handling

Wrap the handler body in `try/catch`.

On error:

- Log the full error with `console.error`.
- Return a `500` response with a useful message.

Example:

```ts
console.error("Ask API error:", error);

return NextResponse.json(
  { error: "Failed to ask Friday Tutor" },
  { status: 500 }
);
```

Avoid returning secrets or raw API-key-related details to the client.

## Manual Testing

Start the dev server:

```bash
cd friday-tutor
npm run dev
```

### Test 1: Desmos Graph

Request:

```bash
curl -X POST http://localhost:3000/api/ask \
  -H "Content-Type: application/json" \
  -d '{"message":"Graph y equals x squared"}'
```

Expected response shape:

```ts
{
  spoken_answer: string,
  tool_call: {
    name: "show_desmos_graph",
    args: {
      expressions: ["y=x^{2}"],
      explanation?: string
    }
  }
}
```

### Test 2: Molecule Viewer

Request:

```bash
curl -X POST http://localhost:3000/api/ask \
  -H "Content-Type: application/json" \
  -d '{"message":"Show me water molecule"}'
```

Expected response shape:

```ts
{
  spoken_answer: string,
  tool_call: {
    name: "show_molecule_3d",
    args: {
      molecule_name: "water",
      smiles?: string,
      pubchem_cid?: string
    }
  }
}
```

### Test 3: Missing Message

Request:

```bash
curl -X POST http://localhost:3000/api/ask \
  -H "Content-Type: application/json" \
  -d '{}'
```

Expected:

```ts
{
  error: "message is required"
}
```

Status code: `400`.

## Acceptance Criteria

- `POST /api/ask` accepts a valid `message`.
- The endpoint includes `SYSTEM_PROMPT`.
- The endpoint includes existing tool definitions from `lib/tools.ts`.
- Conversation history is included when provided.
- Graph requests can produce `show_desmos_graph`.
- Molecule requests can produce `show_molecule_3d`.
- Errors are logged server-side.
- API failures return `500` JSON without leaking secrets.

## Follow-Up Notes

The existing codebase uses OpenAI SDK v6. If TypeScript reports that `functions` or `function_call` are deprecated or unavailable, switch to the modern equivalent:

```ts
const response = await openai.chat.completions.create({
  model: "gpt-4-turbo",
  messages,
  tools,
  tool_choice: "auto",
});
```

Then read:

```ts
assistantMessage.tool_calls?.[0]
```

instead of:

```ts
assistantMessage.function_call
```

The response contract should remain the same either way:

```ts
{
  spoken_answer: string,
  tool_call?: {
    name: string,
    args: object
  }
}
```
