import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/supabase";
import type { CompanyDetail } from "@/lib/types";

interface CompanyEditSheetProps {
  company: CompanyDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface EditFormState {
  name: string;
  segment: string;
  website: string;
  primary_domain: string;
  linkedin_url: string;
  employee_count: string;
  employee_range: string;
  description: string;
  notes: string;
}

function toInitialState(company: CompanyDetail): EditFormState {
  return {
    name: company.name ?? "",
    segment: company.segment ?? "",
    website: company.website ?? "",
    primary_domain: company.primary_domain ?? "",
    linkedin_url: company.linkedin_url ?? "",
    employee_count: company.employee_count !== null ? String(company.employee_count) : "",
    employee_range: company.employee_range ?? "",
    description: company.description ?? "",
    notes: company.notes ?? "",
  };
}

export function CompanyEditSheet({ company, open, onOpenChange }: CompanyEditSheetProps) {
  const queryClient = useQueryClient();
  const { handleApiError } = useAuth();
  const [form, setForm] = useState<EditFormState>(() => toInitialState(company));
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setForm(toInitialState(company));
      setValidationError(null);
    }
  }, [company, open]);

  const mutation = useMutation({
    mutationFn: async (changes: Record<string, string | number | null>) => {
      const { error } = await api.rpc("update_company", {
        p_company_id: company.id,
        p_changes: changes,
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success("Company updated");
      onOpenChange(false);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["company", company.id] }),
        queryClient.invalidateQueries({ queryKey: ["companies"] }),
      ]);
    },
    onError: handleApiError,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const trimmedName = form.name.trim();
    if (!trimmedName) {
      setValidationError("Company name is required.");
      return;
    }

    let parsedCount: number | null = null;
    const trimmedCount = form.employee_count.trim();
    if (trimmedCount !== "") {
      if (!/^\d+$/.test(trimmedCount)) {
        setValidationError("Employee count must be a whole non-negative number.");
        return;
      }
      parsedCount = Number.parseInt(trimmedCount, 10);
    }

    const changes: Record<string, string | number | null> = {};
    const textFields: (keyof Omit<EditFormState, "employee_count">)[] = [
      "name",
      "segment",
      "website",
      "primary_domain",
      "linkedin_url",
      "employee_range",
      "description",
      "notes",
    ];

    for (const key of textFields) {
      const nextVal = form[key].trim();
      const prevVal = (company[key] ?? "").trim();
      if (nextVal !== prevVal) {
        changes[key] = nextVal === "" ? null : nextVal;
      }
    }

    if (parsedCount !== company.employee_count) {
      changes["employee_count"] = parsedCount;
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
          <SheetTitle className="text-base font-semibold">Edit company</SheetTitle>
          <SheetDescription className="text-xs">
            Changes are saved directly to {company.name}.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
            {validationError ? (
              <p role="alert" className="rounded-md bg-tag-red px-3 py-2 text-xs text-tag-red-foreground">
                {validationError}
              </p>
            ) : null}

            <div className="space-y-1.5">
              <Label htmlFor="edit-name" className="text-xs text-muted-foreground">
                Name
              </Label>
              <Input
                id="edit-name"
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="edit-segment" className="text-xs text-muted-foreground">
                  Segment
                </Label>
                <Input
                  id="edit-segment"
                  value={form.segment}
                  onChange={(e) => update("segment", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-domain" className="text-xs text-muted-foreground">
                  Primary domain
                </Label>
                <Input
                  id="edit-domain"
                  value={form.primary_domain}
                  onChange={(e) => update("primary_domain", e.target.value)}
                  placeholder="example.com"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-website" className="text-xs text-muted-foreground">
                Website
              </Label>
              <Input
                id="edit-website"
                value={form.website}
                onChange={(e) => update("website", e.target.value)}
                placeholder="https://example.com"
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
                placeholder="https://linkedin.com/company/…"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="edit-emp-count" className="text-xs text-muted-foreground">
                  Employee count
                </Label>
                <Input
                  id="edit-emp-count"
                  inputMode="numeric"
                  value={form.employee_count}
                  onChange={(e) => update("employee_count", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-emp-range" className="text-xs text-muted-foreground">
                  Employee range
                </Label>
                <Input
                  id="edit-emp-range"
                  value={form.employee_range}
                  onChange={(e) => update("employee_range", e.target.value)}
                  placeholder="51-200"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-description" className="text-xs text-muted-foreground">
                Description
              </Label>
              <Textarea
                id="edit-description"
                rows={3}
                value={form.description}
                onChange={(e) => update("description", e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-notes" className="text-xs text-muted-foreground">
                Notes
              </Label>
              <Textarea
                id="edit-notes"
                rows={3}
                value={form.notes}
                onChange={(e) => update("notes", e.target.value)}
              />
            </div>
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