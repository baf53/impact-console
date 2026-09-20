import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  CircleCheck,
  FileText,
  Mail,
  MessageSquareQuote,
  Paperclip,
  Phone,
  Upload,
  User,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { consoleStore, useConsoleData, type KnowledgeProgram } from "@/lib/mock-data";
import { CoverageMeter } from "./knowledge-base.index";

export const Route = createFileRoute("/knowledge-base/$programId")({
  head: () => ({
    meta: [
      { title: "Program detail — Knowledge Base" },
      { name: "description", content: "Source documents, practitioner knowledge, contacts, and forms for a funding program." },
      { property: "og:title", content: "Program detail — Knowledge Base" },
      { property: "og:description", content: "Source documents, practitioner knowledge, contacts, and forms for a funding program." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProgramDetail,
});

function Section({
  title,
  description,
  icon: Icon,
  count,
  children,
}: {
  title: string;
  description: string;
  icon: typeof BookOpen;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <section className="border bg-card">
      <div className="flex items-start gap-2.5 border-b px-5 py-3.5">
        <Icon className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
        <div>
          <h2 className="text-sm font-semibold text-foreground">
            {title}
            {count !== undefined && <span className="ml-1.5 font-normal text-muted-foreground">({count})</span>}
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="px-5 py-4">{children}</div>
    </section>
  );
}

function EmptyState({ label, hint }: { label: string; hint: string }) {
  return (
    <div className="flex flex-col items-center border border-dashed bg-muted/20 px-5 py-8 text-center">
      <AlertTriangle className="size-5 text-warning" aria-hidden="true" />
      <p className="mt-3 text-sm font-medium text-foreground">{label}</p>
      <p className="mt-1 max-w-md text-xs leading-5 text-muted-foreground">{hint}</p>
    </div>
  );
}

function UploadArea({ program }: { program: KnowledgeProgram }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function addFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const added = Array.from(files).map((file, index) => ({
      id: `att-${Date.now()}-${index}`,
      name: file.name,
      type: /check/i.test(file.name) ? "Checklist" : "Application form",
      size: `${Math.max(1, Math.round(file.size / 1024))} KB`,
    }));
    consoleStore.update((current) => ({
      ...current,
      programsLibrary: current.programsLibrary.map((p) =>
        p.id === program.id ? { ...p, attachments: [...p.attachments, ...added] } : p,
      ),
    }));
    toast.success(`${added.length} file${added.length > 1 ? "s" : ""} attached to ${program.name}`);
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        addFiles(e.dataTransfer.files);
      }}
      className={`mt-3 flex flex-col items-center border border-dashed px-5 py-7 text-center transition-colors ${
        dragging ? "border-primary bg-primary/5" : "bg-muted/20"
      }`}
    >
      <Upload className="size-5 text-muted-foreground" aria-hidden="true" />
      <p className="mt-3 text-sm font-medium text-foreground">Attach application forms or checklists</p>
      <p className="mt-1 text-xs text-muted-foreground">Drag files here, or browse. PDF, DOCX, XLSX.</p>
      <Button variant="outline" size="sm" className="mt-3" onClick={() => inputRef.current?.click()}>
        Browse files
      </Button>
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          addFiles(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}

function ProgramDetail() {
  const { programId } = Route.useParams();
  const data = useConsoleData();
  const program = data.programsLibrary.find((p) => p.id === programId);

  if (!program) throw notFound();

  const thin = program.coverage < 25;

  return (
    <main className="mx-auto w-full max-w-4xl px-5 py-8 md:px-8 md:py-10">
      <Link
        to="/knowledge-base"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" aria-hidden="true" /> Knowledge Base
      </Link>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{program.name}</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {program.administrator} · {program.level} · {program.jurisdiction}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs font-medium text-muted-foreground">Coverage</p>
          <div className="mt-1 flex justify-end">
            <CoverageMeter value={program.coverage} />
          </div>
        </div>
      </div>

      {thin && (
        <div className="mt-5 flex items-start gap-3 border border-warning/40 bg-warning/10 px-4 py-3">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
          <p className="text-xs leading-5 text-foreground">
            <span className="font-medium">Thin — needs practitioner review.</span> This program has little approved
            source material. The assistant will answer cautiously until documents and notes are added.
          </p>
        </div>
      )}

      <div className="mt-6 space-y-5">
        <Section title="Overview" description="What it funds and who administers it." icon={BookOpen}>
          <p className="text-sm font-medium text-foreground">{program.funds}</p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{program.overview}</p>
          <div className="mt-4 flex flex-wrap gap-1.5">
            {program.cities.map((city) => (
              <span key={city} className="rounded-full border bg-background px-2.5 py-0.5 text-xs text-muted-foreground">
                Loaded for {city}
              </span>
            ))}
          </div>
        </Section>

        <Section
          title="Source documents"
          description="Regulations, Consolidated Plans, and Annual Action Plans behind this program."
          icon={FileText}
          count={program.documents.length}
        >
          {program.documents.length === 0 ? (
            <EmptyState
              label="No approved source documents"
              hint="Nothing has been approved into this program yet. Add regulations or plan documents so the assistant can cite them."
            />
          ) : (
            <ul className="divide-y">
              {program.documents.map((doc) => (
                <li key={doc.id} className="flex flex-wrap items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{doc.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {doc.kind} · {doc.citation}
                    </p>
                  </div>
                  <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                    <CircleCheck className="size-3" aria-hidden="true" /> Approved {doc.approvedOn}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section
          title="Practitioner knowledge"
          description="Human-supplied notes, traced back to the call they came from."
          icon={MessageSquareQuote}
          count={program.notes.length}
        >
          {program.notes.length === 0 ? (
            <EmptyState
              label="No practitioner knowledge yet"
              hint="Approve notes in Review & Approve to fill in the expertise that isn't written down in any document."
            />
          ) : (
            <ul className="space-y-3">
              {program.notes.map((note) => (
                <li key={note.id} className="border bg-background px-4 py-3">
                  <p className="text-sm leading-6 text-foreground">{note.text}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    From <span className="font-medium text-foreground">{note.sourceCall}</span> · {note.callDate} ·{" "}
                    {note.routing === "program-level" ? "Program-level" : "Site-level"}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section
          title="Contacts"
          description="People who administer or gatekeep this program."
          icon={User}
          count={program.contacts.length}
        >
          {program.contacts.length === 0 ? (
            <EmptyState
              label="No contacts recorded"
              hint="Contacts appear here once they're approved from a call transcript."
            />
          ) : (
            <ul className="divide-y">
              {program.contacts.map((contact) => (
                <li key={contact.id} className="flex flex-wrap items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div>
                    <p className="text-sm font-medium text-foreground">{contact.name}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {contact.title} · {contact.org}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 text-xs text-muted-foreground">
                    {contact.phone && (
                      <span className="flex items-center gap-1.5">
                        <Phone className="size-3" aria-hidden="true" /> {contact.phone}
                      </span>
                    )}
                    {contact.email && (
                      <span className="flex items-center gap-1.5">
                        <Mail className="size-3" aria-hidden="true" /> {contact.email}
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section
          title="Attached forms & checklists"
          description="Application packets and internal checklists for this program."
          icon={Paperclip}
          count={program.attachments.length}
        >
          {program.attachments.length > 0 && (
            <ul className="divide-y">
              {program.attachments.map((file) => (
                <li key={file.id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0">
                  <span className="flex min-w-0 items-center gap-2">
                    <Paperclip className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                    <span className="truncate text-sm text-foreground">{file.name}</span>
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {file.type} · {file.size}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <UploadArea program={program} />
        </Section>
      </div>
    </main>
  );
}
