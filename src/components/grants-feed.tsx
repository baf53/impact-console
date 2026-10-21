import { useState } from "react";
import { ChevronDown, ChevronRight, ExternalLink, Landmark, Plus, Search, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDismissGrant, useGrantFeed, useImportGrant } from "@/hooks/use-grants";
import { cn } from "@/lib/utils";

/** Live housing opportunities from the public Grants.gov API, ready to pull into Intake. */
export function GrantsFeed() {
  const [open, setOpen] = useState(true);
  const [draft, setDraft] = useState("");
  const [keyword, setKeyword] = useState("");
  const feed = useGrantFeed(keyword, open);
  const importGrant = useImportGrant();
  const dismiss = useDismissGrant();
  const hits = feed.data?.hits ?? [];

  return (
    <section className="mt-6 border bg-card">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2">
          {open ? (
            <ChevronDown className="size-4 text-muted-foreground" aria-hidden="true" />
          ) : (
            <ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />
          )}
          <Landmark className="size-4 text-primary" aria-hidden="true" />
          <span className="text-sm font-semibold text-foreground">Grants.gov feed</span>
          <span className="text-xs text-muted-foreground">
            {keyword
              ? `“${keyword}” in housing & community development`
              : "Open and upcoming housing opportunities"}
          </span>
        </span>
        {feed.data && (
          <span className="text-xs tabular-nums text-muted-foreground">{hits.length} new</span>
        )}
      </button>

      {open && (
        <div className="border-t px-4 py-3">
          <form
            className="flex max-w-md gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              setKeyword(draft.trim());
            }}
          >
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Search Grants.gov, e.g. HOME, rural rental"
                aria-label="Search Grants.gov"
                className="h-8 pl-8 text-xs"
              />
            </div>
            <Button type="submit" size="sm" variant="outline" className="h-8">
              Search
            </Button>
            {keyword && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-8"
                onClick={() => {
                  setDraft("");
                  setKeyword("");
                }}
              >
                Clear
              </Button>
            )}
          </form>

          {feed.data?.needsMigration && (
            <p className="mt-3 text-xs text-warning-foreground">
              Run supabase_step3_features.sql to add opportunities to Intake and to hide dismissed
              ones.
            </p>
          )}
          {feed.isError && (
            <p className="mt-3 text-xs text-destructive">{(feed.error as Error).message}</p>
          )}

          <ul className="mt-3 max-h-80 divide-y overflow-y-auto">
            {feed.isLoading && (
              <li className="py-4 text-xs text-muted-foreground">Loading from Grants.gov…</li>
            )}
            {!feed.isLoading && hits.length === 0 && !feed.isError && (
              <li className="py-4 text-xs text-muted-foreground">
                Nothing new
                {feed.data?.hiddenCount
                  ? ` — ${feed.data.hiddenCount} already added or dismissed`
                  : ""}
                .
              </li>
            )}
            {hits.map((hit) => (
              <li key={hit.id} className="flex flex-wrap items-start justify-between gap-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px] uppercase tracking-wide",
                        hit.status === "posted"
                          ? "border-primary/30 text-primary"
                          : "text-muted-foreground",
                      )}
                    >
                      {hit.status === "posted" ? "Open" : "Forecast"}
                    </Badge>
                    <span className="text-[11px] text-muted-foreground">
                      {hit.agency} · {hit.number}
                    </span>
                  </div>
                  <p className="mt-1 text-sm font-medium leading-snug text-foreground">
                    {hit.title}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Posted {hit.openDate || "—"}
                    {hit.closeDate ? ` · Closes ${hit.closeDate}` : " · No close date yet"}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 gap-1 text-xs"
                    disabled={importGrant.isPending || feed.data?.needsMigration}
                    onClick={() => importGrant.mutate(hit.id)}
                  >
                    <Plus className="size-3.5" aria-hidden="true" /> Add to Intake
                  </Button>
                  <Button size="icon" variant="ghost" className="size-7" asChild>
                    <a
                      href={`https://www.grants.gov/search-results-detail/${hit.id}`}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`Open ${hit.title} on Grants.gov`}
                    >
                      <ExternalLink className="size-3.5" />
                    </a>
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-7"
                    disabled={dismiss.isPending || feed.data?.needsMigration}
                    onClick={() => dismiss.mutate({ id: hit.id, title: hit.title })}
                    aria-label={`Dismiss ${hit.title}`}
                  >
                    <X className="size-3.5" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
