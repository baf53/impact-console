import { describe, expect, it } from "vitest";

import { candidatePrograms, matchProgram, slugify, stateFromLabel } from "@/lib/states";

const programs = [
  { id: "ok", name: "Oklahoma Increased Housing Program (OHFA)", state: "OK" },
  { id: "cdbg", name: "CDBG Small Cities", state: "Federal" },
  { id: "ks", name: "Kansas Moderate Income Housing (MIH)", state: "KS" },
  { id: "fl", name: "Florida State Housing Initiatives Partnership (SHIP)", state: "FL" },
];

describe("stateFromLabel", () => {
  it("reads the trailing state code", () => {
    expect(stateFromLabel("316 S Morton Ave, Bartlesville, OK")).toBe("OK");
    expect(stateFromLabel("Catalyst Grant, Federal")).toBe("Federal");
  });

  it("ignores unknown codes and labels without a state", () => {
    expect(stateFromLabel("1 Main St, Austin, TX")).toBeNull();
    expect(stateFromLabel("No state here")).toBeNull();
  });
});

describe("candidatePrograms", () => {
  it("keeps the deal's state plus Federal programs", () => {
    expect(candidatePrograms(programs, "KS").map((p) => p.id)).toEqual(["cdbg", "ks"]);
  });

  it("returns everything when the state is unknown", () => {
    expect(candidatePrograms(programs, null)).toHaveLength(programs.length);
  });
});

describe("matchProgram", () => {
  it("matches exact and contained names", () => {
    expect(matchProgram("CDBG Small Cities", programs)?.id).toBe("cdbg");
    expect(matchProgram("Kansas Moderate Income Housing", programs)?.id).toBe("ks");
  });

  it("matches on the acronym in parentheses", () => {
    expect(matchProgram("Florida SHIP", programs)?.id).toBe("fl");
    expect(matchProgram("OHFA loan", programs)?.id).toBe("ok");
  });

  it("returns null when nothing is close", () => {
    expect(matchProgram("Wichita Housing Trust Fund", programs)).toBeNull();
  });
});

describe("slugify", () => {
  it("produces url-safe ids", () => {
    expect(slugify("Florida SHIP (2026) — Round 2!")).toBe("florida-ship-2026-round-2");
  });
});
