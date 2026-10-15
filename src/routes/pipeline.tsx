import { createFileRoute } from "@tanstack/react-router";
import {
  AlertCircle,
  Building2,
  Check,
  CircleCheck,
  FileText,
  Landmark,
  Loader2,
  Lock,
  Pencil,
  Plus,
  ShieldCheck,
  Sparkles,
  Undo2,
  X,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AssignTranscript } from "@/components/assign-transcript";
import { GrantsFeed } from "@/components/grants-feed";
import { MeetingIntakeForm } from "@/components/meeting-intake-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  useApproveTranscript,
  useClients,
  useCreateOpportunity,
  useIntegrationStatus,
  usePrograms,
  useRunExtraction,
  useTranscripts,
  useUpdateExtraction,
  useUpdateTranscriptStage,
} from "@/hooks/use-pipeline";
import {
  NEW_PROGRAM,
  meetingLabel,
  type ExtractionCategory,
  type ExtractionRow,
  type PipelineStage,
  type ProgramRow,
  type TranscriptWithExtractions,
} from "@/lib/pipeline";
import {
  KNOWLEDGE_STATES,
  candidatePrograms,
  matchProgram,
  stateFromLabel,
  stateLabel,
} from "@/lib/states";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/pipeline")({
  head: () => ({
    meta: [
      { title: "Pipeline — Collective Impact" },
      {
        name: "description",
        content:
          "Ingest Granola/Zoom call transcripts and funding opportunities into state knowledge.",
      },
      { property: "og:title", content: "Pipeline — Collective Impact" },
      {
        property: "og:description",
        content:
          "Ingest Granola/Zoom call transcripts and funding opportunities into state knowledge.",
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

type CardRef = { kind: "transcript"; id: string };

function transcriptStage(t: TranscriptWithExtractions): PipelineStage {
  return t.status === "approved" ? "approved" : t.stage;
}

/* ------------------------- manual opportunity form ------------------------ */

type ManualSourceType = "Social" | "LinkedIn" | "Foundation site" | "Email" | "Other";
const sourceTypes: ManualSourceType[] = ["Social", "LinkedIn", "Foundation site", "Email", "Other"];
type KnowledgeState = (typeof KNOWLEDGE_STATES)[number];

const emptyManualForm = {
  title: "",
  funder: "",
  sourceUrl: "",
  geography: "",
  programType: "",
  sourceType: "LinkedIn" as ManualSourceType,
  state: "OK" as KnowledgeState,
  pastedDetails: "",
};

function QuickAddForm({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState(emptyManualForm);
  const createOpportunity = useCreateOpportunity();
  const set = <K extends keyof typeof emptyManualForm>(key: K, value: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [key]: value }));
  const canSave = form.title.trim().length > 0 && form.funder.trim().length > 0;

  const save = () => {
    createOpportunity.mutate(
      {
        title: form.title,
        funder: form.funder,
        state: form.state,
        sourceType: form.sourceType,
        sourceUrl: form.sourceUrl,
        geography: form.geography,
        programType: form.programType,
        details: form.pastedDetails,
      },
      { onSuccess: onClose },
    );
  };

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle className="text-base">Add opportunity manually</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            Paste whatever you copied — it enters the board in Intake and can be run through AI
            extraction like a call.
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
          <Label htmlFor="m-state">State tag</Label>
          <Select value={form.state} onValueChange={(v) => set("state", v as KnowledgeState)}>
            <SelectTrigger id="m-state">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {KNOWLEDGE_STATES.map((code) => (
                <SelectItem key={code} value={code}>
                  {stateLabel(code)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
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
        </div>
        <div className="space-y-1.5 md:col-span-2">
          <Label htmlFor="m-details">Paste details here</Label>
          <Textarea
            id="m-details"
            value={form.pastedDetails}
            onChange={(e) => set("pastedDetails", e.target.value)}
            rows={6}
            placeholder="Paste the post, email, or webpage text — deadlines, amounts, eligibility, contacts."
          />
        </div>
        <div className="flex justify-end gap-2 md:col-span-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} disabled={!canSave || createOpportunity.isPending}>
            {createOpportunity.isPending ? "Saving…" : "Add to Intake"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ------------------------------ review item card -------------------------- */

const groups: {
  category: ExtractionCategory;
  title: string;
  blurb: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    category: "pain_point",
    title: "Pain points & deal blockers",
    blurb: "Capital gaps, zoning constraints, and obstacles identified on the call.",
    icon: AlertCircle,
  },
  {
    category: "required_info",
    title: "Required project info",
    blurb: "Parcel details, unit counts, AMI targets, and timelines.",
    icon: Building2,
  },
  {
    category: "missing_document",
    title: "Missing document checklist",
    blurb: "Paperwork to collect from the client before closing.",
    icon: FileText,
  },
  {
    category: "next_step",
    title: "Next steps & action items",
    blurb: "Milestones and preparations before the next meeting or proposal.",
    icon: ShieldCheck,
  },
  {
    category: "state_subsidy",
    title: "State & federal subsidies",
    blurb: "Approved items become practitioner notes on the linked Knowledge Base program.",
    icon: Landmark,
  },
];

const routingHints: Record<ExtractionRow["routing"], string> = {
  "program-level": "Applies to every future project in this jurisdiction",
  "site-level": "Applies to this parcel only",
};

type ExtractionPatch = Partial<Pick<ExtractionRow, "status" | "body" | "routing">>;

function ProgramLinkSelect({
  item,
  value,
  programs,
  state,
  onChange,
  disabled,
}: {
  item: ExtractionRow;
  value: string;
  programs: ProgramRow[];
  state: string | null;
  onChange: (value: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="mt-3 space-y-1">
      <Label htmlFor={`link-${item.id}`} className="text-xs text-muted-foreground">
        Knowledge Base program
      </Label>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger id={`link-${item.id}`} className="h-8 text-xs">
          <SelectValue placeholder="Choose a program…" />
        </SelectTrigger>
        <SelectContent>
          {programs.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.name} · {p.state}
            </SelectItem>
          ))}
          {state && (
            <>
              {programs.length > 0 && <SelectSeparator />}
              <SelectItem value={NEW_PROGRAM}>+ New {state} program from this item</SelectItem>
            </>
          )}
        </SelectContent>
      </Select>
    </div>
  );
}

function ItemCard({
  item,
  onUpdate,
  readOnly,
  programLink,
}: {
  item: ExtractionRow;
  onUpdate: (id: string, patch: ExtractionPatch) => void;
  readOnly: boolean;
  programLink?: React.ReactNode;
}) {
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
          className={cn(
            "rounded-full px-2 py-0.5 text-xs font-medium",
            item.confidence === "High"
              ? "bg-primary/10 text-primary"
              : "bg-warning/15 text-warning-foreground",
          )}
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
              disabled={!draft.trim()}
              onClick={() => {
                onUpdate(item.id, { body: draft.trim() });
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

      {item.facts.length > 0 && (
        <ul className="mt-2.5 space-y-1">
          {item.facts.map((fact, idx) => (
            <li key={idx} className="flex gap-2 text-sm leading-6 text-foreground">
              <span className="mt-2.5 size-1 shrink-0 rounded-full bg-primary" aria-hidden="true" />
              {fact}
            </li>
          ))}
        </ul>
      )}

      {programLink}

      <div className="mt-3.5 flex flex-wrap items-center justify-between gap-3 border-t pt-3">
        <div className="flex items-center gap-2">
          <Select
            value={item.routing}
            onValueChange={(value) =>
              onUpdate(item.id, { routing: value as ExtractionRow["routing"] })
            }
            disabled={readOnly}
          >
            <SelectTrigger
              className="h-8 w-[150px] text-xs"
              aria-label={`Routing for ${item.title}`}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="program-level">Program-level</SelectItem>
              <SelectItem value="site-level">Site-level</SelectItem>
            </SelectContent>
          </Select>
          <span className="hidden text-xs text-muted-foreground 2xl:inline">
            {routingHints[item.routing]}
          </span>
        </div>

        {readOnly ? (
          <span
            className={cn(
              "text-xs font-medium",
              item.status === "approved" ? "text-primary" : "text-muted-foreground",
            )}
          >
            {item.status === "approved"
              ? "Approved"
              : item.status === "rejected"
                ? "Rejected"
                : "Not approved"}
          </span>
        ) : item.status === "pending" ? (
          <div className="flex items-center gap-1.5">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onUpdate(item.id, { status: "approved" })}
            >
              <Check className="mr-1 size-3.5" aria-hidden="true" /> Approve
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
              <Pencil className="mr-1 size-3.5" aria-hidden="true" /> Edit
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onUpdate(item.id, { status: "rejected" })}
            >
              <X className="mr-1 size-3.5" aria-hidden="true" /> Reject
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "text-xs font-medium",
                item.status === "approved" ? "text-primary" : "text-destructive",
              )}
            >
              {item.status === "approved" ? "Approved" : "Rejected"}
            </span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onUpdate(item.id, { status: "pending" })}
            >
              <Undo2 className="mr-1 size-3.5" aria-hidden="true" /> Undo
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

/* --------------------------------- board card ---------------------------------- */

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
  tag: string;
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
            tag.startsWith("Transcript")
              ? "border-primary/30 bg-primary/10 text-primary"
              : "border-info/30 bg-info/15 text-info-foreground",
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

function TranscriptCardFooter({ transcript }: { transcript: TranscriptWithExtractions }) {
  if (transcript.status === "extracting") {
    return (
      <p className="mt-2 flex items-center gap-1.5 text-[11px] text-primary">
        <Loader2 className="size-3 animate-spin" aria-hidden="true" /> Extracting…
      </p>
    );
  }
  const count = transcript.extractions.length;
  return (
    <div className="mt-2 flex flex-wrap gap-1">
      <span
        className={cn(
          "rounded-full border px-2 py-0.5 text-[11px]",
          count > 0 ? "bg-primary/5 text-primary" : "bg-background text-muted-foreground",
        )}
      >
        {count > 0 ? `${count} extractions` : "Not extracted yet"}
      </span>
      {transcript.programs.slice(0, 2).map((p) => (
        <span
          key={p}
          className="rounded-full border bg-background px-2 py-0.5 text-[11px] text-muted-foreground"
        >
          {p}
        </span>
      ))}
    </div>
  );
}

function StatusDot({
  tone,
  children,
}: {
  tone: "ok" | "warn" | "error";
  children: React.ReactNode;
}) {
  return (
    <span className="flex items-center gap-1.5 font-medium">
      <span
        className={cn(
          "size-2 rounded-full",
          tone === "ok" ? "bg-primary" : tone === "warn" ? "bg-warning" : "bg-destructive",
        )}
        aria-hidden="true"
      />
      {children}
    </span>
  );
}

/* ---------------------------------- main page ---------------------------------- */

function PipelinePage() {
  const transcriptsQuery = useTranscripts();
  const liveTranscripts = transcriptsQuery.data ?? [];
  const { data: clients = [] } = useClients();
  const { data: programs = [] } = usePrograms();
  const { data: integration } = useIntegrationStatus();
  const updateTranscriptStage = useUpdateTranscriptStage();
  const approveTranscript = useApproveTranscript();
  const updateExtraction = useUpdateExtraction();
  const runExtraction = useRunExtraction();

  const [selected, setSelected] = useState<CardRef | null>(null);
  const [showMeetingForm, setShowMeetingForm] = useState(false);
  const [showManualForm, setShowManualForm] = useState(false);
  const [dragging, setDragging] = useState<CardRef | null>(null);
  const [dragOver, setDragOver] = useState<PipelineStage | null>(null);
  const [programLinks, setProgramLinks] = useState<Record<string, string>>({});

  const firstTranscript = liveTranscripts[0];
  const effective: CardRef | null =
    selected ?? (firstTranscript ? { kind: "transcript", id: firstTranscript.id } : null);
  const isSelected = (ref: CardRef) => effective?.kind === ref.kind && effective.id === ref.id;

  const selectedTranscript =
    effective?.kind === "transcript"
      ? (liveTranscripts.find((t) => t.id === effective.id) ?? null)
      : null;

  const selectedClient = selectedTranscript?.client_id
    ? clients.find((c) => c.id === selectedTranscript.client_id)
    : undefined;
  const selectedState = selectedTranscript
    ? (selectedClient?.state ?? stateFromLabel(selectedTranscript.project_label))
    : null;
  const linkablePrograms = candidatePrograms(programs, selectedState);

  const items = selectedTranscript?.extractions ?? [];
  const approvedItems = items.filter((i) => i.status === "approved");
  const isApproved = selectedTranscript?.status === "approved";

  const linkFor = (item: ExtractionRow) => {
    const chosen = programLinks[item.id];
    if (chosen) return chosen;
    const match = matchProgram(item.title, linkablePrograms);
    if (match) return match.id;
    return selectedState ? NEW_PROGRAM : "";
  };

  const drop = (stage: PipelineStage) => {
    const ref = dragging;
    setDragging(null);
    setDragOver(null);
    if (!ref) return;

    const transcript = liveTranscripts.find((t) => t.id === ref.id);
    if (!transcript || transcriptStage(transcript) === stage) return;
    if (transcript.status === "approved") {
      toast.info("Approved transcripts stay in Approved.");
      return;
    }
    if (stage === "approved") {
      setSelected(ref);
      toast.info("Approve from the side panel", {
        description: "Review the items, then click Approve to send them to the Knowledge Base.",
      });
      return;
    }
    if (stage === "extracted" && transcript.extractions.length === 0) {
      setSelected(ref);
      runExtraction.mutate(transcript.id);
      return;
    }
    updateTranscriptStage.mutate({ id: transcript.id, stage });
  };

  const handleApprove = () => {
    if (!selectedTranscript) return;
    const links: Record<string, string> = {};
    for (const item of approvedItems) {
      if (item.category !== "state_subsidy") continue;
      const link = linkFor(item);
      if (!link) {
        toast.error(`Choose a Knowledge Base program for "${item.title}"`);
        return;
      }
      links[item.id] = link;
    }
    approveTranscript.mutate({ transcriptId: selectedTranscript.id, programLinks: links });
  };

  const aiTone = integration?.gemini ? "ok" : "warn";

  return (
    <main className="flex min-h-[calc(100vh-4rem)] w-full flex-col xl:flex-row">
      <div className="min-w-0 flex-1 px-4 py-6 md:px-6 md:py-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">Workspace</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">Pipeline</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Ingest call transcripts from Granola or Zoom and review AI extractions across the 5
            canonical buckets. Drag cards between stages, or open them to review details.
          </p>
        </div>

        <div className="mt-5 flex items-start gap-3 border border-primary/30 bg-primary/5 px-4 py-3">
          <Lock className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
          <p className="text-xs leading-5 text-foreground">
            <span className="font-medium">Approval gate active.</span> Nothing reaches the public
            chatbot at <span className="font-medium underline">ourcollectiveimpact.com</span> until
            its card lands in <span className="font-medium">Approved</span>.
          </p>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border bg-card p-3.5">
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={() => setShowMeetingForm(true)} className="gap-2">
              <Plus className="size-4" /> Ingest meeting transcript
            </Button>
            <Button variant="outline" onClick={() => setShowManualForm(true)} className="gap-2">
              <Plus className="size-4" /> Add opportunity manually
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            <StatusDot tone="ok">
              {integration?.zoomWebhook || integration?.ingestWebhook
                ? "Auto-import on · paste or upload"
                : "Granola / Zoom: paste or upload"}
            </StatusDot>
            <StatusDot tone={aiTone}>
              {integration?.gemini
                ? `AI extraction ready (${integration.geminiModel})`
                : "AI extraction: waiting for Gemini key"}
            </StatusDot>
            <StatusDot
              tone={
                transcriptsQuery.isError
                  ? "error"
                  : integration && !integration.supabaseSecretKey
                    ? "warn"
                    : "ok"
              }
            >
              {transcriptsQuery.isError
                ? "Supabase unreachable"
                : integration && !integration.supabaseSecretKey
                  ? "Supabase connected · public key (add SUPABASE_SECRET_KEY)"
                  : "Supabase connected"}
            </StatusDot>
          </div>
        </div>

        {transcriptsQuery.isError && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border border-destructive/40 bg-destructive/5 px-4 py-3 text-xs text-foreground">
            <span>{(transcriptsQuery.error as Error).message}</span>
            <Button size="sm" variant="outline" onClick={() => transcriptsQuery.refetch()}>
              Retry
            </Button>
          </div>
        )}

        {showMeetingForm && (
          <div className="mt-4">
            <MeetingIntakeForm onClose={() => setShowMeetingForm(false)} />
          </div>
        )}

        {showManualForm && (
          <div className="mt-4">
            <QuickAddForm onClose={() => setShowManualForm(false)} />
          </div>
        )}

        <GrantsFeed />

        <div className="mt-6 grid gap-4 lg:grid-cols-2 2xl:grid-cols-4">
          {stages.map((stage) => {
            const stageTranscripts = liveTranscripts.filter((t) => transcriptStage(t) === stage.id);
            const count = stageTranscripts.length;

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
                  {stageTranscripts.map((t) => {
                    const isOpportunity = t.meeting_type === "funding_feed";
                    return (
                      <BoardCard
                        key={t.id}
                        active={isSelected({ kind: "transcript", id: t.id })}
                        onClick={() => setSelected({ kind: "transcript", id: t.id })}
                        onDragStart={() => setDragging({ kind: "transcript", id: t.id })}
                        tag={
                          isOpportunity
                            ? "Opportunity"
                            : `Transcript · ${meetingLabel(t.meeting_type)}`
                        }
                        subTag={`${t.source} · ${t.call_date}`}
                        title={isOpportunity ? t.project_label : t.organization}
                        meta={isOpportunity ? t.organization : t.project_label}
                        footer={<TranscriptCardFooter transcript={t} />}
                      />
                    );
                  })}

                  {count === 0 && (
                    <p className="border border-dashed bg-background/50 px-3 py-6 text-center text-xs text-muted-foreground">
                      {transcriptsQuery.isLoading ? "Loading…" : "Nothing here yet"}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {selectedTranscript && (
        <aside className="w-full shrink-0 border-t bg-card xl:w-[480px] xl:border-l xl:border-t-0">
          <div className="sticky top-16 max-h-[calc(100vh-4rem)] overflow-y-auto">
            {selectedTranscript && (
              <div className="px-5 py-5">
                <div className="flex items-start justify-between gap-3 border-b pb-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant="outline"
                        className="border-primary/30 text-[10px] uppercase tracking-wider text-primary"
                      >
                        {selectedTranscript.source} ·{" "}
                        {meetingLabel(selectedTranscript.meeting_type)}
                      </Badge>
                      {selectedState && (
                        <Badge variant="outline" className="text-[10px] tracking-wider">
                          {selectedState}
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {selectedTranscript.call_date}
                      </span>
                    </div>
                    <h2 className="mt-1 truncate text-base font-semibold text-foreground">
                      {selectedTranscript.organization}
                    </h2>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {selectedTranscript.project_label}
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Stage:{" "}
                      <span className="font-medium uppercase tracking-wide text-foreground">
                        {transcriptStage(selectedTranscript)}
                      </span>{" "}
                      · {approvedItems.length} of {items.length} items approved
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSelected(null)}
                    aria-label="Close detail panel"
                  >
                    <X className="size-4" />
                  </Button>
                </div>

                {!selectedTranscript.client_id &&
                  selectedTranscript.meeting_type !== "funding_feed" &&
                  !isApproved && (
                    <AssignTranscript transcript={selectedTranscript} clients={clients} />
                  )}

                <div className="mt-4 space-y-7">
                  {groups.map((group) => {
                    const groupItems = items.filter((i) => i.category === group.category);
                    if (groupItems.length === 0) return null;
                    const Icon = group.icon;
                    return (
                      <section key={group.category}>
                        <div className="flex items-start gap-2.5">
                          <Icon className="mt-0.5 size-4 shrink-0 text-primary" />
                          <div>
                            <h3 className="text-sm font-semibold text-foreground">
                              {group.title}{" "}
                              <span className="font-normal text-muted-foreground">
                                ({groupItems.length})
                              </span>
                            </h3>
                            <p className="mt-0.5 text-xs text-muted-foreground">{group.blurb}</p>
                          </div>
                        </div>
                        <div className="mt-3 space-y-2.5">
                          {groupItems.map((item) => (
                            <ItemCard
                              key={item.id}
                              item={item}
                              readOnly={isApproved}
                              onUpdate={(id, patch) => updateExtraction.mutate({ id, patch })}
                              programLink={
                                item.category === "state_subsidy" &&
                                !isApproved &&
                                item.status !== "rejected" ? (
                                  <ProgramLinkSelect
                                    item={item}
                                    value={linkFor(item)}
                                    programs={linkablePrograms}
                                    state={selectedState}
                                    disabled={approveTranscript.isPending}
                                    onChange={(value) =>
                                      setProgramLinks((links) => ({ ...links, [item.id]: value }))
                                    }
                                  />
                                ) : undefined
                              }
                            />
                          ))}
                        </div>
                      </section>
                    );
                  })}

                  {items.length === 0 && (
                    <div className="border border-dashed bg-muted/20 px-4 py-6 text-sm text-muted-foreground">
                      {selectedTranscript.status === "extracting" ? (
                        <span className="flex items-center gap-2">
                          <Loader2
                            className="size-4 animate-spin text-primary"
                            aria-hidden="true"
                          />
                          AI is reading the transcript…
                        </span>
                      ) : (
                        <div className="space-y-3">
                          <p>Nothing extracted yet. The raw transcript is below.</p>
                          <Button
                            size="sm"
                            className="gap-1.5"
                            disabled={!integration?.gemini || runExtraction.isPending}
                            onClick={() => runExtraction.mutate(selectedTranscript.id)}
                          >
                            <Sparkles className="size-3.5" aria-hidden="true" /> Run AI extraction
                          </Button>
                          {!integration?.gemini && (
                            <p className="text-xs">
                              Waiting for the Gemini API key — add{" "}
                              <code className="font-mono">GEMINI_API_KEY</code> to the server
                              environment to enable this.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  <section>
                    <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                      Raw transcript
                    </h3>
                    <div className="mt-2 space-y-3 rounded-md bg-muted/20 p-3 font-mono text-xs leading-relaxed text-foreground/90">
                      {selectedTranscript.raw_text.split("\n\n").map((p, i) => (
                        <p key={i} className="whitespace-pre-line">
                          {p}
                        </p>
                      ))}
                    </div>
                  </section>
                </div>

                <div className="sticky bottom-0 mt-6 flex flex-wrap items-center justify-between gap-3 border-t bg-card/95 py-3 backdrop-blur">
                  <p className="text-xs text-muted-foreground">
                    {isApproved
                      ? "Approved into the Knowledge Base."
                      : "Only approved items leave the pipeline."}
                  </p>
                  {isApproved ? (
                    <span className="flex items-center gap-2 text-sm font-medium text-primary">
                      <CircleCheck className="size-4" aria-hidden="true" /> Approved
                    </span>
                  ) : (
                    <Button
                      size="sm"
                      disabled={approvedItems.length === 0 || approveTranscript.isPending}
                      onClick={handleApprove}
                    >
                      <Check className="mr-1 size-3.5" aria-hidden="true" />
                      {approveTranscript.isPending
                        ? "Approving…"
                        : `Approve ${approvedItems.length} items`}
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </aside>
      )}
    </main>
  );
}
