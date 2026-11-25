export interface StaffProfile {
  id: string;
  full_name: string;
  work_email: string;
  is_active: boolean;
  roles: string[];
  permissions: string[];
}

export interface MyAccess {
  is_global_admin: boolean;
  companies_view: boolean;
  companies_edit: boolean;
  people_view: boolean;
  people_edit: boolean;
  deals_view: boolean;
  deals_edit: boolean;
  notes_view: boolean;
  notes_add: boolean;
  notes_change_any: boolean;
  tasks_sales_view: boolean;
  tasks_sales_edit: boolean;
  tasks_marketing_view: boolean;
  tasks_marketing_edit: boolean;
  blog_view: boolean;
  blog_edit: boolean;
  blog_approve: boolean;
  admin_view: boolean;
  admin_edit: boolean;
  can_hard_delete: boolean;
}

export interface ConnectionStatus {
  user_id: string;
  sign_in_email: string | null;
  last_sign_in_at: string | null;
  staff_id: string | null;
  full_name: string | null;
  work_email: string | null;
  is_active: boolean | null;
  roles: string[] | null;
  access: "ok" | "no_staff_record" | "inactive" | "no_roles" | string;
  access_message: string | null;
  mailbox_connected: boolean;
  mailbox_id: string | null;
  mailbox_email: string | null;
  mailbox_status: string | null;
  connected_at: string | null;
  disconnected_at: string | null;
  last_synced_at: string | null;
  can_send: boolean;
  setup_completed_at: string | null;
  show_first_run: boolean;
  history_status: "not_started" | "downloading" | "complete" | "failed" | string | null;
  history_messages: number | null;
  history_oldest_at: string | null;
  history_updated_at: string | null;
  history_error: string | null;
}

export interface StaffOption {
  id: string;
  full_name: string;
  work_email: string;
}

export interface CompanyListItem {
  id: string;
  name: string;
  segment: string | null;
  website: string | null;
  primary_domain: string | null;
  source: string | null;
  created_at: string;
  updated_at: string;
  owner_staff_id: string | null;
  owner_name: string | null;
  last_activity_at: string | null;
  linkedin_url: string | null;
  description: string | null;
  employee_count: number | null;
  employee_range: string | null;
}

export interface CompanyDetail {
  id: string;
  name: string;
  segment: string | null;
  website: string | null;
  primary_domain: string | null;
  linkedin_url: string | null;
  notes: string | null;
  source: string | null;
  owner_staff_id: string | null;
  owner_name: string | null;
  domains: string[] | null;
  last_activity_at: string | null;
  archived_at: string | null;
  archived_by: string | null;
  merged_into_id: string | null;
  merged_into_name: string | null;
  created_at: string;
  updated_at: string;
  description: string | null;
  employee_count: number | null;
  employee_range: string | null;
  created_by: string | null;
  updated_by: string | null;
}

export interface CompanyDomain {
  domain: string;
  root_domain: string | null;
  company_id: string;
  company_name: string | null;
  source: string | null;
  notes: string | null;
  created_at: string;
}

export interface CompanyPerson {
  company_id: string;
  role_id: string;
  person_id: string;
  full_name: string;
  title: string | null;
  started_on: string | null;
  ended_on: string | null;
  is_current: boolean;
  is_primary: boolean;
  primary_email: string | null;
  phone: string | null;
  linkedin_url: string | null;
}

export interface CompanyDeal {
  id: string;
  name: string;
  status: "in_progress" | "won" | "lost" | string;
  company_id: string | null;
  company_name: string | null;
  primary_person_id: string | null;
  primary_person_name: string | null;
  owner_staff_id: string | null;
  owner_name: string | null;
  value: number | null;
  currency: string | null;
  value_gbp: number | null;
  closed_at: string | null;
  last_activity_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CompanyActivity {
  company_id: string;
  kind: "email" | "meeting" | string;
  item_id: string;
  occurred_at: string;
  ends_at: string | null;
  title: string | null;
  snippet: string | null;
  direction: string | null;
  from_email: string | null;
  from_name: string | null;
  participant_address: string | null;
  participant_person_id: string | null;
  is_main_link: boolean | null;
  mailbox_email: string | null;
  thread_or_ical_id: string | null;
}

export interface PersonListItem {
  id: string;
  full_name: string;
  first_name: string | null;
  last_name: string | null;
  linkedin_url: string | null;
  primary_company_id: string | null;
  primary_company_name: string | null;
  primary_title: string | null;
  primary_email_id: string | null;
  primary_email: string | null;
  primary_email_status: string | null;
  phone: string | null;
  source: string | null;
  created_at: string;
  updated_at: string;
  last_activity_at: string | null;
}

export interface PersonEmail {
  id: string;
  person_id: string;
  email: string;
  email_domain: string | null;
  type: string | null;
  status: string | null;
  is_primary: boolean;
  verified_at: string | null;
  source: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmploymentRole {
  id: string;
  person_id: string;
  person_name: string | null;
  company_id: string | null;
  company_name: string | null;
  title: string | null;
  started_on: string | null;
  ended_on: string | null;
  is_current: boolean;
  is_primary: boolean;
  source: string | null;
  created_at: string;
  updated_at: string;
}

export interface PersonDeal {
  person_id: string;
  is_primary: boolean;
  deal_id: string;
  name: string;
  status: "in_progress" | "won" | "lost" | string;
  company_id: string | null;
  company_name: string | null;
  owner_staff_id: string | null;
  owner_name: string | null;
  value: number | null;
  currency: string | null;
  value_gbp: number | null;
  closed_at: string | null;
}

export interface PersonActivity {
  person_id: string;
  kind: "email" | "meeting" | string;
  item_id: string;
  occurred_at: string;
  ends_at: string | null;
  title: string | null;
  snippet: string | null;
  direction: string | null;
  from_email: string | null;
  from_name: string | null;
  person_address: string | null;
  is_main_link: boolean | null;
  mailbox_email: string | null;
  thread_or_ical_id: string | null;
}

export interface AiChatMessage {
  role: "user" | "assistant";
  text: string;
  created_at: string;
}

export interface AiRecordRef {
  type: string;
  id: string;
  name?: string;
  path: string;
}

export interface AiPendingChange {
  field: string;
  before: unknown;
  after: unknown;
}

export interface AiPendingAction {
  id: string;
  tool: string;
  title: string;
  record?: AiRecordRef | null;
  changes: AiPendingChange[];
  expires_at: string;
}

export interface AiLink {
  label: string;
  type: string;
  id: string;
  path: string;
}

export interface AiChatResponse {
  conversation_id: string | null;
  messages: AiChatMessage[];
  pending_actions: AiPendingAction[];
  links: AiLink[];
  status: string;
  error: string | null;
}

export interface AiConversationSummary {
  id: string;
  title: string | null;
  space: string | null;
  last_message_at: string | null;
  created_at: string;
}