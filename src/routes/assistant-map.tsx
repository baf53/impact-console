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

          <div className="relative flex flex-1 items-center justify-center bg-muted/40 p-6">
            <div className="absolute inset-0 grid opacity-[0.08] dark:opacity-[0.05]">
              <svg className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />
              </svg>
            </div>

            <div className="relative z-10 w-full max-w-xl">
              <div className="relative overflow-hidden rounded-xl border bg-card shadow-sm">
                <div className="h-64 bg-gradient-to-br from-muted to-muted/60">
                  <div className="flex h-full items-center justify-center">
                    <div className="text-center text-muted-foreground">
                      <MapPin className="mx-auto h-10 w-10" />
                      <p className="mt-2 text-sm font-medium">Geospatial map — existing MVP plugs in here</p>
                    </div>
                  </div>
                </div>

                <div className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold">316 S Morton Ave</p>
                      <p className="text-sm text-muted-foreground">Bartlesville, OK 74003</p>
                    </div>
                    <Badge variant="outline">Vacant lot</Badge>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-md bg-muted/60 px-3 py-2">
                      <p className="text-xs text-muted-foreground">Use</p>
                      <p className="font-medium">Rental housing</p>
                    </div>
                    <div className="rounded-md bg-muted/60 px-3 py-2">
                      <p className="text-xs text-muted-foreground">Programs loaded</p>
                      <p className="font-medium">4</p>
                    </div>
                  </div>
                </div>
              </div>
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
