import { createClient, type PostgrestError, type SupabaseClient } from "@supabase/supabase-js";
import { makeFetchWithRetry, networkErrorMessage } from "@/server/network.server";
import type { Database } from "@/types/database";

let client: SupabaseClient<Database> | null = null;

export function hasSecretKey() {
  return Boolean(process.env["SUPABASE_SECRET_KEY"]);
}

/**
 * Supabase client for server functions only. It uses the secret key so console
 * writes keep working once public (anon) access is locked down by
 * supabase_step2_security.sql. Until SUPABASE_SECRET_KEY is set it falls back to
 * the publishable key, which only works while the step-1 open policies exist.
 */
export function getServerSupabase(): SupabaseClient<Database> {
  if (client) return client;

  const url = import.meta.env["VITE_SUPABASE_URL"] ?? process.env["VITE_SUPABASE_URL"];
  const key =
    process.env["SUPABASE_SECRET_KEY"] ??
    import.meta.env["VITE_SUPABASE_ANON_KEY"] ??
    process.env["VITE_SUPABASE_ANON_KEY"];

  if (!url || !key) {
    throw new Error("Supabase is not configured. Set VITE_SUPABASE_URL and SUPABASE_SECRET_KEY.");
  }

  client = createClient<Database>(url as string, key as string, {
    auth: { persistSession: false, autoRefreshToken: false },
    // Brief connection drops are retried instead of failing the operator's action.
    global: { fetch: makeFetchWithRetry(fetch) },
  });
  return client;
}

/** True when PostgREST reports an unknown table or column (a migration hasn't been run). */
export function isMissingSchema(error: PostgrestError) {
  return ["PGRST204", "PGRST205", "42P01", "42703"].includes(error.code);
}

/** Turns a PostgREST error into an Error with a message the operator can act on. */
export function dbError(error: PostgrestError, action: string): Error {
  if (isMissingSchema(error)) {
    return new Error(
      `${action}: the database is missing a table or column this feature needs. Run supabase_step3_features.sql in the Supabase SQL Editor.`,
    );
  }
  if (/fetch failed|network|ECONNRESET|ETIMEDOUT|ENOTFOUND|EAI_AGAIN/i.test(error.message)) {
    return new Error(`${action}: ${networkErrorMessage("the database")}`);
  }
  const rlsDenied = error.code === "42501" || /row-level security/i.test(error.message);
  const hint =
    rlsDenied && !hasSecretKey()
      ? " Public write access is locked down — set SUPABASE_SECRET_KEY on the server."
      : "";
  return new Error(`${action}: ${error.message}.${hint}`);
}
