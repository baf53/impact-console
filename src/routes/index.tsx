import { createFileRoute } from "@tanstack/react-router";
import { formatDistanceToNow } from "date-fns";
import {
  CheckCircle2,
  Circle,
  CircleAlert,
  FileText,
  LibraryBig,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { useDashboard } from "@/hooks/use-knowledge";
import { useIntegrationStatus } from "@/hooks/use-pipeline";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Collective Impact Data Console" },
      { name: "description", content: "Housing funding data pipeline operations dashboard." },
      { property: "og:title", content: "Dashboard — Collective Impact Data Console" },
      {
        property: "og:description",
        content: "Housing funding data pipeline operations dashboard.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Dashboard,
});

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number | undefined;
  icon: LucideIcon;
}) {
  return (
    <div className="border bg-card p-5 shadow-xs">
      <div className="flex items-start justify-between gap-4">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <Icon className="size-4 text-primary" aria-hidden="true" />
      </div>
      <p className="mt-6 text-3xl font-semibold tabular-nums tracking-tight text-card-foreground">
        {value ?? "—"}
      </p>
    </div>
  );
}

const statusStyles = {
  approved: "bg-primary",
  review: "bg-warning",
  generated: "bg-info",
  updated: "bg-muted-foreground/40",
};

type Integration = { label: string; ok: boolean | undefined; on: string; off: string };

function IntegrationList({
  items,
  optional,
  checking,
}: {
  items: Integration[];
  optional: boolean;
  checking: boolean;
}) {
  return (
    <ul className="divide-y border bg-card">
      {items.map((item) => (
        <li key={item.label} className="flex items-start gap-3 px-5 py-3">
          {item.ok ? (
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" aria-label="Done" />
          ) : optional ? (
            <Circle
              className="mt-0.5 size-4 shrink-0 text-muted-foreground/60"
              aria-label="Not set up"
            />
          ) : (
            <CircleAlert className="mt-0.5 size-4 shrink-0 text-warning" aria-label="Needs setup" />
          )}
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">{item.label}</p>
            <p className="text-xs leading-5 text-muted-foreground">
              {checking ? "Checking…" : item.ok ? item.on : item.off}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}

function SetupChecklist() {
  const { data } = useIntegrationStatus();
  const required: Integration[] = [
    {
      label: "Secure database access",
      ok: data?.supabaseSecretKey,
      on: "Server uses the secret key",
      off: "Add SUPABASE_SECRET_KEY to the server settings",
    },
    {
      label: "Feature tables",
      ok: data?.step3Migration,
      on: "Answer Log, Golden Set and Grants.gov tables ready",
      off: "Run supabase_step3_features.sql in the Supabase SQL Editor",
    },
    {
      label: "AI (Gemini)",
      ok: data?.gemini,
      on: `Extraction, previews and report analysis on (${data?.geminiModel ?? ""})`,
      off: "Add GEMINI_API_KEY to the server settings",
    },
  ];
  const optional: Integration[] = [
    {
      label: "Client alert emails",
      ok: data?.email,
      on: "Alerts are emailed to clients from the console",
      off: "Not set up — approved alerts open in your own email app instead. Needs a Resend account with your email domain verified.",
    },
    {
      label: "Zoom auto-import",
      ok: data?.zoomWebhook,
      on: "Finished Zoom transcripts arrive in Intake automatically",
      off: "Not set up — paste or upload Zoom transcripts instead. Needs a paid Zoom plan with cloud recording and the console online.",
    },
    {
      label: "Granola auto-import",
      ok: data?.ingestWebhook,
      on: "Transcripts sent by an automation arrive in Intake automatically",
      off: "Not set up — paste or upload Granola notes instead. Needs an automation tool (Zapier or Make) and the console online.",
    },
    {
      label: "Chatbot answer logging",
      ok: data?.chatbotLog,
      on: "The chatbot's answers arrive in the Answer Log",
      off: "Not set up — turn it on once the chatbot team connects the chatbot.",
    },
  ];
  const checking = data === undefined;

  return (
    <section className="mt-10 space-y-6">
      <div>
        <div className="mb-4">
          <h2 className="text-base font-semibold text-foreground">Setup</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            What the console needs to work. Every item here should be ticked.
          </p>
        </div>
        <IntegrationList items={required} optional={false} checking={checking} />
      </div>
      <div>
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-foreground">Optional extras</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Connections to outside services. The console works fully without them; setup steps are
            in docs/integrations.md.
          </p>
        </div>
        <IntegrationList items={optional} optional checking={checking} />
      </div>
    </section>
  );
}

function Dashboard() {
  const { data, isLoading, isError, error, refetch, dataUpdatedAt } = useDashboard();
  const stats = [
    { label: "Transcripts this month", value: data?.transcriptsThisMonth, icon: FileText },
    { label: "Items awaiting my approval", value: data?.awaitingApproval, icon: CircleAlert },
    { label: "Programs loaded", value: data?.programsLoaded, icon: LibraryBig },
    { label: "Reports generated", value: data?.reportsGenerated, icon: CheckCircle2 },
  ];

  return (
    <main className="mx-auto w-full max-w-7xl px-5 py-8 md:px-8 md:py-10">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">Overview</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">Dashboard</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            A snapshot of your data pipeline and review workload.
          </p>
        </div>
        <p className="text-xs font-medium text-muted-foreground">
          {dataUpdatedAt
            ? `Updated ${formatDistanceToNow(dataUpdatedAt, { addSuffix: true })}`
            : "Loading…"}
        </p>
      </div>

      {isError && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border border-destructive/40 bg-destructive/5 px-4 py-3 text-xs text-foreground">
          <span>{(error as Error).message}</span>
          <Button size="sm" variant="outline" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      )}

      <section
        className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
        aria-label="Console statistics"
      >
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </section>

      <SetupChecklist />

      <section className="mt-10">
        <div className="mb-4">
          <h2 className="text-base font-semibold text-foreground">Recent activity</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            The audit trail of changes across the pipeline, Knowledge Base, and documents.
          </p>
        </div>
        <div className="overflow-hidden border bg-card">
          <div className="hidden grid-cols-[minmax(180px,1fr)_minmax(220px,1.4fr)_140px] gap-6 border-b bg-muted/40 px-5 py-2.5 text-xs font-medium text-muted-foreground md:grid">
            <span>Activity</span>
            <span>Details</span>
            <span>Time</span>
          </div>
          <div className="divide-y">
            {(data?.activity ?? []).map((item) => (
              <div
                key={item.id}
                className="grid gap-3 px-5 py-4 md:grid-cols-[minmax(180px,1fr)_minmax(220px,1.4fr)_140px] md:items-center md:gap-6"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={`size-2 shrink-0 rounded-full ${statusStyles[item.status]}`}
                      aria-hidden="true"
                    />
                    <p className="truncate text-sm font-medium text-foreground">{item.action}</p>
                  </div>
                  <p className="mt-1 truncate pl-4 text-sm text-muted-foreground">{item.subject}</p>
                </div>
                <p className="text-sm leading-5 text-muted-foreground">{item.detail}</p>
                <time dateTime={item.created_at} className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                </time>
              </div>
            ))}
            {!isLoading && data?.activity.length === 0 && (
              <p className="px-5 py-8 text-center text-sm text-muted-foreground">
                No activity yet.
              </p>
            )}
            {isLoading && (
              <p className="px-5 py-8 text-center text-sm text-muted-foreground">Loading…</p>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
