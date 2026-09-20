import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Download, FileText, Search, Upload, X } from "lucide-react";
import { toast } from "sonner";

import {
  consoleStore,
  documentTypes,
  useConsoleData,
  type LibraryDocument,
  type LibraryDocumentType,
} from "@/lib/mock-data";
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
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/documents")({
  head: () => ({
    meta: [
      { title: "Documents — Collective Impact" },
      {
        name: "description",
        content:
          "Search, filter, download, and upload every source document in the funding corpus.",
      },
      { property: "og:title", content: "Documents — Collective Impact" },
      {
        property: "og:description",
        content:
          "Search, filter, download, and upload every source document in the funding corpus.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DocumentsPage,
});

const ALL = "__all__";

function downloadPlaceholder(doc: LibraryDocument) {
  const body = [
    doc.title,
    "",
    `Type: ${doc.type}`,
    `Program: ${doc.program}`,
    `Jurisdiction: ${doc.jurisdiction}`,
    `Status: ${doc.status}`,
    `Added: ${doc.addedOn}`,
    "",
    "Placeholder file — the real source document is not bundled in this console.",
  ].join("\n");
  const url = URL.createObjectURL(new Blob([body], { type: "text/plain" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = doc.fileName.replace(/\.pdf$/, ".txt");
  link.click();
  URL.revokeObjectURL(url);
  toast.success("Download started", { description: doc.title });
}

function UploadForm({ onClose }: { onClose: () => void }) {
  const data = useConsoleData();
  const [title, setTitle] = useState("");
  const [fileName, setFileName] = useState("");
  const [type, setType] = useState<LibraryDocumentType>("Agency guidance");
  const [program, setProgram] = useState("");
  const [jurisdiction, setJurisdiction] = useState("");

  const programs = Array.from(new Set(data.documents.map((doc) => doc.program))).sort();
  const jurisdictions = Array.from(
    new Set(data.documents.map((doc) => doc.jurisdiction)),
  ).sort();

  const submit = () => {
    if (!title.trim() || !program || !jurisdiction) {
      toast.error("Add a title, program, and jurisdiction first.");
      return;
    }
    const entry: LibraryDocument = {
      id: `doc-${Date.now()}`,
      title: title.trim(),
      type,
      program,
      jurisdiction,
      status: "Pending review",
      addedOn: "Today",
      fileName: fileName || `${title.trim().toLowerCase().replace(/\s+/g, "-")}.pdf`,
    };
    consoleStore.update((current) => ({
      ...current,
      documents: [entry, ...current.documents],
    }));
    toast.success("Uploaded as Pending review", {
      description: "It stays out of the corpus until you approve it.",
    });
    onClose();
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
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              setFileName(file.name);
              if (!title) setTitle(file.name.replace(/\.[^.]+$/, ""));
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
          <Label>Type</Label>
          <Select value={type} onValueChange={(value) => setType(value as LibraryDocumentType)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {documentTypes.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label>Program</Label>
          <Select value={program} onValueChange={setProgram}>
            <SelectTrigger>
              <SelectValue placeholder="Select a program" />
            </SelectTrigger>
            <SelectContent>
              {programs.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label>Jurisdiction</Label>
          <Select value={jurisdiction} onValueChange={setJurisdiction}>
            <SelectTrigger>
              <SelectValue placeholder="Select a jurisdiction" />
            </SelectTrigger>
            <SelectContent>
              {jurisdictions.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2 md:col-span-2">
          <Button onClick={submit}>Add to library</Button>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <span className="text-xs text-muted-foreground">
            New uploads land as “Pending review” and stay out of the corpus.
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function DocumentsPage() {
  const data = useConsoleData();
  const [query, setQuery] = useState("");
  const [type, setType] = useState(ALL);
  const [program, setProgram] = useState(ALL);
  const [jurisdiction, setJurisdiction] = useState(ALL);
  const [uploadOpen, setUploadOpen] = useState(false);

  const programs = useMemo(
    () => Array.from(new Set(data.documents.map((doc) => doc.program))).sort(),
    [data.documents],
  );
  const jurisdictions = useMemo(
    () => Array.from(new Set(data.documents.map((doc) => doc.jurisdiction))).sort(),
    [data.documents],
  );

  const rows = data.documents.filter((doc) => {
    const matchesQuery =
      query.trim() === "" ||
      `${doc.title} ${doc.program} ${doc.jurisdiction}`
        .toLowerCase()
        .includes(query.trim().toLowerCase());
    return (
      matchesQuery &&
      (type === ALL || doc.type === type) &&
      (program === ALL || doc.program === program) &&
      (jurisdiction === ALL || doc.jurisdiction === jurisdiction)
    );
  });

  const clearFilters = () => {
    setQuery("");
    setType(ALL);
    setProgram(ALL);
    setJurisdiction(ALL);
  };

  const filtersActive =
    query.trim() !== "" || type !== ALL || program !== ALL || jurisdiction !== ALL;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-4 md:p-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Documents</h1>
          <p className="text-sm text-muted-foreground">
            Every source document behind the corpus — searchable, filterable, downloadable.
          </p>
        </div>
        <Button onClick={() => setUploadOpen(true)}>
          <Upload />
          Upload document
        </Button>
      </header>

      {uploadOpen ? <UploadForm onClose={() => setUploadOpen(false)} /> : null}

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
              {documentTypes.map((item) => (
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
          <Select value={jurisdiction} onValueChange={setJurisdiction}>
            <SelectTrigger aria-label="Filter by jurisdiction">
              <SelectValue placeholder="Jurisdiction" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All jurisdictions</SelectItem>
              {jurisdictions.map((item) => (
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
            {data.documents.filter((doc) => doc.status === "Pending review").length} pending review
          </span>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="border-b text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-6 py-3 text-left font-medium">Document</th>
                  <th className="px-3 py-3 text-left font-medium">Type</th>
                  <th className="px-3 py-3 text-left font-medium">Program</th>
                  <th className="px-3 py-3 text-left font-medium">Jurisdiction</th>
                  <th className="px-3 py-3 text-left font-medium">Status</th>
                  <th className="px-3 py-3 text-left font-medium">Added</th>
                  <th className="px-6 py-3 text-right font-medium">File</th>
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
                          <p className="truncate text-xs text-muted-foreground">{doc.fileName}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <Badge variant="outline">{doc.type}</Badge>
                    </td>
                    <td className="px-3 py-3 text-muted-foreground">{doc.program}</td>
                    <td className="px-3 py-3 text-muted-foreground">{doc.jurisdiction}</td>
                    <td className="px-3 py-3">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                          doc.status === "Approved"
                            ? "bg-primary/10 text-primary"
                            : "bg-warning/15 text-warning-foreground",
                        )}
                      >
                        {doc.status}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-muted-foreground">{doc.addedOn}</td>
                    <td className="px-6 py-3 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => downloadPlaceholder(doc)}
                        aria-label={`Download ${doc.title}`}
                      >
                        <Download />
                        Download
                      </Button>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-sm text-muted-foreground">
                      No documents match these filters.
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
