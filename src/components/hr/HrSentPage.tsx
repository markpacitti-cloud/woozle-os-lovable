import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { HrError, HrLoading, HrPage, HrPermissionMessage } from "@/components/hr/HrShared";
import { HrRequestsTable } from "@/components/hr/HrRequestsTable";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import type { HrRequest } from "@/lib/hr-types";
import { api, getErrorMessage } from "@/lib/supabase";

const STATUSES = [
  "draft",
  "awaiting_approval",
  "sent",
  "viewed",
  "completed",
  "declined",
  "overdue",
  "cancelled",
  "waiting_for_esign",
];

export function HrSentPage() {
  const { access, handleApiError } = useAuth();
  const canView = Boolean(access?.hr_admin_view || access?.is_global_admin);
  const [status, setStatus] = useState("all");
  const [person, setPerson] = useState("all");
  const [document, setDocument] = useState("all");
  const query = useQuery({
    queryKey: ["hr-sent"],
    enabled: canView,
    queryFn: async () => {
      const { data, error } = await api
        .from("hr_requests_list")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) {
        handleApiError(error);
        throw error;
      }
      return (data ?? []) as HrRequest[];
    },
  });
  const rows = query.data ?? [];
  const people = [...new Map(rows.map((row) => [row.staff_id, row.staff_name])).entries()];
  const documents = [
    ...new Map(rows.map((row) => [row.document_key, row.document_title])).entries(),
  ];
  const filtered = rows.filter(
    (row) =>
      (status === "all" || row.status === status) &&
      (person === "all" || row.staff_id === person) &&
      (document === "all" || row.document_key === document),
  );
  if (!canView) return <HrPermissionMessage area="Sent" />;
  return (
    <HrPage title="Sent" description="Every HR document request you can manage.">
      <div className="flex flex-wrap gap-2 border-b border-border p-3">
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[180px] bg-surface-subtle text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUSES.map((item) => (
              <SelectItem key={item} value={item}>
                {item.replaceAll("_", " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={person} onValueChange={setPerson}>
          <SelectTrigger className="w-[180px] bg-surface-subtle text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All people</SelectItem>
            {people.map(([id, name]) => (
              <SelectItem key={id} value={id}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={document} onValueChange={setDocument}>
          <SelectTrigger className="w-[220px] bg-surface-subtle text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All documents</SelectItem>
            {documents.map(([key, title]) => (
              <SelectItem key={key} value={key}>
                {title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {query.isPending ? (
        <HrLoading rows={8} />
      ) : query.isError ? (
        <HrError message={getErrorMessage(query.error)} retry={() => void query.refetch()} />
      ) : (
        <HrRequestsTable
          requests={filtered}
          onChanged={async () => {
            await query.refetch();
          }}
        />
      )}
    </HrPage>
  );
}
