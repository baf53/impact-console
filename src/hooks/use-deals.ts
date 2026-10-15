import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  createAlertFn,
  deleteAlertFn,
  deleteReportFn,
  generateReportFn,
  getChecklistFn,
  getDealsFn,
  listReportsFn,
  updateAlertFn,
  sendAlertFn,
  updateClientFn,
  ALERT_TRIGGERS,
  DEAL_STAGES,
} from "@/functions/deals";
import { ACTIVITY_KEY, DASHBOARD_KEY, DEALS_KEY, PIPELINE_KEYS } from "@/hooks/use-pipeline";

const REPORTS_KEY = [...DEALS_KEY, "reports"] as const;

function errorMessage(err: unknown) {
  return err instanceof Error ? err.message : String(err);
}

function useInvalidateDeals() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: DEALS_KEY });
    queryClient.invalidateQueries({ queryKey: PIPELINE_KEYS.clients() });
    queryClient.invalidateQueries({ queryKey: ACTIVITY_KEY });
    queryClient.invalidateQueries({ queryKey: DASHBOARD_KEY });
  };
}

export function useDeals() {
  return useQuery({ queryKey: [...DEALS_KEY, "overview"], queryFn: () => getDealsFn() });
}

export function useChecklist(clientId: string | null | undefined) {
  return useQuery({
    queryKey: [...DEALS_KEY, "checklist", clientId],
    queryFn: () => getChecklistFn({ data: { clientId: clientId! } }),
    enabled: Boolean(clientId),
  });
}

export function useReports() {
  return useQuery({ queryKey: REPORTS_KEY, queryFn: () => listReportsFn() });
}

export function useGenerateReport() {
  const invalidate = useInvalidateDeals();
  return useMutation({
    mutationFn: (clientId: string) => generateReportFn({ data: { clientId } }),
    onSuccess: (report) => {
      invalidate();
      toast.success("Report generated", { description: report.project_label });
      if (report.narrativeError) {
        toast.warning("Stacking analysis wasn't drafted", { description: report.narrativeError });
      }
    },
    onError: (err) => toast.error("Could not generate report", { description: errorMessage(err) }),
  });
}

export function useDeleteReport() {
  const invalidate = useInvalidateDeals();
  return useMutation({
    mutationFn: (id: string) => deleteReportFn({ data: { id } }),
    onSuccess: () => {
      invalidate();
      toast.success("Report deleted");
    },
    onError: (err) => toast.error("Could not delete report", { description: errorMessage(err) }),
  });
}

export function useUpdateClient() {
  const invalidate = useInvalidateDeals();
  return useMutation({
    mutationFn: (vars: {
      id: string;
      dealStage?: (typeof DEAL_STAGES)[number];
      alertsEnabled?: boolean;
    }) => updateClientFn({ data: vars }),
    onSuccess: (client, vars) => {
      invalidate();
      toast.success(
        vars.dealStage
          ? "Deal stage updated"
          : client.alerts_enabled
            ? "Alerts switched on"
            : "Alerts switched off",
        { description: client.client_name },
      );
    },
    onError: (err) => toast.error("Could not update client", { description: errorMessage(err) }),
  });
}

export function useCreateAlert() {
  const invalidate = useInvalidateDeals();
  return useMutation({
    mutationFn: (vars: {
      clientId: string;
      title: string;
      trigger: (typeof ALERT_TRIGGERS)[number];
      draftEmail: string;
    }) => createAlertFn({ data: vars }),
    onSuccess: () => {
      invalidate();
      toast.success("Alert drafted", { description: "It's waiting in the Alerts queue." });
    },
    onError: (err) => toast.error("Could not draft alert", { description: errorMessage(err) }),
  });
}

export function useUpdateAlert() {
  const invalidate = useInvalidateDeals();
  return useMutation({
    mutationFn: (vars: {
      id: string;
      draftEmail?: string;
      status?: "draft" | "approved" | "sent";
    }) => updateAlertFn({ data: vars }),
    onSuccess: (alert, vars) => {
      invalidate();
      toast.success(
        vars.status === "sent"
          ? "Marked as sent"
          : vars.status === "approved"
            ? "Alert approved"
            : vars.status === "draft"
              ? "Moved back to drafts"
              : "Draft saved",
        { description: alert.title },
      );
    },
    onError: (err) => toast.error("Could not update alert", { description: errorMessage(err) }),
  });
}

export function useDeleteAlert() {
  const invalidate = useInvalidateDeals();
  return useMutation({
    mutationFn: (id: string) => deleteAlertFn({ data: { id } }),
    onSuccess: () => {
      invalidate();
      toast("Alert dismissed", { description: "Nothing was sent to the client." });
    },
    onError: (err) => toast.error("Could not dismiss alert", { description: errorMessage(err) }),
  });
}

export function useSendAlert() {
  const invalidate = useInvalidateDeals();
  return useMutation({
    mutationFn: (id: string) => sendAlertFn({ data: { id } }),
    onSuccess: (alert) => {
      invalidate();
      toast.success("Alert emailed to the client", { description: alert.title });
    },
    onError: (err) => toast.error("Could not send email", { description: errorMessage(err) }),
  });
}
