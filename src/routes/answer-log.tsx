import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  CheckCircle2,
  CircleSlash,
  FileSearch,
  Star,
  Target,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  consoleStore,
  useConsoleData,
  type AnswerRating,
  type AssistantAnswer,
  type FailureCause,
} from "@/lib/mock-data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CitationMarker, CitationText, stripCitations } from "@/components/citation";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/answer-log")({
  head: () => ({
    meta: [
      { title: "Answer Log — Collective Impact" },
      {
        name: "description",
        content:
          "Review logged assistant answers, diagnose retrieval failures, and maintain the golden set.",
      },
      { property: "og:title", content: "Answer Log — Collective Impact" },
      {
        property: "og:description",
        content:
          "Review logged assistant answers, diagnose retrieval failures, and maintain the golden set.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AnswerLogPage,
});

const ratingLabels: Record<AnswerRating, string> = {
  good: "Good",
  "needs-work": "Needs work",
  wrong: "Wrong",
};

const failureLabels: Record<FailureCause, string> = {
  retrieval: "Retrieval — right doc existed but wasn't found",
  prompt: "Prompt — right doc found, answer still wrong",
  "not-loaded": "Not loaded — doc missing from corpus",
};

const failureShort: Record<FailureCause, string> = {
  retrieval: "Retrieval",
  prompt: "Prompt",
  "not-loaded": "Not loaded",
};

function coverageClass(coverage: AssistantAnswer["coverage"]) {
  if (coverage === "full") return "border-primary/40 text-primary";
  if (coverage === "partial") return "border-warning/50 text-warning";
  return "border-destructive/50 text-destructive";
}

function ratingClass(rating?: AnswerRating) {
  if (rating === "good") return "border-primary/40 text-primary";
  if (rating === "needs-work") return "border-warning/50 text-warning";
  if (rating === "wrong") return "border-destructive/50 text-destructive";
  return "text-muted-foreground";
}

function answerText(answer: AssistantAnswer) {
  return answer.messages.find((m) => m.role === "assistant")?.text ?? "";
}

function answerCitations(answer: AssistantAnswer) {
  return answer.messages.find((m) => m.role === "assistant")?.citations ?? [];
}

function updateAnswer(
  id: string,
  patch: { [K in keyof AssistantAnswer]?: AssistantAnswer[K] | undefined },
) {
  const clean = Object.fromEntries(
    Object.entries(patch).filter(([, value]) => value !== undefined),
  ) as Partial<AssistantAnswer>;
  consoleStore.update((current) => ({
    ...current,
    answerLog: current.answerLog.map((a) =>
      a.id === id ? applyPatch(a, clean, patch) : a,
    ),
  }));
}

function applyPatch(
  answer: AssistantAnswer,
  clean: Partial<AssistantAnswer>,
  patch: Record<string, unknown>,
): AssistantAnswer {
  const next = { ...answer, ...clean } as Record<string, unknown>;
  for (const key of Object.keys(patch)) {
    if (patch[key] === undefined) delete next[key];
  }
  return next as AssistantAnswer;
}

function AnswerLogPage() {
  const data = useConsoleData();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState<Record<string, string>>({});

  const selected =
    data.answerLog.find((answer) => answer.id === selectedId) ?? null;

  function promote(answer: AssistantAnswer) {
    if (data.goldenSet.some((g) => g.sourceAnswerId === answer.id)) {
      toast.info("Already in the golden set", {
        description: answer.question,
      });
      return;
    }
    consoleStore.update((current) => ({
      ...current,
      answerLog: current.answerLog.map((a) =>
        a.id === answer.id ? { ...a, promoted: true } : a,
      ),
      goldenSet: [
        {
          id: `golden-${current.goldenSet.length + 1}-${answer.id}`,
          sourceAnswerId: answer.id,
          projectLabel: answer.projectLabel,
          question: answer.question,
          expectedAnswer: answerText(answer),
          citations:
            answer.retrievedChunks
              ?.filter((chunk) => chunk.used)
              .map((chunk) => `${chunk.documentTitle}, ${chunk.page}`) ?? [],
          addedOn: "Today",
          lastCheck: "passing" as const,
        },
        ...current.goldenSet,
      ],
    }));
    toast.success("Promoted to Golden Set", {
      description: "This answer is now part of the acceptance test.",
    });
  }

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Answer Log</h1>
        <p className="text-sm text-muted-foreground">
          Every answer the assistant gave, with the chunks it retrieved — rate
          them, diagnose failures, and promote the verified ones.
        </p>
      </header>

      <Tabs defaultValue="log" className="space-y-6">
        <TabsList>
          <TabsTrigger value="log">Answer Log</TabsTrigger>
          <TabsTrigger value="golden">
            Golden Set
            <span className="ml-2 text-xs text-muted-foreground">
              {data.goldenSet.length}
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="log" className="space-y-4">
          <div
            className={cn(
              "grid gap-6",
              selected ? "xl:grid-cols-[minmax(0,1fr)_26rem]" : "grid-cols-1",
            )}
          >
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 font-medium">Question</th>
                      <th className="px-4 py-3 font-medium">Parcel</th>
                      {!selected && (
                        <th className="px-4 py-3 font-medium">Answer given</th>
                      )}
                      <th className="px-4 py-3 font-medium">Sources</th>
                      <th className="px-4 py-3 font-medium">Coverage</th>
                      <th className="px-4 py-3 font-medium">Rating</th>
                      <th className="px-4 py-3 font-medium">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.answerLog.map((answer) => (
                      <tr
                        key={answer.id}
                        onClick={() => setSelectedId(answer.id)}
                        className={cn(
                          "cursor-pointer border-b last:border-0 align-top transition-colors hover:bg-muted/40",
                          selected?.id === answer.id && "bg-muted/60",
                        )}
                      >
                        <td className="max-w-xs px-4 py-3 font-medium">
                          {answer.question}
                          {answer.isRefusal && (
                            <Badge
                              variant="outline"
                              className="ml-2 gap-1 text-xs font-normal text-muted-foreground"
                            >
                              <CircleSlash className="h-3 w-3" /> Refusal
                            </Badge>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                          {answer.projectLabel.split(",")[0]}
                        </td>
                        {!selected && (
                          <td className="max-w-md px-4 py-3 text-muted-foreground">
                            <span className="line-clamp-2">
                              {answerText(answer)}
                            </span>
                          </td>
                        )}
                        <td className="px-4 py-3 text-muted-foreground">
                          {answer.retrievedChunks?.length ?? 0}
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant="outline"
                            className={cn("capitalize", coverageClass(answer.coverage))}
                          >
                            {answer.coverage}
                          </Badge>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          {answer.rating ? (
                            <span className="flex items-center gap-1.5">
                              <Badge
                                variant="outline"
                                className={ratingClass(answer.rating)}
                              >
                                {ratingLabels[answer.rating]}
                              </Badge>
                              {answer.failureCause && (
                                <span className="text-xs text-muted-foreground">
                                  {failureShort[answer.failureCause]}
                                </span>
                              )}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              Unrated
                            </span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                          {answer.askedOn ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {selected && (
              <aside className="space-y-4 xl:sticky xl:top-20 xl:self-start">
                <Card>
                  <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
                    <div className="space-y-1">
                      <CardTitle className="text-base leading-snug">
                        {selected.question}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground">
                        {selected.projectLabel} · {selected.askedOn}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setSelectedId(null)}
                      aria-label="Close review panel"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <div className="rounded-md border bg-muted/30 p-3 text-sm leading-relaxed">
                      {answerText(selected)}
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                        Rate this answer
                      </Label>
                      <div className="flex flex-wrap gap-2">
                        {(Object.keys(ratingLabels) as AnswerRating[]).map(
                          (rating) => (
                            <Button
                              key={rating}
                              size="sm"
                              variant={
                                selected.rating === rating ? "default" : "outline"
                              }
                              onClick={() =>
                                updateAnswer(selected.id, {
                                  rating,
                                  failureCause:
                                    rating === "good"
                                      ? undefined
                                      : selected.failureCause,
                                })
                              }
                            >
                              {rating === "good" && (
                                <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                              )}
                              {ratingLabels[rating]}
                            </Button>
                          ),
                        )}
                      </div>
                    </div>

                    {selected.rating && selected.rating !== "good" && (
                      <div className="space-y-2">
                        <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                          Failure cause
                        </Label>
                        <Select
                          value={selected.failureCause ?? ""}
                          onValueChange={(value) =>
                            updateAnswer(selected.id, {
                              failureCause: value as FailureCause,
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Tag what went wrong" />
                          </SelectTrigger>
                          <SelectContent>
                            {(Object.keys(failureLabels) as FailureCause[]).map(
                              (cause) => (
                                <SelectItem key={cause} value={cause}>
                                  {failureLabels[cause]}
                                </SelectItem>
                              ),
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label
                        htmlFor="review-note"
                        className="text-xs uppercase tracking-wide text-muted-foreground"
                      >
                        Note
                      </Label>
                      <Textarea
                        id="review-note"
                        rows={3}
                        placeholder="What should change so this answer is right next time?"
                        value={
                          noteDraft[selected.id] ?? selected.reviewNote ?? ""
                        }
                        onChange={(event) =>
                          setNoteDraft((current) => ({
                            ...current,
                            [selected.id]: event.target.value,
                          }))
                        }
                        onBlur={(event) =>
                          updateAnswer(selected.id, {
                            reviewNote: event.target.value,
                          })
                        }
                      />
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                        <FileSearch className="h-3.5 w-3.5" />
                        Chunks retrieved for this answer
                      </div>
                      {selected.retrievedChunks?.length ? (
                        <ul className="space-y-2">
                          {selected.retrievedChunks.map((chunk) => (
                            <li
                              key={chunk.id}
                              className={cn(
                                "rounded-md border p-3 text-xs",
                                chunk.used
                                  ? "border-border"
                                  : "border-dashed border-warning/50 bg-warning/5",
                              )}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <span className="font-medium">
                                  {chunk.documentTitle}
                                </span>
                                <span className="shrink-0 text-muted-foreground">
                                  {chunk.score.toFixed(2)}
                                </span>
                              </div>
                              <p className="mt-1 text-muted-foreground">
                                {chunk.excerpt}
                              </p>
                              <p className="mt-1.5 flex items-center gap-2 text-muted-foreground">
                                <span>{chunk.page}</span>
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "text-[10px]",
                                    chunk.used
                                      ? "border-primary/40 text-primary"
                                      : "border-warning/50 text-warning",
                                  )}
                                >
                                  {chunk.used ? "Used in answer" : "Ranked but not used"}
                                </Badge>
                              </p>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
                          Nothing was retrieved — the corpus held no matching
                          passage.
                        </p>
                      )}
                    </div>

                    <Button
                      className="w-full"
                      onClick={() => promote(selected)}
                      disabled={data.goldenSet.some(
                        (g) => g.sourceAnswerId === selected.id,
                      )}
                    >
                      <Star className="mr-2 h-4 w-4" />
                      {data.goldenSet.some(
                        (g) => g.sourceAnswerId === selected.id,
                      )
                        ? "In Golden Set"
                        : "Promote to Golden Set"}
                    </Button>
                  </CardContent>
                </Card>
              </aside>
            )}
          </div>
        </TabsContent>

        <TabsContent value="golden" className="space-y-4">
          <div className="flex items-start gap-3 rounded-md border border-primary/30 bg-primary/5 p-4 text-sm">
            <Target className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <p className="text-muted-foreground">
              The golden set is the acceptance test for the assistant. Every
              change to the corpus, retrieval, or prompt is re-run against these
              verified question / answer / citation pairs — a failing entry means
              quality regressed.
            </p>
          </div>

          <div className="grid gap-4">
            {data.goldenSet.map((entry) => (
              <Card key={entry.id}>
                <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
                  <div className="space-y-1">
                    <CardTitle className="text-base leading-snug">
                      {entry.question}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">
                      {entry.projectLabel} · added {entry.addedOn}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      entry.lastCheck === "passing"
                        ? "border-primary/40 text-primary"
                        : "border-destructive/50 text-destructive"
                    }
                  >
                    {entry.lastCheck === "passing"
                      ? "Last check: passing"
                      : "Last check: failing"}
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      Expected answer
                    </p>
                    <p className="mt-1 leading-relaxed">{entry.expectedAnswer}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      Required citations
                    </p>
                    <ul className="mt-1 space-y-1">
                      {entry.citations.map((citation) => (
                        <li
                          key={citation}
                          className="text-xs text-muted-foreground"
                        >
                          · {citation}
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
