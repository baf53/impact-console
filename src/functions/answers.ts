import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { CLIENT_STATES } from "@/lib/states";
import { logActivity } from "@/server/activity.server";
import { judgeAnswer } from "@/server/ai.server";
import { answerQuestion } from "@/server/chatbot-view.server";
import { dbError, getServerSupabase, isMissingSchema } from "@/server/supabase.server";
import type { Database } from "@/types/database";

type Tables = Database["public"]["Tables"];
export type AnswerRow = Tables["answer_log"]["Row"];
export type GoldenRow = Tables["golden_set"]["Row"];
export type AnswerCitation = { title: string; source?: string; url?: string; n?: number };

/* --------------------------------- answers -------------------------------- */

export const listAnswerLogFn = createServerFn({ method: "GET" }).handler(async () => {
  const db = getServerSupabase();
  const [answers, golden] = await Promise.all([
    db.from("answer_log").select("*").order("created_at", { ascending: false }).limit(300),
    db.from("golden_set").select("*").order("created_at", { ascending: false }),
  ]);
  if (answers.error && isMissingSchema(answers.error)) {
    return { answers: [] as AnswerRow[], golden: [] as GoldenRow[], needsMigration: true };
  }
  if (answers.error) throw dbError(answers.error, "Could not load the answer log");
  if (golden.error) throw dbError(golden.error, "Could not load the golden set");
  return { answers: answers.data, golden: golden.data, needsMigration: false };
});

export const logAnswerFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      question: z.string().trim().min(1),
      answer: z.string().trim().min(1),
      state: z.string().trim().max(20).optional(),
      parcel: z.string().trim().max(300).optional(),
      citations: z
        .array(
          z.object({ title: z.string(), n: z.number().optional(), source: z.string().optional() }),
        )
        .default([]),
      source: z.enum(["preview", "manual"]),
    }),
  )
  .handler(async ({ data }) => {
    const { data: row, error } = await getServerSupabase()
      .from("answer_log")
      .insert({
        question: data.question,
        answer: data.answer,
        state: data.state ?? null,
        parcel: data.parcel ?? null,
        citations: data.citations,
        source: data.source,
      })
      .select()
      .single();
    if (error) throw dbError(error, "Could not log answer");
    await logActivity({
      action: data.source === "preview" ? "Preview answer logged" : "Chatbot answer logged",
      subject: data.question.slice(0, 80),
      detail: data.state ? `State: ${data.state}` : "No state",
      status: "review",
    });
    return row;
  });

export const reviewAnswerFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string().min(1),
      rating: z.enum(["good", "needs-work", "wrong"]).nullable().optional(),
      failureCause: z.enum(["retrieval", "prompt", "not-loaded"]).nullable().optional(),
      reviewNote: z.string().max(4000).optional(),
    }),
  )
  .handler(async ({ data }) => {
    const patch: Tables["answer_log"]["Update"] = { reviewed_at: new Date().toISOString() };
    if (data.rating !== undefined) {
      patch.rating = data.rating;
      if (data.rating === "good" || data.rating === null) patch.failure_cause = null;
    }
    if (data.failureCause !== undefined) patch.failure_cause = data.failureCause;
    if (data.reviewNote !== undefined) patch.review_note = data.reviewNote.trim() || null;

    const { data: row, error } = await getServerSupabase()
      .from("answer_log")
      .update(patch)
      .eq("id", data.id)
      .select()
      .single();
    if (error) throw dbError(error, "Could not save review");
    if (data.rating) {
      await logActivity({
        action: "Answer rated",
        subject: row.question.slice(0, 80),
        detail: `${data.rating}${row.failure_cause ? ` · ${row.failure_cause}` : ""}`,
        status: "review",
      });
    }
    return row;
  });

export const deleteAnswerFn = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().min(1) }))
  .handler(async ({ data }) => {
    const { error } = await getServerSupabase().from("answer_log").delete().eq("id", data.id);
    if (error) throw dbError(error, "Could not delete answer");
    return { id: data.id };
  });

/* -------------------------------- golden set ------------------------------- */

const goldenFields = z.object({
  question: z.string().trim().min(3),
  state: z.enum(CLIENT_STATES),
  expectedAnswer: z.string().trim().min(1),
  requiredPrograms: z.array(z.string().trim().min(1)).default([]),
  sourceAnswerId: z.string().min(1).optional(),
});

export const addGoldenFn = createServerFn({ method: "POST" })
  .validator(goldenFields)
  .handler(async ({ data }) => {
    const { data: row, error } = await getServerSupabase()
      .from("golden_set")
      .insert({
        question: data.question,
        state: data.state,
        expected_answer: data.expectedAnswer,
        required_programs: data.requiredPrograms,
        source_answer_id: data.sourceAnswerId ?? null,
      })
      .select()
      .single();
    if (error) throw dbError(error, "Could not add to the golden set");
    await logActivity({
      action: "Added to golden set",
      subject: data.question.slice(0, 80),
      detail: `State: ${data.state}`,
      status: "approved",
    });
    return row;
  });

export const deleteGoldenFn = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().min(1) }))
  .handler(async ({ data }) => {
    const { error } = await getServerSupabase().from("golden_set").delete().eq("id", data.id);
    if (error) throw dbError(error, "Could not remove golden entry");
    return { id: data.id };
  });

/**
 * Re-asks a golden question against today's Knowledge Base and grades the answer
 * against the verified expected answer.
 */
export const runGoldenFn = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().min(1) }))
  .handler(async ({ data }) => {
    const db = getServerSupabase();
    const { data: entry, error } = await db
      .from("golden_set")
      .select("*")
      .eq("id", data.id)
      .single();
    if (error) throw dbError(error, "Could not load golden entry");

    const preview = await answerQuestion(entry.question, entry.state);
    const verdict = await judgeAnswer({
      question: entry.question,
      expected: entry.expected_answer,
      actual: preview.answer,
      requiredPrograms: entry.required_programs,
    });

    const { data: updated, error: saveError } = await db
      .from("golden_set")
      .update({
        last_run_at: new Date().toISOString(),
        last_run_answer: preview.answer,
        last_run_passed: verdict.passed,
        last_run_reason: verdict.reason,
      })
      .eq("id", entry.id)
      .select()
      .single();
    if (saveError) throw dbError(saveError, "Could not save the check result");

    await logActivity({
      action: verdict.passed ? "Golden check passed" : "Golden check failed",
      subject: entry.question.slice(0, 80),
      detail: verdict.reason,
      status: verdict.passed ? "approved" : "review",
    });
    return updated;
  });
