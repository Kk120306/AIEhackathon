import { NextRequest, NextResponse } from "next/server";
import { openai } from "@/lib/openai";
import { tools } from "@/lib/tools";
import { SYSTEM_PROMPT } from "@/lib/prompts";
import type { ChatCompletionMessageParam } from "openai/resources/chat";

export async function POST(req: NextRequest) {
  const { transcript, history = [] } = await req.json();

  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...history,
    { role: "user", content: transcript },
  ];

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages,
    tools,
    tool_choice: "auto",
  });

  const choice = response.choices[0];
  const assistantMessage = choice.message;
  const toolCall = assistantMessage.tool_calls?.[0] ?? null;

  return NextResponse.json({
    text: assistantMessage.content ?? "",
    toolCall: toolCall
      ? {
          name: toolCall.function.name,
          args: JSON.parse(toolCall.function.arguments),
        }
      : null,
    updatedHistory: [
      ...history,
      { role: "user", content: transcript },
      assistantMessage,
    ],
  });
}
