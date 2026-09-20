import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, ChevronRight, CircleCheck, FileText, Inbox, Sparkles, Undo2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { consoleStore, useConsoleData, type Transcript } from "@/lib/mock-data";

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

type ExtractionField = { label: string; value: string; confidence: "High" | "Medium" };

const confidenceStyles = {
  High: "bg-primary/10 text-primary",
  Medium: "bg-warning/15 text-warning-foreground",
};

function fieldsFor(transcript: Transcript): ExtractionField[] {
  return [
    { label: "Project", value: transcript.projectLabel, confidence: "High" },
    { label: "Programs mentioned", value: transcript.programs.join(", "), confidence: "High" },
    {
      label: "Funding intent",
      value:
        transcript.projectId === "bartlesville-morton"
          ? "Site prep and construction of rental duplexes on infill land"
          : transcript.projectId === "orlando-orange"
            ? "Acquisition, soft costs, and rental reserves for affordable units"
            : "Rehab capital stack with layered entitlement and tax-credit funding",
      confidence: "Medium",
    },
    {
      label: "Key deadline",
      value:
        transcript.projectId === "bartlesville-morton"
          ? "Close funding package before winter; spring groundbreaking"
          : transcript.projectId === "orlando-orange"
            ? "Environmental review before federal drawdown"
            : "Maryland LIHTC application deadline",
      confidence: "Medium",
    },
  ];
}

function approveTranscript(transcript: Transcript) {
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
        subject: transcript.projectLabel.split(",")[0],
        detail: `${transcript.programs.length} program references added to the knowledge base`,
        occurredAt: "Just now",
        status: "approved" as const,
      },
      ...current.activity,
    ].slice(0, 8),
  }));
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

function ReviewPanel({ transcript, onClose }: { transcript: Transcript; onClose: () => void }) {
  const isApproved = transcript.status === "approved";
  return (
    <aside className="flex h-full w-full flex-col border-l bg-card lg:w-[440px] lg:shrink-0">
      <div className="flex items-start justify-between gap-4 border-b px-5 py-4">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold text-foreground">{transcript.organization}</h2>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {transcript.projectLabel} · {transcript.callDate}
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close review panel">
          <Undo2 />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          <Sparkles className="size-3.5 text-primary" aria-hidden="true" /> Extracted fields
        </p>
        <div className="space-y-3">
          {fieldsFor(transcript).map((field) => (
            <div key={field.label} className="border bg-background px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-medium text-muted-foreground">{field.label}</p>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${confidenceStyles[field.confidence]}`}
                >
                  {field.confidence}
                </span>
              </div>
              <p className="mt-1.5 text-sm leading-5 text-foreground">{field.value}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs leading-5 text-muted-foreground">
          Approving writes these fields to the Knowledge Base and makes them available to the assistant.
        </p>
      </div>

      <div className="border-t px-5 py-4">
        {isApproved ? (
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-sm font-medium text-primary">
              <CircleCheck className="size-4" aria-hidden="true" /> Approved into knowledge base
            </span>
            <Button variant="outline" size="sm" onClick={() => reopenTranscript(transcript)}>
              Reopen
            </Button>
          </div>
        ) : (
          <Button className="w-full" onClick={() => approveTranscript(transcript)}>
            <Check aria-hidden="true" /> Approve into knowledge base
          </Button>
        )}
      </div>
    </aside>
  );
}

function ReviewApprove() {
  const data = useConsoleData();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const queue = data.transcripts.filter((t) => t.status === "ready" || t.status === "approved");
  const selected = queue.find((t) => t.id === selectedId) ?? null;

  return (
    <main className="flex min-h-[calc(100vh-4rem)] w-full flex-col lg:flex-row">
      <div className="min-w-0 flex-1 px-5 py-8 md:px-8 md:py-10">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">Workspace</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">Review & Approve</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Verify extracted program data before it enters the knowledge base.
          </p>
        </div>

        {queue.length === 0 ? (
          <div className="mt-6 flex min-h-72 flex-col items-center justify-center border border-dashed bg-muted/20 px-6 text-center">
            <span className="grid size-10 place-items-center rounded-md border bg-background text-muted-foreground">
              <Inbox className="size-5" />
            </span>
            <p className="mt-4 text-sm font-medium text-foreground">Queue is clear</p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              New transcripts appear here once extraction completes in{" "}
              <Link to="/transcript-intake" className="font-medium text-primary underline-offset-4 hover:underline">
                Transcript Intake
              </Link>
              .
            </p>
          </div>
        ) : (
          <div className="mt-6 overflow-hidden border bg-card">
            <div className="hidden grid-cols-[minmax(180px,1.2fr)_minmax(200px,1.2fr)_minmax(220px,1.4fr)_120px_32px] gap-4 border-b bg-muted/40 px-5 py-2.5 text-xs font-medium text-muted-foreground lg:grid">
              <span>Client / Organization</span>
              <span>Project</span>
              <span>Extracted programs</span>
              <span>Status</span>
              <span />
            </div>
            <div className="divide-y">
              {queue.map((transcript) => (
                <button
                  key={transcript.id}
                  type="button"
                  onClick={() => setSelectedId(transcript.id === selectedId ? null : transcript.id)}
                  className={`grid w-full gap-2 px-5 py-4 text-left transition-colors hover:bg-muted/40 lg:grid-cols-[minmax(180px,1.2fr)_minmax(200px,1.2fr)_minmax(220px,1.4fr)_120px_32px] lg:items-center lg:gap-4 ${
                    transcript.id === selectedId ? "bg-muted/50" : ""
                  }`}
                >
                  <span className="truncate text-sm font-medium text-foreground">{transcript.organization}</span>
                  <span className="truncate text-sm text-muted-foreground">{transcript.projectLabel}</span>
                  <span className="flex flex-wrap gap-1.5">
                    {transcript.programs.map((program) => (
                      <span
                        key={program}
                        className="rounded-full border bg-background px-2 py-0.5 text-xs text-muted-foreground"
                      >
                        {program}
                      </span>
                    ))}
                  </span>
                  <span>
                    {transcript.status === "approved" ? (
                      <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                        Approved
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                        Ready for review
                      </span>
                    )}
                  </span>
                  <ChevronRight className="hidden size-4 text-muted-foreground lg:block" aria-hidden="true" />
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6 flex items-center gap-3 border bg-muted/30 px-5 py-3">
          <FileText className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <p className="text-xs leading-5 text-muted-foreground">
            Transcripts marked <span className="font-medium text-foreground">New</span> or{" "}
            <span className="font-medium text-foreground">Extracting…</span> are still being processed — manage them
            in{" "}
            <Link to="/transcript-intake" className="font-medium text-primary underline-offset-4 hover:underline">
              Transcript Intake
            </Link>
            .
          </p>
        </div>
      </div>

      {selected && <ReviewPanel transcript={selected} onClose={() => setSelectedId(null)} />}
    </main>
  );
}
