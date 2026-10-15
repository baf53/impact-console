import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { KNOWLEDGE_STATES, STATE_NAMES, slugify } from "@/lib/states";
import { logActivity } from "@/server/activity.server";
import { dbError, getServerSupabase } from "@/server/supabase.server";
import type { Database } from "@/types/database";

type Tables = Database["public"]["Tables"];
export type ProgramRow = Tables["knowledge_programs"]["Row"];
export type ProgramNoteRow = Tables["program_notes"]["Row"];
export type ProgramContactRow = Tables["program_contacts"]["Row"];
export type ProgramDocumentRow = Tables["program_documents"]["Row"];
export type AppDocumentRow = Tables["app_documents"]["Row"];

export type ProgramSummary = ProgramRow & { noteCount: number; documentCount: number };

export type ProgramDetail = {
  program: ProgramRow;
  notes: ProgramNoteRow[];
  contacts: ProgramContactRow[];
  documents: ProgramDocumentRow[];
  attachments: AppDocumentRow[];
};

function countBy(rows: { program_id: string | null }[]) {
  const counts = new Map<string, number>();
  for (const row of rows) {
    if (row.program_id) counts.set(row.program_id, (counts.get(row.program_id) ?? 0) + 1);
  }
  return counts;
}

export const listProgramSummariesFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<ProgramSummary[]> => {
    const db = getServerSupabase();
    const [programs, notes, documents, attachments] = await Promise.all([
      db.from("knowledge_programs").select("*").order("state").order("name"),
      db.from("program_notes").select("program_id"),
      db.from("program_documents").select("program_id"),
      db.from("app_documents").select("program_id").not("program_id", "is", null),
    ]);
    if (programs.error) throw dbError(programs.error, "Could not load programs");
    if (notes.error) throw dbError(notes.error, "Could not load notes");
    if (documents.error) throw dbError(documents.error, "Could not load documents");
    if (attachments.error) throw dbError(attachments.error, "Could not load attachments");

    const noteCounts = countBy(notes.data);
    const docCounts = countBy([...documents.data, ...attachments.data]);
    return programs.data.map((p) => ({
      ...p,
      noteCount: noteCounts.get(p.id) ?? 0,
      documentCount: docCounts.get(p.id) ?? 0,
    }));
  },
);

export const getProgramFn = createServerFn({ method: "GET" })
  .validator(z.object({ id: z.string().min(1) }))
  .handler(async ({ data }): Promise<ProgramDetail | null> => {
    const db = getServerSupabase();
    const [program, notes, contacts, documents, attachments] = await Promise.all([
      db.from("knowledge_programs").select("*").eq("id", data.id).maybeSingle(),
      db
        .from("program_notes")
        .select("*")
        .eq("program_id", data.id)
        .order("created_at", { ascending: false }),
      db.from("program_contacts").select("*").eq("program_id", data.id).order("name"),
      db.from("program_documents").select("*").eq("program_id", data.id).order("title"),
      db
        .from("app_documents")
        .select("*")
        .eq("program_id", data.id)
        .order("created_at", { ascending: false }),
    ]);
    if (program.error) throw dbError(program.error, "Could not load program");
    if (!program.data) return null;
    if (notes.error) throw dbError(notes.error, "Could not load notes");
    if (contacts.error) throw dbError(contacts.error, "Could not load contacts");
    if (documents.error) throw dbError(documents.error, "Could not load source documents");
    if (attachments.error) throw dbError(attachments.error, "Could not load attachments");

    return {
      program: program.data,
      notes: notes.data,
      contacts: contacts.data,
      documents: documents.data,
      attachments: attachments.data,
    };
  });

const programFields = z.object({
  name: z.string().trim().min(1, "Name is required"),
  state: z.enum(KNOWLEDGE_STATES),
  level: z.enum(["Federal", "State", "Local", "Quasi"]),
  administrator: z.string().trim().min(1, "Administrator is required"),
  jurisdiction: z.string().trim().min(1, "Jurisdiction is required"),
  cities: z.array(z.string().trim().min(1)),
  funds: z.string().trim().min(1, "Funds is required"),
  overview: z.string().trim().min(1, "Overview is required"),
  eligibility_criteria: z
    .string()
    .trim()
    .transform((v) => (v ? v : null)),
  coverage: z.number().int().min(0).max(100),
});

export type ProgramInput = z.input<typeof programFields>;

export const createProgramFn = createServerFn({ method: "POST" })
  .validator(programFields)
  .handler(async ({ data }) => {
    const id = `${slugify(data.state)}-${slugify(data.name)}-${crypto.randomUUID().slice(0, 6)}`;
    const { data: created, error } = await getServerSupabase()
      .from("knowledge_programs")
      .insert({ id, ...data })
      .select()
      .single();
    if (error) throw dbError(error, "Could not create program");

    const drafted = await draftNewProgramAlerts(created);
    await logActivity({
      action: "Program added",
      subject: created.name,
      detail: `${created.level} · ${created.state} · ${created.administrator}${drafted ? ` · ${drafted} client alert${drafted > 1 ? "s" : ""} drafted` : ""}`,
      status: "updated",
    });
    return { ...created, alertsDrafted: drafted };
  });

/**
 * Drafts (never sends) a "New program" alert for every subscribed client the program
 * could apply to: clients in its state, or every client for Federal programs.
 */
async function draftNewProgramAlerts(program: ProgramRow): Promise<number> {
  const db = getServerSupabase();
  let query = db.from("clients").select("*").eq("alerts_enabled", true);
  if (program.state !== "Federal") query = query.eq("state", program.state);
  const { data: clients, error } = await query;
  if (error) {
    console.error("Could not load clients for alerts:", error.message);
    return 0;
  }
  if (clients.length === 0) return 0;

  const where = STATE_NAMES[program.state] ?? program.state;
  const { error: insertError } = await db.from("client_alerts").insert(
    clients.map((client) => ({
      client_id: client.id,
      title: `New program loaded: ${program.name}`,
      trigger: "New program",
      status: "draft" as const,
      draft_email: [
        `Hi ${client.contact_name || client.client_name},`,
        "",
        `A new ${program.level.toLowerCase()} funding program is now in our Knowledge Base for ${where}: ${program.name} (${program.administrator}).`,
        "",
        program.overview,
        "",
        `Funds: ${program.funds}`,
        "",
        `It may be relevant to ${client.parcel_address}. Happy to walk through fit on our next call.`,
        "",
        "— Collective Impact",
      ].join("\n"),
    })),
  );
  if (insertError) {
    console.error("Could not draft client alerts:", insertError.message);
    return 0;
  }
  return clients.length;
}

export const updateProgramFn = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().min(1), fields: programFields }))
  .handler(async ({ data }) => {
    const { data: updated, error } = await getServerSupabase()
      .from("knowledge_programs")
      .update(data.fields)
      .eq("id", data.id)
      .select()
      .single();
    if (error) throw dbError(error, "Could not update program");

    // Notes inherit the program's state so the chatbot's state filter stays consistent.
    const notes = await getServerSupabase()
      .from("program_notes")
      .update({ state: updated.state })
      .eq("program_id", updated.id)
      .neq("state", updated.state);
    if (notes.error) throw dbError(notes.error, "Program saved, but its notes kept the old state");

    await logActivity({
      action: "Program updated",
      subject: updated.name,
      detail: `${updated.level} · ${updated.state} · coverage ${updated.coverage}%`,
      status: "updated",
    });
    return updated;
  });

export const deleteNoteFn = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().min(1) }))
  .handler(async ({ data }) => {
    const db = getServerSupabase();
    const { data: note, error } = await db
      .from("program_notes")
      .delete()
      .eq("id", data.id)
      .select("program_id, text")
      .single();
    if (error) throw dbError(error, "Could not remove note");

    const { data: program } = await db
      .from("knowledge_programs")
      .select("name")
      .eq("id", note.program_id)
      .maybeSingle();
    await logActivity({
      action: "Practitioner note removed",
      subject: program?.name ?? note.program_id,
      detail: note.text.slice(0, 120),
      status: "updated",
    });
    return { id: data.id };
  });
