import { NextRequest, NextResponse } from "next/server";
import { openai } from "@/lib/openai";

export const runtime = "nodejs";

const MAX_AUDIO_SIZE_BYTES = 25 * 1024 * 1024;

const SUPPORTED_AUDIO_MIME_TYPES = new Set([
  "audio/flac",
  "audio/mp3",
  "audio/mp4",
  "audio/mpeg",
  "audio/mpga",
  "audio/m4a",
  "audio/ogg",
  "audio/wav",
  "audio/webm",
  "video/mp4",
  "video/webm",
]);

const SUPPORTED_AUDIO_EXTENSIONS = new Set([
  "flac",
  "mp3",
  "mp4",
  "mpeg",
  "mpga",
  "m4a",
  "ogg",
  "wav",
  "webm",
]);

function getFileExtension(filename: string) {
  return filename.split(".").pop()?.toLowerCase() ?? "";
}

function isSupportedAudioFile(file: File) {
  const mimeType = file.type.toLowerCase();
  const extension = getFileExtension(file.name);

  return (
    SUPPORTED_AUDIO_MIME_TYPES.has(mimeType) ||
    SUPPORTED_AUDIO_EXTENSIONS.has(extension)
  );
}

function badRequest(error: string) {
  return NextResponse.json({ error }, { status: 400 });
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const audio = formData.get("audio");
    const languageValue = formData.get("language");

    if (!(audio instanceof File)) {
      return badRequest("audio file is required");
    }

    if (audio.size === 0) {
      return badRequest("audio file cannot be empty");
    }

    if (audio.size > MAX_AUDIO_SIZE_BYTES) {
      return badRequest("audio file must be 25 MB or smaller");
    }

    if (!isSupportedAudioFile(audio)) {
      return badRequest(
        "audio file must be one of: flac, mp3, mp4, mpeg, mpga, m4a, ogg, wav, or webm"
      );
    }

    const language =
      typeof languageValue === "string" && languageValue.trim()
        ? languageValue.trim()
        : undefined;

    const transcription = await openai.audio.transcriptions.create({
      file: audio,
      model: process.env.OPENAI_TRANSCRIPTION_MODEL ?? "gpt-4o-mini-transcribe",
      ...(language ? { language } : {}),
    });

    return NextResponse.json({
      transcript: transcription.text,
    });
  } catch (error) {
    console.error("Transcription API error:", error);

    return NextResponse.json(
      { error: "Failed to transcribe audio" },
      { status: 500 }
    );
  }
}
