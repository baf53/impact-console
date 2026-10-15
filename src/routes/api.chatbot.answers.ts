import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { json, readJson, requireBearer } from "@/server/http.server";
import { dbError, getServerSupabase } from "@/server/supabase.server";

const payloadSchema = z.object({
  question: z.string().trim().min(1).max(4000),
  answer: z.string().trim().min(1).max(20000),
  state: z.string().trim().max(20).optional(),
  parcel: z.string().trim().max(300).optional(),
  citations: z
    .array(
      z.object({
        title: z.string().trim().min(1).max(500),
        source: z.string().trim().max(500).optional(),
        url: z.string().url().optional(),
      }),
    )
    .max(50)
    .default([]),
});

/**
 * The public chatbot's backend posts each answer here so it appears in the Answer Log.
 * Auth: `Authorization: Bearer <CHATBOT_LOG_SECRET>` (server-to-server only — never
 * from the visitor's browser). The chatbot itself keeps read-only database access.
 */
export const Route = createFileRoute("/api/chatbot/answers")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const denied = requireBearer(request, "CHATBOT_LOG_SECRET");
        if (denied) return denied;

        const parsed = payloadSchema.safeParse(await readJson(request));
        if (!parsed.success) {
          return json(
            { error: "Invalid payload", issues: parsed.error.flatten().fieldErrors },
            400,
          );
        }
        const { question, answer, state, parcel, citations } = parsed.data;
        const { data, error } = await getServerSupabase()
          .from("answer_log")
          .insert({
            question,
            answer,
            state: state ?? null,
            parcel: parcel ?? null,
            citations,
            source: "chatbot",
          })
          .select("id")
          .single();
        if (error) {
          console.error(dbError(error, "Could not log chatbot answer").message);
          return json({ error: "Could not log answer" }, 500);
        }
        return json({ ok: true, id: data.id }, 201);
      },
    },
  },
});
