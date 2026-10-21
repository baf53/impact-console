import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { logActivity } from "@/server/activity.server";
import { fetchGrantDetail, grantToText, searchGrants, type GrantHit } from "@/server/grants.server";
import { dbError, getServerSupabase, isMissingSchema } from "@/server/supabase.server";

export type { GrantHit };

const externalId = (id: string) => `grants.gov:${id}`;

export const listGrantFeedFn = createServerFn({ method: "GET" })
  .validator(z.object({ keyword: z.string().trim().max(100).optional() }))
  .handler(async ({ data }) => {
    const db = getServerSupabase();
    const [{ hitCount, hits }, dismissed, imported] = await Promise.all([
      searchGrants(data.keyword || undefined),
      db.from("funding_feed_dismissed").select("opportunity_id"),
      db.from("transcripts").select("external_id").like("external_id", "grants.gov:%"),
    ]);

    // Before step 3 runs, the feed still works; it just can't hide dismissed/imported items.
    const needsMigration =
      (dismissed.error && isMissingSchema(dismissed.error)) ||
      (imported.error && isMissingSchema(imported.error)) ||
      false;
    if (dismissed.error && !isMissingSchema(dismissed.error)) {
      throw dbError(dismissed.error, "Could not load dismissed opportunities");
    }
    if (imported.error && !isMissingSchema(imported.error)) {
      throw dbError(imported.error, "Could not load imported opportunities");
    }

    const hidden = new Set([
      ...(dismissed.data ?? []).map((d) => d.opportunity_id),
      ...(imported.data ?? []).map((t) => (t.external_id ?? "").replace("grants.gov:", "")),
    ]);
    return {
      hitCount,
      hiddenCount: hits.filter((h) => hidden.has(h.id)).length,
      hits: hits.filter((h) => !hidden.has(h.id)),
      needsMigration,
    };
  });

export const importGrantFn = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().regex(/^\d+$/) }))
  .handler(async ({ data }) => {
    const detail = await fetchGrantDetail(data.id);
    const { data: transcript, error } = await getServerSupabase()
      .from("transcripts")
      .insert({
        client_id: null,
        project_label: `${detail.title}, Federal`,
        organization: detail.agency,
        meeting_type: "funding_feed",
        source: "Grants.gov",
        stage: "intake",
        status: "new",
        raw_text: grantToText(detail),
        external_id: externalId(detail.id),
      })
      .select()
      .single();
    if (error) {
      if (error.code === "23505") throw new Error("This opportunity is already in the pipeline.");
      throw dbError(error, "Could not add opportunity");
    }

    await logActivity({
      action: "Grants.gov opportunity added",
      subject: detail.title,
      detail: `${detail.agency} · ${detail.number}`,
      status: "review",
    });
    return transcript;
  });

export const dismissGrantFn = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().regex(/^\d+$/), title: z.string().trim().min(1) }))
  .handler(async ({ data }) => {
    const { error } = await getServerSupabase()
      .from("funding_feed_dismissed")
      .upsert({ opportunity_id: data.id, title: data.title });
    if (error) throw dbError(error, "Could not dismiss opportunity");
    return { id: data.id };
  });
