import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, Upload } from "lucide-react";
import { toast } from "sonner";

import {
  HrContractPaySection,
  HrEmploymentSection,
  HrPersonalPayrollSection,
} from "@/components/hr/HrEmploymentSections";
import { HrError, HrLoading, HrSection } from "@/components/hr/HrShared";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { fileToBase64, invokeHrFunction, openHrFile, validateHrUpload } from "@/lib/hr";
import type { HrPersonPrivate, HrStaffDirectoryItem } from "@/lib/hr-types";
import { api, getErrorMessage } from "@/lib/supabase";

export function HrEmploymentPay({
  person,
  canEdit,
  onEmploymentSaved,
}: {
  person: HrStaffDirectoryItem;
  canEdit: boolean;
  onEmploymentSaved: () => Promise<void> | void;
}) {
  const { handleApiError } = useAuth();
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
  const settingsQuery = useQuery({
    queryKey: ["hr-employment-settings"],
    enabled: canEdit,
    queryFn: async () => {
      const { data, error } = await api
        .from("hr_settings")
        .select("key,value")
        .in("key", [
          "hr.departments",
          "hr.grades",
          "hr.employment_statuses",
          "hr.places_of_work",
          "hr.contract_templates",
        ]);
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
    enabled: canEdit,
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
  const record = query.data ?? null;
  const settings = settingsQuery.data ?? {};

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

  return (
    <div className="space-y-4">
      <HrEmploymentSection
        person={person}
        canEdit={canEdit}
        settings={settings}
        directory={directoryQuery.data ?? []}
        onSaved={onEmploymentSaved}
      />
      <HrContractPaySection
        staffId={person.staff_id}
        record={record}
        canEdit={canEdit}
        contractTemplates={settings["hr.contract_templates"] ?? []}
        onSaved={async () => {
          await query.refetch();
        }}
      />
      <HrPersonalPayrollSection
        staffId={person.staff_id}
        record={record}
        canEdit={canEdit}
        onSaved={async () => {
          await query.refetch();
        }}
      />
      <HrSection
        title="Passport & right-to-work evidence"
        description="PDF, JPEG or PNG, up to 10 MB."
        action={
          canEdit ? (
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
          ) : null
        }
      >
        {(record?.rtw_evidence_paths ?? []).length === 0 ? (
          <p className="px-4 py-5 text-xs text-muted-foreground">No evidence uploaded.</p>
        ) : (
          <ul className="divide-y divide-row-divider">
            {record?.rtw_evidence_paths?.map((path, index) => (
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
      </HrSection>
    </div>
  );
}
