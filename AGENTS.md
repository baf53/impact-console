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

# Collective Impact Console — Architecture, Scale & Rules

## 1. System Role & Data Flow
This app is the private internal data operations console for **Collective Impact**. It is used by **one admin user** to manage sales calls, onboarding, and state housing subsidies. It feeds the public AI chatbot at [ourcollectiveimpact.com](https://ourcollectiveimpact.com/).

```
Meeting (Granola/Zoom) ➔ Transcript ➔ AI Review ➔ Supabase ➔ Frontend Chatbot (ourcollectiveimpact.com)
```

## 2. Scale & Tier Architecture
- **Tier 1 (Presentation)**: TanStack Start (React 19) + TanStack Router + Tailwind CSS v4 + Radix UI. Data-dense Linear/Notion aesthetics.
- **Tier 2 (Execution)**: TanStack Start Server Functions / Nitro handlers for secure AI (Gemini) extraction and webhook triggers.
- **Tier 3 (Data & Storage)**: Supabase PostgreSQL (PostgREST API) + Supabase Storage (`documents` bucket).
- **Tier 4 (Edge Distribution)**: Public chatbot at `ourcollectiveimpact.com` queries Supabase knowledge read-only by user state (e.g. KS vs OK).

## 3. Mandatory Architectural Rules

### Data & Workflow Rules
1. **Unidirectional Flow**: Raw meeting transcripts are ingested, processed by AI into 5 structured buckets, reviewed by the admin, and saved to Supabase before reaching the chatbot or reports.
2. **Single Source of Truth**: Supabase is the sole persistent store. No mock in-memory stores in production.
3. **State Partitioning**: All subsidy programs, notes, and guidelines MUST be tagged with an explicit `state` (e.g., `'OK'`, `'KS'`, `'FL'`, `'MD'`, or `'Federal'`) to enable geographic filtering for the chatbot.
4. **5-Bucket Extraction Taxonomy**: AI extractions must strictly categorize findings into:
   - `pain_point`
   - `required_info`
   - `missing_document`
   - `next_step`
   - `state_subsidy`
5. **No Auth Perimeter**: This is an internal tool for a single operator. Avoid adding blocking auth walls unless explicitly requested.

### Frontend & State Rules
1. **TanStack Query Only**: All Supabase data must flow through TanStack Query (`useQuery`, `useMutation`). Do not duplicate server data in global React context.
2. **Optimistic Updates**: Pipeline kanban transitions must update the UI optimistically and emit toast notifications via `sonner`.
3. **Design System**: Respect dark/light mode tokens, deep teal primary accent, and high data density.

### Database & Storage Rules
1. **Relational Integrity**: Use foreign keys with cascade or set-null rules (`clients` ➔ `transcripts` ➔ `extractions`).
2. **Audit Logging**: Any administrative mutation must append to `activity_log`.
3. **File Storage**: Upload files to Supabase Storage (`documents` bucket); store only paths/metadata in PostgreSQL.
