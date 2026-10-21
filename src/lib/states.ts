/**
 * State partitioning helpers shared by the console UI and server functions.
 * Every program and note must carry one of these codes so the public chatbot
 * can filter knowledge by the visitor's state.
 */

export const STATE_NAMES: Record<string, string> = {
  OK: "Oklahoma",
  KS: "Kansas",
  FL: "Florida",
  MD: "Maryland",
  Federal: "Federal",
};

/** States a client deal can be located in. */
export const CLIENT_STATES = ["OK", "KS", "FL", "MD"] as const;

/** States a program or note can be tagged with (client states plus Federal). */
export const KNOWLEDGE_STATES = [...CLIENT_STATES, "Federal"] as const;

export function stateLabel(code: string) {
  const name = STATE_NAMES[code];
  return name && name !== code ? `${name} (${code})` : code;
}

/** Reads the trailing state code from labels like "316 S Morton Ave, Bartlesville, OK". */
export function stateFromLabel(label: string): string | null {
  const match = /,\s*([A-Z]{2}|Federal)\s*$/.exec(label);
  const code = match?.[1];
  return code && code in STATE_NAMES ? code : null;
}

// Federal programs, whatever state they're discussed in. "HOME" counts only in capitals
// (the HOME Investment Partnerships Program), never the everyday word.
const FEDERAL_PROGRAM =
  /\b(CDBG|LIHTC|HUD|USDA|HOPWA|Section\s*(8|108|202|515|538|811)|Low[- ]Income Housing Tax Credits?|Community Development Block Grants?|HOME Investment Partnerships?|National Housing Trust Fund|Choice Neighborhoods|Opportunity Zones?|Federal Home Loan Bank)\b/i;

/**
 * The state a program belongs to, read from its name: "Kansas Moderate Income Housing" →
 * KS, "CDBG Small Cities" → Federal. Null when the name doesn't say.
 */
export function stateFromProgramName(name: string): string | null {
  for (const [code, stateName] of Object.entries(STATE_NAMES)) {
    if (code !== "Federal" && new RegExp(`\\b${stateName}\\b`, "i").test(name)) return code;
  }
  if (FEDERAL_PROGRAM.test(name) || /\bHOME\b/.test(name)) return "Federal";
  return null;
}

const STOPWORDS = new Set([
  "the",
  "and",
  "for",
  "of",
  "program",
  "programs",
  "housing",
  "fund",
  "funds",
  "grant",
  "grants",
  "state",
]);

function normalize(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function tokens(value: string) {
  return new Set(
    normalize(value)
      .split(" ")
      .filter((t) => t.length >= 3 && !STOPWORDS.has(t)),
  );
}

function acronyms(value: string) {
  return [...value.matchAll(/\(([A-Z][A-Z0-9/-]{1,})\)/g)].map((m) => m[1]!.toLowerCase());
}

function similarity(title: string, programName: string) {
  const a = normalize(title);
  const b = normalize(programName);
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (a.length >= 4 && b.length >= 4 && (a.includes(b) || b.includes(a))) return 0.95;

  // An acronym in parentheses on either side, e.g. "Florida SHIP" ↔ "… Partnership (SHIP)"
  // or "Community Development Block Grant (CDBG)" ↔ "CDBG Small Cities".
  const titleWords = new Set(a.split(" "));
  const programWords = new Set(b.split(" "));
  if (acronyms(programName).some((acr) => titleWords.has(acr))) return 0.9;
  if (acronyms(title).some((acr) => programWords.has(acr))) return 0.9;

  const ta = tokens(title);
  const tb = tokens(programName);
  if (ta.size === 0 || tb.size === 0) return 0;
  let shared = 0;
  for (const t of ta) if (tb.has(t)) shared++;
  return shared / (ta.size + tb.size - shared);
}

/**
 * Programs a subsidy found on a call can be linked to: the deal's state plus
 * Federal programs. When the state is unknown, every program is a candidate.
 */
export function candidatePrograms<T extends { state: string }>(
  programs: T[],
  state: string | null,
): T[] {
  if (!state) return programs;
  return programs.filter((p) => p.state === state || p.state === "Federal");
}

/** Best name match for an extracted subsidy title, or null when nothing is close. */
export function matchProgram<T extends { name: string }>(title: string, programs: T[]): T | null {
  let best: T | null = null;
  let bestScore = 0;
  for (const program of programs) {
    const score = similarity(title, program.name);
    if (score > bestScore) {
      best = program;
      bestScore = score;
    }
  }
  return bestScore >= 0.5 ? best : null;
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}
