import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowLeft,
  FileText,
  Loader2,
  Plus,
  Sparkles,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { consoleStore, useConsoleData, type Report } from "@/lib/mock-data";
import { buildReport } from "@/lib/report-content";
import { CitationMarker, CitationText } from "@/components/citation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "Reports — Collective Impact" },
      {
        name: "description",
        content:
          "Generate parcel funding reports with eligible programs, stacking analysis, and cited sources.",
      },
      { property: "og:title", content: "Reports — Collective Impact" },
      {
        property: "og:description",
        content:
          "Generate parcel funding reports with eligible programs, stacking analysis, and cited sources.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ReportsPage,
});

const fitClass: Record<Report["programs"][number]["fit"], string> = {
  Strong: "border-primary/40 text-primary",
  Likely: "border-info/50 text-info",
  Conditional: "border-warning/50 text-warning",
};

function todayLabel() {
  return new Date().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function ReportsPage() {
  const data = useConsoleData();
  const [formOpen, setFormOpen] = useState(false);
  const [projectId, setProjectId] = useState(data.projects[0]?.id ?? "");
  const [generating, setGenerating] = useState(false);
  const [openReportId, setOpenReportId] = useState<string | null>(null);

  const openReport =
    data.reports.find((report) => report.id === openReportId) ?? null;

  function generate() {
    if (!projectId) return;
    setGenerating(true);
    window.setTimeout(() => {
      const report = buildReport(projectId, todayLabel());
      consoleStore.update((current) => ({
        ...current,
        reports: [report, ...current.reports],
        stats: {
          ...current.stats,
          reportsGenerated: current.stats.reportsGenerated + 1,
        },
        activity: [
          {
            id: `activity-${Date.now()}`,
            action: "Report generated",
            subject: report.projectLabel.split(",")[0] ?? report.projectLabel,
            detail: `${report.programCount} eligible programs, stacking analysis`,
            occurredAt: "Just now",
            status: "generated" as const,
          },
          ...current.activity,
        ],
      }));
      setGenerating(false);
      setFormOpen(false);
      setOpenReportId(report.id);
      toast.success("Report generated", { description: report.projectLabel });
    }, 1400);
  }

  if (openReport) {
    return (
      <div className="space-y-6 p-6 lg:p-8">
        <Button variant="ghost" size="sm" onClick={() => setOpenReportId(null)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to reports
        </Button>
        <ReportView report={openReport} />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
          <p className="text-sm text-muted-foreground">
            Parcel funding reports built from the approved knowledge base. Every
            report you generate stays in the library.
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
              <Label htmlFor="parcel">Parcel</Label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger id="parcel">
                  <SelectValue placeholder="Pick a parcel" />
                </SelectTrigger>
                <SelectContent>
                  {data.projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.address}, {project.city}, {project.state}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3">
              <Button onClick={generate} disabled={generating}>
                {generating ? (
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
                disabled={generating}
              >
                Cancel
              </Button>
              {generating && (
                <span className="text-xs text-muted-foreground">
                  Assembling programs, stacking analysis, and citations…
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Report library
          </h2>
          <span className="text-xs text-muted-foreground">
            {data.reports.length} report{data.reports.length === 1 ? "" : "s"} in
            the archive
          </span>
        </div>
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Parcel</th>
                  <th className="px-4 py-3 font-medium">Generated</th>
                  <th className="px-4 py-3 font-medium">Programs</th>
                  <th className="px-4 py-3 font-medium">Sources cited</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {data.reports.map((report) => (
                  <tr
                    key={report.id}
                    onClick={() => setOpenReportId(report.id)}
                    className="cursor-pointer border-b last:border-0 transition-colors hover:bg-muted/40"
                  >
                    <td className="px-4 py-3 font-medium">
                      <span className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        {report.projectLabel}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                      {report.generatedOn}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {report.programCount}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {report.citations.length}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="ghost" size="sm">
                        Reopen
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </section>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      {children}
    </section>
  );
}

function ReportView({ report }: { report: Report }) {
  return (
    <article className="max-w-4xl space-y-8">
      <header className="space-y-2">
        <Badge variant="outline" className="text-xs">
          Funding report
        </Badge>
        <h1 className="text-2xl font-semibold tracking-tight">
          {report.projectLabel}
        </h1>
        <p className="text-sm text-muted-foreground">
          Generated {report.generatedOn} · {report.programCount} eligible
          programs · {report.citations.length} cited sources
        </p>
      </header>

      <Separator />

      <Section title="Parcel summary">
        <CitationText
          text={report.parcelSummary}
          citations={report.citations}
          className="text-sm leading-relaxed"
        />
      </Section>

      <Section title="Where to focus">
        <ul className="space-y-2">
          {report.focus.map((item) => (
            <li key={item} className="flex gap-2 text-sm leading-relaxed">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              <CitationText text={item} citations={report.citations} />
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Eligible programs">
        <div className="grid gap-3 sm:grid-cols-2">
          {report.programs.map((program) => (
            <Card key={program.id}>
              <CardHeader className="space-y-2 pb-3">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-sm leading-snug">
                    {program.name}
                  </CardTitle>
                  <Badge
                    variant="outline"
                    className={cn("shrink-0 text-xs", fitClass[program.fit])}
                  >
                    {program.fit} fit
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <CitationText
                  text={program.summary}
                  citations={report.citations}
                  className="text-sm leading-relaxed text-muted-foreground"
                />
              </CardContent>
            </Card>
          ))}
        </div>
      </Section>

      <Section title="Action plan per program">
        <div className="space-y-4">
          {report.programs.map((program) => (
            <div key={program.id} className="rounded-md border p-4">
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

      <Section title="Stacking analysis">
        <CitationText
          text={report.stacking}
          citations={report.citations}
          className="rounded-md border bg-muted/30 p-4 text-sm leading-relaxed"
        />
      </Section>

      <Section title="Cash flow summary">
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <tbody>
              {report.cashFlow.map((row) => (
                <tr key={row.label} className="border-b last:border-0">
                  <td className="px-4 py-2.5">
                    {row.label}
                    {row.note && (
                      <span className="block text-xs text-muted-foreground">
                        {row.note}
                      </span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-right font-medium tabular-nums">
                    {row.value}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </Section>

      <Section title="Citations">
        <ul className="space-y-2">
          {report.citations.map((citation) => (
            <li key={citation.id} className="flex gap-3 text-sm">
              <CitationMarker citation={citation} className="mt-1" />
              <span className="text-muted-foreground">
                {citation.isPractitionerKnowledge ? (
                  <>
                    Collective Impact practitioner guidance —{" "}
                    {citation.documentTitle}, {citation.page}, {citation.date}.
                  </>
                ) : (
                  <>
                    {citation.documentTitle}. {citation.issuingBody},{" "}
                    {citation.date}, {citation.page}.
                  </>
                )}
              </span>
            </li>
          ))}
        </ul>
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <X className="h-3 w-3" />
          Hover any citation number to see the full source and open it.
        </p>
      </Section>
    </article>
  );
}
