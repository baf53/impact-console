-- ====================================================================
-- Collective Impact Console & Supabase Backend — Step 1 Migration
-- Run this in your Supabase Dashboard: SQL Editor -> New Query -> Run
-- ====================================================================

-- Enable necessary extensions
create extension if not exists "uuid-ossp";

-- --------------------------------------------------------------------
-- 1. CLIENTS & DEALS (Sales & Onboarding Pipeline)
-- --------------------------------------------------------------------
create table if not exists public.clients (
    id text primary key default gen_random_uuid()::text,
    client_name text not null,
    contact_name text,
    organization text not null,
    email text,
    phone text,
    parcel_address text not null,
    city text not null,
    state text not null, -- Primary state (e.g. 'OK', 'KS', 'FL', 'MD')
    deal_stage text not null default 'meeting_1' check (deal_stage in ('meeting_1', 'meeting_2', 'demo_prep', 'proposal', 'contract', 'active')),
    alerts_enabled boolean default true,
    target_programs text[] default '{}',
    original_call_date text default to_char(current_date, 'Mon DD, YYYY'),
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- --------------------------------------------------------------------
-- 2. TRANSCRIPTS (Granola & Zoom Intake for Meeting 1 & Meeting 2)
-- --------------------------------------------------------------------
create table if not exists public.transcripts (
    id text primary key default gen_random_uuid()::text,
    client_id text references public.clients(id) on delete set null,
    project_label text not null,
    organization text not null,
    meeting_type text not null default 'meeting_1' check (meeting_type in ('meeting_1', 'meeting_2', 'ad_hoc', 'funding_feed')),
    source text not null default 'Granola' check (source in ('Granola', 'Zoom', 'Manual', 'Grants.gov')),
    call_date text not null default to_char(current_date, 'Mon DD, YYYY'),
    programs text[] default '{}',
    status text not null default 'ready' check (status in ('new', 'extracting', 'ready', 'approved')),
    stage text not null default 'in-review' check (stage in ('intake', 'extracted', 'in-review', 'approved')),
    raw_text text not null,
    created_at timestamptz default now()
);

-- --------------------------------------------------------------------
-- 3. EXTRACTIONS (The 5 Canonical AI Buckets)
-- --------------------------------------------------------------------
create table if not exists public.extractions (
    id text primary key default gen_random_uuid()::text,
    transcript_id text references public.transcripts(id) on delete cascade,
    client_id text references public.clients(id) on delete set null,
    category text not null check (category in (
        'pain_point',       -- Financing gaps, zoning issues, site control
        'required_info',    -- Unit counts, AMI targets, schedule
        'missing_document', -- Phase 1 ESA, deed, pro forma, tax returns
        'next_step',        -- Action items before next call / contract
        'state_subsidy'     -- Matched state/federal subsidy programs
    )),
    title text not null,
    body text not null,
    facts text[] default '{}',
    routing text not null default 'program-level' check (routing in ('program-level', 'site-level')),
    status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
    confidence text default 'High' check (confidence in ('High', 'Medium', 'Low')),
    created_at timestamptz default now()
);

-- --------------------------------------------------------------------
-- 4. KNOWLEDGE PROGRAMS (Feeds the ourcollectiveimpact.com Chatbot)
-- --------------------------------------------------------------------
create table if not exists public.knowledge_programs (
    id text primary key,
    name text not null,
    state text not null, -- e.g. 'OK', 'KS', 'FL', 'MD', or 'Federal'
    administrator text not null,
    level text not null check (level in ('Federal', 'State', 'Local', 'Quasi')),
    jurisdiction text not null,
    cities text[] default '{}',
    coverage int default 100,
    funds text not null,
    overview text not null,
    eligibility_criteria text,
    created_at timestamptz default now()
);

-- Sub-entities for Knowledge Programs (RAG context for chatbot)
create table if not exists public.program_notes (
    id text primary key default gen_random_uuid()::text,
    program_id text references public.knowledge_programs(id) on delete cascade,
    state text not null,
    text text not null,
    source_call text,
    call_date text,
    routing text default 'program-level',
    created_at timestamptz default now()
);

create table if not exists public.program_contacts (
    id text primary key default gen_random_uuid()::text,
    program_id text references public.knowledge_programs(id) on delete cascade,
    name text not null,
    title text not null,
    org text not null,
    phone text,
    email text,
    created_at timestamptz default now()
);

create table if not exists public.program_documents (
    id text primary key default gen_random_uuid()::text,
    program_id text references public.knowledge_programs(id) on delete cascade,
    title text not null,
    kind text not null,
    citation text not null,
    approved_on text not null,
    created_at timestamptz default now()
);

-- --------------------------------------------------------------------
-- 5. DOCUMENTS (Library & Client Uploads)
-- --------------------------------------------------------------------
-- If public.documents exists, adapt it; otherwise create clean
create table if not exists public.app_documents (
    id text primary key default gen_random_uuid()::text,
    client_id text references public.clients(id) on delete set null,
    program_id text references public.knowledge_programs(id) on delete set null,
    title text not null,
    type text not null, -- 'Regulation', 'Agency guidance', 'Consolidated Plan', 'Application form', 'Checklist', 'Missing Document'
    program text,
    jurisdiction text,
    state text,
    status text not null default 'Approved' check (status in ('Approved', 'Pending review', 'Needed')),
    added_on text default to_char(current_date, 'Mon DD, YYYY'),
    file_name text not null,
    storage_path text,
    created_at timestamptz default now()
);

-- --------------------------------------------------------------------
-- 6. CLIENT ALERTS & DISPATCH
-- --------------------------------------------------------------------
create table if not exists public.client_alerts (
    id text primary key default gen_random_uuid()::text,
    client_id text references public.clients(id) on delete cascade,
    title text not null,
    trigger text not null,
    status text not null default 'draft' check (status in ('draft', 'approved', 'sent')),
    created_on text default to_char(current_date, 'Mon DD, YYYY'),
    sent_on text,
    draft_email text not null,
    created_at timestamptz default now()
);

-- --------------------------------------------------------------------
-- 7. PROPOSALS & REPORTS (Sales Enablement)
-- --------------------------------------------------------------------
create table if not exists public.proposals_and_reports (
    id text primary key default gen_random_uuid()::text,
    client_id text references public.clients(id) on delete cascade,
    project_label text not null,
    report_type text not null default 'proposal' check (report_type in ('proposal', 'demo', 'contract_spec', 'stacking_report')),
    title text not null,
    generated_on text default to_char(current_date, 'Mon DD, YYYY'),
    program_count int not null default 0,
    parcel_summary text,
    focus text[] default '{}',
    programs jsonb default '[]',
    stacking text,
    cash_flow jsonb default '[]',
    citations jsonb default '[]',
    created_at timestamptz default now()
);

-- --------------------------------------------------------------------
-- 8. ACTIVITY LOG (Dashboard live feed)
-- --------------------------------------------------------------------
create table if not exists public.app_activity_log (
    id text primary key default gen_random_uuid()::text,
    action text not null,
    subject text not null,
    detail text not null,
    occurred_at text not null default 'Just now',
    status text not null check (status in ('approved', 'review', 'generated', 'updated')),
    created_at timestamptz default now()
);

-- --------------------------------------------------------------------
-- 9. ROW LEVEL SECURITY (RLS) POLICIES
-- Since this is an internal console with no auth wall, allow anon full access
-- --------------------------------------------------------------------
alter table public.clients enable row level security;
alter table public.transcripts enable row level security;
alter table public.extractions enable row level security;
alter table public.knowledge_programs enable row level security;
alter table public.program_notes enable row level security;
alter table public.program_contacts enable row level security;
alter table public.program_documents enable row level security;
alter table public.app_documents enable row level security;
alter table public.client_alerts enable row level security;
alter table public.proposals_and_reports enable row level security;
alter table public.app_activity_log enable row level security;

-- Drop any existing conflicting policies
drop policy if exists "allow_anon_all_clients" on public.clients;
drop policy if exists "allow_anon_all_transcripts" on public.transcripts;
drop policy if exists "allow_anon_all_extractions" on public.extractions;
drop policy if exists "allow_anon_all_programs" on public.knowledge_programs;
drop policy if exists "allow_anon_all_notes" on public.program_notes;
drop policy if exists "allow_anon_all_contacts" on public.program_contacts;
drop policy if exists "allow_anon_all_prog_docs" on public.program_documents;
drop policy if exists "allow_anon_all_app_docs" on public.app_documents;
drop policy if exists "allow_anon_all_alerts" on public.client_alerts;
drop policy if exists "allow_anon_all_reports" on public.proposals_and_reports;
drop policy if exists "allow_anon_all_activity" on public.app_activity_log;

create policy "allow_anon_all_clients" on public.clients for all to anon, authenticated using (true) with check (true);
create policy "allow_anon_all_transcripts" on public.transcripts for all to anon, authenticated using (true) with check (true);
create policy "allow_anon_all_extractions" on public.extractions for all to anon, authenticated using (true) with check (true);
create policy "allow_anon_all_programs" on public.knowledge_programs for all to anon, authenticated using (true) with check (true);
create policy "allow_anon_all_notes" on public.program_notes for all to anon, authenticated using (true) with check (true);
create policy "allow_anon_all_contacts" on public.program_contacts for all to anon, authenticated using (true) with check (true);
create policy "allow_anon_all_prog_docs" on public.program_documents for all to anon, authenticated using (true) with check (true);
create policy "allow_anon_all_app_docs" on public.app_documents for all to anon, authenticated using (true) with check (true);
create policy "allow_anon_all_alerts" on public.client_alerts for all to anon, authenticated using (true) with check (true);
create policy "allow_anon_all_reports" on public.proposals_and_reports for all to anon, authenticated using (true) with check (true);
create policy "allow_anon_all_activity" on public.app_activity_log for all to anon, authenticated using (true) with check (true);

-- --------------------------------------------------------------------
-- 10. SUPABASE STORAGE BUCKET FOR DOCUMENTS
-- --------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('documents', 'documents', true)
on conflict (id) do update set public = true;

drop policy if exists "allow_anon_documents_storage_select" on storage.objects;
drop policy if exists "allow_anon_documents_storage_insert" on storage.objects;
drop policy if exists "allow_anon_documents_storage_update" on storage.objects;
drop policy if exists "allow_anon_documents_storage_delete" on storage.objects;

create policy "allow_anon_documents_storage_select" on storage.objects for select to anon, authenticated using (bucket_id = 'documents');
create policy "allow_anon_documents_storage_insert" on storage.objects for insert to anon, authenticated with check (bucket_id = 'documents');
create policy "allow_anon_documents_storage_update" on storage.objects for update to anon, authenticated using (bucket_id = 'documents') with check (bucket_id = 'documents');
create policy "allow_anon_documents_storage_delete" on storage.objects for delete to anon, authenticated using (bucket_id = 'documents');

-- --------------------------------------------------------------------
-- 11. NO SEED DATA
-- --------------------------------------------------------------------
-- An earlier version inserted demo clients, programs and notes here. They were
-- invented examples, not verified program facts, so they were removed: the
-- Knowledge Base is filled from the console (Add program / approved calls).
