import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
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
import type { HrStaffDirectoryItem } from "@/lib/hr-types";
import { api } from "@/lib/supabase";

const NONE = "__none__";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function HrAddJoinerDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (staffId: string) => void;
}) {
  const queryClient = useQueryClient();
  const { handleApiError } = useAuth();
  const [fullName, setFullName] = useState("");
  const [personalEmail, setPersonalEmail] = useState("");
  const [workEmail, setWorkEmail] = useState("");
  const [startDate, setStartDate] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [department, setDepartment] = useState("");
  const [lineManagerId, setLineManagerId] = useState("");
  const [placeOfWork, setPlaceOfWork] = useState("");
  const [probationEndDate, setProbationEndDate] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setFullName("");
    setPersonalEmail("");
    setWorkEmail("");
    setStartDate("");
    setJobTitle("");
    setDepartment("");
    setLineManagerId("");
    setPlaceOfWork("");
    setProbationEndDate("");
  }, [open]);

  const settingsQuery = useQuery({
    queryKey: ["hr-joiner-settings"],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await api
        .from("hr_settings")
        .select("key,value")
        .in("key", ["hr.departments", "hr.places_of_work"]);
      if (error) {
        handleApiError(error);
        throw error;
      }
      return Object.fromEntries(
        (data ?? []).map((row) => [
          row.key,
          Array.isArray(row.value)
            ? row.value.filter((item): item is string => typeof item === "string")
            : [],
        ]),
      ) as Record<string, string[]>;
    },
  });

  const directoryQuery = useQuery({
    queryKey: ["hr-staff-directory"],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await api
        .from("hr_staff_directory")
        .select("staff_id,full_name,work_email")
        .order("full_name");
      if (error) {
        handleApiError(error);
        throw error;
      }
      return (data ?? []) as Pick<HrStaffDirectoryItem, "staff_id" | "full_name" | "work_email">[];
    },
  });

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const name = fullName.trim();
    const pEmail = personalEmail.trim();
    const wEmail = workEmail.trim();
    if (!name) {
      toast.error("Full name is required.");
      return;
    }
    if (!pEmail || !EMAIL_RE.test(pEmail)) {
      toast.error("Enter a valid personal email address.");
      return;
    }
    if (wEmail && !EMAIL_RE.test(wEmail)) {
      toast.error("Enter a valid work email address.");
      return;
    }
    if (!startDate) {
      toast.error("Start date is required.");
      return;
    }
    setSaving(true);
    const { data, error } = await api.rpc("hr_create_joiner", {
      p_full_name: name,
      p_work_email: wEmail || null,
      p_personal_email: pEmail,
      p_start_date: startDate,
      p_job_title: jobTitle.trim() || null,
      p_department: department || null,
      p_line_manager_staff_id: lineManagerId || null,
      p_place_of_work: placeOfWork || null,
      p_probation_end_date: probationEndDate || null,
    });
    setSaving(false);
    if (error) {
      handleApiError(error);
      return;
    }
    const staffId = typeof data === "string" ? data : String(data ?? "");
    toast.success("Joiner added");
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["hr-people"] }),
      queryClient.invalidateQueries({ queryKey: ["hr-staff-directory"] }),
    ]);
    onOpenChange(false);
    if (staffId) onCreated(staffId);
  };

  const departments = settingsQuery.data?.["hr.departments"] ?? [];
  const places = settingsQuery.data?.["hr.places_of_work"] ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add joiner</DialogTitle>
          <DialogDescription>
            Create a pre-joiner record. You can set contract type and salary on their Employment &amp; pay tab next.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={(e) => void submit(e)} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="joiner-name" className="text-xs">Full name</Label>
              <Input
                id="joiner-name"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Alex Taylor"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="joiner-personal-email" className="text-xs">Personal email</Label>
              <Input
                id="joiner-personal-email"
                type="email"
                required
                value={personalEmail}
                onChange={(e) => setPersonalEmail(e.target.value)}
                placeholder="alex@example.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="joiner-work-email" className="text-xs">Work email (optional)</Label>
              <Input
                id="joiner-work-email"
                type="email"
                value={workEmail}
                onChange={(e) => setWorkEmail(e.target.value)}
                placeholder="alex@woozleresearch.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="joiner-start-date" className="text-xs">Start date</Label>
              <Input
                id="joiner-start-date"
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="joiner-probation-end" className="text-xs">Probation end date</Label>
              <Input
                id="joiner-probation-end"
                type="date"
                value={probationEndDate}
                onChange={(e) => setProbationEndDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="joiner-job-title" className="text-xs">Job title</Label>
              <Input
                id="joiner-job-title"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Department</Label>
              <Select
                value={department || NONE}
                onValueChange={(v) => setDepartment(v === NONE ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose department…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>None</SelectItem>
                  {departments.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Line manager</Label>
              <Select
                value={lineManagerId || NONE}
                onValueChange={(v) => setLineManagerId(v === NONE ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose manager…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>None</SelectItem>
                  {(directoryQuery.data ?? []).map((item) => (
                    <SelectItem key={item.staff_id} value={item.staff_id}>
                      {item.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Place of work</Label>
              <Select
                value={placeOfWork || NONE}
                onValueChange={(v) => setPlaceOfWork(v === NONE ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose place…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>None</SelectItem>
                  {places.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" disabled={saving} onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
              Add joiner
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}