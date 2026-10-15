import { createFileRoute } from "@tanstack/react-router";

import { parseTimedTranscript } from "@/lib/transcript-files";
import { json } from "@/server/http.server";
import { saveImportedTranscript } from "@/server/ingest.server";
import {
  downloadZoomTranscript,
  findTranscriptFile,
  verifyZoomSignature,
  zoomUrlValidation,
  type ZoomTranscriptEvent,
} from "@/server/zoom.server";

/**
 * Zoom webhook. Subscribe a Zoom Marketplace app to `recording.transcript_completed`
 * (with "include download token" on) and set ZOOM_WEBHOOK_SECRET_TOKEN to the app's
 * secret token. Finished transcripts land in the Pipeline's Intake column.
 */
export const Route = createFileRoute("/api/webhooks/zoom")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["ZOOM_WEBHOOK_SECRET_TOKEN"];
        if (!secret) return json({ error: "ZOOM_WEBHOOK_SECRET_TOKEN is not set." }, 503);

        const rawBody = await request.text();
        let event: ZoomTranscriptEvent & { payload?: { plainToken?: string } };
        try {
          event = JSON.parse(rawBody);
        } catch {
          return json({ error: "Invalid JSON" }, 400);
        }

        const signed = await verifyZoomSignature({
          rawBody,
          timestamp: request.headers.get("x-zm-request-timestamp"),
          signature: request.headers.get("x-zm-signature"),
          secret,
        });
        if (!signed) return json({ error: "Invalid signature" }, 401);

        if (event.event === "endpoint.url_validation" && event.payload?.plainToken) {
          return json(await zoomUrlValidation(event.payload.plainToken, secret));
        }
        if (event.event !== "recording.transcript_completed") {
          return json({ ignored: event.event });
        }

        const meeting = event.payload?.object;
        const file = findTranscriptFile(event);
        if (!meeting?.uuid || !file?.download_url || !event.download_token) {
          return json({ error: "No downloadable transcript in this event." }, 422);
        }

        try {
          const vtt = await downloadZoomTranscript(file.download_url, event.download_token);
          const { transcript, duplicate } = await saveImportedTranscript({
            source: "Zoom",
            title: meeting.topic || "Zoom meeting",
            text: parseTimedTranscript(vtt) || vtt,
            callDate: meeting.start_time ?? null,
            externalId: `zoom:${meeting.uuid}`,
          });
          return json({ ok: true, transcriptId: transcript.id, duplicate });
        } catch (err) {
          console.error("Zoom transcript import failed:", err);
          return json({ error: err instanceof Error ? err.message : "Import failed" }, 500);
        }
      },
    },
  },
});
