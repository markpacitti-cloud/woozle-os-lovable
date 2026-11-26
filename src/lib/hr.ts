import { extractEdgeFunctionError, supabase } from "@/lib/supabase";
import type { HrCaseStep, HrFormField, HrMyRequest } from "@/lib/hr-types";

export const HR_PUBLIC_RESPOND_URL =
  "https://cwbtercykiisngbecime.supabase.co/functions/v1/hr-public-respond";

export const HR_MERGE_FIELDS = [
  "employee_full_name",
  "employee_first_name",
  "employee_legal_name",
  "job_title",
  "department",
  "grade",
  "start_date",
  "probation_end_date",
  "leave_date",
  "end_date",
  "place_of_work",
  "annual_salary",
  "notice_period",
  "line_manager_name",
  "sender_name",
  "sender_job_title",
  "today",
  "contract_send_date",
  "meeting_date",
  "meeting_time",
  "meeting_location",
  "due_date",
  "company_name",
] as const;

export type HrResponseKind = "acknowledge_and_sign" | "accept_decline" | "form" | "sign" | "none";

export const HR_CONTRACT_TEMPLATE_FALLBACK = [
  "Graduate",
  "Analyst",
  "Associate",
  "Associate-Director",
  "Director",
] as const;

export function formatHrStatus(status: string): string {
  if (status.trim().toLowerCase() === "waiting_for_esign") return "Awaiting signature";
  return status.replaceAll("_", " ");
}

export function maskSensitiveValue(value: string | null | undefined, visibleTrailing = 2): string {
  if (!value) return "—";
  const clean = value.trim();
  if (!clean) return "—";
  if (clean.length <= visibleTrailing) return "••••";
  const hiddenCount = Math.max(4, clean.length - visibleTrailing);
  return `${"•".repeat(hiddenCount)}${clean.slice(-visibleTrailing)}`;
}

export function getHrResponseKind(
  responseType: string | null | undefined,
  isEsign = false,
): HrResponseKind {
  if (isEsign) return "sign";
  const value = (responseType ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  if (["acknowledge_and_sign", "acknowledge", "acknowledgement"].includes(value)) return "acknowledge_and_sign";
  if (["accept_decline", "accept/decline", "accept", "decline", "acceptance"].includes(value)) {
    return "accept_decline";
  }
  if (value === "form" || value === "payroll" || value === "payroll_form") return "form";
  return "none";
}

export function getNextDocumentStep(steps: HrCaseStep[] | null | undefined): HrCaseStep | null {
  return (
    steps?.find(
      (step) =>
        !step.done && !step.request_id && step.kind === "document" && Boolean(step.document_key),
    ) ?? null
  );
}

export function isCompletedRequest(request: Pick<HrMyRequest, "can_respond" | "status">): boolean {
  return !request.can_respond && ["completed", "declined"].includes(request.status);
}

export function isPublicHrResponsePath(pathname: string): boolean {
  return pathname === "/hr/respond" || pathname === "/hr/respond/";
}

export function validateHrUpload(file: File): string | null {
  if (!["application/pdf", "image/jpeg", "image/png"].includes(file.type)) {
    return "Choose a PDF, JPEG or PNG file.";
  }
  if (file.size > 10 * 1024 * 1024) return "Files must be 10 MB or smaller.";
  return null;
}

export async function fileToBase64(file: File): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = "";
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return window.btoa(binary);
}

export async function invokeHrFunction<T>(
  name: "hr-send" | "hr-respond" | "hr-files",
  body: object,
) {
  const { data, error } = await supabase.functions.invoke<T>(name, { body });
  if (error) throw new Error(await extractEdgeFunctionError(error));
  return data as T;
}

export async function openHrFile(kind: "signed" | "rtw" | "document", id: string, index?: number) {
  const body: { action: "download_url"; kind: typeof kind; id: string; index?: number } = {
    action: "download_url",
    kind,
    id,
  };
  if (index !== undefined) body.index = index;
  const data = await invokeHrFunction<{ url: string; file_name: string; expires_in: number }>(
    "hr-files",
    body,
  );
  window.open(data.url, "_blank", "noopener,noreferrer");
}

export function normaliseFormFields(fields: HrFormField[] | null | undefined): HrFormField[] {
  return Array.isArray(fields) ? fields : [];
}

export function getPublicStateMessage(state: string): string {
  switch (state) {
    case "expired":
      return "This link has expired. Please reply to the email and we'll send a new one.";
    case "used":
      return "This link has already been used. Your response has already been recorded.";
    case "cancelled":
      return "This request has been cancelled. Please reply to the email if you need help.";
    case "not_found":
      return "This link could not be found. Please check the link in your email.";
    default:
      return "This document is not available. Please reply to the email for help.";
  }
}
