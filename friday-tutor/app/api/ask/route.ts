import { NextRequest, NextResponse } from "next/server";
import { askTutor, type ConversationMessage } from "@/lib/askTutor";

type AskRequestBody = {
  message?: unknown;
  conversationHistory?: unknown;
  imageBase64?: unknown;
  imageMimeType?: unknown;
};

function isConversationMessage(value: unknown): value is ConversationMessage {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    (candidate.role === "user" ||
      candidate.role === "assistant" ||
      candidate.role === "system") &&
    typeof candidate.content === "string"
  );
}

function parseConversationHistory(value: unknown) {
  if (value === undefined) {
    return [];
  }

  if (!Array.isArray(value)) {
    throw new Error("conversationHistory must be an array");
  }

  if (!value.every(isConversationMessage)) {
    throw new Error("conversationHistory contains invalid messages");
  }

  return value;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as AskRequestBody;
    const message =
      typeof body.message === "string" ? body.message.trim() : "";

    if (!message) {
      return NextResponse.json(
        { error: "message is required" },
        { status: 400 }
      );
    }

    let conversationHistory: ConversationMessage[];

    try {
      conversationHistory = parseConversationHistory(body.conversationHistory);
    } catch (error) {
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "conversationHistory is invalid",
        },
        { status: 400 }
      );
    }

    const imageBase64 =
      typeof body.imageBase64 === "string" && body.imageBase64.length > 0
        ? body.imageBase64
        : undefined;

    const imageMimeType =
      typeof body.imageMimeType === "string" && body.imageMimeType.length > 0
        ? body.imageMimeType
        : "image/jpeg";

    const result = await askTutor({ message, conversationHistory, imageBase64, imageMimeType });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Ask API error:", error);

    return NextResponse.json(
      { error: "Failed to ask Friday Tutor" },
      { status: 500 }
    );
  }
}
