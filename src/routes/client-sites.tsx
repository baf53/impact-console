import { useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { BellRing, FileText, Mail, Plus, ShieldCheck, Trash2, Undo2, X } from "lucide-react";

import { DealChecklist } from "@/components/deal-checklist";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ALERT_TRIGGERS, DEAL_STAGES, type AlertRow, type ClientRow } from "@/functions/deals";
import {
  useCreateAlert,
  useDeals,
  useDeleteAlert,
  useDeleteClient,
  useGenerateReport,
  useUpdateAlert,
  useSendAlert,
  useUpdateClient,
} from "@/hooks/use-deals";
import { useIntegrationStatus } from "@/hooks/use-pipeline";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/client-sites")({
  validateSearch: (search: Record<string, unknown>): { client?: string } =>
    typeof search["client"] === "string" ? { client: search["client"] } : {},
  head: () => ({
    meta: [
      { title: "Client Sites & Alerts — Collective Impact" },
      {
        name: "description",
        content:
          "Client deals by parcel, deal stages, missing documents, and an approval-gated alert queue.",
      },
      { property: "og:title", content: "Client Sites & Alerts — Collective Impact" },
      {
        property: "og:description",
        content:
          "Client deals by parcel, deal stages, missing documents, and an approval-gated alert queue.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ClientSitesPage,
});

type DealStage = (typeof DEAL_STAGES)[number];
type AlertTrigger = (typeof ALERT_TRIGGERS)[number];

const STAGE_LABELS: Record<DealStage, string> = {
  meeting_1: "Meeting 1",
  meeting_2: "Meeting 2",
  demo_prep: "Demo prep",
  proposal: "Proposal",
  contract: "Contract",
  active: "Active",
};

const alertStatusStyles: Record<AlertRow["status"], string> = {
  draft: "bg-warning/15 text-warning-foreground border-warning/30",
  approved: "bg-info/15 text-info-foreground border-info/30",
  sent: "bg-primary/10 text-primary border-primary/30",
};

const alertStatusLabels: Record<AlertRow["status"], string> = {
  draft: "Draft",
  approved: "Approved — not sent",
  sent: "Sent",
};

function mailtoLink(client: ClientRow | undefined, alert: AlertRow) {
  const params = new URLSearchParams({ subject: alert.title, body: alert.draft_email });
  const to = encodeURIComponent(client?.email ?? "").replace(/%40/g, "@");
  return `mailto:${to}?${params.toString().replace(/\+/g, "%20")}`;
}

function StageSelect({ client }: { client: ClientRow }) {
  const updateClient = useUpdateClient();
  return (
    <Select
      value={client.deal_stage}
      onValueChange={(value) =>
        updateClient.mutate({ id: client.id, dealStage: value as DealStage })
      }
      disabled={updateClient.isPending}
    >
      <SelectTrigger
        className="h-8 w-[130px] text-xs"
        aria-label={`Deal stage for ${client.client_name}`}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {DEAL_STAGES.map((stage) => (
          <SelectItem key={stage} value={stage}>
            {STAGE_LABELS[stage]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function DraftAlertForm({ client, onClose }: { client: ClientRow; onClose: () => void }) {
  const createAlert = useCreateAlert();
  const [title, setTitle] = useState("");
  const [trigger, setTrigger] = useState<AlertTrigger>("New program");
  const [body, setBody] = useState(
    `Hi ${client.contact_name || client.client_name},\n\n\n\n— Collective Impact`,
  );

  return (
    <div className="space-y-3 rounded-md border border-primary/20 bg-muted/20 p-3">
      <div className="space-y-1">
        <Label htmlFor="alert-title" className="text-xs">
          Subject
        </Label>
        <Input
          id="alert-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="h-8 text-sm"
          placeholder="New program loaded: …"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="alert-trigger" className="text-xs">
          Trigger
        </Label>
        <Select value={trigger} onValueChange={(v) => setTrigger(v as AlertTrigger)}>
          <SelectTrigger id="alert-trigger" className="h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ALERT_TRIGGERS.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="alert-body" className="text-xs">
          Email
        </Label>
        <Textarea
          id="alert-body"
          rows={7}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="text-sm"
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onClose}>
          Cancel
        </Button>
        <Button
          size="sm"
          disabled={!title.trim() || !body.trim() || createAlert.isPending}
          onClick={() =>
            createAlert.mutate(
              { clientId: client.id, title, trigger, draftEmail: body },
              { onSuccess: onClose },
            )
          }
        >
          Save draft
        </Button>
      </div>
    </div>
  );
}

function ClientSitesPage() {
  const { data, isLoading, isError, error, refetch } = useDeals();
  const clients = data?.clients ?? [];
  const alerts = data?.alerts ?? [];
  const reports = data?.reports ?? [];
  const updateClient = useUpdateClient();
  const updateAlert = useUpdateAlert();
  const deleteAlert = useDeleteAlert();
  const sendAlert = useSendAlert();
  const deleteClient = useDeleteClient();
  const { data: integration } = useIntegrationStatus();
  const generateReport = useGenerateReport();

  const { client: linkedClient } = Route.useSearch();
  const [selectedId, setSelectedId] = useState<string | null>(linkedClient ?? null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftText, setDraftText] = useState("");
  const [drafting, setDrafting] = useState(false);

  const selected = clients.find((c) => c.id === selectedId) ?? null;
  const queue = alerts.filter((a) => a.status !== "sent");
  const pendingCount = queue.filter((a) => a.status === "draft").length;

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-start gap-3 rounded-lg border border-primary/25 bg-primary/5 px-4 py-3">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
        <p className="text-sm text-foreground/85">
          Every client deal is a standing subscriber for its parcel. No alert reaches a client inbox
          until you approve it and send it from your own email.
        </p>
      </div>

      {isError && (
        <div className="flex flex-wrap items-center justify-between gap-3 border border-destructive/40 bg-destructive/5 px-4 py-3 text-xs text-foreground">
          <span>{(error as Error).message}</span>
          <Button size="sm" variant="outline" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      )}

      <Tabs defaultValue="sites">
        <TabsList>
          <TabsTrigger value="sites">Client Sites</TabsTrigger>
          <TabsTrigger value="alerts">
            Alerts queue
            {pendingCount > 0 && (
              <span className="ml-2 rounded-full bg-warning/20 px-1.5 text-xs text-warning-foreground">
                {pendingCount}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sites" className="mt-6">
          <div
            className={cn("gap-6", selected ? "grid xl:grid-cols-[minmax(0,1fr)_380px]" : "block")}
          >
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Client deals</CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">
                  {clients.filter((c) => c.alerts_enabled).length} of {clients.length} receiving
                  alerts · new clients are registered from the Pipeline intake form
                </p>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                        <th className="px-4 py-3 font-medium">Client</th>
                        <th className="px-4 py-3 font-medium">Parcel</th>
                        <th className="px-4 py-3 font-medium">Stage</th>
                        <th className="px-4 py-3 font-medium">Email</th>
                        <th className="px-4 py-3 text-right font-medium">Alerts</th>
                      </tr>
                    </thead>
                    <tbody>
                      {clients.map((client) => (
                        <tr
                          key={client.id}
                          className={cn(
                            "cursor-pointer border-b transition-colors last:border-0 hover:bg-muted/50",
                            selectedId === client.id && "bg-muted/60",
                          )}
                          onClick={() => {
                            setSelectedId(selectedId === client.id ? null : client.id);
                            setDrafting(false);
                          }}
                        >
                          <td className="px-4 py-3">
                            <p className="font-medium leading-snug">{client.client_name}</p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {client.contact_name ?? "—"}
                            </p>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {client.parcel_address}
                            <span className="block text-xs">
                              {[client.city, client.state].filter(Boolean).join(", ")}
                            </span>
                          </td>
                          <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                            <StageSelect client={client} />
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">{client.email ?? "—"}</td>
                          <td className="px-4 py-3">
                            <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
                              <Switch
                                checked={client.alerts_enabled}
                                disabled={updateClient.isPending}
                                onCheckedChange={(checked) =>
                                  updateClient.mutate({ id: client.id, alertsEnabled: checked })
                                }
                                aria-label={`Alerts for ${client.client_name}`}
                              />
                            </div>
                          </td>
                        </tr>
                      ))}
                      {clients.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                            {isLoading ? "Loading clients…" : "No client deals yet."}
                          </td>
                        </tr>
                      )}
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
                        {selected.client_name}
                      </CardTitle>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {selected.parcel_address}, {selected.city}, {selected.state} ·{" "}
                        {STAGE_LABELS[selected.deal_stage]}
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
                  <CardContent className="space-y-6">
                    <div className="rounded-md border p-3">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Reports
                      </p>
                      <ul className="mt-2 space-y-1.5">
                        {reports
                          .filter((r) => r.client_id === selected.id)
                          .map((r) => (
                            <li key={r.id}>
                              <Link
                                to="/reports"
                                search={{ report: r.id }}
                                className="flex items-center gap-1.5 text-sm text-primary hover:underline"
                              >
                                <FileText className="size-3.5" aria-hidden="true" />
                                {r.title}
                                <span className="text-xs text-muted-foreground">
                                  ·{" "}
                                  {new Date(r.created_at).toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                  })}
                                </span>
                              </Link>
                            </li>
                          ))}
                      </ul>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-3"
                        disabled={generateReport.isPending}
                        onClick={() => generateReport.mutate(selected.id)}
                      >
                        <FileText className="size-3.5" />
                        {generateReport.isPending ? "Generating…" : "Generate proposal"}
                      </Button>
                    </div>

                    <div>
                      <DealChecklist client={selected} />
                    </div>

                    <div>
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Alerts timeline
                        </p>
                        {!drafting && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-primary"
                            onClick={() => setDrafting(true)}
                          >
                            <Plus className="size-3.5" /> Draft alert
                          </Button>
                        )}
                      </div>
                      {drafting && (
                        <div className="mt-3">
                          <DraftAlertForm client={selected} onClose={() => setDrafting(false)} />
                        </div>
                      )}
                      <ul className="mt-3 space-y-3">
                        {alerts
                          .filter((alert) => alert.client_id === selected.id)
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
                                  {alert.sent_on ?? alert.created_on}
                                </span>
                              </div>
                              <p className="mt-1 text-sm leading-snug">{alert.title}</p>
                              <p className="mt-0.5 text-xs text-muted-foreground">
                                {alert.trigger}
                              </p>
                            </li>
                          ))}
                        {alerts.filter((alert) => alert.client_id === selected.id).length === 0 &&
                          !drafting && (
                            <li className="rounded-md border border-dashed px-3 py-4 text-sm text-muted-foreground">
                              No alerts yet for this parcel.
                            </li>
                          )}
                      </ul>
                    </div>

                    <div className="border-t pt-4">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive"
                            disabled={deleteClient.isPending}
                          >
                            <Trash2 /> Delete client
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete “{selected.client_name}”?</AlertDialogTitle>
                            <AlertDialogDescription>
                              The client, their reports and alerts are deleted. Their call
                              transcripts stay in the Pipeline, unassigned, so call records are kept
                              — delete them there if they're test data. Knowledge Base programs are
                              not affected. This can't be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() =>
                                deleteClient.mutate(selected.id, {
                                  onSuccess: () => setSelectedId(null),
                                })
                              }
                            >
                              Delete client
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
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
              {pendingCount} draft{pendingCount === 1 ? "" : "s"} waiting on you.{" "}
              {integration?.email
                ? "Approved alerts are emailed to the client when you press Send."
                : "Approved alerts open in your email client — send them from there, then mark them as sent."}
            </p>
          </div>

          {queue.length === 0 && (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                No alerts waiting. Adding a program to the Knowledge Base drafts alerts for
                subscribed clients in its state.
              </CardContent>
            </Card>
          )}

          {queue.map((alert) => {
            const client = clients.find((c) => c.id === alert.client_id);
            const isEditing = editingId === alert.id;
            return (
              <Card key={alert.id}>
                <CardHeader className="space-y-0">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-base leading-snug">{alert.title}</CardTitle>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {client?.client_name} · {client?.parcel_address} ·{" "}
                        {client?.email ?? "no email on file"}
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
                      {alert.draft_email}
                    </pre>
                  )}
                  <div className="flex flex-wrap justify-end gap-2">
                    {isEditing ? (
                      <>
                        <Button variant="ghost" onClick={() => setEditingId(null)}>
                          Cancel
                        </Button>
                        <Button
                          disabled={!draftText.trim()}
                          onClick={() =>
                            updateAlert.mutate(
                              { id: alert.id, draftEmail: draftText },
                              { onSuccess: () => setEditingId(null) },
                            )
                          }
                        >
                          Save draft
                        </Button>
                      </>
                    ) : alert.status === "draft" ? (
                      <>
                        <Button variant="ghost" onClick={() => deleteAlert.mutate(alert.id)}>
                          Dismiss
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setEditingId(alert.id);
                            setDraftText(alert.draft_email);
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          onClick={() => updateAlert.mutate({ id: alert.id, status: "approved" })}
                          disabled={!client?.alerts_enabled}
                        >
                          Approve
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          variant="ghost"
                          onClick={() => updateAlert.mutate({ id: alert.id, status: "draft" })}
                        >
                          <Undo2 className="size-4" /> Back to draft
                        </Button>
                        {integration?.email ? (
                          <Button
                            disabled={!client?.email || sendAlert.isPending}
                            onClick={() => sendAlert.mutate(alert.id)}
                          >
                            <Mail className="size-4" />
                            {sendAlert.isPending ? "Sending…" : "Send email"}
                          </Button>
                        ) : (
                          <>
                            <Button variant="outline" asChild disabled={!client?.email}>
                              <a href={mailtoLink(client, alert)}>
                                <Mail className="size-4" /> Open in email
                              </a>
                            </Button>
                            <Button
                              onClick={() => updateAlert.mutate({ id: alert.id, status: "sent" })}
                            >
                              Mark as sent
                            </Button>
                          </>
                        )}
                      </>
                    )}
                  </div>
                  {!client?.alerts_enabled && alert.status === "draft" && (
                    <p className="text-right text-xs text-muted-foreground">
                      Alerts are switched off for this client — turn them on to approve.
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
