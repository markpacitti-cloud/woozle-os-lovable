import { useEffect, useState } from "react";
import { CheckCircle2, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { HrAnswersForm } from "@/components/hr/HrAnswersForm";
import { HrMarkdown, HrStatusBadge } from "@/components/hr/HrShared";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { formatDateTime } from "@/lib/format";
import {
  fileToBase64,
  getHrResponseKind,
  invokeHrFunction,
  normaliseFormFields,
  openHrFile,
  validateHrUpload,
} from "@/lib/hr";
import type { HrAnswers, HrFormField, HrMyRequest } from "@/lib/hr-types";
import { api } from "@/lib/supabase";

export function HrRequestReader({
  request,
  open,
  onOpenChange,
  onChanged,
}: {
  request: HrMyRequest | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged: () => Promise<void> | void;
}) {
  const { profile, handleApiError } = useAuth();
  const [comment, setComment] = useState("");
  const [answers, setAnswers] = useState<HrAnswers>({});
  const [files, setFiles] = useState<Record<string, File>>({});
  const [busy, setBusy] = useState(false);
  const [confirmedAt, setConfirmedAt] = useState<string | null>(null);

  useEffect(() => {
    setComment("");
    setAnswers({});
    setFiles({});
    setConfirmedAt(null);
  }, [request?.id]);

  useEffect(() => {
    if (!open || !request?.can_respond || request.viewed_at) return;
    void api.rpc("hr_mark_viewed", { p_request_id: request.id }).then(({ error }) => {
      if (error) handleApiError(error);
    });
  }, [handleApiError, open, request]);

  if (!request) return null;
  const responseKind = getHrResponseKind(request.response_type, request.is_esign);
  const fields = normaliseFormFields(request.form_fields);
  const responseTime = request.responded_at ?? confirmedAt;

  const handleFile = (field: HrFormField, file: File) => {
    const problem = validateHrUpload(file);
    if (problem) {
      toast.error(problem);
      return;
    }
    setFiles((current) => ({ ...current, [field.key]: file }));
    setAnswers((current) => ({ ...current, [field.key]: file.name }));
  };

  const submit = async (response: "acknowledge" | "accept" | "decline" | "submit") => {
    if (response === "submit") {
      for (const field of fields) {
        if (field.required && (answers[field.key] === undefined || answers[field.key] === "")) {
          toast.error(`${field.label} is required.`);
          return;
        }
      }
    }
    if (!profile?.id) {
      toast.error("Your staff profile is not available.");
      return;
    }
    setBusy(true);
    try {
      if (response === "submit") {
        for (const field of fields) {
          const file = files[field.key];
          if (!file) continue;
          const dataBase64 = await fileToBase64(file);
          await invokeHrFunction("hr-files", {
            action: "upload",
            kind: "rtw",
            id: profile.id,
            file_name: file.name,
            content_type: file.type,
            data_base64: dataBase64,
          });
        }
      }
      await invokeHrFunction("hr-respond", {
        request_id: request.id,
        response,
        ...(comment.trim() ? { comment: comment.trim() } : {}),
        ...(response === "submit" ? { answers } : {}),
      });
      setConfirmedAt(new Date().toISOString());
      toast.success("Response recorded");
      await onChanged();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Response failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto p-0 sm:max-w-[680px]">
        <SheetHeader className="border-b border-border px-6 py-5 text-left">
          <div className="flex flex-wrap items-center gap-2 pr-8">
            <HrStatusBadge status={request.status} />
            <span className="text-xs text-muted-foreground">
              Version {request.document_version}
            </span>
            {request.is_legal_review_needed ? (
              <span className="text-xs font-medium text-tag-red-foreground">
                Needs legal review
              </span>
            ) : null}
          </div>
          <SheetTitle className="text-xl">{request.document_title}</SheetTitle>
          <SheetDescription>{request.subject}</SheetDescription>
        </SheetHeader>
        <div className="space-y-6 px-6 py-5">
          <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
            <span>Sent {formatDateTime(request.sent_at)}</span>
            <span>Due {formatDateTime(request.due_at)}</span>
            {request.meeting_at ? <span>Meeting {formatDateTime(request.meeting_at)}</span> : null}
            {request.meeting_location ? <span>{request.meeting_location}</span> : null}
          </div>
          <HrMarkdown body={request.body_snapshot} />

          {responseTime || request.response ? (
            <div className="rounded-lg border border-tag-green bg-tag-green p-4 text-tag-green-foreground">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <CheckCircle2 className="h-4 w-4" />
                Response recorded
              </div>
              <p className="mt-1 text-xs">
                {request.response ? `${request.response.replaceAll("_", " ")} · ` : ""}
                {formatDateTime(responseTime)}
              </p>
              {request.response_comment ? (
                <p className="mt-2 text-xs">Comment: {request.response_comment}</p>
              ) : null}
            </div>
          ) : null}

          {request.can_respond && responseKind === "accept_decline" ? (
            <div className="space-y-2">
              <Label htmlFor="hr-response-comment">Optional comment</Label>
              <Textarea
                id="hr-response-comment"
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                placeholder="Add a comment…"
              />
            </div>
          ) : null}

          {request.can_respond && responseKind === "form" ? (
            <HrAnswersForm
              fields={fields}
              answers={answers}
              onChange={setAnswers}
              onFile={handleFile}
              disabled={busy}
            />
          ) : null}

          {responseKind === "sign" ? (
            <div className="rounded-md border border-tag-blue bg-tag-blue px-3 py-2 text-xs text-tag-blue-foreground">
              Check your email to sign. The eSignatures message contains the secure signing link.
            </div>
          ) : null}

          {request.has_signed_file ? (
            <Button
              variant="outline"
              onClick={() =>
                void openHrFile("signed", request.id).catch((error: unknown) =>
                  toast.error(error instanceof Error ? error.message : "Could not open file"),
                )
              }
            >
              <Download className="mr-2 h-4 w-4" />
              View / download signed document
            </Button>
          ) : null}

          {request.can_respond ? (
            <div className="sticky bottom-0 -mx-6 flex flex-wrap gap-2 border-t border-border bg-background px-6 py-4">
              {responseKind === "acknowledge" ? (
                <Button size="lg" disabled={busy} onClick={() => void submit("acknowledge")}>
                  {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Acknowledge
                </Button>
              ) : null}
              {responseKind === "accept_decline" ? (
                <>
                  <Button size="lg" disabled={busy} onClick={() => void submit("accept")}>
                    Accept
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    disabled={busy}
                    onClick={() => void submit("decline")}
                  >
                    Decline
                  </Button>
                </>
              ) : null}
              {responseKind === "form" ? (
                <Button size="lg" disabled={busy} onClick={() => void submit("submit")}>
                  {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Submit form
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
