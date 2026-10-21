import { GoogleGenAI, Type, type Schema } from "@google/genai";
import { z } from "zod";

import { isNetworkError, networkErrorMessage } from "@/server/network.server";

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

function geminiModel() {
  return process.env["GEMINI_MODEL"] || DEFAULT_GEMINI_MODEL;
}

function geminiClient(missingKeyMessage: string) {
  const apiKey = process.env["GEMINI_API_KEY"];
  if (!apiKey) throw new Error(missingKeyMessage);
  return new GoogleGenAI({
    apiKey,
    // Retries rate limits, server errors and dropped connections; 2 minutes per attempt.
    httpOptions: { timeout: 120_000, retryOptions: { attempts: 4, initialDelay: 1, maxDelay: 8 } },
  });
}

/** Calls Gemini, replacing a raw connection failure with an actionable message. */
async function callGemini<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (err) {
    if (isNetworkError(err)) throw new Error(networkErrorMessage("Gemini"));
    throw err;
  }
}

/** Runs a structured-JSON Gemini call and validates the result with Zod. */
async function generateJson<T>(opts: {
  feature: string;
  system: string;
  prompt: string;
  schema: Schema;
  validate: z.ZodType<T>;
}): Promise<T> {
  const ai = geminiClient(`${opts.feature} needs the Gemini API key (GEMINI_API_KEY).`);
  const response = await callGemini(() =>
    ai.models.generateContent({
      model: geminiModel(),
      contents: opts.prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: opts.schema,
        systemInstruction: opts.system,
      },
    }),
  );
  const text = response.text;
  if (!text) throw new Error(`${opts.feature}: Gemini returned an empty response.`);
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error(`${opts.feature}: Gemini returned malformed JSON.`);
  }
  const parsed = opts.validate.safeParse(raw);
  if (!parsed.success)
    throw new Error(`${opts.feature}: Gemini's answer didn't match the expected format.`);
  return parsed.data;
}

/* ------------------------- report stacking narrative ------------------------ */

export async function writeStackingAnalysis(input: {
  parcel: string;
  painPoints: string[];
  programs: {
    name: string;
    level: string;
    state: string;
    funds: string;
    overview: string;
    fit: string;
  }[];
  notes: string[];
}): Promise<string> {
  const result = await generateJson({
    feature: "Stacking analysis",
    system: `You are a housing-finance analyst at Collective Impact writing the "stacking analysis" section of a client proposal.
Explain how the listed programs could be layered to fund the project: which program is the senior or largest source, which fill gaps, sequencing and timing risks, and conflicts (for example rent or income restrictions that differ between programs).
Use ONLY the facts provided. Do not invent dollar amounts, rates, deadlines or rules that are not in the input; when something needs confirming, say so. Return 2–4 short paragraphs of plain text, one per array item, no markdown.`,
    prompt: JSON.stringify(input, null, 2),
    schema: {
      type: Type.OBJECT,
      properties: { paragraphs: { type: Type.ARRAY, items: { type: Type.STRING } } },
      required: ["paragraphs"],
    },
    validate: z.object({ paragraphs: z.array(z.string().trim().min(1)).min(1) }),
  });
  // Paragraphs are joined with blank lines; the report view splits on them.
  return result.paragraphs.join("\n\n");
}

/* -------------------- grounded answers (preview & golden set) -------------------- */

export type KnowledgeSource = { n: number; title: string; text: string };

export type GroundedAnswer = {
  answer: string;
  cited: number[];
  coverage: "full" | "partial" | "none";
};

/**
 * Answers a visitor question using only the numbered Knowledge Base sources — the same
 * data the public chatbot can read for that state.
 */
export async function answerFromSources(input: {
  question: string;
  state: string;
  sources: KnowledgeSource[];
}): Promise<GroundedAnswer> {
  const sourceText = input.sources.map((s) => `[${s.n}] ${s.title}\n${s.text}`).join("\n\n");
  return generateJson({
    feature: "Answer preview",
    system: `You answer questions about affordable-housing funding for a visitor in ${input.state}, for Collective Impact.
Use ONLY the numbered sources. Cite them inline like [1] or [2][3]. If the sources don't cover the question, say so plainly and suggest contacting Collective Impact — never guess or use outside knowledge.
coverage: "full" if the sources fully answer it, "partial" if only in part, "none" if not at all.`,
    prompt: `Sources:\n${sourceText || "(no sources for this state)"}\n\nQuestion: ${input.question}`,
    schema: {
      type: Type.OBJECT,
      properties: {
        answer: { type: Type.STRING },
        cited: { type: Type.ARRAY, items: { type: Type.INTEGER } },
        coverage: { type: Type.STRING, format: "enum", enum: ["full", "partial", "none"] },
      },
      required: ["answer", "cited", "coverage"],
    },
    validate: z.object({
      answer: z.string().trim().min(1),
      cited: z.array(z.number().int()),
      coverage: z.enum(["full", "partial", "none"]),
    }),
  });
}

/** Judges whether an answer agrees with the verified expected answer. */
export async function judgeAnswer(input: {
  question: string;
  expected: string;
  actual: string;
  requiredPrograms: string[];
}): Promise<{ passed: boolean; reason: string }> {
  return generateJson({
    feature: "Golden set check",
    system: `You grade a housing-funding assistant against a verified expected answer.
Pass only if the actual answer agrees with the expected answer on every material fact (programs, amounts, eligibility, deadlines) and does not add contradicting claims. Wording may differ. If required programs are listed, the answer must mention each one.
Give a one-sentence reason.`,
    prompt: JSON.stringify(input, null, 2),
    schema: {
      type: Type.OBJECT,
      properties: { passed: { type: Type.BOOLEAN }, reason: { type: Type.STRING } },
      required: ["passed", "reason"],
    },
    validate: z.object({ passed: z.boolean(), reason: z.string().trim().min(1) }),
  });
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
  const ai = geminiClient(
    "AI extraction is not configured yet: GEMINI_API_KEY is missing. The transcript is saved — run extraction again once the key is added.",
  );
  const stateFocus = input.state
    ? `Focus subsidy matching on ${input.state} and Federal programs.`
    : "The state is unknown; name the jurisdiction of every subsidy you list.";

  const response = await callGemini(() =>
    ai.models.generateContent({
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
    }),
  );

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
