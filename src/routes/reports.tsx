import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  BookOpen,
  FileText,
  Info,
  Loader2,
  MessageSquareQuote,
  Plus,
  Printer,
  Sparkles,
  Trash2,
} from "lucide-react";

import { DealChecklist } from "@/components/deal-checklist";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import type {
  ClientRow,
  ProgramFit,
  ReportProgram,
  ReportRow,
  ReportSource,
} from "@/functions/deals";
import { useDeals, useDeleteReport, useGenerateReport, useReports } from "@/hooks/use-deals";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/reports")({
  validateSearch: (search: Record<string, unknown>): { report?: string } =>
    typeof search["report"] === "string" ? { report: search["report"] } : {},
  head: () => ({
    meta: [
      { title: "Reports — Collective Impact" },
      {
        name: "description",
        content:
          "Generate parcel funding proposals with linked programs, a funding stack, and the missing documents checklist.",
      },
      { property: "og:title", content: "Reports — Collective Impact" },
      {
        property: "og:description",
        content:
          "Generate parcel funding proposals with linked programs, a funding stack, and the missing documents checklist.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ReportsPage,
});

const fitClass: Record<ProgramFit, string> = {
  Strong: "border-primary/40 text-primary",
  Likely: "border-info/50 text-info-foreground",
  Conditional: "border-warning/50 text-warning-foreground",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function ReportsPage() {
  const { report: openReportId } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const { data: reports = [], isLoading, isError, error, refetch } = useReports();
  const { data: deals } = useDeals();
  const clients = deals?.clients ?? [];
  const generate = useGenerateReport();
  const [formOpen, setFormOpen] = useState(false);
  const [clientId, setClientId] = useState("");

  const setOpenReport = (id: string | null) =>
    navigate({ search: id ? { report: id } : {}, replace: false });

  const openReport = reports.find((report) => report.id === openReportId) ?? null;
  const clientName = (id: string) => clients.find((c) => c.id === id)?.client_name ?? "—";

  if (openReport) {
    const client = clients.find((c) => c.id === openReport.client_id) ?? null;
    return (
      <div className="space-y-6 p-6 lg:p-8">
        <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
          <Button variant="ghost" size="sm" onClick={() => setOpenReport(null)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to reports
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer /> Print / save as PDF
          </Button>
        </div>
        <ReportView report={openReport} client={client} />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
          <p className="text-sm text-muted-foreground">
            Funding proposals assembled from a deal's approved call items and its linked Knowledge
            Base programs. Every report stays in the library.
          </p>
        </div>
        <Button onClick={() => setFormOpen((open) => !open)}>
          <Plus className="mr-2 h-4 w-4" />
          Generate report
        </Button>
      </header>

      {formOpen && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">New report</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="max-w-md space-y-2">
              <Label htmlFor="report-client">Client deal</Label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger id="report-client">
                  <SelectValue placeholder="Pick a client / parcel" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.client_name} · {client.parcel_address}, {client.state}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button
                disabled={!clientId || generate.isPending}
                onClick={() =>
                  generate.mutate(clientId, {
                    onSuccess: (report) => {
                      setFormOpen(false);
                      setOpenReport(report.id);
                    },
                  })
                }
              >
                {generate.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating…
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate
                  </>
                )}
              </Button>
              <Button
                variant="ghost"
                onClick={() => setFormOpen(false)}
                disabled={generate.isPending}
              >
                Cancel
              </Button>
              <span className="text-xs text-muted-foreground">
                Uses only approved items and Knowledge Base data — nothing is invented.
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {isError && (
        <div className="flex flex-wrap items-center justify-between gap-3 border border-destructive/40 bg-destructive/5 px-4 py-3 text-xs text-foreground">
          <span>{(error as Error).message}</span>
          <Button size="sm" variant="outline" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      )}

      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Report library
          </h2>
          <span className="text-xs text-muted-foreground">
            {reports.length} report{reports.length === 1 ? "" : "s"} in the archive
          </span>
        </div>
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Parcel</th>
                  <th className="px-4 py-3 font-medium">Client</th>
                  <th className="px-4 py-3 font-medium">Generated</th>
                  <th className="px-4 py-3 font-medium">Programs</th>
                  <th className="px-4 py-3 font-medium">Sources</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {reports.map((report) => (
                  <tr
                    key={report.id}
                    onClick={() => setOpenReport(report.id)}
                    className="cursor-pointer border-b transition-colors last:border-0 hover:bg-muted/40"
                  >
                    <td className="px-4 py-3 font-medium">
                      <span className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        {report.project_label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {clientName(report.client_id)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                      {formatDate(report.created_at)}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-muted-foreground">
                      {report.program_count}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-muted-foreground">
                      {(report.citations as unknown as ReportSource[]).length}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="ghost" size="sm">
                        Reopen
                      </Button>
                    </td>
                  </tr>
                ))}
                {reports.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                      {isLoading ? "Loading reports…" : "No reports yet. Generate one for a deal."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 break-inside-avoid">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      {children}
    </section>
  );
}

function ReportView({ report, client }: { report: ReportRow; client: ClientRow | null }) {
  const deleteReport = useDeleteReport();
  const navigate = useNavigate({ from: Route.fullPath });
  const programs = report.programs as unknown as ReportProgram[];
  const sources = report.citations as unknown as ReportSource[];
  const withActions = programs.filter((p) => p.actions.length > 0);
  const [summaryHeadline, ...parcelDetails] = (report.parcel_summary ?? "").split("\n");
  // The generator titles a report "Program scan" when no programs were linked to the deal yet.
  const scanOnly = report.title.startsWith("Program scan");

  return (
    <article className="max-w-4xl space-y-8">
      <header className="space-y-2">
        <Badge variant="outline" className="text-xs">
          {scanOnly ? "Program scan" : "Funding proposal"}
        </Badge>
        <h1 className="text-2xl font-semibold tracking-tight">{report.project_label}</h1>
        <p className="text-sm text-muted-foreground">
          Generated {formatDate(report.created_at)} · {report.program_count} programs ·{" "}
          {sources.length} sources
        </p>
      </header>

      {scanOnly && (
        <div className="flex items-start gap-3 border border-warning/40 bg-warning/10 px-4 py-3 print:hidden">
          <Info className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
          <p className="text-xs leading-5 text-foreground">
            No programs had been linked to this deal when the report was generated, so it lists
            every program available in {client?.state ?? "the client's state"}. Approve subsidy
            items from the client's calls to produce a targeted proposal.
          </p>
        </div>
      )}

      <Separator />

      <Section title="Parcel summary">
        <p className="text-sm font-medium">{summaryHeadline}</p>
        {parcelDetails.length > 0 && (
          <ul className="space-y-1.5">
            {parcelDetails.map((line) => (
              <li key={line} className="flex gap-2 text-sm leading-relaxed text-muted-foreground">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                {line}
              </li>
            ))}
          </ul>
        )}
      </Section>

      {report.focus.length > 0 && (
        <Section title="Where to focus">
          <ul className="space-y-2">
            {report.focus.map((item) => (
              <li key={item} className="flex gap-2 text-sm leading-relaxed">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                {item}
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section title={scanOnly ? "Programs available" : "Eligible programs"}>
        {programs.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No Knowledge Base programs cover {client?.state ?? "this state"} yet.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {programs.map((program) => (
              <Card key={program.id} className="break-inside-avoid">
                <CardHeader className="space-y-1.5 pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-sm leading-snug">{program.name}</CardTitle>
                    <Badge
                      variant="outline"
                      className={cn("shrink-0 text-xs", fitClass[program.fit])}
                    >
                      {program.fit} fit
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {program.level} · {program.state} · {program.administrator}
                  </p>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-sm font-medium tabular-nums">{program.funds}</p>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {program.overview}
                  </p>
                  {program.evidence && (
                    <p className="border-l-2 border-primary/40 pl-3 text-xs leading-relaxed text-foreground/80">
                      From the call: {program.evidence}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        <p className="flex items-center gap-2 text-xs text-muted-foreground print:hidden">
          <Info className="h-3 w-3" />
          Fit reflects the confidence of the approved subsidy item for each program; programs
          without one are Conditional.
        </p>
      </Section>

      {withActions.length > 0 && (
        <Section title="Action plan per program">
          <div className="space-y-4">
            {withActions.map((program) => (
              <div key={program.id} className="break-inside-avoid rounded-md border p-4">
                <p className="text-sm font-medium">{program.name}</p>
                <ol className="mt-2 space-y-1.5">
                  {program.actions.map((action, index) => (
                    <li key={action} className="flex gap-3 text-sm">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
                        {index + 1}
                      </span>
                      <span className="text-muted-foreground">{action}</span>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </Section>
      )}

      {programs.length > 0 && (
        <Section title="Funding stack">
          <ol className="space-y-1.5 rounded-md border bg-muted/30 p-4">
            {programs.map((p, i) => (
              <li key={p.id} className="text-sm leading-relaxed tabular-nums">
                {i + 1}. {p.level}: {p.name} — {p.funds}
              </li>
            ))}
          </ol>
          <p className="flex items-center gap-2 text-xs text-muted-foreground print:hidden">
            <Info className="h-3 w-3" />
            Ordered by program level. Confirm amounts and sequencing before presenting.
          </p>
        </Section>
      )}

      {report.stacking && (
        <Section title="Stacking analysis">
          <div className="space-y-3 rounded-md border p-4 text-sm leading-relaxed">
            {report.stacking.split(/\n{2,}/).map((para) => (
              <p key={para}>{para}</p>
            ))}
          </div>
          <p className="flex items-center gap-2 text-xs text-muted-foreground print:hidden">
            <Sparkles className="h-3 w-3" />
            Drafted by AI from this report's programs and notes. Review before sending.
          </p>
        </Section>
      )}

      {client && (
        <Section title="Missing documents checklist">
          <p className="text-xs text-muted-foreground">Current as of today.</p>
          <DealChecklist client={client} />
        </Section>
      )}

      <Section title="Sources">
        {sources.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No program documents or program-level practitioner notes yet.
          </p>
        ) : (
          <ul className="space-y-2">
            {sources.map((source, index) => (
              <li key={source.id} className="flex gap-3 text-sm">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-xs tabular-nums text-muted-foreground">
                  {index + 1}
                </span>
                <span className="text-muted-foreground">
                  {source.kind === "note" ? (
                    <MessageSquareQuote className="mr-1 inline size-3.5" aria-hidden="true" />
                  ) : (
                    <BookOpen className="mr-1 inline size-3.5" aria-hidden="true" />
                  )}
                  <span className="text-foreground">{source.title}</span> — {source.program} ·{" "}
                  {source.detail}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <div className="border-t pt-4 print:hidden">
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive"
          disabled={deleteReport.isPending}
          onClick={() => {
            if (window.confirm("Delete this report from the library?")) {
              deleteReport.mutate(report.id, {
                onSuccess: () => navigate({ search: {} }),
              });
            }
          }}
        >
          <Trash2 /> Delete report
        </Button>
      </div>
    </article>
  );
}
