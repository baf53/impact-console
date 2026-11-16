import { useState } from "react";
import { UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAssignTranscript } from "@/hooks/use-pipeline";
import { matchClientsByMeetingName } from "@/lib/client-match";
import type { ClientRow, TranscriptRow } from "@/lib/pipeline";
import { CLIENT_STATES, stateLabel } from "@/lib/states";
import { cn } from "@/lib/utils";

type MeetingType = "meeting_1" | "meeting_2" | "ad_hoc";
type ClientState = (typeof CLIENT_STATES)[number];

const EMPTY_CLIENT = { clientName: "", contactName: "", email: "", parcelAddress: "", city: "" };

function clientSummary(c: ClientRow) {
  const place = [c.parcel_address, c.city].filter(Boolean).join(", ");
  return `${c.contact_name || c.client_name} · ${place} (${c.state})`;
}

/**
 * Links a call to a client: a suggestion from the meeting's name, an existing client, or
 * a new one registered on the spot. Shown for calls that arrived without a client, and
 * behind "Change" for calls that already have one.
 */
export function AssignTranscript({
  transcript,
  clients,
  onDone,
}: {
  transcript: TranscriptRow;
  clients: ClientRow[];
  onDone?: () => void;
}) {
  const changing = Boolean(transcript.client_id);
  const assign = useAssignTranscript();
  const [clientId, setClientId] = useState("");
  const [meetingType, setMeetingType] = useState<MeetingType>(
    transcript.meeting_type === "funding_feed" ? "meeting_1" : transcript.meeting_type,
  );
  const [registering, setRegistering] = useState(false);
  const [newClient, setNewClient] = useState(EMPTY_CLIENT);
  const [state, setState] = useState<ClientState>("OK");

  const others = clients.filter((c) => c.id !== transcript.client_id);
  // An unlinked import keeps the meeting's name as its label.
  const suggestions = changing ? [] : matchClientsByMeetingName(transcript.project_label, others);
  const showForm = registering || others.length === 0;
  const canSubmit = showForm
    ? Boolean(newClient.clientName.trim() && newClient.parcelAddress.trim())
    : Boolean(clientId);

  const field = (key: keyof typeof EMPTY_CLIENT) => ({
    value: newClient[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      setNewClient({ ...newClient, [key]: e.target.value }),
    className: "h-8 text-xs",
  });

  const link = (
    target: { clientId: string } | { newClient: typeof newClient & { state: ClientState } },
  ) =>
    assign.mutate(
      { transcriptId: transcript.id, meetingType, ...target },
      { onSuccess: () => onDone?.() },
    );

  return (
    <div
      className={cn(
        "mt-4 space-y-3 border p-3",
        changing ? "bg-muted/30" : "border-warning/40 bg-warning/10",
      )}
    >
      <p className="flex items-start gap-2 text-xs leading-5 text-foreground">
        <UserPlus
          className={cn("mt-0.5 size-3.5 shrink-0", changing ? "text-primary" : "text-warning")}
          aria-hidden="true"
        />
        {changing ? (
          <span>
            <span className="font-medium">Change client.</span> Pick the right client, or register a
            new one.
          </span>
        ) : (
          <span>
            <span className="font-medium">Not linked to a client.</span> This call was imported
            automatically. Link it to a deal so its items reach the right client and state.
          </span>
        )}
      </p>

      {suggestions.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-foreground">
            {suggestions.length === 1
              ? "Possible match from the meeting name"
              : `${suggestions.length} clients match the meeting name. Pick the right one:`}
          </p>
          {suggestions.map((c) => (
            <Button
              key={c.id}
              variant="outline"
              size="sm"
              className="h-auto w-full justify-start whitespace-normal py-1.5 text-left text-xs"
              disabled={assign.isPending}
              onClick={() => link({ clientId: c.id })}
            >
              {clientSummary(c)}
            </Button>
          ))}
        </div>
      )}

      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <Label htmlFor={showForm ? "assign-new-name" : "assign-client"} className="text-xs">
            {showForm ? "New client" : "Client / deal"}
          </Label>
          {others.length > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs text-primary"
              onClick={() => setRegistering(!registering)}
            >
              {registering ? "Choose existing client" : "+ New client"}
            </Button>
          )}
        </div>

        {showForm ? (
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="assign-new-name" className="text-xs text-muted-foreground">
                Client / developer name *
              </Label>
              <Input
                id="assign-new-name"
                placeholder="e.g. Washington Homes LLC"
                {...field("clientName")}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="assign-new-contact" className="text-xs text-muted-foreground">
                Contact person
              </Label>
              <Input
                id="assign-new-contact"
                placeholder="e.g. Robert Washington"
                {...field("contactName")}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="assign-new-email" className="text-xs text-muted-foreground">
                Email
              </Label>
              <Input
                id="assign-new-email"
                type="email"
                placeholder="name@example.org"
                {...field("email")}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="assign-new-parcel" className="text-xs text-muted-foreground">
                Parcel / site address *
              </Label>
              <Input
                id="assign-new-parcel"
                placeholder="e.g. 1200 E Douglas Ave"
                {...field("parcelAddress")}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="assign-new-city" className="text-xs text-muted-foreground">
                City
              </Label>
              <Input id="assign-new-city" placeholder="e.g. Wichita" {...field("city")} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="assign-new-state" className="text-xs text-muted-foreground">
                State *
              </Label>
              <Select value={state} onValueChange={(v) => setState(v as ClientState)}>
                <SelectTrigger id="assign-new-state" className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CLIENT_STATES.map((code) => (
                    <SelectItem key={code} value={code}>
                      {stateLabel(code)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground sm:col-span-2">
              Later Zoom calls whose meeting name includes this contact or client name link to them
              automatically.
            </p>
          </div>
        ) : (
          <Select value={clientId} onValueChange={setClientId}>
            <SelectTrigger id="assign-client" className="h-8 text-xs">
              <SelectValue placeholder="Choose a client…" />
            </SelectTrigger>
            <SelectContent>
              {others.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.client_name} · {c.parcel_address} ({c.state})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="w-40 space-y-1">
          <Label htmlFor="assign-meeting" className="text-xs">
            Meeting stage
          </Label>
          <Select value={meetingType} onValueChange={(v) => setMeetingType(v as MeetingType)}>
            <SelectTrigger id="assign-meeting" className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="meeting_1">Meeting 1</SelectItem>
              <SelectItem value="meeting_2">Meeting 2</SelectItem>
              <SelectItem value="ad_hoc">Ad hoc call</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          {changing && onDone && (
            <Button size="sm" variant="ghost" disabled={assign.isPending} onClick={onDone}>
              Cancel
            </Button>
          )}
          <Button
            size="sm"
            disabled={!canSubmit || assign.isPending}
            onClick={() =>
              showForm ? link({ newClient: { ...newClient, state } }) : link({ clientId })
            }
          >
            {assign.isPending
              ? "Saving…"
              : showForm
                ? "Create client & link"
                : changing
                  ? "Move call"
                  : "Assign"}
          </Button>
        </div>
      </div>
    </div>
  );
}
