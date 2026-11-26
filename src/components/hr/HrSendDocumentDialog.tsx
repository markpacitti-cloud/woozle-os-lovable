import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { HrMarkdown } from "@/components/hr/HrShared";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { invokeHrFunction } from "@/lib/hr";
import type { HrDocumentOption, HrRequestDetail } from "@/lib/hr-types";
import { api } from "@/lib/supabase";

export function HrSendDocumentDialog({
  staffId,
  staffName,
  open,
  onOpenChange,
  onSent,
  fixedDocumentKey,
  caseId,
  stepKey,
}: {
  staffId: string;
  staffName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSent: () => Promise<void> | void;
  fixedDocumentKey?: string | undefined;
  caseId?: string | undefined;
  stepKey?: string | undefined;
}) {
  const { handleApiError } = useAuth();
  const [documentKey, setDocumentKey] = useState(fixedDocumentKey ?? "");
  const [mergeData, setMergeData] = useState<Record<string, string>>({});
  const [meetingAt, setMeetingAt] = useState("");
  const [meetingLocation, setMeetingLocation] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [preview, setPreview] = useState<HrRequestDetail | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const optionsQuery = useQuery({
    queryKey: ["hr-document-options"],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await api.from("hr_document_options").select("*").order("title");
      if (error) {
        handleApiError(error);
        throw error;
      }
      return (data ?? []) as HrDocumentOption[];
    },
  });
  const options = optionsQuery.data ?? [];
  const selected = options.find((option) => option.document_key === documentKey) ?? null;

  useEffect(() => {
    if (!open) return;
    setPreview(null);
    setRequestId(null);
    setMergeData({});
    setMeetingAt("");
    setMeetingLocation("");
    setDueAt("");
    setDocumentKey(fixedDocumentKey ?? optionsQuery.data?.[0]?.document_key ?? "");
  }, [fixedDocumentKey, open, optionsQuery.data]);

  const prepare = async () => {
    if (!selected) {
      toast.error("Choose a document.");
      return;
    }
    for (const field of selected.extra_merge_fields ?? []) {
      if (!mergeData[field]?.trim()) {
        toast.error(`${field.replaceAll("_", " ")} is required.`);
        return;
      }
    }
    if (selected.needs_meeting && (!meetingAt || !meetingLocation.trim())) {
      toast.error("Meeting date, time and place are required.");
      return;
    }
    setBusy(true);
    const { data, error } = await api.rpc("hr_prepare_request", {
      p_staff_id: staffId,
      p_document_key: selected.document_key,
      ...(caseId ? { p_case_id: caseId } : {}),
      ...(stepKey ? { p_step_key: stepKey } : {}),
      p_merge_data: mergeData,
      ...(meetingAt ? { p_meeting_at: new Date(meetingAt).toISOString() } : {}),
      ...(meetingLocation.trim() ? { p_meeting_location: meetingLocation.trim() } : {}),
      ...(dueAt ? { p_due_at: new Date(dueAt).toISOString() } : {}),
    });
    if (error || !data) {
      setBusy(false);
      if (error) handleApiError(error);
      return;
    }
    const id = data as string;
    const detail = await api.from("hr_request_detail").select("*").eq("id", id).single();
    setBusy(false);
    if (detail.error) {
      handleApiError(detail.error);
      return;
    }
    setRequestId(id);
    setPreview(detail.data as HrRequestDetail);
  };

  const send = async () => {
    if (!requestId) return;
    setBusy(true);
    try {
      const result = await invokeHrFunction<{ status: string }>("hr-send", {
        action: "send",
        request_id: requestId,
      });
      toast.success(
        result.status === "awaiting_approval"
          ? "Sent for HR approval"
          : result.status === "queued"
            ? "Sending queued"
            : "Document sent",
      );
      onOpenChange(false);
      await onSent();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send document");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {preview ? "Preview before sending" : `Send a document to ${staffName}`}
          </DialogTitle>
          <DialogDescription>
            {preview
              ? "Check the rendered document before sending it."
              : "Only documents you are permitted to send are listed."}
          </DialogDescription>
        </DialogHeader>
        {preview ? (
          <div className="rounded-lg border border-border p-5">
            <h3 className="mb-4 text-base font-semibold">{preview.subject}</h3>
            <HrMarkdown body={preview.body_snapshot} />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Document</Label>
              <Select
                value={documentKey}
                onValueChange={setDocumentKey}
                disabled={Boolean(fixedDocumentKey)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a document" />
                </SelectTrigger>
                <SelectContent>
                  {options.map((option) => (
                    <SelectItem key={option.document_id} value={option.document_key}>
                      {option.title} · v{option.version}
                      {option.is_hr_approval_required ? " · HR approval" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {(selected?.extra_merge_fields ?? []).map((field) => (
              <div key={field} className="space-y-2">
                <Label>{field.replaceAll("_", " ")}</Label>
                <Input
                  value={mergeData[field] ?? ""}
                  onChange={(event) =>
                    setMergeData((current) => ({ ...current, [field]: event.target.value }))
                  }
                />
              </div>
            ))}
            {selected?.needs_meeting ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Meeting date and time</Label>
                  <Input
                    type="datetime-local"
                    value={meetingAt}
                    onChange={(event) => setMeetingAt(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Meeting place</Label>
                  <Input
                    value={meetingLocation}
                    onChange={(event) => setMeetingLocation(event.target.value)}
                  />
                </div>
              </div>
            ) : null}
            <div className="space-y-2">
              <Label>Optional response deadline</Label>
              <Input
                type="datetime-local"
                value={dueAt}
                onChange={(event) => setDueAt(event.target.value)}
              />
            </div>
          </div>
        )}
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => (preview ? setPreview(null) : onOpenChange(false))}
          >
            {preview ? "Back" : "Cancel"}
          </Button>
          {preview ? (
            <Button disabled={busy} onClick={() => void send()}>
              {selected?.is_hr_approval_required ? "Submit for approval" : "Send document"}
            </Button>
          ) : (
            <Button
              disabled={busy || optionsQuery.isPending || options.length === 0}
              onClick={() => void prepare()}
            >
              Preview document
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
