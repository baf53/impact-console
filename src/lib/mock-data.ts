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

export type ConsoleData = {
  projects: Project[];
  activity: Activity[];
  transcripts: Transcript[];
  extractions: ExtractionItem[];
  programsLibrary: KnowledgeProgram[];
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