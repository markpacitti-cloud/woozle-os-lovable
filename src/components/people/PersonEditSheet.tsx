import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/supabase";
import type { PersonEmail, PersonListItem } from "@/lib/types";

interface PersonEditSheetProps {
  person: PersonListItem;
  emails: PersonEmail[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface EditFormState {
  first_name: string;
  last_name: string;
  full_name: string;
  phone: string;
  linkedin_url: string;
  primary_email_id: string;
}

const NO_PRIMARY = "__none__";

function toInitialState(person: PersonListItem): EditFormState {
  return {
    first_name: person.first_name ?? "",
    last_name: person.last_name ?? "",
    full_name: person.full_name ?? "",
    phone: person.phone ?? "",
    linkedin_url: person.linkedin_url ?? "",
    primary_email_id: person.primary_email_id ?? NO_PRIMARY,
  };
}

export function PersonEditSheet({ person, emails, open, onOpenChange }: PersonEditSheetProps) {
  const queryClient = useQueryClient();
  const { handleApiError } = useAuth();
  const [form, setForm] = useState<EditFormState>(() => toInitialState(person));
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setForm(toInitialState(person));
      setValidationError(null);
    }
  }, [person, open]);

  const mutation = useMutation({
    mutationFn: async (changes: Record<string, string | null>) => {
      const { error } = await api.rpc("update_person", {
        p_person_id: person.id,
        p_changes: changes,
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success("Person updated");
      onOpenChange(false);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["person", person.id] }),
        queryClient.invalidateQueries({ queryKey: ["person-emails", person.id] }),
        queryClient.invalidateQueries({ queryKey: ["people"] }),
        queryClient.invalidateQueries({ queryKey: ["company-people"] }),
      ]);
    },
    onError: handleApiError,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const trimmedFirst = form.first_name.trim();
    const trimmedLast = form.last_name.trim();
    const trimmedFull = form.full_name.trim();
    if (!trimmedFull && !trimmedFirst && !trimmedLast) {
      setValidationError("Enter a full name or first and last name.");
      return;
    }

    const changes: Record<string, string | null> = {};
    const textFields: (keyof Omit<EditFormState, "primary_email_id">)[] = [
      "first_name",
      "last_name",
      "full_name",
      "phone",
      "linkedin_url",
    ];

    for (const key of textFields) {
      const nextVal = form[key].trim();
      const prevVal = (person[key] ?? "").trim();
      if (nextVal !== prevVal) {
        changes[key] = nextVal === "" ? null : nextVal;
      }
    }

    const nextEmailId = form.primary_email_id === NO_PRIMARY ? null : form.primary_email_id;
    const prevEmailId = person.primary_email_id ?? null;
    if (emails.length > 0 && nextEmailId !== prevEmailId) {
      changes["primary_email_id"] = nextEmailId;
    }

    if (Object.keys(changes).length === 0) {
      onOpenChange(false);
      return;
    }

    mutation.mutate(changes);
  };

  const update = (key: keyof EditFormState, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col p-0 sm:max-w-md">
        <SheetHeader className="border-b border-border px-5 py-4 text-left">
          <SheetTitle className="text-base font-semibold">Edit person</SheetTitle>
          <SheetDescription className="text-xs">
            Changes are saved directly to {person.full_name}.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
            {validationError ? (
              <p
                role="alert"
                className="rounded-md bg-tag-red px-3 py-2 text-xs text-tag-red-foreground"
              >
                {validationError}
              </p>
            ) : null}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="edit-first-name" className="text-xs text-muted-foreground">
                  First name
                </Label>
                <Input
                  id="edit-first-name"
                  value={form.first_name}
                  onChange={(e) => update("first_name", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-last-name" className="text-xs text-muted-foreground">
                  Last name
                </Label>
                <Input
                  id="edit-last-name"
                  value={form.last_name}
                  onChange={(e) => update("last_name", e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-full-name" className="text-xs text-muted-foreground">
                Full name
              </Label>
              <Input
                id="edit-full-name"
                value={form.full_name}
                onChange={(e) => update("full_name", e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-phone" className="text-xs text-muted-foreground">
                Phone
              </Label>
              <Input
                id="edit-phone"
                value={form.phone}
                onChange={(e) => update("phone", e.target.value)}
                placeholder="+44 20 7946 0000"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-linkedin" className="text-xs text-muted-foreground">
                LinkedIn URL
              </Label>
              <Input
                id="edit-linkedin"
                value={form.linkedin_url}
                onChange={(e) => update("linkedin_url", e.target.value)}
                placeholder="https://linkedin.com/in/…"
              />
            </div>

            {emails.length > 0 ? (
              <div className="space-y-1.5">
                <Label htmlFor="edit-primary-email" className="text-xs text-muted-foreground">
                  Primary email
                </Label>
                <Select
                  value={form.primary_email_id}
                  onValueChange={(val) => update("primary_email_id", val)}
                >
                  <SelectTrigger id="edit-primary-email" className="h-9 text-sm">
                    <SelectValue placeholder="Select primary email" />
                  </SelectTrigger>
                  <SelectContent>
                    {emails.map((item) => (
                      <SelectItem key={item.id} value={item.id} className="text-xs">
                        {item.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
          </div>

          <SheetFooter className="border-t border-border px-5 py-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={mutation.isPending}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving…" : "Save changes"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}