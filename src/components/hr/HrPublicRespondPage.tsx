import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { HrAnswersForm } from "@/components/hr/HrAnswersForm";
import { HrMarkdown } from "@/components/hr/HrShared";
import { HrSignBlock } from "@/components/hr/HrSignBlock";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatDateTime } from "@/lib/format";
import {
  fileToBase64,
  getHrResponseKind,
  getPublicStateMessage,
  HR_PUBLIC_RESPOND_URL,
  normaliseFormFields,
  validateHrUpload,
} from "@/lib/hr";
import type { HrAnswers, HrFormField, HrPublicResponse } from "@/lib/hr-types";

async function publicRequest<T>(token: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${HR_PUBLIC_RESPOND_URL}?token=${encodeURIComponent(token)}`, init);
  const payload = (await response.json()) as T & {
    error?: string;
    message?: string;
    state?: string;
  };
  if (!response.ok && !payload.state)
    throw new Error(payload.error ?? payload.message ?? "This link could not be opened.");
  return payload;
}

export function HrPublicRespondPage({ token }: { token?: string | undefined }) {
  const [answers, setAnswers] = useState<HrAnswers>({});
  const [files, setFiles] = useState<Record<string, File>>({});
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [completedAt, setCompletedAt] = useState<string | null>(null);
  const query = useQuery({
    queryKey: ["hr-public-response", token],
    enabled: Boolean(token),
    retry: false,
    queryFn: () => publicRequest<HrPublicResponse>(token!),
  });

  const submit = async (
    response: "acknowledge_and_sign" | "accept" | "decline" | "submit",
    typedName?: string,
  ) => {
    if (!token || !query.data) return;
    const fields = normaliseFormFields(query.data.form_fields);
    if (response === "submit") {
      for (const field of fields) {
        if (field.required && (answers[field.key] === undefined || answers[field.key] === "")) {
          toast.error(`${field.label} is required.`);
          return;
        }
      }
    }
    setBusy(true);
    try {
      for (const field of fields) {
        const file = files[field.key];
        if (!file) continue;
        await publicRequest(token, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token,
            action: "upload",
            file_name: file.name,
            content_type: file.type,
            data_base64: await fileToBase64(file),
          }),
        });
      }
      await publicRequest(token, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          action: "submit",
          response,
          ...(comment.trim() ? { comment: comment.trim() } : {}),
          ...(response === "submit" ? { answers } : {}),
          ...(response === "acknowledge_and_sign" ? { answers: { agreed: true, typed_name: typedName } } : {}),
        }),
      });
      setCompletedAt(new Date().toISOString());
      toast.success("Response recorded");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Response failed");
    } finally {
      setBusy(false);
    }
  };
  const handleFile = (field: HrFormField, file: File) => {
    const problem = validateHrUpload(file);
    if (problem) {
      toast.error(problem);
      return;
    }
    setFiles((current) => ({ ...current, [field.key]: file }));
    setAnswers((current) => ({ ...current, [field.key]: file.name }));
  };

  return (
    <main className="min-h-screen bg-surface-subtle px-4 py-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-5 flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-space-hr text-sm font-semibold text-primary-foreground">
            W
          </span>
          <span className="text-lg font-semibold tracking-tight">Woozle Research</span>
        </div>
        <div className="rounded-lg border border-border bg-background">
          {!token ? (
            <div className="p-8 text-center">
              <h1 className="text-xl font-semibold">No secure link provided</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Open the full link from your Woozle email.
              </p>
            </div>
          ) : query.isPending ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="h-5 w-5 animate-spin text-space-hr" />
            </div>
          ) : query.isError ? (
            <div className="p-8 text-center">
              <h1 className="text-xl font-semibold">This link could not be opened</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {query.error instanceof Error
                  ? query.error.message
                  : "Please reply to the email for help."}
              </p>
            </div>
          ) : query.data?.state !== "ok" ? (
            <div className="p-8 text-center">
              <h1 className="text-xl font-semibold">Document unavailable</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {getPublicStateMessage(query.data?.state ?? "not_found")}
              </p>
            </div>
          ) : completedAt ? (
            <div className="p-10 text-center">
              <CheckCircle2 className="mx-auto h-9 w-9 text-tag-green-foreground" />
              <h1 className="mt-4 text-xl font-semibold">Thank you, {query.data.first_name}</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Your response was recorded at {formatDateTime(completedAt)}.
              </p>
            </div>
          ) : (
            <>
              <div className="border-b border-border px-6 py-5 sm:px-8">
                <p className="text-xs text-muted-foreground">Secure HR document</p>
                <h1 className="mt-1 text-xl font-semibold tracking-tight">{query.data.title}</h1>
                <p className="mt-2 text-xs text-muted-foreground">
                  Due {formatDateTime(query.data.due_at)} · Link expires{" "}
                  {formatDateTime(query.data.expires_at)}
                </p>
              </div>
              <div className="space-y-6 px-6 py-6 sm:px-8">
                <HrMarkdown body={query.data.body ?? ""} />
                {getHrResponseKind(query.data.response_type) === "accept_decline" ? (
                  <div className="space-y-2">
                    <Label>Optional comment</Label>
                    <Textarea
                      value={comment}
                      onChange={(event) => setComment(event.target.value)}
                    />
                  </div>
                ) : null}
                {getHrResponseKind(query.data.response_type) === "form" ? (
                  <HrAnswersForm
                    fields={query.data.form_fields}
                    answers={answers}
                    onChange={setAnswers}
                    onFile={handleFile}
                    disabled={busy}
                  />
                ) : null}
                <div className="flex flex-wrap gap-2 border-t border-border pt-5">
                  {(() => {
                    const kind = getHrResponseKind(query.data.response_type);
                    return kind === "acknowledge_and_sign" ? (
                      <div className="w-full">
                        <HrSignBlock busy={busy} onSign={(name) => submit("acknowledge_and_sign", name)} />
                      </div>
                    ) : kind === "accept_decline" ? (
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
                    ) : kind === "form" ? (
                      <Button size="lg" disabled={busy} onClick={() => void submit("submit")}>
                        {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Submit form
                      </Button>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        No online response is required for this document.
                      </p>
                    );
                  })()}
                </div>
              </div>
            </>
          )}
        </div>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          This secure link works once and expires after 14 days.
        </p>
      </div>
    </main>
  );
}
