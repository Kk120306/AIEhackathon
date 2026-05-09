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
  tool_call?: TutorToolCall;
  topic?: string;
  is_correct?: boolean;
};

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
    model: process.env.GEMINI_CHAT_MODEL ?? "gemini-2.5-flash-lite",
    history,
    config: {
      systemInstruction: SYSTEM_PROMPT,
      tools: [{ functionDeclarations: tools }],
    },
  });

  const messageParts = imageBase64
    ? [{ inlineData: { mimeType: imageMimeType, data: imageBase64 } }, { text: message }]
    : message;

  const response = await chat.sendMessage({ message: messageParts });

  const parts = response.candidates?.[0]?.content?.parts ?? [];
  const functionCallPart = parts.find((p) => p.functionCall);
  const textPart = parts.find((p) => p.text);

  const rawText = textPart?.text ?? response.text ?? "";
  let spokenAnswer = rawText;
  let topic: string | undefined;
  let isCorrect: boolean | undefined;

  try {
    const parsed = JSON.parse(rawText);
    if (parsed && typeof parsed.spoken_answer === "string") {
      spokenAnswer = parsed.spoken_answer;
      if (typeof parsed.topic === "string") topic = parsed.topic;
      if (typeof parsed.is_correct === "boolean") isCorrect = parsed.is_correct;
    }
  } catch {
    // Not JSON — use raw text as-is
  }

  if (functionCallPart?.functionCall) {
    const fc = functionCallPart.functionCall;

    // If Gemini returned a tool call but no spoken explanation, build one from
    // the tool arguments so the student always hears something meaningful.
    if (!spokenAnswer) {
      const toolName = fc.name ?? "";
      const args = (fc.args ?? {}) as Record<string, unknown>;
      if (toolName === "show_desmos_graph") {
        const exprs: string[] = Array.isArray(args.expressions)
          ? (args.expressions as string[])
          : [];
        spokenAnswer = exprs.length
          ? `Here's the graph showing ${exprs.join(" and ")}. Take a look at the visualisation panel.`
          : "I've opened the graph for you. Take a look at the visualisation panel.";
      } else if (toolName === "show_molecule_3d") {
        spokenAnswer = `Here's the 3D molecule for ${args.formula ?? args.name ?? "that compound"}. Take a look at the visualisation panel.`;
      } else if (toolName === "show_steps_breakdown") {
        spokenAnswer = "I've laid out the step-by-step solution for you. Take a look at the visualisation panel.";
      } else {
        spokenAnswer = "Take a look at the visualisation panel for the explanation.";
      }
    }

    return {
      spoken_answer: spokenAnswer,
      tool_call: {
        name: fc.name ?? "",
        args: (fc.args ?? {}) as Record<string, unknown>,
      },
      topic,
      is_correct: isCorrect,
    };
  }

  return { spoken_answer: spokenAnswer, topic, is_correct: isCorrect };
}
