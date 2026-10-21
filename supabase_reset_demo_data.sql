-- ====================================================================
-- Reset: remove ALL demo and test data from the console's tables.
--
-- Deletes every row in the tables this console owns, so the Knowledge
-- Base, clients and pipeline start empty. It does NOT touch the
-- pre-existing `documents` table or any storage files (another system
-- uses those). Run it in Supabase → SQL Editor. There is no undo.
-- ====================================================================

begin;

delete from public.extractions;
delete from public.transcripts;
delete from public.proposals_and_reports;
delete from public.client_alerts;
delete from public.app_documents;
delete from public.program_notes;
delete from public.program_contacts;
delete from public.program_documents;
delete from public.knowledge_programs;
delete from public.clients;
delete from public.app_activity_log;

commit;
