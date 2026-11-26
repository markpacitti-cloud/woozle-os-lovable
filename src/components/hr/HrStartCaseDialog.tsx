import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
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
import { useAuth } from "@/contexts/AuthContext";
import type { HrCaseTypeOption } from "@/lib/hr-types";
import type { StaffOption } from "@/lib/types";
import { api } from "@/lib/supabase";

export function HrStartCaseDialog({
  staffId,
  staffName,
  open,
  onOpenChange,
  onStarted,
}: {
  staffId: string;
  staffName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStarted: (caseId: string) => void;
}) {
  const { access, handleApiError } = useAuth();
  const isHr = Boolean(access?.hr_admin_edit || access?.is_global_admin);
  const [caseType, setCaseType] = useState("");
  const [title, setTitle] = useState("");
  const [restricted, setRestricted] = useState(false);
  const [owner, setOwner] = useState("");
  const [busy, setBusy] = useState(false);

  const optionsQuery = useQuery({
    queryKey: ["hr-case-type-options"],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await api.from("hr_case_type_options").select("*");
      if (error) {
        handleApiError(error);
        throw error;
      }
      return ((data ?? []) as HrCaseTypeOption[]).filter((option) => option.can_start);
    },
  });
  const staffQuery = useQuery({
    queryKey: ["hr-case-owners"],
    enabled: open && isHr,
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
  });

  useEffect(() => {
    if (!open) {
      setCaseType("");
      setTitle("");
      setRestricted(false);
      setOwner("");
    }
  }, [open]);

  const start = async () => {
    if (!caseType) {
      toast.error("Choose a case type.");
      return;
    }
    setBusy(true);
    const { data, error } = await api.rpc("hr_start_case", {
      p_staff_id: staffId,
      p_case_type: caseType,
      ...(title.trim() ? { p_title: title.trim() } : {}),
      ...(isHr ? { p_is_restricted: restricted } : {}),
      ...(isHr && owner ? { p_owner_staff_id: owner } : {}),
    });
    setBusy(false);
    if (error) {
      handleApiError(error);
      return;
    }
    toast.success("Case started");
    onOpenChange(false);
    onStarted(data as string);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Start a case for {staffName}</DialogTitle>
          <DialogDescription>
            Only case types you are permitted to start are listed.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label>Case type</Label>
          <Select value={caseType} onValueChange={setCaseType}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a case type" />
            </SelectTrigger>
            <SelectContent>
              {(optionsQuery.data ?? []).map((option) => (
                <SelectItem key={option.case_type} value={option.case_type}>
                  {option.label} · {option.step_count} steps
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="case-title">Optional title</Label>
          <Input id="case-title" value={title} onChange={(event) => setTitle(event.target.value)} />
        </div>
        {isHr ? (
          <>
            <label className="flex items-start gap-2 text-xs">
              <input
                type="checkbox"
                checked={restricted}
                onChange={(event) => setRestricted(event.target.checked)}
                className="mt-0.5 h-4 w-4 accent-current"
              />
              <span>
                <strong>Restricted case.</strong> Only global admins and the case owner can see it.
              </span>
            </label>
            <div className="space-y-2">
              <Label>Case owner</Label>
              <Select value={owner} onValueChange={setOwner}>
                <SelectTrigger>
                  <SelectValue placeholder="Default owner" />
                </SelectTrigger>
                <SelectContent>
                  {(staffQuery.data ?? []).map((staff) => (
                    <SelectItem key={staff.id} value={staff.id}>
                      {staff.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        ) : null}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={busy || optionsQuery.isPending} onClick={() => void start()}>
            Start case
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
