import { NextRequest, NextResponse } from "next/server";
import { getGeminiClient } from "@/lib/gemini";

export const runtime = "nodejs";

const MAX_AUDIO_SIZE_BYTES = 20 * 1024 * 1024;

const SUPPORTED_AUDIO_MIME_TYPES = new Set([
  "audio/flac", "audio/mp3", "audio/mp4", "audio/mpeg", "audio/mpga",
  "audio/m4a", "audio/ogg", "audio/wav", "audio/webm",
  "video/mp4", "video/webm",
]);

const SUPPORTED_AUDIO_EXTENSIONS = new Set([
  "flac", "mp3", "mp4", "mpeg", "mpga", "m4a", "ogg", "wav", "webm",
]);

function getFileExtension(filename: string) {
  return filename.split(".").pop()?.toLowerCase() ?? "";
}

function isSupportedAudioFile(file: File) {
  return (
    SUPPORTED_AUDIO_MIME_TYPES.has(file.type.toLowerCase()) ||
    SUPPORTED_AUDIO_EXTENSIONS.has(getFileExtension(file.name))
  );
}

function badRequest(error: string) {
  return NextResponse.json({ error }, { status: 400 });
}

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") ?? "";
    if (
      !contentType.includes("multipart/form-data") &&
      !contentType.includes("application/x-www-form-urlencoded")
    ) {
      return badRequest("audio file is required");
    }

    const formData = await req.formData();
    const audio = formData.get("audio");
    const languageValue = formData.get("language");

    if (!(audio instanceof File)) return badRequest("audio file is required");
    if (audio.size === 0) return badRequest("audio file cannot be empty");
    if (audio.size > MAX_AUDIO_SIZE_BYTES) return badRequest("audio file must be 20 MB or smaller");
    if (!isSupportedAudioFile(audio)) {
      return badRequest(
        "audio file must be one of: flac, mp3, mp4, mpeg, mpga, m4a, ogg, wav, or webm"
      );
    }

    const language =
      typeof languageValue === "string" && languageValue.trim()
        ? languageValue.trim()
        : undefined;

    const base64Audio = Buffer.from(await audio.arrayBuffer()).toString("base64");
    const mimeType = audio.type || "audio/webm";
    const languageInstruction = language ? ` The audio is in ${language}.` : "";

    const ai = getGeminiClient();
    const response = await ai.models.generateContent({
      model: process.env.GEMINI_TRANSCRIPTION_MODEL ?? "gemini-1.5-flash-8b",
      contents: [
        {
          role: "user",
          parts: [
            { inlineData: { mimeType, data: base64Audio } },
            {
              text: `Transcribe this audio accurately.${languageInstruction} Return only the transcription text with no additional commentary.`,
            },
          ],
        },
      ],
    });

    return NextResponse.json({ transcript: response.text ?? "" });
  } catch (error) {
    console.error("Transcription API error:", error);
    return NextResponse.json({ error: "Failed to transcribe audio" }, { status: 500 });
  }
}
