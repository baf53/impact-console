# Chatbot integration: reading state knowledge from Supabase

How the public chatbot at ourcollectiveimpact.com reads the housing-subsidy knowledge that the Collective Impact console publishes. The console is the only writer; the chatbot only reads.

## Connection

Use the project's **publishable** key (the same one any browser can see):

```ts
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
```

Never ship the secret key to the chatbot.

## What you can read

Once `supabase_step2_security.sql` has been applied, the publishable key can read only these tables, and cannot write to any table.

| Table | Visible rows | Purpose |
| --- | --- | --- |
| `knowledge_programs` | all | One row per funding program |
| `program_notes` | `routing = 'program-level'` | Practitioner knowledge attached to a program |
| `program_documents` | all | Citations for regulations and plans behind a program |
| `app_documents` | `status = 'Approved'` and no client attached | Uploaded guideline PDFs, NOFAs and forms |

`clients`, `transcripts`, `extractions`, `client_alerts`, `proposals_and_reports` and `app_activity_log` are private to the console.

## Filtering by state

Every program and note carries a `state` of `'OK'`, `'KS'`, `'FL'`, `'MD'` or `'Federal'`. A visitor in a given state should see that state's programs plus Federal ones:

```ts
const { data: programs, error } = await supabase
  .from("knowledge_programs")
  .select("*, program_notes(*), program_documents(*)")
  .in("state", [userState, "Federal"])
  .order("name");
```

Useful columns on `knowledge_programs`:
- `name`, `administrator`, `level` (`Federal` | `State` | `Local` | `Quasi`), `jurisdiction`
- `cities` (text[]): the cities the program has been loaded for
- `funds`, `overview`, `eligibility_criteria`
- `coverage` (0–100): how well the program is sourced. Below 25 means the console flags it as thin, so answer cautiously or say the information is incomplete.

Each `program_notes` row has `text`, `call_date` and `state`. **Don't display `source_call` publicly**, because it can name the client whose call the note came from.

## Documents

`app_documents.storage_path` points into the `documents` storage bucket. While the bucket is public:

```ts
const { data } = supabase.storage.from("documents").getPublicUrl(doc.storage_path);
```

If the bucket is made private, use `createSignedUrl(doc.storage_path, 60)` instead.

## Freshness

Notes are written when the operator approves a transcript in the console's Pipeline. Programs and documents change when they're edited in the Knowledge Base. There's no publish step beyond that, so query at request time or cache briefly.

## Logging answers (optional)

To let Collective Impact review the chatbot's answers in the console's Answer Log, have the chatbot's **server** post each answer after it's sent. The browser must never post directly, because that would expose the secret.

```ts
await fetch("https://<console-domain>/api/chatbot/answers", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${process.env.CHATBOT_LOG_SECRET}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    question,                 // what the visitor asked
    answer,                   // what the chatbot replied
    state: userState,         // e.g. "OK"
    parcel,                   // optional address the visitor asked about
    citations: [{ title: "Oklahoma Increased Housing Program — program overview" }],
  }),
});
```

The endpoint replies `201` with `{ ok: true, id }`. A wrong or missing secret returns `401`. Logging is write-only and doesn't change the chatbot's read-only database access.
