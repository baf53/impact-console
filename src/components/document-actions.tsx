import { Check, Download, Trash2, Undo2 } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import type { DocumentRow } from "@/functions/documents";
import {
  useDeleteDocument,
  useDownloadDocument,
  useSetDocumentStatus,
} from "@/hooks/use-documents";
import { cn } from "@/lib/utils";

export function DocumentStatusBadge({ status }: { status: DocumentRow["status"] }) {
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium",
        status === "Approved"
          ? "bg-primary/10 text-primary"
          : "bg-warning/15 text-warning-foreground",
      )}
    >
      {status}
    </span>
  );
}

export function DocumentActions({ doc }: { doc: DocumentRow }) {
  const download = useDownloadDocument();
  const setStatus = useSetDocumentStatus();
  const remove = useDeleteDocument();

  return (
    <div className="flex items-center justify-end gap-1">
      {doc.status === "Approved" ? (
        <Button
          variant="ghost"
          size="sm"
          disabled={setStatus.isPending}
          onClick={() => setStatus.mutate({ id: doc.id, status: "Pending review" })}
          aria-label={`Move ${doc.title} back to review`}
        >
          <Undo2 /> Unapprove
        </Button>
      ) : (
        <Button
          variant="outline"
          size="sm"
          disabled={setStatus.isPending}
          onClick={() => setStatus.mutate({ id: doc.id, status: "Approved" })}
          aria-label={`Approve ${doc.title}`}
        >
          <Check /> Approve
        </Button>
      )}
      <Button
        variant="ghost"
        size="sm"
        disabled={!doc.storage_path || download.isPending}
        onClick={() => download.mutate(doc.id)}
        aria-label={`Download ${doc.title}`}
      >
        <Download /> Download
      </Button>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="ghost" size="icon" aria-label={`Delete ${doc.title}`}>
            <Trash2 className="size-4" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{doc.title}”?</AlertDialogTitle>
            <AlertDialogDescription>
              The file is removed from storage and the chatbot can no longer cite it. This can't be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => remove.mutate(doc.id)}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
