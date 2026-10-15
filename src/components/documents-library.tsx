import { useMemo, useState } from "react";
import { FileText, Search, Upload, X } from "lucide-react";
import { toast } from "sonner";

import { DocumentActions, DocumentStatusBadge } from "@/components/document-actions";
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
import { useDocuments, useUploadDocument } from "@/hooks/use-documents";
import { usePrograms } from "@/hooks/use-pipeline";
import { DOCUMENT_TYPES, type DocumentType } from "@/lib/documents";

const ALL = "__all__";
const NO_PROGRAM = "__none__";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function UploadForm({ onClose }: { onClose: () => void }) {
  const { data: programs = [] } = usePrograms();
  const upload = useUploadDocument();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [type, setType] = useState<DocumentType>("Agency guidance");
  const [programId, setProgramId] = useState(NO_PROGRAM);

  const submit = () => {
    if (!file || !title.trim()) {
      toast.error("Choose a file and give it a title first.");
      return;
    }
    upload.mutate(
      {
        file,
        title: title.trim(),
        type,
        ...(programId !== NO_PROGRAM ? { programId } : {}),
      },
      { onSuccess: onClose },
    );
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">Upload document</CardTitle>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close upload form">
          <X />
        </Button>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        <div className="grid gap-2 md:col-span-2">
          <Label htmlFor="doc-file">File</Label>
          <Input
            id="doc-file"
            type="file"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.png,.jpg,.jpeg"
            onChange={(event) => {
              const chosen = event.target.files?.[0] ?? null;
              setFile(chosen);
              if (chosen && !title) setTitle(chosen.name.replace(/\.[^.]+$/, ""));
            }}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="doc-title">Title</Label>
          <Input
            id="doc-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="e.g. 2026 HOME Program Guidelines"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="doc-type">Type</Label>
          <Select value={type} onValueChange={(value) => setType(value as DocumentType)}>
            <SelectTrigger id="doc-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DOCUMENT_TYPES.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2 md:col-span-2">
          <Label htmlFor="doc-program">Program</Label>
          <Select value={programId} onValueChange={setProgramId}>
            <SelectTrigger id="doc-program">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_PROGRAM}>Not linked to a program</SelectItem>
              {programs.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name} · {p.state}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Linking a program tags the document with that program's state for the chatbot.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 md:col-span-2">
          <Button onClick={submit} disabled={upload.isPending}>
            {upload.isPending ? "Uploading…" : "Upload"}
          </Button>
          <Button variant="ghost" onClick={onClose} disabled={upload.isPending}>
            Cancel
          </Button>
          <span className="text-xs text-muted-foreground">
            New uploads land as “Pending review” and stay out of the corpus until approved.
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

export function DocumentsLibrary() {
  const { data: documents = [], isLoading, isError, error, refetch } = useDocuments();
  const [query, setQuery] = useState("");
  const [type, setType] = useState(ALL);
  const [program, setProgram] = useState(ALL);
  const [state, setState] = useState(ALL);
  const [uploadOpen, setUploadOpen] = useState(false);

  const programs = useMemo(
    () =>
      Array.from(new Set(documents.map((doc) => doc.program).filter(Boolean))).sort() as string[],
    [documents],
  );
  const states = useMemo(
    () => Array.from(new Set(documents.map((doc) => doc.state).filter(Boolean))).sort() as string[],
    [documents],
  );

  const rows = documents.filter((doc) => {
    const haystack = `${doc.title} ${doc.file_name} ${doc.program ?? ""} ${doc.jurisdiction ?? ""}`;
    return (
      (query.trim() === "" || haystack.toLowerCase().includes(query.trim().toLowerCase())) &&
      (type === ALL || doc.type === type) &&
      (program === ALL || doc.program === program) &&
      (state === ALL || doc.state === state)
    );
  });

  const clearFilters = () => {
    setQuery("");
    setType(ALL);
    setProgram(ALL);
    setState(ALL);
  };
  const filtersActive = query.trim() !== "" || type !== ALL || program !== ALL || state !== ALL;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold tracking-tight">Documents</h2>
          <p className="text-sm text-muted-foreground">
            Source documents behind the corpus, stored in Supabase Storage. Only approved documents
            that aren't tied to a client are visible to the chatbot.
          </p>
        </div>
        <Button onClick={() => setUploadOpen(true)}>
          <Upload />
          Upload document
        </Button>
      </header>

      {uploadOpen ? <UploadForm onClose={() => setUploadOpen(false)} /> : null}

      {isError && (
        <div className="flex flex-wrap items-center justify-between gap-3 border border-destructive/40 bg-destructive/5 px-4 py-3 text-xs text-foreground">
          <span>{(error as Error).message}</span>
          <Button size="sm" variant="outline" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      )}

      <Card>
        <CardContent className="grid gap-3 pt-6 md:grid-cols-[minmax(0,1.6fr)_repeat(3,minmax(0,1fr))_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search documents"
              aria-label="Search documents"
              className="pl-9"
            />
          </div>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger aria-label="Filter by type">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All types</SelectItem>
              {DOCUMENT_TYPES.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={program} onValueChange={setProgram}>
            <SelectTrigger aria-label="Filter by program">
              <SelectValue placeholder="Program" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All programs</SelectItem>
              {programs.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={state} onValueChange={setState}>
            <SelectTrigger aria-label="Filter by state">
              <SelectValue placeholder="State" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All states</SelectItem>
              {states.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="ghost" onClick={clearFilters} disabled={!filtersActive}>
            Clear
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">
            {rows.length} {rows.length === 1 ? "document" : "documents"}
          </CardTitle>
          <span className="text-xs text-muted-foreground">
            {documents.filter((doc) => doc.status === "Pending review").length} pending review
          </span>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-sm">
              <thead className="border-b text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-6 py-3 text-left font-medium">Document</th>
                  <th className="px-3 py-3 text-left font-medium">Type</th>
                  <th className="px-3 py-3 text-left font-medium">Program</th>
                  <th className="px-3 py-3 text-left font-medium">State</th>
                  <th className="px-3 py-3 text-left font-medium">Status</th>
                  <th className="px-3 py-3 text-left font-medium">Added</th>
                  <th className="px-6 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((doc) => (
                  <tr key={doc.id} className="border-b last:border-0 hover:bg-muted/40">
                    <td className="px-6 py-3">
                      <div className="flex items-start gap-3">
                        <FileText className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                        <div className="min-w-0">
                          <p className="font-medium leading-tight">{doc.title}</p>
                          <p className="truncate text-xs text-muted-foreground">{doc.file_name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <Badge variant="outline">{doc.type}</Badge>
                    </td>
                    <td className="px-3 py-3 text-muted-foreground">{doc.program ?? "—"}</td>
                    <td className="px-3 py-3 text-muted-foreground">{doc.state ?? "—"}</td>
                    <td className="px-3 py-3">
                      <DocumentStatusBadge status={doc.status} />
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-muted-foreground">
                      {formatDate(doc.created_at)}
                    </td>
                    <td className="px-6 py-3">
                      <DocumentActions doc={doc} />
                    </td>
                  </tr>
                ))}
                {rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-6 py-12 text-center text-sm text-muted-foreground"
                    >
                      {isLoading
                        ? "Loading documents…"
                        : documents.length === 0
                          ? "No documents yet. Upload guidelines, NOFAs, or application forms."
                          : "No documents match these filters."}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
