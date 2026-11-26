import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { ChevronRight, Users } from "lucide-react";

import { HrEmpty, HrError, HrLoading, HrPage, HrPermissionMessage } from "@/components/hr/HrShared";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { formatDate } from "@/lib/format";
import type { HrTeamMember } from "@/lib/hr-types";
import { api, getErrorMessage } from "@/lib/supabase";

export function HrTeamPage() {
  const navigate = useNavigate();
  const { access, handleApiError } = useAuth();
  const canView = Boolean(access?.hr_team || access?.is_global_admin);
  const query = useQuery({
    queryKey: ["hr-my-team"],
    enabled: canView,
    queryFn: async () => {
      const { data, error } = await api.from("hr_my_team").select("*").order("full_name");
      if (error) {
        handleApiError(error);
        throw error;
      }
      return (data ?? []) as HrTeamMember[];
    },
  });

  if (!canView) return <HrPermissionMessage area="My team" />;
  return (
    <HrPage title="My team" description="Your direct reports and their HR activity.">
      {query.isPending ? (
        <HrLoading rows={4} />
      ) : query.isError ? (
        <HrError message={getErrorMessage(query.error)} retry={() => void query.refetch()} />
      ) : (query.data ?? []).length === 0 ? (
        <HrEmpty title="No direct reports" description="Your direct reports will appear here." />
      ) : (
        <div className="grid gap-3 p-5 sm:grid-cols-2 xl:grid-cols-3">
          {(query.data ?? []).map((member) => (
            <button
              key={member.staff_id}
              type="button"
              onClick={() =>
                void navigate({ to: "/hr/team/$staffId", params: { staffId: member.staff_id } })
              }
              className="rounded-lg border border-border bg-background p-4 text-left transition-colors hover:bg-accent"
            >
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-subtle text-muted-foreground">
                  <Users className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-semibold text-foreground">
                      {member.full_name}
                    </span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                    {member.job_title ?? "—"} · {member.department ?? "—"}
                  </span>
                </span>
              </div>
              <div className="mt-4 flex flex-wrap gap-1.5">
                <Badge variant="grey">{member.open_cases} open cases</Badge>
                <Badge variant="grey">{member.open_requests} requests</Badge>
                <Badge variant="grey">{member.notes} notes</Badge>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Started {formatDate(member.start_date)}
              </p>
            </button>
          ))}
        </div>
      )}
    </HrPage>
  );
}
