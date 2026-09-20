import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, CircleCheck, RefreshCw, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { consoleStore, useConsoleData, type Transcript, type TranscriptStatus } from "@/lib/mock-data";

export const Route = createFileRoute("/transcript-intake")({
  head: () => ({
    meta: [
      { title: "Transcript Intake — Collective Impact" },
      { name: "description", content: "Import and process housing funding transcripts." },
      { property: "og:title", content: "Transcript Intake — Collective Impact" },
      { property: "og:description", content: "Import and process housing funding transcripts." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TranscriptIntake,
});

const statusMeta: Record<TranscriptStatus, { label: string; className: string }> = {
  new: { label: "New", className: "bg-info/15 text-info-foreground" },
  extracting: { label: "Extracting…", className: "bg-warning/15 text-warning-foreground" },
  ready: { label: "Ready for review", className: "bg-primary/10 text-primary" },
  approved: { label: "Approved", className: "bg-muted text-muted-foreground" },
};

function StatusBadge({ status }: { status: TranscriptStatus }) {
  const meta = statusMeta[status];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${meta.className}`}
    >
      {status === "extracting" && <RefreshCw className="mr-1 size-3 animate-spin" aria-hidden="true" />}
      {meta.label}
    </span>
  );
}

function DetailPanel({ transcript, onClose }: { transcript: Transcript; onClose: () => void }) {
  const runExtraction = () => {
    consoleStore.update((current) => ({
      ...current,
      transcripts: current.transcripts.map((t) =>
        t.id === transcript.id ? { ...t, status: "ready" as TranscriptStatus } : t,
      ),
    }));
  };

  return (
    <aside className="flex h-full w-full flex-col border-l bg-card lg:w-[420px] lg:shrink-0">
      <div className="flex items-start justify-between gap-4 border-b px-5 py-4">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold text-foreground">{transcript.organization}</h2>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {transcript.projectLabel} · {transcript.callDate}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={transcript.status} />
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close detail panel">
            <X />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Raw transcript
        </p>
        <div className="space-y-4">
          {transcript.rawText.split("\n\n").map((paragraph, index) => (
            <p key={index} className="text-sm leading-6 text-foreground/90">
              {paragraph}
            </p>
          ))}
        </div>
      </div>

      <div className="border-t px-5 py-4">
        {transcript.status === "ready" ? (
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-sm font-medium text-primary">
              <CircleCheck className="size-4" aria-hidden="true" /> Ready for review
            </span>
            <Button asChild size="sm">
              <Link to="/review">
                Open Review & Approve <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
          </div>
        ) : transcript.status === "approved" ? (
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-muted-foreground">This transcript has been approved.</span>
            <Button asChild variant="outline" size="sm">
              <Link to="/review">View in Review <ArrowRight aria-hidden="true" /></Link>
            </Button>
          </div>
        ) : (
          <Button onClick={runExtraction} className="w-full" disabled={transcript.status === "extracting"}>
            <RefreshCw aria-hidden="true" className={transcript.status === "extracting" ? "animate-spin" : ""} />
            {transcript.status === "extracting" ? "Extraction in progress…" : "Run extraction"}
          </Button>
        )}
      </div>
    </aside>
  );
}

function TranscriptIntake() {
  const data = useConsoleData();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [autoExtract, setAutoExtract] = useState(true);

  const selected = data.transcripts.find((t) => t.id === selectedId) ?? null;

  return (
    <main className="flex min-h-[calc(100vh-4rem)] w-full flex-col lg:flex-row">
      <div className="min-w-0 flex-1 px-5 py-8 md:px-8 md:py-10">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">Workspace</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">Transcript Intake</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Incoming call transcripts from your connected source, queued for extraction.
            </p>
          </div>
          <label className="flex items-center gap-3 text-sm font-medium text-foreground">
            Auto-extract on arrival
            <Switch checked={autoExtract} onCheckedChange={setAutoExtract} aria-label="Auto-extract on arrival" />
          </label>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border bg-card px-5 py-3">
          <div className="flex items-center gap-3">
            <span className="grid size-8 place-items-center rounded-md bg-primary/10 text-xs font-bold text-primary">G</span>
            <div>
              <p className="text-sm font-medium text-foreground">Granola</p>
              <p className="text-xs text-muted-foreground">Connected source · Call notes</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="size-2 rounded-full bg-primary" aria-hidden="true" />
            <span className="font-medium text-foreground">Connected</span>
            <span aria-hidden="true">·</span>
            <span>Last synced 2 hours ago</span>
          </div>
        </div>

        <div className="mt-4 overflow-hidden border bg-card">
          <div className="hidden grid-cols-[minmax(180px,1.2fr)_110px_minmax(180px,1.2fr)_minmax(200px,1.4fr)_130px] gap-4 border-b bg-muted/40 px-5 py-2.5 text-xs font-medium text-muted-foreground lg:grid">
            <span>Client / Organization</span>
            <span>Call date</span>
            <span>Project</span>
            <span>Programs discussed</span>
            <span>Status</span>
          </div>
          <div className="divide-y">
            {data.transcripts.map((transcript) => (
              <button
                key={transcript.id}
                type="button"
                onClick={() => setSelectedId(transcript.id === selectedId ? null : transcript.id)}
                className={`grid w-full gap-2 px-5 py-4 text-left transition-colors hover:bg-muted/40 lg:grid-cols-[minmax(180px,1.2fr)_110px_minmax(180px,1.2fr)_minmax(200px,1.4fr)_130px] lg:items-center lg:gap-4 ${
                  transcript.id === selectedId ? "bg-muted/50" : ""
                }`}
              >
                <span className="truncate text-sm font-medium text-foreground">{transcript.organization}</span>
                <span className="text-sm text-muted-foreground">{transcript.callDate}</span>
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
                  <StatusBadge status={transcript.status} />
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {selected && <DetailPanel transcript={selected} onClose={() => setSelectedId(null)} />}
    </main>
  );
}
