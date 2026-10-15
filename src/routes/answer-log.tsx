import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Play,
  Plus,
  Star,
  Target,
  Trash2,
  X,
  XCircle,
} from "lucide-react";

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
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type { AnswerCitation, AnswerRow, GoldenRow } from "@/functions/answers";
import {
  useAddGolden,
  useAnswerLog,
  useDeleteAnswer,
  useDeleteGolden,
  useLogAnswer,
  useReviewAnswer,
  useRunGolden,
} from "@/hooks/use-answers";
import { useIntegrationStatus } from "@/hooks/use-pipeline";
import { CLIENT_STATES, stateLabel } from "@/lib/states";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/answer-log")({
  head: () => ({
    meta: [
      { title: "Answer Log — Collective Impact" },
      {
        name: "description",
        content:
          "Review the chatbot's answers, diagnose failures, and maintain the golden set acceptance test.",
      },
      { property: "og:title", content: "Answer Log — Collective Impact" },
      {
        property: "og:description",
        content:
          "Review the chatbot's answers, diagnose failures, and maintain the golden set acceptance test.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AnswerLogPage,
});

type Rating = NonNullable<AnswerRow["rating"]>;
type FailureCause = NonNullable<AnswerRow["failure_cause"]>;
type VisitorState = (typeof CLIENT_STATES)[number];

const ratingLabels: Record<Rating, string> = {
  good: "Good",
  "needs-work": "Needs work",
  wrong: "Wrong",
};

const failureLabels: Record<FailureCause, string> = {
  retrieval: "Retrieval — the right knowledge existed but wasn't used",
  prompt: "Prompt — right knowledge used, answer still wrong",
  "not-loaded": "Not loaded — the knowledge is missing from the Knowledge Base",
};

const sourceLabels: Record<AnswerRow["source"], string> = {
  chatbot: "Chatbot",
  preview: "Preview",
  manual: "Logged by hand",
};

function ratingClass(rating: AnswerRow["rating"]) {
  if (rating === "good") return "border-primary/40 text-primary";
  if (rating === "needs-work") return "border-warning/50 text-warning-foreground";
  if (rating === "wrong") return "border-destructive/50 text-destructive";
  return "text-muted-foreground";
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function citationsOf(answer: AnswerRow) {
  return Array.isArray(answer.citations) ? (answer.citations as unknown as AnswerCitation[]) : [];
}

function StateSelect({
  id,
  value,
  onChange,
}: {
  id: string;
  value: VisitorState;
  onChange: (v: VisitorState) => void;
}) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as VisitorState)}>
      <SelectTrigger id={id}>
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
  );
}

function LogAnswerForm({ onClose }: { onClose: () => void }) {
  const logAnswer = useLogAnswer();
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [state, setState] = useState<VisitorState>("OK");
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">Log a chatbot answer</CardTitle>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close form">
          <X className="size-4" />
        </Button>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-[1fr_180px]">
        <div className="space-y-1.5">
          <Label htmlFor="la-question">Question the visitor asked</Label>
          <Input id="la-question" value={question} onChange={(e) => setQuestion(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="la-state">Visitor state</Label>
          <StateSelect id="la-state" value={state} onChange={setState} />
        </div>
        <div className="space-y-1.5 md:col-span-2">
          <Label htmlFor="la-answer">Answer the chatbot gave</Label>
          <Textarea
            id="la-answer"
            rows={5}
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
          />
        </div>
        <div className="flex justify-end gap-2 md:col-span-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!question.trim() || !answer.trim() || logAnswer.isPending}
            onClick={() =>
              logAnswer.mutate(
                { question, answer, state, citations: [], source: "manual" },
                { onSuccess: onClose },
              )
            }
          >
            Log answer
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function PromoteForm({ answer, onDone }: { answer: AnswerRow; onDone: () => void }) {
  const addGolden = useAddGolden();
  const [expected, setExpected] = useState(answer.answer);
  const [programs, setPrograms] = useState("");
  const [state, setState] = useState<VisitorState>(
    (CLIENT_STATES as readonly string[]).includes(answer.state ?? "")
      ? (answer.state as VisitorState)
      : "OK",
  );
  return (
    <div className="space-y-3 rounded-md border border-primary/30 bg-primary/5 p-3">
      <div className="space-y-1">
        <Label htmlFor="pg-expected" className="text-xs">
          Verified expected answer
        </Label>
        <Textarea
          id="pg-expected"
          rows={5}
          value={expected}
          onChange={(e) => setExpected(e.target.value)}
        />
      </div>
      <div className="grid gap-2 sm:grid-cols-[1fr_140px]">
        <div className="space-y-1">
          <Label htmlFor="pg-programs" className="text-xs">
            Programs it must mention (comma-separated)
          </Label>
          <Input
            id="pg-programs"
            value={programs}
            onChange={(e) => setPrograms(e.target.value)}
            placeholder="e.g. CDBG Small Cities"
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="pg-state" className="text-xs">
            State
          </Label>
          <StateSelect id="pg-state" value={state} onChange={setState} />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <Button
          size="sm"
          disabled={!expected.trim() || addGolden.isPending}
          onClick={() =>
            addGolden.mutate(
              {
                question: answer.question,
                state,
                expectedAnswer: expected,
                requiredPrograms: programs
                  .split(",")
                  .map((p) => p.trim())
                  .filter(Boolean),
                sourceAnswerId: answer.id,
              },
              { onSuccess: onDone },
            )
          }
        >
          <Star /> Add to Golden Set
        </Button>
      </div>
    </div>
  );
}

function ReviewPanel({
  answer,
  inGolden,
  onClose,
}: {
  answer: AnswerRow;
  inGolden: boolean;
  onClose: () => void;
}) {
  const review = useReviewAnswer();
  const remove = useDeleteAnswer();
  const [note, setNote] = useState(answer.review_note ?? "");
  const [promoting, setPromoting] = useState(false);
  const citations = citationsOf(answer);

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div className="space-y-1">
          <CardTitle className="text-base leading-snug">{answer.question}</CardTitle>
          <p className="text-xs text-muted-foreground">
            {sourceLabels[answer.source]} · {answer.state ?? "No state"} ·{" "}
            {formatDate(answer.created_at)}
            {answer.parcel ? ` · ${answer.parcel}` : ""}
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close review panel">
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="rounded-md border bg-muted/30 p-3 text-sm leading-relaxed">
          <p className="whitespace-pre-line">{answer.answer}</p>
          {citations.length > 0 && (
            <div className="mt-3 space-y-1 border-t pt-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Sources cited
              </p>
              {citations.map((c, i) => (
                <p key={`${c.title}-${i}`} className="text-xs text-muted-foreground">
                  [{c.n ?? i + 1}] {c.title}
                  {c.source ? ` — ${c.source}` : ""}
                </p>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">
            Rate this answer
          </Label>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(ratingLabels) as Rating[]).map((rating) => (
              <Button
                key={rating}
                size="sm"
                variant={answer.rating === rating ? "default" : "outline"}
                disabled={review.isPending}
                onClick={() => review.mutate({ id: answer.id, rating })}
              >
                {rating === "good" && <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />}
                {ratingLabels[rating]}
              </Button>
            ))}
          </div>
        </div>

        {answer.rating && answer.rating !== "good" && (
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">
              Failure cause
            </Label>
            <Select
              value={answer.failure_cause ?? ""}
              onValueChange={(value) =>
                review.mutate({ id: answer.id, failureCause: value as FailureCause })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Tag what went wrong" />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(failureLabels) as FailureCause[]).map((cause) => (
                  <SelectItem key={cause} value={cause}>
                    {failureLabels[cause]}
                  </SelectItem>
                ))}
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
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onBlur={() => {
              if (note !== (answer.review_note ?? ""))
                review.mutate({ id: answer.id, reviewNote: note });
            }}
          />
        </div>

        <Separator />

        {promoting ? (
          <PromoteForm answer={answer} onDone={() => setPromoting(false)} />
        ) : (
          <Button className="w-full" disabled={inGolden} onClick={() => setPromoting(true)}>
            <Star className="mr-2 h-4 w-4" />
            {inGolden ? "In Golden Set" : "Promote to Golden Set"}
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-destructive"
          disabled={remove.isPending}
          onClick={() => {
            if (window.confirm("Delete this answer from the log?")) {
              remove.mutate(answer.id, { onSuccess: onClose });
            }
          }}
        >
          <Trash2 /> Delete from log
        </Button>
      </CardContent>
    </Card>
  );
}

function GoldenForm({ onClose }: { onClose: () => void }) {
  const addGolden = useAddGolden();
  const [question, setQuestion] = useState("");
  const [expected, setExpected] = useState("");
  const [programs, setPrograms] = useState("");
  const [state, setState] = useState<VisitorState>("OK");
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">New golden entry</CardTitle>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close form">
          <X className="size-4" />
        </Button>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-[1fr_180px]">
        <div className="space-y-1.5">
          <Label htmlFor="gf-question">Question</Label>
          <Input id="gf-question" value={question} onChange={(e) => setQuestion(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="gf-state">Visitor state</Label>
          <StateSelect id="gf-state" value={state} onChange={setState} />
        </div>
        <div className="space-y-1.5 md:col-span-2">
          <Label htmlFor="gf-expected">Verified expected answer</Label>
          <Textarea
            id="gf-expected"
            rows={4}
            value={expected}
            onChange={(e) => setExpected(e.target.value)}
          />
        </div>
        <div className="space-y-1.5 md:col-span-2">
          <Label htmlFor="gf-programs">Programs it must mention (comma-separated, optional)</Label>
          <Input id="gf-programs" value={programs} onChange={(e) => setPrograms(e.target.value)} />
        </div>
        <div className="flex justify-end gap-2 md:col-span-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={question.trim().length < 3 || !expected.trim() || addGolden.isPending}
            onClick={() =>
              addGolden.mutate(
                {
                  question,
                  state,
                  expectedAnswer: expected,
                  requiredPrograms: programs
                    .split(",")
                    .map((p) => p.trim())
                    .filter(Boolean),
                },
                { onSuccess: onClose },
              )
            }
          >
            Add entry
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function GoldenCard({ entry, canRun }: { entry: GoldenRow; canRun: boolean }) {
  const run = useRunGolden();
  const remove = useDeleteGolden();
  const running = run.isPending && run.variables === entry.id;
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div className="space-y-1">
          <CardTitle className="text-base leading-snug">{entry.question}</CardTitle>
          <p className="text-xs text-muted-foreground">
            {stateLabel(entry.state)} · added {formatDate(entry.created_at)}
          </p>
        </div>
        {entry.last_run_at ? (
          <Badge
            variant="outline"
            className={
              entry.last_run_passed
                ? "border-primary/40 text-primary"
                : "border-destructive/50 text-destructive"
            }
          >
            {entry.last_run_passed ? (
              <CheckCircle2 className="mr-1 h-3 w-3" />
            ) : (
              <XCircle className="mr-1 h-3 w-3" />
            )}
            {entry.last_run_passed ? "Passing" : "Failing"} · {formatDate(entry.last_run_at)}
          </Badge>
        ) : (
          <Badge variant="outline" className="text-muted-foreground">
            Never checked
          </Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Expected answer</p>
          <p className="mt-1 whitespace-pre-line leading-relaxed">{entry.expected_answer}</p>
        </div>
        {entry.required_programs.length > 0 && (
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Must mention</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {entry.required_programs.join(" · ")}
            </p>
          </div>
        )}
        {entry.last_run_reason && (
          <details className="rounded-md border bg-muted/30 p-3">
            <summary className="cursor-pointer text-xs text-muted-foreground">
              Last check: {entry.last_run_reason}
            </summary>
            <p className="mt-2 whitespace-pre-line text-xs leading-relaxed">
              {entry.last_run_answer}
            </p>
          </details>
        )}
        <div className="flex justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            disabled={remove.isPending}
            onClick={() => {
              if (window.confirm("Remove this entry from the Golden Set?")) remove.mutate(entry.id);
            }}
          >
            <Trash2 /> Remove
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={!canRun || running}
            onClick={() => run.mutate(entry.id)}
          >
            {running ? <Loader2 className="animate-spin" /> : <Play />}
            Run check
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function AnswerLogPage() {
  const { data, isLoading, isError, error, refetch } = useAnswerLog();
  const { data: integration } = useIntegrationStatus();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [logging, setLogging] = useState(false);
  const [addingGolden, setAddingGolden] = useState(false);

  const answers = data?.answers ?? [];
  const golden = data?.golden ?? [];
  const selected = answers.find((a) => a.id === selectedId) ?? null;
  const goldenSources = new Set(golden.map((g) => g.source_answer_id).filter(Boolean));
  const failing = golden.filter((g) => g.last_run_at && !g.last_run_passed).length;

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Answer Log</h1>
          <p className="text-sm text-muted-foreground">
            Answers the chatbot gave — rate them, diagnose failures, and promote verified ones to
            the Golden Set.
          </p>
        </div>
        <Button variant="outline" onClick={() => setLogging(true)} disabled={data?.needsMigration}>
          <Plus /> Log an answer
        </Button>
      </header>

      {data?.needsMigration && (
        <div className="flex items-start gap-3 border border-warning/40 bg-warning/10 px-4 py-3 text-sm">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
          <p>
            The Answer Log needs its database tables. Run{" "}
            <code className="font-mono text-xs">supabase_step3_features.sql</code> in the Supabase
            SQL Editor, then refresh.
          </p>
        </div>
      )}
      {isError && (
        <div className="flex flex-wrap items-center justify-between gap-3 border border-destructive/40 bg-destructive/5 px-4 py-3 text-xs">
          <span>{(error as Error).message}</span>
          <Button size="sm" variant="outline" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      )}

      {logging && <LogAnswerForm onClose={() => setLogging(false)} />}

      <Tabs defaultValue="log" className="space-y-6">
        <TabsList>
          <TabsTrigger value="log">
            Answer Log <span className="ml-2 text-xs text-muted-foreground">{answers.length}</span>
          </TabsTrigger>
          <TabsTrigger value="golden">
            Golden Set
            <span className="ml-2 text-xs text-muted-foreground">{golden.length}</span>
            {failing > 0 && (
              <span className="ml-1.5 rounded-full bg-destructive/15 px-1.5 text-xs text-destructive">
                {failing} failing
              </span>
            )}
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
                      <th className="px-4 py-3 font-medium">State</th>
                      {!selected && <th className="px-4 py-3 font-medium">Answer given</th>}
                      <th className="px-4 py-3 font-medium">From</th>
                      <th className="px-4 py-3 font-medium">Rating</th>
                      <th className="px-4 py-3 font-medium">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {answers.map((answer) => (
                      <tr
                        key={answer.id}
                        onClick={() => setSelectedId(answer.id)}
                        className={cn(
                          "cursor-pointer border-b align-top transition-colors last:border-0 hover:bg-muted/40",
                          selected?.id === answer.id && "bg-muted/60",
                        )}
                      >
                        <td className="max-w-xs px-4 py-3 font-medium">{answer.question}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                          {answer.state ?? "—"}
                        </td>
                        {!selected && (
                          <td className="max-w-md px-4 py-3 text-muted-foreground">
                            <span className="line-clamp-2">{answer.answer}</span>
                          </td>
                        )}
                        <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                          {sourceLabels[answer.source]}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          {answer.rating ? (
                            <Badge variant="outline" className={ratingClass(answer.rating)}>
                              {ratingLabels[answer.rating]}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">Unrated</span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                          {formatDate(answer.created_at)}
                        </td>
                      </tr>
                    ))}
                    {answers.length === 0 && (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-4 py-10 text-center text-sm text-muted-foreground"
                        >
                          {isLoading
                            ? "Loading…"
                            : "No answers yet. They arrive when the chatbot posts to the answer-log endpoint, when you log a preview from Assistant & Map, or when you log one by hand."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>

            {selected && (
              <aside className="xl:sticky xl:top-20 xl:self-start">
                <ReviewPanel
                  key={selected.id}
                  answer={selected}
                  inGolden={goldenSources.has(selected.id)}
                  onClose={() => setSelectedId(null)}
                />
              </aside>
            )}
          </div>
        </TabsContent>

        <TabsContent value="golden" className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3 rounded-md border border-primary/30 bg-primary/5 p-4 text-sm">
            <p className="flex max-w-3xl gap-3 text-muted-foreground">
              <Target className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              The Golden Set is the assistant's acceptance test. “Run check” re-asks each question
              against today's Knowledge Base and grades the answer against the verified one — a
              failing entry means quality regressed.
              {!integration?.gemini && " Checks need the Gemini API key."}
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setAddingGolden(true)}
              disabled={data?.needsMigration}
            >
              <Plus /> New entry
            </Button>
          </div>

          {addingGolden && <GoldenForm onClose={() => setAddingGolden(false)} />}

          <div className="grid gap-4">
            {golden.map((entry) => (
              <GoldenCard key={entry.id} entry={entry} canRun={Boolean(integration?.gemini)} />
            ))}
            {golden.length === 0 && !isLoading && (
              <p className="rounded-md border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
                No golden entries yet. Promote a good answer from the log, or add one directly.
              </p>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
