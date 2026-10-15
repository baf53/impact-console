import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import {
  NEW_PROGRAM,
  STAGE_LABELS,
  meetingLabel,
  type ClientRow,
  type ExtractionRow,
  type ProgramRow,
  type TranscriptRow,
  type TranscriptWithExtractions,
} from "@/lib/pipeline";
import {
  CLIENT_STATES,
  KNOWLEDGE_STATES,
  STATE_NAMES,
  slugify,
  stateFromLabel,
} from "@/lib/states";
import { DEFAULT_GEMINI_MODEL, extractTranscript, hasGeminiKey } from "@/server/ai.server";
import { dbError, getServerSupabase, hasSecretKey } from "@/server/supabase.server";
import type { Database } from "@/types/database";

type ActivityInsert = Database["public"]["Tables"]["app_activity_log"]["Insert"];

async function logActivity(entry: ActivityInsert) {
  const { error } = await getServerSupabase().from("app_activity_log").insert(entry);
  if (error) console.error("Activity log write failed:", error.message);
}

async function getTranscript(id: string): Promise<TranscriptRow> {
  const { data, error } = await getServerSupabase()
    .from("transcripts")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw dbError(error, "Could not load transcript");
  return data;
}

async function getClient(id: string | null): Promise<ClientRow | null> {
  if (!id) return null;
  const { data, error } = await getServerSupabase()
    .from("clients")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw dbError(error, "Could not load client");
  return data;
}

function shortSubject(label: string) {
  return label.split(",")[0] ?? label;
}

/* --------------------------------- reads --------------------------------- */

export const getIntegrationStatusFn = createServerFn({ method: "GET" }).handler(async () => ({
  gemini: hasGeminiKey(),
  geminiModel: process.env["GEMINI_MODEL"] || DEFAULT_GEMINI_MODEL,
  supabaseSecretKey: hasSecretKey(),
}));

export const listClientsFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<ClientRow[]> => {
    const { data, error } = await getServerSupabase()
      .from("clients")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw dbError(error, "Could not load clients");
    return data;
  },
);

export const listTranscriptsFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<TranscriptWithExtractions[]> => {
    const db = getServerSupabase();
    const [transcripts, extractions] = await Promise.all([
      db.from("transcripts").select("*").order("created_at", { ascending: false }),
      db.from("extractions").select("*").order("created_at", { ascending: true }),
    ]);
    if (transcripts.error) throw dbError(transcripts.error, "Could not load transcripts");
    if (extractions.error) throw dbError(extractions.error, "Could not load extractions");

    const byTranscript = new Map<string, ExtractionRow[]>();
    for (const item of extractions.data) {
      if (!item.transcript_id) continue;
      const list = byTranscript.get(item.transcript_id) ?? [];
      list.push(item);
      byTranscript.set(item.transcript_id, list);
    }
    return transcripts.data.map((t) => ({ ...t, extractions: byTranscript.get(t.id) ?? [] }));
  },
);

export const listProgramsFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<ProgramRow[]> => {
    const { data, error } = await getServerSupabase()
      .from("knowledge_programs")
      .select("*")
      .order("state")
      .order("name");
    if (error) throw dbError(error, "Could not load programs");
    return data;
  },
);

/* --------------------------------- intake -------------------------------- */

const optionalText = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : null));

const ingestSchema = z
  .object({
    clientId: z.string().min(1).optional(),
    newClient: z
      .object({
        clientName: z.string().trim().min(1, "Client name is required"),
        contactName: optionalText,
        organization: optionalText,
        parcelAddress: z.string().trim().min(1, "Parcel address is required"),
        city: optionalText,
        state: z.enum(CLIENT_STATES),
        email: optionalText,
      })
      .optional(),
    meetingType: z.enum(["meeting_1", "meeting_2"]),
    source: z.enum(["Granola", "Zoom"]),
    rawText: z.string().trim().min(1, "Paste the call transcript"),
  })
  .refine((d) => d.clientId || d.newClient, "Choose a client or register a new one.");

export const ingestTranscriptFn = createServerFn({ method: "POST" })
  .validator(ingestSchema)
  .handler(async ({ data }) => {
    const db = getServerSupabase();

    let client: ClientRow | null;
    if (data.newClient) {
      const c = data.newClient;
      const { data: created, error } = await db
        .from("clients")
        .insert({
          client_name: c.clientName,
          contact_name: c.contactName,
          organization: c.organization ?? c.clientName,
          email: c.email,
          parcel_address: c.parcelAddress,
          city: c.city ?? "",
          state: c.state,
        })
        .select()
        .single();
      if (error) throw dbError(error, "Could not register client");
      client = created;
      await logActivity({
        action: "Client registered",
        subject: created.parcel_address,
        detail: `${created.client_name} · ${created.state}`,
        status: "updated",
      });
    } else {
      client = await getClient(data.clientId ?? null);
      if (!client) throw new Error("That client no longer exists.");
    }

    const location = [client.parcel_address, client.city].filter(Boolean).join(", ");
    const { data: transcript, error } = await db
      .from("transcripts")
      .insert({
        client_id: client.id,
        project_label: `${location}, ${client.state}`,
        organization: client.organization,
        meeting_type: data.meetingType,
        source: data.source,
        stage: "intake",
        status: "new",
        raw_text: data.rawText,
      })
      .select()
      .single();
    if (error) throw dbError(error, "Could not save transcript");

    await logActivity({
      action: `${meetingLabel(data.meetingType)} transcript ingested`,
      subject: client.parcel_address,
      detail: `${data.source} transcript for ${client.client_name}`,
      status: "review",
    });
    return transcript;
  });

export const createOpportunityFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      title: z.string().trim().min(1, "Title is required"),
      funder: z.string().trim().min(1, "Funder is required"),
      state: z.enum(KNOWLEDGE_STATES),
      sourceType: z.string().trim().min(1),
      sourceUrl: optionalText,
      geography: optionalText,
      programType: optionalText,
      details: z.string().trim(),
    }),
  )
  .handler(async ({ data }) => {
    const header = [
      `Source: ${data.sourceType}${data.sourceUrl ? ` — ${data.sourceUrl}` : ""}`,
      data.geography && `Geography: ${data.geography}`,
      data.programType && `Program type: ${data.programType}`,
    ].filter(Boolean);

    const { data: transcript, error } = await getServerSupabase()
      .from("transcripts")
      .insert({
        client_id: null,
        project_label: `${data.title}, ${data.state}`,
        organization: data.funder,
        meeting_type: "funding_feed",
        source: "Manual",
        stage: "intake",
        status: "new",
        raw_text: [header.join("\n"), data.details].filter(Boolean).join("\n\n"),
      })
      .select()
      .single();
    if (error) throw dbError(error, "Could not save opportunity");

    await logActivity({
      action: "Funding opportunity added",
      subject: data.title,
      detail: `${data.funder} · ${data.state}`,
      status: "review",
    });
    return transcript;
  });

/* ------------------------------- extraction ------------------------------ */

export const runExtractionFn = createServerFn({ method: "POST" })
  .validator(z.object({ transcriptId: z.string().min(1) }))
  .handler(async ({ data }) => {
    if (!hasGeminiKey()) {
      throw new Error(
        "AI extraction is not configured yet: GEMINI_API_KEY is missing. The transcript stays in Intake until the key is added.",
      );
    }

    const db = getServerSupabase();
    const transcript = await getTranscript(data.transcriptId);
    if (transcript.status === "approved") throw new Error("This transcript is already approved.");
    if (transcript.status === "extracting") throw new Error("Extraction is already running.");

    const client = await getClient(transcript.client_id);
    const state = client?.state ?? stateFromLabel(transcript.project_label);

    const started = await db
      .from("transcripts")
      .update({ status: "extracting" })
      .eq("id", transcript.id);
    if (started.error) throw dbError(started.error, "Could not start extraction");

    try {
      const { items, dropped } = await extractTranscript({
        text: transcript.raw_text,
        state,
        label: transcript.project_label,
        meetingType: transcript.meeting_type,
      });

      // A re-run replaces items that haven't been reviewed; approved/rejected ones stay.
      const cleared = await db
        .from("extractions")
        .delete()
        .eq("transcript_id", transcript.id)
        .eq("status", "pending");
      if (cleared.error) throw dbError(cleared.error, "Could not clear earlier extractions");

      if (items.length > 0) {
        const inserted = await db.from("extractions").insert(
          items.map((item) => ({
            ...item,
            transcript_id: transcript.id,
            client_id: transcript.client_id,
            status: "pending" as const,
          })),
        );
        if (inserted.error) throw dbError(inserted.error, "Could not save extracted items");
      }

      const done = await db
        .from("transcripts")
        .update({ stage: "extracted", status: "ready" })
        .eq("id", transcript.id);
      if (done.error) throw dbError(done.error, "Could not update transcript stage");

      await logActivity({
        action: "AI extraction completed",
        subject: shortSubject(transcript.project_label),
        detail: `${items.length} items across the 5 buckets${dropped ? ` (${dropped} invalid items dropped)` : ""}`,
        status: "review",
      });
      return { count: items.length, dropped };
    } catch (err) {
      await db.from("transcripts").update({ status: transcript.status }).eq("id", transcript.id);
      throw err;
    }
  });

/* --------------------------------- review -------------------------------- */

export const updateTranscriptStageFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string().min(1),
      stage: z.enum(["intake", "extracted", "in-review"]),
    }),
  )
  .handler(async ({ data }) => {
    const transcript = await getTranscript(data.id);
    if (transcript.status === "approved") {
      throw new Error("Approved transcripts can't be moved back out of Approved.");
    }
    const { data: updated, error } = await getServerSupabase()
      .from("transcripts")
      .update({ stage: data.stage })
      .eq("id", data.id)
      .select()
      .single();
    if (error) throw dbError(error, "Could not move card");

    await logActivity({
      action: `Moved to ${STAGE_LABELS[data.stage]}`,
      subject: shortSubject(transcript.project_label),
      detail: `${transcript.organization} · ${meetingLabel(transcript.meeting_type)}`,
      status: "review",
    });
    return updated;
  });

export const updateExtractionFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string().min(1),
      patch: z
        .object({
          status: z.enum(["pending", "approved", "rejected"]).optional(),
          title: z.string().trim().min(1).optional(),
          body: z.string().trim().min(1).optional(),
          routing: z.enum(["program-level", "site-level"]).optional(),
        })
        .strict(),
    }),
  )
  .handler(async ({ data }) => {
    const patch: Database["public"]["Tables"]["extractions"]["Update"] = {};
    if (data.patch.status) patch.status = data.patch.status;
    if (data.patch.title) patch.title = data.patch.title;
    if (data.patch.body) patch.body = data.patch.body;
    if (data.patch.routing) patch.routing = data.patch.routing;
    if (Object.keys(patch).length === 0) throw new Error("Nothing to update.");

    const { data: updated, error } = await getServerSupabase()
      .from("extractions")
      .update(patch)
      .eq("id", data.id)
      .select()
      .single();
    if (error) throw dbError(error, "Could not update item");
    return updated;
  });

function noteText(item: ExtractionRow) {
  if (item.facts.length === 0) return item.body;
  return `${item.body}\n\nKey facts:\n${item.facts.map((f) => `• ${f}`).join("\n")}`;
}

/**
 * Final approval gate. Approved state_subsidy items become practitioner notes on the
 * Knowledge Base program the operator linked them to (or a new program), tagged with
 * that program's state so the chatbot can partition by geography.
 */
export const approveTranscriptFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      transcriptId: z.string().min(1),
      programLinks: z.record(z.string()),
    }),
  )
  .handler(async ({ data }) => {
    const db = getServerSupabase();
    const transcript = await getTranscript(data.transcriptId);
    if (transcript.status === "approved") throw new Error("This transcript is already approved.");

    const { data: items, error: itemsError } = await db
      .from("extractions")
      .select("*")
      .eq("transcript_id", transcript.id)
      .eq("status", "approved");
    if (itemsError) throw dbError(itemsError, "Could not load approved items");
    if (items.length === 0) throw new Error("Approve at least one item first.");

    const client = await getClient(transcript.client_id);
    const state = client?.state ?? stateFromLabel(transcript.project_label);
    const subsidies = items.filter((i) => i.category === "state_subsidy");

    const existingIds = [
      ...new Set(
        subsidies.map((i) => data.programLinks[i.id]).filter((id) => id && id !== NEW_PROGRAM),
      ),
    ] as string[];
    const programsById = new Map<string, ProgramRow>();
    if (existingIds.length > 0) {
      const { data: programs, error } = await db
        .from("knowledge_programs")
        .select("*")
        .in("id", existingIds);
      if (error) throw dbError(error, "Could not load linked programs");
      for (const p of programs) programsById.set(p.id, p);
    }

    // Validate every link before writing anything.
    for (const item of subsidies) {
      const link = data.programLinks[item.id];
      if (!link) throw new Error(`Choose a Knowledge Base program for "${item.title}".`);
      if (link === NEW_PROGRAM && !state) {
        throw new Error(
          `"${item.title}" can't become a new program because this transcript has no state. Link it to an existing program.`,
        );
      }
      if (link !== NEW_PROGRAM && !programsById.has(link)) {
        throw new Error(`The program linked to "${item.title}" no longer exists.`);
      }
    }

    const created: ProgramRow[] = [];
    const notes: Database["public"]["Tables"]["program_notes"]["Insert"][] = [];
    for (const item of subsidies) {
      const link = data.programLinks[item.id]!;
      let program = programsById.get(link);
      if (!program) {
        const programState = state!;
        const { data: newProgram, error } = await db
          .from("knowledge_programs")
          .insert({
            id: `${slugify(programState)}-${slugify(item.title)}-${crypto.randomUUID().slice(0, 6)}`,
            name: item.title,
            state: programState,
            administrator: "To be confirmed",
            level: programState === "Federal" ? "Federal" : "State",
            jurisdiction: STATE_NAMES[programState] ?? programState,
            cities: client?.city ? [client.city] : [],
            coverage: 20,
            funds: "To be confirmed",
            overview: item.body,
          })
          .select()
          .single();
        if (error) throw dbError(error, `Could not create program "${item.title}"`);
        created.push(newProgram);
        program = newProgram;
      }
      notes.push({
        program_id: program.id,
        state: program.state,
        text: noteText(item),
        source_call: `${transcript.organization} — ${meetingLabel(transcript.meeting_type)}`,
        call_date: transcript.call_date,
        routing: item.routing,
      });
    }

    if (notes.length > 0) {
      const { error } = await db.from("program_notes").insert(notes);
      if (error) {
        if (created.length > 0) {
          await db
            .from("knowledge_programs")
            .delete()
            .in(
              "id",
              created.map((p) => p.id),
            );
        }
        throw dbError(error, "Could not send notes to the Knowledge Base");
      }
    }

    const linkedNames = [
      ...new Set(
        notes.map(
          (n) =>
            programsById.get(n.program_id)?.name ??
            created.find((p) => p.id === n.program_id)?.name ??
            "",
        ),
      ),
    ].filter(Boolean);

    const { error: approveError } = await db
      .from("transcripts")
      .update({
        stage: "approved",
        status: "approved",
        programs: [...new Set([...transcript.programs, ...linkedNames])],
      })
      .eq("id", transcript.id);
    if (approveError) throw dbError(approveError, "Could not mark transcript approved");

    if (client && linkedNames.length > 0) {
      const { error } = await db
        .from("clients")
        .update({ target_programs: [...new Set([...client.target_programs, ...linkedNames])] })
        .eq("id", client.id);
      if (error) console.error("Could not update client target programs:", error.message);
    }

    await logActivity({
      action: "Transcript approved",
      subject: shortSubject(transcript.project_label),
      detail: `${items.length} items approved · ${notes.length} sent to the Knowledge Base${created.length ? ` · ${created.length} new program${created.length > 1 ? "s" : ""}` : ""}`,
      status: "approved",
    });

    return { approved: items.length, notes: notes.length, createdPrograms: created.length };
  });
