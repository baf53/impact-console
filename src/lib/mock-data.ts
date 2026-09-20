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

export type JurisdictionLevel = "Federal" | "State" | "Local" | "Quasi";

export type SourceDocument = {
  id: string;
  title: string;
  kind: "Regulation" | "Consolidated Plan" | "Annual Action Plan" | "Guidelines" | "NOFA";
  citation: string;
  approvedOn: string;
};

export type PractitionerNote = {
  id: string;
  text: string;
  sourceCall: string;
  callDate: string;
  routing: RoutingLevel;
};

export type ProgramContact = {
  id: string;
  name: string;
  title: string;
  org: string;
  phone?: string;
  email?: string;
};

export type ProgramAttachment = {
  id: string;
  name: string;
  type: string;
  size: string;
};

export type KnowledgeProgram = {
  id: string;
  name: string;
  administrator: string;
  level: JurisdictionLevel;
  jurisdiction: string;
  cities: string[];
  coverage: number;
  funds: string;
  overview: string;
  documents: SourceDocument[];
  notes: PractitionerNote[];
  contacts: ProgramContact[];
  attachments: ProgramAttachment[];
};

export type Citation = {
  id: string;
  number: number;
  documentTitle: string;
  issuingBody: string;
  date: string;
  page: string;
  url?: string;
  isPractitionerKnowledge: boolean;
};

export type AssistantMessage = {
  role: "user" | "assistant";
  text: string;
  citations?: Citation[];
};

export type AnswerRating = "good" | "needs-work" | "wrong";

export type FailureCause = "retrieval" | "prompt" | "not-loaded";

export type RetrievedChunk = {
  id: string;
  documentTitle: string;
  excerpt: string;
  page: string;
  score: number;
  used: boolean;
};

export type AssistantAnswer = {
  id: string;
  projectId: string;
  projectLabel: string;
  question: string;
  coverage: "full" | "partial" | "thin";
  messages: AssistantMessage[];
  loggedAt?: string;
  askedOn?: string;
  rating?: AnswerRating;
  failureCause?: FailureCause;
  reviewNote?: string;
  retrievedChunks?: RetrievedChunk[];
  promoted?: boolean;
  isRefusal?: boolean;
};

export type GoldenEntry = {
  id: string;
  sourceAnswerId?: string;
  projectLabel: string;
  question: string;
  expectedAnswer: string;
  citations: string[];
  addedOn: string;
  lastCheck: "passing" | "failing";
};

export type ConsoleData = {
  projects: Project[];
  activity: Activity[];
  transcripts: Transcript[];
  extractions: ExtractionItem[];
  programsLibrary: KnowledgeProgram[];
  answerLog: AssistantAnswer[];
  goldenSet: GoldenEntry[];
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
  programsLibrary: [
    {
      "id": "ok-increased-housing",
      "name": "Oklahoma Increased Housing Program",
      "administrator": "Oklahoma Housing Finance Agency (OHFA)",
      "level": "State",
      "jurisdiction": "Oklahoma",
      "cities": [
        "Bartlesville",
        "Tulsa",
        "Enid",
        "Ardmore"
      ],
      "coverage": 92,
      "funds": "0% interest construction financing for new rental and for-sale housing in communities with documented unmet demand.",
      "overview": "Provides a 0% interest construction loan of up to $3M or 85% of total development cost, whichever is less, for projects of 5 to 200 units. Construction must begin within 9 months of award. Administered statewide by OHFA; developers apply directly, with a letter of support from the host municipality.",
      "documents": [
        {
          "id": "doc-1",
          "title": "Increased Housing Program Guidelines, PY2026",
          "kind": "Guidelines",
          "citation": "pp. 4\u201311, \u00a72.1 Eligible Applicants",
          "approvedOn": "Sep 12, 2026"
        },
        {
          "id": "doc-2",
          "title": "OHFA Notice of Funding Availability",
          "kind": "NOFA",
          "citation": "p. 2, Award ceilings and timelines",
          "approvedOn": "Sep 12, 2026"
        },
        {
          "id": "doc-3",
          "title": "Oklahoma Administrative Code Title 330",
          "kind": "Regulation",
          "citation": "\u00a7330:36-3, Loan terms",
          "approvedOn": "Aug 30, 2026"
        }
      ],
      "notes": [
        {
          "id": "n-1",
          "text": "The 9-month construction start clock runs from award letter date, not closing. Sponsors who wait on permits routinely burn three months of it.",
          "sourceCall": "Bartlesville Housing Trust",
          "callDate": "Sep 19, 2026",
          "routing": "program-level"
        },
        {
          "id": "n-2",
          "text": "OHFA weighs a municipal letter of support heavily on smaller rural deals even though it is not scored explicitly.",
          "sourceCall": "Tulsa NeighborWorks Alliance",
          "callDate": "Sep 17, 2026",
          "routing": "program-level"
        },
        {
          "id": "n-3",
          "text": "LIHTC layering rarely pencils below four units \u2014 compliance cost outweighs the equity raised.",
          "sourceCall": "Bartlesville Housing Trust",
          "callDate": "Sep 19, 2026",
          "routing": "program-level"
        }
      ],
      "contacts": [
        {
          "id": "c-1",
          "name": "Renee Patterson",
          "title": "Program Manager, Multifamily",
          "org": "Oklahoma Housing Finance Agency",
          "phone": "405.419.8100",
          "email": "rpatterson@ohfa.org"
        },
        {
          "id": "c-2",
          "name": "Larry Curtis",
          "title": "Community Development Director",
          "org": "City of Bartlesville",
          "phone": "918.338.4238"
        }
      ],
      "attachments": [
        {
          "id": "a-1",
          "name": "IHP-Application-2026.pdf",
          "type": "Application form",
          "size": "1.2 MB"
        },
        {
          "id": "a-2",
          "name": "Site-Control-Checklist.docx",
          "type": "Checklist",
          "size": "48 KB"
        }
      ]
    },
    {
      "id": "cdbg-small-cities",
      "name": "CDBG Small Cities",
      "administrator": "Oklahoma Department of Commerce",
      "level": "Federal",
      "jurisdiction": "Oklahoma (non-entitlement)",
      "cities": [
        "Bartlesville",
        "Ponca City",
        "Duncan",
        "Guymon"
      ],
      "coverage": 88,
      "funds": "Infrastructure, site preparation, and community facilities in non-entitlement communities.",
      "overview": "HUD's Community Development Block Grant for non-entitlement areas, passed through the state. The municipality is the applicant of record; developers participate as subrecipients. Annual competitive cycle with national objective and environmental review requirements.",
      "documents": [
        {
          "id": "doc-4",
          "title": "24 CFR Part 570 Subpart I",
          "kind": "Regulation",
          "citation": "\u00a7570.483, National objectives",
          "approvedOn": "Sep 10, 2026"
        },
        {
          "id": "doc-5",
          "title": "Oklahoma Small Cities CDBG Application Guide",
          "kind": "Guidelines",
          "citation": "pp. 17\u201324, Eligible activities",
          "approvedOn": "Sep 10, 2026"
        },
        {
          "id": "doc-6",
          "title": "State of Oklahoma Consolidated Plan 2025\u20132029",
          "kind": "Consolidated Plan",
          "citation": "pp. 112\u2013118, Housing priorities",
          "approvedOn": "Aug 28, 2026"
        },
        {
          "id": "doc-7",
          "title": "Annual Action Plan PY2026",
          "kind": "Annual Action Plan",
          "citation": "p. 33, Small Cities set-aside",
          "approvedOn": "Aug 28, 2026"
        }
      ],
      "notes": [
        {
          "id": "n-4",
          "text": "Bartlesville is a CDBG Small Cities community, so the city applies, not the developer. Developers who apply directly get screened out.",
          "sourceCall": "Bartlesville Housing Trust",
          "callDate": "Sep 19, 2026",
          "routing": "program-level"
        },
        {
          "id": "n-5",
          "text": "Start with the city's Community Development office at least one cycle ahead \u2014 the city has to budget staff time for administration.",
          "sourceCall": "Bartlesville Housing Trust",
          "callDate": "Sep 19, 2026",
          "routing": "program-level"
        },
        {
          "id": "n-6",
          "text": "Davis-Bacon applies once construction dollars are involved; price prevailing wage into bids from the start.",
          "sourceCall": "Tulsa NeighborWorks Alliance",
          "callDate": "Sep 17, 2026",
          "routing": "program-level"
        }
      ],
      "contacts": [
        {
          "id": "c-3",
          "name": "Larry Curtis",
          "title": "Community Development Director",
          "org": "City of Bartlesville",
          "phone": "918.338.4238"
        },
        {
          "id": "c-4",
          "name": "Marcus Bell",
          "title": "CDBG Program Officer",
          "org": "Oklahoma Department of Commerce",
          "email": "marcus.bell@okcommerce.gov"
        }
      ],
      "attachments": [
        {
          "id": "a-3",
          "name": "Small-Cities-Application-PY2026.pdf",
          "type": "Application form",
          "size": "2.4 MB"
        },
        {
          "id": "a-4",
          "name": "Environmental-Review-Checklist.pdf",
          "type": "Checklist",
          "size": "310 KB"
        }
      ]
    },
    {
      "id": "orlando-cdbg",
      "name": "City of Orlando CDBG",
      "administrator": "City of Orlando Housing & Community Development",
      "level": "Local",
      "jurisdiction": "Orlando, FL",
      "cities": [
        "Orlando"
      ],
      "coverage": 64,
      "funds": "Acquisition, soft costs, and rehabilitation for affordable housing inside city limits.",
      "overview": "Orlando's entitlement CDBG allocation. Anchors acquisition and predevelopment for affordable rental projects. Environmental review must be complete before any federal drawdown.",
      "documents": [
        {
          "id": "doc-8",
          "title": "City of Orlando Consolidated Plan 2023\u20132027",
          "kind": "Consolidated Plan",
          "citation": "pp. 78\u201384, Rental priorities",
          "approvedOn": "Sep 08, 2026"
        },
        {
          "id": "doc-9",
          "title": "Orlando Annual Action Plan FY2026",
          "kind": "Annual Action Plan",
          "citation": "p. 21, CDBG allocation table",
          "approvedOn": "Sep 08, 2026"
        }
      ],
      "notes": [
        {
          "id": "n-7",
          "text": "Environmental review scheduling is the practical critical path, not the application itself.",
          "sourceCall": "Central Florida Community Land Trust",
          "callDate": "Sep 18, 2026",
          "routing": "program-level"
        }
      ],
      "contacts": [
        {
          "id": "c-5",
          "name": "Alicia Reyes",
          "title": "Housing Division Manager",
          "org": "City of Orlando",
          "phone": "407.246.2708"
        }
      ],
      "attachments": [
        {
          "id": "a-5",
          "name": "Orlando-CDBG-Application.pdf",
          "type": "Application form",
          "size": "980 KB"
        }
      ]
    },
    {
      "id": "florida-ship",
      "name": "SHIP (State Housing Initiatives Partnership)",
      "administrator": "Florida Housing Finance Corporation",
      "level": "State",
      "jurisdiction": "Florida",
      "cities": [
        "Orlando",
        "Sarasota"
      ],
      "coverage": 58,
      "funds": "Locally administered gap financing, rental reserves, and homeownership assistance.",
      "overview": "State funds distributed to counties and eligible cities by formula, with each jurisdiction adopting its own Local Housing Assistance Plan. Uses vary widely by county \u2014 Orange County leans rental, Sarasota leans homeownership.",
      "documents": [
        {
          "id": "doc-10",
          "title": "Florida Statutes Chapter 420 Part VII",
          "kind": "Regulation",
          "citation": "\u00a7420.9075, Local housing assistance plans",
          "approvedOn": "Sep 05, 2026"
        },
        {
          "id": "doc-11",
          "title": "Orange County Local Housing Assistance Plan",
          "kind": "Guidelines",
          "citation": "pp. 12\u201319, Rental strategies",
          "approvedOn": "Sep 05, 2026"
        }
      ],
      "notes": [
        {
          "id": "n-8",
          "text": "SHIP strategy menus differ county to county \u2014 never assume one county's rental reserve strategy exists next door.",
          "sourceCall": "Sarasota Gulf Coast Housing Corp",
          "callDate": "Sep 12, 2026",
          "routing": "program-level"
        }
      ],
      "contacts": [],
      "attachments": []
    },
    {
      "id": "baltimore-cdbg-home",
      "name": "Baltimore CDBG / HOME",
      "administrator": "Baltimore City Department of Housing & Community Development",
      "level": "Local",
      "jurisdiction": "Baltimore, MD",
      "cities": [
        "Baltimore"
      ],
      "coverage": 71,
      "funds": "Entitlement CDBG and HOME dollars for rehabilitation and affordable rental production.",
      "overview": "Baltimore's combined entitlement allocation. HOME commitments are typically conditional until the state LIHTC award is announced.",
      "documents": [
        {
          "id": "doc-12",
          "title": "Baltimore Consolidated Plan 2024\u20132028",
          "kind": "Consolidated Plan",
          "citation": "pp. 94\u2013101, Rehabilitation priorities",
          "approvedOn": "Sep 02, 2026"
        },
        {
          "id": "doc-13",
          "title": "24 CFR Part 92 (HOME)",
          "kind": "Regulation",
          "citation": "\u00a792.205, Eligible activities",
          "approvedOn": "Aug 22, 2026"
        }
      ],
      "notes": [
        {
          "id": "n-9",
          "text": "HOME commitment letters here are conditional on the Maryland LIHTC award; sequence the applications accordingly.",
          "sourceCall": "East Baltimore Development Inc.",
          "callDate": "Sep 18, 2026",
          "routing": "program-level"
        }
      ],
      "contacts": [
        {
          "id": "c-6",
          "name": "Denise Holloway",
          "title": "Deputy Commissioner",
          "org": "Baltimore City DHCD",
          "email": "denise.holloway@baltimorecity.gov"
        }
      ],
      "attachments": []
    },
    {
      "id": "maryland-lihtc",
      "name": "Maryland LIHTC",
      "administrator": "Maryland Department of Housing & Community Development",
      "level": "State",
      "jurisdiction": "Maryland",
      "cities": [
        "Baltimore"
      ],
      "coverage": 46,
      "funds": "9% and 4% low-income housing tax credit allocations for rental production and rehabilitation.",
      "overview": "Competitive 9% round plus non-competitive 4% credits paired with bonds. The application deadline governs the sequencing of every other source in a Maryland capital stack.",
      "documents": [
        {
          "id": "doc-14",
          "title": "Maryland Qualified Allocation Plan 2026",
          "kind": "Guidelines",
          "citation": "pp. 30\u201344, Scoring criteria",
          "approvedOn": "Aug 19, 2026"
        }
      ],
      "notes": [],
      "contacts": [],
      "attachments": []
    },
    {
      "id": "md-trust-fund",
      "name": "Maryland Affordable Housing Trust Fund",
      "administrator": "Maryland DHCD / Affordable Housing Trust",
      "level": "Quasi",
      "jurisdiction": "Maryland",
      "cities": [
        "Baltimore"
      ],
      "coverage": 18,
      "funds": "Soft second financing and gap funding for deeply affordable units.",
      "overview": "Frequently used as a soft second behind LIHTC equity on vintage rehab deals. Program terms in the corpus are incomplete \u2014 current award ceilings, application windows, and underwriting standards have not been confirmed against a source document.",
      "documents": [],
      "notes": [],
      "contacts": [],
      "attachments": []
    },
    {
      "id": "baltimore-tif",
      "name": "City-Wide Affordable Housing TIF",
      "administrator": "Baltimore Development Corporation",
      "level": "Quasi",
      "jurisdiction": "Baltimore, MD",
      "cities": [
        "Baltimore"
      ],
      "coverage": 34,
      "funds": "Tax increment rebates supporting affordable housing production.",
      "overview": "Rebates a share of the incremental property tax to qualifying affordable projects. Council approval makes timing unpredictable, so it is modeled as upside rather than a base source.",
      "documents": [
        {
          "id": "doc-15",
          "title": "Baltimore City Council Ordinance 22-140",
          "kind": "Regulation",
          "citation": "\u00a74, Eligible affordability thresholds",
          "approvedOn": "Aug 14, 2026"
        }
      ],
      "notes": [
        {
          "id": "n-10",
          "text": "Model the increment conservatively \u2014 roughly 60% of the increment over fifteen years is the realistic planning assumption.",
          "sourceCall": "Prince George's Housing Initiative",
          "callDate": "Sep 15, 2026",
          "routing": "program-level"
        }
      ],
      "contacts": [],
      "attachments": []
    }
  ],
  answerLog: [
    {
      id: "answer-1",
      projectId: "bartlesville-morton",
      projectLabel: "316 S Morton Ave, Bartlesville, OK",
      question:
        "What funding can I use to build affordable housing on this lot?",
      coverage: "full",
      messages: [
        {
          role: "user",
          text: "What funding can I use to build affordable housing on this lot?",
        },
        {
          role: "assistant",
          text: "For 316 S Morton Ave in Bartlesville, the strongest fit is the Oklahoma Increased Housing Program (OHFA), which offers a 0% interest construction loan of up to $3 million or 85% of total development cost for rental projects of 5–200 units.[1] Because Bartlesville is a CDBG Small Cities community, site preparation and infrastructure can also be pursued through the Oklahoma Department of Commerce, but the City of Bartlesville must be the applicant of record—not the developer.[2][3] For a small two-duplex project, LIHTC layering is unlikely to pencil due to compliance cost, so keep the capital stack to OHFA plus CDBG Small Cities unless the unit count scales.[4]",
          citations: [
            {
              id: "cite-1",
              number: 1,
              documentTitle: "Increased Housing Program Guidelines, PY2026",
              issuingBody: "Oklahoma Housing Finance Agency",
              date: "2026",
              page: "pp. 4–11, §2.1 Eligible Applicants",
              url: "https://www.ok.gov/ohfa",
              isPractitionerKnowledge: false,
            },
            {
              id: "cite-2",
              number: 2,
              documentTitle: "Oklahoma Small Cities CDBG Application Guide",
              issuingBody: "Oklahoma Department of Commerce",
              date: "2026",
              page: "pp. 17–24, Eligible activities",
              url: "https://www.okcommerce.gov",
              isPractitionerKnowledge: false,
            },
            {
              id: "cite-3",
              number: 3,
              documentTitle: "Practitioner note: Bartlesville CDBG Small Cities applicant",
              issuingBody: "Collective Impact practitioner guidance",
              date: "Sep 19, 2026",
              page: "Bartlesville Housing Trust call",
              isPractitionerKnowledge: true,
            },
            {
              id: "cite-4",
              number: 4,
              documentTitle: "Practitioner note: LIHTC layering on small projects",
              issuingBody: "Collective Impact practitioner guidance",
              date: "Sep 19, 2026",
              page: "Bartlesville Housing Trust call",
              isPractitionerKnowledge: true,
            },
          ],
        },
      ],
      askedOn: "Sep 19, 2026",
      rating: "good",
      promoted: true,
      retrievedChunks: [
        {
          id: "chunk-1",
          documentTitle: "Increased Housing Program Guidelines, PY2026",
          excerpt:
            "Awards are structured as 0% interest construction loans not to exceed $3,000,000 or 85% of total development cost, whichever is less.",
          page: "p. 7, §2.1",
          score: 0.94,
          used: true,
        },
        {
          id: "chunk-2",
          documentTitle: "Oklahoma Small Cities CDBG Application Guide",
          excerpt:
            "Units of general local government in non-entitlement areas are the sole eligible applicants; sub-recipients may carry out activities.",
          page: "p. 19",
          score: 0.88,
          used: true,
        },
        {
          id: "chunk-3",
          documentTitle: "Practitioner note — Bartlesville Housing Trust call",
          excerpt:
            "Bartlesville is a Small Cities community, so the city applies, not the developer.",
          page: "Sep 19, 2026 call",
          score: 0.83,
          used: true,
        },
      ],
    },
    {
      id: "answer-2",
      projectId: "bartlesville-morton",
      projectLabel: "316 S Morton Ave, Bartlesville, OK",
      question: "Can the developer apply directly for CDBG Small Cities funds?",
      coverage: "full",
      askedOn: "Sep 18, 2026",
      rating: "good",
      promoted: true,
      messages: [
        {
          role: "user",
          text: "Can the developer apply directly for CDBG Small Cities funds?",
        },
        {
          role: "assistant",
          text: "No. In Oklahoma's Small Cities CDBG program the unit of general local government is the only eligible applicant, so the City of Bartlesville must sponsor and submit the application. The developer participates as a sub-recipient or project partner.[1][2]",
        },
      ],
      retrievedChunks: [
        {
          id: "chunk-4",
          documentTitle: "Oklahoma Small Cities CDBG Application Guide",
          excerpt:
            "Eligible applicants: units of general local government in non-entitlement areas.",
          page: "p. 19",
          score: 0.95,
          used: true,
        },
        {
          id: "chunk-5",
          documentTitle: "Practitioner note — Bartlesville Housing Trust call",
          excerpt: "City applies, not the developer. Confirmed with Larry Curtis.",
          page: "Sep 19, 2026 call",
          score: 0.9,
          used: true,
        },
      ],
    },
    {
      id: "answer-3",
      projectId: "bartlesville-morton",
      projectLabel: "316 S Morton Ave, Bartlesville, OK",
      question: "What is the deadline for the next OHFA funding round?",
      coverage: "thin",
      askedOn: "Sep 17, 2026",
      rating: "wrong",
      failureCause: "not-loaded",
      reviewNote:
        "The PY2026 NOFA has not been loaded into the corpus, so the assistant answered from an older cycle.",
      messages: [
        {
          role: "user",
          text: "What is the deadline for the next OHFA funding round?",
        },
        {
          role: "assistant",
          text: "Applications for the Increased Housing Program are due March 1, 2025, with awards announced in May.",
        },
      ],
      retrievedChunks: [
        {
          id: "chunk-6",
          documentTitle: "Increased Housing Program Guidelines, PY2026",
          excerpt:
            "Application cycles are announced by separate notice of funding availability.",
          page: "p. 3",
          score: 0.61,
          used: true,
        },
      ],
    },
    {
      id: "answer-4",
      projectId: "bartlesville-morton",
      projectLabel: "316 S Morton Ave, Bartlesville, OK",
      question: "Does this parcel qualify for a federal historic tax credit?",
      coverage: "partial",
      askedOn: "Sep 16, 2026",
      rating: "good",
      isRefusal: true,
      promoted: true,
      messages: [
        {
          role: "user",
          text: "Does this parcel qualify for a federal historic tax credit?",
        },
        {
          role: "assistant",
          text: "I don't have a source in the knowledge base that covers historic tax credit eligibility for this parcel. The lot is currently vacant, and the federal credit applies to certified historic structures, so I can't confirm eligibility without a documented determination.",
        },
      ],
      retrievedChunks: [
        {
          id: "chunk-7",
          documentTitle: "Bartlesville parcel record",
          excerpt: "316 S Morton Ave — vacant lot, no structure on record.",
          page: "Parcel data",
          score: 0.72,
          used: true,
        },
      ],
    },
    {
      id: "answer-5",
      projectId: "orlando-orange",
      projectLabel: "1000 N Orange Ave, Orlando, FL",
      question: "How much SHIP funding can a single rental project receive?",
      coverage: "partial",
      askedOn: "Sep 15, 2026",
      rating: "needs-work",
      failureCause: "retrieval",
      reviewNote:
        "The Orlando Local Housing Assistance Plan is in the corpus but the per-unit subsidy table wasn't retrieved.",
      messages: [
        {
          role: "user",
          text: "How much SHIP funding can a single rental project receive?",
        },
        {
          role: "assistant",
          text: "SHIP award limits are set locally by each participating jurisdiction's Local Housing Assistance Plan; Orlando's specific per-unit cap isn't stated in the sources I found.[1]",
        },
      ],
      retrievedChunks: [
        {
          id: "chunk-8",
          documentTitle: "Florida SHIP Program Overview",
          excerpt:
            "Maximum award amounts are established in the Local Housing Assistance Plan adopted by each jurisdiction.",
          page: "p. 5",
          score: 0.79,
          used: true,
        },
        {
          id: "chunk-9",
          documentTitle: "Orlando Local Housing Assistance Plan FY2026-2029",
          excerpt: "Rental development strategy: maximum award of $75,000 per unit.",
          page: "p. 31",
          score: 0.44,
          used: false,
        },
      ],
    },
    {
      id: "answer-6",
      projectId: "orlando-orange",
      projectLabel: "1000 N Orange Ave, Orlando, FL",
      question: "Is 1000 N Orange Ave inside a CDBG-eligible target area?",
      coverage: "full",
      askedOn: "Sep 14, 2026",
      rating: "good",
      messages: [
        {
          role: "user",
          text: "Is 1000 N Orange Ave inside a CDBG-eligible target area?",
        },
        {
          role: "assistant",
          text: "Yes. The site falls within a low- and moderate-income area identified in the City of Orlando Consolidated Plan, which makes area-benefit CDBG activities eligible at this location.[1]",
        },
      ],
      retrievedChunks: [
        {
          id: "chunk-10",
          documentTitle: "City of Orlando Consolidated Plan 2025–2029",
          excerpt:
            "Target areas include census tracts along the N Orange Ave corridor meeting the 51% LMI threshold.",
          page: "pp. 62–64",
          score: 0.91,
          used: true,
        },
      ],
    },
    {
      id: "answer-7",
      projectId: "baltimore-gold",
      projectLabel: "572 Gold St, Baltimore, MD",
      question: "Can HOME and the Affordable Housing Trust Fund be layered here?",
      coverage: "partial",
      askedOn: "Sep 12, 2026",
      rating: "needs-work",
      failureCause: "prompt",
      reviewNote:
        "Right documents were retrieved, but the answer skipped the Trust Fund's affordability-period requirement.",
      messages: [
        {
          role: "user",
          text: "Can HOME and the Affordable Housing Trust Fund be layered here?",
        },
        {
          role: "assistant",
          text: "Yes, Baltimore routinely layers HOME with the Affordable Housing Trust Fund on rental projects; both are administered by DHCD.[1]",
        },
      ],
      retrievedChunks: [
        {
          id: "chunk-11",
          documentTitle: "Baltimore City Annual Action Plan FY2026",
          excerpt:
            "HOME funds are committed alongside local Trust Fund awards for qualifying rental developments.",
          page: "p. 44",
          score: 0.87,
          used: true,
        },
        {
          id: "chunk-12",
          documentTitle: "Affordable Housing Trust Fund Guidelines",
          excerpt:
            "Assisted units must remain affordable for a minimum of 30 years.",
          page: "p. 9",
          score: 0.81,
          used: true,
        },
      ],
    },
    {
      id: "answer-8",
      projectId: "baltimore-gold",
      projectLabel: "572 Gold St, Baltimore, MD",
      question: "What tax increment financing is available for this block?",
      coverage: "thin",
      askedOn: "Sep 10, 2026",
      messages: [
        {
          role: "user",
          text: "What tax increment financing is available for this block?",
        },
        {
          role: "assistant",
          text: "Baltimore's City-Wide Affordable Housing TIF supports affordable rental development, but the corpus does not yet include the district map or per-project terms, so I can't confirm availability for this block.",
        },
      ],
      retrievedChunks: [
        {
          id: "chunk-13",
          documentTitle: "City-Wide Affordable Housing TIF — summary memo",
          excerpt:
            "Program supports affordable rental development citywide; detailed terms to be issued.",
          page: "p. 2",
          score: 0.58,
          used: true,
        },
      ],
    },
  ],
  goldenSet: [
    {
      id: "golden-1",
      sourceAnswerId: "answer-2",
      projectLabel: "316 S Morton Ave, Bartlesville, OK",
      question: "Can the developer apply directly for CDBG Small Cities funds?",
      expectedAnswer:
        "No — Bartlesville is a Small Cities (non-entitlement) community, so the City must sponsor and submit the CDBG application. The developer participates as a sub-recipient or partner, not the applicant of record.",
      citations: [
        "Oklahoma Small Cities CDBG Application Guide, Oklahoma Department of Commerce, 2026, p. 19",
        "Collective Impact practitioner guidance — Bartlesville Housing Trust call, Sep 19, 2026",
      ],
      addedOn: "Sep 18, 2026",
      lastCheck: "passing",
    },
    {
      id: "golden-2",
      sourceAnswerId: "answer-1",
      projectLabel: "316 S Morton Ave, Bartlesville, OK",
      question: "What funding can I use to build affordable housing on this lot?",
      expectedAnswer:
        "The Oklahoma Increased Housing Program (OHFA) is the anchor source: a 0% interest construction loan up to $3M or 85% of total development cost for projects of 5–200 units. CDBG Small Cities can fund site prep and infrastructure, with the City as applicant.",
      citations: [
        "Increased Housing Program Guidelines, PY2026, Oklahoma Housing Finance Agency, pp. 4–11",
        "Oklahoma Small Cities CDBG Application Guide, Oklahoma Department of Commerce, pp. 17–24",
      ],
      addedOn: "Sep 19, 2026",
      lastCheck: "passing",
    },
    {
      id: "golden-3",
      sourceAnswerId: "answer-4",
      projectLabel: "316 S Morton Ave, Bartlesville, OK",
      question: "Does this parcel qualify for a federal historic tax credit?",
      expectedAnswer:
        "The assistant should refuse: the parcel is a vacant lot and the corpus holds no historic designation record, so eligibility cannot be confirmed. A correct answer declines rather than guessing.",
      citations: ["Bartlesville parcel record — vacant lot, no structure on file"],
      addedOn: "Sep 16, 2026",
      lastCheck: "failing",
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