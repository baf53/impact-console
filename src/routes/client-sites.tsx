import { useMemo, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { BellRing, FileText, Mail, ShieldCheck, X } from "lucide-react";
import { toast } from "sonner";

import {
  consoleStore,
  useConsoleData,
  type AlertStatus,
  type ClientAlert,
  type ClientSite,
} from "@/lib/mock-data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/client-sites")({
  head: () => ({
    meta: [
      { title: "Client Sites & Alerts — Collective Impact" },
      {
        name: "description",
        content:
          "Standing subscribers by parcel, with an approval-gated alert queue for program and regulation updates.",
      },
      { property: "og:title", content: "Client Sites & Alerts — Collective Impact" },
      {
        property: "og:description",
        content:
          "Standing subscribers by parcel, with an approval-gated alert queue for program and regulation updates.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ClientSitesPage,
});

const alertStatusStyles: Record<AlertStatus, string> = {
  draft: "bg-warning/15 text-warning-foreground border-warning/30",
  approved: "bg-info/15 text-info-foreground border-info/30",
  sent: "bg-primary/10 text-primary border-primary/30",
};

const alertStatusLabels: Record<AlertStatus, string> = {
  draft: "Draft",
  approved: "Approved",
  sent: "Sent",
};

function toggleAlerts(siteId: string, enabled: boolean) {
  consoleStore.update((current) => ({
    ...current,
    clientSites: current.clientSites.map((site) =>
      site.id === siteId ? { ...site, alertsEnabled: enabled } : site,
    ),
  }));
}

function updateAlert(id: string, patch: Partial<ClientAlert>) {
  consoleStore.update((current) => ({
    ...current,
    alerts: current.alerts.map((alert) => (alert.id === id ? { ...alert, ...patch } : alert)),
  }));
}

function approveAndSend(alert: ClientAlert, site: ClientSite | undefined) {
  updateAlert(alert.id, { status: "sent", sentOn: "Today" });
  consoleStore.update((current) => ({
    ...current,
    activity: [
      {
        id: `activity-alert-${Date.now()}`,
        action: "Alert sent to client",
        subject: site?.parcelAddress.split(",")[0] ?? alert.title,
        detail: site ? `${site.clientName} · ${site.email}` : alert.trigger,
        occurredAt: "Just now",
        status: "approved",
      },
      ...current.activity,
    ],
  }));
  toast.success("Alert approved and sent", {
    description: site ? `Emailed to ${site.email}` : alert.title,
  });
}

function dismissAlert(id: string) {
  consoleStore.update((current) => ({
    ...current,
    alerts: current.alerts.filter((alert) => alert.id !== id),
  }));
  toast("Alert dismissed", { description: "Nothing was sent to the client." });
}

function ClientSitesPage() {
  const data = useConsoleData();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftText, setDraftText] = useState("");

  const selected = useMemo(
    () => data.clientSites.find((site) => site.id === selectedId) ?? null,
    [data.clientSites, selectedId],
  );
  const drafts = data.alerts.filter((alert) => alert.status === "draft");

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-start gap-3 rounded-lg border border-primary/25 bg-primary/5 px-4 py-3">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
        <p className="text-sm text-foreground/85">
          A report recipient becomes a standing subscriber for their parcel. No alert reaches a
          client inbox until you approve and send it here.
        </p>
      </div>

      <Tabs defaultValue="sites">
        <TabsList>
          <TabsTrigger value="sites">Client Sites</TabsTrigger>
          <TabsTrigger value="alerts">
            Alerts queue
            {drafts.length > 0 && (
              <span className="ml-2 rounded-full bg-warning/20 px-1.5 text-xs text-warning-foreground">
                {drafts.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sites" className="mt-6">
          <div className={cn("gap-6", selected ? "grid xl:grid-cols-[minmax(0,1fr)_360px]" : "block")}>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Subscribed sites</CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">
                  {data.clientSites.filter((s) => s.alertsEnabled).length} of{" "}
                  {data.clientSites.length} receiving alerts
                </p>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                        <th className="px-4 py-3 font-medium">Client</th>
                        <th className="px-4 py-3 font-medium">Parcel</th>
                        <th className="px-4 py-3 font-medium">Jurisdiction</th>
                        <th className="px-4 py-3 font-medium">Email</th>
                        <th className="px-4 py-3 font-medium">Original call</th>
                        <th className="px-4 py-3 text-right font-medium">Alerts</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.clientSites.map((site) => (
                        <tr
                          key={site.id}
                          className={cn(
                            "cursor-pointer border-b last:border-0 transition-colors hover:bg-muted/50",
                            selectedId === site.id && "bg-muted/60",
                          )}
                          onClick={() => setSelectedId(selectedId === site.id ? null : site.id)}
                        >
                          <td className="px-4 py-3">
                            <p className="font-medium leading-snug">{site.clientName}</p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {site.contactName}
                            </p>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">{site.parcelAddress}</td>
                          <td className="px-4 py-3 text-muted-foreground">{site.jurisdiction}</td>
                          <td className="px-4 py-3 text-muted-foreground">{site.email}</td>
                          <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                            {site.originalCallDate}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
                              <Switch
                                checked={site.alertsEnabled}
                                onCheckedChange={(checked) => toggleAlerts(site.id, checked)}
                                aria-label={`Alerts for ${site.clientName}`}
                              />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {selected && (
              <aside className="mt-6 xl:mt-0">
                <Card className="sticky top-24">
                  <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
                    <div>
                      <CardTitle className="text-base leading-snug">
                        {selected.clientName}
                      </CardTitle>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {selected.parcelAddress}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setSelectedId(null)}
                      aria-label="Close details"
                    >
                      <X className="size-4" />
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <div className="rounded-md border p-3">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Original report
                      </p>
                      <p className="mt-1 text-sm">
                        One-page funding action plan · {selected.originalCallDate}
                      </p>
                      <Button variant="outline" size="sm" className="mt-2" asChild>
                        <Link to="/reports">
                          <FileText className="size-3.5" />
                          Open in Reports
                        </Link>
                      </Button>
                    </div>

                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Alerts timeline
                      </p>
                      <ul className="mt-3 space-y-3">
                        {data.alerts
                          .filter((alert) => alert.siteId === selected.id)
                          .map((alert) => (
                            <li key={alert.id} className="relative border-l pl-4">
                              <span className="absolute -left-[5px] top-1.5 size-2.5 rounded-full bg-primary" />
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge
                                  variant="outline"
                                  className={cn("text-xs", alertStatusStyles[alert.status])}
                                >
                                  {alertStatusLabels[alert.status]}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {alert.sentOn ?? alert.createdOn}
                                </span>
                              </div>
                              <p className="mt-1 text-sm leading-snug">{alert.title}</p>
                              <p className="mt-0.5 text-xs text-muted-foreground">
                                {alert.trigger}
                              </p>
                            </li>
                          ))}
                        {data.alerts.filter((alert) => alert.siteId === selected.id).length ===
                          0 && (
                          <li className="rounded-md border border-dashed px-3 py-4 text-sm text-muted-foreground">
                            No updates yet for this parcel.
                          </li>
                        )}
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              </aside>
            )}
          </div>
        </TabsContent>

        <TabsContent value="alerts" className="mt-6 space-y-4">
          <div className="flex items-start gap-3 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3">
            <BellRing className="mt-0.5 size-4 shrink-0 text-warning-foreground" />
            <p className="text-sm text-warning-foreground">
              {drafts.length} drafted alert{drafts.length === 1 ? "" : "s"} waiting on you. Nothing
              is emailed to a client until you press Approve &amp; Send.
            </p>
          </div>

          {drafts.length === 0 && (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                No alerts waiting for approval.
              </CardContent>
            </Card>
          )}

          {drafts.map((alert) => {
            const site = data.clientSites.find((s) => s.id === alert.siteId);
            const isEditing = editingId === alert.id;
            return (
              <Card key={alert.id}>
                <CardHeader className="space-y-0">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-base leading-snug">{alert.title}</CardTitle>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {site?.clientName} · {site?.parcelAddress} · {site?.email}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{alert.trigger}</Badge>
                      <Badge variant="outline" className={alertStatusStyles[alert.status]}>
                        {alertStatusLabels[alert.status]}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {isEditing ? (
                    <Textarea
                      value={draftText}
                      onChange={(e) => setDraftText(e.target.value)}
                      rows={12}
                      className="text-sm"
                    />
                  ) : (
                    <pre className="whitespace-pre-wrap rounded-md border bg-muted/40 p-3 font-sans text-sm leading-relaxed text-foreground/90">
                      {alert.draftEmail}
                    </pre>
                  )}
                  <div className="flex flex-wrap justify-end gap-2">
                    {isEditing ? (
                      <>
                        <Button variant="ghost" onClick={() => setEditingId(null)}>
                          Cancel
                        </Button>
                        <Button
                          onClick={() => {
                            updateAlert(alert.id, { draftEmail: draftText });
                            setEditingId(null);
                            toast.success("Draft saved");
                          }}
                        >
                          Save draft
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button variant="ghost" onClick={() => dismissAlert(alert.id)}>
                          Dismiss
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setEditingId(alert.id);
                            setDraftText(alert.draftEmail);
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          onClick={() => approveAndSend(alert, site)}
                          disabled={!site?.alertsEnabled}
                        >
                          <Mail className="size-4" />
                          Approve &amp; Send
                        </Button>
                      </>
                    )}
                  </div>
                  {!site?.alertsEnabled && (
                    <p className="text-right text-xs text-muted-foreground">
                      Alerts are switched off for this client — turn them on to send.
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>
      </Tabs>
    </div>
  );
}
