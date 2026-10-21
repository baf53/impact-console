import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  ExternalLink,
  FileText,
  Globe,
  Loader2,
  MessageSquare,
  MessageSquareQuote,
  Save,
  Sparkles,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useChatbotView, useLogAnswer, usePreviewAnswer } from "@/hooks/use-answers";
import { useIntegrationStatus } from "@/hooks/use-pipeline";
import { CLIENT_STATES, stateLabel } from "@/lib/states";
import { cn } from "@/lib/utils";

const LIVE_SITE = "https://ourcollectiveimpact.com/";

export const Route = createFileRoute("/assistant-map")({
  head: () => ({
    meta: [
      { title: "Assistant & Map — Collective Impact" },
      {
        name: "description",
        content:
          "The live map and chatbot, what the chatbot can read for each state, and answer previews.",
      },
      { property: "og:title", content: "Assistant & Map — Collective Impact" },
      {
        property: "og:description",
        content:
          "The live map and chatbot, what the chatbot can read for each state, and answer previews.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AssistantMapPage,
});

type VisitorState = (typeof CLIENT_STATES)[number];

const coverageStyles = {
  full: "border-primary/40 text-primary",
  partial: "border-warning/50 text-warning-foreground",
  none: "border-destructive/50 text-destructive",
};

function AssistantMapPage() {
  const [state, setState] = useState<VisitorState>("OK");
  const [question, setQuestion] = useState("");
  const view = useChatbotView(state);
  const preview = usePreviewAnswer();
  const logAnswer = useLogAnswer();
  const { data: integration } = useIntegrationStatus();
  const programs = view.data ?? [];
  const answer = preview.data;
  const askedQuestion = preview.variables?.question ?? "";

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col">
      <div className="border-b px-6 py-4">
        <h1 className="text-lg font-semibold tracking-tight">Assistant & Map</h1>
        <p className="text-sm text-muted-foreground">
          The live map and chatbot run on ourcollectiveimpact.com. Here you can see exactly what the
          chatbot can read for each state, and preview how it should answer.
        </p>
      </div>

      <div className="grid flex-1 lg:grid-cols-[minmax(0,1.4fr)_minmax(340px,1fr)]">
        <section className="flex min-h-[28rem] flex-col border-b lg:border-b-0 lg:border-r">
          <div className="flex items-center justify-between gap-3 border-b px-4 py-2.5">
            <span className="flex items-center gap-2 text-sm font-medium">
              <Globe className="size-4 text-primary" aria-hidden="true" /> Live site
            </span>
            <Button variant="outline" size="sm" asChild>
              <a href={LIVE_SITE} target="_blank" rel="noreferrer">
                <ExternalLink /> Open in new tab
              </a>
            </Button>
          </div>
          <iframe
            src={LIVE_SITE}
            title="ourcollectiveimpact.com — live map and chatbot"
            className="min-h-[28rem] w-full flex-1 bg-muted"
            loading="lazy"
          />
        </section>

        <section className="flex flex-col bg-card">
          <div className="flex items-center justify-between gap-3 border-b px-4 py-2.5">
            <span className="flex items-center gap-2 text-sm font-medium">
              <MessageSquare className="size-4 text-primary" aria-hidden="true" /> Chatbot view
            </span>
            <Select value={state} onValueChange={(v) => setState(v as VisitorState)}>
              <SelectTrigger className="h-8 w-[170px] text-xs" aria-label="Visitor state">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CLIENT_STATES.map((code) => (
                  <SelectItem key={code} value={code}>
                    Visitor in {stateLabel(code)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1 space-y-6 overflow-y-auto p-4">
            <form
              className="space-y-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (question.trim().length >= 3)
                  preview.mutate({ question: question.trim(), state });
              }}
            >
              <Label htmlFor="preview-question" className="text-xs">
                Preview an answer
              </Label>
              <Textarea
                id="preview-question"
                rows={3}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder={`e.g. What funding can I use to build affordable rental housing in ${stateLabel(state)}?`}
                className="text-sm"
              />
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">
                  {integration?.gemini
                    ? "Answers only from the knowledge below, with citations."
                    : "Needs the Gemini API key."}
                </p>
                <Button
                  type="submit"
                  size="sm"
                  disabled={!integration?.gemini || preview.isPending || question.trim().length < 3}
                >
                  {preview.isPending ? <Loader2 className="animate-spin" /> : <Sparkles />}
                  Ask
                </Button>
              </div>
            </form>

            {answer && (
              <div className="space-y-3">
                <div className="flex justify-end">
                  <p className="max-w-[90%] rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-sm text-primary-foreground">
                    {askedQuestion}
                  </p>
                </div>
                <div className="rounded-2xl rounded-bl-md border bg-muted/40 px-4 py-3 text-sm leading-relaxed">
                  <p className="whitespace-pre-line">{answer.answer}</p>
                  {answer.citations.length > 0 && (
                    <ol className="mt-3 space-y-1 border-t pt-2">
                      {answer.citations.map((c) => (
                        <li key={c.n} className="text-xs text-muted-foreground">
                          [{c.n}] {c.title}
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
                <div className="flex items-center justify-between gap-2">
                  <Badge
                    variant="outline"
                    className={cn("capitalize", coverageStyles[answer.coverage])}
                  >
                    Coverage: {answer.coverage}
                  </Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={logAnswer.isPending || !integration?.step3Migration}
                    onClick={() =>
                      logAnswer.mutate({
                        question: askedQuestion,
                        answer: answer.answer,
                        state,
                        citations: answer.citations.map((c) => ({ n: c.n, title: c.title })),
                        source: "preview",
                      })
                    }
                  >
                    <Save /> Log this answer
                  </Button>
                </div>
              </div>
            )}

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                What the chatbot can read for {stateLabel(state)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {state} and Federal programs, program-level notes, and approved documents.
              </p>
              {view.isLoading && <p className="mt-3 text-sm text-muted-foreground">Loading…</p>}
              {view.isError && (
                <p className="mt-3 text-sm text-destructive">{(view.error as Error).message}</p>
              )}
              {!view.isLoading && programs.length === 0 && !view.isError && (
                <div className="mt-3 flex items-start gap-2 border border-dashed p-3 text-sm text-muted-foreground">
                  <AlertTriangle
                    className="mt-0.5 size-4 shrink-0 text-warning"
                    aria-hidden="true"
                  />
                  Nothing yet — the chatbot has no {state} or Federal programs to answer from. Add
                  programs in the Knowledge Base.
                </div>
              )}
              <ul className="mt-3 divide-y border">
                {programs.map((p) => (
                  <li key={p.id} className="px-3 py-2.5">
                    <Link
                      to="/knowledge-base/$programId"
                      params={{ programId: p.id }}
                      className="text-sm font-medium text-foreground hover:underline"
                    >
                      {p.name}
                    </Link>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span>
                        {p.level} · {p.state}
                      </span>
                      <span className="flex items-center gap-1 tabular-nums">
                        <MessageSquareQuote className="size-3" aria-hidden="true" />{" "}
                        {p.notes.length} notes
                      </span>
                      <span className="flex items-center gap-1 tabular-nums">
                        <FileText className="size-3" aria-hidden="true" />{" "}
                        {p.documents.length + p.attachments.length} docs
                      </span>
                      {p.coverage < 25 && (
                        <span className="text-warning-foreground">
                          Thin — answers will be cautious
                        </span>
                      )}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
