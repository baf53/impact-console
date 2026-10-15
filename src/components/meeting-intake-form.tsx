import { useState } from "react";
import { Sparkles, X } from "lucide-react";
import { toast } from "sonner";

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
import { Textarea } from "@/components/ui/textarea";
import {
  useClients,
  useIngestTranscript,
  useIntegrationStatus,
  useRunExtraction,
} from "@/hooks/use-pipeline";
import { CLIENT_STATES, stateLabel } from "@/lib/states";

type ClientState = (typeof CLIENT_STATES)[number];

export function MeetingIntakeForm({ onClose }: { onClose: () => void }) {
  const { data: clients = [], isLoading: clientsLoading } = useClients();
  const { data: status } = useIntegrationStatus();
  const ingest = useIngestTranscript();
  const runExtraction = useRunExtraction();

  const [selectedClientId, setSelectedClientId] = useState("");
  const [isNewClient, setIsNewClient] = useState(false);

  // New client fields
  const [clientName, setClientName] = useState("");
  const [contactName, setContactName] = useState("");
  const [parcelAddress, setParcelAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState<ClientState>("OK");

  // Meeting details
  const [meetingType, setMeetingType] = useState<"meeting_1" | "meeting_2">("meeting_1");
  const [source, setSource] = useState<"Granola" | "Zoom">("Granola");
  const [rawText, setRawText] = useState("");

  const aiReady = status?.gemini ?? false;
  const registeringClient = isNewClient || clients.length === 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawText.trim()) {
      toast.error("Paste the call transcript first.");
      return;
    }
    if (registeringClient && (!clientName.trim() || !parcelAddress.trim())) {
      toast.error("Provide at least a client name and parcel address.");
      return;
    }
    if (!registeringClient && !selectedClientId) {
      toast.error("Choose a client, or register a new one.");
      return;
    }

    ingest.mutate(
      {
        ...(registeringClient
          ? { newClient: { clientName, contactName, parcelAddress, city, state } }
          : { clientId: selectedClientId }),
        meetingType,
        source,
        rawText,
      },
      {
        onSuccess: (transcript) => {
          onClose();
          if (aiReady) runExtraction.mutate(transcript.id);
          else
            toast.info("AI extraction is waiting for the Gemini API key", {
              description: "Run it from the card once the key is added.",
            });
        },
      },
    );
  };

  return (
    <Card className="border-primary/30 shadow-lg">
      <CardHeader className="flex-row items-start justify-between space-y-0 border-b pb-4">
        <div>
          <CardTitle className="text-base font-semibold">Ingest meeting transcript</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            Paste the raw call notes from Granola or Zoom. AI sorts them into the 5 canonical
            buckets for your review.
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close intake form">
          <X className="size-4" />
        </Button>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="grid gap-5 p-5 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="t-source">Transcription source</Label>
            <Select value={source} onValueChange={(v) => setSource(v as "Granola" | "Zoom")}>
              <SelectTrigger id="t-source">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Granola">Granola</SelectItem>
                <SelectItem value="Zoom">Zoom AI Companion</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="t-meeting-type">Meeting stage</Label>
            <Select
              value={meetingType}
              onValueChange={(v) => setMeetingType(v as "meeting_1" | "meeting_2")}
            >
              <SelectTrigger id="t-meeting-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="meeting_1">Meeting 1 — Discovery call</SelectItem>
                <SelectItem value="meeting_2">Meeting 2 — Deep dive & program match</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5 border-t pt-3 md:col-span-2">
            <div className="flex items-center justify-between">
              <Label htmlFor={registeringClient ? "nc-name" : "t-client"}>Client / deal</Label>
              {clients.length > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-primary"
                  onClick={() => setIsNewClient(!isNewClient)}
                >
                  {isNewClient ? "Select existing client" : "+ Register new client"}
                </Button>
              )}
            </div>

            {!registeringClient ? (
              <Select
                value={selectedClientId}
                onValueChange={setSelectedClientId}
                disabled={clientsLoading}
              >
                <SelectTrigger id="t-client">
                  <SelectValue
                    placeholder={clientsLoading ? "Loading clients…" : "Choose client / parcel…"}
                  />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.client_name} · {c.parcel_address} ({c.state})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="grid gap-3 rounded-md border border-primary/20 bg-muted/20 p-3 md:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="nc-name" className="text-xs">
                    Client / developer name *
                  </Label>
                  <Input
                    id="nc-name"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="e.g. Tulsa Housing Foundation"
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="nc-contact" className="text-xs">
                    Contact person
                  </Label>
                  <Input
                    id="nc-contact"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="e.g. Sarah Jenkins"
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="nc-parcel" className="text-xs">
                    Parcel / site address *
                  </Label>
                  <Input
                    id="nc-parcel"
                    value={parcelAddress}
                    onChange={(e) => setParcelAddress(e.target.value)}
                    placeholder="e.g. 420 E Archer St"
                    className="h-8 text-xs"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label htmlFor="nc-city" className="text-xs">
                      City
                    </Label>
                    <Input
                      id="nc-city"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="Tulsa"
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="nc-state" className="text-xs">
                      State *
                    </Label>
                    <Select value={state} onValueChange={(v) => setState(v as ClientState)}>
                      <SelectTrigger id="nc-state" className="h-8 text-xs">
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
                </div>
              </div>
            )}
          </div>

          <div className="space-y-1.5 md:col-span-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="t-raw">Call transcript</Label>
              <span className="text-xs text-muted-foreground">
                Raw transcript text from Granola or Zoom
              </span>
            </div>
            <Textarea
              id="t-raw"
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              rows={9}
              placeholder={`Example excerpt:\n\n[00:03] Marcus: Thanks for jumping on. We're looking at a 20-unit development on our vacant lot in Bartlesville.\n[00:08] Collective Impact: Have you already engaged OHFA or checked CDBG Small Cities?\n[00:15] Marcus: Not yet — our biggest hurdle is a $400k mezzanine gap and getting our Phase 1 ESA done…`}
              className="font-mono text-xs leading-relaxed"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4 md:col-span-2">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Sparkles className="size-3.5 text-primary" aria-hidden="true" />
              <span>
                {aiReady
                  ? "AI extraction runs automatically after saving."
                  : "Saved to Intake now — AI extraction runs once the Gemini key is added."}
              </span>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={onClose} disabled={ingest.isPending}>
                Cancel
              </Button>
              <Button type="submit" disabled={ingest.isPending || !rawText.trim()}>
                {ingest.isPending
                  ? "Saving…"
                  : aiReady
                    ? "Ingest & run AI extraction"
                    : "Ingest transcript"}
              </Button>
            </div>
          </div>
        </CardContent>
      </form>
    </Card>
  );
}
