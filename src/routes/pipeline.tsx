import { createFileRoute } from "@tanstack/react-router";
import {
  Building2,
  Check,
  CircleCheck,
  ExternalLink,
  Landmark,
  Leaf,
  Lock,
  MessageSquareQuote,
  Pencil,
  Plus,
  ShieldCheck,
  Sparkles,
  Undo2,
  User,
  X,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

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
import {
  consoleStore,
  useConsoleData,
  type ExtractionCategory,
  type ExtractionItem,
  type FundingOpportunity,
  type ManualOpportunity,
  type ManualSourceType,
  type PipelineStage,
  type RoutingLevel,
  type Transcript,
} from "@/lib/mock-data";

export const Route = createFileRoute("/pipeline")({
  head: () => ({
    meta: [
      { title: "Pipeline — Collective Impact" },
      {
        name: "description",
        content:
          "One board for call transcripts and funding opportunities moving from intake to approved knowledge.",
      },
      { property: "og:title", content: "Pipeline — Collective Impact" },
      {
        property: "og:description",
        content:
          "One board for call transcripts and funding opportunities moving from intake to approved knowledge.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PipelinePage,
});

/* ----------------------------- stage plumbing ----------------------------- */

const stages: { id: PipelineStage; label: string; blurb: string }[] = [
  { id: "intake", label: "Intake", blurb: "Just arrived, not yet processed" },
  { id: "extracted", label: "Extracted", blurb: "AI pulled details, awaiting review" },
  { id: "in-review", label: "In Review", blurb: "You're reviewing it now" },
  { id: "approved", label: "Approved", blurb: "Sent to the Knowledge Base" },
];

type CardRef =
  | { kind: "transcript"; id: string }
  | { kind: "opportunity"; id: string }
  | { kind: "manual"; id: string };

function transcriptStage(t: Transcript): PipelineStage {
  if (t.status === "approved") return "approved";
  return t.stage ?? (t.status === "ready" ? "extracted" : "intake");
}

function setTranscriptStage(t: Transcript, stage: PipelineStage) {
  if (stage === "approved") {
    approveTranscript(t);
    return;
  }
  consoleStore.update((current) => ({
    ...current,
    transcripts: current.transcripts.map((x) =>
      x.id === t.id
        ? {
            ...x,
            stage,
            status: x.status === "approved" ? ("ready" as const) : x.status,
          }
        : x,
    ),
    stats:
      t.status === "approved"
        ? { ...current.stats, awaitingApproval: current.stats.awaitingApproval + 1 }
        : current.stats,
  }));
}

function approveTranscript(transcript: Transcript) {
  let approvedCount = 0;
  consoleStore.update((current) => {
    approvedCount = current.extractions.filter(
      (e) => e.transcriptId === transcript.id && e.status === "approved",
    ).length;
    return {
      ...current,
      transcripts: current.transcripts.map((t) =>
        t.id === transcript.id ? { ...t, status: "approved" as const, stage: "approved" as const } : t,
      ),
      stats: { ...current.stats, awaitingApproval: Math.max(0, current.stats.awaitingApproval - 1) },
      activity: [
        {
          id: `activity-${Date.now()}`,
          action: "Transcript approved",
          subject: transcript.projectLabel.split(",")[0] ?? transcript.projectLabel,
          detail: `${approvedCount} items sent to the knowledge base`,
          occurredAt: "Just now",
          status: "approved" as const,
        },
        ...current.activity,
      ].slice(0, 8),
    };
  });
  toast.success(`${approvedCount} items sent to Knowledge Base`, {
    description: transcript.projectLabel,
  });
}

function updateItem(id: string, patch: Partial<ExtractionItem>) {
  consoleStore.update((current) => ({
    ...current,
    extractions: current.extractions.map((item) => (item.id === id ? { ...item, ...patch } : item)),
  }));
}

function setOpportunityStatus(id: string, status: FundingOpportunity["status"]) {
  consoleStore.update((current) => ({
    ...current,
    opportunities: current.opportunities.map((opp) => (opp.id === id ? { ...opp, status } : opp)),
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
          status: "ready" as const,
          stage: "in-review" as const,
          rawText: `${opp.title}\n\nAgency: ${opp.agency} — Assistance Listing ${opp.assistanceListing}\nPosted: ${opp.postedDate} · Closes: ${opp.closeDate} · Award ceiling: ${opp.awardCeiling}\n\n${opp.summary}`,
        },
        ...current.transcripts,
      ],
      extractions: [
        {
          id: `ex-opp-${opp.id}-1`,
          transcriptId,
          category: "program" as const,
          title: opp.title,
          body: opp.summary,
          facts: [
            `Agency: ${opp.agency}`,
            `Assistance Listing: ${opp.assistanceListing}`,
            `Posted: ${opp.postedDate}`,
            `Closes: ${opp.closeDate}`,
            `Award ceiling: ${opp.awardCeiling}`,
          ],
          routing: "program-level" as const,
          status: "pending" as const,
          confidence: "Medium" as const,
        },
        {
          id: `ex-opp-${opp.id}-2`,
          transcriptId,
          category: "question" as const,
          title: "Does this opportunity fit an active project?",
          body: "Synced from Grants.gov. A practitioner should confirm eligibility against current parcels before adding program terms to the knowledge base.",
          routing: "program-level" as const,
          status: "pending" as const,
          confidence: "Medium" as const,
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
          status: "review" as const,
        },
        ...current.activity,
      ],
    };
  });
  toast.success("Moved to In Review", {
    description: "Nothing reaches the Knowledge Base until it lands in Approved.",
  });
}

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
          stage: "in-review" as const,
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
  toast.success("Moved to In Review", {
    description: `${item.title} isn't live until you approve it.`,
  });
}

/* ------------------------------ manual add form --------------------------- */

const sourceTypes: ManualSourceType[] = ["Social", "LinkedIn", "Foundation site", "Email", "Other"];

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
    toast.success("Added to Intake", {
      description: "Nothing is live until it reaches the Approved column.",
    });
    onClose();
  };

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle className="text-base">Add opportunity manually</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            Paste whatever you copied — it enters the board in Intake.
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close form">
          <X className="size-4" />
        </Button>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="m-title">Opportunity title</Label>
          <Input id="m-title" value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Neighborhood Housing Catalyst Grant" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="m-funder">Funder / organization</Label>
          <Input id="m-funder" value={form.funder} onChange={(e) => set("funder", e.target.value)} placeholder="Tulsa Community Foundation" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="m-url">Source URL</Label>
          <Input id="m-url" value={form.sourceUrl} onChange={(e) => set("sourceUrl", e.target.value)} placeholder="https://…" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="m-geo">Jurisdiction / geography served</Label>
          <Input id="m-geo" value={form.geography} onChange={(e) => set("geography", e.target.value)} placeholder="Tulsa County, OK" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="m-type">Program type</Label>
          <Input id="m-type" value={form.programType} onChange={(e) => set("programType", e.target.value)} placeholder="Predevelopment grant" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="m-source">Source type</Label>
          <Select value={form.sourceType} onValueChange={(v) => set("sourceType", v as ManualSourceType)}>
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
            rows={8}
            placeholder="Paste the post, email, or webpage text — deadlines, amounts, eligibility, contacts."
          />
        </div>
        <div className="flex justify-end gap-2 md:col-span-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} disabled={!canSave}>
            Add to Intake
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ------------------------------ review item card -------------------------- */

const groups: { category: ExtractionCategory; title: string; blurb: string; icon: typeof Landmark }[] = [
  { category: "program", title: "Programs discussed", blurb: "Funding programs named on the call, with terms as stated.", icon: Landmark },
  { category: "note", title: "Practitioner notes", blurb: "Expert knowledge that isn't written in any document.", icon: MessageSquareQuote },
  { category: "contact", title: "Contacts mentioned", blurb: "People named on the call and how to reach them.", icon: User },
  { category: "question", title: "Open questions", blurb: "Things the call did not resolve.", icon: ShieldCheck },
];

const routingHints: Record<RoutingLevel, string> = {
  "program-level": "Applies to every future project in this jurisdiction",
  "site-level": "Applies to this parcel only",
};

function ItemCard({ item }: { item: ExtractionItem }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item.body);

  const statusStyles =
    item.status === "approved"
      ? "border-primary/40 bg-primary/5"
      : item.status === "rejected"
        ? "border-destructive/30 bg-destructive/5 opacity-70"
        : "bg-background";

  return (
    <div className={`border px-4 py-3.5 transition-colors ${statusStyles}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="text-sm font-semibold text-foreground">{item.title}</p>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
            item.confidence === "High" ? "bg-primary/10 text-primary" : "bg-warning/15 text-warning-foreground"
          }`}
        >
          {item.confidence} confidence
        </span>
      </div>

      {editing ? (
        <div className="mt-2 space-y-2">
          <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={4} />
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => {
                updateItem(item.id, { body: draft });
                setEditing(false);
              }}
            >
              Save edit
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setDraft(item.body);
                setEditing(false);
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{item.body}</p>
      )}

      {item.facts && item.facts.length > 0 && (
        <ul className="mt-2.5 space-y-1">
          {item.facts.map((fact) => (
            <li key={fact} className="flex gap-2 text-sm leading-6 text-foreground">
              <span className="mt-2.5 size-1 shrink-0 rounded-full bg-primary" aria-hidden="true" />
              {fact}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3.5 flex flex-wrap items-center justify-between gap-3 border-t pt-3">
        <div className="flex items-center gap-2">
          <Select value={item.routing} onValueChange={(value) => updateItem(item.id, { routing: value as RoutingLevel })}>
            <SelectTrigger className="h-8 w-[150px] text-xs" aria-label={`Routing for ${item.title}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="program-level">Program-level</SelectItem>
              <SelectItem value="site-level">Site-level</SelectItem>
            </SelectContent>
          </Select>
          <span className="hidden text-xs text-muted-foreground 2xl:inline">{routingHints[item.routing]}</span>
        </div>

        {item.status === "pending" ? (
          <div className="flex items-center gap-1.5">
            <Button size="sm" variant="outline" onClick={() => updateItem(item.id, { status: "approved" })}>
              <Check aria-hidden="true" /> Approve
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
              <Pencil aria-hidden="true" /> Edit
            </Button>
            <Button size="sm" variant="ghost" onClick={() => updateItem(item.id, { status: "rejected" })}>
              <X aria-hidden="true" /> Reject
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className={`text-xs font-medium ${item.status === "approved" ? "text-primary" : "text-destructive"}`}>
              {item.status === "approved" ? "Approved" : "Rejected"}
            </span>
            <Button size="sm" variant="ghost" onClick={() => updateItem(item.id, { status: "pending" })}>
              <Undo2 aria-hidden="true" /> Undo
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

/* --------------------------------- board ---------------------------------- */

const agencyIcons: Record<FundingOpportunity["agency"], typeof Landmark> = {
  HUD: Landmark,
  USDA: Leaf,
  EPA: Building2,
};

function BoardCard({
  active,
  onClick,
  onDragStart,
  tag,
  subTag,
  title,
  meta,
  footer,
}: {
  active: boolean;
  onClick: () => void;
  onDragStart: () => void;
  tag: "Transcript" | "Opportunity";
  subTag: string;
  title: string;
  meta: string;
  footer?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      draggable
      onDragStart={onDragStart}
      onClick={onClick}
      className={cn(
        "w-full cursor-grab border bg-card px-3 py-3 text-left transition-colors hover:bg-muted/50 active:cursor-grabbing",
        active && "border-primary/60 bg-primary/5",
      )}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge
          variant="outline"
          className={cn(
            "whitespace-nowrap text-[10px] uppercase tracking-wide",
            tag === "Transcript" ? "border-primary/30 bg-primary/10 text-primary" : "border-info/30 bg-info/15 text-info-foreground",
          )}
        >
          {tag}
        </Badge>
        <span className="text-[11px] text-muted-foreground">{subTag}</span>
      </div>
      <p className="mt-2 line-clamp-2 text-sm font-medium leading-snug text-foreground">{title}</p>
      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{meta}</p>
      {footer}
    </button>
  );
}

function PipelinePage() {
  const data = useConsoleData();
  const [selected, setSelected] = useState<CardRef | null>({ kind: "transcript", id: "transcript-1" });
  const [showForm, setShowForm] = useState(false);
  const [dragging, setDragging] = useState<CardRef | null>(null);
  const [dragOver, setDragOver] = useState<PipelineStage | null>(null);

  const opportunities = data.opportunities.filter((o) => o.status !== "added" && o.status !== "dismissed");
  const manuals = data.manualOpportunities.filter((m) => m.status === "pending");

  const isSelected = (ref: CardRef) => selected?.kind === ref.kind && selected.id === ref.id;

  const drop = (stage: PipelineStage) => {
    const ref = dragging;
    setDragging(null);
    setDragOver(null);
    if (!ref) return;
    if (ref.kind === "transcript") {
      const t = data.transcripts.find((x) => x.id === ref.id);
      if (t) setTranscriptStage(t, stage);
      return;
    }
    if (ref.kind === "opportunity") {
      const opp = data.opportunities.find((o) => o.id === ref.id);
      if (!opp) return;
      if (stage === "intake") setOpportunityStatus(opp.id, "new");
      else if (stage === "extracted") setOpportunityStatus(opp.id, "reviewed");
      else addToCorpus(opp);
      return;
    }
    const manual = data.manualOpportunities.find((m) => m.id === ref.id);
    if (manual && stage !== "intake") sendManualToReview(manual);
  };

  const selectedTranscript =
    selected?.kind === "transcript" ? data.transcripts.find((t) => t.id === selected.id) ?? null : null;
  const selectedOpportunity =
    selected?.kind === "opportunity" ? data.opportunities.find((o) => o.id === selected.id) ?? null : null;
  const selectedManual =
    selected?.kind === "manual" ? data.manualOpportunities.find((m) => m.id === selected.id) ?? null : null;

  const selectedItems = selectedTranscript
    ? data.extractions.filter((e) => e.transcriptId === selectedTranscript.id)
    : [];
  const approvedCount = selectedItems.filter((i) => i.status === "approved").length;

  return (
    <main className="flex min-h-[calc(100vh-4rem)] w-full flex-col xl:flex-row">
      <div className="min-w-0 flex-1 px-4 py-6 md:px-6 md:py-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">Workspace</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">Pipeline</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Call transcripts and funding opportunities move through the same four stages. Drag a card between
            columns, or open it to review what was extracted.
          </p>
        </div>

        <div className="mt-5 flex items-start gap-3 border border-primary/30 bg-primary/5 px-4 py-3">
          <Lock className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
          <p className="text-xs leading-5 text-foreground">
            <span className="font-medium">Approval gate active.</span> Nothing reaches the Knowledge Base until its
            card lands in <span className="font-medium">Approved</span>.
          </p>
        </div>

        {/* Connected sources */}
        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          <div className="flex flex-wrap items-center gap-3 border bg-card px-4 py-3">
            <span className="grid size-8 place-items-center rounded-md bg-primary/10 text-xs font-bold text-primary">G</span>
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">Granola — call transcripts</p>
              <p className="text-xs text-muted-foreground">Last synced 2 hours ago</p>
            </div>
            <span className="ml-auto flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <span className="size-2 rounded-full bg-emerald-500" aria-hidden="true" /> Connected
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-3 border bg-card px-4 py-3">
            <span className="grid size-8 place-items-center rounded-md bg-primary/10 text-primary">
              <Landmark className="size-4" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">Grants.gov — federal opportunities</p>
              <p className="text-xs text-muted-foreground">Auto-syncs new opportunities</p>
            </div>
            <span className="ml-auto flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <span className="size-2 rounded-full bg-emerald-500" aria-hidden="true" /> Connected
            </span>
            <Button size="sm" onClick={() => setShowForm(true)}>
              <Plus className="size-4" /> Add opportunity manually
            </Button>
          </div>
        </div>

        <div className="mt-3 flex items-start gap-3 border border-primary/25 bg-primary/5 px-4 py-2.5">
          <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
          <p className="text-xs text-foreground/80">
            Hyperlocal and philanthropic funding lives in posts, emails, and foundation pages — no feed publishes
            it, so no competitor can scrape it. Manually added items enter the board in Intake.
          </p>
        </div>

        {showForm && (
          <div className="mt-4">
            <QuickAddForm onClose={() => setShowForm(false)} />
          </div>
        )}

        {/* Board */}
        <div className="mt-6 grid gap-4 lg:grid-cols-2 2xl:grid-cols-4">
          {stages.map((stage) => {
            const stageTranscripts = data.transcripts.filter((t) => transcriptStage(t) === stage.id);
            const stageOpps = opportunities.filter((o) =>
              stage.id === "intake" ? o.status === "new" : stage.id === "extracted" ? o.status === "reviewed" : false,
            );
            const stageManuals = stage.id === "intake" ? manuals : [];
            const count = stageTranscripts.length + stageOpps.length + stageManuals.length;

            return (
              <div
                key={stage.id}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(stage.id);
                }}
                onDragLeave={() => setDragOver((s) => (s === stage.id ? null : s))}
                onDrop={() => drop(stage.id)}
                className={cn(
                  "flex min-h-72 flex-col border bg-muted/20 p-3 transition-colors",
                  dragOver === stage.id && "border-primary/60 bg-primary/5",
                )}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <h2 className="text-sm font-semibold text-foreground">{stage.label}</h2>
                  <span className="text-xs tabular-nums text-muted-foreground">{count}</span>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">{stage.blurb}</p>

                <div className="mt-3 space-y-2">
                  {stageTranscripts.map((t) => (
                    <BoardCard
                      key={t.id}
                      active={isSelected({ kind: "transcript", id: t.id })}
                      onClick={() => setSelected({ kind: "transcript", id: t.id })}
                      onDragStart={() => setDragging({ kind: "transcript", id: t.id })}
                      tag="Transcript"
                      subTag={`Granola · ${t.callDate}`}
                      title={t.organization}
                      meta={t.projectLabel}
                      footer={
                        <div className="mt-2 flex flex-wrap gap-1">
                          {t.programs.slice(0, 2).map((p) => (
                            <span key={p} className="rounded-full border bg-background px-2 py-0.5 text-[11px] text-muted-foreground">
                              {p}
                            </span>
                          ))}
                        </div>
                      }
                    />
                  ))}
                  {stageOpps.map((o) => {
                    const Icon = agencyIcons[o.agency];
                    return (
                      <BoardCard
                        key={o.id}
                        active={isSelected({ kind: "opportunity", id: o.id })}
                        onClick={() => setSelected({ kind: "opportunity", id: o.id })}
                        onDragStart={() => setDragging({ kind: "opportunity", id: o.id })}
                        tag="Opportunity"
                        subTag={`Grants.gov · ${o.agency}`}
                        title={o.title}
                        meta={`Posted ${o.postedDate} · Closes ${o.closeDate}`}
                        footer={
                          <p className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                            <Icon className="size-3" /> Listing {o.assistanceListing}
                          </p>
                        }
                      />
                    );
                  })}
                  {stageManuals.map((m) => (
                    <BoardCard
                      key={m.id}
                      active={isSelected({ kind: "manual", id: m.id })}
                      onClick={() => setSelected({ kind: "manual", id: m.id })}
                      onDragStart={() => setDragging({ kind: "manual", id: m.id })}
                      tag="Opportunity"
                      subTag={`${m.sourceType} · ${m.addedOn}`}
                      title={m.title}
                      meta={`${m.funder} · ${m.geography}`}
                    />
                  ))}
                  {count === 0 && (
                    <p className="border border-dashed bg-background/50 px-3 py-6 text-center text-xs text-muted-foreground">
                      Nothing here yet
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detail panel */}
      {(selectedTranscript || selectedOpportunity || selectedManual) && (
        <aside className="w-full shrink-0 border-t bg-card xl:w-[460px] xl:border-l xl:border-t-0">
          <div className="sticky top-16 max-h-[calc(100vh-4rem)] overflow-y-auto">
            {selectedTranscript && (
              <div className="px-5 py-5">
                <div className="flex items-start justify-between gap-3 border-b pb-4">
                  <div className="min-w-0">
                    <h2 className="truncate text-base font-semibold text-foreground">{selectedTranscript.organization}</h2>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {selectedTranscript.projectLabel} · {selectedTranscript.callDate}
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Stage: <span className="font-medium text-foreground">{stages.find((s) => s.id === transcriptStage(selectedTranscript))?.label}</span> ·{" "}
                      {approvedCount} of {selectedItems.length} items approved
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setSelected(null)} aria-label="Close detail panel">
                    <X />
                  </Button>
                </div>

                <div className="mt-4 space-y-7">
                  {groups.map((group) => {
                    const groupItems = selectedItems.filter((i) => i.category === group.category);
                    if (groupItems.length === 0) return null;
                    const Icon = group.icon;
                    return (
                      <section key={group.category}>
                        <div className="flex items-start gap-2.5">
                          <Icon className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                          <div>
                            <h3 className="text-sm font-semibold text-foreground">
                              {group.title} <span className="font-normal text-muted-foreground">({groupItems.length})</span>
                            </h3>
                            <p className="mt-0.5 text-xs text-muted-foreground">{group.blurb}</p>
                          </div>
                        </div>
                        <div className="mt-3 space-y-2.5">
                          {groupItems.map((item) => (
                            <ItemCard key={item.id} item={item} />
                          ))}
                        </div>
                      </section>
                    );
                  })}

                  {selectedItems.length === 0 && (
                    <div className="border border-dashed bg-muted/20 px-4 py-6 text-sm text-muted-foreground">
                      Nothing extracted yet. Raw transcript below.
                    </div>
                  )}

                  <section>
                    <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Raw transcript</h3>
                    <div className="mt-2 space-y-3">
                      {selectedTranscript.rawText.split("\n\n").map((p, i) => (
                        <p key={i} className="text-sm leading-6 text-foreground/90">
                          {p}
                        </p>
                      ))}
                    </div>
                  </section>
                </div>

                <div className="sticky bottom-0 mt-6 flex flex-wrap items-center justify-between gap-3 border-t bg-card/95 py-3 backdrop-blur">
                  <p className="text-xs text-muted-foreground">
                    {selectedTranscript.status === "approved"
                      ? "Approved into the Knowledge Base."
                      : "Rejected and pending items are not sent."}
                  </p>
                  {selectedTranscript.status === "approved" ? (
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-2 text-sm font-medium text-primary">
                        <CircleCheck className="size-4" aria-hidden="true" /> Approved
                      </span>
                      <Button variant="outline" size="sm" onClick={() => setTranscriptStage(selectedTranscript, "in-review")}>
                        Reopen
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      {transcriptStage(selectedTranscript) !== "in-review" && (
                        <Button variant="outline" size="sm" onClick={() => setTranscriptStage(selectedTranscript, "in-review")}>
                          Move to In Review
                        </Button>
                      )}
                      <Button size="sm" disabled={approvedCount === 0} onClick={() => approveTranscript(selectedTranscript)}>
                        <Check aria-hidden="true" /> Approve {approvedCount} items
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {selectedOpportunity && (
              <div className="px-5 py-5">
                <div className="flex items-start justify-between gap-3 border-b pb-4">
                  <div className="min-w-0">
                    <h2 className="text-base font-semibold leading-snug text-foreground">{selectedOpportunity.title}</h2>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {selectedOpportunity.agency} · Assistance Listing {selectedOpportunity.assistanceListing}
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setSelected(null)} aria-label="Close detail panel">
                    <X />
                  </Button>
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-xs text-muted-foreground">Posted</dt>
                    <dd className="font-medium">{selectedOpportunity.postedDate}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Closes</dt>
                    <dd className="font-medium">{selectedOpportunity.closeDate}</dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-xs text-muted-foreground">Award ceiling</dt>
                    <dd className="font-medium">{selectedOpportunity.awardCeiling}</dd>
                  </div>
                </dl>
                <p className="mt-4 text-sm leading-relaxed text-foreground/90">{selectedOpportunity.summary}</p>
                <p className="mt-4 border border-dashed bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                  Adding to corpus moves this card to In Review — it reaches the Knowledge Base only once you
                  approve it.
                </p>
                <div className="mt-4 flex gap-2">
                  <Button
                    className="flex-1"
                    onClick={() => {
                      addToCorpus(selectedOpportunity);
                      setSelected({ kind: "transcript", id: `transcript-opp-${selectedOpportunity.id}` });
                    }}
                  >
                    <Plus className="size-4" /> Add to corpus
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setOpportunityStatus(selectedOpportunity.id, "dismissed");
                      setSelected(null);
                    }}
                  >
                    Dismiss
                  </Button>
                </div>
              </div>
            )}

            {selectedManual && (
              <div className="px-5 py-5">
                <div className="flex items-start justify-between gap-3 border-b pb-4">
                  <div className="min-w-0">
                    <h2 className="text-base font-semibold leading-snug text-foreground">{selectedManual.title}</h2>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {selectedManual.funder} · {selectedManual.sourceType} · {selectedManual.geography}
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setSelected(null)} aria-label="Close detail panel">
                    <X />
                  </Button>
                </div>
                {selectedManual.sourceUrl && (
                  <a
                    href={selectedManual.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    <ExternalLink className="size-3" /> Original source
                  </a>
                )}
                <p className="mt-4 whitespace-pre-line text-sm leading-6 text-foreground/90">
                  {selectedManual.pastedDetails}
                </p>
                <div className="mt-4 flex gap-2">
                  <Button
                    className="flex-1"
                    onClick={() => {
                      sendManualToReview(selectedManual);
                      setSelected({ kind: "transcript", id: `transcript-manual-${selectedManual.id}` });
                    }}
                  >
                    <Plus className="size-4" /> Add to corpus
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      consoleStore.update((current) => ({
                        ...current,
                        manualOpportunities: current.manualOpportunities.map((m) =>
                          m.id === selectedManual.id ? { ...m, status: "dismissed" as const } : m,
                        ),
                      }));
                      setSelected(null);
                    }}
                  >
                    Dismiss
                  </Button>
                </div>
              </div>
            )}
          </div>
        </aside>
      )}
    </main>
  );
}
