import type { Database } from "@/types/database";

type Tables = Database["public"]["Tables"];

export type ClientRow = Tables["clients"]["Row"];
export type TranscriptRow = Tables["transcripts"]["Row"];
export type ExtractionRow = Tables["extractions"]["Row"];
export type ProgramRow = Tables["knowledge_programs"]["Row"];
export type ActivityRow = Tables["app_activity_log"]["Row"];

export type TranscriptWithExtractions = TranscriptRow & { extractions: ExtractionRow[] };

export type PipelineStage = TranscriptRow["stage"];
export type ExtractionCategory = ExtractionRow["category"];

/** Program-link prefix meaning "create a new Knowledge Base program from this item". */
export const NEW_PROGRAM = "__new__";

/** Link value for "new program tagged with `state`". */
export function newProgramLink(state: string) {
  return `${NEW_PROGRAM}:${state}`;
}

/**
 * Reads a program link: an existing program's id, or a new program in a given state
 * (`state: null` = the plain legacy form, meaning the deal's own state).
 */
export function parseProgramLink(
  link: string,
): { kind: "existing"; id: string } | { kind: "new"; state: string | null } {
  if (link === NEW_PROGRAM) return { kind: "new", state: null };
  if (link.startsWith(`${NEW_PROGRAM}:`)) {
    return { kind: "new", state: link.slice(NEW_PROGRAM.length + 1) || null };
  }
  return { kind: "existing", id: link };
}

const MEETING_LABELS: Record<TranscriptRow["meeting_type"], string> = {
  meeting_1: "Meeting 1",
  meeting_2: "Meeting 2",
  ad_hoc: "Ad hoc call",
  funding_feed: "Funding opportunity",
};

export function meetingLabel(type: TranscriptRow["meeting_type"]) {
  return MEETING_LABELS[type];
}

export const STAGE_LABELS: Record<PipelineStage, string> = {
  intake: "Intake",
  extracted: "Extracted",
  "in-review": "In Review",
  approved: "Approved",
};
