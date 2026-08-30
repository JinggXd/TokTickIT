# Lab 2 Test Plan and Results

Companion to `docs/lab-02/specification.md` and `docs/lab-02/api-spec.md`. Written and approved
**before** implementation (Test-DD, labsheet Section 9) — the coding agent must make these tests
fail first, then implement the smallest correct behavior to turn them green (TDD).

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

## 4. Planned Tests — API

| Test ID | AC | Scope | Expected Result | File |
|---|---|---|---|---|
| API-01 | AC-01 | `POST /api/tickets` valid data | `201`; response matches `api-spec.md` Section 6.4 shape; `ticketNo` matches `TKT-YYYY-XXXXXX` | `server/tests/lab-02/create-ticket.api.test.ts` |
| API-02 | AC-04 | `POST /api/tickets` missing/short fields | `400`; `details` object names every invalid field in one response | `server/tests/lab-02/create-ticket.api.test.ts` |
| API-03 | AC-18 | `POST /api/tickets` no `X-Requester-Id` | `401`, generic message, no `details` key | `server/tests/lab-02/create-ticket.api.test.ts` |
| API-04 | AC-18 | `POST /api/tickets` malformed header (`X-Requester-Id: abc`) | `400` (not `401`) | `server/tests/lab-02/create-ticket.api.test.ts` |
| API-05 | AC-18 | `POST /api/tickets` header referencing an inactive Requester | `401` | `server/tests/lab-02/create-ticket.api.test.ts` |
| API-06 | AC-10 | `GET /api/tickets` ownership scoping | Only rows where `requesterId` matches the header are returned, regardless of how many total tickets exist in the DB | `server/tests/lab-02/my-tickets.api.test.ts` |
| API-07 | AC-11 | `GET /api/tickets` sorting | `sortBy=requestedPriority&sortOrder=asc` returns rows in the correct order | `server/tests/lab-02/my-tickets.api.test.ts` |
| API-08 | AC-12 | `GET /api/tickets` pagination clamping | `page=9999` returns the last valid page, not an error or empty array | `server/tests/lab-02/my-tickets.api.test.ts` |
| API-09 | AC-10 | `GET /api/tickets` search | `search=battery` matches Summary substring case-insensitively | `server/tests/lab-02/my-tickets.api.test.ts` |
| API-10 | AC-08 | `GET /api/tickets/:id` cross-Requester access | `403`, no ticket fields present in the body | `server/tests/lab-02/ticket-detail.api.test.ts` |
| API-11 | — | `GET /api/tickets/:id` nonexistent ID | `404` | `server/tests/lab-02/ticket-detail.api.test.ts` |
| API-12 | AC-09 | `GET /api/tickets/:id` owned ticket | `200`; body includes full `attachments` array | `server/tests/lab-02/ticket-detail.api.test.ts` |
| API-13 | AC-05 | `POST /api/tickets/:id/attachments` oversized file | `400`, `details.file` message | `server/tests/lab-02/attachments.api.test.ts` |
| API-14 | AC-05 | `POST /api/tickets/:id/attachments` disallowed type | `400`, `details.file` message | `server/tests/lab-02/attachments.api.test.ts` |
| API-15 | BR-07 | `POST /api/tickets/:id/attachments` 6th active file | `400`, "already has 5 active attachments" | `server/tests/lab-02/attachments.api.test.ts` |
| API-16 | AC-15 | `POST /api/tickets/:id/attachments` valid file | `201`; ticket's active count increments | `server/tests/lab-02/attachments.api.test.ts` |
| API-17 | AC-16 | `DELETE /api/attachments/:id` valid removal | `200`; `removedAt`/`removalReason` set; row still exists | `server/tests/lab-02/attachments.api.test.ts` |
| API-18 | — | `DELETE /api/attachments/:id` already removed | `409` | `server/tests/lab-02/attachments.api.test.ts` |
| API-19 | AC-17 | `GET /api/attachments/:id/download` on a removed file | `410`, no binary body | `server/tests/lab-02/attachments.api.test.ts` |
| API-20 | AC-08 | `GET /api/attachments/:id/download` cross-Requester | `403` | `server/tests/lab-02/attachments.api.test.ts` |

## 5. Planned Tests — UI Component

| Test ID | AC | Scope | Expected Result | File |
|---|---|---|---|---|
| UI-01 | AC-04 | Submit Create Ticket with empty required fields | Red message renders under Summary and Description; API mock is never called | `client/.../lab-02 tests/CreateTicket.test.tsx` |
| UI-02 | AC-06 | Submit button state during a pending mock request | Button shows busy label and `disabled` attribute is `true` | `client/.../lab-02 tests/CreateTicket.test.tsx` |
| UI-03 | AC-07 | Mocked API failure on submit | Failure banner renders; all field values remain in the DOM unchanged | `client/.../lab-02 tests/CreateTicket.test.tsx` |
| UI-04 | AC-05 | Selecting an oversized/invalid-type file | Inline error renders next to the file; no upload call is made; file is not added to the staged list | `client/.../lab-02 tests/CreateTicket.test.tsx` |
| UI-05 | AC-14 | My Tickets with zero total tickets vs. zero filtered tickets | Renders Empty State (`Create First Ticket`) in the first case, No-Results State (`Clear Filters`) in the second — different copy/icon/action in each | `client/.../lab-02 tests/MyTickets.test.tsx` |
| UI-06 | AC-13 | Switching the mocked Requester context | Previously rendered rows from Requester A are gone from the DOM before Requester B's rows appear (no flash of stale data) | `client/.../lab-02 tests/MyTickets.test.tsx` |
| UI-07 | AC-09 | Requester Ticket Detail field rendering | Every header field's control has `readOnly` (or is rendered as static text, not an input) | `client/.../lab-02 tests/RequesterTicketDetail.test.tsx` |
| UI-08 | AC-16 | Soft-removed attachment presentation | Filename has strikethrough styling, removal reason text is present, no Download button in the DOM for that row | `client/.../lab-02 tests/AttachmentSection.test.tsx` |
| UI-09 | BR-07 | Attachment counter | Shows `(X/5 Active)` and disables the file picker once 5 active attachments are staged/present | `client/.../lab-02 tests/AttachmentSection.test.tsx` |
| UI-10 | AC-02 | Route guard with no Requester in context | Navigating to My Tickets or Create Ticket redirects to Requester Selection | `client/.../lab-02 tests/RouteGuard.test.tsx` |

## 6. Planned Tests — UI Style

| Test ID | Scope | Expected Result | File |
|---|---|---|---|
| STYLE-01 | Zen Green color tokens on Create Ticket | Computed background/text colors match the tokens in `ui-spec.md` Section 1.1 | `client/.../lab-02 tests/CreateTicket.test.tsx` |
| STYLE-02 | Status/Priority badges | Each badge's accessible text includes both the label word and is not conveyed by background color alone (queried by text, not by color) | `client/.../lab-02 tests/MyTickets.test.tsx` |
| STYLE-03 | Read-only vs. editable field contrast | Read-only fields render with `--zg-readonly-bg`; editable fields render with white background | `client/.../lab-02 tests/RequesterTicketDetail.test.tsx` |
| STYLE-04 | Focus indicator | Tabbing to any interactive control shows a visible focus outline (non-zero `outline`/box-shadow) | `client/.../lab-02 tests/CreateTicket.test.tsx` |

## 7. Planned Tests — Responsive

| Test ID | AC | Scope | Expected Result | File |
|---|---|---|---|---|
| RESP-01 | AC-19 | My Tickets at `<768px` | Table is replaced by a card list; no horizontal scrollbar on the page | `e2e/lab-02/requester-ticket-flow.spec.ts` |
| RESP-02 | AC-19 | Create Ticket at `768–991px` | Two-column layout for classification fields; Summary/Description remain full width | `e2e/lab-02/requester-ticket-flow.spec.ts` |
| RESP-03 | AC-19 | All three screens at `≥992px` | Content centers with a max width of `1200px`; no clipped labels | `e2e/lab-02/requester-ticket-flow.spec.ts` |

## 8. Planned Tests — End-to-End

| Test ID | AC | Scope | Expected Result | File |
|---|---|---|---|---|
| E2E-01 | AC-01, AC-02, AC-13 | Full happy path: select Requester → create ticket → find it in My Tickets → switch Requester → confirm it's gone | Ticket Number visible after creation; ticket appears in the list for its owner; disappears after switching to another Requester; screenshots captured at each step | `e2e/lab-02/requester-ticket-flow.spec.ts` |
| E2E-02 | AC-07 | Simulated backend failure during ticket submission | Safe failure state shown; form values still present on screen after the failed attempt | `e2e/lab-02/requester-ticket-flow.spec.ts` |
| E2E-03 | AC-08, AC-17 | Negative flow: attempt to open another Requester's ticket URL directly, and attempt to download a removed attachment's URL directly | Both attempts are blocked (`403` / `410` surfaced as a safe UI message, not a raw JSON dump or a crash) | `e2e/lab-02/requester-ticket-flow.spec.ts` |

---

## 9. Acceptance-Criterion Traceability Matrix

| AC | Description | Test IDs |
|---|---|---|
| AC-01 | Create Ticket happy path | API-01, E2E-01 |
| AC-02 | Dev Requester route guard | UI-10, E2E-01 |
| AC-03 | Requester field matches saved `requesterId` | API-01 |
| AC-04 | Field-level validation | API-02, UI-01 |
| AC-05 | Attachment client-side rejection | API-13, API-14, UI-04 |
| AC-06 | Duplicate-submit prevention (busy button) | UI-02 |
| AC-07 | API failure retains form data | UI-03, E2E-02 |
| AC-08 | Ownership protection on detail/attachments | API-10, API-20, E2E-03 |
| AC-09 | Ticket Detail fully read-only | API-12, UI-07 |
| AC-10 | Search & filtering | API-06, API-09 |
| AC-11 | Sorting | API-07 |
| AC-12 | Pagination & boundary clamping | API-08 |
| AC-13 | Requester switching clears stale data | UI-06, E2E-01 |
| AC-14 | Empty vs. No-Results states | UI-05 |
| AC-15 | Add attachment to existing ticket | API-16 |
| AC-16 | Soft-removal lifecycle | API-17, UI-08 |
| AC-17 | Blocked download of removed attachment | API-19, E2E-03 |
| AC-18 | Invalid/inactive Requester rejected | API-03, API-04, API-05 |
| AC-19 | Responsive layout | RESP-01, RESP-02, RESP-03 |
| AC-20 | Non-color badge accessibility, focus visibility | STYLE-02, STYLE-04 |

Every AC maps to at least one test, and every test above maps to a real file path, per the
labsheet's Test-DD requirement.

## 10. Business-Rule Coverage Cross-Check

| BR | Covered by |
|---|---|
| BR-01 (ticket number format/uniqueness/retry) | UNIT-01, UNIT-02, API-01 |
| BR-04 (ownership) | API-10, API-20, E2E-03 |
| BR-06 (Requester header validation) | API-03, API-04, API-05 |
| BR-07 (attachment constraints) | API-13, API-14, API-15, UI-09 |
| BR-08 (soft-removal blocks download) | API-19 |
| BR-09 (trim + length validation) | UNIT-03, API-02 |
| BR-10 (duplicate-submit prevention) | UI-02 |
| BR-11 (data retention on failure) | UI-03, E2E-02 |
| BR-12 (query/sort/pagination standard) | UNIT-06, API-07, API-08 |
| BR-13 (empty vs. no-results) | UI-05 |
| BR-14 (Requester-switch invalidation) | UI-06, E2E-01 |
| BR-18 (ticket/attachment transaction independence) | API-16 (manual/documented — see Section 11) |
| BR-19 (safe filename policy) | UNIT-04, UNIT-05 |

## 11. Known Limitations / Deferred Tests

- Simulating a genuine filesystem write failure for BR-18 (attachment upload fails after the
  ticket already committed) is environment-dependent; document a manual test procedure
  (temporarily point the upload directory at a read-only path) if it isn't feasible to automate in
  CI, and note the manual result here.
- Concurrency testing for the ticket-number collision retry (BR-01, UNIT-02) uses a mocked
  Prisma client to force a unique-constraint error rather than a real race condition, since
  reliably triggering a real race in a test suite is flaky by nature.

## 12. Final Results

Fill in after the final `main`-branch test run:

| Command | Result |
|---|---|
| `npm --prefix server run test` | _pending_ |
| `npm --prefix client run test` | _pending_ |
| `npx playwright test` | _pending_ |
