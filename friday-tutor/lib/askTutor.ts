import type {
  ChatCompletionMessage,
  ChatCompletionMessageParam,
} from "openai/resources/chat";
import { openai } from "@/lib/openai";
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

type LegacyFunctionCall = {
  name?: string;
  arguments?: string;
};

function parseToolArguments(rawArguments: string | null | undefined) {
  if (!rawArguments) {
    return {};
  }

  try {
    const parsed = JSON.parse(rawArguments);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed
      : {};
  } catch (error) {
    console.error("Failed to parse OpenAI tool arguments:", {
      rawArguments,
      error,
    });
    return {};
  }
}

function extractToolCall(message: ChatCompletionMessage): TutorToolCall | undefined {
  const modernToolCall = message.tool_calls?.[0];

  if (modernToolCall?.type === "function") {
    return {
      name: modernToolCall.function.name,
      args: parseToolArguments(modernToolCall.function.arguments),
    };
  }

  const legacyFunctionCall = (
    message as typeof message & { function_call?: LegacyFunctionCall }
  ).function_call;

  if (legacyFunctionCall?.name) {
    return {
      name: legacyFunctionCall.name,
      args: parseToolArguments(legacyFunctionCall.arguments),
    };
  }

  return undefined;
}

export async function askTutor({
  message,
  conversationHistory = [],
}: {
  message: string;
  conversationHistory?: ConversationMessage[];
}): Promise<AskTutorResult> {
  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...conversationHistory.map((historyMessage) => ({
      role: historyMessage.role,
      content: historyMessage.content,
    })),
    { role: "user", content: message },
  ];

  const response = await openai.chat.completions.create({
    model: process.env.OPENAI_CHAT_MODEL ?? "gpt-4-turbo",
    messages,
    tools,
    tool_choice: "auto",
  });

  const assistantMessage = response.choices[0]?.message;

  if (!assistantMessage) {
    throw new Error("OpenAI returned no assistant message");
  }

  const toolCall = extractToolCall(assistantMessage);
  const explanationFromTool =
    typeof toolCall?.args.explanation === "string"
      ? toolCall.args.explanation
      : "";

  return {
    spoken_answer: assistantMessage.content ?? explanationFromTool,
    ...(toolCall ? { tool_call: toolCall } : {}),
  };
}
