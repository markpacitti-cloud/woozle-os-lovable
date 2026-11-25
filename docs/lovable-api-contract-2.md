# Woozle OS API contract for Lovable — part 2 of 2

Every view and action in the `api` schema that a UI uses. Setup, sign-in, errors and permissions are
in part 1. Always call through `supabase.schema('api')`. **Delivery is coming later.** Its views
and actions (projects, pods, pipeline, files) exist but are left out here; don't use them yet.

Types: `ts` = timestamp with time zone (ISO string, UTC), `ci` = text compared without case,
`num` = numeric(14,2), `int`, `bool`, `date` (YYYY-MM-DD), `uuid`, `jsonb`, `[]` = array.
Filters use PostgREST / supabase-js syntax: `.eq('company_id', id)`,
`.order('sent_at', { ascending: false })`, `.ilike('name', '%acme%')`, `.is('archived_at', null)`.

## A. Views (read with `api.from(view).select(...)`)

### Me and access
- **`my_staff_profile`**: one row for the signed-in person; no row means no access.
  `id uuid, full_name text, work_email ci, is_active bool, roles text[], permissions text[]`
- **`my_access`**: one row of yes/no flags (part 1 §5).
  `is_global_admin, companies_view, companies_edit, people_view, people_edit, deals_view, deals_edit, notes_view, notes_add, notes_change_any, tasks_sales_view, tasks_sales_edit, tasks_marketing_view, tasks_marketing_edit, blog_view, blog_edit, blog_approve, admin_view, admin_edit, can_hard_delete` (all bool)
- **`my_connection_status`**: one row: access state, Gmail connection and history download.
  `user_id uuid, sign_in_email text, last_sign_in_at ts, staff_id uuid, full_name text, work_email text, is_active bool, roles text[], access text (ok | no_staff_record | inactive | no_roles), access_message text, mailbox_connected bool, mailbox_id uuid, mailbox_email text, mailbox_status text, connected_at ts, disconnected_at ts, last_synced_at ts, can_send bool, setup_completed_at ts, show_first_run bool, history_status text (not_started | downloading | complete | failed), history_messages int, history_oldest_at ts, history_updated_at ts, history_error text`
- **`staff_options`**: active staff for owner / assignee dropdowns. Order `full_name`.
  `id uuid, full_name text, work_email ci`

### Companies
- **`companies_list`**: non-archived companies. Search `.ilike('name', …)`; "Mine" `.eq('owner_staff_id', me.id)`; "No owner" `.is('owner_staff_id', null)`; default order `last_activity_at` desc, nulls last; 50 per page.
  `id uuid, name text, segment text, website text, primary_domain ci, source text, created_at ts, updated_at ts, owner_staff_id uuid, owner_name text, last_activity_at ts, linkedin_url text, description text, employee_count int, employee_range text`
- **`company_detail`**: one company (archived too). `.eq('id', id).single()`.
  `id, name, segment, website, primary_domain ci, linkedin_url, notes, source, owner_staff_id uuid, owner_name, domains text[], last_activity_at ts, archived_at ts, archived_by uuid, merged_into_id uuid, merged_into_name, created_at ts, updated_at ts, description, employee_count int, employee_range, created_by uuid, updated_by uuid`
- **`company_domains`**: email domains of a company. `.eq('company_id', id).order('domain')`.
  `domain ci, root_domain ci, company_id uuid, company_name text, source text, notes text, created_at ts`
- **`company_people`**: people who work / worked there. `.eq('company_id', id)`, order `is_current` desc, `started_on` desc nulls last; current only `.eq('is_current', true)`.
  `company_id uuid, role_id uuid, person_id uuid, full_name text, title text, started_on date, ended_on date, is_current bool, is_primary bool, primary_email ci, phone text, linkedin_url text`
- **`company_deals`**: same columns as `deals_list`; `.eq('company_id', id)`.
- **`company_activity`**: emails and meetings, newest first. `.eq('company_id', id).order('occurred_at', {ascending:false})`; one type only: `.eq('kind', 'email' | 'meeting')`.
  `company_id uuid, kind text, item_id uuid, occurred_at ts, ends_at ts, title text, snippet text, direction text, from_email ci, from_name text, participant_address ci, participant_person_id uuid, is_main_link bool, mailbox_email ci, thread_or_ical_id text`
- **`company_timeline`**: emails only, one row per message per company. Order `sent_at` desc.
  `company_id, message_id uuid, sent_at ts, direction, participant_role, participant_address ci, participant_person_id uuid, is_main_link bool, from_email ci, from_name, subject, snippet, mailbox_id uuid, mailbox_email ci, nylas_thread_id text`
- **`company_meetings`**: meetings only. Order `starts_at` desc.
  `company_id, event_id uuid, starts_at ts, ends_at ts, title, description, location, conferencing_url, html_link, event_status, owner_response, organizer_email ci, organizer_name, participant_address ci, participant_person_id uuid, is_main_link bool, mailbox_id uuid, mailbox_email ci, ical_uid text`

### People
- **`people_list`**: non-archived people. Search `.ilike('full_name', …)`; order `last_activity_at` desc, nulls last.
  `id uuid, full_name, first_name, last_name, linkedin_url, primary_company_id uuid, primary_company_name, primary_title, primary_email_id uuid, primary_email ci, primary_email_status, phone, source, created_at ts, updated_at ts, last_activity_at ts`
  For one person's header, read `people_list` with `.eq('id', id)`.
- **`person_emails`**: addresses of a person. `.eq('person_id', id).order('is_primary', {ascending:false})`.
  `id uuid, person_id uuid, email ci, email_domain ci, type text, status text, is_primary bool, verified_at ts, source text, created_at ts, updated_at ts`
- **`employment_history`**: roles, current and past. `.eq('person_id', id)` (or `company_id`), order `is_current` desc, `started_on` desc.
  `id uuid, person_id, person_name, company_id uuid, company_name, title, started_on date, ended_on date, is_current bool, is_primary bool, source, created_at ts, updated_at ts`
- **`person_deals`**: deals a person is on. `.eq('person_id', id)`.
  `person_id uuid, is_primary bool, deal_id uuid, name, status, company_id uuid, company_name, owner_staff_id uuid, owner_name, value num, currency char(3), value_gbp num, closed_at ts`
- **`person_activity`**: emails and meetings, as `company_activity` but keyed by `person_id` (`person_address` instead of participant columns).
  `person_id, kind, item_id, occurred_at, ends_at, title, snippet, direction, from_email, from_name, person_address ci, is_main_link, mailbox_email, thread_or_ical_id`
- **`person_timeline`** (emails) / **`person_meetings`** (meetings): as the company versions, keyed by `person_id`. Timeline extra: `person_role`, `person_address`. Meetings extra: `person_address, is_person_organizer bool, person_response`.

### Deals (only with `deals_view`)
- **`deals_list`**: non-archived deals. Order `last_activity_at` desc or `created_at` desc; filter `.eq('status', 'in_progress' | 'won' | 'lost')`, `.eq('owner_staff_id', …)`.
  `id uuid, name, status, company_id uuid, company_name, primary_person_id uuid, primary_person_name, owner_staff_id uuid, owner_name, value num, currency char(3), value_gbp num, closed_at ts, last_activity_at ts, created_at ts, updated_at ts`
- **`deal_detail`**: one deal (archived too). `.eq('id', id).single()`.
  The `deals_list` columns plus `description, company_source, fx_rate numeric, fx_rate_date date, fx_is_derived bool, source_thread_id text, people jsonb ([{person_id, full_name, is_primary, company_id, company_name, title, primary_email}]), archived_at ts, archived_by, created_by, updated_by`

### Email, calendar, inbox
- **`unmatched_inbox`**: the person's own messages that match nobody (owner only). Space inbox: `.or('space.eq.sales,space.is.null')`; order `sent_at` desc.
  `id uuid, sent_at ts, direction, from_email ci, from_name, to_emails jsonb, cc_emails jsonb, subject, snippet, external_addresses text, mailbox_id uuid, mailbox_email ci, nylas_thread_id text, created_at ts, space text (sales | marketing | null)`
- **`email_search`**: messages the person may see, for search. `.ilike('subject', …)` or `.eq('person_id', …)`; order `sent_at` desc.
  `id uuid, sent_at ts, direction, from_email, from_name, to_emails jsonb, cc_emails jsonb, subject, snippet, mailbox_id uuid, mailbox_email, nylas_thread_id, person_id uuid, person_name, company_id uuid, company_name, is_matched bool, space`
- **`email_message_bodies`**: full HTML body of one message (or a thread): `.eq('id', id)` or `.eq('nylas_thread_id', t).order('sent_at')`. Render it in a sandboxed iframe, never as raw HTML.
  `id uuid, mailbox_id uuid, nylas_thread_id text, sent_at ts, body_html text`
- **`my_calendar`**: the person's own events (owner only). Meetings page: `.is('archived_at', null).eq('is_hidden_from_timelines', false).order('starts_at', {ascending:false})`; "To link": `.eq('is_matched', false)`.
  `id uuid, starts_at ts, ends_at ts, start_date date, end_date date, start_timezone, is_all_day bool, title, description, location, conferencing_url, html_link, event_status, owner_response, is_organizer bool, organizer_email ci, organizer_name, is_private bool, external_attendee_count int, is_large_meeting bool, is_hidden_from_timelines bool, is_matched bool, external_attendees text, person_id uuid, person_name, company_id uuid, company_name, match_method, is_manual_link bool, archived_at ts, archived_reason, mailbox_id uuid, mailbox_email ci, nylas_event_id, ical_uid, nylas_master_event_id, last_synced_at ts, created_at ts`

### Notes and tasks
- **`notes_list`**: live notes. `.eq('company_id' | 'person_id' | 'deal_id', id).order('created_at', {ascending:false})`.
  `id uuid, record_type text, record_id uuid, record_name, company_id, person_id, deal_id, body text, author_name, created_at ts, updated_at ts, edited_at ts, is_edited bool, can_change bool`
- **`notes_archived_list`**: archived notes (author / admin). Same keys plus `archived_at ts, archived_by_name`.
- **`tasks_list`**: tasks you may see. `.eq('space', 'sales')`; open first: `.order('is_done').order('due_on', {nullsFirst:false})`; mine: `.eq('assignee_staff_id', me.id)`.
  `id uuid, title, details, due_on date, is_overdue bool, space text, assignee_staff_id uuid, assignee_name, record_type, record_id uuid, record_name, company_id, person_id, deal_id, is_done bool, completed_at ts, completed_by_name, created_by_name, created_at ts, updated_at ts`

### Marketing (blog)
- **`blog_items_list`**: one row per post. Search `.ilike('title', …)`; board `.eq('board_column', 'draft' | 'awaiting' | 'scheduled' | 'published')`; calendar `.gte('calendar_at', from).lt('calendar_at', to)`; status `.in('status', [...])`.
  `id uuid, slug, status (draft | in_review | changes_requested | scheduled | published | unpublished | archived), title, content_type, content_type_label, author_name, is_members_only bool, tag_names text[], publish_at ts, published_at ts, first_published_at ts, has_pending_revision bool, pending_request_id uuid, pending_action, last_send_back_comment, cover_url, created_at ts, updated_at ts, is_slug_custom bool, board_column, is_live bool, requested_publish_at ts, calendar_at ts`
- **`blog_item_detail`**: one post for the editor. `.eq('id', id).single()`.
  `id, slug, status, publish_at ts, published_at ts, first_published_at ts, archived_at ts, live jsonb, pending jsonb, pending_request jsonb, history jsonb, is_slug_custom bool`. `live` / `pending` (null when absent) = `{revision_id, revision_no, title, slug, summary, body_md, seo_title, meta_description, content_type, content_type_label, tags, author_profile_id, author_name, cover_path, cover_url, cover_alt, is_members_only, publish_at, locked, word_count, read_minutes, updated_at}`. Edit `pending`. `pending_request` = `{id, action, submitted_at, submitted_by, note, requested_publish_at}`; `history` = list of `{id, action, status, submitted_by, submitted_at, note, decided_by, decided_at, comment, requested_publish_at}`.
- **`approval_queue`**: open requests (approvers). `id uuid, subject_kind, action (publish | update | unpublish | archive | restore | reschedule), item_id uuid, slug, title, submitted_by_name, submitted_at ts, submit_note, revision_id uuid, is_live bool, requested_publish_at ts, current_publish_at ts`
- **`approval_history`**: every request. `id, subject_kind, action, status, item_id, slug, title, submitted_by_name, submitted_at, submit_note, decided_by_name, decided_at, decision_comment, requested_publish_at`
- **`blog_awaiting_count`**: `awaiting int` (0 for non-approvers; the nav badge).
- **`content_type_options`**: `id, code, label, plural_label, sort_order int`. Order `sort_order`.
- **`content_tag_options`**: `id, kind (topic | persona | client_type | sector), name, slug`.
- **`author_profile_list`**: `id, staff_id, staff_name, slug, display_name, job_title, bio, photo_path, photo_url, photo_alt, is_active bool, updated_at ts`
- **`app_settings_list`**: `key, value, description, updated_at` (`website_url`, `public_storage_url`).

### Admin, AI, log
- **`staff_connections`** (admin): every staff member's sign-in and mailbox; same columns as `my_connection_status`.
- **`mailbox_spaces_list`** (admin): `id uuid, address text, space text, updated_at ts`. Order `address`.
- **`activity_log_list`**: the write log (global admin sees all; others only their own changes). Order `occurred_at` desc; `.eq('record_id', id)` for a record's history.
  `id uuid, occurred_at ts, actor_user_id, actor_staff_id uuid, actor_name, table_name, record_id uuid, action, changed_fields text[], before jsonb, after jsonb, source (woozle_os | claude | retool_mcp | retool_chat | system), tool`
- `ai_conversations_list`, `ai_messages_list`, `ai_pending_actions_list`: used by the `ai-chat`
  edge function. Use ai-chat's `list` / `history` instead of reading them.

## B. Actions (`api.rpc(name, { p_…: value })`)

`?` = optional. All return codes: part 1 §4. "sales.edit" etc. = needed permission (global admin passes all).

### Companies (sales.edit)
| Action | Arguments | Returns | Notes / extra codes |
|---|---|---|---|
| `create_company` | `p_name text, p_segment?, p_website?, p_linkedin_url?, p_notes?, p_domain?, p_owner_staff_id? uuid, p_allow_duplicate_name? bool=false, p_description?, p_employee_count? int, p_employee_range?` | uuid | 23505 duplicate name / domain (resend with `p_allow_duplicate_name: true` only after the user confirms) |
| `update_company` | `p_company_id uuid, p_changes jsonb` | void | keys: name, segment, website, linkedin_url, primary_domain, notes, description, employee_count, employee_range; `null` / `""` clears |
| `add_company_domain` | `p_company_id, p_domain text` | text (cleaned domain) | 23505 domain used elsewhere |
| `set_company_owner` | `p_company_id, p_owner_staff_id? uuid` (null clears) | void | |
| `archive_company` / `restore_company` | `p_company_id` | void | |
| `merge_companies` | `p_keep_id, p_drop_id` | void | moves everything to the kept company; P0001 |

### People (sales.edit or delivery.edit)
| Action | Arguments | Returns | Notes |
|---|---|---|---|
| `create_person` | `p_first_name?, p_last_name?, p_full_name?, p_email?, p_company_id? uuid, p_title?, p_phone?, p_linkedin_url?, p_notes?` | uuid | full name is built from first + last (send `p_full_name` only without them); 23505 email / LinkedIn used |
| `update_person` | `p_person_id, p_changes jsonb` | void | keys: first_name, last_name, full_name, linkedin_url, notes, phone, primary_email_id |
| `add_person_email` | `p_person_id, p_email, p_type?, p_status?='active', p_make_primary? bool` | uuid | 23505 |
| `add_person_role` | `p_person_id, p_company_id?, p_title?, p_started_on? date, p_is_current?=true, p_is_primary?=false` | uuid | |
| `end_person_role` | `p_role_id, p_ended_on? date` | void | `role_id` from `employment_history.id` |
| `archive_person` / `restore_person` | `p_person_id` | void | |

### Deals (sales.edit)
| Action | Arguments | Returns |
|---|---|---|
| `create_deal` | `p_name, p_description?, p_value? numeric, p_currency?='GBP', p_owner_staff_id?, p_person_ids? uuid[], p_primary_person_id?, p_company_id?, p_source_thread_id?` | deal JSON ↓ |
| `update_deal` | `p_deal_id, p_changes jsonb` (keys: name, description, value, currency, source_thread_id) | void |
| `set_deal_status` | `p_deal_id, p_status ('in_progress' \| 'won' \| 'lost'), p_closed_at? ts` | void |
| `set_deal_owner` | `p_deal_id, p_owner_staff_id?` | void |
| `add_deal_person` | `p_deal_id, p_person_id, p_make_primary?=false` | deal JSON |
| `remove_deal_person` | `p_deal_id, p_person_id` | void |
| `set_deal_company_override` | `p_deal_id, p_company_id?` (null = work it out from the people) | deal JSON |
| `archive_deal` / `restore_deal` | `p_deal_id` | void |

Deal JSON: `{ deal_id, company_id, company_name, company_status: set | kept | manual | needs_choice | none,
company_options: [{company_id, company_name, people:[{person_id, full_name}]}], notes: [{…, message}] }`.
When `needs_choice`, ask the user and call `set_deal_company_override`. Show each `notes[].message`.

### Linking emails and meetings (owner of the item, or sales.edit / delivery.edit)
| Action | Arguments | Returns |
|---|---|---|
| `link_email` | `p_message_id, p_person_id?, p_company_id?` | void |
| `unlink_email` | `p_message_id` | void |
| `link_meeting` | `p_event_id, p_person_id?, p_company_id?` | void |
| `unlink_meeting` | `p_event_id` | void |
| `set_thread_space` | `p_mailbox_id, p_thread_id text, p_space ('sales' \| 'marketing')` | void |

### Notes and tasks
| Action | Arguments | Returns | Who |
|---|---|---|---|
| `add_note` | `p_body, p_company_id? \| p_person_id? \| p_deal_id?` (exactly one) | uuid | `my_access.notes_add`: company / deal note sales.edit; person note sales.edit or delivery.edit |
| `update_note` | `p_note_id, p_body` | void | author / admin |
| `archive_note` / `restore_note` | `p_note_id` | void | author / admin |
| `create_task` | `p_title, p_space ('sales' \| 'marketing'), p_due_on? date, p_assignee_staff_id?, p_details?, p_company_id?, p_person_id?, p_deal_id?` | uuid | `<space>_tasks.edit` |
| `update_task` | `p_task_id, p_changes jsonb` (keys: title, details, due_on, assignee_staff_id, space, company_id, person_id, deal_id) | void | division, assignee or creator |
| `complete_task` / `reopen_task` | `p_task_id` | void | same |

### Mailbox
| Action | Arguments | Returns |
|---|---|---|
| `skip_mailbox_setup` | — | `{ setup_completed_at }` |
| `restart_mailbox_history` (admin.edit) | `p_staff_id` | jsonb |
| `upsert_mailbox_space` (global admin) | `p_address text, p_space` (`'sales'` or `'marketing'`; null removes the address) | uuid |
Server-only (called by edge functions; **don't** call them from the UI): `start_mailbox_connection`, `disconnect_my_mailbox`
(use `nylas-auth` / `nylas-disconnect`), `prepare_marketing_upload` (use `marketing-upload`), and
`ai_start_conversation`, `ai_append_message`, `ai_add_pending_action`, `ai_decide_pending_action`,
`ai_record_tool_result`, `ai_record_action_result`, `ai_archive_conversation` (use `ai-chat`).

### Blog (marketing.edit unless noted)
| Action | Arguments | Returns |
|---|---|---|
| `create_blog_item` | `p_content_type (code), p_title, p_slug?` | `{ item_id, slug, … }` |
| `update_blog_revision` | `p_item_id, p_changes jsonb` (keys: title, summary, body_md, seo_title, meta_description, content_type, tag_ids uuid[], author_profile_id, publish_at, cover_path, cover_alt, is_members_only, slug; `slug: ""` follows the title again) | `{ slug, is_slug_custom }` |
| `submit_blog_item` | `p_item_id, p_note?` | uuid (request) |
| `withdraw_submission` | `p_request_id` | void |
| `request_unpublish` / `request_archive` | `p_item_id, p_note?` | uuid (request) |
| `reschedule_blog_item` | `p_item_id, p_publish_at ts, p_note?` | jsonb (refused for published posts or past times) |
| `create_preview_token` (view or edit) | `p_item_id` | `{ token, preview_url, expires_at }`. Open `preview_url` (2 hours); never show or log `token` |
| `create_content_tag` | `p_kind (topic \| persona \| client_type \| sector), p_name` | uuid |
| `upsert_author_profile` | `p_staff_id, p_changes jsonb` (keys: display_name, slug, job_title, bio, photo_path, photo_alt, is_active) | uuid |
| `approve_request` (approver) | `p_request_id, p_comment?` | jsonb |
| `send_back_request` (approver) | `p_request_id, p_comment` (required) | void |
| `restore_blog_item` (approver) | `p_item_id` | void |
| `update_app_setting` (admin.edit) | `p_key ('website_url'), p_value (https URL, no path)` | text |

Approvers = `my_access.blog_approve`. A post changes on the website only when a request is approved.
Writers edit `pending`; `submit_blog_item` sends it for approval.
