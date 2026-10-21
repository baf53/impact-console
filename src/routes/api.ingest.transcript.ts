import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { json, readJson, requireBearer } from "@/server/http.server";
import { saveImportedTranscript } from "@/server/ingest.server";

const payloadSchema = z.object({
  text: z.string().trim().min(1, "text is required"),
  title: z.string().trim().min(1).max(200).optional(),
  source: z.enum(["Granola", "Zoom", "Manual"]).default("Granola"),
  meeting_type: z.enum(["meeting_1", "meeting_2", "ad_hoc"]).optional(),
  client_id: z.string().min(1).optional(),
  client_email: z.string().email().optional(),
  call_date: z.string().optional(),
  external_id: z.string().min(1).max(200).optional(),
});

/**
 * Generic transcript intake for automations (e.g. Granola → Zapier/Make → here).
 * Auth: `Authorization: Bearer <INGEST_WEBHOOK_SECRET>`. Body: JSON matching
 * payloadSchema. The transcript lands in Intake; a matching client_id or client_email
 * links it to a deal, otherwise it's assigned in the Pipeline.
 */
export const Route = createFileRoute("/api/ingest/transcript")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const denied = requireBearer(request, "INGEST_WEBHOOK_SECRET");
        if (denied) return denied;

        const parsed = payloadSchema.safeParse(await readJson(request));
        if (!parsed.success) {
          return json(
            { error: "Invalid payload", issues: parsed.error.flatten().fieldErrors },
            400,
          );
        }
        const body = parsed.data;
        try {
          const result = await saveImportedTranscript({
            source: body.source,
            text: body.text,
            title: body.title ?? `${body.source} call`,
            ...(body.meeting_type ? { meetingType: body.meeting_type } : {}),
            clientId: body.client_id ?? null,
            clientEmail: body.client_email ?? null,
            callDate: body.call_date ?? null,
            externalId: body.external_id
              ? `${body.source.toLowerCase()}:${body.external_id}`
              : null,
          });
          return json(
            {
              ok: true,
              transcriptId: result.transcript.id,
              duplicate: result.duplicate,
              matchedClient: result.matchedClient,
            },
            result.duplicate ? 200 : 201,
          );
        } catch (err) {
          console.error("Transcript ingest failed:", err);
          return json({ error: err instanceof Error ? err.message : "Import failed" }, 500);
        }
      },
    },
  },
});
