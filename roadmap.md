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
- [ ] Answer Log and Assistant & Map still use mock data (outside the 6-step plan)
- [ ] Grants.gov feed in the Pipeline is still sample data
