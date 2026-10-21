<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

# Collective Impact Console — Architecture & Rules

## 1. What this app is
The internal data console for **Collective Impact**, used by the Collective Impact team to manage sales calls, client onboarding and state housing subsidies. Approved knowledge is stored per state so the public chatbot at [ourcollectiveimpact.com](https://ourcollectiveimpact.com/) can answer by the visitor's state.

```
Meeting (Granola/Zoom) ➔ Transcript ➔ AI extraction ➔ Human review ➔ Supabase ➔ Chatbot (ourcollectiveimpact.com)
```

## 2. Stack
- **UI**: TanStack Start (React 19) + TanStack Router + Tailwind CSS v4 + Radix UI. Data-dense Linear/Notion look.
- **Server**: TanStack Start server functions and server routes (webhooks), deployed by Lovable to Cloudflare. AI runs on the server with Google Gemini.
- **Data**: Supabase PostgreSQL + Supabase Storage (`documents` bucket, shared with another system).
- **Chatbot**: reads approved knowledge read-only, filtered by state. See `docs/chatbot-integration.md`.

## 3. Rules

### Code layout (breaking these breaks the app)
1. **Server functions** (`createServerFn`) live in `src/functions/*.ts`. The browser imports them.
2. **Server-only code and secrets** live in `src/server/*.server.ts` and are imported only inside server-function handlers or server routes. Lovable's build blocks any browser import from a `server/` folder.
3. **All database access goes through server functions**, using the server's Supabase client (`getServerSupabase()`). The browser never talks to the database directly.
4. **Secrets** (`SUPABASE_SECRET_KEY`, `GEMINI_API_KEY`, webhook secrets) are server-only environment variables. Never prefix them with `VITE_` and never commit them. `.env` is git-ignored; see `docs/integrations.md`.

### Data & workflow
1. **One direction**: transcripts are extracted by AI, reviewed by a person, and only approved items leave the Pipeline.
2. **Supabase is the only store**: no mock or demo data in the app or in migrations.
3. **State tagging**: every program and note carries a `state` of `'OK'`, `'KS'`, `'FL'`, `'MD'` or `'Federal'`. A new program takes the state named in it ("Kansas …" → KS, CDBG/HOME/LIHTC → Federal), otherwise the deal's state.
4. **5 extraction categories**, validated with Zod: `pain_point`, `required_info`, `missing_document`, `next_step`, `state_subsidy`.
5. **No login yet**: whether to add one is an open decision. Don't add an auth wall unless asked.

### Frontend
1. **TanStack Query only**: server data flows through `useQuery` / `useMutation` (hooks in `src/hooks/`), never global React context.
2. **Optimistic updates with rollback** for board moves and item reviews.
3. **A `sonner` toast for every mutation**, success and failure.
4. **Design**: respect the light/dark tokens, the deep-teal primary colour and high data density.

### Database & storage
1. **Foreign keys**: deleting a transcript deletes its extractions; deleting a client keeps their transcripts, unassigned, so call records are never lost.
2. **Audit log**: every change made in the console appends a row to `app_activity_log`.
3. **Files**: stored in the `documents` bucket under the `console/` prefix; PostgreSQL holds only paths and metadata. Downloads use short-lived signed URLs.
4. **Migrations**: plain SQL files at the repo root, run by hand in the Supabase SQL Editor: `supabase_step1_migration.sql`, then `supabase_step3_features.sql`, then `supabase_step2_security.sql` (only after `SUPABASE_SECRET_KEY` is set wherever the console runs).

### Before pushing
Run `npm test`, `npx tsc --noEmit` and `npm run build`; all three must pass.
