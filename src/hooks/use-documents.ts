import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  createUploadUrlFn,
  deleteDocumentFn,
  getDocumentUrlFn,
  listDocumentsFn,
  registerDocumentFn,
  setDocumentStatusFn,
} from "@/functions/documents";
import { ACTIVITY_KEY, DASHBOARD_KEY, PROGRAMS_KEY } from "@/hooks/use-pipeline";
import { MAX_UPLOAD_BYTES, uploadToSignedUrl, type DocumentType } from "@/lib/documents";

const DOCUMENTS_KEY = ["documents"] as const;

function errorMessage(err: unknown) {
  return err instanceof Error ? err.message : String(err);
}

function useInvalidateDocuments() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: DOCUMENTS_KEY });
    queryClient.invalidateQueries({ queryKey: PROGRAMS_KEY });
    queryClient.invalidateQueries({ queryKey: ACTIVITY_KEY });
    queryClient.invalidateQueries({ queryKey: DASHBOARD_KEY });
  };
}

export function useDocuments() {
  return useQuery({ queryKey: DOCUMENTS_KEY, queryFn: () => listDocumentsFn() });
}

export type UploadInput = {
  file: File;
  title: string;
  type: DocumentType;
  programId?: string;
  clientId?: string;
};

export function useUploadDocument() {
  const invalidate = useInvalidateDocuments();
  return useMutation({
    mutationFn: async ({ file, title, type, programId, clientId }: UploadInput) => {
      if (file.size > MAX_UPLOAD_BYTES) {
        throw new Error(`${file.name} is larger than 50 MB.`);
      }
      const scope = {
        ...(programId ? { programId } : {}),
        ...(clientId ? { clientId } : {}),
      };
      const { path, signedUrl } = await createUploadUrlFn({
        data: { fileName: file.name, ...scope },
      });
      await uploadToSignedUrl(signedUrl, file);
      return registerDocumentFn({ data: { path, fileName: file.name, title, type, ...scope } });
    },
    onSuccess: (doc) => {
      invalidate();
      toast.success("Uploaded as Pending review", {
        description: `${doc.title} stays out of the chatbot's corpus until you approve it.`,
      });
    },
    onError: (err) => toast.error("Upload failed", { description: errorMessage(err) }),
  });
}

export function useSetDocumentStatus() {
  const invalidate = useInvalidateDocuments();
  return useMutation({
    mutationFn: (vars: { id: string; status: "Approved" | "Pending review" }) =>
      setDocumentStatusFn({ data: vars }),
    onSuccess: (doc) => {
      invalidate();
      toast.success(doc.status === "Approved" ? "Document approved" : "Moved back to review", {
        description: doc.title,
      });
    },
    onError: (err) => toast.error("Could not update document", { description: errorMessage(err) }),
  });
}

export function useDownloadDocument() {
  return useMutation({
    mutationFn: (id: string) => getDocumentUrlFn({ data: { id } }),
    onSuccess: ({ url }) => {
      window.location.assign(url);
      toast.success("Download started");
    },
    onError: (err) => toast.error("Download failed", { description: errorMessage(err) }),
  });
}

export function useDeleteDocument() {
  const invalidate = useInvalidateDocuments();
  return useMutation({
    mutationFn: (id: string) => deleteDocumentFn({ data: { id } }),
    onSuccess: () => {
      invalidate();
      toast.success("Document deleted");
    },
    onError: (err) => toast.error("Could not delete document", { description: errorMessage(err) }),
  });
}
