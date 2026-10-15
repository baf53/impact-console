import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  CircleCheck,
  FileText,
  Mail,
  MessageSquareQuote,
  Paperclip,
  Pencil,
  Phone,
  Trash2,
  Upload,
  User,
} from "lucide-react";
import { useRef, useState } from "react";

import { CoverageMeter } from "@/components/coverage-meter";
import { DocumentActions, DocumentStatusBadge } from "@/components/document-actions";
import { ProgramForm } from "@/components/program-form";
import { Button } from "@/components/ui/button";
import type { ProgramNoteRow } from "@/functions/knowledge";
import { useUploadDocument } from "@/hooks/use-documents";
import { useDeleteNote, useProgram, useUpdateProgram } from "@/hooks/use-knowledge";
import { stateLabel } from "@/lib/states";

export const Route = createFileRoute("/knowledge-base/$programId")({
  head: () => ({
    meta: [
      { title: "Program detail — Knowledge Base" },
      {
        name: "description",
        content:
          "Source documents, practitioner knowledge, contacts, and forms for a funding program.",
      },
      { property: "og:title", content: "Program detail — Knowledge Base" },
      {
        property: "og:description",
        content:
          "Source documents, practitioner knowledge, contacts, and forms for a funding program.",
      },
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
  action,
  children,
}: {
  title: string;
  description: string;
  icon: typeof BookOpen;
  count?: number;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="border bg-card">
      <div className="flex items-start justify-between gap-3 border-b px-5 py-3.5">
        <div className="flex items-start gap-2.5">
          <Icon className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              {title}
              {count !== undefined && (
                <span className="ml-1.5 font-normal text-muted-foreground">({count})</span>
              )}
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
          </div>
        </div>
        {action}
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

function UploadArea({ programId }: { programId: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const upload = useUploadDocument();

  function addFiles(files: FileList | null) {
    if (!files) return;
    for (const file of Array.from(files)) {
      upload.mutate({
        file,
        title: file.name.replace(/\.[^.]+$/, ""),
        type: /check/i.test(file.name) ? "Checklist" : "Application form",
        programId,
      });
    }
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
      <p className="mt-3 text-sm font-medium text-foreground">
        {upload.isPending ? "Uploading…" : "Attach application forms or checklists"}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        Drag files here, or browse. PDF, DOCX, XLSX — up to 50 MB.
      </p>
      <Button
        variant="outline"
        size="sm"
        className="mt-3"
        disabled={upload.isPending}
        onClick={() => inputRef.current?.click()}
      >
        Browse files
      </Button>
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        aria-label="Attach files"
        onChange={(e) => {
          addFiles(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}

function NoteItem({ note }: { note: ProgramNoteRow }) {
  const deleteNote = useDeleteNote();
  return (
    <li className="border bg-background px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <p className="whitespace-pre-line text-sm leading-6 text-foreground">{note.text}</p>
        <Button
          variant="ghost"
          size="icon"
          className="size-7 shrink-0"
          disabled={deleteNote.isPending}
          onClick={() => {
            if (window.confirm("Remove this note from the Knowledge Base?")) {
              deleteNote.mutate(note.id);
            }
          }}
          aria-label="Remove note"
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        {note.source_call ? (
          <>
            From <span className="font-medium text-foreground">{note.source_call}</span>
          </>
        ) : (
          "Added manually"
        )}
        {note.call_date && ` · ${note.call_date}`} · {note.state} ·{" "}
        {note.routing === "site-level" ? "Site-level" : "Program-level"}
      </p>
    </li>
  );
}

function ProgramDetail() {
  const { programId } = Route.useParams();
  const { data, isLoading, isError, error } = useProgram(programId);
  const updateProgram = useUpdateProgram();
  const [editing, setEditing] = useState(false);

  if (isLoading) {
    return (
      <main className="mx-auto w-full max-w-4xl px-5 py-8 text-sm text-muted-foreground md:px-8 md:py-10">
        Loading program…
      </main>
    );
  }

  if (isError || !data) {
    return (
      <main className="mx-auto w-full max-w-4xl px-5 py-8 md:px-8 md:py-10">
        <Link
          to="/knowledge-base"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" aria-hidden="true" /> Knowledge Base
        </Link>
        <p className="mt-6 text-sm text-foreground">
          {isError
            ? (error as Error).message
            : "This program doesn't exist (it may have been removed)."}
        </p>
      </main>
    );
  }

  const { program, notes, contacts, documents, attachments } = data;
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
            {program.administrator} · {program.level} · {program.jurisdiction} ·{" "}
            <span className="font-medium text-foreground">{stateLabel(program.state)}</span>
          </p>
        </div>
        <div className="flex items-end gap-4">
          <div className="text-right">
            <p className="text-xs font-medium text-muted-foreground">Coverage</p>
            <div className="mt-1 flex justify-end">
              <CoverageMeter value={program.coverage} />
            </div>
          </div>
          {!editing && (
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              <Pencil /> Edit
            </Button>
          )}
        </div>
      </div>

      {thin && (
        <div className="mt-5 flex items-start gap-3 border border-warning/40 bg-warning/10 px-4 py-3">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
          <p className="text-xs leading-5 text-foreground">
            <span className="font-medium">Thin — needs practitioner review.</span> This program has
            little approved source material. Confirm the administrator, funds, and eligibility, then
            raise its coverage.
          </p>
        </div>
      )}

      <div className="mt-6 space-y-5">
        {editing ? (
          <section className="border bg-card p-5">
            <h2 className="mb-4 text-sm font-semibold text-foreground">Edit program</h2>
            <ProgramForm
              program={program}
              submitLabel="Save changes"
              pending={updateProgram.isPending}
              onCancel={() => setEditing(false)}
              onSubmit={(fields) =>
                updateProgram.mutate(
                  { id: program.id, fields },
                  { onSuccess: () => setEditing(false) },
                )
              }
            />
          </section>
        ) : (
          <Section
            title="Overview"
            description="What it funds and who administers it."
            icon={BookOpen}
          >
            <p className="text-sm font-medium text-foreground">{program.funds}</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{program.overview}</p>
            {program.eligibility_criteria && (
              <div className="mt-4">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Eligibility
                </p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  {program.eligibility_criteria}
                </p>
              </div>
            )}
            {program.cities.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {program.cities.map((city) => (
                  <span
                    key={city}
                    className="rounded-full border bg-background px-2.5 py-0.5 text-xs text-muted-foreground"
                  >
                    Loaded for {city}
                  </span>
                ))}
              </div>
            )}
          </Section>
        )}

        <Section
          title="Source documents"
          description="Regulations, Consolidated Plans, and Annual Action Plans behind this program."
          icon={FileText}
          count={documents.length}
        >
          {documents.length === 0 ? (
            <EmptyState
              label="No approved source documents"
              hint="Nothing has been approved into this program yet. Upload regulations or plan documents in the Documents tab and link them to this program."
            />
          ) : (
            <ul className="divide-y">
              {documents.map((doc) => (
                <li
                  key={doc.id}
                  className="flex flex-wrap items-start justify-between gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{doc.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {doc.kind} · {doc.citation}
                    </p>
                  </div>
                  <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                    <CircleCheck className="size-3" aria-hidden="true" /> Approved {doc.approved_on}
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
          count={notes.length}
        >
          {notes.length === 0 ? (
            <EmptyState
              label="No practitioner knowledge yet"
              hint="Approve subsidy items in the Pipeline and link them to this program to fill in the expertise that isn't written down in any document."
            />
          ) : (
            <ul className="space-y-3">
              {notes.map((note) => (
                <NoteItem key={note.id} note={note} />
              ))}
            </ul>
          )}
        </Section>

        <Section
          title="Contacts"
          description="People who administer or gatekeep this program."
          icon={User}
          count={contacts.length}
        >
          {contacts.length === 0 ? (
            <EmptyState
              label="No contacts recorded"
              hint="Program contacts will appear here once they're captured."
            />
          ) : (
            <ul className="divide-y">
              {contacts.map((contact) => (
                <li
                  key={contact.id}
                  className="flex flex-wrap items-start justify-between gap-3 py-3 first:pt-0 last:pb-0"
                >
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
          description="Application packets and checklists, stored in Supabase Storage."
          icon={Paperclip}
          count={attachments.length}
        >
          {attachments.length > 0 && (
            <ul className="divide-y">
              {attachments.map((file) => (
                <li
                  key={file.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-2.5 first:pt-0"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <Paperclip
                      className="size-3.5 shrink-0 text-muted-foreground"
                      aria-hidden="true"
                    />
                    <span className="min-w-0">
                      <span className="block truncate text-sm text-foreground">{file.title}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {file.type} · {file.file_name}
                      </span>
                    </span>
                    <DocumentStatusBadge status={file.status} />
                  </span>
                  <DocumentActions doc={file} />
                </li>
              ))}
            </ul>
          )}
          <UploadArea programId={program.id} />
        </Section>
      </div>
    </main>
  );
}
