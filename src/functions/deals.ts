import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import type { ClientRow, ExtractionRow, ProgramRow } from "@/lib/pipeline";
import { candidatePrograms, matchProgram } from "@/lib/states";
import { logActivity } from "@/server/activity.server";
import { hasGeminiKey, writeStackingAnalysis } from "@/server/ai.server";
import { sendEmail } from "@/server/email.server";
import { dbError, getServerSupabase } from "@/server/supabase.server";
import type { Database, Json } from "@/types/database";

type Tables = Database["public"]["Tables"];
export type AlertRow = Tables["client_alerts"]["Row"];
export type ReportRow = Tables["proposals_and_reports"]["Row"];

export const DEAL_STAGES = [
  "meeting_1",
  "meeting_2",
  "demo_prep",
  "proposal",
  "contract",
  "active",
] as const;

export type ProgramFit = "Strong" | "Likely" | "Conditional";

/** Shape of each entry in proposals_and_reports.programs. */
export type ReportProgram = {
  id: string;
  name: string;
  state: string;
  level: ProgramRow["level"];
  administrator: string;
  funds: string;
  overview: string;
  fit: ProgramFit;
  evidence: string | null;
  actions: string[];
};

/** Shape of each entry in proposals_and_reports.citations. */
export type ReportSource = {
  id: string;
  kind: "note" | "document";
  program: string;
  title: string;
  detail: string;
};

export type Checklist = { missingDocuments: ExtractionRow[]; nextSteps: ExtractionRow[] };

const FIT_BY_CONFIDENCE: Record<ExtractionRow["confidence"], ProgramFit> = {
  High: "Strong",
  Medium: "Likely",
  Low: "Conditional",
};

const LEVEL_ORDER: Record<ProgramRow["level"], number> = {
  Federal: 0,
  State: 1,
  Quasi: 2,
  Local: 3,
};

/* --------------------------------- reads --------------------------------- */

export const getDealsFn = createServerFn({ method: "GET" }).handler(async () => {
  const db = getServerSupabase();
  const [clients, alerts, reports] = await Promise.all([
    db.from("clients").select("*").order("client_name"),
    db.from("client_alerts").select("*").order("created_at", { ascending: false }),
    db
      .from("proposals_and_reports")
      .select("id, client_id, title, generated_on, created_at")
      .order("created_at", { ascending: false }),
  ]);
  if (clients.error) throw dbError(clients.error, "Could not load clients");
  if (alerts.error) throw dbError(alerts.error, "Could not load alerts");
  if (reports.error) throw dbError(reports.error, "Could not load reports");
  return { clients: clients.data, alerts: alerts.data, reports: reports.data };
});

export const getChecklistFn = createServerFn({ method: "GET" })
  .validator(z.object({ clientId: z.string().min(1) }))
  .handler(async ({ data }): Promise<Checklist> => {
    const { data: items, error } = await getServerSupabase()
      .from("extractions")
      .select("*")
      .eq("client_id", data.clientId)
      .eq("status", "approved")
      .in("category", ["missing_document", "next_step"])
      .order("created_at");
    if (error) throw dbError(error, "Could not load checklist");
    return {
      missingDocuments: items.filter((i) => i.category === "missing_document"),
      nextSteps: items.filter((i) => i.category === "next_step"),
    };
  });

export const listReportsFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<ReportRow[]> => {
    const { data, error } = await getServerSupabase()
      .from("proposals_and_reports")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw dbError(error, "Could not load reports");
    return data;
  },
);

/* ------------------------------ client deals ----------------------------- */

export const updateClientFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string().min(1),
      dealStage: z.enum(DEAL_STAGES).optional(),
      alertsEnabled: z.boolean().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const patch: Tables["clients"]["Update"] = { updated_at: new Date().toISOString() };
    if (data.dealStage) patch.deal_stage = data.dealStage;
    if (data.alertsEnabled !== undefined) patch.alerts_enabled = data.alertsEnabled;

    const { data: client, error } = await getServerSupabase()
      .from("clients")
      .update(patch)
      .eq("id", data.id)
      .select()
      .single();
    if (error) throw dbError(error, "Could not update client");

    await logActivity({
      action: data.dealStage
        ? "Deal stage updated"
        : client.alerts_enabled
          ? "Alerts switched on"
          : "Alerts switched off",
      subject: client.parcel_address,
      detail: data.dealStage
        ? `${client.client_name} → ${client.deal_stage.replace("_", " ")}`
        : client.client_name,
      status: "updated",
    });
    return client;
  });

/* --------------------------------- reports ------------------------------- */

function mentionsProgram(item: ExtractionRow, program: ProgramRow) {
  return matchProgram(`${item.title} ${item.body}`, [program]) !== null;
}

/**
 * Assembles a proposal snapshot from the deal's approved extractions and its linked
 * Knowledge Base programs. Nothing is invented: programs, funds and notes come from
 * the Knowledge Base, and fit reflects the confidence of the approved subsidy items.
 */
export const generateReportFn = createServerFn({ method: "POST" })
  .validator(z.object({ clientId: z.string().min(1) }))
  .handler(async ({ data }) => {
    const db = getServerSupabase();
    const { data: client, error: clientError } = await db
      .from("clients")
      .select("*")
      .eq("id", data.clientId)
      .single();
    if (clientError) throw dbError(clientError, "Could not load client");

    const [itemsRes, programsRes] = await Promise.all([
      db.from("extractions").select("*").eq("client_id", client.id).eq("status", "approved"),
      db.from("knowledge_programs").select("*").in("state", [client.state, "Federal"]),
    ]);
    if (itemsRes.error) throw dbError(itemsRes.error, "Could not load approved items");
    if (programsRes.error) throw dbError(programsRes.error, "Could not load programs");
    const items = itemsRes.data;
    const candidates = candidatePrograms(programsRes.data, client.state);

    const byCategory = (c: ExtractionRow["category"]) => items.filter((i) => i.category === c);
    const subsidies = byCategory("state_subsidy");
    const nextSteps = byCategory("next_step");

    // Programs linked to the deal at approval time; fall back to every program
    // available in the client's state when nothing has been linked yet.
    const linked = new Map<string, ProgramRow>();
    for (const name of client.target_programs) {
      const program = matchProgram(name, candidates);
      if (program) linked.set(program.id, program);
    }
    const discussed = linked.size > 0;
    const selected = discussed ? [...linked.values()] : candidates;
    selected.sort((a, b) => LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level]);

    const programs: ReportProgram[] = selected.map((program) => {
      const evidence = subsidies.find((s) => matchProgram(s.title, [program]) !== null);
      return {
        id: program.id,
        name: program.name,
        state: program.state,
        level: program.level,
        administrator: program.administrator,
        funds: program.funds,
        overview: program.overview,
        fit: evidence ? FIT_BY_CONFIDENCE[evidence.confidence] : "Conditional",
        evidence: evidence?.body ?? null,
        actions: nextSteps.filter((s) => mentionsProgram(s, program)).map((s) => s.title),
      };
    });

    const programIds = programs.map((p) => p.id);
    const [notesRes, docsRes] = await Promise.all([
      programIds.length
        ? db
            .from("program_notes")
            .select("*")
            .in("program_id", programIds)
            .eq("routing", "program-level")
        : Promise.resolve({ data: [], error: null }),
      programIds.length
        ? db.from("program_documents").select("*").in("program_id", programIds)
        : Promise.resolve({ data: [], error: null }),
    ]);
    if (notesRes.error) throw dbError(notesRes.error, "Could not load practitioner notes");
    if (docsRes.error) throw dbError(docsRes.error, "Could not load program documents");

    const programName = (id: string) => programs.find((p) => p.id === id)?.name ?? id;
    const sources: ReportSource[] = [
      ...docsRes.data.map((d) => ({
        id: d.id,
        kind: "document" as const,
        program: programName(d.program_id),
        title: d.title,
        detail: `${d.kind} · ${d.citation}`,
      })),
      ...notesRes.data.map((n) => ({
        id: n.id,
        kind: "note" as const,
        program: programName(n.program_id),
        title: n.text.split("\n")[0]!.slice(0, 160),
        detail: ["Practitioner guidance", n.call_date].filter(Boolean).join(" · "),
      })),
    ];

    const location = [client.parcel_address, client.city].filter(Boolean).join(", ");
    const requiredInfo = byCategory("required_info");
    const parcelSummary = [
      `${location}, ${client.state} — ${client.client_name}.`,
      ...requiredInfo.map((i) => `${i.title}: ${i.body}`),
    ].join("\n");

    // The funding stack itself is rendered from `programs`; `stacking` holds the
    // AI-drafted narrative when Gemini is configured. A failed draft never blocks the report.
    let stacking: string | null = null;
    let narrativeError: string | null = null;
    if (hasGeminiKey() && programs.length > 0) {
      try {
        stacking = await writeStackingAnalysis({
          parcel: parcelSummary,
          painPoints: byCategory("pain_point").map((i) => `${i.title}: ${i.body}`),
          programs: programs.map((p) => ({
            name: p.name,
            level: p.level,
            state: p.state,
            funds: p.funds,
            overview: p.overview,
            fit: p.fit,
          })),
          notes: notesRes.data.map((n) => n.text),
        });
      } catch (err) {
        narrativeError = err instanceof Error ? err.message : String(err);
        console.error("Stacking analysis failed:", narrativeError);
      }
    }

    const { data: report, error } = await db
      .from("proposals_and_reports")
      .insert({
        client_id: client.id,
        project_label: `${location}, ${client.state}`,
        report_type: "proposal",
        title: discussed
          ? `Funding proposal — ${client.parcel_address}`
          : `Program scan — ${client.parcel_address}`,
        program_count: programs.length,
        parcel_summary: parcelSummary,
        focus: byCategory("pain_point").map((i) => `${i.title}: ${i.body}`),
        programs: programs as unknown as Json,
        stacking,
        cash_flow: [],
        citations: sources as unknown as Json,
      })
      .select()
      .single();
    if (error) throw dbError(error, "Could not save report");

    await logActivity({
      action: "Proposal generated",
      subject: client.parcel_address,
      detail: `${programs.length} programs · ${sources.length} sources${discussed ? "" : " · no programs linked yet"}${stacking ? " · AI stacking analysis" : ""}`,
      status: "generated",
    });
    return { ...report, narrativeError };
  });

export const deleteReportFn = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().min(1) }))
  .handler(async ({ data }) => {
    const { data: report, error } = await getServerSupabase()
      .from("proposals_and_reports")
      .delete()
      .eq("id", data.id)
      .select("title")
      .single();
    if (error) throw dbError(error, "Could not delete report");
    await logActivity({
      action: "Report deleted",
      subject: report.title,
      detail: "Removed from the report library",
      status: "updated",
    });
    return { id: data.id };
  });

/* --------------------------------- alerts -------------------------------- */

export const ALERT_TRIGGERS = ["New program", "New opportunity", "Regulation change"] as const;

export const createAlertFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      clientId: z.string().min(1),
      title: z.string().trim().min(1, "Title is required"),
      trigger: z.enum(ALERT_TRIGGERS),
      draftEmail: z.string().trim().min(1, "Email body is required"),
    }),
  )
  .handler(async ({ data }) => {
    const { data: alert, error } = await getServerSupabase()
      .from("client_alerts")
      .insert({
        client_id: data.clientId,
        title: data.title,
        trigger: data.trigger,
        draft_email: data.draftEmail,
        status: "draft",
      })
      .select()
      .single();
    if (error) throw dbError(error, "Could not draft alert");
    await logActivity({
      action: "Alert drafted",
      subject: data.title,
      detail: data.trigger,
      status: "review",
    });
    return alert;
  });

export const updateAlertFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string().min(1),
      draftEmail: z.string().trim().min(1).optional(),
      status: z.enum(["draft", "approved", "sent"]).optional(),
    }),
  )
  .handler(async ({ data }) => {
    const patch: Tables["client_alerts"]["Update"] = {};
    if (data.draftEmail) patch.draft_email = data.draftEmail;
    if (data.status) patch.status = data.status;
    if (data.status === "sent") {
      patch.sent_on = new Date().toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    }

    const { data: alert, error } = await getServerSupabase()
      .from("client_alerts")
      .update(patch)
      .eq("id", data.id)
      .select()
      .single();
    if (error) throw dbError(error, "Could not update alert");

    if (data.status) {
      await logActivity({
        action: data.status === "sent" ? "Alert sent to client" : `Alert ${data.status}`,
        subject: alert.title,
        detail: alert.trigger,
        status: data.status === "draft" ? "review" : "approved",
      });
    }
    return alert;
  });

export const deleteAlertFn = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().min(1) }))
  .handler(async ({ data }) => {
    const { data: alert, error } = await getServerSupabase()
      .from("client_alerts")
      .delete()
      .eq("id", data.id)
      .select("title, trigger")
      .single();
    if (error) throw dbError(error, "Could not dismiss alert");
    await logActivity({
      action: "Alert dismissed",
      subject: alert.title,
      detail: "Nothing was sent to the client",
      status: "updated",
    });
    return { id: data.id };
  });

export type { ClientRow };

/** Emails an approved alert to the client through Resend, then marks it sent. */
export const sendAlertFn = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().min(1) }))
  .handler(async ({ data }) => {
    const db = getServerSupabase();
    const { data: alert, error } = await db
      .from("client_alerts")
      .select("*")
      .eq("id", data.id)
      .single();
    if (error) throw dbError(error, "Could not load alert");
    if (alert.status !== "approved") throw new Error("Approve the alert before sending it.");

    const { data: client, error: clientError } = await db
      .from("clients")
      .select("*")
      .eq("id", alert.client_id)
      .single();
    if (clientError) throw dbError(clientError, "Could not load client");
    if (!client.alerts_enabled) throw new Error("Alerts are switched off for this client.");
    if (!client.email) throw new Error("This client has no email address on file.");

    await sendEmail({ to: client.email, subject: alert.title, text: alert.draft_email });

    const { data: sent, error: saveError } = await db
      .from("client_alerts")
      .update({
        status: "sent",
        sent_on: new Date().toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
      })
      .eq("id", alert.id)
      .select()
      .single();
    if (saveError) throw dbError(saveError, "Email sent, but the alert couldn't be marked sent");

    await logActivity({
      action: "Alert emailed to client",
      subject: alert.title,
      detail: `${client.client_name} · ${client.email}`,
      status: "approved",
    });
    return sent;
  });

/**
 * Deletes a client deal with its reports and alerts. Its call transcripts are kept,
 * unassigned (call records are never lost); delete them in the Pipeline if they're
 * test data. Knowledge Base programs and notes are untouched.
 */
export const deleteClientFn = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().min(1) }))
  .handler(async ({ data }) => {
    const db = getServerSupabase();
    // Documents that belonged to the client must not become public once unlinked.
    const docs = await db
      .from("app_documents")
      .update({ status: "Pending review" })
      .eq("client_id", data.id);
    if (docs.error) throw dbError(docs.error, "Could not secure the client's documents");

    const { count: transcriptCount } = await db
      .from("transcripts")
      .select("id", { count: "exact", head: true })
      .eq("client_id", data.id);

    const { data: client, error } = await db
      .from("clients")
      .delete()
      .eq("id", data.id)
      .select("client_name, parcel_address")
      .single();
    if (error) throw dbError(error, "Could not delete client");

    await logActivity({
      action: "Client deleted",
      subject: client.parcel_address,
      detail: `${client.client_name}${transcriptCount ? ` · ${transcriptCount} transcript${transcriptCount === 1 ? "" : "s"} kept, unassigned` : ""}`,
      status: "updated",
    });
    return { id: data.id, name: client.client_name, keptTranscripts: transcriptCount ?? 0 };
  });
