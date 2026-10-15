import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  ChevronRight,
  FileText,
  MessageSquareQuote,
  Plus,
  ShieldCheck,
} from "lucide-react";
import { useState } from "react";

import { CoverageMeter } from "@/components/coverage-meter";
import { DocumentsLibrary } from "@/components/documents-library";
import { ProgramForm } from "@/components/program-form";
import { Button } from "@/components/ui/button";
import type { ProgramSummary } from "@/functions/knowledge";
import { useCreateProgram, useProgramSummaries } from "@/hooks/use-knowledge";
import { KNOWLEDGE_STATES, stateLabel } from "@/lib/states";

export const Route = createFileRoute("/knowledge-base/")({
  head: () => ({
    meta: [
      { title: "Knowledge Base — Collective Impact" },
      {
        name: "description",
        content:
          "The approved corpus of funding programs, source documents, and practitioner knowledge.",
      },
      { property: "og:title", content: "Knowledge Base — Collective Impact" },
      {
        property: "og:description",
        content:
          "The approved corpus of funding programs, source documents, and practitioner knowledge.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: KnowledgeBase,
});

const levelStyles: Record<ProgramSummary["level"], string> = {
  Federal: "bg-info/15 text-info-foreground",
  State: "bg-primary/10 text-primary",
  Local: "bg-muted text-muted-foreground",
  Quasi: "bg-warning/15 text-warning-foreground",
};

const GRID =
  "lg:grid-cols-[minmax(220px,1.5fr)_70px_90px_minmax(140px,1fr)_140px_120px_28px] lg:items-center lg:gap-4";

function ProgramRow({ program }: { program: ProgramSummary }) {
  const thin = program.coverage < 25;
  return (
    <Link
      to="/knowledge-base/$programId"
      params={{ programId: program.id }}
      className={`grid gap-2 px-5 py-4 transition-colors hover:bg-muted/40 ${GRID}`}
    >
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium text-foreground">{program.name}</span>
        <span className="mt-0.5 block truncate text-xs text-muted-foreground">
          {program.administrator}
        </span>
        {thin && (
          <span className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-warning/15 px-2 py-0.5 text-xs font-medium text-warning-foreground">
            <AlertTriangle className="size-3" aria-hidden="true" /> Thin — needs practitioner review
          </span>
        )}
      </span>
      <span>
        <span className="inline-flex rounded-full border px-2 py-0.5 text-xs font-medium tabular-nums">
          {program.state}
        </span>
      </span>
      <span>
        <span
          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${levelStyles[program.level]}`}
        >
          {program.level}
        </span>
      </span>
      <span className="truncate text-sm text-muted-foreground">
        {program.cities.join(", ") || "—"}
      </span>
      <CoverageMeter value={program.coverage} />
      <span className="flex items-center gap-3 text-sm tabular-nums text-muted-foreground">
        <span className="flex items-center gap-1" title="Source documents and attachments">
          <FileText className="size-3.5" aria-hidden="true" /> {program.documentCount}
        </span>
        <span className="flex items-center gap-1" title="Practitioner notes">
          <MessageSquareQuote className="size-3.5" aria-hidden="true" /> {program.noteCount}
        </span>
      </span>
      <ChevronRight className="hidden size-4 text-muted-foreground lg:block" aria-hidden="true" />
    </Link>
  );
}

function ProgramTable({ programs }: { programs: ProgramSummary[] }) {
  return (
    <>
      <div
        className={`hidden gap-4 border-b bg-muted/40 px-5 py-2.5 text-xs font-medium text-muted-foreground lg:grid ${GRID}`}
      >
        <span>Program</span>
        <span>State</span>
        <span>Level</span>
        <span>Loaded for</span>
        <span>Coverage</span>
        <span>Sources</span>
        <span />
      </div>
      <div className="divide-y">
        {programs.map((program) => (
          <ProgramRow key={program.id} program={program} />
        ))}
      </div>
    </>
  );
}

function KnowledgeBase() {
  const { data: programs = [], isLoading, isError, error, refetch } = useProgramSummaries();
  const createProgram = useCreateProgram();
  const [tab, setTab] = useState<"program" | "state" | "documents">("program");
  const [adding, setAdding] = useState(false);

  const byState = KNOWLEDGE_STATES.map((code) => ({
    code,
    programs: programs.filter((p) => p.state === code),
  })).filter((group) => group.programs.length > 0);
  const otherStates = programs.filter(
    (p) => !(KNOWLEDGE_STATES as readonly string[]).includes(p.state),
  );

  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-8 md:px-8 md:py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">Corpus</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
            Knowledge Base
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            The live, approved corpus the chatbot answers from, partitioned by state. Practitioner
            notes arrive here when transcripts are approved in the Pipeline.
          </p>
        </div>
        {!adding && (
          <Button onClick={() => setAdding(true)} className="gap-2">
            <Plus className="size-4" aria-hidden="true" /> Add program
          </Button>
        )}
      </div>

      <div className="mt-5 flex items-start gap-3 border border-primary/30 bg-primary/5 px-4 py-3">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
        <p className="text-xs leading-5 text-foreground">
          <span className="font-medium">
            {isLoading ? "Loading programs…" : `${programs.length} programs live`}
            {byState.length > 0 && ` across ${byState.map((g) => g.code).join(", ")}`}.
          </span>{" "}
          Coverage reflects how much of a program is backed by approved source documents and
          practitioner knowledge.
        </p>
      </div>

      {adding && (
        <section className="mt-5 border bg-card p-5">
          <h2 className="text-sm font-semibold text-foreground">Add program</h2>
          <p className="mt-0.5 mb-4 text-xs text-muted-foreground">
            Goes live for the chatbot immediately, filtered by its state tag.
          </p>
          <ProgramForm
            submitLabel="Add program"
            pending={createProgram.isPending}
            onCancel={() => setAdding(false)}
            onSubmit={(fields) =>
              createProgram.mutate(fields, { onSuccess: () => setAdding(false) })
            }
          />
        </section>
      )}

      {isError && (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border border-destructive/40 bg-destructive/5 px-4 py-3 text-xs text-foreground">
          <span>{(error as Error).message}</span>
          <Button size="sm" variant="outline" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      )}

      <div className="mt-6 flex gap-1 border-b">
        {(
          [
            ["program", "By Program"],
            ["state", "By State"],
            ["documents", "Documents"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
              tab === key
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "documents" ? (
        <div className="mt-6">
          <DocumentsLibrary />
        </div>
      ) : !isLoading && programs.length === 0 ? (
        <p className="mt-6 border border-dashed bg-muted/20 px-5 py-10 text-center text-sm text-muted-foreground">
          No programs yet. Add one, or approve a subsidy from a transcript in the Pipeline.
        </p>
      ) : tab === "program" ? (
        <div className="mt-6 overflow-hidden border bg-card">
          <ProgramTable programs={programs} />
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          {[
            ...byState,
            ...(otherStates.length ? [{ code: "Other", programs: otherStates }] : []),
          ].map((group) => (
            <section key={group.code} className="overflow-hidden border bg-card">
              <div className="flex items-center justify-between border-b bg-muted/40 px-5 py-2.5">
                <h2 className="text-sm font-semibold text-foreground">{stateLabel(group.code)}</h2>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {group.programs.length} programs
                </span>
              </div>
              <ProgramTable programs={group.programs} />
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
