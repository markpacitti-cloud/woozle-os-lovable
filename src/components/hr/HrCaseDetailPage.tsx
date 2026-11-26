import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Check, Circle, LockKeyhole, Send } from "lucide-react";
import { toast } from "sonner";

import { HrNotesPanel } from "@/components/hr/HrNotesPanel";
import { HrRequestsTable } from "@/components/hr/HrRequestsTable";
import { HrSendDocumentDialog } from "@/components/hr/HrSendDocumentDialog";
import {
  HrDetail,
  HrEmpty,
  HrError,
  HrLoading,
  HrPage,
  HrPermissionMessage,
  HrSection,
  HrStatusBadge,
} from "@/components/hr/HrShared";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { formatDate, formatDateTime } from "@/lib/format";
import { getNextDocumentStep } from "@/lib/hr";
import type { HrCase, HrRequest } from "@/lib/hr-types";
import { api, getErrorMessage } from "@/lib/supabase";

export function HrCaseDetailPage({ caseId }: { caseId: string }) {
  const { access, handleApiError } = useAuth();
  const canView = Boolean(access?.hr_admin_view || access?.hr_team || access?.is_global_admin);
  const [sendOpen, setSendOpen] = useState(false);
  const [closeOpen, setCloseOpen] = useState(false);
  const [outcome, setOutcome] = useState("");
  const [busy, setBusy] = useState(false);
  const caseQuery = useQuery({
    queryKey: ["hr-case", caseId],
    enabled: canView,
    queryFn: async () => {
      const { data, error } = await api
        .from("hr_cases_list")
        .select("*")
        .eq("id", caseId)
        .maybeSingle();
      if (error) {
        handleApiError(error);
        throw error;
      }
      return (data ?? null) as HrCase | null;
    },
  });
  const requestsQuery = useQuery({
    queryKey: ["hr-case-requests", caseId],
    enabled: canView,
    queryFn: async () => {
      const { data, error } = await api
        .from("hr_requests_list")
        .select("*")
        .eq("case_id", caseId)
        .order("sent_at", { ascending: false });
      if (error) {
        handleApiError(error);
        throw error;
      }
      return (data ?? []) as HrRequest[];
    },
  });
  if (!canView) return <HrPermissionMessage area="Case" />;
  if (caseQuery.isPending) return <HrLoading rows={7} />;
  if (caseQuery.isError || !caseQuery.data)
    return (
      <div className="p-5">
        <HrError
          message={
            caseQuery.isError ? getErrorMessage(caseQuery.error) : "This case is not available."
          }
          retry={() => void caseQuery.refetch()}
        />
      </div>
    );
  const item = caseQuery.data;
  const nextStep = getNextDocumentStep(item.steps);
  const refresh = async () => {
    await Promise.all([caseQuery.refetch(), requestsQuery.refetch()]);
  };
  const setStatus = async (status: "open" | "on_hold") => {
    const { error } = await api.rpc("hr_update_case", {
      p_case_id: item.id,
      p_changes: { status },
    });
    if (error) {
      handleApiError(error);
      return;
    }
    toast.success(status === "open" ? "Case reopened" : "Case put on hold");
    await caseQuery.refetch();
  };
  const tick = async (stepKey: string, done: boolean) => {
    const { error } = await api.rpc("hr_tick_step", {
      p_case_id: item.id,
      p_step_key: stepKey,
      p_done: done,
    });
    if (error) {
      handleApiError(error);
      return;
    }
    await caseQuery.refetch();
  };
  const close = async () => {
    if (!outcome.trim()) {
      toast.error("An outcome is required.");
      return;
    }
    setBusy(true);
    const { error } = await api.rpc("hr_close_case", {
      p_case_id: item.id,
      p_outcome: outcome.trim(),
    });
    setBusy(false);
    if (error) {
      handleApiError(error);
      return;
    }
    toast.success("Case closed");
    setCloseOpen(false);
    await caseQuery.refetch();
  };
  return (
    <HrPage
      title={item.title}
      description={`${item.staff_name} · ${item.case_type.replaceAll("_", " ")}`}
      actions={
        item.can_edit && item.status !== "closed" ? (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void setStatus(item.status === "open" ? "on_hold" : "open")}
            >
              {item.status === "open" ? "Put on hold" : "Reopen"}
            </Button>
            <Button size="sm" onClick={() => setCloseOpen(true)}>
              Close case
            </Button>
          </>
        ) : null
      }
    >
      <div className="space-y-5 p-5">
        <Link
          to="/hr/cases"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Cases
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <HrStatusBadge status={item.status} />
          {item.is_restricted ? (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <LockKeyhole className="h-3.5 w-3.5" />
              Restricted case
            </span>
          ) : null}
        </div>
        <dl className="grid gap-4 rounded-lg border border-border p-4 sm:grid-cols-2 lg:grid-cols-4">
          <HrDetail label="Owner" value={item.owner_name} />
          <HrDetail label="Opened" value={formatDateTime(item.opened_at)} />
          <HrDetail label="Closed" value={formatDateTime(item.closed_at)} />
          <HrDetail label="Retain until" value={formatDate(item.retain_until)} />
          {item.summary ? <HrDetail label="Summary" value={item.summary} /> : null}
          {item.outcome ? <HrDetail label="Outcome" value={item.outcome} /> : null}
        </dl>
        <HrSection
          title="Checklist"
          description={`${item.steps_done} of ${item.steps_total} steps complete`}
          action={
            nextStep ? (
              <Button size="sm" onClick={() => setSendOpen(true)}>
                <Send className="mr-1.5 h-3.5 w-3.5" />
                Send next document
              </Button>
            ) : null
          }
        >
          {(item.steps ?? []).length === 0 ? (
            <HrEmpty title="No checklist steps" description="This case has no playbook steps." />
          ) : (
            <ol className="divide-y divide-row-divider">
              {item.steps?.map((step) => (
                <li key={step.key} className="flex items-center gap-3 px-4 py-3">
                  <span
                    className={step.done ? "text-tag-green-foreground" : "text-muted-foreground"}
                  >
                    {step.done ? <Check className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{step.label}</p>
                    <p className="text-xs capitalize text-muted-foreground">
                      {step.kind}
                      {step.done_at ? ` · ${formatDateTime(step.done_at)}` : ""}
                      {step.request_id ? " · Linked request ticks automatically" : ""}
                    </p>
                  </div>
                  {item.can_edit && !step.request_id ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => void tick(step.key, !step.done)}
                    >
                      {step.done ? "Mark incomplete" : "Mark done"}
                    </Button>
                  ) : null}
                </li>
              ))}
            </ol>
          )}
        </HrSection>
        <HrSection title="Linked documents">
          {requestsQuery.isPending ? (
            <HrLoading rows={2} />
          ) : requestsQuery.isError ? (
            <HrError
              message={getErrorMessage(requestsQuery.error)}
              retry={() => void requestsQuery.refetch()}
            />
          ) : (
            <HrRequestsTable
              requests={requestsQuery.data ?? []}
              showPerson={false}
              onChanged={refresh}
            />
          )}
        </HrSection>
        <HrSection title="Case notes">
          <HrNotesPanel staffId={item.staff_id} caseId={item.id} />
        </HrSection>
      </div>
      {nextStep?.document_key ? (
        <HrSendDocumentDialog
          staffId={item.staff_id}
          staffName={item.staff_name}
          open={sendOpen}
          onOpenChange={setSendOpen}
          onSent={refresh}
          fixedDocumentKey={nextStep.document_key}
          caseId={item.id}
          stepKey={nextStep.key}
        />
      ) : null}
      <Dialog open={closeOpen} onOpenChange={setCloseOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Close case</DialogTitle>
            <DialogDescription>Record the outcome before closing this case.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Outcome</Label>
            <Textarea
              value={outcome}
              onChange={(event) => setOutcome(event.target.value)}
              className="min-h-28"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCloseOpen(false)}>
              Cancel
            </Button>
            <Button disabled={busy} onClick={() => void close()}>
              Close case
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </HrPage>
  );
}
