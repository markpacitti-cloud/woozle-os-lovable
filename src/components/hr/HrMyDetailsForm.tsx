import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { HrDetail, HrSection } from "@/components/hr/HrShared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { formatDate, formatDateTime, formatMoney } from "@/lib/format";
import type { HrMyDetails } from "@/lib/hr-types";
import { api } from "@/lib/supabase";

interface FieldConfig {
  key: string;
  label: string;
  type?: "text" | "email" | "tel" | "date" | "boolean";
}

const CONTACT_FIELDS: FieldConfig[] = [
  { key: "legal_name", label: "Legal name" },
  { key: "personal_email", label: "Personal email", type: "email" },
  { key: "personal_phone", label: "Personal phone", type: "tel" },
  { key: "gender", label: "Gender" },
  { key: "date_of_birth", label: "Date of birth", type: "date" },
  { key: "address_line1", label: "Address line 1" },
  { key: "address_line2", label: "Address line 2" },
  { key: "city", label: "Town / city" },
  { key: "region", label: "Region" },
  { key: "postcode", label: "Postcode" },
  { key: "country", label: "Country" },
];

const PAYROLL_FIELDS: FieldConfig[] = [
  { key: "ni_number", label: "National Insurance number" },
  { key: "starter_statement", label: "Starter statement" },
  { key: "previous_pay", label: "Previous pay" },
  { key: "has_student_loan", label: "I have a student loan", type: "boolean" },
  { key: "student_loan_plan", label: "Student loan plan" },
  { key: "student_loan_start", label: "Student loan start", type: "date" },
  { key: "student_loan_end", label: "Student loan end", type: "date" },
  { key: "has_postgraduate_loan", label: "I have a postgraduate loan", type: "boolean" },
  { key: "postgraduate_loan_start", label: "Postgraduate loan start", type: "date" },
  { key: "postgraduate_loan_end", label: "Postgraduate loan end", type: "date" },
  {
    key: "is_studies_finished_before_april",
    label: "Studies finished before April",
    type: "boolean",
  },
  { key: "has_pension_elsewhere", label: "I have a pension elsewhere", type: "boolean" },
  { key: "visa_hours_cap", label: "Visa hours cap" },
  { key: "bank_sort_code", label: "Bank sort code" },
  { key: "bank_account_number", label: "Bank account number" },
];

const KIN_FIELDS: FieldConfig[] = [
  { key: "next_of_kin_name", label: "Next of kin" },
  { key: "next_of_kin_relationship", label: "Relationship" },
  { key: "next_of_kin_phone", label: "Next of kin phone", type: "tel" },
  { key: "next_of_kin_email", label: "Next of kin email", type: "email" },
  { key: "rtw_share_code", label: "Right-to-work share code" },
  { key: "rtw_expiry", label: "Right-to-work expiry", type: "date" },
];

const ALL_FIELDS = [...CONTACT_FIELDS, ...PAYROLL_FIELDS, ...KIN_FIELDS];

type FormValues = Record<string, string | boolean>;

function initialValues(details: HrMyDetails): FormValues {
  const source = details as unknown as Record<string, unknown>;
  return Object.fromEntries(
    ALL_FIELDS.map((field) => [
      field.key,
      field.type === "boolean" ? source[field.key] === true : String(source[field.key] ?? ""),
    ]),
  );
}

export function HrMyDetailsForm({
  details,
  onSaved,
}: {
  details: HrMyDetails;
  onSaved: () => Promise<void> | void;
}) {
  const { handleApiError } = useAuth();
  const [values, setValues] = useState<FormValues>(() => initialValues(details));
  const [saving, setSaving] = useState(false);

  useEffect(() => setValues(initialValues(details)), [details]);

  const save = async () => {
    setSaving(true);
    const changes = Object.fromEntries(
      ALL_FIELDS.map((field) => [field.key, values[field.key] ?? ""]),
    );
    const { error } = await api.rpc("hr_update_my_details", { p_changes: changes });
    setSaving(false);
    if (error) {
      handleApiError(error);
      return;
    }
    toast.success("Your details were updated");
    await onSaved();
  };

  const renderFields = (fields: FieldConfig[]) => (
    <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
      {fields.map((field) => (
        <div key={field.key} className="space-y-1.5">
          <Label htmlFor={`my-${field.key}`} className="text-xs">
            {field.label}
          </Label>
          {field.type === "boolean" ? (
            <label className="flex h-9 items-center gap-2 text-sm">
              <input
                id={`my-${field.key}`}
                type="checkbox"
                checked={values[field.key] === true}
                onChange={(event) =>
                  setValues((current) => ({ ...current, [field.key]: event.target.checked }))
                }
                className="h-4 w-4 accent-current"
              />
              Yes
            </label>
          ) : (
            <Input
              id={`my-${field.key}`}
              type={field.type ?? "text"}
              value={typeof values[field.key] === "string" ? (values[field.key] as string) : ""}
              onChange={(event) =>
                setValues((current) => ({ ...current, [field.key]: event.target.value }))
              }
            />
          )}
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-4">
      <HrSection
        title="Employment & pay"
        description="Salary and contract terms can only be changed by HR."
      >
        <dl className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <HrDetail label="Job title" value={details.job_title} />
          <HrDetail label="Department" value={details.department} />
          <HrDetail label="Line manager" value={details.line_manager_name} />
          <HrDetail
            label="Annual salary"
            value={formatMoney(details.annual_salary, details.salary_currency)}
          />
          <HrDetail label="Start date" value={formatDate(details.start_date)} />
          <HrDetail label="Probation end" value={formatDate(details.probation_end_date)} />
          <HrDetail label="Hours per week" value={details.hours_per_week} />
          <HrDetail label="Notice period" value={details.notice_period} />
        </dl>
      </HrSection>
      <HrSection title="Contact & address">{renderFields(CONTACT_FIELDS)}</HrSection>
      <HrSection title="Payroll, loans & bank">{renderFields(PAYROLL_FIELDS)}</HrSection>
      <HrSection title="Next of kin & right to work">{renderFields(KIN_FIELDS)}</HrSection>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          Payroll last submitted {formatDateTime(details.payroll_submitted_at)}
        </p>
        <Button disabled={saving} onClick={() => void save()}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Save my details
        </Button>
      </div>
    </div>
  );
}
