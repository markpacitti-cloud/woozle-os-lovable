import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  Archive,
  ArrowLeft,
  Building2,
  ExternalLink,
  Mail,
  Pencil,
  Phone,
  RotateCcw,
} from "lucide-react";
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
import { useAuth } from "@/contexts/AuthContext";
import { formatDateTime, toExternalHref } from "@/lib/format";
import { api } from "@/lib/supabase";
import type { PersonEmail, PersonListItem } from "@/lib/types";

interface PersonHeaderProps {
  person: PersonListItem;
  emails: PersonEmail[];
  canEdit: boolean;
  isArchived: boolean;
  onArchivedChange: (archived: boolean) => void;
  onOpenEdit: () => void;
}

export function PersonHeader({
  person,
  emails,
  canEdit,
  isArchived,
  onArchivedChange,
  onOpenEdit,
}: PersonHeaderProps) {
  const queryClient = useQueryClient();
  const { handleApiError } = useAuth();
  const [archiveOpen, setArchiveOpen] = useState(false);

  const archiveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await api.rpc("archive_person", { p_person_id: person.id });
      if (error) throw error;
    },
    onSuccess: async () => {
      setArchiveOpen(false);
      onArchivedChange(true);
      toast.success("Person archived");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["people"] }),
        queryClient.invalidateQueries({ queryKey: ["company-people"] }),
      ]);
    },
    onError: handleApiError,
  });

  const restoreMutation = useMutation({
    mutationFn: async () => {
      const { error } = await api.rpc("restore_person", { p_person_id: person.id });
      if (error) throw error;
    },
    onSuccess: async () => {
      onArchivedChange(false);
      toast.success("Person restored");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["person", person.id] }),
        queryClient.invalidateQueries({ queryKey: ["people"] }),
        queryClient.invalidateQueries({ queryKey: ["company-people"] }),
      ]);
    },
    onError: handleApiError,
  });

  const linkedinHref = toExternalHref(person.linkedin_url);
  const displayEmails =
    emails.length > 0
      ? emails
      : person.primary_email
        ? [{ id: person.primary_email_id ?? "primary", email: person.primary_email, is_primary: true }]
        : [];

  return (
    <div className="border-b border-border bg-background px-5 py-4">
      <Link
        to="/people"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        People
      </Link>

      <div className="mt-2.5 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              {person.full_name}
            </h1>
            {isArchived ? <Badge variant="red">Archived</Badge> : null}
          </div>

          {person.primary_title || person.primary_company_name ? (
            <p className="mt-1 flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
              {person.primary_title ? (
                <span className="text-foreground">{person.primary_title}</span>
              ) : null}
              {person.primary_title && person.primary_company_name ? <span>at</span> : null}
              {person.primary_company_name ? (
                person.primary_company_id ? (
                  <Link
                    to="/companies/$companyId"
                    params={{ companyId: person.primary_company_id }}
                    className="inline-flex items-center gap-1 font-medium text-link hover:underline"
                  >
                    <Building2 className="h-3.5 w-3.5 shrink-0" />
                    <span>{person.primary_company_name}</span>
                  </Link>
                ) : (
                  <span className="font-medium text-foreground">{person.primary_company_name}</span>
                )
              ) : null}
            </p>
          ) : null}

          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
            {displayEmails.map((item) => (
              <a
                key={item.id}
                href={`mailto:${item.email}`}
                className="inline-flex items-center gap-1 text-link hover:underline"
              >
                <Mail className="h-3 w-3 shrink-0" />
                <span>{item.email}</span>
                {item.is_primary && displayEmails.length > 1 ? (
                  <Badge variant="grey" className="px-1 py-0 text-[10px]">
                    Primary
                  </Badge>
                ) : null}
              </a>
            ))}
            {linkedinHref ? (
              <a
                href={linkedinHref}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-link hover:underline"
              >
                <span>LinkedIn</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            ) : null}
            {person.phone ? (
              <a
                href={`tel:${person.phone}`}
                className="inline-flex items-center gap-1 text-foreground hover:text-link hover:underline"
              >
                <Phone className="h-3 w-3 shrink-0 text-muted-foreground" />
                <span>{person.phone}</span>
              </a>
            ) : null}
            <span>Last activity: {formatDateTime(person.last_activity_at)}</span>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
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
            <AlertDialogTitle>Archive {person.full_name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This hides {person.full_name} from the people list. Nothing is deleted and they can be
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
              {archiveMutation.isPending ? "Archiving…" : "Archive person"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}