import { NextResponse } from "next/server";

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

// Popular ElevenLabs voices — used as fallback when the API key lacks voices_read
// or as a base set merged with any custom account voices.
const FALLBACK_VOICES = [
  { voice_id: "21m00Tcm4TlvDq8ikWAM", name: "Rachel (default)" },
  { voice_id: "AZnzlk1XvdvUeBnXmlld", name: "Domi" },
  { voice_id: "EXAVITQu4vr4xnSDxMaL", name: "Bella" },
  { voice_id: "ErXwobaYiN019PkySvjV", name: "Antoni" },
  { voice_id: "MF3mGyEYCl7XYWbV9V6O", name: "Elli" },
  { voice_id: "TxGEqnHWrfWFTfGW9XjX", name: "Josh" },
  { voice_id: "VR6AewLTigWG4xSOukaG", name: "Arnold" },
  { voice_id: "pNInz6obpgDQGcFmaJgB", name: "Adam" },
  { voice_id: "yoZ06aMxZJJ28mfd3POQ", name: "Sam" },
];

export async function GET() {
  if (!ELEVENLABS_API_KEY) {
    return NextResponse.json(FALLBACK_VOICES);
  }

  try {
    const elRes = await fetch("https://api.elevenlabs.io/v1/voices", {
      headers: { "xi-api-key": ELEVENLABS_API_KEY },
      next: { revalidate: 3600 },
    });

    if (!elRes.ok) {
      // API key lacks voices_read permission or other error — return hardcoded list
      return NextResponse.json(FALLBACK_VOICES);
    }

    const data = await elRes.json();
    const voices = (data.voices as Array<{ voice_id: string; name: string }>).map(
      ({ voice_id, name }) => ({ voice_id, name })
    );

    return NextResponse.json(voices.length > 0 ? voices : FALLBACK_VOICES);
  } catch {
    return NextResponse.json(FALLBACK_VOICES);
  }
}
