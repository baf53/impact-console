import { createFileRoute, Link } from "@tanstack/react-router";
import { Info, MessageSquare, Save } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CitationText } from "@/components/citation";
import { useConsoleData, type AssistantAnswer } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import geospatialMvpAsset from "@/assets/geospatial-mvp.png.asset.json";

export const Route = createFileRoute("/assistant-map")({
  head: () => ({
    meta: [
      { title: "Assistant & Map — Collective Impact" },
      { name: "description", content: "Preview of the integrated map-based assistant experience." },
      { property: "og:title", content: "Assistant & Map — Collective Impact" },
      { property: "og:description", content: "Preview of the integrated map-based assistant experience." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AssistantMapPage,
});

function AssistantMapPage() {
  const data = useConsoleData();
  const answer = data.answerLog[0];

  return (
    <div className="flex h-full min-h-[calc(100vh-4rem)] flex-col">
      <div className="border-b bg-info/10 px-6 py-3">
        <div className="flex items-center gap-3 text-sm text-info-foreground">
          <Info className="h-4 w-4 shrink-0" />
          <p>
            This screen shows where the existing map + assistant connect to this pipeline. It is not
            rebuilt here.
          </p>
        </div>
      </div>

      <div className="grid flex-1 gap-0 lg:grid-cols-3">
        <section className="relative col-span-2 flex min-h-[24rem] flex-col border-b lg:border-b-0 lg:border-r">
          <div className="flex items-center justify-between border-b px-6 py-4">
            <div>
              <h1 className="text-lg font-semibold tracking-tight">Assistant & Map</h1>
              <p className="text-sm text-muted-foreground">Connected parcel and preview answer</p>
            </div>
            <Badge variant="secondary" className="gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Assistant online
            </Badge>
          </div>

          <div className="relative flex-1 overflow-hidden bg-muted">
            <img
              src={geospatialMvpAsset.url}
              alt="Geospatial MVP map showing Bartlesville project pins"
              className="h-full w-full object-cover object-center"
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/20 to-transparent" />

            <div className="absolute left-4 top-4 z-10 hidden sm:block">
              <p className="rounded-md bg-black/60 px-2.5 py-1.5 text-xs font-medium text-white shadow-sm backdrop-blur">
                Geospatial MVP — Bartlesville, OK
              </p>
            </div>
          </div>
        </section>

        <section className="col-span-1 flex min-h-[24rem] flex-col bg-card">
          <div className="border-b px-4 py-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <MessageSquare className="h-4 w-4 text-primary" />
              Assistant preview
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {answer ? <AssistantThread answer={answer} /> : <EmptyThread />}
          </div>
        </section>
      </div>
    </div>
  );
}

function AssistantThread({ answer }: { answer: AssistantAnswer }) {
  return (
    <div className="space-y-4">
      {answer.messages.map((message, idx) => (
        <div
          key={idx}
          className={cn(
            "flex",
            message.role === "user" ? "justify-end" : "justify-start",
          )}
        >
          <div
            className={cn(
              "max-w-[90%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
              message.role === "user"
                ? "bg-primary text-primary-foreground rounded-br-md"
                : "rounded-bl-md border bg-muted/50",
            )}
          >
            {message.role === "assistant" && message.citations ? (
              <CitationText text={message.text} citations={message.citations} />
            ) : (
              <p>{message.text}</p>
            )}
          </div>
        </div>
      ))}

      <div className="flex items-center justify-between rounded-lg border bg-card p-3">
        <Badge variant="outline" className="font-medium">
          Coverage: {answer.coverage}
        </Badge>
        <Button asChild size="sm" className="gap-1.5">
          <Link to="/answer-log">
            <Save className="h-4 w-4" />
            Log this answer
          </Link>
        </Button>
      </div>
    </div>
  );
}

function EmptyThread() {
  return (
    <div className="flex h-48 flex-col items-center justify-center rounded-lg border border-dashed text-center text-sm text-muted-foreground">
      <MessageSquare className="h-8 w-8 opacity-40" />
      <p className="mt-2">No assistant preview loaded.</p>
    </div>
  );
}
