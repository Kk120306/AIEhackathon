import { getGeminiClient } from "@/lib/gemini";

export type TeacherPortraitResult = {
  imageBase64: string;
  mimeType: string;
  prompt: string;
};

const IMAGEN_MODEL =
  process.env.TEACHER_PORTRAIT_IMAGEN_MODEL ??
  process.env.IMAGEN_MODEL ??
  "imagen-4.0-generate-001";

/** Max characters accepted for user character direction (client should match). */
export const TEACHER_CHARACTER_BRIEF_MAX = 280;

const BASE_TEACHER_PORTRAIT = [
  "Half-body portrait of a warm, approachable adult tutor for a high school learning app,",
  "IB and A-Level maths physics chemistry.",
  "Soft studio lighting, chalkboard softly blurred in the background, professional smart-casual attire,",
  "friendly slight smile, front-facing, calm and trustworthy.",
  "Painterly digital illustration style with visible brush texture — not photorealistic, not uncanny.",
  "Appropriate for all ages, educational context only, no text or logos in the image.",
].join(" ");

/** @deprecated use buildTeacherPortraitPrompt() */
export const TEACHER_PORTRAIT_PROMPT = BASE_TEACHER_PORTRAIT;

function normalizeCharacterBrief(raw: string | undefined): string {
  if (!raw || typeof raw !== "string") return "";
  const oneLine = raw.replace(/\s+/g, " ").trim();
  return oneLine.slice(0, TEACHER_CHARACTER_BRIEF_MAX);
}

export function buildTeacherPortraitPrompt(characterBrief?: string): string {
  const brief = normalizeCharacterBrief(characterBrief);
  if (!brief) return BASE_TEACHER_PORTRAIT;
  return [
    BASE_TEACHER_PORTRAIT,
    "Incorporate the following student-requested character direction; keep the result clearly illustrated (not photorealistic), classroom-appropriate, and suitable for all ages:",
    brief,
  ].join(" ");
}

type CacheEntry = { imageBase64: string; mimeType: string };

const serverCache = new Map<string, CacheEntry>();

function cacheKey(characterBrief: string): string {
  return characterBrief.trim() || "__default__";
}

export async function generateTeacherPortrait(options?: {
  characterBrief?: string;
  force?: boolean;
}): Promise<TeacherPortraitResult> {
  const brief = normalizeCharacterBrief(options?.characterBrief);
  const key = cacheKey(brief);
  const prompt = buildTeacherPortraitPrompt(brief);

  if (!options?.force) {
    const hit = serverCache.get(key);
    if (hit) {
      return {
        imageBase64: hit.imageBase64,
        mimeType: hit.mimeType,
        prompt,
      };
    }
  }

  const ai = getGeminiClient();

  const result = await ai.models.generateImages({
    model: IMAGEN_MODEL,
    prompt,
    config: {
      numberOfImages: 1,
      aspectRatio: "3:4",
      includeRaiReason: true,
    },
  });

  const generated = result?.generatedImages?.[0];
  const bytes = generated?.image?.imageBytes;
  if (!bytes) {
    const reason = (generated as { raiFilteredReason?: string } | undefined)
      ?.raiFilteredReason;
    throw new Error(
      reason
        ? `Portrait generation was blocked by safety filters: ${reason}`
        : "Imagen returned no portrait image — try again later."
    );
  }

  const mimeType = generated?.image?.mimeType ?? "image/png";
  serverCache.set(key, { imageBase64: bytes, mimeType });

  return { imageBase64: bytes, mimeType, prompt };
}
