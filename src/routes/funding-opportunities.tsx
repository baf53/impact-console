import { useMemo, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import {
  Building2,
  CircleCheck,
  ExternalLink,
  Info,
  Landmark,
  Leaf,
  Plus,
  Sparkles,
  X,
} from "lucide-react";
import { toast } from "sonner";

import {
  consoleStore,
  useConsoleData,
  type FundingOpportunity,
  type ManualOpportunity,
  type ManualSourceType,
  type OpportunityStatus,
} from "@/lib/mock-data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/funding-opportunities")({
  head: () => ({
    meta: [
      { title: "Funding Opportunities — Collective Impact" },
      {
        name: "description",
        content:
          "Federal funding opportunities synced from Grants.gov, reviewed and routed into the approval pipeline.",
      },
      { property: "og:title", content: "Funding Opportunities — Collective Impact" },
      {
        property: "og:description",
        content:
          "Federal funding opportunities synced from Grants.gov, reviewed and routed into the approval pipeline.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: FundingOpportunitiesPage,
});

const statusStyles: Record<OpportunityStatus, string> = {
  new: "bg-info/15 text-info-foreground border-info/30",
  reviewed: "bg-warning/15 text-warning-foreground border-warning/30",
  added: "bg-primary/10 text-primary border-primary/30",
  dismissed: "bg-muted text-muted-foreground border-border",
};

const statusLabels: Record<OpportunityStatus, string> = {
  new: "New",
  reviewed: "Reviewed",
  added: "Added to corpus",
  dismissed: "Dismissed",
};

const agencyIcons: Record<FundingOpportunity["agency"], typeof Landmark> = {
  HUD: Landmark,
  USDA: Leaf,
  EPA: Building2,
};

function setOpportunityStatus(id: string, status: OpportunityStatus) {
  consoleStore.update((current) => ({
    ...current,
    opportunities: current.opportunities.map((opp) =>
      opp.id === id ? { ...opp, status } : opp,
    ),
  }));
}

function addToCorpus(opp: FundingOpportunity) {
  const transcriptId = `transcript-opp-${opp.id}`;
  consoleStore.update((current) => {
    if (current.transcripts.some((t) => t.id === transcriptId)) return current;
    return {
      ...current,
      opportunities: current.opportunities.map((o) =>
        o.id === opp.id ? { ...o, status: "added" as const } : o,
      ),
      stats: { ...current.stats, awaitingApproval: current.stats.awaitingApproval + 1 },
      transcripts: [
        {
          id: transcriptId,
          organization: `Grants.gov — ${opp.agency}`,
          callDate: opp.postedDate,
          projectId: "federal-feed",
          projectLabel: `${opp.agency} opportunity ${opp.assistanceListing}`,
          programs: [opp.title.split("—")[0]?.trim() ?? opp.title],
          status: "ready",
          rawText: `${opp.title}\n\nAgency: ${opp.agency} — Assistance Listing ${opp.assistanceListing}\nPosted: ${opp.postedDate} · Closes: ${opp.closeDate} · Award ceiling: ${opp.awardCeiling}\n\n${opp.summary}`,
        },
        ...current.transcripts,
      ],
      extractions: [
        {
          id: `ex-opp-${opp.id}-1`,
          transcriptId,
          category: "program",
          title: opp.title,
          body: opp.summary,
          facts: [
            `Agency: ${opp.agency}`,
            `Assistance Listing: ${opp.assistanceListing}`,
            `Posted: ${opp.postedDate}`,
            `Closes: ${opp.closeDate}`,
            `Award ceiling: ${opp.awardCeiling}`,
          ],
          routing: "program-level",
          status: "pending",
          confidence: "Medium",
        },
        {
          id: `ex-opp-${opp.id}-2`,
          transcriptId,
          category: "question",
          title: "Does this opportunity fit an active project?",
          body: "Synced from Grants.gov. A practitioner should confirm eligibility against current parcels before adding program terms to the knowledge base.",
          routing: "program-level",
          status: "pending",
          confidence: "Medium",
        },
        ...current.extractions,
      ],
      activity: [
        {
          id: `activity-opp-${Date.now()}`,
          action: "Opportunity queued for review",
          subject: opp.title.split("—")[0]?.trim() ?? opp.title,
          detail: `${opp.agency} · closes ${opp.closeDate}`,
          occurredAt: "Just now",
          status: "review",
        },
        ...current.activity,
      ],
    };
  });
  toast.success("Sent to Review & Approve", {
    description: `${opp.agency} ${opp.assistanceListing} is now in the review queue — nothing enters the corpus without approval.`,
  });
}

function FundingOpportunitiesPage() {
  const data = useConsoleData();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = useMemo(
    () => data.opportunities.find((o) => o.id === selectedId) ?? null,
    [data.opportunities, selectedId],
  );

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-start gap-3 rounded-lg border border-info/30 bg-info/10 px-4 py-3">
        <Info className="mt-0.5 size-4 shrink-0 text-info-foreground" />
        <p className="text-sm text-info-foreground">
          Federal opportunities sync automatically. State, local, and philanthropic sources are added
          manually — they aren't published to any federal feed.
        </p>
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-center gap-3 py-4">
          <span className="grid size-9 place-items-center rounded-md bg-primary/10 text-primary">
            <Landmark className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-medium">Grants.gov — federal funding opportunities</p>
            <p className="text-xs text-muted-foreground">Auto-syncs new opportunities</p>
          </div>
          <span className="ml-auto flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-60" />
              <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
            </span>
            Connected
          </span>
        </CardContent>
      </Card>

      <div className={cn("gap-6", selected ? "grid xl:grid-cols-[1fr_380px]" : "block")}>
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-base">Opportunities</CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                {data.opportunities.length} synced from Grants.gov
              </p>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-3 font-medium">Opportunity</th>
                    <th className="px-4 py-3 font-medium">Agency</th>
                    <th className="px-4 py-3 font-medium">Posted</th>
                    <th className="px-4 py-3 font-medium">Closes</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.opportunities.map((opp) => {
                    const AgencyIcon = agencyIcons[opp.agency];
                    const isTerminal = opp.status === "added" || opp.status === "dismissed";
                    return (
                      <tr
                        key={opp.id}
                        className={cn(
                          "cursor-pointer border-b last:border-0 transition-colors hover:bg-muted/50",
                          selectedId === opp.id && "bg-muted/60",
                        )}
                        onClick={() => setSelectedId(selectedId === opp.id ? null : opp.id)}
                      >
                        <td className="max-w-[320px] px-4 py-3">
                          <p className="font-medium leading-snug">{opp.title}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            Listing {opp.assistanceListing} · {opp.awardCeiling}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                            <AgencyIcon className="size-3.5" />
                            {opp.agency}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{opp.postedDate}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{opp.closeDate}</td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className={cn("whitespace-nowrap", statusStyles[opp.status])}>
                            {statusLabels[opp.status]}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                            {!isTerminal && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setOpportunityStatus(opp.id, "reviewed");
                                    setSelectedId(opp.id);
                                  }}
                                  disabled={opp.status === "reviewed"}
                                >
                                  Review
                                </Button>
                                <Button size="sm" onClick={() => addToCorpus(opp)}>
                                  <Plus className="size-3.5" />
                                  Add to corpus
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setOpportunityStatus(opp.id, "dismissed")}
                                >
                                  Dismiss
                                </Button>
                              </>
                            )}
                            {opp.status === "added" && (
                              <Button size="sm" variant="ghost" asChild>
                                <Link to="/review">
                                  <CircleCheck className="size-3.5" />
                                  View in Review
                                </Link>
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {selected && (
          <aside className="mt-6 xl:mt-0">
            <Card className="sticky top-24">
              <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
                <div>
                  <CardTitle className="text-base leading-snug">{selected.title}</CardTitle>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {selected.agency} · Assistance Listing {selected.assistanceListing}
                  </p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setSelectedId(null)} aria-label="Close details">
                  <X className="size-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <Badge variant="outline" className={statusStyles[selected.status]}>
                  {statusLabels[selected.status]}
                </Badge>
                <dl className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-xs text-muted-foreground">Posted</dt>
                    <dd className="font-medium">{selected.postedDate}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Closes</dt>
                    <dd className="font-medium">{selected.closeDate}</dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-xs text-muted-foreground">Award ceiling</dt>
                    <dd className="font-medium">{selected.awardCeiling}</dd>
                  </div>
                </dl>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Summary</p>
                  <p className="mt-1 text-sm leading-relaxed text-foreground/90">{selected.summary}</p>
                </div>
                <p className="rounded-md border border-dashed bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                  Adding to corpus routes this opportunity through the same approval flow as a
                  transcript — nothing reaches the Knowledge Base without your approval.
                </p>
                {selected.status !== "added" && selected.status !== "dismissed" && (
                  <Button className="w-full" onClick={() => addToCorpus(selected)}>
                    <Plus className="size-4" />
                    Add to corpus
                  </Button>
                )}
              </CardContent>
            </Card>
          </aside>
        )}
      </div>
    </div>
  );
}
