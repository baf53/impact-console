-- ====================================================================
-- Collective Impact Console & Supabase Backend — Step 2: Security
--
-- Step 1 let the public (anon) key read AND write every table. That key
-- ships to browsers, including the public chatbot, so anyone holding it
-- could read client deals or delete data. This migration:
--   * removes the open anon policies,
--   * gives anon/authenticated READ-ONLY access to published knowledge,
--   * removes anon write/delete access to the shared `documents` bucket.
--
-- The console keeps full access because its server functions use the
-- secret key (service_role bypasses RLS).
--
-- ORDER MATTERS:
--   1. Add SUPABASE_SECRET_KEY (Supabase → Project Settings → API keys →
--      Secret key) to the console's server environment (.env locally and
--      the deployment's secrets), then restart/redeploy.
--   2. Check the Pipeline page shows "Supabase connected" without the
--      "public key" warning.
--   3. Run this file in the Supabase SQL Editor.
-- Running it before step 1 makes every console write fail with an RLS error.
-- ====================================================================

-- --------------------------------------------------------------------
-- 1. Remove the open policies created by step 1
-- --------------------------------------------------------------------
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

-- RLS stays enabled on every table. With no policy, anon/authenticated are
-- denied: clients, transcripts, extractions, program_contacts, client_alerts,
-- proposals_and_reports and app_activity_log become private to the console.

-- --------------------------------------------------------------------
-- 2. Read-only access to published knowledge (the chatbot's data)
-- --------------------------------------------------------------------
drop policy if exists "public_read_programs" on public.knowledge_programs;
drop policy if exists "public_read_notes" on public.program_notes;
drop policy if exists "public_read_program_documents" on public.program_documents;
drop policy if exists "public_read_approved_documents" on public.app_documents;

create policy "public_read_programs" on public.knowledge_programs
    for select to anon, authenticated using (true);

-- Site-level notes describe one client's parcel; only program-level knowledge is public.
create policy "public_read_notes" on public.program_notes
    for select to anon, authenticated using (coalesce(routing, 'program-level') = 'program-level');

create policy "public_read_program_documents" on public.program_documents
    for select to anon, authenticated using (true);

-- Only approved, program-level documents. Client uploads (client_id set)
-- and anything pending review stay private.
create policy "public_read_approved_documents" on public.app_documents
    for select to anon, authenticated using (status = 'Approved' and client_id is null);

-- --------------------------------------------------------------------
-- 3. Storage: stop anonymous uploads, overwrites and deletes
-- --------------------------------------------------------------------
-- Step 1 added these to the `documents` bucket, which already held files
-- from another system. The console uploads through its server (secret key),
-- so anon never needs write access. The select policy is left in place so
-- existing readers of the bucket keep working.
drop policy if exists "allow_anon_documents_storage_insert" on storage.objects;
drop policy if exists "allow_anon_documents_storage_update" on storage.objects;
drop policy if exists "allow_anon_documents_storage_delete" on storage.objects;

-- NOTE: step 1 also forced the bucket to public (`public = true`). If the
-- bucket was private before, restore it once you've confirmed nothing relies
-- on public URLs:
--   update storage.buckets set public = false where id = 'documents';
