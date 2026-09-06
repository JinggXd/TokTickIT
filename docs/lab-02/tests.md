# Lab 2 Test Plan and Results

**Plan version:** `1.1.1` (updated 2026-09-04 — adds strict validation for Phase 4 query parameters)

Companion to `docs/lab-02/specification.md` and `docs/lab-02/api-spec.md`. Written and approved
**before** implementation (Test-DD, labsheet Section 9) — the coding agent must make these tests
fail first, then implement the smallest correct behavior to turn them green (TDD). Tests added by
a later contract audit are labeled as regression coverage and must not be given fabricated Red
evidence when the implementation already exists.

---

## 1. Test Strategy

Six required levels (labsheet Section 9.2 / 4.10):

1. **Unit** — isolated functions with no DB/HTTP (ticket-number formatting, filename
   sanitization, trimming/validation helpers, pagination clamping).
2. **API** — HTTP-level, hitting real endpoints against a test database: contracts, validation,
   ownership, attachment lifecycle, every status code in `api-spec.md` Section 7.
3. **UI Component** — component rendering, field-level validation display, busy states, modals,
   in isolation from the network (mocked API calls).
4. **UI Style** — CSS tokens, badge composition (icon+text, not color-only), focus-ring presence,
   read-only vs. editable visual distinction.
5. **Responsive** — layout behavior across the three breakpoints, table→card transformation, no
   horizontal overflow.
6. **End-to-End (E2E)** — full user flows through a running app, including at least one *failure*
   path, not only the happy path.

Data/schema integration checks supplement these six levels for migration, foreign-key, index, and
idempotent-seed evidence.

## 2. Test Environment & Commands

```bash
# Server: unit + API
npm --prefix server run test

# Client: UI component + UI style
npm --prefix client run test

# Responsive + Visual + E2E (Playwright, captures screenshots to artifacts/lab-02/screenshots/)
npx playwright test
```

All three commands must exit `0` on the final `main` branch with **zero** skipped/disabled tests.

---

## 3. Planned Tests — Unit

| Test ID | BR / AC | Scope | Expected Result | File |
|---|---|---|---|---|
| UNIT-01 | BR-01 | Ticket number sequence generator | Produces `TKT-YYYY-XXXXXX`, strictly increasing, zero-padded to 6 digits | `server/tests/lab-02/ticket-number.unit.test.ts` |
| UNIT-02 | BR-01 | Generator retry-then-fail behavior | After 3 simulated unique-constraint collisions, throws a typed error the route handler turns into `500` | `server/tests/lab-02/ticket-number.unit.test.ts` |
| UNIT-03 | BR-09 | Trim-then-validate helper | `"  hi  "` (after trim, 2 chars) fails Summary's 5-char minimum; correctly-trimmed valid input passes | `server/tests/lab-02/validation.unit.test.ts` |
| UNIT-04 | BR-19 | Safe filename sanitizer | `../../etc/passwd.jpg` → path segments stripped and rejected; `my report (final)!!.pdf` → collapses to a safe `my_report_final_.pdf`-style name; original extension preserved | `server/tests/lab-02/safe-filename.unit.test.ts` |
| UNIT-05 | BR-19 | MIME/extension mismatch detector | A `.jpg`-named file whose magic bytes are a PDF is flagged as a mismatch | `server/tests/lab-02/safe-filename.unit.test.ts` |
| UNIT-06 | BR-12 | Pagination clamp function | `page=0` → `1`; `page=999` with `totalPages=5` → `5`; `limit=7` (unsupported) → validation error | `server/tests/lab-02/pagination.unit.test.ts` |

### 3.1 Planned Tests — Data and Schema Integration

| Test ID | BR / AC | Scope | Expected Result | File |
|---|---|---|---|---|
| DATA-01 | BR-15 | Prisma schema/migration integrity | `Ticket.requesterId` is a real foreign key to `RequesterUser`; required unique constraints and indexes exist | `server/tests/lab-02/schema.integration.test.ts` |
| DATA-02 | BR-05 | Idempotent seed | Running the seed twice leaves exactly the required 4 Categories, 7 Related Systems, 4 active Requesters, and 1 inactive Requester with no duplicates | `server/tests/lab-02/seed.integration.test.ts` |

## 4. Planned Tests — API

| Test ID | AC / BR | Scope | Expected Result | File |
|---|---|---|---|---|
| API-01 | AC-01, AC-03; BR-02, BR-16, BR-17 | `POST /api/tickets` valid data | `201`; response matches `api-spec.md` Section 6.4; `ticketNo` and `createdAt` are backend-issued; `currentStatus=NEW`; `itPriority=requestedPriority`; `ticketOwnerId=null` | `server/tests/lab-02/create-ticket.api.test.ts` |
| API-02 | AC-04 | `POST /api/tickets` missing/short fields | `400`; `details` object names every invalid field in one response | `server/tests/lab-02/create-ticket.api.test.ts` |
| API-03 | AC-18 | `POST /api/tickets` no `X-Requester-Id` | `401`, generic message, no `details` key | `server/tests/lab-02/create-ticket.api.test.ts` (integration; unit-level middleware coverage in `requester-middleware.api.test.ts`, MW-03) |
| API-04 | AC-18 | `POST /api/tickets` malformed header (`X-Requester-Id: abc`) | `400` (not `401`); response has no `details` key (distinguishes from API-02's validation-400 shape) | `server/tests/lab-02/create-ticket.api.test.ts` (integration; unit-level middleware coverage in `requester-middleware.api.test.ts`, MW-04) |
| API-05 | AC-18 | `POST /api/tickets` header referencing an inactive Requester | `401` | `server/tests/lab-02/create-ticket.api.test.ts` (integration; unit-level middleware coverage in `requester-middleware.api.test.ts`, MW-05) |
| API-06 | AC-10 | `GET /api/tickets` ownership scoping | Only rows where `requesterId` matches the header are returned, regardless of how many total tickets exist in the DB | `server/tests/lab-02/my-tickets.api.test.ts` |
| API-07 | AC-11 | `GET /api/tickets` sorting | `sortBy=requestedPriority&sortOrder=asc` returns rows in the correct order | `server/tests/lab-02/my-tickets.api.test.ts` |
| API-08 | AC-12 | `GET /api/tickets` pagination clamping | `page=9999` returns the last valid page, not an error or empty array | `server/tests/lab-02/my-tickets.api.test.ts` |
| API-09 | AC-10 | `GET /api/tickets` search | Case-insensitive partial search matches both Summary text and Ticket Number | `server/tests/lab-02/my-tickets.api.test.ts` |
| API-10 | AC-08 | `GET /api/tickets/:id` cross-Requester access | `403`, no ticket fields present in the body | `server/tests/lab-02/ticket-detail.api.test.ts` |
| API-11 | — | `GET /api/tickets/:id` nonexistent ID | `404` | `server/tests/lab-02/ticket-detail.api.test.ts` |
| API-12 | AC-09 | `GET /api/tickets/:id` owned ticket | `200`; body includes full `attachments` array | `server/tests/lab-02/ticket-detail.api.test.ts` |
| API-13 | BR-07 | `POST /api/tickets/:id/attachments` oversized file | `400`, `details.file` message | `server/tests/lab-02/attachments.api.test.ts` |
| API-14 | BR-07, BR-19 | `POST /api/tickets/:id/attachments` disallowed type or spoofed extension | `400`, `details.file` message | `server/tests/lab-02/attachments.api.test.ts` |
| API-15 | BR-07 | `POST /api/tickets/:id/attachments` 6th active file | `400`, "already has 5 active attachments" | `server/tests/lab-02/attachments.api.test.ts` |
| API-16 | AC-15 | `POST /api/tickets/:id/attachments` valid file | `201`; ticket's active count increments | `server/tests/lab-02/attachments.api.test.ts` |
| API-17 | AC-16 | `DELETE /api/attachments/:id` valid removal | `200`; `removedAt`/`removalReason` set; row still exists | `server/tests/lab-02/attachments.api.test.ts` |
| API-18 | — | `DELETE /api/attachments/:id` already removed | `409` | `server/tests/lab-02/attachments.api.test.ts` |
| API-19 | AC-17 | `GET /api/attachments/:id/download` on a removed file | `410`, no binary body | `server/tests/lab-02/attachments.api.test.ts` |
| API-20 | AC-08 | `GET /api/attachments/:id/download` cross-Requester | `403` | `server/tests/lab-02/attachments.api.test.ts` |
| API-21 | — | `POST /api/tickets` ticket-number retries exhausted (mocked collision) | `500`, generic message | `server/tests/lab-02/create-ticket.api.test.ts` |
| API-22 | — | `GET /api/tickets` unsupported query parameters (`sortBy`, `sortOrder`, `limit`, `page`, `categoryId`, `requestedPriority`, `itPriority`, `status`) | `400`, `details` key present | `server/tests/lab-02/my-tickets.api.test.ts` |
| API-23 | AC-08 | `POST /api/tickets/:id/attachments` cross-Requester upload attempt | `403` | `server/tests/lab-02/attachments.api.test.ts` |
| API-24 | — | `DELETE /api/attachments/:id` missing/short `removalReason` | `400`, `details.removalReason` | `server/tests/lab-02/attachments.api.test.ts` |
| API-25 | AC-08 | `DELETE /api/attachments/:id` cross-Requester removal attempt | `403` | `server/tests/lab-02/attachments.api.test.ts` |
| API-26 | BR-05 | `GET /api/requesters/active` active/empty/failure behavior | `200` contains only active Requesters in deterministic order; no active rows returns `[]`; DB failure returns the documented safe `500` body | `server/tests/lab-02/requesters.api.test.ts` |
| API-27 | FR-04 | `GET /api/categories` and `GET /api/related-systems` | `200`; only active seeded reference rows are returned for the Create Ticket dropdowns | `server/tests/lab-02/reference-data.api.test.ts` |
| API-28 | AC-18, BR-06 | `POST /api/tickets` unknown Requester ID | `401`, generic message, no `details` key; middleware-level equivalent is MW-06 | `server/tests/lab-02/create-ticket.api.test.ts` |
| API-29 | AC-04 | `POST /api/tickets` nonexistent/inactive Category or Related System | `400`; `details.categoryId` and/or `details.relatedSystemId` identifies every invalid reference | `server/tests/lab-02/create-ticket.api.test.ts` |
| API-30 | AC-10 | `GET /api/tickets` filters | Category, Requested Priority, IT Priority, and Status work independently and in combination without exposing another Requester's rows | `server/tests/lab-02/my-tickets.api.test.ts` |
| API-31 | AC-11, AC-12; BR-12 | `GET /api/tickets` default order and pagination metadata | Default order is `createdAt desc, id desc`; supported page sizes return correct `currentPage`, `pageSize`, `totalItems`, and `totalPages` | `server/tests/lab-02/my-tickets.api.test.ts` |
| API-32 | AC-21 | `GET /api/attachments/:id/download` owned active file | `200`; bytes match the stored file; `Content-Type` and attachment `Content-Disposition` use the documented values/original filename | `server/tests/lab-02/attachments.api.test.ts` |
| API-33 | API contract missing-resource behavior | Missing Ticket/Attachment IDs on upload, download, and removal | Each endpoint returns `404` with its documented flat error body | `server/tests/lab-02/attachments.api.test.ts` |
| API-34 | BR-18 | Attachment storage failure after ticket creation | Upload returns safe `500`; the already-created Ticket remains retrievable with the same Ticket Number and the failed file has no active metadata row | `server/tests/lab-02/attachments.api.test.ts` |
| API-35 | AC-08, AC-18; BR-04, BR-06 | Ownership & Requester Context hardening pass across all Requester-scoped endpoints | Exhaustively tests every Requester-scoped endpoint (`GET /api/tickets`, `GET /api/tickets/:id`, `POST /api/tickets/:id/attachments`, `GET /api/attachments/:id/download`, `DELETE /api/attachments/:id`) for missing (401), malformed (400), inactive (401), and unknown (401) headers, and verifies that cross-requester access is blocked with 403 Forbidden, while requesterId in request body is ignored in favor of header context and creates ticket with 201 Created | `server/tests/lab-02/ownership-hardening.api.test.ts` |

Middleware-level tests are fast Phase 2 coverage of the shared guard. API-03/04/05/28 remain
required Phase 3 integration tests against the real ticket endpoint.

| Test ID | AC / BR | Scope | Expected Result | File |
|---|---|---|---|---|
| MW-03 | AC-18, BR-06 | Missing `X-Requester-Id` | `401`, exact generic error body, no `details` | `server/tests/lab-02/requester-middleware.api.test.ts` |
| MW-04 | AC-18, BR-06 | Malformed/non-positive `X-Requester-Id` | `400`, exact malformed-header error body, no `details` | `server/tests/lab-02/requester-middleware.api.test.ts` |
| MW-05 | AC-18, BR-06 | Inactive Requester | `401`, exact generic error body, no `details` | `server/tests/lab-02/requester-middleware.api.test.ts` |
| MW-06 | AC-18, BR-06 | Unknown Requester ID | `401`, exact generic error body, no `details` | `server/tests/lab-02/requester-middleware.api.test.ts` |

## 5. Planned Tests — UI Component

| Test ID | AC | Scope | Expected Result | File |
|---|---|---|---|---|
| UI-01 | AC-04 | Submit Create Ticket with empty required fields | Red message renders under Summary and Description; API mock is never called | `client/tests/lab-02/CreateTicket.test.tsx` |
| UI-02 | AC-06 | Submit button state during a pending mock request | Button shows busy label and `disabled` attribute is `true` | `client/tests/lab-02/CreateTicket.test.tsx` |
| UI-03 | AC-07 | Mocked API failure on submit | Failure banner renders; all field values remain in the DOM unchanged | `client/tests/lab-02/CreateTicket.test.tsx` |
| UI-04 | AC-05, BR-07 | Selecting an oversized/invalid-type file or exceeding 5 staged files | Inline error renders next to the rejected file; no upload call is made; the file is not added to the staged list | `client/tests/lab-02/CreateTicket.test.tsx` |
| UI-05 | AC-14 | My Tickets with zero total tickets vs. zero filtered tickets | Renders Empty State (`Create First Ticket`) in the first case, No-Results State (`Clear Filters`) in the second — different copy/icon/action in each | `client/tests/lab-02/MyTickets.test.tsx` |
| UI-06 | AC-13 | Switching the mocked Requester context | Previously rendered rows from Requester A are gone from the DOM before Requester B's rows appear (no flash of stale data) | `client/tests/lab-02/MyTickets.test.tsx` |
| UI-07 | AC-09, BR-16, BR-17 | Requester Ticket Detail field rendering | Every ticket field is read-only/static; IT Priority is read-only and a null owner displays `Unassigned` | `client/tests/lab-02/RequesterTicketDetail.test.tsx` |
| UI-08 | AC-16 | Soft-removed attachment presentation | Filename has strikethrough styling, removal reason text is present, no Download button in the DOM for that row | `client/tests/lab-02/AttachmentSection.test.tsx` |
| UI-09 | BR-07 | Attachment counter | Shows `(X/5 Active)` and disables the file picker once 5 active attachments are staged/present | `client/tests/lab-02/AttachmentSection.test.tsx` |
| UI-10 | AC-02 | Route guard with no Requester in context | Navigating to My Tickets or Create Ticket redirects to Requester Selection | `client/tests/lab-02/RouteGuard.test.tsx` |
| UI-11 | BR-03, BR-05 | Requester Selection states and disclaimer | Shows testing-only/not-login text, loading, active options, empty, failure, retry, and disabled/valid Continue behavior | `client/tests/lab-02/RequesterSelection.test.tsx` |
| UI-12 | AC-03, AC-04 | Create Ticket initial/reference-data states | System fields are read-only; reference controls show loading and a safe API-failure state without losing entered values | `client/tests/lab-02/CreateTicket.test.tsx` |
| UI-13 | AC-01, AC-03 | Create Ticket success | Success displays the backend-issued Ticket Number and Ticket Date and retains the selected Requester identity | `client/tests/lab-02/CreateTicket.test.tsx` |
| UI-14 | AC-10, AC-11, AC-12 | My Tickets controls and network states | Loading/failure states render safely; search, filters, sort, clear, page, and page-size actions issue the documented query | `client/tests/lab-02/MyTickets.test.tsx` |
| UI-15 | AC-08, AC-09 | Ticket Detail loading/access/failure states | Loading, `403`, `404`, and unexpected failures render safe UI; owned data renders read-only | `client/tests/lab-02/RequesterTicketDetail.test.tsx` |
| UI-16 | AC-16, AC-17 | Attachment uploading/unavailable states | Uploading shows progress with no actions; removed or server-`410` files show Unavailable with no Download action | `client/tests/lab-02/AttachmentSection.test.tsx` |
| UI-17 | FR-03 | App shell navigation and Change Requester | Active page is indicated, Requester identity is visible, and Change clears the current context | `client/tests/lab-02/AppShell.test.tsx` |
| UI-18 | AC-07, BR-18 | Post-create attachment failure | A per-file upload failure preserves the successfully created Ticket/Ticket Number and reports only the failed file with a retry path | `client/tests/lab-02/CreateTicket.test.tsx` |

## 6. Planned Tests — UI Style

| Test ID | Scope | Expected Result | File |
|---|---|---|---|
| STYLE-01 | Zen Green color tokens on Create Ticket | Computed background/text colors match the tokens in `ui-spec.md` Section 1.1 | `client/tests/lab-02/CreateTicket.test.tsx` |
| STYLE-02 | Status/Priority badges | Each badge's accessible text includes both the label word and is not conveyed by background color alone (queried by text, not by color) | `client/tests/lab-02/MyTickets.test.tsx` |
| STYLE-03 | Read-only vs. editable field contrast | Read-only fields render with `--zg-readonly-bg`; editable fields render with white background | `client/tests/lab-02/RequesterTicketDetail.test.tsx` |
| STYLE-04 | Focus indicator | Tabbing to any interactive control shows a visible focus outline (non-zero `outline`/box-shadow) | `client/tests/lab-02/CreateTicket.test.tsx` |

## 7. Planned Tests — Responsive

| Test ID | AC | Scope | Expected Result | File |
|---|---|---|---|---|
| RESP-01 | AC-19 | My Tickets at `<768px` | Table is replaced by a card list; buttons full width; touch target ≥ 44px; no horizontal scrollbar on the page | `e2e/lab-02/requester-ticket-flow.spec.ts` |
| RESP-02 | AC-19 | Create Ticket at `768–991px` | Two-column layout for classification fields; Summary/Description remain full width; compact table visible in My Tickets | `e2e/lab-02/requester-ticket-flow.spec.ts` |
| RESP-03 | AC-19 | All three screens at `≥992px` | Content centers with a max width of `1200px`; exact left/right margin centering; no clipped labels/text; long summary and attachment ellipsis verified | `e2e/lab-02/requester-ticket-flow.spec.ts` |

### Visual Inspection Screenshots (`ui-spec.md` Section 8 & 11)

| Viewport Breakpoint | Create Ticket Screen | My Tickets Screen | Requester Ticket Detail Screen |
|---|---|---|---|
| **Desktop (`≥992px`, 1280x800)** | [`artifacts/lab-02/screenshots/create-ticket/desktop.png`](../../artifacts/lab-02/screenshots/create-ticket/desktop.png) | [`artifacts/lab-02/screenshots/my-tickets/desktop.png`](../../artifacts/lab-02/screenshots/my-tickets/desktop.png) | [`artifacts/lab-02/screenshots/ticket-detail/desktop.png`](../../artifacts/lab-02/screenshots/ticket-detail/desktop.png) |
| **Tablet (`768–991px`, 768x1024)** | [`artifacts/lab-02/screenshots/create-ticket/tablet.png`](../../artifacts/lab-02/screenshots/create-ticket/tablet.png) | [`artifacts/lab-02/screenshots/my-tickets/tablet.png`](../../artifacts/lab-02/screenshots/my-tickets/tablet.png) | [`artifacts/lab-02/screenshots/ticket-detail/tablet.png`](../../artifacts/lab-02/screenshots/ticket-detail/tablet.png) |
| **Mobile (`<768px`, 375x667)** | [`artifacts/lab-02/screenshots/create-ticket/mobile.png`](../../artifacts/lab-02/screenshots/create-ticket/mobile.png) | [`artifacts/lab-02/screenshots/my-tickets/mobile.png`](../../artifacts/lab-02/screenshots/my-tickets/mobile.png) | [`artifacts/lab-02/screenshots/ticket-detail/mobile.png`](../../artifacts/lab-02/screenshots/ticket-detail/mobile.png) |


## 8. Planned Tests — End-to-End

| Test ID | AC | Scope | Expected Result | File |
|---|---|---|---|---|
| E2E-01 | AC-01, AC-02, AC-03, AC-13 | Full happy path: select Requester → verify read-only system/Requester fields → create ticket → find it in My Tickets → switch Requester → confirm it's gone | Ticket Number and Ticket Date are system-issued/read-only; Requester matches the selected identity and saved `requesterId`; ticket appears only for its owner; screenshots captured at each step | `e2e/lab-02/requester-ticket-flow.spec.ts` |
| E2E-02 | AC-07 | Simulated backend failure during ticket submission | Safe failure state shown; form values still present on screen after the failed attempt | `e2e/lab-02/requester-ticket-flow.spec.ts` |
| E2E-03 | AC-08, AC-17 | Negative flow: attempt to open another Requester's ticket URL directly, and attempt to download a removed attachment's URL directly | Both attempts are blocked (`403` / `410` surfaced as a safe UI message, not a raw JSON dump or a crash) | `e2e/lab-02/requester-ticket-flow.spec.ts` |

### End-to-End Flow Screenshots (`artifacts/lab-02/screenshots/e2e/`)

| Step / Scenario | Desktop (`≥992px`) | Tablet (`768–991px`) | Mobile (`<768px`) |
|---|---|---|---|
| 01. Select Requester (Route Guard) | [`01-select-requester-desktop.png`](../../artifacts/lab-02/screenshots/e2e/01-select-requester-desktop.png) | [`01-select-requester-tablet.png`](../../artifacts/lab-02/screenshots/e2e/01-select-requester-tablet.png) | [`01-select-requester-mobile.png`](../../artifacts/lab-02/screenshots/e2e/01-select-requester-mobile.png) |
| 02. Create Ticket Form (Read-only Fields) | [`02-create-ticket-form-desktop.png`](../../artifacts/lab-02/screenshots/e2e/02-create-ticket-form-desktop.png) | [`02-create-ticket-form-tablet.png`](../../artifacts/lab-02/screenshots/e2e/02-create-ticket-form-tablet.png) | [`02-create-ticket-form-mobile.png`](../../artifacts/lab-02/screenshots/e2e/02-create-ticket-form-mobile.png) |
| 03. Ticket Created Success Screen | [`03-ticket-created-success-desktop.png`](../../artifacts/lab-02/screenshots/e2e/03-ticket-created-success-desktop.png) | [`03-ticket-created-success-tablet.png`](../../artifacts/lab-02/screenshots/e2e/03-ticket-created-success-tablet.png) | [`03-ticket-created-success-mobile.png`](../../artifacts/lab-02/screenshots/e2e/03-ticket-created-success-mobile.png) |
| 04. My Tickets (Owner Ticket Present) | [`04-my-tickets-owner-desktop.png`](../../artifacts/lab-02/screenshots/e2e/04-my-tickets-owner-desktop.png) | [`04-my-tickets-owner-tablet.png`](../../artifacts/lab-02/screenshots/e2e/04-my-tickets-owner-tablet.png) | [`04-my-tickets-owner-mobile.png`](../../artifacts/lab-02/screenshots/e2e/04-my-tickets-owner-mobile.png) |
| 05. Switched Requester (Original Ticket Gone) | [`05-switched-requester-desktop.png`](../../artifacts/lab-02/screenshots/e2e/05-switched-requester-desktop.png) | [`05-switched-requester-tablet.png`](../../artifacts/lab-02/screenshots/e2e/05-switched-requester-tablet.png) | [`05-switched-requester-mobile.png`](../../artifacts/lab-02/screenshots/e2e/05-switched-requester-mobile.png) |
| 06. Backend 500 Failure (Form Retention) | [`06-backend-failure-retained-desktop.png`](../../artifacts/lab-02/screenshots/e2e/06-backend-failure-retained-desktop.png) | [`06-backend-failure-retained-tablet.png`](../../artifacts/lab-02/screenshots/e2e/06-backend-failure-retained-tablet.png) | [`06-backend-failure-retained-mobile.png`](../../artifacts/lab-02/screenshots/e2e/06-backend-failure-retained-mobile.png) |
| 07. Cross-Requester Direct URL (403 Access Denied) | [`07-cross-requester-403-desktop.png`](../../artifacts/lab-02/screenshots/e2e/07-cross-requester-403-desktop.png) | [`07-cross-requester-403-tablet.png`](../../artifacts/lab-02/screenshots/e2e/07-cross-requester-403-tablet.png) | [`07-cross-requester-403-mobile.png`](../../artifacts/lab-02/screenshots/e2e/07-cross-requester-403-mobile.png) |
| 08. Removed Attachment Download (410 Gone) | [`08-removed-attachment-410-desktop.png`](../../artifacts/lab-02/screenshots/e2e/08-removed-attachment-410-desktop.png) | [`08-removed-attachment-410-tablet.png`](../../artifacts/lab-02/screenshots/e2e/08-removed-attachment-410-tablet.png) | [`08-removed-attachment-410-mobile.png`](../../artifacts/lab-02/screenshots/e2e/08-removed-attachment-410-mobile.png) |

---

## 9. Acceptance-Criterion Traceability Matrix

| AC | Description | Test IDs |
|---|---|---|
| AC-01 | Create Ticket happy path | API-01, UI-13, E2E-01 |
| AC-02 | Dev Requester route guard | UI-10, E2E-01 |
| AC-03 | System fields are read-only; Requester matches saved `requesterId` | API-01, UI-12, E2E-01 |
| AC-04 | Field-level validation | API-02, UI-01 |
| AC-05 | Attachment client-side rejection | UI-04 |
| AC-06 | Duplicate-submit prevention (busy button) | UI-02 |
| AC-07 | API failure retains form data | UI-03, UI-18, E2E-02 |
| AC-08 | Ownership protection on detail/attachments | API-10, API-20, API-23, API-25, API-35, UI-15, E2E-03 |
| AC-09 | Ticket Detail fully read-only | API-12, UI-07, UI-15 |
| AC-10 | Search & filtering | API-06, API-09, API-30, UI-14 |
| AC-11 | Sorting | API-07, API-31, UI-14 |
| AC-12 | Pagination & boundary clamping | API-08, API-31, UI-14 |
| AC-13 | Requester switching clears stale data | UI-06, E2E-01 |
| AC-14 | Empty vs. No-Results states | UI-05 |
| AC-15 | Add attachment to an existing ticket | API-16 |
| AC-16 | Soft-removal lifecycle | API-17, UI-08, UI-16 |
| AC-17 | Blocked download of removed attachment | API-19, UI-16, E2E-03 |
| AC-18 | Invalid/inactive/unknown Requester rejected | API-03, API-04, API-05, API-28, API-35, MW-03, MW-04, MW-05, MW-06 |
| AC-19 | Responsive layout | RESP-01, RESP-02, RESP-03 |
| AC-20 | Non-color badge accessibility, focus visibility | STYLE-02, STYLE-04 |
| AC-21 | Download an owned active attachment | API-32 |

Every AC maps to at least one test, and every test above maps to a real file path, per the
labsheet's Test-DD requirement.

## 10. Business-Rule Coverage Cross-Check

| BR | Covered by |
|---|---|
| BR-01 (ticket number format/uniqueness/retry) | UNIT-01, UNIT-02, API-01, API-21 |
| BR-02 (new Ticket starts NEW) | API-01 |
| BR-03 (selector is testing only) | UI-11 |
| BR-04 (ownership) | API-06, API-10, API-20, API-23, API-25, API-30, API-35, UI-15, E2E-03 |
| BR-05 (active Requesters only) | DATA-02, API-26, UI-11 |
| BR-06 (Requester header validation) | MW-03, MW-04, MW-05, MW-06 (middleware-level), API-03, API-04, API-05, API-28, API-35 (endpoint-level) |
| BR-07 (attachment constraints) | API-13, API-14, API-15, UI-04, UI-09 |
| BR-08 (soft-removal blocks download) | API-17, API-18, API-19, API-24, UI-08, UI-16 |
| BR-09 (trim + length validation) | UNIT-03, API-02 |
| BR-10 (duplicate-submit prevention) | UI-02 |
| BR-11 (data retention on failure) | UI-03, E2E-02 |
| BR-12 (query/sort/pagination standard) | UNIT-06, API-07, API-08, API-22, API-31, UI-14 |
| BR-13 (empty vs. no-results) | UI-05 |
| BR-14 (Requester-switch invalidation) | UI-06, E2E-01 |
| BR-15 (Requester foreign key) | DATA-01 |
| BR-16 (IT Priority default/read-only) | API-01, UI-07 |
| BR-17 (Ticket Owner null/Unassigned) | API-01, UI-07 |
| BR-18 (ticket/attachment transaction independence) | API-34, UI-18 |
| BR-19 (safe filename policy) | UNIT-04, UNIT-05, API-14 |

## 11. Known Limitations / Deferred Tests

- BR-18 is tested deterministically by injecting/mocking the storage write failure in API-34. A
  manual read-only-directory demonstration is optional supplemental evidence; it must not replace
  the automated assertion that the already-created Ticket remains retrievable.
- Concurrency testing for the ticket-number collision retry (BR-01, UNIT-02) uses a mocked
  ticket-create callback to raise Prisma's `P2002` for `ticketNo` after each generated candidate,
  rather than a real race condition, since reliably triggering a real race in a test suite is
  flaky by nature. Non-collision database errors are also verified to fail immediately.

## 12. Final Results

Fill in after the final `main`-branch test run:

| Command | Result |
|---|---|
| `npm --prefix server run test` | _pending_ |
| `npm --prefix client run test` | _pending_ |
| `npx playwright test` | _pending_ |
