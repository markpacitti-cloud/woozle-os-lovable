# Woozle OS API contract for Lovable — HR space

The HR space: every view, action and edge function it uses, and who may do what. Setup, sign-in, errors,
design and the general rules are in part 1 (`lovable-api-contract-1.md`); they all apply here. Staging only.

## 1. Rules for the HR space

1. **The database enforces every rule below.** A view simply returns no rows (or fewer columns) when
   the person may not see something; an action answers `42501` with a message. Show it as it is.
2. HR data is private. Never cache it in local storage, never log it, never send it to analytics or
   to the assistant panel. The assistant (`ai-chat`) has no HR tools by design.
3. Files (signed contracts, passports, attached documents) are only reachable through `hr-files`
   short-lived links (5 minutes). Open them in a new tab; never store the link.
4. Responses (Acknowledge / Accept / Decline / form) go through the edge function `hr-respond`, never an
   `rpc`: the server records the evidence (sign-in, IP, browser, document hash, time).
. **Unreviewed drafts (staging testing only).** While `hr.email_redirect_to` is set (staging), HR can publish and send a
   version still marked "needs legal review". Its text then starts with the line `> **DRAFT – NOT LEGALLY REVIEWED**`
   (`hr_my_requests.body_snapshot`, `hr_policies.body`, the public response page) and its email shows the same banner.
   Render that line as a red warning banner. `is_legal_review_needed` is true on such rows. When the redirect is empty
   (prod) publishing or sending an unreviewed version is refused (`22023`).

## 2. Who can do what (plain English)

- **Everyone** (any signed-in staff member): their own details (`hr_my_details`, including pay and bank
  details, which they can update except salary and contract terms), the documents sent to them
  (`hr_my_requests`), notes shared with them, current internal and public policies, and the staff directory.
- **Line managers** (anyone with direct reports, `my_access.hr_team`): for their **direct reports only**:
  directory details, non-restricted cases, all non-restricted notes (earlier managers' too), and requests on
  those cases or sent by the manager. **Never** pay, bank, address or other private details. They can add
  notes, start a **probation review** or **informal performance review**, and send documents marked
  manager-sendable (`hr_document_options`). Letters that need HR approval wait in HR's Approvals list.
- **HR** (`hr_admin_view` / `hr_admin_edit`): everything about everyone **except other members of the HR
  role (and themselves as HR)** and restricted cases. Only HR or global admin start formal cases
  (performance improvement plan, formal performance review, disciplinary, grievance). HR approves letters
  sent by others; nobody (except global admin) approves their own.
- **Global admin**: everything, including HR members and restricted cases. Only global admin changes the
  app address, the email redirect and the purge setting (`hr_settings_admin`).
- **Restricted cases** are visible only to global admin and the case owner.

## 3. Navigation (the HR space)

Space colour `#0F766E`. Show the HR space to everyone (`my_access.hr_my`); hide the groups the person
cannot use:

| Group / page | Path | Show when | Data |
|---|---|---|---|
| My HR: to-do, my documents, my details | `/hr/my` (`?request=<id>` opens one) | always | `hr_my_requests`, `hr_my_details`, `hr_my_shared_notes` |
| Policies (searchable library) | `/hr/policies` | always | `hr_policies` |
| My team (+ person page) | `/hr/team`, `/hr/team/:staffId` | `hr_team` | `hr_my_team`, `hr_cases_list`, `hr_notes_list`, `hr_requests_list`, `hr_case_type_options`, `hr_document_options` |
| People (+ record with tabs Overview, Employment & pay, Documents, Notes, Cases) | `/hr/people`, `/hr/people/:staffId` | `hr_admin_view` | `hr_people_list`, `hr_person_private`, `hr_requests_list`, `hr_notes_list`, `hr_cases_list` |
| Cases (board by status) and case page | `/hr/cases`, `/hr/cases/:id` | `hr_admin_view` or `hr_team` | `hr_cases_list` |
| Sent (all requests, resend / cancel) | `/hr/sent` | `hr_admin_view` | `hr_requests_list`, `hr_request_detail` |
| Templates & Policies (edit, version, publish) | `/hr/templates` | `hr_admin_edit` | `hr_documents_list` |
| Approvals | `/hr/approvals` | `hr_approve` | `hr_approvals_list` |
| Settings (lists, playbooks; admin: app address, redirect) | `/hr/settings` | `hr_admin_edit` | `hr_settings` |
| Public response page (no sign-in) | `/hr/respond?token=…` | public | `hr-public-respond` only |

Email buttons link to `/hr/my?request=<id>`, `/hr/team`, `/hr/cases/:id` and `/hr/people/:staffId` on the
app address in settings (`hr.app_base_url`).

## 4. Views (`api.from(view).select(...)`)

### Me
- **`hr_my_details`**: one row, the signed-in person (directory + private details). Edit with `hr_update_my_details`.
  `staff_id uuid, full_name text, work_email text, job_title text, department text, grade text, employment_status text, start_date date, probation_end_date date, leave_date date, place_of_work text, line_manager_name text, annual_salary num, salary_currency char(3), contract_template text, contract_end_date date, notice_period text, hours_per_week numeric(5,2), personal_email text, personal_phone text, legal_name text, address_line1 text, address_line2 text, city text, region text, postcode text, country text, gender text, date_of_birth date, ni_number text, starter_statement text, previous_pay text, has_student_loan bool, student_loan_plan text, student_loan_start date, student_loan_end date, has_postgraduate_loan bool, postgraduate_loan_start date, postgraduate_loan_end date, is_studies_finished_before_april bool, has_pension_elsewhere bool, visa_hours_cap text, bank_sort_code text, bank_account_number text, next_of_kin_name text, next_of_kin_relationship text, next_of_kin_phone text, next_of_kin_email text, rtw_share_code text, rtw_expiry date, rtw_evidence_count int, payroll_submitted_at ts, updated_at ts`
- **`hr_my_requests`**: documents sent to me, newest first (`.order('sent_at', { ascending: false })`). To-do =
  `can_respond`. Render `body_snapshot` as Markdown. Opening one: call `hr_mark_viewed`. Contracts (`is_esign`)
  are signed in the eSignatures email; show "Check your email to sign".
  `id uuid, status text, subject text, document_title text, document_key text, document_version int, kind text, response_type text, form_fields jsonb, body_snapshot text, body_sha256 text, meeting_at ts, meeting_location text, sent_at ts, due_at ts, viewed_at ts, responded_at ts, response text, response_comment text, sent_by_name text, has_signed_file bool, is_esign bool, can_respond bool, is_legal_review_needed bool`
- **`hr_my_shared_notes`**: notes my manager or HR shared with me.
  `id uuid, note_type text, body text, shared_at ts, author_name text`

### Everyone
- **`hr_staff_directory`**: all staff (directory columns only).
  `staff_id uuid, full_name text, work_email text, job_title text, department text, grade text, employment_status text, start_date date, probation_end_date date, leave_date date, place_of_work text, line_manager_staff_id uuid, line_manager_name text, can_sign_in bool`
- **`hr_policies`**: current internal and public policies. Search: `.textSearch('search', q, { type: 'websearch', config: 'english' })`; never select `search` itself.
  `id uuid, document_key text, version int, title text, category text, summary text, body text, audience text, effective_from date, review_due date, published_at ts, response_type text, search tsvector, is_legal_review_needed bool`
- **`hr_settings`**: HR settings (`key`, JSON `value`): the dropdown lists `hr.departments`, `hr.grades`,
  `hr.employment_statuses`, `hr.places_of_work`, `hr.note_types`; `hr.playbooks`; timings; `hr.app_base_url`;
  `hr.email_redirect_to` (staging test address; show a banner "Staging: all HR email goes to …" when set).
  `key text, value jsonb, description text, updated_at ts`

### Managers and HR
- **`hr_my_team`**: my direct reports with counts.
  `staff_id uuid, full_name text, work_email text, job_title text, department text, grade text, employment_status text, start_date date, probation_end_date date, place_of_work text, open_cases bigint, open_requests bigint, notes bigint`
- **`hr_case_type_options`**: the playbooks; show "Start case" choices where `can_start`.
  `case_type text, label text, is_formal bool, manager_can_start bool, can_start bool, step_count int`
- **`hr_document_options`**: current documents I may send. `extra_merge_fields` are the inputs to ask for;
  `needs_meeting` means ask for date, time and place.
  `document_id uuid, document_key text, version int, title text, kind text, category text, response_type text, is_hr_approval_required bool, is_manager_sendable bool, extra_merge_fields text[], needs_meeting bool`
- **`hr_people_list`**: people I cover as HR (global admin: everyone).
  `staff_id uuid, full_name text, work_email text, job_title text, department text, grade text, employment_status text, start_date date, probation_end_date date, leave_date date, place_of_work text, line_manager_staff_id uuid, line_manager_name text, can_sign_in bool, has_sign_in bool, is_hr_member bool, has_private_record bool, open_cases bigint, open_requests bigint`
- **`hr_person_private`**: the Employment & pay tab (HR / global admin; a person sees only their own).
  `staff_id uuid, full_name text, annual_salary num, salary_currency char(3), annual_salary_gbp num, contract_template text, contract_end_date date, notice_period text, hours_per_week numeric(5,2), personal_email text, personal_phone text, legal_name text, address_line1 text, address_line2 text, city text, region text, postcode text, country text, gender text, date_of_birth date, ni_number text, starter_statement text, previous_pay text, has_student_loan bool, student_loan_plan text, student_loan_start date, student_loan_end date, has_postgraduate_loan bool, postgraduate_loan_start date, postgraduate_loan_end date, is_studies_finished_before_april bool, has_pension_elsewhere bool, visa_hours_cap text, bank_sort_code text, bank_account_number text, next_of_kin_name text, next_of_kin_relationship text, next_of_kin_phone text, next_of_kin_email text, rtw_share_code text, rtw_expiry date, rtw_evidence_paths text[], payroll_submitted_at ts, retain_until date, rtw_retain_until date, payroll_retain_until date, updated_at ts`
- **`hr_cases_list`**: cases I may see. Board columns = `status` (open, on_hold, closed). `steps` is the
  checklist: `[{ key, label, kind: meeting|document|task, document_key, done, done_at, done_by, request_id }]`.
  `id uuid, staff_id uuid, staff_name text, case_type text, title text, status text, owner_staff_id uuid, owner_name text, is_restricted bool, opened_at ts, closed_at ts, outcome text, summary text, steps jsonb, steps_done bigint, steps_total int, can_edit bool, retain_until date, updated_at ts`
- **`hr_requests_list`**: requests I may see (Sent page, person Documents tab, case page). Filter
  `.eq('staff_id', id)` or `.eq('case_id', id)`. Show Resend / Cancel when `can_manage`.
  Status values: draft, awaiting_approval, sent, viewed, completed, declined, overdue, cancelled, waiting_for_esign.
  `id uuid, staff_id uuid, staff_name text, document_id uuid, document_key text, document_title text, document_version int, kind text, response_type text, subject text, status text, case_id uuid, case_title text, case_step_key text, sent_by uuid, sent_by_name text, sent_at ts, due_at ts, viewed_at ts, responded_at ts, response text, meeting_at ts, meeting_location text, delivery_channel text, has_signed_file bool, is_esign bool, send_requested_at ts, send_attempts int, last_send_error text, send_failed_at ts, is_imported bool, reference_url text, can_manage bool, created_at ts, updated_at ts`
- **`hr_request_detail`**: one request with its text, hash, answers and evidence (answers / evidence only for
  HR, global admin and the person). `.eq('id', id).single()`.
  `id uuid, staff_id uuid, staff_name text, document_title text, document_version int, response_type text, form_fields jsonb, merge_data jsonb, subject text, body_snapshot text, body_sha256 text, status text, response text, response_comment text, form_answers jsonb, evidence jsonb, sent_at ts, viewed_at ts, responded_at ts, due_at ts, esign_contract_id text, has_signed_file bool, reference_url text, legacy_ref text`
- **`hr_notes_list`** / **`hr_notes_archived_list`**: notes I may see / my archived notes. Edit buttons when `can_edit`.
  `id uuid, staff_id uuid, staff_name text, author_staff_id uuid, author_name text, case_id uuid, case_title text, note_type text, body text, is_shared_with_employee bool, shared_at ts, can_edit bool, created_at ts, updated_at ts`
  `id uuid, staff_id uuid, staff_name text, author_staff_id uuid, author_name text, note_type text, body text, archived_at ts`
- **`hr_documents_list`**: every version (HR). One current version per `document_key` (`is_current`).
  `is_legal_review_needed` blocks publishing on prod; on staging (redirect set) it is allowed for testing and adds the draft banner (rule 6). Show a "Needs legal review" badge. `form_fields`: `[{ key, label, type: text|email|phone|date|select|boolean|textarea|file, required, options?: [{ value, label }], help? }]`.
  Merge fields in `body` / `title`: `{{ field_name }}` (see §6).
  `id uuid, document_key text, version int, title text, kind text, category text, status text, is_current bool, is_legal_review_needed bool, effective_from date, review_due date, summary text, body text, file_path text, esign_template_id text, response_type text, form_fields jsonb, extra_merge_fields text[], is_hr_approval_required bool, is_manager_sendable bool, audience text, is_all_staff_ack_required bool, published_at ts, published_by_name text, search tsvector, updated_at ts`
- **`hr_approvals_list`**: HR approvals (letters waiting to be sent). Approve / Send back where `can_decide`.
  `id uuid, status text, request_id uuid, staff_id uuid, staff_name text, document_title text, document_key text, subject text, body_snapshot text, submitted_by uuid, submitted_by_name text, submitted_at ts, submit_note text, decided_by uuid, decided_by_name text, decided_at ts, decision_comment text, can_decide bool`

## 5. Actions (`api.rpc(name, { p_…: value })`)

Errors: `42501` not allowed, `P0002` not found, `22023` bad input or not allowed now (message says why),
`23505` duplicate.

### People and details
| Action | Arguments | Returns | Notes |
|---|---|---|---|
| `hr_update_my_details` | `p_changes jsonb` | void | Own contact, address, payroll, loans, bank, next of kin, share code. Salary / terms are refused. Sort code and account digits only (dashes are removed). |
| `hr_update_private` | `p_staff_id uuid, p_changes jsonb` | void | HR: any private field incl. `annual_salary`, `contract_template`, `contract_end_date`, `notice_period`, `hours_per_week`. |
| `hr_update_employment` | `p_staff_id uuid, p_changes jsonb` | void | HR: `job_title, department, grade, line_manager_staff_id, employment_status, start_date, probation_end_date, leave_date, place_of_work` (lists from `hr_settings`). Setting `leave_date` sets the retention dates. |
| `hr_create_joiner` | `p_full_name text, p_work_email text, p_personal_email text, p_start_date date, p_job_title? text, p_department? text, p_line_manager_staff_id? uuid, p_place_of_work? text, p_probation_end_date? date` | uuid | HR: a pre-joiner (planned work email, personal email). They get secure links until they can sign in. |

### Documents (HR)
| Action | Arguments | Returns | Notes |
|---|---|---|---|
| `hr_save_document_draft` | `p_document_key text, p_fields jsonb` | uuid | Creates or updates the draft version of a key (copied from the current version). Fields as in `hr_documents_list`. |
| `hr_publish_document` | `p_document_id uuid` | jsonb | Prefer the edge function `hr-send` action `publish` (sends all-staff acknowledgements at once). |
| `hr_archive_document` / `hr_restore_document` | `p_document_id uuid` | void | |

### Requests
| Action | Arguments | Returns | Notes |
|---|---|---|---|
| `hr_prepare_request` | `p_staff_id uuid, p_document_key text, p_case_id? uuid, p_step_key? text, p_merge_data? jsonb='{}', p_meeting_at? ts, p_meeting_location? text, p_due_at? ts` | uuid | Draft with the rendered text and hash. Then send with `hr-send` (`send`). `p_merge_data` holds the document's `extra_merge_fields`. `22023` names any field without a value. |
| `hr_mark_viewed` | `p_request_id uuid` | void | The person opened their request. |
| `hr_submit_request` / `hr_resend_request` / `hr_cancel_request` / `hr_decide_approval` | — | — | Use the edge function `hr-send` instead (it also emails / signs). |

### Cases
| Action | Arguments | Returns | Notes |
|---|---|---|---|
| `hr_start_case` | `p_staff_id uuid, p_case_type text, p_title? text, p_is_restricted? bool=false, p_owner_staff_id? uuid` | uuid | Copies the playbook's steps. Managers: manager-startable types for direct reports only; `p_is_restricted` / `p_owner_staff_id` HR only. |
| `hr_update_case` | `p_case_id uuid, p_changes jsonb` | void | `title, status (open/on_hold), owner_staff_id, is_restricted, summary`. |
| `hr_tick_step` | `p_case_id uuid, p_step_key text, p_done? bool=true` | void | Steps linked to a request tick themselves when it completes. |
| `hr_close_case` | `p_case_id uuid, p_outcome text` | void | Outcome required. |
| `hr_archive_case` | `p_case_id uuid` | void | Closed cases, HR / global admin. |

### Notes
| Action | Arguments | Returns | Notes |
|---|---|---|---|
| `hr_add_note` | `p_staff_id uuid, p_body text, p_note_type text, p_case_id? uuid, p_share? bool=false` | uuid | `p_note_type` from `hr.note_types`. |
| `hr_update_note` | `p_note_id uuid, p_body? text, p_note_type? text` | void | Author or global admin. |
| `hr_share_note` | `p_note_id uuid` | void | Shows it to the person (cannot be undone). |
| `hr_archive_note` / `hr_restore_note` | `p_note_id uuid` | void | Author or global admin. |

### Settings and files
| Action | Arguments | Returns | Notes |
|---|---|---|---|
| `hr_update_setting` | `p_key text, p_value jsonb` | void | Lists: JSON array of text. `hr.playbooks`: `{ type: { label, manager_can_start, is_formal, steps: [{ label, kind, document_key? }] } }`. Admin-only keys: `hr.app_base_url`, `hr.email_redirect_to`, `hr.purge_enabled`, `hr.email_from`, `hr.payroll_email`. |
| `hr_file_target` / `hr_prepare_upload` / `hr_record_upload` | — | — | Used by `hr-files`; do not call directly. |

## 6. Merge fields

Filled from the records at send time: `employee_full_name, employee_first_name, employee_legal_name, job_title,
department, grade, start_date, probation_end_date, leave_date, end_date, place_of_work, annual_salary ("£40,000"),
notice_period, line_manager_name, sender_name, sender_job_title, today, contract_send_date, meeting_date,
meeting_time, meeting_location, due_date, company_name`. Anything else must be listed in the document's
`extra_merge_fields` and given in `p_merge_data`.

## 7. Edge functions

All are `POST` with JSON unless noted. Signed-in ones use `supabase.functions.invoke` (the person's token);
errors: `401 sign_in_required`, `403 { error: 'no_access', message }`, `400 { error: message }`.

### `hr-send` (signed in)
`{ action: 'send', request_id, note? }` → `{ status: 'sent' | 'queued' | 'awaiting_approval' }` ·
`{ action: 'resend', request_id }` · `{ action: 'cancel', request_id, reason? }` → `{ status: 'cancelled', esign_withdrawn }` ·
`{ action: 'decide', approval_id, approve: true|false, comment? }` (comment required to send back) ·
`{ action: 'publish', document_id }` → `{ status: 'published', acknowledgements_queued }`.
`queued` means the email will be retried automatically; the request shows `last_send_error` meanwhile.

### `hr-respond` (signed in)
`{ request_id, response: 'acknowledge' | 'accept' | 'decline' | 'submit', comment?, answers? }` → `{ status, response }`.
Forms send `answers` as `{ [field.key]: value }` (booleans as true/false, dates `YYYY-MM-DD`, select values).
File fields are uploaded first with `hr-files` (`upload`, kind `rtw`, id = my staff id).

### `hr-files` (signed in)
`{ action: 'download_url', kind: 'signed' | 'rtw' | 'document', id, index? }` → `{ url, file_name, expires_in: 300 }`
(`signed`: request id; `rtw`: staff id, `index` from 1; `document`: document id) ·
`{ action: 'upload', kind: 'rtw' | 'document', id, file_name, content_type, data_base64 }` → `{ path }`
(PDF, JPEG or PNG, at most 10 MB).

### `hr-public-respond` (public page, no sign-in)
`GET ?token=…` → `{ state: 'ok', first_name, title, body, response_type, form_fields, due_at, expires_at, rtw_files }`,
or `state` `expired` | `used` | `cancelled` (410) / `not_found` (404): show a friendly message ("This link has
expired. Please reply to the email and we'll send a new one.").
`POST { token, action: 'upload', file_name, content_type, data_base64 }` → `{ uploaded: true }` ·
`POST { token, action: 'submit', response, comment?, answers? }` → `{ status }`. Links work once and expire after 14 days.
Call it with plain `fetch` (no Authorization header) at `<project URL>/functions/v1/hr-public-respond`.

`hr-esign-webhook` and `hr-worker` are server-only (eSignatures and the scheduler); never call them.

<!-- Generated from the Woozle staging database by scripts/sync-lovable-contract.ps1 (woozle-crm). Edit docs/lovable-contract/ there, not this file. -->
