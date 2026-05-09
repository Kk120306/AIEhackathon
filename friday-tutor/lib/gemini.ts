import { GoogleGenAI } from "@google/genai";

let _client: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI {
  if (_client) return _client;

  const project = process.env.GOOGLE_CLOUD_PROJECT;
  if (!project) {
    throw new Error(
      "Missing GOOGLE_CLOUD_PROJECT. Set it in .env.local."
    );
  }

  _client = new GoogleGenAI({
    vertexai: true,
    project,
    location: process.env.GOOGLE_CLOUD_LOCATION ?? "global",
  });

  return _client;
}
