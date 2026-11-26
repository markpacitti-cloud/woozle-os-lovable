import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, X } from "lucide-react";
import { toast } from "sonner";

import {
  HrEmpty,
  HrError,
  HrLoading,
  HrMarkdown,
  HrPage,
  HrPermissionMessage,
  HrStatusBadge,
} from "@/components/hr/HrShared";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { formatDateTime } from "@/lib/format";
import { invokeHrFunction } from "@/lib/hr";
import type { HrApproval } from "@/lib/hr-types";
import { api, getErrorMessage } from "@/lib/supabase";
import { cn } from "@/lib/utils";

export function HrApprovalsPage() {
  const { access, handleApiError } = useAuth();
  const canView = Boolean(access?.hr_approve || access?.is_global_admin);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const query = useQuery({
    queryKey: ["hr-approvals"],
    enabled: canView,
    queryFn: async () => {
      const { data, error } = await api
        .from("hr_approvals_list")
        .select("*")
        .order("submitted_at", { ascending: false });
      if (error) {
        handleApiError(error);
        throw error;
      }
      return (data ?? []) as HrApproval[];
    },
  });
  const rows = (query.data ?? []).filter((approval) => !approval.decided_at);
  const selected = rows.find((approval) => approval.id === selectedId) ?? rows[0] ?? null;
  if (!canView) return <HrPermissionMessage area="Approvals" />;
  const decide = async (approve: boolean) => {
    if (!selected) return;
    if (!approve && !comment.trim()) {
      toast.error("A comment is required when sending back.");
      return;
    }
    setBusy(true);
    try {
      await invokeHrFunction("hr-send", {
        action: "decide",
        approval_id: selected.id,
        approve,
        ...(comment.trim() ? { comment: comment.trim() } : {}),
      });
      toast.success(approve ? "Letter approved" : "Letter sent back");
      setComment("");
      await query.refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Decision failed");
    } finally {
      setBusy(false);
    }
  };
  return (
    <HrPage title="Approvals" description="HR letters waiting for approval before sending.">
      {query.isPending ? (
        <HrLoading rows={5} />
      ) : query.isError ? (
        <HrError message={getErrorMessage(query.error)} retry={() => void query.refetch()} />
      ) : rows.length === 0 ? (
        <HrEmpty
          title="No letters waiting"
          description="Letters submitted for HR approval will appear here."
        />
      ) : (
        <div className="grid min-h-[calc(100vh-130px)] lg:grid-cols-[340px_1fr]">
          <aside className="border-b border-border lg:border-r lg:border-b-0">
            <ul className="divide-y divide-row-divider">
              {rows.map((approval) => (
                <li key={approval.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedId(approval.id);
                      setComment("");
                    }}
                    className={cn(
                      "w-full px-4 py-3 text-left hover:bg-accent",
                      selected?.id === approval.id && "bg-nav-active",
                    )}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium">
                        {approval.document_title}
                      </span>
                      <HrStatusBadge status={approval.status} />
                    </span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {approval.staff_name} · {approval.submitted_by_name}
                    </span>
                    <span className="mt-1 block text-[11px] text-muted-foreground">
                      {formatDateTime(approval.submitted_at)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </aside>
          {selected ? (
            <main className="p-5 sm:p-8">
              <article className="mx-auto max-w-3xl">
                <h2 className="text-xl font-semibold">{selected.subject}</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  For {selected.staff_name} · Submitted by {selected.submitted_by_name}
                </p>
                {selected.submit_note ? (
                  <p className="mt-3 rounded-md bg-surface-subtle p-3 text-xs">
                    Submission note: {selected.submit_note}
                  </p>
                ) : null}
                <div className="mt-5 rounded-lg border border-border p-5">
                  <HrMarkdown body={selected.body_snapshot} />
                </div>
                <div className="mt-5 space-y-2">
                  <Label>
                    Comment{" "}
                    <span className="font-normal text-muted-foreground">
                      (required when sending back)
                    </span>
                  </Label>
                  <Textarea
                    value={comment}
                    onChange={(event) => setComment(event.target.value)}
                    className="min-h-24"
                  />
                </div>
                {selected.can_decide ? (
                  <div className="mt-4 flex gap-2">
                    <Button disabled={busy} onClick={() => void decide(true)}>
                      <Check className="mr-1.5 h-4 w-4" />
                      Approve & send
                    </Button>
                    <Button variant="outline" disabled={busy} onClick={() => void decide(false)}>
                      <X className="mr-1.5 h-4 w-4" />
                      Send back
                    </Button>
                  </div>
                ) : (
                  <p className="mt-4 text-xs text-muted-foreground">
                    You cannot decide your own submission.
                  </p>
                )}
              </article>
            </main>
          ) : null}
        </div>
      )}
    </HrPage>
  );
}
