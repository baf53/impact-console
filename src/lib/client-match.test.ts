import { describe, expect, it } from "vitest";

import { matchClientsByMeetingName } from "@/lib/client-match";

const robert = { id: "rw", client_name: "Washington Homes LLC", contact_name: "Robert Washington" };
const sarah = { id: "sj", client_name: "Tulsa Housing Foundation", contact_name: "Sarah Jenkins" };
const otherRobert = { id: "rw2", client_name: "Robert Washington", contact_name: null };
const ids = (list: { id: string }[]) => list.map((c) => c.id);

describe("matchClientsByMeetingName", () => {
  it("matches a booking-link meeting name to the guest's full name", () => {
    expect(
      ids(matchClientsByMeetingName("Robert Washington and Bria Francisco", [robert, sarah])),
    ).toEqual(["rw"]);
  });

  it("matches the client name as well as the contact person", () => {
    expect(
      ids(matchClientsByMeetingName("Tulsa Housing Foundation kickoff", [robert, sarah])),
    ).toEqual(["sj"]);
  });

  it("ignores case, accents and possessives", () => {
    const jose = { id: "jg", client_name: "José García", contact_name: null };
    expect(ids(matchClientsByMeetingName("JOSE GARCIA's follow-up", [jose]))).toEqual(["jg"]);
  });

  it("needs every word of the name, as whole words", () => {
    expect(matchClientsByMeetingName("Call with Robert", [robert])).toEqual([]);
    expect(matchClientsByMeetingName("Roberta Washingtonian review", [robert])).toEqual([]);
  });

  it("returns every client that shares the name, so none is picked by guesswork", () => {
    expect(
      ids(matchClientsByMeetingName("Robert Washington and Bria Francisco", [robert, otherRobert])),
    ).toEqual(["rw", "rw2"]);
  });

  it("never matches Zoom's default '<host>'s Zoom Meeting' names", () => {
    const bria = { id: "bf", client_name: "Bria Francisco", contact_name: null };
    expect(matchClientsByMeetingName("Bria Francisco's Zoom Meeting", [bria])).toEqual([]);
    expect(matchClientsByMeetingName("Bria Francisco's Personal Meeting Room", [bria])).toEqual([]);
  });

  it("returns nothing for an empty meeting name", () => {
    expect(matchClientsByMeetingName("  ", [robert])).toEqual([]);
  });
});
