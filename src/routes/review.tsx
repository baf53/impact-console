import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Check,
  CircleCheck,
  Inbox,
  Landmark,
  Lock,
  MessageSquareQuote,
  Pencil,
  ShieldCheck,
  Undo2,
  User,
  X,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  consoleStore,
  useConsoleData,
  type ExtractionCategory,
  type ExtractionItem,
  type RoutingLevel,
  type Transcript,
} from "@/lib/mock-data";

export const Route = createFileRoute("/review")({
  head: () => ({
    meta: [
      { title: "Review & Approve — Collective Impact" },
      { name: "description", content: "Review extracted program data and approve it into the knowledge base." },
      { property: "og:title", content: "Review & Approve — Collective Impact" },
      { property: "og:description", content: "Review extracted program data and approve it into the knowledge base." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ReviewApprove,
});

const groups: { category: ExtractionCategory; title: string; blurb: string; icon: typeof Landmark }[] = [
  {
    category: "program",
    title: "Programs discussed",
    blurb: "Funding programs named on the call, with terms as stated.",
    icon: Landmark,
  },
  {
    category: "note",
    title: "Practitioner notes",
    blurb: "Expert knowledge from the call that isn't written in any document.",
    icon: MessageSquareQuote,
  },
  {
    category: "contact",
    title: "Contacts mentioned",
    blurb: "People named on the call and how to reach them.",
    icon: User,
  },
  {
    category: "question",
    title: "Open questions",
    blurb: "Things the call did not resolve. Approving keeps them flagged for follow-up.",
    icon: ShieldCheck,
  },
];

const routingLabels: Record<RoutingLevel, string> = {
  "program-level": "Program-level",
  "site-level": "Site-level",
};

const routingHints: Record<RoutingLevel, string> = {
  "program-level": "Applies to every future project in this jurisdiction",
  "site-level": "Applies to this parcel only",
};

function updateItem(id: string, patch: Partial<ExtractionItem>) {
  consoleStore.update((current) => ({
    ...current,
    extractions: current.extractions.map((item) => (item.id === id ? { ...item, ...patch } : item)),
  }));
}

function approveTranscript(transcript: Transcript, approvedCount: number) {
  consoleStore.update((current) => ({
    ...current,
    transcripts: current.transcripts.map((t) =>
      t.id === transcript.id ? { ...t, status: "approved" as const } : t,
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
  }));
  toast.success(`${approvedCount} items sent to Knowledge Base`, {
    description: transcript.projectLabel,
  });
}

function reopenTranscript(transcript: Transcript) {
  consoleStore.update((current) => ({
    ...current,
    transcripts: current.transcripts.map((t) =>
      t.id === transcript.id ? { ...t, status: "ready" as const } : t,
    ),
    stats: { ...current.stats, awaitingApproval: current.stats.awaitingApproval + 1 },
  }));
}

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
          <Select
            value={item.routing}
            onValueChange={(value) => updateItem(item.id, { routing: value as RoutingLevel })}
          >
            <SelectTrigger size="sm" className="w-[150px]" aria-label={`Routing for ${item.title}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="program-level">Program-level</SelectItem>
              <SelectItem value="site-level">Site-level</SelectItem>
            </SelectContent>
          </Select>
          <span className="hidden text-xs text-muted-foreground xl:inline">{routingHints[item.routing]}</span>
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
            <span
              className={`text-xs font-medium ${item.status === "approved" ? "text-primary" : "text-destructive"}`}
            >
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

function ReviewApprove() {
  const data = useConsoleData();
  const queue = data.transcripts.filter((t) => t.status === "ready");
  const approved = data.transcripts.filter((t) => t.status === "approved");
  const [selectedId, setSelectedId] = useState<string | null>(queue[0]?.id ?? null);

  const selected =
    data.transcripts.find((t) => t.id === selectedId) ?? queue[0] ?? null;
  const items = selected ? data.extractions.filter((e) => e.transcriptId === selected.id) : [];
  const approvedCount = items.filter((i) => i.status === "approved").length;
  const pendingCount = items.filter((i) => i.status === "pending").length;

  return (
    <main className="flex min-h-[calc(100vh-4rem)] w-full flex-col lg:flex-row">
      {/* Queue */}
      <div className="w-full shrink-0 border-b bg-card px-4 py-6 lg:w-[300px] lg:border-b-0 lg:border-r lg:px-4 lg:py-8">
        <p className="px-1 text-xs font-semibold uppercase tracking-widest text-primary">Review queue</p>
        <p className="mt-1 px-1 text-xs text-muted-foreground">
          {queue.length} ready for review
        </p>

        <div className="mt-4 space-y-1.5">
          {queue.length === 0 && (
            <div className="flex flex-col items-center border border-dashed bg-muted/20 px-4 py-8 text-center">
              <Inbox className="size-5 text-muted-foreground" aria-hidden="true" />
              <p className="mt-3 text-sm font-medium text-foreground">Queue is clear</p>
              <p className="mt-1 text-xs text-muted-foreground">
                New items arrive from{" "}
                <Link to="/transcript-intake" className="font-medium text-primary hover:underline">
                  Transcript Intake
                </Link>
                .
              </p>
            </div>
          )}
          {queue.map((transcript) => {
            const count = data.extractions.filter((e) => e.transcriptId === transcript.id).length;
            return (
              <button
                key={transcript.id}
                type="button"
                onClick={() => setSelectedId(transcript.id)}
                className={`w-full border px-3 py-3 text-left transition-colors hover:bg-muted/50 ${
                  selected?.id === transcript.id ? "border-primary/50 bg-primary/5" : "border-transparent"
                }`}
              >
                <p className="truncate text-sm font-medium text-foreground">{transcript.organization}</p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">{transcript.projectLabel}</p>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  {transcript.callDate} · {count} extracted items
                </p>
              </button>
            );
          })}
        </div>

        {approved.length > 0 && (
          <div className="mt-6 border-t pt-4">
            <p className="px-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Approved</p>
            <div className="mt-2 space-y-1">
              {approved.map((transcript) => (
                <button
                  key={transcript.id}
                  type="button"
                  onClick={() => setSelectedId(transcript.id)}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-muted/50 ${
                    selected?.id === transcript.id ? "bg-muted/60" : ""
                  }`}
                >
                  <CircleCheck className="size-3.5 shrink-0 text-primary" aria-hidden="true" />
                  <span className="truncate text-xs text-muted-foreground">{transcript.organization}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Main panel */}
      <div className="min-w-0 flex-1 px-5 py-8 md:px-8 md:py-10">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">Workspace</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">Review & Approve</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Nothing reaches the Knowledge Base until you approve it. Everything below is a draft extraction.
          </p>
        </div>

        <div className="mt-5 flex items-start gap-3 border border-primary/30 bg-primary/5 px-4 py-3">
          <Lock className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
          <p className="text-xs leading-5 text-foreground">
            <span className="font-medium">Approval gate active.</span> Extracted items stay private to this screen.
            Tag each item <span className="font-medium">Program-level</span> to reuse it for every future project in
            the jurisdiction, or <span className="font-medium">Site-level</span> to keep it on this parcel only.
          </p>
        </div>

        {!selected ? (
          <div className="mt-6 flex min-h-64 items-center justify-center border border-dashed bg-muted/20 px-6 text-center text-sm text-muted-foreground">
            Select a transcript from the queue to review its extraction.
          </div>
        ) : (
          <>
            <div className="mt-6 flex flex-wrap items-end justify-between gap-4 border-b pb-4">
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-foreground">{selected.organization}</h2>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {selected.projectLabel} · Call {selected.callDate}
                </p>
              </div>
              <p className="text-xs text-muted-foreground tabular-nums">
                {approvedCount} approved · {pendingCount} pending · {items.length} extracted
              </p>
            </div>

            <div className="mt-6 space-y-8">
              {groups.map((group) => {
                const groupItems = items.filter((item) => item.category === group.category);
                if (groupItems.length === 0) return null;
                const Icon = group.icon;
                return (
                  <section key={group.category}>
                    <div className="flex items-start gap-2.5">
                      <Icon className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                      <div>
                        <h3 className="text-sm font-semibold text-foreground">
                          {group.title}{" "}
                          <span className="font-normal text-muted-foreground">({groupItems.length})</span>
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
              {items.length === 0 && (
                <p className="border border-dashed bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
                  No extracted items on this transcript yet.
                </p>
              )}
            </div>

            <div className="sticky bottom-0 mt-8 flex flex-wrap items-center justify-between gap-3 border bg-card/95 px-4 py-3 backdrop-blur">
              <p className="text-xs text-muted-foreground">
                {selected.status === "approved"
                  ? "This transcript has been approved into the Knowledge Base."
                  : `${approvedCount} of ${items.length} items marked approved. Rejected and pending items are not sent.`}
              </p>
              {selected.status === "approved" ? (
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-2 text-sm font-medium text-primary">
                    <CircleCheck className="size-4" aria-hidden="true" /> Approved
                  </span>
                  <Button variant="outline" size="sm" onClick={() => reopenTranscript(selected)}>
                    Reopen
                  </Button>
                </div>
              ) : (
                <Button
                  disabled={approvedCount === 0}
                  onClick={() => approveTranscript(selected, approvedCount)}
                >
                  <Check aria-hidden="true" /> Send {approvedCount} items to Knowledge Base
                </Button>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  );
}

const routingLabelsUsed = routingLabels;
void routingLabelsUsed;
