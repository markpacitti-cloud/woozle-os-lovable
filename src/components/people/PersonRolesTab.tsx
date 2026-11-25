import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Briefcase, Plus, Search, X } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { formatDate, formatText } from "@/lib/format";
import { api } from "@/lib/supabase";
import type { CompanyListItem, EmploymentRole } from "@/lib/types";

interface PersonRolesTabProps {
  personId: string;
  canEdit: boolean;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function PersonRolesTab({ personId, canEdit }: PersonRolesTabProps) {
  const queryClient = useQueryClient();
  const { handleApiError } = useAuth();

  const [addOpen, setAddOpen] = useState(false);
  const [companySearch, setCompanySearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedCompany, setSelectedCompany] = useState<{ id: string; name: string } | null>(null);
  const [title, setTitle] = useState("");
  const [startedOn, setStartedOn] = useState("");
  const [isCurrent, setIsCurrent] = useState(true);
  const [isPrimary, setIsPrimary] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const [endingRole, setEndingRole] = useState<EmploymentRole | null>(null);
  const [endedOn, setEndedOn] = useState("");
  const [endError, setEndError] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(companySearch.trim()), 200);
    return () => window.clearTimeout(timer);
  }, [companySearch]);

  const rolesQuery = useQuery({
    queryKey: ["person-roles", personId],
    queryFn: async () => {
      const { data, error } = await api
        .from("employment_history")
        .select(
          "id,person_id,person_name,company_id,company_name,title,started_on,ended_on,is_current,is_primary,source,created_at,updated_at",
        )
        .eq("person_id", personId)
        .order("is_current", { ascending: false })
        .order("started_on", { ascending: false, nullsFirst: false });
      if (error) {
        handleApiError(error);
        throw error;
      }
      return (data ?? []) as EmploymentRole[];
    },
  });

  const companyOptionsQuery = useQuery({
    queryKey: ["role-company-options", debouncedSearch],
    enabled: addOpen && !selectedCompany,
    queryFn: async () => {
      let req = api
        .from("companies_list")
        .select("id,name,primary_domain")
        .order("name", { ascending: true })
        .limit(12);
      if (debouncedSearch) {
        req = req.ilike("name", `%${debouncedSearch}%`);
      }
      const { data, error } = await req;
      if (error) {
        handleApiError(error);
        throw error;
      }
      return (data ?? []) as Pick<CompanyListItem, "id" | "name" | "primary_domain">[];
    },
  });

  const invalidateRoleQueries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["person-roles", personId] }),
      queryClient.invalidateQueries({ queryKey: ["person", personId] }),
      queryClient.invalidateQueries({ queryKey: ["people"] }),
      queryClient.invalidateQueries({ queryKey: ["company-people"] }),
    ]);
  };

  const addRoleMutation = useMutation({
    mutationFn: async (args: {
      p_person_id: string;
      p_company_id?: string;
      p_title?: string;
      p_started_on?: string;
      p_is_current: boolean;
      p_is_primary: boolean;
    }) => {
      const { error } = await api.rpc("add_person_role", args);
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success("Role added");
      setAddOpen(false);
      resetAddForm();
      await invalidateRoleQueries();
    },
    onError: handleApiError,
  });

  const endRoleMutation = useMutation({
    mutationFn: async (args: { p_role_id: string; p_ended_on?: string }) => {
      const { error } = await api.rpc("end_person_role", args);
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success("Role ended");
      setEndingRole(null);
      setEndedOn("");
      setEndError(null);
      await invalidateRoleQueries();
    },
    onError: handleApiError,
  });

  const resetAddForm = () => {
    setCompanySearch("");
    setDebouncedSearch("");
    setSelectedCompany(null);
    setTitle("");
    setStartedOn("");
    setIsCurrent(true);
    setIsPrimary(false);
    setAddError(null);
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);
    const trimmedTitle = title.trim();
    if (!selectedCompany && !trimmedTitle) {
      setAddError("Select a company or enter a title.");
      return;
    }
    if (startedOn && !DATE_RE.test(startedOn)) {
      setAddError("Start date must be YYYY-MM-DD.");
      return;
    }
    const args: {
      p_person_id: string;
      p_company_id?: string;
      p_title?: string;
      p_started_on?: string;
      p_is_current: boolean;
      p_is_primary: boolean;
    } = {
      p_person_id: personId,
      p_is_current: isCurrent,
      p_is_primary: isPrimary,
    };
    if (selectedCompany) args.p_company_id = selectedCompany.id;
    if (trimmedTitle) args.p_title = trimmedTitle;
    if (startedOn) args.p_started_on = startedOn;
    addRoleMutation.mutate(args);
  };

  const handleEndSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!endingRole) return;
    setEndError(null);
    if (endedOn && !DATE_RE.test(endedOn)) {
      setEndError("End date must be YYYY-MM-DD.");
      return;
    }
    const args: { p_role_id: string; p_ended_on?: string } = { p_role_id: endingRole.id };
    if (endedOn) args.p_ended_on = endedOn;
    endRoleMutation.mutate(args);
  };

  const rows = rolesQuery.data ?? [];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">
          {rolesQuery.isPending ? "" : `${rows.length} ${rows.length === 1 ? "role" : "roles"}`}
        </span>
        {canEdit ? (
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={() => {
              resetAddForm();
              setAddOpen(true);
            }}
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Add role
          </Button>
        ) : null}
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="border-b border-border bg-surface-subtle">
            <tr className="h-9 text-xs font-medium text-muted-foreground">
              <th className="px-4 font-medium">Company</th>
              <th className="px-4 font-medium">Title</th>
              <th className="px-4 font-medium">Status</th>
              <th className="hidden px-4 font-medium md:table-cell">Dates</th>
              {canEdit ? <th className="px-4 text-right font-medium">Actions</th> : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-row-divider">
            {rolesQuery.isPending ? (
              Array.from({ length: 4 }).map((_, idx) => (
                <tr key={idx} className="h-[46px]">
                  <td className="px-4"><Skeleton className="h-4 w-36" /></td>
                  <td className="px-4"><Skeleton className="h-4 w-32" /></td>
                  <td className="px-4"><Skeleton className="h-4 w-20" /></td>
                  <td className="hidden px-4 md:table-cell"><Skeleton className="h-4 w-28" /></td>
                  {canEdit ? <td className="px-4"><Skeleton className="ml-auto h-4 w-16" /></td> : null}
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={canEdit ? 5 : 4} className="px-4 py-12 text-center">
                  <Briefcase className="mx-auto h-4 w-4 text-muted-foreground" />
                  <p className="mt-2 text-sm font-medium text-foreground">No roles recorded</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Current and past employment history for this person will appear here.
                  </p>
                </td>
              </tr>
            ) : (
              rows.map((role) => (
                <tr key={role.id} className="h-[46px] hover:bg-accent/50">
                  <td className="px-4 font-medium text-foreground">
                    {role.company_id && role.company_name ? (
                      <Link
                        to="/companies/$companyId"
                        params={{ companyId: role.company_id }}
                        className="text-link hover:underline"
                      >
                        {role.company_name}
                      </Link>
                    ) : (
                      formatText(role.company_name)
                    )}
                  </td>
                  <td className="px-4 text-muted-foreground">{formatText(role.title)}</td>
                  <td className="px-4">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge variant={role.is_current ? "green" : "grey"}>
                        {role.is_current ? "Current" : "Past"}
                      </Badge>
                      {role.is_primary ? <Badge variant="blue">Primary</Badge> : null}
                    </div>
                  </td>
                  <td className="hidden whitespace-nowrap px-4 text-xs text-muted-foreground md:table-cell">
                    {role.started_on || role.ended_on
                      ? `${formatDate(role.started_on)} – ${role.is_current ? "Present" : formatDate(role.ended_on)}`
                      : "—"}
                  </td>
                  {canEdit ? (
                    <td className="px-4 text-right">
                      {role.is_current ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => {
                            setEndingRole(role);
                            setEndedOn(new Date().toISOString().slice(0, 10));
                            setEndError(null);
                          }}
                        >
                          End role
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                  ) : null}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">Add role</DialogTitle>
            <DialogDescription className="text-xs">
              Add a current or past role to this person&apos;s employment history.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddSubmit} className="space-y-4">
            {addError ? (
              <p
                role="alert"
                className="rounded-md bg-tag-red px-3 py-2 text-xs text-tag-red-foreground"
              >
                {addError}
              </p>
            ) : null}

            <div className="space-y-1.5">
              <Label htmlFor="role-company-search" className="text-xs text-muted-foreground">
                Company
              </Label>
              {selectedCompany ? (
                <div className="flex h-9 items-center justify-between rounded-md border border-border bg-surface-subtle px-3 text-sm">
                  <span className="truncate font-medium text-foreground">{selectedCompany.name}</span>
                  <button
                    type="button"
                    onClick={() => setSelectedCompany(null)}
                    aria-label="Clear company"
                    className="ml-2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <div className="relative">
                    <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="role-company-search"
                      value={companySearch}
                      onChange={(e) => setCompanySearch(e.target.value)}
                      placeholder="Search companies…"
                      className="pl-8 text-sm"
                    />
                  </div>
                  <div className="max-h-36 overflow-y-auto rounded-md border border-border bg-background">
                    {companyOptionsQuery.isPending ? (
                      <p className="px-3 py-2 text-xs text-muted-foreground">Loading companies…</p>
                    ) : (companyOptionsQuery.data?.length ?? 0) === 0 ? (
                      <p className="px-3 py-2 text-xs text-muted-foreground">No companies found.</p>
                    ) : (
                      companyOptionsQuery.data?.map((company) => (
                        <button
                          key={company.id}
                          type="button"
                          onClick={() =>
                            setSelectedCompany({ id: company.id, name: company.name })
                          }
                          className="flex w-full items-center justify-between px-3 py-1.5 text-left text-xs hover:bg-accent"
                        >
                          <span className="truncate font-medium text-foreground">
                            {company.name}
                          </span>
                          {company.primary_domain ? (
                            <span className="ml-2 shrink-0 text-muted-foreground">
                              {company.primary_domain}
                            </span>
                          ) : null}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="role-title" className="text-xs text-muted-foreground">
                Title
              </Label>
              <Input
                id="role-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Portfolio Manager"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="role-started-on" className="text-xs text-muted-foreground">
                Started on (optional)
              </Label>
              <Input
                id="role-started-on"
                type="date"
                value={startedOn}
                onChange={(e) => setStartedOn(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-2.5 pt-1">
              <label className="flex items-center gap-2 text-xs text-foreground">
                <Checkbox
                  checked={isCurrent}
                  onCheckedChange={(checked) => setIsCurrent(checked === true)}
                />
                <span>Current role</span>
              </label>
              <label className="flex items-center gap-2 text-xs text-foreground">
                <Checkbox
                  checked={isPrimary}
                  onCheckedChange={(checked) => setIsPrimary(checked === true)}
                />
                <span>Set as primary role</span>
              </label>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={addRoleMutation.isPending}
                onClick={() => setAddOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={addRoleMutation.isPending}>
                {addRoleMutation.isPending ? "Adding…" : "Add role"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(endingRole)} onOpenChange={(open) => !open && setEndingRole(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">End role</DialogTitle>
            <DialogDescription className="text-xs">
              Mark {endingRole?.title || "this role"}
              {endingRole?.company_name ? ` at ${endingRole.company_name}` : ""} as past.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEndSubmit} className="space-y-4">
            {endError ? (
              <p
                role="alert"
                className="rounded-md bg-tag-red px-3 py-2 text-xs text-tag-red-foreground"
              >
                {endError}
              </p>
            ) : null}

            <div className="space-y-1.5">
              <Label htmlFor="role-ended-on" className="text-xs text-muted-foreground">
                Ended on (optional)
              </Label>
              <Input
                id="role-ended-on"
                type="date"
                value={endedOn}
                onChange={(e) => setEndedOn(e.target.value)}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={endRoleMutation.isPending}
                onClick={() => setEndingRole(null)}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={endRoleMutation.isPending}>
                {endRoleMutation.isPending ? "Ending…" : "End role"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}