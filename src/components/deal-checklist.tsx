import { ClipboardCopy, Download, FileWarning, ListChecks } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import type { ClientRow } from "@/functions/deals";
import { useChecklist } from "@/hooks/use-deals";
import type { ExtractionRow } from "@/lib/pipeline";

function checklistText(client: ClientRow, missing: ExtractionRow[], steps: ExtractionRow[]) {
  const lines = [
    `Missing documents checklist — ${client.parcel_address}, ${client.city}, ${client.state}`,
    `Prepared for ${client.contact_name || client.client_name} by Collective Impact`,
    "",
  ];
  missing.forEach((item) => {
    lines.push(`[ ] ${item.title}`);
    item.facts.forEach((fact) => lines.push(`    - ${fact}`));
  });
  if (steps.length > 0) {
    lines.push("", "Next steps");
    steps.forEach((step, i) => lines.push(`${i + 1}. ${step.title}`));
  }
  return lines.join("\n");
}

/** Live checklist built from the client's approved missing_document and next_step items. */
export function DealChecklist({ client }: { client: ClientRow }) {
  const { data, isLoading } = useChecklist(client.id);
  const missing = data?.missingDocuments ?? [];
  const steps = data?.nextSteps ?? [];

  const download = () => {
    const blob = new Blob([checklistText(client, missing, steps)], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `missing-documents-${client.parcel_address.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.txt`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Checklist downloaded", { description: client.parcel_address });
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(checklistText(client, missing, steps));
      toast.success("Checklist copied", { description: "Paste it into an email to the client." });
    } catch {
      toast.error("Couldn't access the clipboard — use Download instead.");
    }
  };

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading checklist…</p>;

  return (
    <div className="space-y-4">
      <div>
        <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          <FileWarning className="size-3.5" aria-hidden="true" /> Missing documents (
          {missing.length})
        </p>
        {missing.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            No approved missing-document items yet. Approve them from this client's transcripts in
            the Pipeline.
          </p>
        ) : (
          <ul className="mt-2 space-y-2">
            {missing.map((item) => (
              <li key={item.id} className="flex gap-2 text-sm">
                <span
                  className="mt-0.5 size-4 shrink-0 rounded-sm border border-muted-foreground/50"
                  aria-hidden="true"
                />
                <span>
                  <span className="font-medium text-foreground">{item.title}</span>
                  {item.facts.length > 0 && (
                    <span className="block text-xs text-muted-foreground">
                      {item.facts.join(" · ")}
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {steps.length > 0 && (
        <div>
          <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <ListChecks className="size-3.5" aria-hidden="true" /> Next steps ({steps.length})
          </p>
          <ol className="mt-2 space-y-1.5">
            {steps.map((step, i) => (
              <li key={step.id} className="flex gap-2.5 text-sm">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium tabular-nums text-muted-foreground">
                  {i + 1}
                </span>
                <span className="text-muted-foreground">{step.title}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {(missing.length > 0 || steps.length > 0) && (
        <div className="flex flex-wrap gap-2 print:hidden">
          <Button variant="outline" size="sm" onClick={download}>
            <Download /> Download checklist
          </Button>
          <Button variant="ghost" size="sm" onClick={copy}>
            <ClipboardCopy /> Copy for email
          </Button>
        </div>
      )}
    </div>
  );
}
