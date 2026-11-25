import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Mail, Plus } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { formatDateTime, formatText } from "@/lib/format";
import { api } from "@/lib/supabase";
import type { PersonEmail } from "@/lib/types";

interface PersonEmailsTabProps {
  personId: string;
  emails: PersonEmail[];
  isPending: boolean;
  canEdit: boolean;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function emailStatusBadge(status: string | null): "green" | "red" | "grey" {
  if (status === "active") return "green";
  if (status === "bounced" || status === "invalid") return "red";
  return "grey";
}

export function PersonEmailsTab({ personId, emails, isPending, canEdit }: PersonEmailsTabProps) {
  const queryClient = useQueryClient();
  const { handleApiError } = useAuth();

  const [addOpen, setAddOpen] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [emailType, setEmailType] = useState("");
  const [emailStatus, setEmailStatus] = useState("active");
  const [makePrimary, setMakePrimary] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const invalidateEmailQueries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["person-emails", personId] }),
      queryClient.invalidateQueries({ queryKey: ["person", personId] }),
      queryClient.invalidateQueries({ queryKey: ["people"] }),
      queryClient.invalidateQueries({ queryKey: ["company-people"] }),
    ]);
  };

  const addEmailMutation = useMutation({
    mutationFn: async (args: {
      p_person_id: string;
      p_email: string;
      p_type?: string;
      p_status: string;
      p_make_primary: boolean;
    }) => {
      const { error } = await api.rpc("add_person_email", args);
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success("Email added");
      setAddOpen(false);
      resetForm();
      await invalidateEmailQueries();
    },
    onError: handleApiError,
  });

  const setPrimaryMutation = useMutation({
    mutationFn: async (emailId: string) => {
      const { error } = await api.rpc("update_person", {
        p_person_id: personId,
        p_changes: { primary_email_id: emailId },
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success("Primary email updated");
      await invalidateEmailQueries();
    },
    onError: handleApiError,
  });

  const resetForm = () => {
    setEmailInput("");
    setEmailType("");
    setEmailStatus("active");
    setMakePrimary(false);
    setValidationError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    const trimmed = emailInput.trim();
    if (!trimmed || !EMAIL_RE.test(trimmed)) {
      setValidationError("Enter a valid email address.");
      return;
    }
    const args: {
      p_person_id: string;
      p_email: string;
      p_type?: string;
      p_status: string;
      p_make_primary: boolean;
    } = {
      p_person_id: personId,
      p_email: trimmed,
      p_status: emailStatus,
      p_make_primary: makePrimary,
    };
    if (emailType.trim()) {
      args.p_type = emailType.trim();
    }
    addEmailMutation.mutate(args);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">
          {isPending ? "" : `${emails.length} ${emails.length === 1 ? "email" : "emails"}`}
        </span>
        {canEdit ? (
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={() => {
              resetForm();
              setAddOpen(true);
            }}
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Add email
          </Button>
        ) : null}
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="border-b border-border bg-surface-subtle">
            <tr className="h-9 text-xs font-medium text-muted-foreground">
              <th className="px-4 font-medium">Email</th>
              <th className="hidden px-4 font-medium sm:table-cell">Type</th>
              <th className="px-4 font-medium">Status</th>
              <th className="hidden px-4 font-medium md:table-cell">Verified</th>
              <th className="hidden px-4 font-medium lg:table-cell">Source</th>
              {canEdit ? <th className="px-4 text-right font-medium">Actions</th> : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-row-divider">
            {isPending ? (
              Array.from({ length: 3 }).map((_, idx) => (
                <tr key={idx} className="h-[46px]">
                  <td className="px-4"><Skeleton className="h-4 w-48" /></td>
                  <td className="hidden px-4 sm:table-cell"><Skeleton className="h-4 w-16" /></td>
                  <td className="px-4"><Skeleton className="h-4 w-16" /></td>
                  <td className="hidden px-4 md:table-cell"><Skeleton className="h-4 w-28" /></td>
                  <td className="hidden px-4 lg:table-cell"><Skeleton className="h-4 w-20" /></td>
                  {canEdit ? <td className="px-4"><Skeleton className="ml-auto h-4 w-20" /></td> : null}
                </tr>
              ))
            ) : emails.length === 0 ? (
              <tr>
                <td colSpan={canEdit ? 6 : 5} className="px-4 py-12 text-center">
                  <Mail className="mx-auto h-4 w-4 text-muted-foreground" />
                  <p className="mt-2 text-sm font-medium text-foreground">No emails recorded</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Email addresses for this person will appear here.
                  </p>
                </td>
              </tr>
            ) : (
              emails.map((item) => (
                <tr key={item.id} className="h-[46px] hover:bg-accent/50">
                  <td className="px-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <a
                        href={`mailto:${item.email}`}
                        className="font-medium text-link hover:underline"
                      >
                        {item.email}
                      </a>
                      {item.is_primary ? <Badge variant="blue">Primary</Badge> : null}
                    </div>
                  </td>
                  <td className="hidden px-4 text-muted-foreground sm:table-cell">
                    {formatText(item.type)}
                  </td>
                  <td className="px-4">
                    {item.status ? (
                      <Badge variant={emailStatusBadge(item.status)}>{item.status}</Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="hidden whitespace-nowrap px-4 text-xs text-muted-foreground md:table-cell">
                    {formatDateTime(item.verified_at)}
                  </td>
                  <td className="hidden px-4 text-xs text-muted-foreground lg:table-cell">
                    {formatText(item.source)}
                  </td>
                  {canEdit ? (
                    <td className="px-4 text-right">
                      {!item.is_primary ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                          disabled={setPrimaryMutation.isPending}
                          onClick={() => setPrimaryMutation.mutate(item.id)}
                        >
                          Set primary
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
            <DialogTitle className="text-base font-semibold">Add email</DialogTitle>
            <DialogDescription className="text-xs">
              Add an email address to this person&apos;s record.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {validationError ? (
              <p
                role="alert"
                className="rounded-md bg-tag-red px-3 py-2 text-xs text-tag-red-foreground"
              >
                {validationError}
              </p>
            ) : null}

            <div className="space-y-1.5">
              <Label htmlFor="add-email-address" className="text-xs text-muted-foreground">
                Email address
              </Label>
              <Input
                id="add-email-address"
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="alex@company.com"
                required
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="add-email-type" className="text-xs text-muted-foreground">
                  Type (optional)
                </Label>
                <Input
                  id="add-email-type"
                  value={emailType}
                  onChange={(e) => setEmailType(e.target.value)}
                  placeholder="work"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="add-email-status" className="text-xs text-muted-foreground">
                  Status
                </Label>
                <Select value={emailStatus} onValueChange={setEmailStatus}>
                  <SelectTrigger id="add-email-status" className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active" className="text-xs">active</SelectItem>
                    <SelectItem value="inactive" className="text-xs">inactive</SelectItem>
                    <SelectItem value="bounced" className="text-xs">bounced</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <label className="flex items-center gap-2 text-xs text-foreground">
              <Checkbox
                checked={makePrimary}
                onCheckedChange={(checked) => setMakePrimary(checked === true)}
              />
              <span>Make primary email</span>
            </label>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={addEmailMutation.isPending}
                onClick={() => setAddOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={addEmailMutation.isPending}>
                {addEmailMutation.isPending ? "Adding…" : "Add email"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}