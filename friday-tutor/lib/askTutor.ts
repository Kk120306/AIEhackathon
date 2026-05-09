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

  const messageParts = imageBase64
    ? [{ inlineData: { mimeType: imageMimeType, data: imageBase64 } }, { text: message }]
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

  // Try to extract structured fields if model happened to return JSON
  const jsonCandidate = rawText
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/, "")
    .trim();
  try {
    const parsed = JSON.parse(jsonCandidate);
    if (parsed && typeof parsed.spoken_answer === "string") {
      spokenAnswer = parsed.spoken_answer;
      if (typeof parsed.display_answer === "string") displayAnswer = parsed.display_answer;
      if (typeof parsed.topic === "string") topic = parsed.topic;
      if (typeof parsed.is_correct === "boolean") isCorrect = parsed.is_correct;
    }
  } catch {
    // Not JSON — use raw text as-is
  }

  if (functionCallPart?.functionCall) {
    const fc = functionCallPart.functionCall;

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

    const followUpQuestions = await generateFollowUpQuestions(ai, message, spokenAnswer);

    return {
      spoken_answer: spokenAnswer,
      display_answer: displayAnswer,
      tool_call: {
        name: fc.name ?? "",
        args: (fc.args ?? {}) as Record<string, unknown>,
      },
      topic,
      is_correct: isCorrect,
      follow_up_questions: followUpQuestions,
    };
  }

  const followUpQuestions = await generateFollowUpQuestions(ai, message, spokenAnswer);

  return { spoken_answer: spokenAnswer, display_answer: displayAnswer, topic, is_correct: isCorrect, follow_up_questions: followUpQuestions };
}
