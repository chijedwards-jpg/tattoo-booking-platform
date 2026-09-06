import type { AiAnalysisInput } from "./pricingEngine";

export const VALID_STYLES = [
  "Minimalist", "Fine Line", "Traditional", "Neo-traditional", "Black & Grey",
  "Color", "Realism", "Micro Realism", "Geometric", "Illustrative",
  "Japanese", "Lettering", "Linework", "Blackwork", "Other",
];

interface AnalyzeImageParams {
  base64Image: string; // no data: prefix
  mediaType: "image/jpeg" | "image/png" | "image/webp";
  description?: string;
  sizeInches?: number;
}

/**
 * Sends the inspiration image to Gemini for a structured read on style,
 * complexity, and a rough tattoo-time estimate. This estimate is always a
 * *starting point* for the pricing engine — never shown to the client or
 * artist as final, and always subject to the artist's own override.
 *
 * Uses Gemini's free tier (gemini-2.5-flash) via plain REST -- no extra
 * npm package required. Swap this file for a paid model later without
 * touching anything else in the app; the return shape stays the same.
 */
export async function analyzeInspirationImage(
  params: AnalyzeImageParams
): Promise<AiAnalysisInput> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set in .env");
  }

  const sizeContext = params.sizeInches
    ? `The client indicated the tattoo will be approximately ${params.sizeInches} inches.`
    : "The client did not specify exact dimensions.";

  const prompt = `You are assisting a professional tattoo artist by doing a first-pass read on a tattoo inspiration image. Your analysis is a starting estimate only -- the artist will always review and can override it.

${sizeContext}
${params.description ? `Client notes: "${params.description}"` : ""}

Analyze the image and respond with ONLY a JSON object (no markdown, no prose, no code fences) in exactly this shape:

{
  "detectedStyle": one of ${JSON.stringify(VALID_STYLES)},
  "estimatedHours": number (realistic tattoo session hours for a skilled artist to execute this design at the stated size, base estimate before any per-artist adjustment),
  "complexity": integer 1-10 (1 = very simple single-element linework, 10 = extremely detailed multi-element realism/color piece),
  "confidence": number 0-1 (your confidence in this read -- lower it if the image is a poor reference, ambiguous, low-resolution, or the client's notes contradict the image),
  "colorVsBW": "color" or "black_grey"
}`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inline_data: {
                mime_type: params.mediaType,
                data: params.base64Image,
              },
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const text: string | undefined =
    data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error("Gemini returned no analysis text");
  }

  const cleaned = text.replace(/```json|```/g, "").trim();
  const parsed = JSON.parse(cleaned);

  return {
    detectedStyle: parsed.detectedStyle,
    estimatedHours: parsed.estimatedHours,
    complexity: parsed.complexity,
    confidence: parsed.confidence,
    colorVsBW: parsed.colorVsBW,
  };
}
