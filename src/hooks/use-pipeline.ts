import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { STAGE_LABELS, type ExtractionRow, type TranscriptWithExtractions } from "@/lib/pipeline";
import {
  approveTranscriptFn,
  createOpportunityFn,
  getIntegrationStatusFn,
  ingestTranscriptFn,
  listClientsFn,
  listProgramsFn,
  listTranscriptsFn,
  runExtractionFn,
  updateExtractionFn,
  updateTranscriptStageFn,
} from "@/functions/pipeline";

export const PIPELINE_KEYS = {
  all: ["pipeline"] as const,
  clients: () => [...PIPELINE_KEYS.all, "clients"] as const,
  transcripts: () => [...PIPELINE_KEYS.all, "transcripts"] as const,
  status: () => [...PIPELINE_KEYS.all, "integration-status"] as const,
};

/** Shared with the Knowledge Base and Dashboard so approvals refresh them too. */
export const PROGRAMS_KEY = ["programs"] as const;
export const ACTIVITY_KEY = ["activity-log"] as const;
export const DASHBOARD_KEY = ["dashboard"] as const;
export const DEALS_KEY = ["deals"] as const;

function errorMessage(err: unknown) {
  return err instanceof Error ? err.message : String(err);
}

function patchTranscripts(
  queryClient: QueryClient,
  update: (list: TranscriptWithExtractions[]) => TranscriptWithExtractions[],
) {
  const previous = queryClient.getQueryData<TranscriptWithExtractions[]>(
    PIPELINE_KEYS.transcripts(),
  );
  if (previous) queryClient.setQueryData(PIPELINE_KEYS.transcripts(), update(previous));
  return previous;
}

function invalidateFeeds(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: ACTIVITY_KEY });
  queryClient.invalidateQueries({ queryKey: DASHBOARD_KEY });
}

/* --------------------------------- queries -------------------------------- */

export function useIntegrationStatus() {
  return useQuery({
    queryKey: PIPELINE_KEYS.status(),
    queryFn: () => getIntegrationStatusFn(),
    staleTime: 60_000,
  });
}

export function useClients() {
  return useQuery({ queryKey: PIPELINE_KEYS.clients(), queryFn: () => listClientsFn() });
}

export function useTranscripts() {
  return useQuery({ queryKey: PIPELINE_KEYS.transcripts(), queryFn: () => listTranscriptsFn() });
}

export function usePrograms() {
  return useQuery({ queryKey: PROGRAMS_KEY, queryFn: () => listProgramsFn() });
}

/* -------------------------------- mutations ------------------------------- */

export function useIngestTranscript() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof ingestTranscriptFn>[0]["data"]) =>
      ingestTranscriptFn({ data }),
    onSuccess: (transcript) => {
      queryClient.invalidateQueries({ queryKey: PIPELINE_KEYS.transcripts() });
      queryClient.invalidateQueries({ queryKey: PIPELINE_KEYS.clients() });
      invalidateFeeds(queryClient);
      toast.success("Transcript saved to Intake", {
        description: `${transcript.project_label} (${transcript.source})`,
      });
    },
    onError: (err) =>
      toast.error("Could not ingest transcript", { description: errorMessage(err) }),
  });
}

export function useCreateOpportunity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof createOpportunityFn>[0]["data"]) =>
      createOpportunityFn({ data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PIPELINE_KEYS.transcripts() });
      invalidateFeeds(queryClient);
      toast.success("Added to Intake", {
        description: "Nothing is live until it reaches the Approved column.",
      });
    },
    onError: (err) => toast.error("Could not add opportunity", { description: errorMessage(err) }),
  });
}

export function useRunExtraction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (transcriptId: string) => runExtractionFn({ data: { transcriptId } }),
    onMutate: async (transcriptId) => {
      await queryClient.cancelQueries({ queryKey: PIPELINE_KEYS.transcripts() });
      const previous = patchTranscripts(queryClient, (list) =>
        list.map((t) => (t.id === transcriptId ? { ...t, status: "extracting" } : t)),
      );
      return { previous };
    },
    onSuccess: (result) => {
      toast.success(`${result.count} items extracted`, {
        description: result.dropped
          ? `${result.dropped} items didn't match the 5-bucket schema and were dropped.`
          : "Review them in the side panel.",
      });
    },
    onError: (err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(PIPELINE_KEYS.transcripts(), context.previous);
      }
      toast.error("AI extraction failed", { description: errorMessage(err) });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: PIPELINE_KEYS.transcripts() });
      invalidateFeeds(queryClient);
    },
  });
}

export function useUpdateTranscriptStage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; stage: "intake" | "extracted" | "in-review" }) =>
      updateTranscriptStageFn({ data: vars }),
    onMutate: async ({ id, stage }) => {
      await queryClient.cancelQueries({ queryKey: PIPELINE_KEYS.transcripts() });
      const previous = patchTranscripts(queryClient, (list) =>
        list.map((t) => (t.id === id ? { ...t, stage } : t)),
      );
      return { previous };
    },
    onSuccess: (_data, { stage }) => toast.success(`Moved to ${STAGE_LABELS[stage]}`),
    onError: (err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(PIPELINE_KEYS.transcripts(), context.previous);
      }
      toast.error("Could not move card", { description: errorMessage(err) });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: PIPELINE_KEYS.transcripts() });
      invalidateFeeds(queryClient);
    },
  });
}

type ExtractionPatch = Partial<Pick<ExtractionRow, "status" | "title" | "body" | "routing">>;

const PATCH_TOASTS: Record<ExtractionRow["status"], string> = {
  approved: "Item approved",
  rejected: "Item rejected",
  pending: "Item moved back to pending",
};

export function useUpdateExtraction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; patch: ExtractionPatch }) =>
      updateExtractionFn({ data: vars }),
    onMutate: async ({ id, patch }) => {
      await queryClient.cancelQueries({ queryKey: PIPELINE_KEYS.transcripts() });
      const previous = patchTranscripts(queryClient, (list) =>
        list.map((t) => ({
          ...t,
          extractions: t.extractions.map((e) => (e.id === id ? { ...e, ...patch } : e)),
        })),
      );
      return { previous };
    },
    onSuccess: (_data, { patch }) => {
      if (patch.status) toast.success(PATCH_TOASTS[patch.status]);
      else if (patch.body || patch.title) toast.success("Edit saved");
      else if (patch.routing) toast.success("Routing updated");
    },
    onError: (err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(PIPELINE_KEYS.transcripts(), context.previous);
      }
      toast.error("Could not update item", { description: errorMessage(err) });
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: PIPELINE_KEYS.transcripts() }),
  });
}

export function useApproveTranscript() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { transcriptId: string; programLinks: Record<string, string> }) =>
      approveTranscriptFn({ data: vars }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: PIPELINE_KEYS.transcripts() });
      queryClient.invalidateQueries({ queryKey: PIPELINE_KEYS.clients() });
      queryClient.invalidateQueries({ queryKey: PROGRAMS_KEY });
      queryClient.invalidateQueries({ queryKey: DEALS_KEY });
      invalidateFeeds(queryClient);
      toast.success("Transcript approved", {
        description:
          result.notes > 0
            ? `${result.notes} subsidy notes sent to the Knowledge Base${result.createdPrograms ? ` · ${result.createdPrograms} new program${result.createdPrograms > 1 ? "s" : ""} created` : ""}`
            : `${result.approved} items approved for this deal`,
      });
    },
    onError: (err) =>
      toast.error("Could not approve transcript", { description: errorMessage(err) }),
  });
}
