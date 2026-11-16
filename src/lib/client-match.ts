import type { ClientRow } from "@/lib/pipeline";

export type MatchableClient = Pick<ClientRow, "id" | "client_name" | "contact_name">;

// Zoom's default "<host>'s Zoom Meeting" names only contain the host, never the guest.
const DEFAULT_MEETING_NAME = /['’]s\s+(zoom\s+meeting|personal\s+meeting\s+room)\b/i;

function nameWords(text: string): string[] {
  return (
    text
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/['’]s\b/g, "")
      .match(/[a-z0-9]+/g) ?? []
  );
}

/**
 * The clients a meeting is probably about, judged by its name, e.g. "Robert Washington
 * and Bria Francisco" or "Call with Sarah Jenkins". A client matches when every word of
 * its contact or client name appears as a whole word in the meeting name; names of one
 * word never match, so a first name alone isn't enough. Callers link automatically only
 * when exactly one client matches and otherwise offer the matches as suggestions.
 */
export function matchClientsByMeetingName<T extends MatchableClient>(
  meetingName: string,
  clients: T[],
): T[] {
  if (!meetingName.trim() || DEFAULT_MEETING_NAME.test(meetingName)) return [];
  const inMeetingName = new Set(nameWords(meetingName));
  return clients.filter((client) =>
    [client.contact_name, client.client_name].some((name) => {
      const words = nameWords(name ?? "");
      return words.length >= 2 && words.every((word) => inMeetingName.has(word));
    }),
  );
}
