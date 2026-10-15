import { getServerSupabase } from "@/server/supabase.server";
import type { Database } from "@/types/database";

/**
 * Appends to the audit trail (app_activity_log). A failed log write is reported but
 * doesn't undo the mutation that already succeeded.
 */
export async function logActivity(
  entry: Database["public"]["Tables"]["app_activity_log"]["Insert"],
) {
  const { error } = await getServerSupabase().from("app_activity_log").insert(entry);
  if (error) console.error("Activity log write failed:", error.message);
}
