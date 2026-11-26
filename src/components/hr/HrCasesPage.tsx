import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { LockKeyhole } from "lucide-react";

import {
  HrEmpty,
  HrError,
  HrLoading,
  HrPage,
  HrPermissionMessage,
  HrStatusBadge,
} from "@/components/hr/HrShared";
import { useAuth } from "@/contexts/AuthContext";
import { formatDateTime } from "@/lib/format";
import type { HrCase } from "@/lib/hr-types";
import { api, getErrorMessage } from "@/lib/supabase";

const COLUMNS = [
  { id: "open", label: "Open" },
  { id: "on_hold", label: "On hold" },
  { id: "closed", label: "Closed" },
] as const;

export function HrCasesPage() {
  const { access, handleApiError } = useAuth();
  const canView = Boolean(access?.hr_admin_view || access?.hr_team || access?.is_global_admin);
  const query = useQuery({
    queryKey: ["hr-cases", "board"],
    enabled: canView,
    queryFn: async () => {
      const { data, error } = await api
        .from("hr_cases_list")
        .select("*")
        .order("updated_at", { ascending: false });
      if (error) {
        handleApiError(error);
        throw error;
      }
      return (data ?? []) as HrCase[];
    },
  });
  if (!canView) return <HrPermissionMessage area="Cases" />;
  return (
    <HrPage title="Cases" description="HR cases organised by status.">
      {query.isPending ? (
        <HrLoading rows={6} />
      ) : query.isError ? (
        <HrError message={getErrorMessage(query.error)} retry={() => void query.refetch()} />
      ) : (query.data ?? []).length === 0 ? (
        <HrEmpty title="No cases" description="Cases you can see will appear here." />
      ) : (
        <div className="grid gap-4 p-5 lg:grid-cols-3">
          {COLUMNS.map((column) => {
            const cases = (query.data ?? []).filter((item) => item.status === column.id);
            return (
              <section
                key={column.id}
                className="min-w-0 rounded-lg border border-border bg-surface-subtle"
              >
                <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
                  <h2 className="text-xs font-semibold">{column.label}</h2>
                  <span className="text-xs text-muted-foreground">{cases.length}</span>
                </div>
                <div className="space-y-2 p-2">
                  {cases.length === 0 ? (
                    <p className="px-2 py-8 text-center text-xs text-muted-foreground">
                      No {column.label.toLowerCase()} cases
                    </p>
                  ) : (
                    cases.map((item) => (
                      <Link
                        key={item.id}
                        to="/hr/cases/$caseId"
                        params={{ caseId: item.id }}
                        className="block rounded-md border border-border bg-background p-3 hover:bg-accent"
                      >
                        <div className="flex items-start gap-2">
                          {item.is_restricted ? (
                            <LockKeyhole className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          ) : null}
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{item.title}</p>
                            <p className="mt-0.5 truncate text-xs text-muted-foreground">
                              {item.staff_name}
                            </p>
                          </div>
                        </div>
                        <div className="mt-3 flex items-center justify-between gap-2">
                          <span className="text-xs text-muted-foreground">
                            {item.steps_done}/{item.steps_total} steps
                          </span>
                          <HrStatusBadge status={item.status} />
                        </div>
                        <p className="mt-2 text-[11px] text-muted-foreground">
                          Updated {formatDateTime(item.updated_at)}
                        </p>
                      </Link>
                    ))
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </HrPage>
  );
}
