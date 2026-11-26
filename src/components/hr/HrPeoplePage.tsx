import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Search, UserPlus } from "lucide-react";

import { HrAddJoinerDialog } from "@/components/hr/HrAddJoinerDialog";
import {
  HrEmpty,
  HrError,
  HrLoading,
  HrPage,
  HrPermissionMessage,
  HrStatusBadge,
} from "@/components/hr/HrShared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import type { HrPersonListItem } from "@/lib/hr-types";
import { api, getErrorMessage } from "@/lib/supabase";

export function HrPeoplePage() {
  const navigate = useNavigate();
  const { access, handleApiError } = useAuth();
  const canView = Boolean(access?.hr_admin_view || access?.is_global_admin);
  const canEdit = Boolean(access?.hr_admin_edit || access?.is_global_admin);
  const [addJoinerOpen, setAddJoinerOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("all");
  const [status, setStatus] = useState("all");
  const [manager, setManager] = useState("all");
  const query = useQuery({
    queryKey: ["hr-people"],
    enabled: canView,
    queryFn: async () => {
      const { data, error } = await api.from("hr_people_list").select("*").order("full_name");
      if (error) {
        handleApiError(error);
        throw error;
      }
      return (data ?? []) as HrPersonListItem[];
    },
  });
  const rows = useMemo(() => query.data ?? [], [query.data]);
  const departments = useMemo(
    () =>
      [
        ...new Set(
          rows.map((row) => row.department).filter((value): value is string => Boolean(value)),
        ),
      ].sort(),
    [rows],
  );
  const statuses = useMemo(
    () =>
      [
        ...new Set(
          rows
            .map((row) => row.employment_status)
            .filter((value): value is string => Boolean(value)),
        ),
      ].sort(),
    [rows],
  );
  const managers = useMemo(
    () =>
      [
        ...new Map(
          rows
            .filter((row) => row.line_manager_staff_id && row.line_manager_name)
            .map((row) => [row.line_manager_staff_id, row.line_manager_name]),
        ).entries(),
      ] as [string, string][],
    [rows],
  );
  const filtered = rows.filter((row) => {
    const needle = search.trim().toLowerCase();
    return (
      (!needle ||
        row.full_name.toLowerCase().includes(needle) ||
        row.work_email.toLowerCase().includes(needle)) &&
      (department === "all" || row.department === department) &&
      (status === "all" || row.employment_status === status) &&
      (manager === "all" || row.line_manager_staff_id === manager)
    );
  });

  if (!canView) return <HrPermissionMessage area="HR People" />;
  return (
    <HrPage
      title="People"
      description="HR records for the people you cover."
      actions={
        canEdit ? (
          <Button size="sm" onClick={() => setAddJoinerOpen(true)}>
            <UserPlus className="mr-1.5 h-3.5 w-3.5" />
            Add joiner
          </Button>
        ) : null
      }
    >
      <div className="flex flex-wrap gap-2 border-b border-border p-3">
        <div className="relative min-w-[220px] flex-1 sm:max-w-xs">
          <Search className="absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name or email…"
            className="bg-surface-subtle pl-8"
          />
        </div>
        <Select value={department} onValueChange={setDepartment}>
          <SelectTrigger className="w-[160px] bg-surface-subtle text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All departments</SelectItem>
            {departments.map((item) => (
              <SelectItem key={item} value={item}>
                {item}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[150px] bg-surface-subtle text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {statuses.map((item) => (
              <SelectItem key={item} value={item}>
                {item}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={manager} onValueChange={setManager}>
          <SelectTrigger className="w-[170px] bg-surface-subtle text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All managers</SelectItem>
            {managers.map(([id, name]) => (
              <SelectItem key={id} value={id}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {query.isPending ? (
        <HrLoading rows={8} />
      ) : query.isError ? (
        <HrError message={getErrorMessage(query.error)} retry={() => void query.refetch()} />
      ) : filtered.length === 0 ? (
        <HrEmpty title="No people found" description="Try changing the search or filters." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="border-b border-border bg-surface-subtle text-xs text-muted-foreground">
              <tr className="h-9">
                <th className="px-5 font-medium">Name</th>
                <th className="px-4 font-medium">Role</th>
                <th className="hidden px-4 font-medium md:table-cell">Department</th>
                <th className="hidden px-4 font-medium lg:table-cell">Manager</th>
                <th className="px-4 font-medium">Status</th>
                <th className="px-5 text-right font-medium">Open</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-row-divider">
              {filtered.map((person) => (
                <tr
                  key={person.staff_id}
                  onClick={() =>
                    void navigate({
                      to: "/hr/people/$staffId",
                      params: { staffId: person.staff_id },
                    })
                  }
                  className="h-[46px] cursor-pointer hover:bg-accent"
                >
                  <td className="px-5">
                    <span className="block font-medium">{person.full_name}</span>
                    <span className="block text-xs text-muted-foreground">{person.work_email}</span>
                  </td>
                  <td className="px-4">{person.job_title ?? "—"}</td>
                  <td className="hidden px-4 md:table-cell">{person.department ?? "—"}</td>
                  <td className="hidden px-4 lg:table-cell">{person.line_manager_name ?? "—"}</td>
                  <td className="px-4">
                    <HrStatusBadge status={person.employment_status ?? "unknown"} />
                  </td>
                  <td className="px-5 text-right text-xs text-muted-foreground">
                    {person.open_cases} cases · {person.open_requests} requests
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <HrAddJoinerDialog
        open={addJoinerOpen}
        onOpenChange={setAddJoinerOpen}
        onCreated={(staffId) =>
          void navigate({ to: "/hr/people/$staffId", params: { staffId } })
        }
      />
    </HrPage>
  );
}
