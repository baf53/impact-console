import { meetingLabel, type ClientRow, type TranscriptRow } from "@/lib/pipeline";
import { logActivity } from "@/server/activity.server";
import { dbError, getServerSupabase } from "@/server/supabase.server";

export type ImportedTranscript = {
  source: "Granola" | "Zoom" | "Manual";
  text: string;
  title: string;
  meetingType?: "meeting_1" | "meeting_2" | "ad_hoc";
  clientId?: string | null;
  clientEmail?: string | null;
  callDate?: string | null;
  externalId?: string | null;
};

function formatCallDate(value: string | null | undefined) {
  const date = value ? new Date(value) : new Date();
  const valid = Number.isNaN(date.getTime()) ? new Date() : date;
  return valid.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

async function findClient(input: ImportedTranscript): Promise<ClientRow | null> {
  const db = getServerSupabase();
  if (input.clientId) {
    const { data, error } = await db
      .from("clients")
      .select("*")
      .eq("id", input.clientId)
      .maybeSingle();
    if (error) throw dbError(error, "Could not look up client");
    if (data) return data;
  }
  if (input.clientEmail) {
    const { data, error } = await db
      .from("clients")
      .select("*")
      .ilike("email", input.clientEmail.trim())
      .limit(1);
    if (error) throw dbError(error, "Could not look up client");
    if (data[0]) return data[0];
  }
  return null;
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

  const client = await findClient(input);
  const meetingType = input.meetingType ?? "meeting_1";
  const location = client ? [client.parcel_address, client.city].filter(Boolean).join(", ") : "";

  const { data: transcript, error } = await db
    .from("transcripts")
    .insert({
      client_id: client?.id ?? null,
      project_label: client ? `${location}, ${client.state}` : input.title,
      organization: client?.organization ?? `Unassigned ${input.source} call`,
      meeting_type: meetingType,
      source: input.source,
      call_date: formatCallDate(input.callDate),
      stage: "intake",
      status: "new",
      raw_text: input.text,
      ...(input.externalId ? { external_id: input.externalId } : {}),
    })
    .select()
    .single();
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
      ? `${meetingLabel(meetingType)} · ${client.client_name}`
      : "Not matched to a client yet — assign it in the Pipeline",
    status: "review",
  });
  return { transcript, duplicate: false, matchedClient: Boolean(client) };
}
