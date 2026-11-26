import { useEffect, useState } from "react";
import { Eye, EyeOff, Loader2, Pencil } from "lucide-react";
import { toast } from "sonner";

import { HrDetail, HrSection } from "@/components/hr/HrShared";
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
import { useAuth } from "@/contexts/AuthContext";
import { formatDate, formatMoney } from "@/lib/format";
import { HR_CONTRACT_TEMPLATE_FALLBACK, maskSensitiveValue } from "@/lib/hr";
import type { HrPersonPrivate, HrStaffDirectoryItem } from "@/lib/hr-types";
import { api } from "@/lib/supabase";

const NONE = "__none__";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function SelectRow({
  label,
  value,
  options,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  placeholder: string;
  onChange: (value: string) => void;
}) {
  const merged =
    value && !options.some((item) => item.value === value)
      ? [{ value, label: value }, ...options]
      : options;
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Select value={value || NONE} onValueChange={(next) => onChange(next === NONE ? "" : next)}>
        <SelectTrigger>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>None</SelectItem>
          {merged.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function HrEmploymentSection({
  person,
  canEdit,
  settings,
  directory,
  onSaved,
}: {
  person: HrStaffDirectoryItem;
  canEdit: boolean;
  settings: Record<string, string[]>;
  directory: HrStaffDirectoryItem[];
  onSaved: () => Promise<void> | void;
}) {
  const { handleApiError } = useAuth();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});

  useEffect(() => {
    setEditing(false);
  }, [person.staff_id]);

  const startEdit = () => {
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
    setEditing(true);
  };

  const save = async () => {
    setSaving(true);
    const clean = (key: string) => (values[key] ?? "").trim() || null;
    const { error } = await api.rpc("hr_update_employment", {
      p_staff_id: person.staff_id,
      p_changes: {
        job_title: clean("job_title"),
        department: clean("department"),
        grade: clean("grade"),
        line_manager_staff_id: clean("line_manager_staff_id"),
        employment_status: clean("employment_status"),
        start_date: clean("start_date"),
        probation_end_date: clean("probation_end_date"),
        leave_date: clean("leave_date"),
        place_of_work: clean("place_of_work"),
      },
    });
    setSaving(false);
    if (error) {
      handleApiError(error);
      return;
    }
    toast.success("Employment updated");
    setEditing(false);
    await onSaved();
  };

  const listOptions = (key: string) =>
    (settings[key] ?? []).map((item) => ({ value: item, label: item }));
  const managerOptions = directory
    .filter((item) => item.staff_id !== person.staff_id)
    .map((item) => ({ value: item.staff_id, label: item.full_name }));

  return (
    <HrSection
      title="Employment"
      action={
        canEdit && !editing ? (
          <Button size="sm" variant="outline" onClick={startEdit}>
            <Pencil className="mr-1.5 h-3.5 w-3.5" />
            Edit
          </Button>
        ) : null
      }
    >
      {editing ? (
        <div className="space-y-4 p-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="emp-job-title" className="text-xs">Job title</Label>
              <Input
                id="emp-job-title"
                value={values["job_title"] ?? ""}
                onChange={(e) => setValues((c) => ({ ...c, job_title: e.target.value }))}
              />
            </div>
            <SelectRow
              label="Department"
              value={values["department"] ?? ""}
              options={listOptions("hr.departments")}
              placeholder="Choose department…"
              onChange={(v) => setValues((c) => ({ ...c, department: v }))}
            />
            <SelectRow
              label="Grade"
              value={values["grade"] ?? ""}
              options={listOptions("hr.grades")}
              placeholder="Choose grade…"
              onChange={(v) => setValues((c) => ({ ...c, grade: v }))}
            />
            <SelectRow
              label="Line manager"
              value={values["line_manager_staff_id"] ?? ""}
              options={managerOptions}
              placeholder="Choose manager…"
              onChange={(v) => setValues((c) => ({ ...c, line_manager_staff_id: v }))}
            />
            <SelectRow
              label="Employment status"
              value={values["employment_status"] ?? ""}
              options={listOptions("hr.employment_statuses")}
              placeholder="Choose status…"
              onChange={(v) => setValues((c) => ({ ...c, employment_status: v }))}
            />
            <SelectRow
              label="Place of work"
              value={values["place_of_work"] ?? ""}
              options={listOptions("hr.places_of_work")}
              placeholder="Choose place…"
              onChange={(v) => setValues((c) => ({ ...c, place_of_work: v }))}
            />
            {(
              [
                ["start_date", "Start date"],
                ["probation_end_date", "Probation end date"],
                ["leave_date", "Leave date"],
              ] as const
            ).map(([key, label]) => (
              <div key={key} className="space-y-1.5">
                <Label htmlFor={`emp-${key}`} className="text-xs">{label}</Label>
                <Input
                  id={`emp-${key}`}
                  type="date"
                  value={values[key] ?? ""}
                  onChange={(e) => setValues((c) => ({ ...c, [key]: e.target.value }))}
                />
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2 border-t border-border pt-3">
            <Button variant="outline" size="sm" disabled={saving} onClick={() => setEditing(false)}>
              Cancel
            </Button>
            <Button size="sm" disabled={saving} onClick={() => void save()}>
              {saving ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
              Save
            </Button>
          </div>
        </div>
      ) : (
        <dl className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
          <HrDetail label="Job title" value={person.job_title} />
          <HrDetail label="Department" value={person.department} />
          <HrDetail label="Grade" value={person.grade} />
          <HrDetail label="Line manager" value={person.line_manager_name} />
          <HrDetail label="Employment status" value={person.employment_status} />
          <HrDetail label="Place of work" value={person.place_of_work} />
          <HrDetail label="Start date" value={formatDate(person.start_date)} />
          <HrDetail label="Probation end date" value={formatDate(person.probation_end_date)} />
          <HrDetail label="Leave date" value={formatDate(person.leave_date)} />
        </dl>
      )}
    </HrSection>
  );
}

export function HrContractPaySection({
  staffId,
  record,
  canEdit,
  contractTemplates,
  onSaved,
}: {
  staffId: string;
  record: HrPersonPrivate | null;
  canEdit: boolean;
  contractTemplates: string[];
  onSaved: () => Promise<void> | void;
}) {
  const { handleApiError } = useAuth();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});

  useEffect(() => {
    setEditing(false);
  }, [staffId]);

  const templates =
    contractTemplates.length > 0 ? contractTemplates : [...HR_CONTRACT_TEMPLATE_FALLBACK];

  const startEdit = () => {
    setValues({
      contract_template: record?.contract_template ?? "",
      annual_salary: record?.annual_salary !== null && record?.annual_salary !== undefined ? String(record.annual_salary) : "",
      contract_end_date: record?.contract_end_date ?? "",
      notice_period: record?.notice_period ?? "",
      hours_per_week: record?.hours_per_week !== null && record?.hours_per_week !== undefined ? String(record.hours_per_week) : "",
    });
    setEditing(true);
  };

  const save = async () => {
    const rawSalary = (values["annual_salary"] ?? "").trim();
    const rawHours = (values["hours_per_week"] ?? "").trim();
    const salary = rawSalary === "" ? null : Number(rawSalary);
    const hours = rawHours === "" ? null : Number(rawHours);
    if (salary !== null && (!Number.isFinite(salary) || salary < 0)) {
      toast.error("Annual salary must be a valid non-negative number.");
      return;
    }
    if (hours !== null && (!Number.isFinite(hours) || hours < 0 || hours > 168)) {
      toast.error("Hours per week must be between 0 and 168.");
      return;
    }
    setSaving(true);
    const { error } = await api.rpc("hr_update_private", {
      p_staff_id: staffId,
      p_changes: {
        contract_template: (values["contract_template"] ?? "").trim() || null,
        annual_salary: salary,
        contract_end_date: (values["contract_end_date"] ?? "").trim() || null,
        notice_period: (values["notice_period"] ?? "").trim() || null,
        hours_per_week: hours,
      },
    });
    setSaving(false);
    if (error) {
      handleApiError(error);
      return;
    }
    toast.success("Contract & pay updated");
    setEditing(false);
    await onSaved();
  };

  return (
    <HrSection
      title="Contract & pay"
      action={
        canEdit && !editing ? (
          <Button size="sm" variant="outline" onClick={startEdit}>
            <Pencil className="mr-1.5 h-3.5 w-3.5" />
            Edit
          </Button>
        ) : null
      }
    >
      {editing ? (
        <div className="space-y-4 p-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <SelectRow
              label="Contract type"
              value={values["contract_template"] ?? ""}
              options={templates.map((item) => ({ value: item, label: item }))}
              placeholder="Choose contract type…"
              onChange={(v) => setValues((c) => ({ ...c, contract_template: v }))}
            />
            <div className="space-y-1.5">
              <Label htmlFor="pay-salary" className="text-xs">Annual salary (£)</Label>
              <Input
                id="pay-salary"
                type="number"
                min="0"
                step="any"
                value={values["annual_salary"] ?? ""}
                onChange={(e) => setValues((c) => ({ ...c, annual_salary: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pay-end-date" className="text-xs">Contract end date (optional)</Label>
              <Input
                id="pay-end-date"
                type="date"
                value={values["contract_end_date"] ?? ""}
                onChange={(e) => setValues((c) => ({ ...c, contract_end_date: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pay-notice" className="text-xs">Notice period</Label>
              <Input
                id="pay-notice"
                value={values["notice_period"] ?? ""}
                onChange={(e) => setValues((c) => ({ ...c, notice_period: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pay-hours" className="text-xs">Hours per week</Label>
              <Input
                id="pay-hours"
                type="number"
                min="0"
                max="168"
                step="0.25"
                value={values["hours_per_week"] ?? ""}
                onChange={(e) => setValues((c) => ({ ...c, hours_per_week: e.target.value }))}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 border-t border-border pt-3">
            <Button variant="outline" size="sm" disabled={saving} onClick={() => setEditing(false)}>
              Cancel
            </Button>
            <Button size="sm" disabled={saving} onClick={() => void save()}>
              {saving ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
              Save
            </Button>
          </div>
        </div>
      ) : (
        <dl className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
          <HrDetail label="Contract type" value={record?.contract_template} />
          <HrDetail
            label="Annual salary (£)"
            value={formatMoney(
              record?.annual_salary,
              record?.salary_currency ?? "GBP",
              record?.annual_salary_gbp,
            )}
          />
          <HrDetail label="Contract end date" value={formatDate(record?.contract_end_date)} />
          <HrDetail label="Notice period" value={record?.notice_period} />
          <HrDetail label="Hours per week" value={record?.hours_per_week} />
        </dl>
      )}
    </HrSection>
  );
}

const PERSONAL_FIELDS = [
  ["personal_email", "Personal email", "email"],
  ["personal_phone", "Phone", "tel"],
  ["date_of_birth", "Date of birth", "date"],
  ["address_line1", "Address line 1", "text"],
  ["address_line2", "Address line 2", "text"],
  ["city", "Town / city", "text"],
  ["region", "Region", "text"],
  ["postcode", "Postcode", "text"],
  ["country", "Country", "text"],
  ["ni_number", "NI number", "text"],
  ["bank_sort_code", "Bank sort code", "text"],
  ["bank_account_number", "Bank account number", "text"],
  ["next_of_kin_name", "Next of kin name", "text"],
  ["next_of_kin_relationship", "Next of kin relationship", "text"],
  ["next_of_kin_phone", "Next of kin phone", "tel"],
  ["next_of_kin_email", "Next of kin email", "email"],
  ["rtw_share_code", "Right-to-work share code", "text"],
  ["rtw_expiry", "Right-to-work expiry", "date"],
] as const;

export function HrPersonalPayrollSection({
  staffId,
  record,
  canEdit,
  onSaved,
}: {
  staffId: string;
  record: HrPersonPrivate | null;
  canEdit: boolean;
  onSaved: () => Promise<void> | void;
}) {
  const { handleApiError } = useAuth();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showNi, setShowNi] = useState(false);
  const [showBank, setShowBank] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});

  useEffect(() => {
    setEditing(false);
    setShowNi(false);
    setShowBank(false);
  }, [staffId]);

  const startEdit = () => {
    const source = (record ?? {}) as unknown as Record<string, unknown>;
    const next: Record<string, string> = {};
    for (const [key] of PERSONAL_FIELDS) next[key] = String(source[key] ?? "");
    setValues(next);
    setEditing(true);
  };

  const save = async () => {
    const email = (values["personal_email"] ?? "").trim();
    const nokEmail = (values["next_of_kin_email"] ?? "").trim();
    if (email && !EMAIL_RE.test(email)) {
      toast.error("Enter a valid personal email address.");
      return;
    }
    if (nokEmail && !EMAIL_RE.test(nokEmail)) {
      toast.error("Enter a valid next of kin email address.");
      return;
    }
    const sortCode = (values["bank_sort_code"] ?? "").replace(/[\s-]+/g, "");
    const accountNumber = (values["bank_account_number"] ?? "").replace(/[\s-]+/g, "");
    if (sortCode && !/^\d+$/.test(sortCode)) {
      toast.error("Bank sort code must contain digits only.");
      return;
    }
    if (accountNumber && !/^\d+$/.test(accountNumber)) {
      toast.error("Bank account number must contain digits only.");
      return;
    }
    const changes: Record<string, string | null> = {};
    for (const [key] of PERSONAL_FIELDS) changes[key] = (values[key] ?? "").trim() || null;
    changes["bank_sort_code"] = sortCode || null;
    changes["bank_account_number"] = accountNumber || null;

    setSaving(true);
    const { error } = await api.rpc("hr_update_private", {
      p_staff_id: staffId,
      p_changes: changes,
    });
    setSaving(false);
    if (error) {
      handleApiError(error);
      return;
    }
    toast.success("Personal & payroll details updated");
    setEditing(false);
    setShowNi(false);
    setShowBank(false);
    await onSaved();
  };

  const address = [
    record?.address_line1,
    record?.address_line2,
    record?.city,
    record?.region,
    record?.postcode,
    record?.country,
  ]
    .filter((part): part is string => Boolean(part?.trim()))
    .join(", ");

  const hasBank = Boolean(record?.bank_sort_code?.trim() || record?.bank_account_number?.trim());
  const nextOfKinSummary = [
    record?.next_of_kin_name,
    record?.next_of_kin_relationship ? `(${record.next_of_kin_relationship})` : null,
    record?.next_of_kin_phone,
    record?.next_of_kin_email,
  ]
    .filter((part): part is string => Boolean(part?.trim()))
    .join(" · ");

  return (
    <HrSection
      title="Personal & payroll"
      action={
        canEdit && !editing ? (
          <Button size="sm" variant="outline" onClick={startEdit}>
            <Pencil className="mr-1.5 h-3.5 w-3.5" />
            Edit
          </Button>
        ) : null
      }
    >
      {editing ? (
        <div className="space-y-4 p-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {PERSONAL_FIELDS.map(([key, label, type]) => (
              <div key={key} className="space-y-1.5">
                <Label htmlFor={`personal-${key}`} className="text-xs">{label}</Label>
                <Input
                  id={`personal-${key}`}
                  type={type}
                  value={values[key] ?? ""}
                  onChange={(e) => setValues((c) => ({ ...c, [key]: e.target.value }))}
                />
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2 border-t border-border pt-3">
            <Button
              variant="outline"
              size="sm"
              disabled={saving}
              onClick={() => {
                setEditing(false);
                setShowNi(false);
                setShowBank(false);
              }}
            >
              Cancel
            </Button>
            <Button size="sm" disabled={saving} onClick={() => void save()}>
              {saving ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
              Save
            </Button>
          </div>
        </div>
      ) : (
        <dl className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
          <HrDetail label="Personal email" value={record?.personal_email} />
          <HrDetail label="Phone" value={record?.personal_phone} />
          <HrDetail label="Date of birth" value={formatDate(record?.date_of_birth)} />
          <HrDetail label="Address" value={address || null} />
          <HrDetail
            label="NI number"
            value={
              record?.ni_number ? (
                <span className="inline-flex items-center gap-2">
                  <span className="font-mono text-xs">
                    {showNi ? record.ni_number : maskSensitiveValue(record.ni_number, 2)}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={() => setShowNi((current) => !current)}
                  >
                    {showNi ? <EyeOff className="mr-1 h-3 w-3" /> : <Eye className="mr-1 h-3 w-3" />}
                    {showNi ? "Hide" : "Show"}
                  </Button>
                </span>
              ) : null
            }
          />
          <HrDetail
            label="Bank details"
            value={
              hasBank ? (
                <span className="inline-flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs">
                    {showBank
                      ? [record?.bank_sort_code, record?.bank_account_number]
                          .filter(Boolean)
                          .join(" / ")
                      : [
                          record?.bank_sort_code
                            ? maskSensitiveValue(record.bank_sort_code, 2)
                            : null,
                          record?.bank_account_number
                            ? maskSensitiveValue(record.bank_account_number, 4)
                            : null,
                        ]
                          .filter(Boolean)
                          .join(" / ")}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={() => setShowBank((current) => !current)}
                  >
                    {showBank ? <EyeOff className="mr-1 h-3 w-3" /> : <Eye className="mr-1 h-3 w-3" />}
                    {showBank ? "Hide" : "Show"}
                  </Button>
                </span>
              ) : null
            }
          />
          <HrDetail label="Next of kin" value={nextOfKinSummary || null} />
          <HrDetail label="Right-to-work share code" value={record?.rtw_share_code} />
          <HrDetail label="Right-to-work expiry" value={formatDate(record?.rtw_expiry)} />
        </dl>
      )}
    </HrSection>
  );
}