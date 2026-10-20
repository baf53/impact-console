import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { getDashboardFn } from "@/functions/dashboard";
import {
  createProgramFn,
  deleteNoteFn,
  deleteProgramFn,
  getProgramFn,
  listProgramSummariesFn,
  updateProgramFn,
  type ProgramInput,
} from "@/functions/knowledge";
import { ACTIVITY_KEY, DASHBOARD_KEY, DEALS_KEY, PROGRAMS_KEY } from "@/hooks/use-pipeline";

const KNOWLEDGE_KEYS = {
  summaries: () => [...PROGRAMS_KEY, "summaries"] as const,
  detail: (id: string) => [...PROGRAMS_KEY, "detail", id] as const,
};

function errorMessage(err: unknown) {
  return err instanceof Error ? err.message : String(err);
}

export function useDashboard() {
  return useQuery({ queryKey: DASHBOARD_KEY, queryFn: () => getDashboardFn() });
}

export function useProgramSummaries() {
  return useQuery({
    queryKey: KNOWLEDGE_KEYS.summaries(),
    queryFn: () => listProgramSummariesFn(),
  });
}

export function useProgram(id: string) {
  return useQuery({
    queryKey: KNOWLEDGE_KEYS.detail(id),
    queryFn: () => getProgramFn({ data: { id } }),
  });
}

function useInvalidateKnowledge() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: PROGRAMS_KEY });
    queryClient.invalidateQueries({ queryKey: ACTIVITY_KEY });
    queryClient.invalidateQueries({ queryKey: DASHBOARD_KEY });
    queryClient.invalidateQueries({ queryKey: DEALS_KEY });
  };
}

export function useCreateProgram() {
  const invalidate = useInvalidateKnowledge();
  return useMutation({
    mutationFn: (fields: ProgramInput) => createProgramFn({ data: fields }),
    onSuccess: (program) => {
      invalidate();
      toast.success("Program added to the Knowledge Base", {
        description: program.alertsDrafted
          ? `${program.name} · ${program.state} · ${program.alertsDrafted} client alert${program.alertsDrafted > 1 ? "s" : ""} drafted for review`
          : `${program.name} · ${program.state}`,
      });
    },
    onError: (err) => toast.error("Could not add program", { description: errorMessage(err) }),
  });
}

export function useUpdateProgram() {
  const invalidate = useInvalidateKnowledge();
  return useMutation({
    mutationFn: (vars: { id: string; fields: ProgramInput }) => updateProgramFn({ data: vars }),
    onSuccess: (program) => {
      invalidate();
      toast.success("Program updated", { description: `${program.name} · ${program.state}` });
    },
    onError: (err) => toast.error("Could not update program", { description: errorMessage(err) }),
  });
}

export function useDeleteNote() {
  const invalidate = useInvalidateKnowledge();
  return useMutation({
    mutationFn: (id: string) => deleteNoteFn({ data: { id } }),
    onSuccess: () => {
      invalidate();
      toast.success("Note removed from the Knowledge Base");
    },
    onError: (err) => toast.error("Could not remove note", { description: errorMessage(err) }),
  });
}

export function useDeleteProgram() {
  const invalidate = useInvalidateKnowledge();
  return useMutation({
    mutationFn: (id: string) => deleteProgramFn({ data: { id } }),
    onSuccess: (result) => {
      invalidate();
      toast.success("Program deleted", { description: result.name });
    },
    onError: (err) => toast.error("Could not delete program", { description: errorMessage(err) }),
  });
}
