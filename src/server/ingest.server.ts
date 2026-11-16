import { matchClientsByMeetingName } from "@/lib/client-match";
import { meetingLabel, type ClientRow, type TranscriptRow } from "@/lib/pipeline";
import { logActivity } from "@/server/activity.server";
import { dbError, getServerSupabase, isMissingSchema } from "@/server/supabase.server";

export type ImportedTranscript = {
  source: "Granola" | "Zoom" | "Manual";
  text: string;
  title: string;
  meetingType?: "meeting_1" | "meeting_2" | "ad_hoc";
  clientId?: string | null;
  clientEmail?: string | null;
  callDate?: string | null;
  externalId?: string | null;
  /** The meeting host's email; never matched as the client. */
  hostEmail?: string | null;
};

function formatCallDate(value: string | null | undefined) {
  const date = value ? new Date(value) : new Date();
  const valid = Number.isNaN(date.getTime()) ? new Date() : date;
  return valid.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

async function findClient(
  input: ImportedTranscript,
): Promise<{ client: ClientRow | null; byMeetingName: boolean }> {
  const db = getServerSupabase();
  if (input.clientId) {
    const { data, error } = await db
      .from("clients")
      .select("*")
      .eq("id", input.clientId)
      .maybeSingle();
    if (error) throw dbError(error, "Could not look up client");
    if (data) return { client: data, byMeetingName: false };
  }
  if (input.clientEmail) {
    const { data, error } = await db
      .from("clients")
      .select("*")
      .ilike("email", input.clientEmail.trim())
      .limit(1);
    if (error) throw dbError(error, "Could not look up client");
    if (data[0]) return { client: data[0], byMeetingName: false };
  }

  // Last resort: the meeting's name. Only an unambiguous match links the call; when
  // several clients share the name, the Pipeline card offers them as suggestions.
  const { data: clients, error } = await db.from("clients").select("*");
  if (error) throw dbError(error, "Could not look up clients");
  const host = input.hostEmail?.trim().toLowerCase();
  const candidates = host ? clients.filter((c) => c.email?.trim().toLowerCase() !== host) : clients;
  const matches = matchClientsByMeetingName(input.title, candidates);
  return matches.length === 1 && matches[0]
    ? { client: matches[0], byMeetingName: true }
    : { client: null, byMeetingName: false };
}

/**
 * Saves a transcript that arrived automatically (Zoom, Granola via an automation, or
 * any webhook) into Intake. Matches the client by id or email when possible; otherwise
 * the operator assigns it in the Pipeline. Re-deliveries with the same external id
 * return the existing transcript instead of creating a duplicate.
 */
export async function saveImportedTranscript(
  input: ImportedTranscript,
): Promise<{ transcript: TranscriptRow; duplicate: boolean; matchedClient: boolean }> {
  const db = getServerSupabase();

  if (input.externalId) {
    const { data: existing, error } = await db
      .from("transcripts")
      .select("*")
      .eq("external_id", input.externalId)
      .maybeSingle();
    if (error) throw dbError(error, "Could not check for duplicates");
    if (existing)
      return { transcript: existing, duplicate: true, matchedClient: Boolean(existing.client_id) };
  }

  const { client, byMeetingName } = await findClient(input);
  const meetingType = input.meetingType ?? "meeting_1";
  const location = client ? [client.parcel_address, client.city].filter(Boolean).join(", ") : "";

  // An unlinked call keeps the meeting's name as its label, so the Pipeline can suggest
  // clients from it later.
  const row = {
    client_id: client?.id ?? null,
    project_label: client ? `${location}, ${client.state}` : input.title,
    organization: client?.organization ?? `Unassigned ${input.source} call`,
    meeting_type: meetingType,
    source: input.source,
    call_date: formatCallDate(input.callDate),
    stage: "intake" as const,
    status: "new" as const,
    raw_text: input.text,
    ...(input.externalId ? { external_id: input.externalId } : {}),
  };
  let inserted = await db
    .from("transcripts")
    .insert({ ...row, ...(byMeetingName ? { client_matched_by: "meeting_name" as const } : {}) })
    .select()
    .single();
  if (inserted.error && byMeetingName && isMissingSchema(inserted.error)) {
    // supabase_step3_features.sql hasn't been re-run yet: keep the link, skip the label.
    inserted = await db.from("transcripts").insert(row).select().single();
  }
  const { data: transcript, error } = inserted;
  if (error) {
    if (error.code === "23505" && input.externalId) {
      const { data: existing } = await db
        .from("transcripts")
        .select("*")
        .eq("external_id", input.externalId)
        .single();
      if (existing)
        return {
          transcript: existing,
          duplicate: true,
          matchedClient: Boolean(existing.client_id),
        };
    }
    throw dbError(error, "Could not save imported transcript");
  }

  await logActivity({
    action: `${input.source} transcript imported`,
    subject: client?.parcel_address ?? input.title,
    detail: client
      ? `${meetingLabel(meetingType)} · ${client.client_name}${byMeetingName ? " · linked automatically from the meeting name" : ""}`
      : "Not matched to a client yet — assign it in the Pipeline",
    status: "review",
  });
  return { transcript, duplicate: false, matchedClient: Boolean(client) };
}
