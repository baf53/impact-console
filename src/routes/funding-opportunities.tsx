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

const sourceTypes: ManualSourceType[] = [
  "Social",
  "LinkedIn",
  "Foundation site",
  "Email",
  "Other",
];

const manualStatusStyles: Record<ManualOpportunity["status"], string> = {
  pending: "bg-warning/15 text-warning-foreground border-warning/30",
  added: "bg-primary/10 text-primary border-primary/30",
  dismissed: "bg-muted text-muted-foreground border-border",
};

const manualStatusLabels: Record<ManualOpportunity["status"], string> = {
  pending: "Pending review",
  added: "In review queue",
  dismissed: "Dismissed",
};

function sendManualToReview(item: ManualOpportunity) {
  const transcriptId = `transcript-manual-${item.id}`;
  consoleStore.update((current) => {
    if (current.transcripts.some((t) => t.id === transcriptId)) return current;
    return {
      ...current,
      manualOpportunities: current.manualOpportunities.map((m) =>
        m.id === item.id ? { ...m, status: "added" as const } : m,
      ),
      stats: { ...current.stats, awaitingApproval: current.stats.awaitingApproval + 1 },
      transcripts: [
        {
          id: transcriptId,
          organization: item.funder,
          callDate: item.addedOn,
          projectId: "manual-source",
          projectLabel: `${item.funder} · ${item.geography}`,
          programs: [item.programType],
          status: "ready" as const,
          rawText: `${item.title}\n\nFunder: ${item.funder}\nSource: ${item.sourceType} — ${item.sourceUrl}\nGeography served: ${item.geography}\nProgram type: ${item.programType}\n\n${item.pastedDetails}`,
        },
        ...current.transcripts,
      ],
      extractions: [
        {
          id: `ex-manual-${item.id}-1`,
          transcriptId,
          category: "program" as const,
          title: item.title,
          body: item.pastedDetails,
          facts: [
            `Funder: ${item.funder}`,
            `Program type: ${item.programType}`,
            `Geography served: ${item.geography}`,
            `Source: ${item.sourceType}`,
          ],
          routing: "program-level" as const,
          status: "pending" as const,
          confidence: "Medium" as const,
        },
        {
          id: `ex-manual-${item.id}-2`,
          transcriptId,
          category: "question" as const,
          title: "Is this source authoritative enough to publish?",
          body: `Captured manually from ${item.sourceType.toLowerCase()} — no published notice exists. Confirm terms with the funder before the assistant cites it.`,
          routing: "program-level" as const,
          status: "pending" as const,
          confidence: "Medium" as const,
        },
        ...current.extractions,
      ],
      activity: [
        {
          id: `activity-manual-${Date.now()}`,
          action: "Manual opportunity queued for review",
          subject: item.funder,
          detail: `${item.sourceType} · ${item.geography}`,
          occurredAt: "Just now",
          status: "review" as const,
        },
        ...current.activity,
      ],
    };
  });
  toast.success("Sent to Review & Approve", {
    description: `${item.title} is pending review — it isn't live until you approve it.`,
  });
}

const emptyForm = {
  title: "",
  funder: "",
  sourceUrl: "",
  geography: "",
  programType: "",
  sourceType: "LinkedIn" as ManualSourceType,
  pastedDetails: "",
};

function QuickAddForm({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState(emptyForm);
  const set = (key: keyof typeof emptyForm, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const canSave = form.title.trim().length > 0 && form.funder.trim().length > 0;

  const save = () => {
    const item: ManualOpportunity = {
      id: `manual-${Date.now()}`,
      title: form.title.trim(),
      funder: form.funder.trim(),
      sourceUrl: form.sourceUrl.trim(),
      geography: form.geography.trim(),
      programType: form.programType.trim() || "Unclassified",
      sourceType: form.sourceType,
      pastedDetails: form.pastedDetails.trim(),
      status: "pending",
      addedOn: "Today",
    };
    consoleStore.update((current) => ({
      ...current,
      manualOpportunities: [item, ...current.manualOpportunities],
    }));
    toast.success("Saved as Pending review", {
      description: "Nothing is live until you approve it in Review & Approve.",
    });
    onClose();
  };

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle className="text-base">Add opportunity manually</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            Paste whatever you copied — it saves as Pending review, not live.
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close form">
          <X className="size-4" />
        </Button>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="m-title">Opportunity title</Label>
          <Input
            id="m-title"
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder="Neighborhood Housing Catalyst Grant"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="m-funder">Funder / organization</Label>
          <Input
            id="m-funder"
            value={form.funder}
            onChange={(e) => set("funder", e.target.value)}
            placeholder="Tulsa Community Foundation"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="m-url">Source URL</Label>
          <Input
            id="m-url"
            value={form.sourceUrl}
            onChange={(e) => set("sourceUrl", e.target.value)}
            placeholder="https://…"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="m-geo">Jurisdiction / geography served</Label>
          <Input
            id="m-geo"
            value={form.geography}
            onChange={(e) => set("geography", e.target.value)}
            placeholder="Tulsa County, OK"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="m-type">Program type</Label>
          <Input
            id="m-type"
            value={form.programType}
            onChange={(e) => set("programType", e.target.value)}
            placeholder="Predevelopment grant"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="m-source">Source type</Label>
          <Select
            value={form.sourceType}
            onValueChange={(v) => set("sourceType", v as ManualSourceType)}
          >
            <SelectTrigger id="m-source">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {sourceTypes.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5 md:col-span-2">
          <Label htmlFor="m-details">Paste details here</Label>
          <Textarea
            id="m-details"
            value={form.pastedDetails}
            onChange={(e) => set("pastedDetails", e.target.value)}
            rows={10}
            placeholder="Paste the post, email, or webpage text — deadlines, amounts, eligibility, contacts."
          />
        </div>
        <div className="flex justify-end gap-2 md:col-span-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} disabled={!canSave}>
            Save as Pending review
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function FundingOpportunitiesPage() {
  const data = useConsoleData();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
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
          <Button className="w-full sm:w-auto" onClick={() => setShowForm(true)}>
            <Plus className="size-4" />
            Add opportunity manually
          </Button>
        </CardContent>
      </Card>

      {showForm && <QuickAddForm onClose={() => setShowForm(false)} />}

      <Card>
        <CardHeader className="space-y-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base">Manually added opportunities</CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                {data.manualOpportunities.length} captured from social, LinkedIn, foundation sites,
                and email
              </p>
            </div>
            <Button variant="outline" onClick={() => setShowForm(true)}>
              <Plus className="size-4" />
              Add opportunity manually
            </Button>
          </div>
          <div className="mt-3 flex items-start gap-3 rounded-md border border-primary/25 bg-primary/5 px-3 py-2">
            <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" />
            <p className="text-xs text-foreground/80">
              Hyperlocal and philanthropic funding lives in posts, emails, and foundation pages — no
              feed publishes it, so no competitor can scrape it. Everything captured here stays
              Pending review until you approve it.
            </p>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Opportunity</th>
                  <th className="px-4 py-3 font-medium">Source</th>
                  <th className="px-4 py-3 font-medium">Geography</th>
                  <th className="px-4 py-3 font-medium">Added</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.manualOpportunities.map((item) => (
                  <tr key={item.id} className="border-b align-top last:border-0">
                    <td className="max-w-[340px] px-4 py-3">
                      <p className="font-medium leading-snug">{item.title}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {item.funder} · {item.programType}
                      </p>
                      {item.pastedDetails && (
                        <p className="mt-1.5 line-clamp-2 text-xs text-muted-foreground/90">
                          {item.pastedDetails}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="whitespace-nowrap">
                        {item.sourceType}
                      </Badge>
                      {item.sourceUrl && (
                        <a
                          href={item.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-1.5 flex items-center gap-1 text-xs text-primary hover:underline"
                        >
                          <ExternalLink className="size-3" />
                          Source
                        </a>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{item.geography}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                      {item.addedOn}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant="outline"
                        className={cn("whitespace-nowrap", manualStatusStyles[item.status])}
                      >
                        {manualStatusLabels[item.status]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        {item.status === "pending" && (
                          <Button size="sm" onClick={() => sendManualToReview(item)}>
                            Send to review
                          </Button>
                        )}
                        {item.status === "added" && (
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
                ))}
              </tbody>
            </table>
          </div>
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
