/** Client for the public Grants.gov REST API (no key required). */

const API = "https://api.grants.gov/v1/api";

export type GrantHit = {
  id: string;
  number: string;
  title: string;
  agency: string;
  openDate: string;
  closeDate: string;
  status: "forecasted" | "posted";
  listings: string[];
};

export type GrantDetail = GrantHit & {
  description: string;
  estimatedFunding: string | null;
  awardCeiling: string | null;
  awardFloor: string | null;
  deadline: string | null;
  eligibility: string | null;
  applicantTypes: string[];
  contact: string | null;
  link: string;
};

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  ndash: "–",
  mdash: "—",
  rsquo: "’",
  lsquo: "‘",
  rdquo: "”",
  ldquo: "“",
  hellip: "…",
};

export function decodeHtml(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, entity: string) => {
    if (entity[0] === "#") {
      const code =
        entity[1]?.toLowerCase() === "x"
          ? parseInt(entity.slice(2), 16)
          : parseInt(entity.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : whole;
    }
    return NAMED_ENTITIES[entity.toLowerCase()] ?? whole;
  });
}

export function htmlToText(html: string): string {
  return decodeHtml(
    html
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|li|h\d)>/gi, "\n")
      .replace(/<li[^>]*>/gi, "• ")
      .replace(/<[^>]+>/g, ""),
  )
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n\s*\n+/g, "\n\n")
    .trim();
}

async function call<T>(endpoint: string, body: unknown): Promise<T> {
  const res = await fetch(`${API}/${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Grants.gov returned ${res.status}.`);
  const json = (await res.json()) as { errorcode: number; msg: string; data: T };
  if (json.errorcode !== 0) throw new Error(`Grants.gov error: ${json.msg}`);
  return json.data;
}

type RawHit = {
  id: string;
  number: string;
  title: string;
  agency: string;
  openDate: string;
  closeDate: string;
  oppStatus: string;
  cfdaList?: string[];
};

/**
 * Open (posted) and upcoming (forecasted) opportunities. Without a keyword the feed is
 * the Housing category; a keyword widens it to Housing + Community Development.
 */
export async function searchGrants(
  keyword?: string,
): Promise<{ hitCount: number; hits: GrantHit[] }> {
  const data = await call<{ hitCount: number; oppHits: RawHit[] }>("search2", {
    rows: 50,
    oppStatuses: "forecasted|posted",
    fundingCategories: keyword ? "HO|CD" : "HO",
    ...(keyword ? { keyword } : {}),
  });
  return {
    hitCount: data.hitCount,
    hits: data.oppHits.map((h) => ({
      id: String(h.id),
      number: h.number,
      title: decodeHtml(h.title),
      agency: decodeHtml(h.agency),
      openDate: h.openDate,
      closeDate: h.closeDate,
      status: h.oppStatus === "posted" ? "posted" : "forecasted",
      listings: h.cfdaList ?? [],
    })),
  };
}

function money(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? `$${n.toLocaleString("en-US")}` : null;
}

function clean(value: unknown) {
  const text = typeof value === "string" ? htmlToText(value) : "";
  return text && !["none", "n/a", "tbd"].includes(text.toLowerCase()) ? text : null;
}

type RawDetail = {
  id: number;
  opportunityNumber: string;
  opportunityTitle: string;
  agencyDetails?: { agencyName?: string };
  cfdas?: { cfdaNumber?: string }[];
  synopsis?: Record<string, unknown>;
  forecast?: Record<string, unknown>;
};

export async function fetchGrantDetail(id: string): Promise<GrantDetail> {
  const data = await call<RawDetail>("fetchOpportunity", { opportunityId: Number(id) });
  const posted = Boolean(data.synopsis);
  const s = (data.synopsis ?? data.forecast ?? {}) as Record<string, unknown>;

  let applicantTypes: string[] = [];
  if (Array.isArray(s["applicantTypes"])) {
    applicantTypes = (s["applicantTypes"] as { description?: string }[])
      .map((t) => t.description ?? "")
      .filter(Boolean);
  }

  const contact = [s["agencyContactName"], s["agencyContactEmail"], s["agencyContactPhone"]]
    .map(clean)
    .filter(Boolean)
    .join(" · ");

  return {
    id: String(data.id),
    number: data.opportunityNumber,
    title: decodeHtml(data.opportunityTitle),
    agency: decodeHtml(data.agencyDetails?.agencyName ?? String(s["agencyName"] ?? "")),
    openDate: String(s["postingDate"] ?? ""),
    closeDate: String((posted ? s["responseDate"] : s["estApplicationResponseDate"]) ?? ""),
    status: posted ? "posted" : "forecasted",
    listings: (data.cfdas ?? []).map((c) => c.cfdaNumber ?? "").filter(Boolean),
    description: clean(posted ? s["synopsisDesc"] : s["forecastDesc"]) ?? "",
    estimatedFunding: money(s["estimatedFunding"]),
    awardCeiling: money(s["awardCeiling"]),
    awardFloor: money(s["awardFloor"]),
    deadline: clean(posted ? s["responseDate"] : s["estApplicationResponseDate"]),
    eligibility: clean(s["applicantEligibilityDesc"]),
    applicantTypes,
    contact: contact || null,
    link: `https://www.grants.gov/search-results-detail/${data.id}`,
  };
}

/** Text saved as the Intake card's raw text, so AI extraction can read it like a call. */
export function grantToText(d: GrantDetail): string {
  return [
    `Grants.gov opportunity ${d.number} (${d.status === "posted" ? "open for applications" : "forecast"})`,
    `Agency: ${d.agency}`,
    d.listings.length ? `Assistance listings: ${d.listings.join(", ")}` : null,
    d.deadline ? `Application deadline: ${d.deadline}` : null,
    d.estimatedFunding ? `Estimated total funding: ${d.estimatedFunding}` : null,
    d.awardCeiling || d.awardFloor
      ? `Award range: ${d.awardFloor ?? "—"} to ${d.awardCeiling ?? "—"}`
      : null,
    d.applicantTypes.length ? `Eligible applicants: ${d.applicantTypes.join("; ")}` : null,
    d.contact ? `Contact: ${d.contact}` : null,
    `Link: ${d.link}`,
    "",
    d.description,
    d.eligibility ? `\nEligibility: ${d.eligibility}` : null,
  ]
    .filter((line) => line !== null)
    .join("\n");
}
