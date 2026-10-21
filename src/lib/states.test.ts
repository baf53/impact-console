import { describe, expect, it } from "vitest";

import { NEW_PROGRAM, newProgramLink, parseProgramLink } from "@/lib/pipeline";
import {
  candidatePrograms,
  matchProgram,
  slugify,
  stateFromLabel,
  stateFromProgramName,
} from "@/lib/states";

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
    expect(matchProgram("Community Development Block Grant (CDBG)", programs)?.id).toBe("cdbg");
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

describe("stateFromProgramName", () => {
  it("reads a state named in the program", () => {
    expect(stateFromProgramName("Kansas Moderate Income Housing (MIH)")).toBe("KS");
    expect(stateFromProgramName("Oklahoma Housing Trust Fund")).toBe("OK");
    expect(stateFromProgramName("Florida State Housing Initiatives Partnership (SHIP)")).toBe("FL");
  });

  it("recognises federal programs", () => {
    expect(stateFromProgramName("Community Development Block Grant (CDBG)")).toBe("Federal");
    expect(stateFromProgramName("Low-Income Housing Tax Credits")).toBe("Federal");
    expect(stateFromProgramName("HOME Investment Partnerships Program")).toBe("Federal");
    expect(stateFromProgramName("USDA Section 515 Rural Rental Housing")).toBe("Federal");
  });

  it("returns null when the name doesn't say, and ignores the everyday word home", () => {
    expect(stateFromProgramName("Wichita Housing Trust Fund")).toBeNull();
    expect(stateFromProgramName("Home repair grant")).toBeNull();
  });
});

describe("program links", () => {
  it("round-trips new-program links and keeps the legacy form", () => {
    expect(parseProgramLink(newProgramLink("Federal"))).toEqual({ kind: "new", state: "Federal" });
    expect(parseProgramLink(NEW_PROGRAM)).toEqual({ kind: "new", state: null });
    expect(parseProgramLink("ok-ohfa-123")).toEqual({ kind: "existing", id: "ok-ohfa-123" });
  });
});
