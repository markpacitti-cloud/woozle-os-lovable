import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, Pencil, Upload } from "lucide-react";
import { toast } from "sonner";

import { HrDetail, HrEmpty, HrError, HrLoading } from "@/components/hr/HrShared";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
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
import { formatDate, formatDateTime, formatMoney } from "@/lib/format";
import { fileToBase64, invokeHrFunction, openHrFile, validateHrUpload } from "@/lib/hr";
import type { HrPersonPrivate, HrStaffDirectoryItem } from "@/lib/hr-types";
import { api, getErrorMessage } from "@/lib/supabase";

const EDIT_FIELDS = [
  ["legal_name", "Legal name", "text"],
  ["personal_email", "Personal email", "email"],
  ["personal_phone", "Personal phone", "tel"],
  ["annual_salary", "Annual salary", "number"],
  ["contract_template", "Contract template", "text"],
  ["contract_end_date", "Contract end date", "date"],
  ["notice_period", "Notice period", "text"],
  ["hours_per_week", "Hours per week", "number"],
  ["ni_number", "National Insurance number", "text"],
  ["starter_statement", "Starter statement", "text"],
  ["previous_pay", "Previous pay", "text"],
  ["student_loan_plan", "Student loan plan", "text"],
  ["student_loan_start", "Student loan start", "date"],
  ["student_loan_end", "Student loan end", "date"],
  ["postgraduate_loan_start", "Postgraduate loan start", "date"],
  ["postgraduate_loan_end", "Postgraduate loan end", "date"],
  ["visa_hours_cap", "Visa hours cap", "text"],
  ["bank_sort_code", "Bank sort code", "text"],
  ["bank_account_number", "Bank account number", "text"],
  ["address_line1", "Address line 1", "text"],
  ["address_line2", "Address line 2", "text"],
  ["city", "Town / city", "text"],
  ["region", "Region", "text"],
  ["postcode", "Postcode", "text"],
  ["country", "Country", "text"],
  ["gender", "Gender", "text"],
  ["date_of_birth", "Date of birth", "date"],
  ["next_of_kin_name", "Next of kin", "text"],
  ["next_of_kin_relationship", "Relationship", "text"],
  ["next_of_kin_phone", "Next of kin phone", "tel"],
  ["next_of_kin_email", "Next of kin email", "email"],
  ["rtw_share_code", "Right-to-work share code", "text"],
  ["rtw_expiry", "Right-to-work expiry", "date"],
] as const;

const BOOLEAN_FIELDS = [
  ["has_student_loan", "Student loan"],
  ["has_postgraduate_loan", "Postgraduate loan"],
  ["is_studies_finished_before_april", "Studies finished before April"],
  ["has_pension_elsewhere", "Pension elsewhere"],
] as const;

export function HrEmploymentPay({
  person,
  canEdit,
}: {
  person: HrStaffDirectoryItem;
  canEdit: boolean;
}) {
  const { handleApiError } = useAuth();
  const [editOpen, setEditOpen] = useState(false);
  const [values, setValues] = useState<Record<string, string | boolean>>({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const query = useQuery({
    queryKey: ["hr-person-private", person.staff_id],
    queryFn: async () => {
      const { data, error } = await api
        .from("hr_person_private")
        .select("*")
        .eq("staff_id", person.staff_id)
        .maybeSingle();
      if (error) {
        handleApiError(error);
        throw error;
      }
      return (data ?? null) as HrPersonPrivate | null;
    },
  });
  const record = query.data;

  useEffect(() => {
    if (!record || !editOpen) return;
    const source = record as unknown as Record<string, unknown>;
    const next: Record<string, string | boolean> = {};
    for (const [key] of EDIT_FIELDS) next[key] = String(source[key] ?? "");
    for (const [key] of BOOLEAN_FIELDS) next[key] = source[key] === true;
    setValues(next);
  }, [editOpen, record]);

  const save = async () => {
    setSaving(true);
    const changes: Record<string, unknown> = {};
    for (const [key, , type] of EDIT_FIELDS) {
      const value = values[key] ?? "";
      changes[key] = type === "number" ? (value === "" ? null : Number(value)) : value;
    }
    for (const [key] of BOOLEAN_FIELDS) changes[key] = values[key] === true;
    const { error } = await api.rpc("hr_update_private", {
      p_staff_id: person.staff_id,
      p_changes: changes,
    });
    setSaving(false);
    if (error) {
      handleApiError(error);
      return;
    }
    toast.success("Employment and pay updated");
    setEditOpen(false);
    await query.refetch();
  };

  const upload = async (file: File | undefined) => {
    if (!file) return;
    const problem = validateHrUpload(file);
    if (problem) {
      toast.error(problem);
      return;
    }
    setUploading(true);
    try {
      await invokeHrFunction("hr-files", {
        action: "upload",
        kind: "rtw",
        id: person.staff_id,
        file_name: file.name,
        content_type: file.type,
        data_base64: await fileToBase64(file),
      });
      toast.success("Right-to-work evidence uploaded");
      await query.refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  if (query.isPending) return <HrLoading rows={4} />;
  if (query.isError)
    return <HrError message={getErrorMessage(query.error)} retry={() => void query.refetch()} />;
  if (!record)
    return (
      <HrEmpty
        title="No private record"
        description="No employment and pay details are available for this person."
      />
    );

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" disabled={!canEdit} onClick={() => setEditOpen(true)}>
          <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit private details
        </Button>
      </div>
      <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <HrDetail
          label="Annual salary"
          value={formatMoney(
            record.annual_salary,
            record.salary_currency,
            record.annual_salary_gbp,
          )}
        />
        <HrDetail label="Hours per week" value={record.hours_per_week} />
        <HrDetail label="Contract" value={record.contract_template} />
        <HrDetail label="Contract end" value={formatDate(record.contract_end_date)} />
        <HrDetail label="Notice period" value={record.notice_period} />
        <HrDetail label="Personal email" value={record.personal_email} />
        <HrDetail label="Personal phone" value={record.personal_phone} />
        <HrDetail label="NI number" value={record.ni_number} />
        <HrDetail label="Bank sort code" value={record.bank_sort_code} />
        <HrDetail label="Bank account" value={record.bank_account_number} />
        <HrDetail label="Next of kin" value={record.next_of_kin_name} />
        <HrDetail label="Right-to-work expiry" value={formatDate(record.rtw_expiry)} />
        <HrDetail label="Payroll submitted" value={formatDateTime(record.payroll_submitted_at)} />
      </dl>
      <div className="rounded-lg border border-border">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div>
            <h3 className="text-sm font-semibold">Passport & right-to-work evidence</h3>
            <p className="text-xs text-muted-foreground">PDF, JPEG or PNG, up to 10 MB.</p>
          </div>
          {canEdit ? (
            <Label className="inline-flex cursor-pointer items-center rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-accent">
              <Upload className="mr-1.5 h-3.5 w-3.5" />
              {uploading ? "Uploading…" : "Upload evidence"}
              <input
                type="file"
                className="hidden"
                disabled={uploading}
                accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                onChange={(event) => {
                  void upload(event.target.files?.[0]);
                  event.target.value = "";
                }}
              />
            </Label>
          ) : null}
        </div>
        {(record.rtw_evidence_paths ?? []).length === 0 ? (
          <p className="px-4 py-5 text-xs text-muted-foreground">No evidence uploaded.</p>
        ) : (
          <ul className="divide-y divide-row-divider">
            {record.rtw_evidence_paths?.map((path, index) => (
              <li key={path} className="flex items-center justify-between px-4 py-2.5 text-xs">
                <span className="truncate">Evidence {index + 1}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    void openHrFile("rtw", person.staff_id, index + 1).catch((error: unknown) =>
                      toast.error(error instanceof Error ? error.message : "Could not open file"),
                    )
                  }
                >
                  <Download className="mr-1.5 h-3.5 w-3.5" />
                  View
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit employment & pay</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {EDIT_FIELDS.map(([key, label, type]) => (
              <div key={key} className="space-y-1.5">
                <Label className="text-xs">{label}</Label>
                <Input
                  type={type}
                  value={typeof values[key] === "string" ? (values[key] as string) : ""}
                  onChange={(event) =>
                    setValues((current) => ({ ...current, [key]: event.target.value }))
                  }
                />
              </div>
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {BOOLEAN_FIELDS.map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={values[key] === true}
                  onChange={(event) =>
                    setValues((current) => ({ ...current, [key]: event.target.checked }))
                  }
                  className="h-4 w-4 accent-current"
                />
                {label}
              </label>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button disabled={saving} onClick={() => void save()}>
              Save private details
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function HrEmploymentEditor({
  person,
  open,
  onOpenChange,
  onSaved,
}: {
  person: HrStaffDirectoryItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => Promise<void> | void;
}) {
  const { handleApiError } = useAuth();
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const settingsQuery = useQuery({
    queryKey: ["hr-employment-settings"],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await api
        .from("hr_settings")
        .select("key,value")
        .in("key", ["hr.departments", "hr.grades", "hr.employment_statuses", "hr.places_of_work"]);
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
      );
    },
  });
  const directoryQuery = useQuery({
    queryKey: ["hr-staff-directory"],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await api
        .from("hr_staff_directory")
        .select(
          "staff_id,full_name,work_email,job_title,department,grade,employment_status,start_date,probation_end_date,leave_date,place_of_work,line_manager_staff_id,line_manager_name,can_sign_in",
        )
        .order("full_name");
      if (error) {
        handleApiError(error);
        throw error;
      }
      return (data ?? []) as HrStaffDirectoryItem[];
    },
  });
  useEffect(() => {
    if (!open) return;
    setValues({
      job_title: person.job_title ?? "",
      department: person.department ?? "",
      grade: person.grade ?? "",
      line_manager_staff_id: person.line_manager_staff_id ?? "",
      employment_status: person.employment_status ?? "",
      start_date: person.start_date ?? "",
      probation_end_date: person.probation_end_date ?? "",
      leave_date: person.leave_date ?? "",
      place_of_work: person.place_of_work ?? "",
    });
  }, [open, person]);
  const selectField = (key: string, label: string, settingKey: string) => (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Select
        value={values[key] ?? ""}
        onValueChange={(value) => setValues((current) => ({ ...current, [key]: value }))}
      >
        <SelectTrigger>
          <SelectValue placeholder="Choose…" />
        </SelectTrigger>
        <SelectContent>
          {(settingsQuery.data?.[settingKey] ?? []).map((option: string) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
  const save = async () => {
    setSaving(true);
    const changes = { ...values, line_manager_staff_id: values["line_manager_staff_id"] || null };
    const { error } = await api.rpc("hr_update_employment", {
      p_staff_id: person.staff_id,
      p_changes: changes,
    });
    setSaving(false);
    if (error) {
      handleApiError(error);
      return;
    }
    toast.success("Employment details updated");
    onOpenChange(false);
    await onSaved();
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit employment</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Job title</Label>
            <Input
              value={values["job_title"] ?? ""}
              onChange={(event) =>
                setValues((current) => ({ ...current, job_title: event.target.value }))
              }
            />
          </div>
          {selectField("department", "Department", "hr.departments")}
          {selectField("grade", "Grade", "hr.grades")}
          {selectField("employment_status", "Employment status", "hr.employment_statuses")}
          {selectField("place_of_work", "Place of work", "hr.places_of_work")}
          <div className="space-y-1.5">
            <Label className="text-xs">Line manager</Label>
            <Select
              value={values["line_manager_staff_id"] ?? ""}
              onValueChange={(value) =>
                setValues((current) => ({ ...current, line_manager_staff_id: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="No manager" />
              </SelectTrigger>
              <SelectContent>
                {(directoryQuery.data ?? [])
                  .filter((item) => item.staff_id !== person.staff_id)
                  .map((item) => (
                    <SelectItem key={item.staff_id} value={item.staff_id}>
                      {item.full_name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          {(
            [
              ["start_date", "Start date"],
              ["probation_end_date", "Probation end"],
              ["leave_date", "Leave date"],
            ] as const
          ).map(([key, label]) => (
            <div key={key} className="space-y-1.5">
              <Label className="text-xs">{label}</Label>
              <Input
                type="date"
                value={values[key] ?? ""}
                onChange={(event) =>
                  setValues((current) => ({ ...current, [key]: event.target.value }))
                }
              />
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={saving} onClick={() => void save()}>
            Save employment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
