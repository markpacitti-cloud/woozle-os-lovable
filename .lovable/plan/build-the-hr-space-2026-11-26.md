# Build the HR space

## What you’ll get

- HR in the space switcher for signed-in staff, with permission-based navigation and a teal HR accent.
- **My HR:** pending requests, document reader and response controls, completed documents, shared notes, and editable personal/payroll details.
- **Policies:** search, category filtering, policy preview, version/effective-date details, and acknowledgement state derived from the reader’s own requests.
- **My team:** direct-report cards and person pages with permitted notes, cases, and document sending with preview.
- **People:** searchable/filterable HR directory and full person records, including employment/pay editing and right-to-work uploads for authorised staff.
- **Cases:** status board, restricted-case indicators, checklist, notes, linked documents, next-document sending, and case updates/closure.
- **Sent:** request filters, status chips, request previews, and resend/cancel actions.
- **Templates & Policies:** document list, Markdown editing with merge-field guidance, draft saving, and publishing with all-staff acknowledgement confirmation.
- **Approvals:** letter previews and approve/send-back decisions with comments.
- **Public response:** `/hr/respond?token=…` outside the staff sign-in shell, using only `hr-public-respond` without an authorization header.

## Technical approach

- Add typed HR models and small shared HR helpers/components; use only documented `api` views/RPCs and the `hr-send`, `hr-respond`, `hr-files`, and `hr-public-respond` functions.
- Keep HR out of global search and Ask Woozle, never persist HR data or signed file links, and open five-minute file links in a new tab.
- Add dedicated routes and metadata for every HR page, including dynamic team, person, case, and public-response URLs.
- Preserve the existing Companies, People, authentication, and navigation behaviour.
- Add focused tests for HR navigation permissions, public-response detection, and request/response rules; run existing tests and exercise key flows with mocked contract responses in the browser.

## Deliberately not included

- HR Settings, because it was not in the uploaded feature list.
- Any undocumented view, column, RPC, function, storage call, SQL, backend integration, or AI capability.
