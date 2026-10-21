import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  addGoldenFn,
  deleteAnswerFn,
  deleteGoldenFn,
  listAnswerLogFn,
  logAnswerFn,
  reviewAnswerFn,
  runGoldenFn,
} from "@/functions/answers";
import { getChatbotViewFn, previewAnswerFn } from "@/functions/assistant";
import { ACTIVITY_KEY, DASHBOARD_KEY, PROGRAMS_KEY } from "@/hooks/use-pipeline";

const ANSWERS_KEY = ["answer-log"] as const;

type VisitorState = Parameters<typeof getChatbotViewFn>[0]["data"]["state"];

function errorMessage(err: unknown) {
  return err instanceof Error ? err.message : String(err);
}

function useInvalidateAnswers() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ANSWERS_KEY });
    queryClient.invalidateQueries({ queryKey: ACTIVITY_KEY });
    queryClient.invalidateQueries({ queryKey: DASHBOARD_KEY });
  };
}

/* ------------------------------ chatbot preview ----------------------------- */

export function useChatbotView(state: VisitorState) {
  return useQuery({
    queryKey: [...PROGRAMS_KEY, "chatbot-view", state],
    queryFn: () => getChatbotViewFn({ data: { state } }),
  });
}

export function usePreviewAnswer() {
  return useMutation({
    mutationFn: (vars: { question: string; state: VisitorState }) =>
      previewAnswerFn({ data: vars }),
    onError: (err) => toast.error("Preview failed", { description: errorMessage(err) }),
  });
}

/* --------------------------------- answer log -------------------------------- */

export function useAnswerLog() {
  return useQuery({ queryKey: ANSWERS_KEY, queryFn: () => listAnswerLogFn() });
}

export function useLogAnswer() {
  const invalidate = useInvalidateAnswers();
  return useMutation({
    mutationFn: (vars: Parameters<typeof logAnswerFn>[0]["data"]) => logAnswerFn({ data: vars }),
    onSuccess: () => {
      invalidate();
      toast.success("Answer logged", { description: "Review it in the Answer Log." });
    },
    onError: (err) => toast.error("Could not log answer", { description: errorMessage(err) }),
  });
}

export function useReviewAnswer() {
  const invalidate = useInvalidateAnswers();
  return useMutation({
    mutationFn: (vars: Parameters<typeof reviewAnswerFn>[0]["data"]) =>
      reviewAnswerFn({ data: vars }),
    onSuccess: (_row, vars) => {
      invalidate();
      if (vars.rating) toast.success("Rating saved");
      else if (vars.failureCause) toast.success("Failure cause saved");
      else if (vars.reviewNote !== undefined) toast.success("Note saved");
    },
    onError: (err) => toast.error("Could not save review", { description: errorMessage(err) }),
  });
}

export function useDeleteAnswer() {
  const invalidate = useInvalidateAnswers();
  return useMutation({
    mutationFn: (id: string) => deleteAnswerFn({ data: { id } }),
    onSuccess: () => {
      invalidate();
      toast.success("Answer removed from the log");
    },
    onError: (err) => toast.error("Could not delete answer", { description: errorMessage(err) }),
  });
}

/* --------------------------------- golden set -------------------------------- */

export function useAddGolden() {
  const invalidate = useInvalidateAnswers();
  return useMutation({
    mutationFn: (vars: Parameters<typeof addGoldenFn>[0]["data"]) => addGoldenFn({ data: vars }),
    onSuccess: () => {
      invalidate();
      toast.success("Added to the Golden Set", {
        description: "It's now part of the assistant's acceptance test.",
      });
    },
    onError: (err) =>
      toast.error("Could not add to the Golden Set", { description: errorMessage(err) }),
  });
}

export function useDeleteGolden() {
  const invalidate = useInvalidateAnswers();
  return useMutation({
    mutationFn: (id: string) => deleteGoldenFn({ data: { id } }),
    onSuccess: () => {
      invalidate();
      toast.success("Removed from the Golden Set");
    },
    onError: (err) => toast.error("Could not remove entry", { description: errorMessage(err) }),
  });
}

export function useRunGolden() {
  const invalidate = useInvalidateAnswers();
  return useMutation({
    mutationFn: (id: string) => runGoldenFn({ data: { id } }),
    onSuccess: (row) => {
      invalidate();
      if (row.last_run_passed)
        toast.success("Check passed", { description: row.last_run_reason ?? "" });
      else toast.error("Check failed", { description: row.last_run_reason ?? "" });
    },
    onError: (err) => toast.error("Could not run the check", { description: errorMessage(err) }),
  });
}
