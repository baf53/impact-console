import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, ChevronRight, FileText, ShieldCheck } from "lucide-react";
import { useState } from "react";

import { useConsoleData, type JurisdictionLevel, type KnowledgeProgram } from "@/lib/mock-data";

export const Route = createFileRoute("/knowledge-base/")({
  head: () => ({
    meta: [
      { title: "Knowledge Base — Collective Impact" },
      {
        name: "description",
        content: "The approved corpus of funding programs, source documents, and practitioner knowledge.",
      },
      { property: "og:title", content: "Knowledge Base — Collective Impact" },
      {
        property: "og:description",
        content: "The approved corpus of funding programs, source documents, and practitioner knowledge.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: KnowledgeBase,
});

const levelStyles: Record<JurisdictionLevel, string> = {
  Federal: "bg-info/15 text-info-foreground",
  State: "bg-primary/10 text-primary",
  Local: "bg-muted text-muted-foreground",
  Quasi: "bg-warning/15 text-warning-foreground",
};

export function CoverageMeter({ value }: { value: number }) {
  const tone = value >= 75 ? "bg-primary" : value >= 45 ? "bg-warning" : "bg-destructive";
  return (
    <span className="flex items-center gap-2">
      <span className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
        <span className={`block h-full rounded-full ${tone}`} style={{ width: `${value}%` }} />
      </span>
      <span className="text-xs tabular-nums text-muted-foreground">{value}%</span>
    </span>
  );
}

function ProgramRow({ program }: { program: KnowledgeProgram }) {
  const thin = program.coverage < 25;
  return (
    <Link
      to="/knowledge-base/$programId"
      params={{ programId: program.id }}
      className="grid gap-2 px-5 py-4 transition-colors hover:bg-muted/40 lg:grid-cols-[minmax(220px,1.5fr)_110px_minmax(160px,1fr)_150px_110px_28px] lg:items-center lg:gap-4"
    >
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium text-foreground">{program.name}</span>
        <span className="mt-0.5 block truncate text-xs text-muted-foreground">{program.administrator}</span>
        {thin && (
          <span className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-warning/15 px-2 py-0.5 text-xs font-medium text-warning-foreground">
            <AlertTriangle className="size-3" aria-hidden="true" /> Thin — needs practitioner review
          </span>
        )}
      </span>
      <span>
        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${levelStyles[program.level]}`}>
          {program.level}
        </span>
      </span>
      <span className="truncate text-sm text-muted-foreground">{program.cities.join(", ")}</span>
      <CoverageMeter value={program.coverage} />
      <span className="flex items-center gap-1.5 text-sm text-muted-foreground tabular-nums">
        <FileText className="size-3.5" aria-hidden="true" /> {program.documents.length} docs
      </span>
      <ChevronRight className="hidden size-4 text-muted-foreground lg:block" aria-hidden="true" />
    </Link>
  );
}

function KnowledgeBase() {
  const data = useConsoleData();
  const [tab, setTab] = useState<"program" | "jurisdiction">("program");
  const programs = data.programsLibrary;

  const byJurisdiction = programs.reduce<Record<string, KnowledgeProgram[]>>((acc, program) => {
    (acc[program.jurisdiction] ??= []).push(program);
    return acc;
  }, {});

  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-8 md:px-8 md:py-10">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">Corpus</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">Knowledge Base</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          The live, approved corpus the assistant answers from. Everything here cleared Review & Approve.
        </p>
      </div>

      <div className="mt-5 flex items-start gap-3 border border-primary/30 bg-primary/5 px-4 py-3">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
        <p className="text-xs leading-5 text-foreground">
          <span className="font-medium">{programs.length} programs live.</span> Coverage reflects how much of a
          program is backed by approved source documents and practitioner knowledge.
        </p>
      </div>

      <div className="mt-6 flex gap-1 border-b">
        {(
          [
            ["program", "By Program"],
            ["jurisdiction", "By Jurisdiction"],
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

      {tab === "program" ? (
        <div className="mt-6 overflow-hidden border bg-card">
          <div className="hidden grid-cols-[minmax(220px,1.5fr)_110px_minmax(160px,1fr)_150px_110px_28px] gap-4 border-b bg-muted/40 px-5 py-2.5 text-xs font-medium text-muted-foreground lg:grid">
            <span>Program</span>
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
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          {Object.entries(byJurisdiction).map(([jurisdiction, list]) => (
            <section key={jurisdiction} className="overflow-hidden border bg-card">
              <div className="flex items-center justify-between border-b bg-muted/40 px-5 py-2.5">
                <h2 className="text-sm font-semibold text-foreground">{jurisdiction}</h2>
                <span className="text-xs text-muted-foreground tabular-nums">{list.length} programs</span>
              </div>
              <div className="divide-y">
                {list.map((program) => (
                  <ProgramRow key={program.id} program={program} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
