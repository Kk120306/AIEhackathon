import { NextRequest, NextResponse } from "next/server";

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const DEFAULT_VOICE_ID =
  process.env.ELEVENLABS_DEFAULT_VOICE_ID ?? "21m00Tcm4TlvDq8ikWAM";

export async function POST(req: NextRequest) {
  if (!ELEVENLABS_API_KEY) {
    return NextResponse.json(
      { error: "ElevenLabs API key not configured." },
      { status: 500 }
    );
  }

  const body = await req.json();
  const text: string = body.text ?? "";
  const voiceId: string = body.voiceId ?? DEFAULT_VOICE_ID;

  if (!text.trim()) {
    return NextResponse.json({ error: "text is required." }, { status: 400 });
  }

  const elRes = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": ELEVENLABS_API_KEY,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_turbo_v2_5",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      }),
    }
  );

  if (!elRes.ok) {
    const errText = await elRes.text();
    return NextResponse.json(
      { error: `ElevenLabs error: ${errText}` },
      { status: elRes.status }
    );
  }

  const audioBuffer = await elRes.arrayBuffer();
  return new NextResponse(audioBuffer, {
    status: 200,
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "no-store",
    },
  });
}
