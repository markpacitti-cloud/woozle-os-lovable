import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, Save } from "lucide-react";
import { toast } from "sonner";

import {
  HrEmpty,
  HrError,
  HrLoading,
  HrPage,
  HrPermissionMessage,
  HrStatusBadge,
} from "@/components/hr/HrShared";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { formatDateTime } from "@/lib/format";
import { HR_MERGE_FIELDS, invokeHrFunction, openHrFile } from "@/lib/hr";
import type { HrDocument } from "@/lib/hr-types";
import { api, getErrorMessage } from "@/lib/supabase";
import { cn } from "@/lib/utils";

export function HrTemplatesPage() {
  const { access, handleApiError } = useAuth();
  const canView = Boolean(access?.hr_admin_edit || access?.is_global_admin);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [body, setBody] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState("");
  const [reviewDue, setReviewDue] = useState("");
  const [saving, setSaving] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [staffCount, setStaffCount] = useState<number | null>(null);
  const query = useQuery({
    queryKey: ["hr-documents"],
    enabled: canView,
    queryFn: async () => {
      const { data, error } = await api
        .from("hr_documents_list")
        .select("*")
        .order("document_key")
        .order("version", { ascending: false });
      if (error) {
        handleApiError(error);
        throw error;
      }
      return (data ?? []) as HrDocument[];
    },
  });
  const documents = query.data ?? [];
  const selected = documents.find((document) => document.id === selectedId) ?? documents[0] ?? null;
  useEffect(() => {
    if (!selected) return;
    setTitle(selected.title);
    setSummary(selected.summary ?? "");
    setBody(selected.body);
    setEffectiveFrom(selected.effective_from ?? "");
    setReviewDue(selected.review_due ?? "");
  }, [selected]);
  if (!canView) return <HrPermissionMessage area="Templates & Policies" />;

  const save = async () => {
    if (!selected) return;
    setSaving(true);
    const { data, error } = await api.rpc("hr_save_document_draft", {
      p_document_key: selected.document_key,
      p_fields: {
        title,
        summary,
        body,
        effective_from: effectiveFrom || null,
        review_due: reviewDue || null,
      },
    });
    setSaving(false);
    if (error) {
      handleApiError(error);
      return;
    }
    toast.success("Draft version saved");
    setSelectedId(data as string);
    await query.refetch();
  };
  const openPublish = async () => {
    if (!selected) return;
    setStaffCount(null);
    setPublishOpen(true);
    if (selected.is_all_staff_ack_required) {
      const { count, error } = await api
        .from("hr_staff_directory")
        .select("staff_id", { count: "exact", head: true })
        .eq("can_sign_in", true);
      if (error) {
        handleApiError(error);
        setPublishOpen(false);
        return;
      }
      setStaffCount(count ?? 0);
    }
  };
  const publish = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const result = await invokeHrFunction<{ status: string; acknowledgements_queued: number }>(
        "hr-send",
        { action: "publish", document_id: selected.id },
      );
      toast.success(
        `Published${result.acknowledgements_queued ? ` · ${result.acknowledgements_queued} acknowledgements queued` : ""}`,
      );
      setPublishOpen(false);
      await query.refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Publishing failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <HrPage
      title="Templates & Policies"
      description="Edit Markdown, create draft versions and publish."
    >
      {query.isPending ? (
        <HrLoading rows={7} />
      ) : query.isError ? (
        <HrError message={getErrorMessage(query.error)} retry={() => void query.refetch()} />
      ) : documents.length === 0 ? (
        <HrEmpty
          title="No documents"
          description="HR document templates and policies will appear here."
        />
      ) : (
        <div className="grid min-h-[calc(100vh-130px)] lg:grid-cols-[320px_1fr]">
          <aside className="border-b border-border lg:border-r lg:border-b-0">
            <ul className="divide-y divide-row-divider">
              {documents.map((document) => (
                <li key={document.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(document.id)}
                    className={cn(
                      "w-full px-4 py-3 text-left hover:bg-accent",
                      selected?.id === document.id && "bg-nav-active",
                    )}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium">{document.title}</span>
                      {document.is_current ? <Badge variant="green">Current</Badge> : null}
                    </span>
                    <span className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                      <span>v{document.version}</span>
                      <HrStatusBadge status={document.status} />
                      {document.is_legal_review_needed ? (
                        <Badge variant="red">Needs legal review</Badge>
                      ) : null}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </aside>
          {selected ? (
            <main className="p-5 sm:p-6">
              <div className="mx-auto max-w-4xl space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {selected.document_key} · Version {selected.version}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Updated {formatDateTime(selected.updated_at)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {selected.file_path ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          void openHrFile("document", selected.id).catch((error: unknown) =>
                            toast.error(
                              error instanceof Error ? error.message : "Could not open file",
                            ),
                          )
                        }
                      >
                        <Download className="mr-1.5 h-3.5 w-3.5" />
                        Attached file
                      </Button>
                    ) : null}
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={saving}
                      onClick={() => void save()}
                    >
                      <Save className="mr-1.5 h-3.5 w-3.5" />
                      {selected.is_current ? "Save as new draft" : "Save draft"}
                    </Button>
                    <Button
                      size="sm"
                      disabled={saving || selected.is_current}
                      onClick={() => void openPublish()}
                    >
                      Publish
                    </Button>
                  </div>
                </div>
                {selected.is_legal_review_needed ? (
                  <div className="rounded-md border border-destructive/30 bg-tag-red px-3 py-2 text-xs font-medium text-tag-red-foreground">
                    Needs legal review. Staging may allow test publishing and adds a draft warning
                    to sent documents.
                  </div>
                ) : null}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label>Title</Label>
                    <Input value={title} onChange={(event) => setTitle(event.target.value)} />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label>Summary</Label>
                    <Textarea
                      value={summary}
                      onChange={(event) => setSummary(event.target.value)}
                      className="min-h-20"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Effective from</Label>
                    <Input
                      type="date"
                      value={effectiveFrom}
                      onChange={(event) => setEffectiveFrom(event.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Review due</Label>
                    <Input
                      type="date"
                      value={reviewDue}
                      onChange={(event) => setReviewDue(event.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Body (Markdown)</Label>
                  <Textarea
                    value={body}
                    onChange={(event) => setBody(event.target.value)}
                    spellCheck={false}
                    className="min-h-[440px] font-mono text-xs leading-5"
                  />
                </div>
                <details className="rounded-lg border border-border bg-surface-subtle p-3 text-xs">
                  <summary className="cursor-pointer font-medium">Merge-field help</summary>
                  <p className="mt-2 text-muted-foreground">
                    Use fields exactly as shown, for example {"{{ employee_full_name }}"}.
                    Additional document-specific fields:{" "}
                    {(selected.extra_merge_fields ?? []).join(", ") || "none"}.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {HR_MERGE_FIELDS.map((field) => (
                      <code
                        key={field}
                        className="rounded border border-border bg-background px-1.5 py-0.5"
                      >
                        {"{{ "}
                        {field}
                        {" }}"}
                      </code>
                    ))}
                  </div>
                </details>
              </div>
            </main>
          ) : null}
        </div>
      )}
      <AlertDialog open={publishOpen} onOpenChange={setPublishOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Publish {selected?.title}?</AlertDialogTitle>
            <AlertDialogDescription>
              {selected?.is_all_staff_ack_required
                ? staffCount === null
                  ? "Counting staff…"
                  : `This will ask ${staffCount} ${staffCount === 1 ? "person" : "people"} to acknowledge this policy.`
                : "This version will become current."}
              {selected?.is_legal_review_needed
                ? " It is still marked as needing legal review."
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={saving || (selected?.is_all_staff_ack_required && staffCount === null)}
              onClick={(event) => {
                event.preventDefault();
                void publish();
              }}
            >
              Publish
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </HrPage>
  );
}
