import { GoogleGenAI, Type, type Schema } from "@google/genai";
import { z } from "zod";

export const DEFAULT_GEMINI_MODEL = "gemini-3.8-flash";

export const EXTRACTION_CATEGORIES = [
  "pain_point",
  "required_info",
  "missing_document",
  "next_step",
  "state_subsidy",
] as const;

const extractedItemSchema = z.object({
  category: z.enum(EXTRACTION_CATEGORIES),
  title: z.string().trim().min(1),
  body: z.string().trim().min(1),
  facts: z.array(z.string().trim().min(1)).default([]),
  routing: z.enum(["program-level", "site-level"]),
  confidence: z.enum(["High", "Medium", "Low"]),
});

export type ExtractedItem = z.infer<typeof extractedItemSchema>;

const responseSchema: Schema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      category: {
        type: Type.STRING,
        format: "enum",
        enum: [...EXTRACTION_CATEGORIES],
        description: "Which of the 5 canonical buckets this finding belongs to",
      },
      title: { type: Type.STRING, description: "A short, descriptive title" },
      body: {
        type: Type.STRING,
        description: "Detailed context, grounded in what was said on the call",
      },
      facts: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "Key facts as short bullet points (amounts, dates, unit counts, names)",
      },
      routing: {
        type: Type.STRING,
        format: "enum",
        enum: ["program-level", "site-level"],
        description:
          "program-level if it applies to every future project in this jurisdiction, site-level if it applies only to this parcel",
      },
      confidence: {
        type: Type.STRING,
        format: "enum",
        enum: ["High", "Medium", "Low"],
        description: "How directly the transcript supports this finding",
      },
    },
    required: ["category", "title", "body", "facts", "routing", "confidence"],
    propertyOrdering: ["category", "title", "body", "facts", "routing", "confidence"],
  },
};

const MEETING_FOCUS: Record<string, string> = {
  meeting_1:
    "This is Meeting 1 (Discovery / Intake). Focus on broad pain points, site details, and missing documents.",
  meeting_2:
    "This is Meeting 2 (Deep Dive / Review). Focus on program fit, stacking analysis, and next steps toward a proposal or contract.",
  funding_feed:
    "This is a funding opportunity notice, not a call. Focus on the program terms (state_subsidy), eligibility (required_info), and required application documents (missing_document).",
};

export function hasGeminiKey() {
  return Boolean(process.env["GEMINI_API_KEY"]);
}

/**
 * Runs Gemini structured extraction over a transcript and validates every item
 * against the 5-bucket taxonomy. Items that fail validation are dropped and counted.
 */
export async function extractTranscript(input: {
  text: string;
  state: string | null;
  label: string;
  meetingType: string;
}): Promise<{ items: ExtractedItem[]; dropped: number }> {
  const apiKey = process.env["GEMINI_API_KEY"];
  if (!apiKey) {
    throw new Error(
      "AI extraction is not configured yet: GEMINI_API_KEY is missing. The transcript is saved — run extraction again once the key is added.",
    );
  }

  const ai = new GoogleGenAI({ apiKey });
  const stateFocus = input.state
    ? `Focus subsidy matching on ${input.state} and Federal programs.`
    : "The state is unknown; name the jurisdiction of every subsidy you list.";

  const response = await ai.models.generateContent({
    model: process.env["GEMINI_MODEL"] || DEFAULT_GEMINI_MODEL,
    contents: `Project: ${input.label}\nState: ${input.state ?? "Unknown"}\n\nTranscript:\n${input.text}`,
    config: {
      responseMimeType: "application/json",
      responseSchema,
      systemInstruction: `You are an expert in affordable housing finance and state housing subsidies working for Collective Impact.
Analyze the transcript and extract findings into exactly these 5 categories:
1. pain_point: deal blockers, financing gaps, zoning or site control obstacles.
2. required_info: quantitative project metrics — unit counts, AMI targets, building type, timeline.
3. missing_document: paperwork the client must still provide (Phase 1 ESA, title deed, pro forma, tax returns).
4. next_step: action items and milestones before the next meeting, proposal, or contract.
5. state_subsidy: government housing programs, grants, tax credits, or trust funds matched or discussed. Use the program's official name as the title.
${MEETING_FOCUS[input.meetingType] ?? ""}
${stateFocus}
Only extract what the transcript supports. Use Medium or Low confidence when something is implied rather than stated.`,
    },
  });

  const text = response.text;
  if (!text) throw new Error("Gemini returned an empty response.");

  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error("Gemini returned malformed JSON.");
  }
  if (!Array.isArray(raw)) throw new Error("Gemini response was not a list of extractions.");

  const items: ExtractedItem[] = [];
  let dropped = 0;
  for (const entry of raw) {
    const parsed = extractedItemSchema.safeParse(entry);
    if (parsed.success) items.push(parsed.data);
    else dropped++;
  }
  return { items, dropped };
}
