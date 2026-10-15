import { createServerFn } from "@tanstack/react-start";

import type { ActivityRow } from "@/lib/pipeline";
import { dbError, getServerSupabase } from "@/server/supabase.server";

export type DashboardData = {
  transcriptsThisMonth: number;
  awaitingApproval: number;
  programsLoaded: number;
  reportsGenerated: number;
  activity: ActivityRow[];
};

export const getDashboardFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<DashboardData> => {
    const db = getServerSupabase();
    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();

    const [thisMonth, openTranscripts, programs, reports, activity] = await Promise.all([
      db
        .from("transcripts")
        .select("id", { count: "exact", head: true })
        .neq("meeting_type", "funding_feed")
        .gte("created_at", monthStart),
      db.from("transcripts").select("id").neq("status", "approved"),
      db.from("knowledge_programs").select("id", { count: "exact", head: true }),
      db.from("proposals_and_reports").select("id", { count: "exact", head: true }),
      db.from("app_activity_log").select("*").order("created_at", { ascending: false }).limit(8),
    ]);
    if (thisMonth.error) throw dbError(thisMonth.error, "Could not count transcripts");
    if (openTranscripts.error)
      throw dbError(openTranscripts.error, "Could not load open transcripts");
    if (programs.error) throw dbError(programs.error, "Could not count programs");
    if (reports.error) throw dbError(reports.error, "Could not count reports");
    if (activity.error) throw dbError(activity.error, "Could not load activity");

    // Pending items on transcripts that haven't been approved yet.
    let awaitingApproval = 0;
    const openIds = openTranscripts.data.map((t) => t.id);
    if (openIds.length > 0) {
      const pending = await db
        .from("extractions")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending")
        .in("transcript_id", openIds);
      if (pending.error) throw dbError(pending.error, "Could not count pending items");
      awaitingApproval = pending.count ?? 0;
    }

    return {
      transcriptsThisMonth: thisMonth.count ?? 0,
      awaitingApproval,
      programsLoaded: programs.count ?? 0,
      reportsGenerated: reports.count ?? 0,
      activity: activity.data,
    };
  },
);
