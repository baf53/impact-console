import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { dismissGrantFn, importGrantFn, listGrantFeedFn } from "@/functions/grants";
import { ACTIVITY_KEY, DASHBOARD_KEY, PIPELINE_KEYS } from "@/hooks/use-pipeline";

const GRANTS_KEY = ["grants-feed"] as const;

function errorMessage(err: unknown) {
  return err instanceof Error ? err.message : String(err);
}

export function useGrantFeed(keyword: string, enabled: boolean) {
  return useQuery({
    queryKey: [...GRANTS_KEY, keyword],
    queryFn: () => listGrantFeedFn({ data: keyword ? { keyword } : {} }),
    enabled,
    staleTime: 10 * 60_000,
  });
}

export function useImportGrant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => importGrantFn({ data: { id } }),
    onSuccess: (transcript) => {
      queryClient.invalidateQueries({ queryKey: GRANTS_KEY });
      queryClient.invalidateQueries({ queryKey: PIPELINE_KEYS.transcripts() });
      queryClient.invalidateQueries({ queryKey: ACTIVITY_KEY });
      queryClient.invalidateQueries({ queryKey: DASHBOARD_KEY });
      toast.success("Added to Intake", { description: transcript.project_label });
    },
    onError: (err) => toast.error("Could not add opportunity", { description: errorMessage(err) }),
  });
}

export function useDismissGrant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; title: string }) => dismissGrantFn({ data: vars }),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: GRANTS_KEY });
      toast("Opportunity dismissed", { description: vars.title });
    },
    onError: (err) => toast.error("Could not dismiss", { description: errorMessage(err) }),
  });
}
