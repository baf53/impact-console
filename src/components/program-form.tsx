import { useState } from "react";

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
import { Textarea } from "@/components/ui/textarea";
import type { ProgramInput, ProgramRow } from "@/functions/knowledge";
import { KNOWLEDGE_STATES, STATE_NAMES, stateLabel } from "@/lib/states";

const LEVELS = ["Federal", "State", "Local", "Quasi"] as const;

type FormState = Omit<ProgramInput, "cities" | "coverage"> & { cities: string; coverage: string };

function toForm(program?: ProgramRow): FormState {
  return {
    name: program?.name ?? "",
    state: (program?.state as ProgramInput["state"] | undefined) ?? "OK",
    level: program?.level ?? "State",
    administrator: program?.administrator ?? "",
    jurisdiction: program?.jurisdiction ?? STATE_NAMES["OK"] ?? "",
    cities: program?.cities.join(", ") ?? "",
    funds: program?.funds ?? "",
    overview: program?.overview ?? "",
    eligibility_criteria: program?.eligibility_criteria ?? "",
    coverage: String(program?.coverage ?? 40),
  };
}

export function ProgramForm({
  program,
  submitLabel,
  pending,
  onSubmit,
  onCancel,
}: {
  program?: ProgramRow;
  submitLabel: string;
  pending: boolean;
  onSubmit: (fields: ProgramInput) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<FormState>(() => toForm(program));
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const coverage = Number(form.coverage);
  const valid =
    form.name.trim() &&
    form.administrator.trim() &&
    form.jurisdiction.trim() &&
    form.funds.trim() &&
    form.overview.trim() &&
    Number.isInteger(coverage) &&
    coverage >= 0 &&
    coverage <= 100;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    onSubmit({
      ...form,
      cities: form.cities
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean),
      coverage,
    });
  };

  return (
    <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
      <div className="space-y-1.5 md:col-span-2">
        <Label htmlFor="p-name">Program name *</Label>
        <Input id="p-name" value={form.name} onChange={(e) => set("name", e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="p-state">State tag *</Label>
        <Select
          value={form.state}
          onValueChange={(v) => {
            const state = v as ProgramInput["state"];
            setForm((f) => ({
              ...f,
              state,
              // Keep a hand-typed jurisdiction; replace the previous state's default name.
              jurisdiction:
                !f.jurisdiction || f.jurisdiction === (STATE_NAMES[f.state] ?? f.state)
                  ? (STATE_NAMES[state] ?? state)
                  : f.jurisdiction,
              level: state === "Federal" ? "Federal" : f.level,
            }));
          }}
        >
          <SelectTrigger id="p-state">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {KNOWLEDGE_STATES.map((code) => (
              <SelectItem key={code} value={code}>
                {stateLabel(code)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">The chatbot filters knowledge by this tag.</p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="p-level">Level *</Label>
        <Select value={form.level} onValueChange={(v) => set("level", v as FormState["level"])}>
          <SelectTrigger id="p-level">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LEVELS.map((level) => (
              <SelectItem key={level} value={level}>
                {level}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="p-admin">Administrator *</Label>
        <Input
          id="p-admin"
          value={form.administrator}
          onChange={(e) => set("administrator", e.target.value)}
          placeholder="Oklahoma Housing Finance Agency"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="p-jurisdiction">Jurisdiction *</Label>
        <Input
          id="p-jurisdiction"
          value={form.jurisdiction}
          onChange={(e) => set("jurisdiction", e.target.value)}
          placeholder="Oklahoma"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="p-funds">Funds available *</Label>
        <Input
          id="p-funds"
          value={form.funds}
          onChange={(e) => set("funds", e.target.value)}
          placeholder="$18.5M allocated for FY2026"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="p-cities">Loaded for cities</Label>
        <Input
          id="p-cities"
          value={form.cities}
          onChange={(e) => set("cities", e.target.value)}
          placeholder="Bartlesville, Tulsa"
        />
      </div>
      <div className="space-y-1.5 md:col-span-2">
        <Label htmlFor="p-overview">Overview *</Label>
        <Textarea
          id="p-overview"
          rows={4}
          value={form.overview}
          onChange={(e) => set("overview", e.target.value)}
        />
      </div>
      <div className="space-y-1.5 md:col-span-2">
        <Label htmlFor="p-eligibility">Eligibility criteria</Label>
        <Textarea
          id="p-eligibility"
          rows={3}
          value={form.eligibility_criteria ?? ""}
          onChange={(e) => set("eligibility_criteria", e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="p-coverage">Coverage (0–100)</Label>
        <Input
          id="p-coverage"
          type="number"
          min={0}
          max={100}
          value={form.coverage}
          onChange={(e) => set("coverage", e.target.value)}
          className="tabular-nums"
        />
        <p className="text-xs text-muted-foreground">
          How much of the program is backed by approved sources. Below 25 is flagged as thin.
        </p>
      </div>
      <div className="flex items-end justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={pending}>
          Cancel
        </Button>
        <Button type="submit" disabled={!valid || pending}>
          {pending ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
