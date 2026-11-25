# Woozle OS API contract for Lovable — part 1 of 2

Setup, sign-in, errors, permissions, navigation, design and edge functions.
Part 2 (`lovable-api-contract-2.md`) lists every view and action.

Environment: **staging only**, project URL `https://cwbtercykiisngbecime.supabase.co`.
Lovable gets only the project URL and the **publishable key** (`sb_publishable_…`, also called the
anon key). Never ask for, store or use a service-role / secret key, a database password or dashboard
access. You do not need them: the database decides what each signed-in person may see and do.

## 1. Rules that never change

1. **Every data call goes to the `api` schema.** Calls to any other schema are refused (error
   `42501`), and so is a call with no schema. Always use `supabase.schema('api')`.
2. **Every call runs as the signed-in person.** Anonymous visitors can read and do nothing.
3. **Reads** = `select` on an api view. **Writes** = `rpc` to an api action. There is no
   `insert`, `update` or `delete` on views. Use the action for the change.
4. **Nothing is ever deleted.** "Delete" in the UI means *archive*, and there is usually a *restore*.
5. Hide buttons people can't use (section 5), but **the database enforces every rule anyway**.
   Show the database's error `message` as it is.
6. Dates and times are ISO 8601 UTC strings. Show them in en-GB ("18 Nov 2026, 16:58"), and show "—"
   for missing values. Money comes as `value` + `currency` (3 letters) + `value_gbp`.

## 2. Client

```ts
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  'https://cwbtercykiisngbecime.supabase.co',
  '<publishable key>',
  { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } },
)
export const api = supabase.schema('api')

// Read a view
const { data, error } = await api.from('companies_list')
  .select('id,name,owner_name,last_activity_at')
  .ilike('name', `%${search}%`)
  .order('last_activity_at', { ascending: false, nullsFirst: false })
  .range(0, 49)

// Call an action (keys are the parameter names, p_…)
const { data: id, error: e2 } = await api.rpc('create_company', { p_name: 'Acme Capital' })
```

- An action returning `uuid` or `text` gives a JSON string. `void` gives `null`. `jsonb` gives an object.
- Pagination: `.range(from, to)`; ask for a count with `.select('…', { count: 'exact' })`.
- Never use `supabase.from(...)` without `.schema('api')`.

## 3. Google sign-in and access gate

```ts
await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: window.location.origin,
    queryParams: { hd: 'woozleresearch.com', prompt: 'select_account' },
  },
})
```

- Only `@woozleresearch.com` Google accounts with an active staff record and a role can sign in.
  Anyone else comes back with `error_description` in the URL. Show it as is, e.g. "There is no
  Woozle staff record for x@… Ask an admin to add you."
- **After sign-in**, read `api.my_staff_profile` (one row: `id, full_name, work_email, is_active,
  roles[], permissions[]`). **No row means no access**: show a "No access" page with a Sign out
  button and nothing else. Keep the row in app state (it drives section 5).
- Then read `api.my_connection_status` (one row). If `access` is not `ok`, show `access_message`.
  If `show_first_run` is true, show the "Connect your Gmail" panel: **Connect Gmail** (edge
  function `nylas-auth`) and **Skip for now** (`rpc('skip_mailbox_setup')`). Otherwise open the
  space's first page.
- Sign out: `supabase.auth.signOut()`. supabase-js refreshes the token itself.
- When Google sends the person back after connecting Gmail, the URL carries `connected=1&email=…`
  or `connected=0&error=…`. Show a banner: `mailbox_mismatch` → "That wasn't your Woozle mailbox";
  `mailbox_already_connected` → "Ask an admin"; `invalid_state` → "Press Connect Gmail again".

## 4. Errors

supabase-js returns `error = { code, message, details, hint }`. Show `message`.

| HTTP | code | Meaning |
|---|---|---|
| 401 | `PGRST301` / `PGRST303` | Not signed in or session expired → sign in again |
| 403 | `42501` | No permission (message names it), or not yours to change; also any call outside `api` |
| 404 | `P0002` | Not found, not visible to you, or archived (message says which) |
| 400 | `22023` | Bad input (empty name, unknown field, bad URL / email / phone / date, already archived…) |
| 409 | `23505` | Duplicate (name, domain, email, LinkedIn already used; message names who has it) |
| 400 | `22P02` | Not a valid uuid / date |
| 400 | `P0001` | Refused by a merge |

Each action is all-or-nothing: if it fails, nothing it did is kept.

## 5. Permissions (for showing and hiding; the database enforces them)

`my_staff_profile.permissions` lists codes such as `sales.view`, `sales.edit`. `api.my_access` gives
ready-made yes/no flags for the current person: `is_global_admin, companies_view, companies_edit,
people_view, people_edit, deals_view, deals_edit, notes_view, notes_add, notes_change_any,
tasks_sales_view, tasks_sales_edit, tasks_marketing_view, tasks_marketing_edit, blog_view,
blog_edit, blog_approve, admin_view, admin_edit, can_hard_delete` (always false). **Use
`my_access` to show and hide things.**

| Role | Can see | Can change |
|---|---|---|
| Global admin | everything | everything (passes every check) |
| Sales | companies, people, deals, emails / meetings they may see, sales tasks, blog | companies, people, deals (`sales.edit`), sales tasks, blog drafts (`marketing.edit`) |
| Marketing | companies, people (read), marketing tasks, blog | marketing tasks, blog drafts |
| Delivery | companies, people, deals (read) | people (`delivery.edit`); not companies or deals |
| Finance | companies, people, deals (read) | nothing in the CRM |
| Compliance | companies, people (read) | nothing in the CRM |
| HR | no CRM data | nothing in the CRM |

Other rules:
- **Blog approval** (`approve_request`, `send_back_request`, `restore_blog_item`) needs
  `marketing_approval.edit`, which only global admin has.
- **Admin pages** (staff connections, mailbox spaces, settings) need `admin.view` / `admin.edit`
  (global admin only).
- **Tasks**: you see your division's tasks (`sales_tasks.*`, `marketing_tasks.*`) plus any task
  assigned to you or created by you.
- **Notes**: adding one needs `my_access.notes_add` (Sales; Delivery on people). Only the author
  (or global admin) edits, archives or restores it (`notes_list.can_change`).
- **Emails / meetings**: everything in your own mailbox and calendar. A colleague's email shows
  only when it is matched to a person or company and isn't automated. A colleague's meeting shows
  only when it is linked, not private, not hidden and not archived. `mailbox_email` is blank on a
  colleague's item.
- **Owner-only** (global admin included): `unmatched_inbox`, `my_calendar`, AI chats.
- Link / unlink an email or meeting: the owner of the mailbox, or anyone with `sales.edit` /
  `delivery.edit` on an item they can see.

## 6. Spaces and navigation (Woozle OS)

One app with a **space switcher** (top-left square badge in the space colour). The switcher lists
only the spaces the person may see. The URL decides the space: `/marketing/…` is Marketing, `/admin/…`
is Admin, everything else is Sales. **Delivery is coming later. Don't build it yet.** Finance and HR
also come later ("Coming soon" in the switcher).

**General group, first in every space:** Start, Inbox (dot when unread), Tasks.

| Space (colour) | Pages | Data |
|---|---|---|
| **Sales** (`#1D4ED8`) | Start `/start`; Inbox `/inbox`; Tasks `/tasks`; Records: Deals `/deals` (+ `/deals/:id`, only with `deals_view`), Companies `/companies` (+ `/companies/:id`), People `/people` (+ `/people/:id`), Meetings `/meetings`; Growth: Signals, Outreach (both "Later", empty) | `deals_list`, `deal_detail`, `companies_list`, `company_*`, `people_list`, `person_*`, `employment_history`, `my_calendar`, `unmatched_inbox`, `tasks_list`, `notes_list` |
| **Marketing** (`#7C3AED`) | Inbox `/marketing/inbox`; Tasks `/marketing/tasks`; Content: Blog `/marketing/blog` (board and calendar; approval count badge for approvers), post editor `/marketing/blog/:id`, Authors `/marketing/authors`; Later: Social, Emails, Audience (empty); Settings `/marketing/settings` (`admin_edit` only) | `blog_items_list`, `blog_item_detail`, `approval_queue`, `approval_history`, `blog_awaiting_count`, `author_profile_list`, `content_*_options`, `app_settings_list` |
| **Admin** (`admin_view` only; neutral grey badge) | Staff connections `/admin/staff-connections` (each person's sign-in, mailbox and history, with **Restart history** → `restart_mailbox_history`); Mailbox spaces `/admin/mailbox-spaces` (which mailbox / address is Sales or Marketing → `upsert_mailbox_space`); optional Activity log `/admin/activity` (the write log) | `staff_connections`, `mailbox_spaces_list`, `activity_log_list` |

In the Retool app the two admin pages sit in the General group (`/staff-connections`,
`/mailbox-spaces`). In this UI they form their own Admin space.

- **Inbox** per space: `unmatched_inbox` where `space` equals the space **or is null**:
  `.or('space.eq.sales,space.is.null')`. Moving a thread: `set_thread_space`.
- **Tasks** per space: `tasks_list` with `.eq('space', 'sales')`.
- **Gmail card** (Inbox page): from `my_connection_status`. Not connected → **Connect Gmail**;
  `mailbox_status = 'expired'` → **Reconnect Gmail**; connected → **Disconnect Gmail** (with a
  confirmation). While `history_status = 'downloading'`, show "Downloading your email history: N
  emails so far" and re-read it every 30 seconds.
- **Assistant panel** (right side, every space): the `ai-chat` edge function (section 8).

## 7. Design style

Light only (never dark), quiet and dense, like **Attio / Twenty CRM**: white canvas, thin grey
borders, no shadows or gradients, one accent per space.

| Use | Colour |
|---|---|
| Canvas, cards, panels | `#FFFFFF` |
| Text / muted text | `#1F2328` / `#5F6368` |
| Sidebar, table header, search fields | `#FAFAF9` |
| Hover / selected | `#EDEDEA`; active nav item `#E4E4E0` with `#111111` text |
| Borders / row dividers | `#E8E8E5` / `#F0F0EE` |
| Primary button | `#1F2328`, white text |
| Focus, links, unread dot | `#1D4ED8` |
| Destructive | red `hsl(0 62% 45%)`; success green, warning amber |

- Font Inter. Page title `text-xl font-semibold tracking-tight`, body `text-sm`, labels and table
  headers `text-xs` muted, tags 11px. Radius 8px for cards / tables, 6px for buttons and chips.
- **Shell:** left sidebar (collapsed 64px icon rail by default; expanded 216px with space switcher,
  search "Search Sales…", grouped navigation with grey section labels, signed-in name and roles at
  the bottom). Top bar 48px: breadcrumb "Space / Page" on the left, "Search everything" on the right.
- **Lists:** full-width tables, 46px rows, 36px header, sticky header, search and filter chips
  above, the row opens the record page.
- **Record pages:** header (name, key facts, actions), then tabs (Overview, Activity, People / Deals,
  Notes, Tasks); a right rail with details.
- Status tags are soft tinted pills: blue (email, downloading), orange (meeting), green (current,
  complete, won), red (failed, lost), grey (everything else).
- Toasts bottom-right. Success messages are short and past tense ("Company archived"). Errors show
  the database's `message`.
- Blog bodies (`body_md`) are Markdown that may contain Woozle content blocks. Edit them as plain
  Markdown text and never rewrite or "clean" them; the website renders them.

## 8. Edge functions a browser calls

All use the signed-in person's token. `supabase.functions.invoke` sends it automatically, along
with the key. Allowed browser origins: `https://*.lovable.app`, `https://*.lovableproject.com`,
`http://localhost:5173`. On an error, `error.context` is the `Response`: read
`await error.context.json()`.

### `ai-chat` (POST, JSON in / JSON out, **not streamed**)

Requests:
```ts
await supabase.functions.invoke('ai-chat', { body: {
  action: 'message', conversation_id: null,            // null starts a new chat
  text: 'Find Acme and its open deals',
  space: 'sales',                                       // or 'marketing'
  context: { page: 'company', record_id: '<uuid>' },    // optional: the page the person is on
}})
// { action: 'approve' | 'reject', pending_action_id: '<uuid>' }
// { action: 'list' }    { action: 'history', conversation_id }    { action: 'archive', conversation_id }
```
Response (every action except `list`):
```json
{ "conversation_id": "uuid",
  "messages": [ { "role": "assistant", "text": "Markdown", "created_at": "2026-11-25T10:00:00Z" } ],
  "pending_actions": [ { "id": "uuid", "tool": "create_deal", "title": "Create deal",
      "record": { "type": "company", "id": "uuid", "name": "Acme", "path": "/companies/uuid" },
      "changes": [ { "field": "name", "before": null, "after": "Acme renewal" } ],
      "expires_at": "2026-11-25T10:30:00Z" } ],
  "links": [ { "label": "Acme", "type": "company", "id": "uuid", "path": "/companies/uuid" } ],
  "status": "done", "error": null }
```
- Render `messages[].text` as Markdown. `history` returns the whole chat (roles `user` and `assistant`).
- `pending_actions`: one card per proposed change, showing the before → after list with **Approve** / **Reject**.
  Cards expire after 30 minutes. `status` is `awaiting_approval` while cards are open. Nothing
  changes until Approve.
- `links[].path` is an app route: navigate inside the app.
- `list` → `{ "conversations": [ { "id", "title", "space", "last_message_at", "created_at" } ] }`.
- Errors: 400 bad request, 401 not signed in, 403 no permission, 404 not found, 409 already decided,
  502 assistant unavailable. `error` holds a message to show.
- A reply can take 10–60 seconds: show a typing indicator, and keep the input disabled until the reply arrives.

### `marketing-upload` (POST)

```ts
const { data, error } = await supabase.functions.invoke('marketing-upload', { body: {
  kind: 'cover',                 // 'cover' | 'inline' (image inside a post) | 'author'
  target_id: '<post id or author profile id>',
  content_type: 'image/png',     // image/jpeg | image/png | image/webp
  data_base64: '<file as base64, data: prefix allowed>',   // at most 5 MB
}})
// data = { path: 'covers/<id>/<uuid>.png', url: 'https://…/storage/v1/object/public/marketing-public/…' }
```
- Then save it: a cover with `rpc('update_blog_revision', { p_item_id, p_changes: { cover_path: path,
  cover_alt } })`; an author photo with `upsert_author_profile` (`photo_path`, `photo_alt`); `inline`:
  insert `![alt](url "caption")` into the body at the cursor (alt text required).
- Errors: 401 `{error:'sign_in_required'}`, 403 `{error:'no_access'}` (needs `marketing.edit`),
  400 `{error:'<message>'}`, 502 storage failure.

### `nylas-auth` (GET; Connect / Reconnect Gmail)

```ts
const { data, error } = await supabase.functions.invoke('nylas-auth', { method: 'GET' })
// data = { url, login_hint, expires_at }  → window.location.assign(data.url)  (same tab)
```
Google asks the person to allow reading mail and calendar, and sending mail, then returns to the app's start
page with `connected=…` (section 3). Errors: 401 `sign_in_required`, 403 `no_access`.

### `nylas-disconnect` (POST; ask for confirmation first)

```ts
const { data, error } = await supabase.functions.invoke('nylas-disconnect', { body: {} })
// { disconnected: true, mailbox_id, was_status, nylas_deleted }   or   { disconnected: false, reason: 'no_mailbox' }
```
Stored emails and meetings stay. Errors: 401 / 403 as above.

**Not for the browser:** `public-content` (the website's feed), `nylas-callback`, `nylas-webhook`,
`nylas-sync`, `nylas-worker`, `fx-rates-sync`, `mcp`. Don't call them.
