import { useState } from "react";
import { UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAssignTranscript } from "@/hooks/use-pipeline";
import type { ClientRow, TranscriptRow } from "@/lib/pipeline";

type MeetingType = "meeting_1" | "meeting_2" | "ad_hoc";

/** Shown for transcripts that arrived automatically without a matching client. */
export function AssignTranscript({
  transcript,
  clients,
}: {
  transcript: TranscriptRow;
  clients: ClientRow[];
}) {
  const assign = useAssignTranscript();
  const [clientId, setClientId] = useState("");
  const [meetingType, setMeetingType] = useState<MeetingType>(
    transcript.meeting_type === "funding_feed" ? "meeting_1" : transcript.meeting_type,
  );

  return (
    <div className="mt-4 space-y-3 border border-warning/40 bg-warning/10 p-3">
      <p className="flex items-start gap-2 text-xs leading-5 text-foreground">
        <UserPlus className="mt-0.5 size-3.5 shrink-0 text-warning" aria-hidden="true" />
        <span>
          <span className="font-medium">Not linked to a client.</span> This call was imported
          automatically. Link it to a deal so its items reach the right client and state.
        </span>
      </p>
      <div className="grid gap-2 sm:grid-cols-[1fr_150px]">
        <div className="space-y-1">
          <Label htmlFor="assign-client" className="text-xs">
            Client / deal
          </Label>
          <Select value={clientId} onValueChange={setClientId}>
            <SelectTrigger id="assign-client" className="h-8 text-xs">
              <SelectValue placeholder={clients.length ? "Choose a client…" : "No clients yet"} />
            </SelectTrigger>
            <SelectContent>
              {clients.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.client_name} · {c.parcel_address} ({c.state})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
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
      </div>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          New client? Register them with “Ingest meeting transcript” first.
        </p>
        <Button
          size="sm"
          disabled={!clientId || assign.isPending}
          onClick={() => assign.mutate({ transcriptId: transcript.id, clientId, meetingType })}
        >
          {assign.isPending ? "Assigning…" : "Assign"}
        </Button>
      </div>
    </div>
  );
}
