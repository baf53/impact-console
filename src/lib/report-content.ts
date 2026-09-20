import type { Citation, Report } from "@/lib/mock-data";

const bartlesvilleCitations: Citation[] = [
  {
    id: "rc-1",
    number: 1,
    documentTitle: "Increased Housing Program Guidelines, PY2026",
    issuingBody: "Oklahoma Housing Finance Agency",
    date: "2026",
    page: "pp. 4–11, §2.1 Eligible Applicants",
    url: "https://www.ok.gov/ohfa",
    isPractitionerKnowledge: false,
  },
  {
    id: "rc-2",
    number: 2,
    documentTitle: "Oklahoma Small Cities CDBG Application Guide",
    issuingBody: "Oklahoma Department of Commerce",
    date: "2026",
    page: "pp. 17–24, Eligible activities",
    url: "https://www.okcommerce.gov",
    isPractitionerKnowledge: false,
  },
  {
    id: "rc-3",
    number: 3,
    documentTitle: "Practitioner note: Bartlesville CDBG Small Cities applicant",
    issuingBody: "Collective Impact practitioner guidance",
    date: "Sep 19, 2026",
    page: "Bartlesville Housing Trust call",
    isPractitionerKnowledge: true,
  },
  {
    id: "rc-4",
    number: 4,
    documentTitle: "HOME Investment Partnerships Program, 24 CFR Part 92",
    issuingBody: "U.S. Department of Housing and Urban Development",
    date: "2025",
    page: "§92.250 Maximum per-unit subsidy",
    url: "https://www.ecfr.gov/current/title-24/part-92",
    isPractitionerKnowledge: false,
  },
  {
    id: "rc-5",
    number: 5,
    documentTitle: "Practitioner note: LIHTC layering on small projects",
    issuingBody: "Collective Impact practitioner guidance",
    date: "Sep 19, 2026",
    page: "Bartlesville Housing Trust call",
    isPractitionerKnowledge: true,
  },
];

const orlandoCitations: Citation[] = [
  {
    id: "rc-o1",
    number: 1,
    documentTitle: "City of Orlando Consolidated Plan 2025–2029",
    issuingBody: "City of Orlando Housing & Community Development",
    date: "2025",
    page: "pp. 62–64, Target areas",
    url: "https://www.orlando.gov",
    isPractitionerKnowledge: false,
  },
  {
    id: "rc-o2",
    number: 2,
    documentTitle: "Local Housing Assistance Plan FY2026–2029 (SHIP)",
    issuingBody: "City of Orlando",
    date: "2026",
    page: "p. 31, Rental development strategy",
    url: "https://www.orlando.gov",
    isPractitionerKnowledge: false,
  },
  {
    id: "rc-o3",
    number: 3,
    documentTitle: "Practitioner note: Orlando HOME commitment timing",
    issuingBody: "Collective Impact practitioner guidance",
    date: "Sep 16, 2026",
    page: "Orlando corridor call",
    isPractitionerKnowledge: true,
  },
];

const baltimoreCitations: Citation[] = [
  {
    id: "rc-b1",
    number: 1,
    documentTitle: "Baltimore City Annual Action Plan FY2026",
    issuingBody: "Baltimore City Department of Housing & Community Development",
    date: "2026",
    page: "p. 44, HOME and local funds",
    url: "https://dhcd.baltimorecity.gov",
    isPractitionerKnowledge: false,
  },
  {
    id: "rc-b2",
    number: 2,
    documentTitle: "Affordable Housing Trust Fund Guidelines",
    issuingBody: "Baltimore City Affordable Housing Trust Fund Commission",
    date: "2025",
    page: "p. 9, Affordability period",
    url: "https://dhcd.baltimorecity.gov",
    isPractitionerKnowledge: false,
  },
  {
    id: "rc-b3",
    number: 3,
    documentTitle: "Practitioner note: TIF is upside, not a base source",
    issuingBody: "Collective Impact practitioner guidance",
    date: "Sep 15, 2026",
    page: "Gold St rehab call",
    isPractitionerKnowledge: true,
  },
];

type Template = Omit<Report, "id" | "generatedOn">;

const templates: Record<string, Template> = {
  "bartlesville-morton": {
    projectId: "bartlesville-morton",
    projectLabel: "316 S Morton Ave, Bartlesville, OK",
    programCount: 4,
    parcelSummary:
      "316 S Morton Ave is a vacant infill lot in central Bartlesville, Washington County, Oklahoma, zoned for residential use and suited to a small rental development of two duplexes (4 units). Bartlesville is a non-entitlement community, so federal block grant dollars reach the site through the State of Oklahoma rather than a local entitlement allocation.[2] Water, sewer and street frontage are in place, and no structure stands on the parcel today.",
    focus: [
      "Lead with the Oklahoma Increased Housing Program — a 0% construction loan is the cheapest capital available for a project this size.[1]",
      "Engage the City of Bartlesville early: for CDBG Small Cities, the city is the applicant of record, not the developer.[3]",
      "Hold the unit count at or above the 5-unit program floor if OHFA financing is the anchor.[1]",
      "Treat LIHTC as out of scope at this scale — compliance cost outweighs the equity raised.[5]",
    ],
    programs: [
      {
        id: "rp-1",
        name: "Oklahoma Increased Housing Program (OHFA)",
        fit: "Strong",
        summary:
          "0% interest construction loan of up to $3,000,000 or 85% of total development cost, whichever is less, for rental projects of 5–200 units. Construction must begin within nine months of award.[1]",
        actions: [
          "Confirm the unit count reaches the 5-unit minimum before applying.",
          "Assemble a site control package and preliminary TDC budget.",
          "Schedule a pre-application call with OHFA multifamily staff.",
          "Line up a construction start date inside the 9-month window.",
        ],
      },
      {
        id: "rp-2",
        name: "CDBG Small Cities (Oklahoma Department of Commerce)",
        fit: "Conditional",
        summary:
          "State-administered block grant for non-entitlement communities, usable for site preparation, water and sewer, and street work. Only a unit of general local government may apply.[2][3]",
        actions: [
          "Meet with Larry Curtis, Community Development Director, City of Bartlesville (918.338.4238).",
          "Ask the city to carry the application with the developer as sub-recipient.",
          "Scope infrastructure costs separately so they are grant-eligible.",
          "Track the annual competitive cycle calendar.",
        ],
      },
      {
        id: "rp-3",
        name: "HOME Investment Partnerships (State of Oklahoma)",
        fit: "Likely",
        summary:
          "Gap financing for rental units serving households at or below 60% AMI, subject to per-unit subsidy limits and a long-term affordability period.[4]",
        actions: [
          "Model rents against the 60% AMI limit for Washington County.",
          "Confirm the per-unit subsidy cap for a 4-unit rental project.",
          "Budget for the affordability-period monitoring obligation.",
        ],
      },
      {
        id: "rp-4",
        name: "Low-Income Housing Tax Credit (LIHTC)",
        fit: "Conditional",
        summary:
          "Available in Oklahoma through OHFA, but at four units the syndication and compliance burden typically exceeds the equity raised. Revisit only if the unit count scales materially.[5]",
        actions: [
          "Revisit only above roughly 20 units.",
          "If scale changes, re-score against the current QAP.",
        ],
      },
    ],
    stacking:
      "The workable stack is OHFA construction financing as the anchor, city-sponsored CDBG Small Cities for site preparation and infrastructure, and State HOME as gap fill.[1][2][4] CDBG cannot pay for the same hard costs HOME covers, so scope them apart in the budget from day one. Because the city is the CDBG applicant, its timeline governs the critical path — start that conversation before the OHFA application, not after.[3] LIHTC is excluded at this scale.[5]",
    cashFlow: [
      { label: "Total development cost (est.)", value: "$1,180,000", note: "4 units, new construction" },
      { label: "OHFA construction loan", value: "$1,003,000", note: "85% of TDC, 0% interest" },
      { label: "CDBG Small Cities — site & infrastructure", value: "$120,000", note: "City-sponsored" },
      { label: "HOME gap financing", value: "$140,000", note: "Subject to per-unit cap" },
      { label: "Developer equity required", value: "$37,000", note: "Balance after sources" },
      { label: "Projected annual net operating income", value: "$46,400", note: "4 units at 60% AMI rents" },
      { label: "Debt service on permanent loan", value: "$0", note: "0% construction loan converts; no hard pay" },
    ],
    citations: bartlesvilleCitations,
  },
  "orlando-orange": {
    projectId: "orlando-orange",
    projectLabel: "1000 N Orange Ave, Orlando, FL",
    programCount: 3,
    parcelSummary:
      "1000 N Orange Ave sits on the North Orange corridor inside a low- and moderate-income target area identified in the City of Orlando Consolidated Plan, which makes area-benefit CDBG activities eligible at this location.[1] Orlando is an entitlement jurisdiction, so CDBG and HOME are administered locally.",
    focus: [
      "Work directly with City of Orlando Housing & Community Development — no state pass-through is needed.[1]",
      "Confirm the SHIP per-unit cap in the current Local Housing Assistance Plan before sizing the gap.[2]",
      "Align the HOME commitment request to the city's funding round calendar.[3]",
    ],
    programs: [
      {
        id: "rp-o1",
        name: "City of Orlando CDBG",
        fit: "Strong",
        summary:
          "Entitlement block grant usable for area-benefit activities in the designated corridor target area.[1]",
        actions: [
          "Verify the census tract meets the 51% LMI threshold.",
          "Submit through the city's annual funding application.",
        ],
      },
      {
        id: "rp-o2",
        name: "HOME Investment Partnerships (City of Orlando)",
        fit: "Likely",
        summary:
          "Local HOME allocation for rental gap financing, committed on the city's own cycle.[3]",
        actions: [
          "Confirm commitment timing against the construction schedule.",
          "Model rents against the 60% AMI limits.",
        ],
      },
      {
        id: "rp-o3",
        name: "Florida SHIP",
        fit: "Conditional",
        summary:
          "State Housing Initiatives Partnership funds flow through the Local Housing Assistance Plan; Orlando's rental strategy sets a maximum award per unit.[2]",
        actions: [
          "Pull the current LHAP rental development strategy.",
          "Size the request to the per-unit maximum.",
        ],
      },
    ],
    stacking:
      "CDBG covers eligible area-benefit and infrastructure scope, HOME and SHIP fill the rental gap.[1][2][3] All three are city-administered, so a single coordinated conversation can sequence the commitments; watch the SHIP per-unit cap, which binds before the HOME cap does.",
    cashFlow: [
      { label: "Total development cost (est.)", value: "$4,600,000" },
      { label: "Private construction debt", value: "$3,100,000" },
      { label: "CDBG", value: "$450,000" },
      { label: "HOME", value: "$600,000" },
      { label: "SHIP", value: "$300,000", note: "Subject to LHAP per-unit maximum" },
      { label: "Developer equity required", value: "$150,000" },
    ],
    citations: orlandoCitations,
  },
  "baltimore-gold": {
    projectId: "baltimore-gold",
    projectLabel: "572 Gold St, Baltimore, MD",
    programCount: 4,
    parcelSummary:
      "572 Gold St is a vintage rowhome rehab in West Baltimore. The city is an entitlement jurisdiction administering CDBG and HOME directly through DHCD, with a local Affordable Housing Trust Fund available as a soft second.[1][2]",
    focus: [
      "Pair HOME with the Affordable Housing Trust Fund, and budget for the Trust Fund's 30-year affordability period.[2]",
      "Model the City-Wide Affordable Housing TIF as upside only — Council approval is slow.[3]",
      "Confirm Maryland LIHTC positioning before locking the capital stack.",
    ],
    programs: [
      {
        id: "rp-b1",
        name: "Baltimore CDBG",
        fit: "Likely",
        summary: "Entitlement block grant for eligible rehab and neighborhood activities.[1]",
        actions: ["Confirm activity eligibility for rehab scope.", "Apply through the DHCD cycle."],
      },
      {
        id: "rp-b2",
        name: "HOME (Baltimore City DHCD)",
        fit: "Strong",
        summary: "Local HOME allocation routinely committed alongside Trust Fund awards on rental rehab.[1]",
        actions: ["Request a commitment letter early.", "Model 60% AMI rents for the unit mix."],
      },
      {
        id: "rp-b3",
        name: "Affordable Housing Trust Fund",
        fit: "Strong",
        summary:
          "Local soft second financing; assisted units must stay affordable for at least 30 years.[2]",
        actions: [
          "Budget for 30-year affordability monitoring.",
          "Structure as a soft second behind the permanent loan.",
        ],
      },
      {
        id: "rp-b4",
        name: "City-Wide Affordable Housing TIF",
        fit: "Conditional",
        summary:
          "Rebates a share of the tax increment to affordable projects, but requires City Council action.[3]",
        actions: ["Treat as upside in the model.", "Confirm whether bond counsel is engaged."],
      },
    ],
    stacking:
      "HOME plus the Trust Fund is the standard Maryland pattern for a rehab this size, with CDBG carrying eligible neighborhood scope.[1][2] The Trust Fund's 30-year affordability requirement is the binding covenant across the stack, so underwrite to it. Keep TIF out of the base case until Council action is realistic.[3]",
    cashFlow: [
      { label: "Total development cost (est.)", value: "$2,350,000" },
      { label: "Permanent loan", value: "$1,150,000" },
      { label: "HOME", value: "$600,000" },
      { label: "Affordable Housing Trust Fund (soft second)", value: "$450,000" },
      { label: "CDBG", value: "$100,000" },
      { label: "Developer equity required", value: "$50,000" },
      { label: "TIF rebate (upside, excluded from base)", value: "$0", note: "~60% of increment if approved" },
    ],
    citations: baltimoreCitations,
  },
};

export function reportTemplateFor(projectId: string): Template {
  return templates[projectId] ?? templates["bartlesville-morton"]!;
}

export function buildReport(projectId: string, generatedOn: string): Report {
  const template = reportTemplateFor(projectId);
  return {
    ...template,
    id: `report-${Date.now()}`,
    generatedOn,
  };
}

export const seedReports: Report[] = [
  { ...reportTemplateFor("bartlesville-morton"), id: "report-1", generatedOn: "Sep 19, 2026" },
  { ...reportTemplateFor("orlando-orange"), id: "report-2", generatedOn: "Sep 14, 2026" },
  { ...reportTemplateFor("baltimore-gold"), id: "report-3", generatedOn: "Sep 8, 2026" },
];
