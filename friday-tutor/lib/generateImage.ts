import { getGeminiClient } from "@/lib/gemini";

export type GenerateIllustrationInput = {
  question: string;
  answer?: string;
  topic?: string;
};

export type GeneratedIllustration = {
  imageBase64: string;
  mimeType: string;
  prompt: string;
};

// Imagen 4 standard at $0.04/image is the right default for educational
// diagrams. Override with IMAGEN_MODEL=imagen-4.0-fast-generate-001 for
// cheaper / faster iteration during dev.
const IMAGEN_MODEL = process.env.IMAGEN_MODEL ?? "imagen-4.0-generate-001";

function summarise(text: string, maxLen = 240): string {
  const oneLine = text.replace(/\s+/g, " ").trim();
  if (oneLine.length <= maxLen) return oneLine;
  return oneLine.slice(0, maxLen - 1).trimEnd() + "…";
}

export function buildImagePrompt({
  question,
  answer,
  topic,
}: GenerateIllustrationInput): string {
  const subject = topic?.trim() || "the concept the student asked about";
  const summary = answer ? summarise(answer) : summarise(question);
  return [
    `An educational illustration of ${subject}, designed for an IB or A-Level student.`,
    "Clean whiteboard / textbook diagram style with high contrast and plenty of negative space.",
    "Use simple labelled shapes, arrows, and gentle shading. Keep on-image text minimal — words tend to render garbled.",
    `Context: ${summary}`,
  ].join(" ");
}

export async function generateIllustration(
  input: GenerateIllustrationInput
): Promise<GeneratedIllustration> {
  if (!input.question || !input.question.trim()) {
    throw new Error("question is required");
  }

  const ai = getGeminiClient();
  const prompt = buildImagePrompt(input);

  // @google/genai v2: models.generateImages → { generatedImages: [{ image: { imageBytes, mimeType } }] }
  const result = await ai.models.generateImages({
    model: IMAGEN_MODEL,
    prompt,
    config: {
      numberOfImages: 1,
      aspectRatio: "16:9",
      includeRaiReason: true,
    },
  });

  const generated = result?.generatedImages?.[0];
  const bytes = generated?.image?.imageBytes;
  if (!bytes) {
    // RAI filter? Surface the reason verbatim — students get a useful nudge
    // ("rephrase this without violent imagery") instead of a generic 500.
    const reason =
      (generated as { raiFilteredReason?: string } | undefined)
        ?.raiFilteredReason;
    throw new Error(
      reason
        ? `Image generation was blocked by safety filters: ${reason}`
        : "Imagen returned no image — try rephrasing the question."
    );
  }

  const mimeType = generated?.image?.mimeType ?? "image/png";
  return { imageBase64: bytes, mimeType, prompt };
}
