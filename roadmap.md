# Roadmap

- [x] Shell, nav, mock data, Dashboard
- [x] Transcript Intake
- [x] Review & Approve
- [x] Knowledge Base
- [x] Assistant & Map (placeholder with MVP screenshot)
- [x] Answer Log + Golden Set
- [x] Reports
- [x] Documents library
- [x] Funding Opportunities (Grants.gov feed)
- [x] Paste-in manual funding opportunities
- [x] Client Sites & Alerts
- [x] Chicago-style hover citation consistency pass (Assistant & Map, Answer Log, Reports)
- [x] Merged Documents into Knowledge Base tab
- [x] Merged Transcript Intake + Funding Opportunities + Review & Approve into one Pipeline kanban

## Supabase backend (plan: steps 1–6)

- [x] 1. Database tables + seed data (`supabase_step1_migration.sql`)
- [x] 2. Pipeline intake on Supabase via server functions
- [ ] 3. AI extraction (Gemini) — code done; needs `GEMINI_API_KEY` to go live
- [x] 4. Knowledge Base on Supabase + chatbot query (`docs/chatbot-integration.md`)
- [x] 5. Proposals, missing-documents checklist, deal stages, client alerts
- [x] 6. Supabase Storage uploads/downloads (signed URLs)
- [ ] Security lockdown — set `SUPABASE_SECRET_KEY`, then run `supabase_step2_security.sql`
- [x] Answer Log + Golden Set on Supabase (needs `supabase_step3_features.sql`)
- [x] Assistant & Map: live site embed, per-state chatbot view, grounded answer preview
- [x] Live Grants.gov feed in the Pipeline
- [x] Transcript file upload (.txt, .md, .vtt, .srt, .docx)
- [x] Automatic import: Zoom webhook and generic ingest webhook (Granola via Zapier/Make)
- [x] Client alert emails via Resend (falls back to your email app)
- [x] AI stacking analysis in reports (needs the Gemini key)
- [x] Unit tests (`npm test`)
- [ ] Run `supabase_reset_demo_data.sql` and `supabase_step3_features.sql`
- [ ] Optional keys: Resend, Zoom, ingest webhook, chatbot logging (see `docs/integrations.md`)
