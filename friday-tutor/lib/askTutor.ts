import { getGeminiClient } from "@/lib/gemini";
import { SYSTEM_PROMPT } from "@/lib/prompts";
import { tools } from "@/lib/tools";

export type ConversationMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

export type TutorToolCall = {
  name: string;
  args: Record<string, unknown>;
};

export type AskTutorResult = {
  spoken_answer: string;
  display_answer?: string;
  tool_call?: TutorToolCall;
  topic?: string;
  is_correct?: boolean;
  out_of_scope?: boolean;
  follow_up_questions?: string[];
};

async function generateFollowUpQuestions(
  ai: ReturnType<typeof getGeminiClient>,
  userQuestion: string,
  assistantAnswer: string
): Promise<string[]> {
  try {
    const prompt = `A student asked a tutor: "${userQuestion}"
The tutor answered: "${assistantAnswer}"

Generate exactly 3 short follow-up questions the student might want to ask next about this topic. Each question must be under 15 words and directly related to the exchange above.

Respond with a JSON object in this exact format:
{"questions": ["question 1", "question 2", "question 3"]}`;

    const result = await ai.models.generateContent({
      model: process.env.GEMINI_CHAT_MODEL ?? "gemini-1.5-flash-8b",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.7,
      },
    });

    const raw = result.text ?? "";
    const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
    const parsed = JSON.parse(cleaned);
    if (
      parsed &&
      Array.isArray(parsed.questions) &&
      parsed.questions.every((q: unknown) => typeof q === "string")
    ) {
      return parsed.questions.slice(0, 3);
    }
  } catch {
    // silently fall back to empty
  }
  return [];
}

export async function askTutor({
  message,
  conversationHistory = [],
  imageBase64,
  imageMimeType = "image/jpeg",
}: {
  message: string;
  conversationHistory?: ConversationMessage[];
  imageBase64?: string;
  imageMimeType?: string;
}): Promise<AskTutorResult> {
  const ai = getGeminiClient();

  // @google/genai uses "user" / "model" roles; system messages go in systemInstruction
  const history = conversationHistory
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? "model" : ("user" as const),
      parts: [{ text: m.content }],
    }));

  const chat = ai.chats.create({
    model: process.env.GEMINI_CHAT_MODEL ?? "gemini-1.5-flash-8b",
    history,
    config: {
      systemInstruction: SYSTEM_PROMPT,
      tools: [{ functionDeclarations: tools }],
    },
  });

  if (imageBase64) {
    // Helpful when debugging "ACE isn't seeing the question" — confirms the
    // frame actually reaches the model and roughly how big it is.
    const sizeKb = Math.round((imageBase64.length * 3) / 4 / 1024);
    console.log(`[askTutor] image attached: ~${sizeKb}KB ${imageMimeType}`);
  }

  const messageParts = imageBase64
    ? [
        // Image FIRST so the model reads the visual context before the spoken
        // request — this materially improves Gemini's willingness to use it.
        { inlineData: { mimeType: imageMimeType, data: imageBase64 } },
        { text: message },
      ]
    : message;

  const response = await chat.sendMessage({ message: messageParts });

  const parts = response.candidates?.[0]?.content?.parts ?? [];
  const functionCallPart = parts.find((p) => p.functionCall);
  const textPart = parts.find((p) => p.text);

  const rawText = textPart?.text ?? response.text ?? "";
  let spokenAnswer = rawText;
  let displayAnswer: string | undefined;
  let topic: string | undefined;
  let isCorrect: boolean | undefined;
  let outOfScope: boolean | undefined;

  // Try to extract structured fields if model happened to return JSON.
  const jsonCandidate = extractJsonObject(rawText);
  if (jsonCandidate) {
    try {
      const parsed = JSON.parse(jsonCandidate);
      if (parsed && typeof parsed.spoken_answer === "string") {
        spokenAnswer = parsed.spoken_answer;
        if (typeof parsed.display_answer === "string") displayAnswer = parsed.display_answer;
        if (typeof parsed.topic === "string" && parsed.topic.trim()) topic = parsed.topic.trim();
        if (typeof parsed.is_correct === "boolean") isCorrect = parsed.is_correct;
        if (typeof parsed.out_of_scope === "boolean") outOfScope = parsed.out_of_scope;
      }
    } catch {
      // Not valid JSON — keep raw text as-is and fall through to regex fallbacks below.
    }
  }

  // Regex fallbacks for when the model emits malformed JSON (or mixes JSON
  // with prose). These keep analytics rich even when parsing fails.
  if (!topic) {
    const topicMatch = rawText.match(/"topic"\s*:\s*"([^"]+)"/);
    if (topicMatch) topic = topicMatch[1].trim();
  }
  if (isCorrect === undefined) {
    const correctMatch = rawText.match(/"is_correct"\s*:\s*(true|false)/);
    if (correctMatch) isCorrect = correctMatch[1] === "true";
  }
  if (outOfScope === undefined) {
    const oosMatch = rawText.match(/"out_of_scope"\s*:\s*(true|false)/);
    if (oosMatch) outOfScope = oosMatch[1] === "true";
  }

  // Skip tool calls when the model flagged the question as out of scope.
  if (functionCallPart?.functionCall && !outOfScope) {
    const fc = functionCallPart.functionCall;
    const toolName = fc.name ?? "";
    const args = (fc.args ?? {}) as Record<string, unknown>;

    if (!spokenAnswer) {
      if (toolName === "show_desmos_graph") {
        const exprs: string[] = Array.isArray(args.expressions)
          ? (args.expressions as string[])
          : [];
        spokenAnswer = exprs.length
          ? `Here's the graph showing ${exprs.join(" and ")}. Take a look at the visualisation panel.`
          : "I've opened the graph for you. Take a look at the visualisation panel.";
      } else if (toolName === "show_molecule_3d") {
        spokenAnswer = `Here's the 3D molecule for ${args.molecule_name ?? args.formula ?? args.name ?? "that compound"}. Take a look at the visualisation panel.`;
      } else if (toolName === "show_steps_breakdown") {
        spokenAnswer = "I've laid out the step-by-step solution for you. Take a look at the visualisation panel.";
      } else {
        spokenAnswer = "Take a look at the visualisation panel for the explanation.";
      }
    }

    // Last-ditch topic fallback derived from the tool call itself, so the
    // dashboard never shows "no topic" for a visualisation answer.
    if (!topic) {
      topic = topicFromToolCall(toolName, args);
    }

    const followUpQuestions = await generateFollowUpQuestions(ai, message, spokenAnswer);

    return {
      spoken_answer: spokenAnswer,
      display_answer: displayAnswer,
      tool_call: { name: toolName, args },
      topic,
      is_correct: isCorrect,
      out_of_scope: outOfScope,
      follow_up_questions: followUpQuestions,
    };
  }

  // For out-of-scope answers, skip follow-up generation — we don't want the
  // student nudged back into an off-syllabus thread.
  const followUpQuestions = outOfScope
    ? []
    : await generateFollowUpQuestions(ai, message, spokenAnswer);

  return {
    spoken_answer: spokenAnswer,
    display_answer: displayAnswer,
    topic,
    is_correct: isCorrect,
    out_of_scope: outOfScope,
    follow_up_questions: followUpQuestions,
  };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Pulls the first balanced top-level JSON object out of `raw`, tolerating code
 * fences and surrounding prose. Returns null if no candidate is found.
 */
function extractJsonObject(raw: string): string | null {
  if (!raw) return null;
  const stripped = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
  if (stripped.startsWith("{") && stripped.endsWith("}")) return stripped;

  const start = stripped.indexOf("{");
  if (start === -1) return null;
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < stripped.length; i++) {
    const ch = stripped[i];
    if (escape) { escape = false; continue; }
    if (ch === "\\") { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return stripped.slice(start, i + 1);
    }
  }
  return null;
}

function topicFromToolCall(toolName: string, args: Record<string, unknown>): string | undefined {
  if (toolName === "show_steps_breakdown" && typeof args.topic === "string" && args.topic.trim()) {
    return args.topic.trim();
  }
  if (toolName === "show_molecule_3d") {
    const name = (args.molecule_name ?? args.name) as string | undefined;
    if (typeof name === "string" && name.trim()) return name.trim();
    return "Molecular Structure";
  }
  if (toolName === "show_desmos_graph") {
    return "Graphing";
  }
  return undefined;
}
