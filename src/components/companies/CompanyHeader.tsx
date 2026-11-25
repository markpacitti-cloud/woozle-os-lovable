import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Archive, ArrowLeft, ExternalLink, Pencil, RotateCcw } from "lucide-react";
import { toast } from "sonner";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { formatDateTime, toExternalHref } from "@/lib/format";
import { api } from "@/lib/supabase";
import type { CompanyDetail, StaffOption } from "@/lib/types";

interface CompanyHeaderProps {
  company: CompanyDetail;
  canEdit: boolean;
  onOpenEdit: () => void;
}

const UNASSIGNED = "__unassigned__";

export function CompanyHeader({ company, canEdit, onOpenEdit }: CompanyHeaderProps) {
  const queryClient = useQueryClient();
  const { handleApiError } = useAuth();
  const [archiveOpen, setArchiveOpen] = useState(false);

  const staffQuery = useQuery({
    queryKey: ["staff-options"],
    queryFn: async () => {
      const { data, error } = await api
        .from("staff_options")
        .select("id,full_name,work_email")
        .order("full_name");
      if (error) {
        handleApiError(error);
        throw error;
      }
      return (data ?? []) as StaffOption[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const ownerMutation = useMutation({
    mutationFn: async (ownerStaffId: string | null) => {
      const { error } = await api.rpc("set_company_owner", {
        p_company_id: company.id,
        p_owner_staff_id: ownerStaffId,
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success("Owner updated");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["company", company.id] }),
        queryClient.invalidateQueries({ queryKey: ["companies"] }),
      ]);
    },
    onError: handleApiError,
  });

  const archiveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await api.rpc("archive_company", { p_company_id: company.id });
      if (error) throw error;
    },
    onSuccess: async () => {
      setArchiveOpen(false);
      toast.success("Company archived");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["company", company.id] }),
        queryClient.invalidateQueries({ queryKey: ["companies"] }),
      ]);
    },
    onError: handleApiError,
  });

  const restoreMutation = useMutation({
    mutationFn: async () => {
      const { error } = await api.rpc("restore_company", { p_company_id: company.id });
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success("Company restored");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["company", company.id] }),
        queryClient.invalidateQueries({ queryKey: ["companies"] }),
      ]);
    },
    onError: handleApiError,
  });

  const isArchived = Boolean(company.archived_at);
  const websiteHref = toExternalHref(company.website ?? company.primary_domain);
  const staffList = staffQuery.data ?? [];
  const currentOwnerValue = company.owner_staff_id ?? UNASSIGNED;
  const hasCurrentInOptions =
    !company.owner_staff_id || staffList.some((s) => s.id === company.owner_staff_id);

  return (
    <div className="border-b border-border bg-background px-5 py-4">
      <Link
        to="/companies"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Companies
      </Link>

      {company.merged_into_id ? (
        <div className="mt-3 rounded-md border border-border bg-surface-subtle px-3 py-2 text-xs text-muted-foreground">
          This company was merged into{" "}
          <Link
            to="/companies/$companyId"
            params={{ companyId: company.merged_into_id }}
            className="font-medium text-link hover:underline"
          >
            {company.merged_into_name ?? "another company"}
          </Link>
          .
        </div>
      ) : null}

      <div className="mt-2.5 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight text-foreground">{company.name}</h1>
            {company.segment ? <Badge variant="grey">{company.segment}</Badge> : null}
            {isArchived ? <Badge variant="red">Archived</Badge> : null}
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {websiteHref ? (
              <a
                href={websiteHref}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-link hover:underline"
              >
                <span>{company.primary_domain ?? company.website}</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            ) : null}
            <span>Last activity: {formatDateTime(company.last_activity_at)}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">Owner</span>
            <Select
              value={currentOwnerValue}
              disabled={!canEdit || isArchived || ownerMutation.isPending}
              onValueChange={(val) => ownerMutation.mutate(val === UNASSIGNED ? null : val)}
            >
              <SelectTrigger className="h-8 w-[180px] bg-surface-subtle text-xs" aria-label="Company owner">
                <SelectValue placeholder="Unassigned" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={UNASSIGNED} className="text-xs text-muted-foreground">
                  Unassigned
                </SelectItem>
                {!hasCurrentInOptions && company.owner_staff_id ? (
                  <SelectItem value={company.owner_staff_id} className="text-xs">
                    {company.owner_name ?? "Current owner"}
                  </SelectItem>
                ) : null}
                {staffList.map((member) => (
                  <SelectItem key={member.id} value={member.id} className="text-xs">
                    {member.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {canEdit && !isArchived ? (
            <>
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onOpenEdit}>
                <Pencil className="mr-1.5 h-3.5 w-3.5" />
                Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs text-destructive hover:text-destructive"
                onClick={() => setArchiveOpen(true)}
              >
                <Archive className="mr-1.5 h-3.5 w-3.5" />
                Archive
              </Button>
            </>
          ) : null}

          {canEdit && isArchived ? (
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              disabled={restoreMutation.isPending}
              onClick={() => restoreMutation.mutate()}
            >
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
              Restore
            </Button>
          ) : null}
        </div>
      </div>

      <AlertDialog open={archiveOpen} onOpenChange={setArchiveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive {company.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This hides {company.name} from the companies list. Nothing is deleted and it can be
              restored later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={archiveMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={archiveMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                archiveMutation.mutate();
              }}
            >
              {archiveMutation.isPending ? "Archiving…" : "Archive company"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}