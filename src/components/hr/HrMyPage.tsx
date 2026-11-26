import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { CheckCircle2, ChevronRight, Download, FileCheck2 } from "lucide-react";
import { toast } from "sonner";

import { HrMyDetailsForm } from "@/components/hr/HrMyDetailsForm";
import { HrRequestReader } from "@/components/hr/HrRequestReader";
import {
  HrEmpty,
  HrError,
  HrLoading,
  HrPage,
  HrSection,
  HrStatusBadge,
} from "@/components/hr/HrShared";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { formatDateTime } from "@/lib/format";
import { isCompletedRequest, openHrFile } from "@/lib/hr";
import type { HrMyDetails, HrMyRequest, HrSharedNote } from "@/lib/hr-types";
import { api, getErrorMessage } from "@/lib/supabase";

export function HrMyPage({ requestId }: { requestId?: string | undefined }) {
  const navigate = useNavigate();
  const { handleApiError } = useAuth();
  const requestsQuery = useQuery({
    queryKey: ["hr-my-requests"],
    queryFn: async () => {
      const { data, error } = await api
        .from("hr_my_requests")
        .select("*")
        .order("sent_at", { ascending: false });
      if (error) {
        handleApiError(error);
        throw error;
      }
      return (data ?? []) as HrMyRequest[];
    },
  });
  const detailsQuery = useQuery({
    queryKey: ["hr-my-details"],
    queryFn: async () => {
      const { data, error } = await api.from("hr_my_details").select("*").maybeSingle();
      if (error) {
        handleApiError(error);
        throw error;
      }
      return (data ?? null) as HrMyDetails | null;
    },
  });
  const notesQuery = useQuery({
    queryKey: ["hr-my-shared-notes"],
    queryFn: async () => {
      const { data, error } = await api
        .from("hr_my_shared_notes")
        .select("id,note_type,body,shared_at,author_name")
        .order("shared_at", { ascending: false });
      if (error) {
        handleApiError(error);
        throw error;
      }
      return (data ?? []) as HrSharedNote[];
    },
  });

  const requests = requestsQuery.data ?? [];
  const todo = requests.filter((request) => request.can_respond);
  const completed = requests.filter(isCompletedRequest);
  const selected = requests.find((request) => request.id === requestId) ?? null;

  const openRequest = (id: string) => {
    void navigate({ to: "/hr/my", search: { request: id } });
  };
  const closeRequest = () => {
    void navigate({ to: "/hr/my", search: {} });
  };

  return (
    <HrPage title="My HR" description="Your documents, responses and personal details.">
      <div className="space-y-5 p-5">
        <HrSection
          title="To do"
          description={
            todo.length
              ? `${todo.length} item${todo.length === 1 ? "" : "s"} need your attention.`
              : "Nothing waiting for you."
          }
        >
          {requestsQuery.isPending ? (
            <HrLoading rows={3} />
          ) : requestsQuery.isError ? (
            <HrError
              message={getErrorMessage(requestsQuery.error)}
              retry={() => void requestsQuery.refetch()}
            />
          ) : todo.length === 0 ? (
            <HrEmpty
              title="You're all caught up"
              description="New documents and forms sent to you will appear here."
            />
          ) : (
            <ul className="divide-y divide-row-divider">
              {todo.map((request) => (
                <li key={request.id}>
                  <button
                    type="button"
                    onClick={() => openRequest(request.id)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-accent"
                  >
                    <FileCheck2 className="h-4 w-4 shrink-0 text-space-hr" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-foreground">
                        {request.document_title}
                      </span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        Due {formatDateTime(request.due_at)} · Sent by{" "}
                        {request.sent_by_name ?? "HR"}
                      </span>
                    </span>
                    <HrStatusBadge status={request.status} />
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </HrSection>

        <HrSection title="My documents" description="Completed requests and signed files.">
          {requestsQuery.isPending ? null : completed.length === 0 ? (
            <HrEmpty
              title="No completed documents"
              description="Documents you have responded to will appear here."
            />
          ) : (
            <ul className="divide-y divide-row-divider">
              {completed.map((request) => (
                <li key={request.id} className="flex items-center gap-3 px-4 py-3">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-tag-green-foreground" />
                  <button
                    type="button"
                    onClick={() => openRequest(request.id)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <span className="block truncate text-sm font-medium text-foreground">
                      {request.document_title}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Responded {formatDateTime(request.responded_at)}
                    </span>
                  </button>
                  <HrStatusBadge status={request.status} />
                  {request.has_signed_file ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Download ${request.document_title}`}
                      onClick={() =>
                        void openHrFile("signed", request.id).catch((error: unknown) =>
                          toast.error(
                            error instanceof Error ? error.message : "Could not open file",
                          ),
                        )
                      }
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </HrSection>

        <HrSection title="Notes shared with me">
          {notesQuery.isPending ? (
            <HrLoading rows={2} />
          ) : notesQuery.isError ? (
            <HrError
              message={getErrorMessage(notesQuery.error)}
              retry={() => void notesQuery.refetch()}
            />
          ) : (notesQuery.data ?? []).length === 0 ? (
            <HrEmpty
              title="No shared notes"
              description="Notes your manager or HR chooses to share will appear here."
            />
          ) : (
            <ul className="divide-y divide-row-divider">
              {(notesQuery.data ?? []).map((note) => (
                <li key={note.id} className="px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">{note.note_type}</span>
                    <span>{note.author_name ?? "HR"}</span>
                    <span>{formatDateTime(note.shared_at)}</span>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">{note.body}</p>
                </li>
              ))}
            </ul>
          )}
        </HrSection>

        <div>
          <h2 className="mb-3 text-sm font-semibold text-foreground">My details</h2>
          {detailsQuery.isPending ? (
            <HrLoading rows={4} />
          ) : detailsQuery.isError ? (
            <HrError
              message={getErrorMessage(detailsQuery.error)}
              retry={() => void detailsQuery.refetch()}
            />
          ) : detailsQuery.data ? (
            <HrMyDetailsForm
              details={detailsQuery.data}
              onSaved={async () => {
                await detailsQuery.refetch();
              }}
            />
          ) : (
            <HrEmpty
              title="No details available"
              description="Your HR record could not be found."
            />
          )}
        </div>
      </div>
      <HrRequestReader
        request={selected}
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) closeRequest();
        }}
        onChanged={async () => {
          await requestsQuery.refetch();
        }}
      />
    </HrPage>
  );
}
