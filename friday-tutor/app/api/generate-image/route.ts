import { NextRequest, NextResponse } from "next/server";
import { generateIllustration } from "@/lib/generateImage";

type Body = {
  question?: unknown;
  answer?: unknown;
  topic?: unknown;
};

function asString(v: unknown): string | undefined {
  return typeof v === "string" && v.trim().length > 0 ? v : undefined;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Body;
    const question = asString(body.question);
    if (!question) {
      return NextResponse.json(
        { error: "question is required" },
        { status: 400 }
      );
    }

    const result = await generateIllustration({
      question,
      answer: asString(body.answer),
      topic: asString(body.topic),
    });

    return NextResponse.json({
      imageBase64: result.imageBase64,
      mimeType: result.mimeType,
      promptUsed: result.prompt,
    });
  } catch (error) {
    console.error("Generate image API error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to generate illustration";

    // Differentiate user-actionable errors (bad input, safety block) from
    // genuine server faults so the client can surface the message verbatim.
    const isClientError = /required|blocked|safety|rephrase/i.test(message);
    return NextResponse.json(
      { error: message },
      { status: isClientError ? 400 : 500 }
    );
  }
}
