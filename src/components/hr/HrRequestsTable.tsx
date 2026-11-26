import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, Eye, RotateCw, XCircle } from "lucide-react";
import { toast } from "sonner";

import { HrEmpty, HrMarkdown, HrStatusBadge } from "@/components/hr/HrShared";
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
import { formatDateTime } from "@/lib/format";
import { invokeHrFunction, openHrFile } from "@/lib/hr";
import type { HrRequest, HrRequestDetail } from "@/lib/hr-types";
import { api } from "@/lib/supabase";

export function HrRequestsTable({
  requests,
  onChanged,
  showPerson = true,
}: {
  requests: HrRequest[];
  onChanged: () => Promise<void> | void;
  showPerson?: boolean;
}) {
  const { handleApiError } = useAuth();
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [cancelRequest, setCancelRequest] = useState<HrRequest | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const detailQuery = useQuery({
    queryKey: ["hr-request-detail", previewId],
    enabled: Boolean(previewId),
    queryFn: async () => {
      const { data, error } = await api
        .from("hr_request_detail")
        .select("*")
        .eq("id", previewId!)
        .single();
      if (error) {
        handleApiError(error);
        throw error;
      }
      return data as HrRequestDetail;
    },
  });

  const resend = async (request: HrRequest) => {
    setBusy(true);
    try {
      await invokeHrFunction("hr-send", { action: "resend", request_id: request.id });
      toast.success("Request resent");
      await onChanged();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not resend request");
    } finally {
      setBusy(false);
    }
  };

  const cancel = async () => {
    if (!cancelRequest) return;
    setBusy(true);
    try {
      await invokeHrFunction("hr-send", {
        action: "cancel",
        request_id: cancelRequest.id,
        ...(reason.trim() ? { reason: reason.trim() } : {}),
      });
      toast.success("Request cancelled");
      setCancelRequest(null);
      setReason("");
      await onChanged();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not cancel request");
    } finally {
      setBusy(false);
    }
  };

  if (requests.length === 0) {
    return (
      <HrEmpty title="No requests" description="Documents sent for this record will appear here." />
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="border-b border-border bg-surface-subtle text-xs text-muted-foreground">
            <tr className="h-9">
              <th className="px-4 font-medium">Document</th>
              {showPerson ? <th className="px-4 font-medium">Person</th> : null}
              <th className="px-4 font-medium">Status</th>
              <th className="hidden px-4 font-medium md:table-cell">Sent</th>
              <th className="hidden px-4 font-medium lg:table-cell">Due</th>
              <th className="px-4 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-row-divider">
            {requests.map((request) => (
              <tr key={request.id} className="min-h-[46px]">
                <td className="max-w-[260px] px-4 py-2.5">
                  <button
                    type="button"
                    className="text-left font-medium text-foreground hover:text-link"
                    onClick={() => setPreviewId(request.id)}
                  >
                    {request.document_title}
                  </button>
                  <span className="block text-xs text-muted-foreground">
                    v{request.document_version}
                    {request.case_title ? ` · ${request.case_title}` : ""}
                  </span>
                  {request.last_send_error ? (
                    <span className="mt-1 block text-xs text-destructive">
                      {request.last_send_error}
                    </span>
                  ) : null}
                </td>
                {showPerson ? <td className="px-4 py-2.5">{request.staff_name}</td> : null}
                <td className="px-4 py-2.5">
                  <HrStatusBadge status={request.status} />
                </td>
                <td className="hidden whitespace-nowrap px-4 py-2.5 text-xs text-muted-foreground md:table-cell">
                  {formatDateTime(request.sent_at)}
                </td>
                <td className="hidden whitespace-nowrap px-4 py-2.5 text-xs text-muted-foreground lg:table-cell">
                  {formatDateTime(request.due_at)}
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      aria-label="Preview request"
                      onClick={() => setPreviewId(request.id)}
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                    {request.has_signed_file ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        aria-label="Download signed file"
                        onClick={() =>
                          void openHrFile("signed", request.id).catch((error: unknown) =>
                            toast.error(
                              error instanceof Error ? error.message : "Could not open file",
                            ),
                          )
                        }
                      >
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                    ) : null}
                    {request.can_manage ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        disabled={busy}
                        aria-label="Resend request"
                        onClick={() => void resend(request)}
                      >
                        <RotateCw className="h-3.5 w-3.5" />
                      </Button>
                    ) : null}
                    {request.can_manage ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive"
                        disabled={busy}
                        aria-label="Cancel request"
                        onClick={() => setCancelRequest(request)}
                      >
                        <XCircle className="h-3.5 w-3.5" />
                      </Button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog
        open={Boolean(previewId)}
        onOpenChange={(open) => {
          if (!open) setPreviewId(null);
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{detailQuery.data?.document_title ?? "Request preview"}</DialogTitle>
            <DialogDescription>{detailQuery.data?.subject}</DialogDescription>
          </DialogHeader>
          {detailQuery.data ? (
            <>
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <HrStatusBadge status={detailQuery.data.status} />
                <span>Version {detailQuery.data.document_version}</span>
                <span>Sent {formatDateTime(detailQuery.data.sent_at)}</span>
              </div>
              <HrMarkdown body={detailQuery.data.body_snapshot} />
              {detailQuery.data.response_comment ? (
                <p className="rounded-md bg-surface-subtle p-3 text-xs">
                  Response comment: {detailQuery.data.response_comment}
                </p>
              ) : null}
            </>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">Loading preview…</p>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(cancelRequest)}
        onOpenChange={(open) => {
          if (!open) setCancelRequest(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel this request?</DialogTitle>
            <DialogDescription>The recipient will no longer be able to respond.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Optional reason</Label>
            <Textarea value={reason} onChange={(event) => setReason(event.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelRequest(null)}>
              Keep request
            </Button>
            <Button variant="destructive" disabled={busy} onClick={() => void cancel()}>
              Cancel request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
