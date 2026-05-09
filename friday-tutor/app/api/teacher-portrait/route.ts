import { NextRequest, NextResponse } from "next/server";
import {
  generateTeacherPortrait,
  TEACHER_CHARACTER_BRIEF_MAX,
} from "@/lib/teacherPortrait";

type Body = {
  force?: unknown;
  characterBrief?: unknown;
};

function asBrief(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  return v.replace(/\s+/g, " ").trim().slice(0, TEACHER_CHARACTER_BRIEF_MAX);
}

export async function POST(req: NextRequest) {
  try {
    let force = false;
    let characterBrief: string | undefined;
    try {
      const body = (await req.json()) as Body;
      force = body?.force === true;
      characterBrief = asBrief(body?.characterBrief);
    } catch {
      // empty body is fine
    }

    const result = await generateTeacherPortrait({
      force,
      characterBrief: characterBrief ?? "",
    });

    return NextResponse.json({
      imageBase64: result.imageBase64,
      mimeType: result.mimeType,
      promptUsed: result.prompt,
      characterBrief: characterBrief ?? "",
    });
  } catch (error) {
    console.error("Teacher portrait API error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to generate tutor portrait";
    const isClientError = /blocked|safety|rephrase/i.test(message);
    return NextResponse.json(
      { error: message },
      { status: isClientError ? 400 : 500 }
    );
  }
}
