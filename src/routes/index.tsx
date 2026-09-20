import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, CircleAlert, FileText, LibraryBig, type LucideIcon } from "lucide-react";

import { getProgramCount, useConsoleData } from "@/lib/mock-data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Collective Impact Data Console" },
      { name: "description", content: "Housing funding data pipeline operations dashboard." },
      { property: "og:title", content: "Dashboard — Collective Impact Data Console" },
      { property: "og:description", content: "Housing funding data pipeline operations dashboard." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Dashboard,
});

function StatCard({ label, value, icon: Icon }: { label: string; value: number; icon: LucideIcon }) {
  return (
    <div className="border bg-card p-5 shadow-xs">
      <div className="flex items-start justify-between gap-4">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <Icon className="size-4 text-primary" aria-hidden="true" />
      </div>
      <p className="mt-6 text-3xl font-semibold tabular-nums tracking-tight text-card-foreground">{value}</p>
    </div>
  );
}

const statusStyles = {
  approved: "bg-primary/10 text-primary",
  review: "bg-warning/15 text-warning-foreground",
  generated: "bg-info/15 text-info-foreground",
  updated: "bg-muted text-muted-foreground",
};

function Dashboard() {
  const data = useConsoleData();
  const stats = [
    { label: "Transcripts this month", value: data.stats.transcriptsThisMonth, icon: FileText },
    { label: "Items awaiting my approval", value: data.stats.awaitingApproval, icon: CircleAlert },
    { label: "Programs loaded", value: getProgramCount(data), icon: LibraryBig },
    { label: "Reports generated", value: data.stats.reportsGenerated, icon: CheckCircle2 },
  ];

  return (
    <main className="mx-auto w-full max-w-7xl px-5 py-8 md:px-8 md:py-10">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">Overview</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">Dashboard</h1>
          <p className="mt-2 text-sm text-muted-foreground">A snapshot of your data pipeline and review workload.</p>
        </div>
        <p className="text-xs font-medium text-muted-foreground">Updated just now</p>
      </div>

      <section className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Console statistics">
        {stats.map((stat) => <StatCard key={stat.label} {...stat} />)}
      </section>

      <section className="mt-10">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">Recent activity</h2>
            <p className="mt-1 text-sm text-muted-foreground">Latest changes across projects and programs.</p>
          </div>
        </div>
        <div className="overflow-hidden border bg-card">
          <div className="hidden grid-cols-[minmax(180px,1fr)_minmax(220px,1.4fr)_140px] gap-6 border-b bg-muted/40 px-5 py-2.5 text-xs font-medium text-muted-foreground md:grid">
            <span>Activity</span><span>Details</span><span>Time</span>
          </div>
          <div className="divide-y">
            {data.activity.map((item) => (
              <div key={item.id} className="grid gap-3 px-5 py-4 md:grid-cols-[minmax(180px,1fr)_minmax(220px,1.4fr)_140px] md:items-center md:gap-6">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`size-2 shrink-0 rounded-full ${statusStyles[item.status]}`} />
                    <p className="truncate text-sm font-medium text-foreground">{item.action}</p>
                  </div>
                  <p className="mt-1 truncate pl-4 text-sm text-muted-foreground">{item.subject}</p>
                </div>
                <p className="text-sm leading-5 text-muted-foreground">{item.detail}</p>
                <time className="text-xs text-muted-foreground">{item.occurredAt}</time>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}