# Integrations and settings

Every external service the console uses is switched on by an environment variable. Locally they go in `.env`. For the deployed console, add them in Lovable's environment settings. The Dashboard's **Setup** list shows which ones are active.

| Variable | Needed for | Required? |
| --- | --- | --- |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | Connecting to Supabase | Yes |
| `SUPABASE_SECRET_KEY` | Server access to the database (Supabase → Project Settings → API Keys → Secret key) | Yes |
| `GEMINI_API_KEY` | AI extraction, answer previews, golden-set checks, report stacking analysis | Yes, for AI features |
| `GEMINI_MODEL` | Overrides the model (default `gemini-3.8-flash`) | No |
| `RESEND_API_KEY`, `ALERT_FROM_EMAIL` | Sending client alerts by email | No (alerts open in your email app instead) |
| `ALERT_REPLY_TO` | Where client replies to alerts go | No |
| `ZOOM_WEBHOOK_SECRET_TOKEN` | Importing Zoom transcripts automatically | No |
| `INGEST_WEBHOOK_SECRET` | Importing transcripts from Granola or other tools | No |
| `CHATBOT_LOG_SECRET` | Letting the chatbot record its answers in the Answer Log | No |

Restart `npm run dev` after editing `.env`. For any secret, generate a long random value, for example with `openssl rand -hex 32`, and never put it in code or chat.

## Database migrations

Run these in Supabase → SQL Editor, in order:

1. `supabase_step1_migration.sql`: core tables (already done).
2. `supabase_reset_demo_data.sql`: clears demo and test data (one-off).
3. `supabase_step3_features.sql`: tables for the Answer Log, Golden Set and Grants.gov feed. Safe to run at any time.
4. `supabase_step2_security.sql`: locks down public access. Run it **after** `SUPABASE_SECRET_KEY` is set everywhere the console runs.

## Zoom: automatic transcript import

When a cloud recording's transcript is ready, Zoom sends it to the console and it appears in the Pipeline's **Intake** column.

1. In Zoom account settings, enable **Cloud recording** and **Create audio transcript**. This requires a paid Zoom plan.
2. In the Zoom App Marketplace, create an app (a General App works) and open its **Event Subscriptions**.
3. Set the endpoint URL to `https://<your-console-domain>/api/webhooks/zoom`.
4. Subscribe to the event **Recording → "Recording transcript files have completed"** (`recording.transcript_completed`).
5. Copy the app's **Secret Token** into `ZOOM_WEBHOOK_SECRET_TOKEN`, deploy, then click **Validate** in Zoom. The console answers Zoom's validation challenge automatically.
6. If Zoom offers to include a download token in the event payload, turn it on. The console uses it to fetch the transcript file.

Zoom calls aren't linked to a client automatically. Open the card in Intake, choose the client and meeting stage under **Not linked to a client**, then run AI extraction.

## Granola, or any other tool: webhook import

The console accepts transcripts at `POST https://<your-console-domain>/api/ingest/transcript`. Granola can send to it through an automation tool such as Zapier, Make or n8n, if your Granola plan includes that kind of integration. Configure the automation's "webhook / HTTP request" step like this:

- **Header:** `Authorization: Bearer <INGEST_WEBHOOK_SECRET>`
- **Body (JSON):**

```json
{
  "text": "Full transcript or meeting notes",
  "title": "Call with Sarah — Wichita site",
  "source": "Granola",
  "meeting_type": "meeting_1",
  "client_email": "sarah@example.org",
  "call_date": "2026-10-15",
  "external_id": "granola-note-id"
}
```

Only `text` is required.
- `client_email` (or `client_id`) links the call to an existing client.
- `meeting_type` can be `meeting_1`, `meeting_2` or `ad_hoc`.
- `source` can be `Granola`, `Zoom` or `Manual`.
- `external_id` stops the same note being imported twice; it needs step 3.

To test from a terminal:

```bash
curl -X POST https://<your-console-domain>/api/ingest/transcript \
  -H "Authorization: Bearer $INGEST_WEBHOOK_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"text":"Test call notes","title":"Webhook test","source":"Granola"}'
```

## Client alert emails (Resend)

1. Create a Resend account and verify the domain you'll send from.
2. Create an API key and set `RESEND_API_KEY`.
3. Set `ALERT_FROM_EMAIL` to an address on the verified domain, for example `alerts@yourdomain.com`.
4. Optionally set `ALERT_REPLY_TO` to the inbox that should receive client replies.

Once set, approved alerts in **Client Sites → Alerts queue** show a **Send email** button. Nothing is ever sent without your approval.

## Chatbot answer logging

Share `CHATBOT_LOG_SECRET` with the chatbot team. Their **server**, never the visitor's browser, posts each answer to `/api/chatbot/answers`; `docs/chatbot-integration.md` has the details. Logged answers appear in the **Answer Log** for review.

## Grants.gov

No setup is needed. The Pipeline's **Grants.gov feed** reads the public Grants.gov API, and **Add to Intake** and **Dismiss** need step 3.
