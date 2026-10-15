-- ====================================================================
-- Collective Impact Console & Supabase Backend — Step 3: Feature tables
--
-- Adds the tables behind the Answer Log, Golden Set and Grants.gov feed,
-- and an external_id on transcripts so automatic imports (Zoom, Granola,
-- Grants.gov) are never saved twice. Safe to run before or after step 2.
-- Every table here is private: RLS is on with no public policies, and only
-- the console's server (secret key) can read or write them.
-- ====================================================================

-- --------------------------------------------------------------------
-- 1. ANSWER LOG — answers the chatbot gave (or the console previewed)
-- --------------------------------------------------------------------
create table if not exists public.answer_log (
    id text primary key default gen_random_uuid()::text,
    question text not null,
    answer text not null,
    state text,                         -- state the answer was given for, e.g. 'OK'
    parcel text,                        -- optional address / parcel context
    citations jsonb not null default '[]',
    source text not null default 'chatbot' check (source in ('chatbot', 'preview', 'manual')),
    rating text check (rating in ('good', 'needs-work', 'wrong')),
    failure_cause text check (failure_cause in ('retrieval', 'prompt', 'not-loaded')),
    review_note text,
    reviewed_at timestamptz,
    created_at timestamptz default now()
);
create index if not exists answer_log_created_at_idx on public.answer_log (created_at desc);

-- --------------------------------------------------------------------
-- 2. GOLDEN SET — verified question/answer pairs used as an acceptance test
-- --------------------------------------------------------------------
create table if not exists public.golden_set (
    id text primary key default gen_random_uuid()::text,
    question text not null,
    state text not null,
    expected_answer text not null,
    required_programs text[] not null default '{}',
    source_answer_id text references public.answer_log(id) on delete set null,
    last_run_at timestamptz,
    last_run_answer text,
    last_run_passed boolean,
    last_run_reason text,
    created_at timestamptz default now()
);

-- --------------------------------------------------------------------
-- 3. GRANTS.GOV FEED — opportunities the operator chose to ignore
-- --------------------------------------------------------------------
create table if not exists public.funding_feed_dismissed (
    opportunity_id text primary key,
    title text not null,
    dismissed_at timestamptz default now()
);

-- --------------------------------------------------------------------
-- 4. TRANSCRIPTS — de-duplicate automatic imports
-- --------------------------------------------------------------------
alter table public.transcripts add column if not exists external_id text;
create unique index if not exists transcripts_external_id_key
    on public.transcripts (external_id) where external_id is not null;

-- --------------------------------------------------------------------
-- 5. PRIVATE BY DEFAULT
-- --------------------------------------------------------------------
alter table public.answer_log enable row level security;
alter table public.golden_set enable row level security;
alter table public.funding_feed_dismissed enable row level security;
