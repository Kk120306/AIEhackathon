# Backend API Test Responses

Tested locally against:

```text
http://localhost:3001
```

## Ask API: Normal Tutor Response

Input:

```bash
curl -s -X POST http://localhost:3001/api/ask \
  -H 'Content-Type: application/json' \
  -d '{"message":"Explain Newton second law in one sentence."}'
```

Output:

```json
{
  "spoken_answer": "Newton's second law states that the acceleration of an object is directly proportional to the net force acting on it and inversely proportional to its mass."
}
```

## Ask API: Graph Tool Response

Input:

```bash
curl -s -X POST http://localhost:3001/api/ask \
  -H 'Content-Type: application/json' \
  -d '{"message":"Graph y=x^2 and explain what the graph shows."}'
```

Output:

```json
{
  "spoken_answer": "",
  "tool_call": {
    "name": "show_desmos_graph",
    "args": {
      "expressions": ["y=x^2"],
      "explanation": "This shows a parabola opening upwards, symmetric about the y-axis, with its vertex at the origin (0,0)."
    }
  }
}
```

## Transcribe API: Missing Audio Validation

Input:

```bash
curl -s -X POST http://localhost:3001/api/transcribe \
  -F language=en
```

Output:

```json
{
  "error": "audio file is required"
}
```

## Transcribe API: Audio File Response

Input:

```bash
curl -s -X POST http://localhost:3001/api/transcribe \
  -F language=en \
  -F 'audio=@/private/tmp/friday-tutor-test.m4a;type=audio/m4a'
```

Output:

```json
{
  "transcript": "There are many theories, though the one that fits best is that they use their large back claws to dig into the ground or a tree."
}
```

Note: the audio file response used a tiny generated macOS `say` test clip, so
the endpoint reached Gemini successfully, but the transcript quality is not a
reliable product-quality audio benchmark.
