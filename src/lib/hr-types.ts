export type HrFormFieldType =
  "text" | "email" | "phone" | "date" | "select" | "boolean" | "textarea" | "file";

export interface HrFormField {
  key: string;
  label: string;
  type: HrFormFieldType;
  required?: boolean;
  options?: { value: string; label: string }[];
  help?: string;
}

export interface HrMyRequest {
  id: string;
  status: string;
  subject: string;
  document_title: string;
  document_key: string;
  document_version: number;
  kind: string;
  response_type: string;
  form_fields: HrFormField[] | null;
  body_snapshot: string;
  body_sha256: string;
  meeting_at: string | null;
  meeting_location: string | null;
  sent_at: string | null;
  due_at: string | null;
  viewed_at: string | null;
  responded_at: string | null;
  response: string | null;
  response_comment: string | null;
  sent_by_name: string | null;
  has_signed_file: boolean;
  is_esign: boolean;
  can_respond: boolean;
  is_legal_review_needed: boolean;
}

export interface HrMyDetails {
  staff_id: string;
  full_name: string;
  work_email: string;
  job_title: string | null;
  department: string | null;
  grade: string | null;
  employment_status: string | null;
  start_date: string | null;
  probation_end_date: string | null;
  leave_date: string | null;
  place_of_work: string | null;
  line_manager_name: string | null;
  annual_salary: number | null;
  salary_currency: string | null;
  contract_template: string | null;
  contract_end_date: string | null;
  notice_period: string | null;
  hours_per_week: number | null;
  personal_email: string | null;
  personal_phone: string | null;
  legal_name: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  region: string | null;
  postcode: string | null;
  country: string | null;
  gender: string | null;
  date_of_birth: string | null;
  ni_number: string | null;
  starter_statement: string | null;
  previous_pay: string | null;
  has_student_loan: boolean | null;
  student_loan_plan: string | null;
  student_loan_start: string | null;
  student_loan_end: string | null;
  has_postgraduate_loan: boolean | null;
  postgraduate_loan_start: string | null;
  postgraduate_loan_end: string | null;
  is_studies_finished_before_april: boolean | null;
  has_pension_elsewhere: boolean | null;
  visa_hours_cap: string | null;
  bank_sort_code: string | null;
  bank_account_number: string | null;
  next_of_kin_name: string | null;
  next_of_kin_relationship: string | null;
  next_of_kin_phone: string | null;
  next_of_kin_email: string | null;
  rtw_share_code: string | null;
  rtw_expiry: string | null;
  rtw_evidence_count: number | null;
  payroll_submitted_at: string | null;
  updated_at: string | null;
}

export interface HrSharedNote {
  id: string;
  note_type: string;
  body: string;
  shared_at: string | null;
  author_name: string | null;
}

export interface HrPolicy {
  id: string;
  document_key: string;
  version: number;
  title: string;
  category: string | null;
  summary: string | null;
  body: string;
  audience: string | null;
  effective_from: string | null;
  review_due: string | null;
  published_at: string | null;
  response_type: string;
  is_legal_review_needed: boolean;
}

export interface HrStaffDirectoryItem {
  staff_id: string;
  full_name: string;
  work_email: string;
  job_title: string | null;
  department: string | null;
  grade: string | null;
  employment_status: string | null;
  start_date: string | null;
  probation_end_date: string | null;
  leave_date: string | null;
  place_of_work: string | null;
  line_manager_staff_id: string | null;
  line_manager_name: string | null;
  can_sign_in: boolean;
}

export interface HrTeamMember extends HrStaffDirectoryItem {
  open_cases: number;
  open_requests: number;
  notes: number;
}

export interface HrPersonListItem extends HrStaffDirectoryItem {
  has_sign_in: boolean;
  is_hr_member: boolean;
  has_private_record: boolean;
  open_cases: number;
  open_requests: number;
}

export interface HrPersonPrivate {
  staff_id: string;
  full_name: string;
  annual_salary: number | null;
  salary_currency: string | null;
  annual_salary_gbp: number | null;
  contract_template: string | null;
  contract_end_date: string | null;
  notice_period: string | null;
  hours_per_week: number | null;
  personal_email: string | null;
  personal_phone: string | null;
  legal_name: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  region: string | null;
  postcode: string | null;
  country: string | null;
  gender: string | null;
  date_of_birth: string | null;
  ni_number: string | null;
  starter_statement: string | null;
  previous_pay: string | null;
  has_student_loan: boolean | null;
  student_loan_plan: string | null;
  student_loan_start: string | null;
  student_loan_end: string | null;
  has_postgraduate_loan: boolean | null;
  postgraduate_loan_start: string | null;
  postgraduate_loan_end: string | null;
  is_studies_finished_before_april: boolean | null;
  has_pension_elsewhere: boolean | null;
  visa_hours_cap: string | null;
  bank_sort_code: string | null;
  bank_account_number: string | null;
  next_of_kin_name: string | null;
  next_of_kin_relationship: string | null;
  next_of_kin_phone: string | null;
  next_of_kin_email: string | null;
  rtw_share_code: string | null;
  rtw_expiry: string | null;
  rtw_evidence_paths: string[] | null;
  payroll_submitted_at: string | null;
  retain_until: string | null;
  rtw_retain_until: string | null;
  payroll_retain_until: string | null;
  updated_at: string | null;
}

export interface HrCaseStep {
  key: string;
  label: string;
  kind: "meeting" | "document" | "task" | string;
  document_key?: string | null;
  done: boolean;
  done_at?: string | null;
  done_by?: string | null;
  request_id?: string | null;
}

export interface HrCase {
  id: string;
  staff_id: string;
  staff_name: string;
  case_type: string;
  title: string;
  status: string;
  owner_staff_id: string | null;
  owner_name: string | null;
  is_restricted: boolean;
  opened_at: string | null;
  closed_at: string | null;
  outcome: string | null;
  summary: string | null;
  steps: HrCaseStep[] | null;
  steps_done: number;
  steps_total: number;
  can_edit: boolean;
  retain_until: string | null;
  updated_at: string | null;
}

export interface HrCaseTypeOption {
  case_type: string;
  label: string;
  is_formal: boolean;
  manager_can_start: boolean;
  can_start: boolean;
  step_count: number;
}

export interface HrDocumentOption {
  document_id: string;
  document_key: string;
  version: number;
  title: string;
  kind: string;
  category: string | null;
  response_type: string;
  is_hr_approval_required: boolean;
  is_manager_sendable: boolean;
  extra_merge_fields: string[] | null;
  needs_meeting: boolean;
}

export interface HrRequest {
  id: string;
  staff_id: string;
  staff_name: string;
  document_id: string | null;
  document_key: string;
  document_title: string;
  document_version: number;
  kind: string;
  response_type: string;
  subject: string;
  status: string;
  case_id: string | null;
  case_title: string | null;
  case_step_key: string | null;
  sent_by: string | null;
  sent_by_name: string | null;
  sent_at: string | null;
  due_at: string | null;
  viewed_at: string | null;
  responded_at: string | null;
  response: string | null;
  meeting_at: string | null;
  meeting_location: string | null;
  delivery_channel: string | null;
  has_signed_file: boolean;
  is_esign: boolean;
  send_requested_at: string | null;
  send_attempts: number | null;
  last_send_error: string | null;
  send_failed_at: string | null;
  is_imported: boolean;
  reference_url: string | null;
  can_manage: boolean;
  created_at: string | null;
  updated_at: string | null;
}

export interface HrRequestDetail {
  id: string;
  staff_id: string;
  staff_name: string;
  document_title: string;
  document_version: number;
  response_type: string;
  form_fields: HrFormField[] | null;
  merge_data: Record<string, unknown> | null;
  subject: string;
  body_snapshot: string;
  body_sha256: string;
  status: string;
  response: string | null;
  response_comment: string | null;
  form_answers: Record<string, unknown> | null;
  evidence: Record<string, unknown> | null;
  sent_at: string | null;
  viewed_at: string | null;
  responded_at: string | null;
  due_at: string | null;
  esign_contract_id: string | null;
  has_signed_file: boolean;
  reference_url: string | null;
  legacy_ref: string | null;
}

export interface HrNote {
  id: string;
  staff_id: string;
  staff_name: string;
  author_staff_id: string;
  author_name: string;
  case_id: string | null;
  case_title: string | null;
  note_type: string;
  body: string;
  is_shared_with_employee: boolean;
  shared_at: string | null;
  can_edit: boolean;
  created_at: string | null;
  updated_at: string | null;
}

export interface HrDocument {
  id: string;
  document_key: string;
  version: number;
  title: string;
  kind: string;
  category: string | null;
  status: string;
  is_current: boolean;
  is_legal_review_needed: boolean;
  effective_from: string | null;
  review_due: string | null;
  summary: string | null;
  body: string;
  file_path: string | null;
  esign_template_id: string | null;
  response_type: string;
  form_fields: HrFormField[] | null;
  extra_merge_fields: string[] | null;
  is_hr_approval_required: boolean;
  is_manager_sendable: boolean;
  audience: string | null;
  is_all_staff_ack_required: boolean;
  published_at: string | null;
  published_by_name: string | null;
  updated_at: string | null;
}

export interface HrApproval {
  id: string;
  status: string;
  request_id: string;
  staff_id: string;
  staff_name: string;
  document_title: string;
  document_key: string;
  subject: string;
  body_snapshot: string;
  submitted_by: string;
  submitted_by_name: string;
  submitted_at: string | null;
  submit_note: string | null;
  decided_by: string | null;
  decided_by_name: string | null;
  decided_at: string | null;
  decision_comment: string | null;
  can_decide: boolean;
}

export interface HrPublicResponse {
  state: "ok" | "expired" | "used" | "cancelled" | "not_found" | string;
  first_name?: string;
  title?: string;
  body?: string;
  response_type?: string;
  form_fields?: HrFormField[] | null;
  due_at?: string | null;
  expires_at?: string | null;
  rtw_files?: unknown;
}

export type HrAnswers = Record<string, string | boolean>;
