import { useSyncExternalStore } from "react";

export type Project = {
  id: string;
  address: string;
  city: string;
  state: string;
  propertyType: string;
  use: string;
  programs: string[];
};

export type Activity = {
  id: string;
  action: string;
  subject: string;
  detail: string;
  occurredAt: string;
  status: "approved" | "review" | "generated" | "updated";
};

export type TranscriptStatus = "new" | "extracting" | "ready" | "approved";

export type Transcript = {
  id: string;
  organization: string;
  callDate: string;
  projectId: string;
  projectLabel: string;
  programs: string[];
  status: TranscriptStatus;
  rawText: string;
};

export type ExtractionCategory = "program" | "note" | "contact" | "question";
export type RoutingLevel = "program-level" | "site-level";
export type ExtractionStatus = "pending" | "approved" | "rejected";

export type ExtractionItem = {
  id: string;
  transcriptId: string;
  category: ExtractionCategory;
  title: string;
  body: string;
  facts?: string[];
  routing: RoutingLevel;
  status: ExtractionStatus;
  confidence: "High" | "Medium";
};

export type ConsoleData = {
  projects: Project[];
  activity: Activity[];
  transcripts: Transcript[];
  extractions: ExtractionItem[];
  stats: {
    transcriptsThisMonth: number;
    awaitingApproval: number;
    reportsGenerated: number;
  };
};

const initialData: ConsoleData = {
  projects: [
    {
      id: "bartlesville-morton",
      address: "316 S Morton Ave",
      city: "Bartlesville",
      state: "OK",
      propertyType: "Vacant lot",
      use: "Rental housing",
      programs: [
        "Oklahoma Increased Housing Program (OHFA)",
        "CDBG Small Cities",
        "LIHTC",
        "HOME",
      ],
    },
    {
      id: "orlando-orange",
      address: "1000 N Orange Ave",
      city: "Orlando",
      state: "FL",
      propertyType: "Housing development",
      use: "Affordable housing",
      programs: ["City of Orlando CDBG", "HOME", "SHIP"],
    },
    {
      id: "baltimore-gold",
      address: "572 Gold St",
      city: "Baltimore",
      state: "MD",
      propertyType: "Housing development",
      use: "Affordable housing",
      programs: [
        "Baltimore CDBG/HOME",
        "Maryland LIHTC",
        "Affordable Housing Trust Fund",
        "City-Wide Affordable Housing TIF",
      ],
    },
  ],
  stats: {
    transcriptsThisMonth: 18,
    awaitingApproval: 7,
    reportsGenerated: 12,
  },
  transcripts: [
    {
      id: "transcript-1",
      organization: "Bartlesville Housing Trust",
      callDate: "Sep 19, 2026",
      projectId: "bartlesville-morton",
      projectLabel: "316 S Morton Ave, Bartlesville, OK",
      programs: ["Oklahoma Increased Housing Program (OHFA)", "CDBG Small Cities"],
      status: "ready",
      rawText:
        "We walked through the Morton Avenue lot today. It's a vacant parcel we acquired last fall, zoned residential, and the plan is two duplexes for long-term rental. The city has been supportive — Bartlesville qualifies as a small city under CDBG, so infrastructure and site prep could be covered there.\n\nOn the OHFA side, the Oklahoma Increased Housing Program looks like the strongest fit. The program is aimed squarely at communities like ours that haven't kept pace with housing demand, and a rental duplex project on infill land checks the boxes. We'll need to confirm the income targeting, but our tenants would fall well within the limits.\n\nTiming-wise, we'd like to close the funding package before winter so site work can start in spring. I'll send over the survey and the pro forma by Friday, and we should talk through whether LIHTC layering makes sense or overcomplicates a project this size.",
    },
    {
      id: "transcript-2",
      organization: "Central Florida Community Land Trust",
      callDate: "Sep 18, 2026",
      projectId: "orlando-orange",
      projectLabel: "1000 N Orange Ave, Orlando, FL",
      programs: ["City of Orlando CDBG", "HOME", "SHIP"],
      status: "approved",
      rawText:
        "The Orange Avenue development is moving into predevelopment. Twenty-four units of affordable rental, with eight set aside at 30% AMI. The City of Orlando CDBG allocation is our anchor for acquisition and soft costs, and we've had good conversations with the housing division about timing.\n\nSHIP funds through Orange County would cover down the affordability gap — we're thinking rental assistance reserves and possibly some construction. HOME is the piece we need to structure carefully; the city's HOME allocation is competitive this cycle, so we want our application airtight.\n\nMain open item: the environmental review needs to be scheduled before we can draw any federal dollars. I'll coordinate with the city's compliance team this week and get us on their calendar.",
    },
    {
      id: "transcript-3",
      organization: "East Baltimore Development Inc.",
      callDate: "Sep 18, 2026",
      projectId: "baltimore-gold",
      projectLabel: "572 Gold St, Baltimore, MD",
      programs: ["Baltimore CDBG/HOME", "Maryland LIHTC"],
      status: "extracting",
      rawText:
        "Gold Street is our biggest undertaking yet — a 40-unit rehab of a vacant industrial-adjacent building. We're layering Baltimore's CDBG/HOME entitlement dollars with a Maryland LIHTC award, and the Affordable Housing Trust Fund has indicated interest in a soft second.\n\nThe TIF district question came up again. The City-Wide Affordable Housing TIF could rebate a meaningful share of the tax increment, but the council process is slow and we can't count it in the base sources and uses. Treat it as upside.\n\nThe Maryland LIHTC application deadline is the pin in the calendar. Everything else — the HOME commitment, the trust fund term sheet — needs to be at least conditional before we file. I'll circulate the draft capital stack for comments by end of week.",
    },
    {
      id: "transcript-4",
      organization: "Tulsa NeighborWorks Alliance",
      callDate: "Sep 17, 2026",
      projectId: "bartlesville-morton",
      projectLabel: "316 S Morton Ave, Bartlesville, OK",
      programs: ["HOME", "LIHTC"],
      status: "new",
      rawText:
        "Quick call to compare notes on the Bartlesville lot since we're advising the housing trust on structure. Their instinct is to keep it simple — OHFA plus CDBG Small Cities — and I agree that's the cleanest path for two duplexes.\n\nIf they ever scale past four units, a small LIHTC allocation through OHFA becomes viable, but the compliance burden on a project this small rarely pencils. HOME is a maybe: the state HOME set-aside could fill a gap if construction bids come in high, but it adds Davis-Bacon questions they should price in now.\n\nNo action items on our side beyond staying available as a sounding board. They're targeting a spring groundbreaking.",
    },
    {
      id: "transcript-5",
      organization: "Prince George's Housing Initiative",
      callDate: "Sep 15, 2026",
      projectId: "baltimore-gold",
      projectLabel: "572 Gold St, Baltimore, MD",
      programs: ["Affordable Housing Trust Fund", "City-Wide Affordable Housing TIF"],
      status: "ready",
      rawText:
        "We compared our Prince George's County pipeline with what EBDI is doing on Gold Street — similar vintage buildings, similar layering challenges. Their reliance on the Affordable Housing Trust Fund for the soft second mirrors our Hyattsville project from two years ago.\n\nThe TIF discussion was useful. Baltimore's City-Wide Affordable Housing TIF is structurally different from anything we have in Maryland's suburbs, and the lesson is to model the increment conservatively. They estimated the rebate at roughly 60% of the increment over fifteen years, which feels right.\n\nWe swapped contact info for our respective bond counsel. If their TIF closes first, the precedent helps every affordable project in the city.",
    },
    {
      id: "transcript-6",
      organization: "Sarasota Gulf Coast Housing Corp",
      callDate: "Sep 12, 2026",
      projectId: "orlando-orange",
      projectLabel: "1000 N Orange Ave, Orlando, FL",
      programs: ["SHIP", "HOME"],
      status: "approved",
      rawText:
        "Mostly a peer-learning call. Sarasota's SHIP allocation behaves differently from Orange County's — ours skews toward homeownership, theirs toward rental — so the Orlando project's use of SHIP for rental reserves isn't something we could replicate directly.\n\nOn HOME, we shared our experience with the competitive cycle. The applications that win tend to show committed match, a completed environmental review, and a services plan for the 30% AMI units. Orlando has two of the three; the environmental review is their critical path.\n\nAgreed to reconnect after the state's SHIP workshop in October. No funding overlap between our projects, so this stays an information-sharing relationship.",
    },
  ],
  extractions: [
    {
      id: "ex-1",
      transcriptId: "transcript-1",
      category: "program",
      title: "Oklahoma Increased Housing Program (OHFA)",
      body:
        "0% interest construction loan administered by OHFA for communities with unmet housing demand. Discussed as the anchor source for the Morton Ave duplexes.",
      facts: [
        "0% interest construction loan",
        "Up to $3M or 85% of total development cost, whichever is less",
        "Project size 5–200 units",
        "Construction must begin within 9 months of award",
      ],
      routing: "program-level",
      status: "pending",
      confidence: "High",
    },
    {
      id: "ex-2",
      transcriptId: "transcript-1",
      category: "program",
      title: "CDBG Small Cities (Oklahoma Commerce)",
      body:
        "State-administered CDBG allocation for non-entitlement communities. Discussed for infrastructure and site preparation on the vacant parcel.",
      facts: [
        "Bartlesville participates as a non-entitlement small city",
        "Eligible for site prep, water/sewer, and street work",
        "Annual competitive application cycle",
      ],
      routing: "program-level",
      status: "pending",
      confidence: "High",
    },
    {
      id: "ex-3",
      transcriptId: "transcript-1",
      category: "note",
      title: "The city applies for CDBG Small Cities — not the developer",
      body:
        "Bartlesville is a CDBG Small Cities community, so the city is the applicant of record and the developer is a subrecipient. Developers who apply directly get screened out. Start with the city's Community Development office at least one cycle ahead.",
      routing: "program-level",
      status: "pending",
      confidence: "High",
    },
    {
      id: "ex-4",
      transcriptId: "transcript-1",
      category: "note",
      title: "LIHTC layering rarely pencils below four units",
      body:
        "For a two-duplex infill project, the compliance and syndication cost of a small LIHTC allocation usually outweighs the equity raised. Keep the stack to OHFA plus CDBG unless unit count scales.",
      routing: "program-level",
      status: "pending",
      confidence: "Medium",
    },
    {
      id: "ex-5",
      transcriptId: "transcript-1",
      category: "contact",
      title: "Larry Curtis",
      body: "Community Development Director, City of Bartlesville",
      facts: ["918.338.4238", "Owns the CDBG Small Cities application for the city"],
      routing: "program-level",
      status: "pending",
      confidence: "High",
    },
    {
      id: "ex-6",
      transcriptId: "transcript-1",
      category: "contact",
      title: "Dana Whitfield",
      body: "Executive Director, Bartlesville Housing Trust",
      facts: ["dana@bartlesvillehousingtrust.org", "Site owner and project sponsor"],
      routing: "site-level",
      status: "pending",
      confidence: "Medium",
    },
    {
      id: "ex-7",
      transcriptId: "transcript-1",
      category: "question",
      title: "Does the parcel need a replat before permitting?",
      body:
        "Two duplexes on a single lot may require a replat or lot split. Not resolved on the call — city planning to confirm.",
      routing: "site-level",
      status: "pending",
      confidence: "Medium",
    },
    {
      id: "ex-8",
      transcriptId: "transcript-1",
      category: "question",
      title: "What income targeting applies under the OHFA program this cycle?",
      body:
        "The sponsor believes tenants fall well within limits, but the current AMI targeting table was not confirmed during the call.",
      routing: "program-level",
      status: "pending",
      confidence: "Medium",
    },
    {
      id: "ex-9",
      transcriptId: "transcript-5",
      category: "program",
      title: "City-Wide Affordable Housing TIF (Baltimore)",
      body:
        "Rebates a share of the tax increment to affordable projects. Council approval process is slow; model conservatively and treat as upside, not a base source.",
      facts: ["Estimated rebate ~60% of increment over 15 years", "Requires City Council action"],
      routing: "program-level",
      status: "pending",
      confidence: "Medium",
    },
    {
      id: "ex-10",
      transcriptId: "transcript-5",
      category: "note",
      title: "Trust Fund soft second is the standard Maryland pattern",
      body:
        "The Affordable Housing Trust Fund routinely fills the gap as a soft second behind LIHTC equity on vintage rehab deals of this size.",
      routing: "program-level",
      status: "pending",
      confidence: "Medium",
    },
    {
      id: "ex-11",
      transcriptId: "transcript-5",
      category: "question",
      title: "Is bond counsel engaged for the TIF structure?",
      body: "Contacts were swapped on the call but no engagement was confirmed.",
      routing: "site-level",
      status: "pending",
      confidence: "Medium",
    },
  ],
  activity: [
    {
      id: "activity-1",
      action: "Transcript approved",
      subject: "316 S Morton Ave",
      detail: "4 program references added to the knowledge base",
      occurredAt: "Today, 9:42 AM",
      status: "approved",
    },
    {
      id: "activity-2",
      action: "Review requested",
      subject: "572 Gold St",
      detail: "Maryland LIHTC eligibility note needs confirmation",
      occurredAt: "Yesterday, 4:18 PM",
      status: "review",
    },
    {
      id: "activity-3",
      action: "Report generated",
      subject: "1000 N Orange Ave",
      detail: "Funding program summary",
      occurredAt: "Yesterday, 11:06 AM",
      status: "generated",
    },
    {
      id: "activity-4",
      action: "Program updated",
      subject: "316 S Morton Ave",
      detail: "Oklahoma Increased Housing Program (OHFA)",
      occurredAt: "Sep 17, 2:31 PM",
      status: "updated",
    },
  ],
};

let state = initialData;
const listeners = new Set<() => void>();

export const consoleStore = {
  getSnapshot: () => state,
  getServerSnapshot: () => initialData,
  subscribe: (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  update: (updater: (current: ConsoleData) => ConsoleData) => {
    state = updater(state);
    listeners.forEach((listener) => listener());
  },
};

export function useConsoleData() {
  return useSyncExternalStore(
    consoleStore.subscribe,
    consoleStore.getSnapshot,
    consoleStore.getServerSnapshot,
  );
}

export function getProgramCount(data: ConsoleData) {
  return new Set(data.projects.flatMap((project) => project.programs)).size;
}