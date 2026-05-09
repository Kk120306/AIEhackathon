import { type Part } from "@google/generative-ai";
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
  const genAI = getGeminiClient();
  const model = genAI.getGenerativeModel({
    model: process.env.GEMINI_CHAT_MODEL ?? "gemini-2.5-flash",
    systemInstruction: SYSTEM_PROMPT,
    tools: [{ functionDeclarations: tools }],
  });

  // Gemini history uses "user" / "model" roles; system messages are handled
  // via systemInstruction above and must be excluded from history.
  const history = conversationHistory
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

  const chat = model.startChat({ history });

  const messageParts: string | Part[] = imageBase64
    ? [{ inlineData: { mimeType: imageMimeType, data: imageBase64 } }, { text: message }]
    : message;

  const result = await chat.sendMessage(messageParts);
  const response = result.response;

  const parts = response.candidates?.[0]?.content?.parts ?? [];
  const functionCallPart = parts.find((p) => p.functionCall);
  const textPart = parts.find((p) => p.text);

  if (functionCallPart?.functionCall) {
    const fc = functionCallPart.functionCall;
    return {
      spoken_answer: textPart?.text ?? "",
      tool_call: {
        name: fc.name,
        args: (fc.args ?? {}) as Record<string, unknown>,
      },
    };
  }

  return {
    spoken_answer: response.text(),
  };
}
