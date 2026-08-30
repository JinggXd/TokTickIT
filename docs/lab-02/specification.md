# Lab 2 Sprint Engineering Specification
**Course:** CPE 334 — Introduction to Software Engineering in the Age of AI Agents
**Project:** TokTickIT — Requester Ticketing MVP with UI Foundation
**Branch flow:** `feature/*` → `lab2-staging` → `main`
**Status:** Draft for approval before implementation (Spec-Driven Development, Section 8.9 of the labsheet)

> This document is the engineering contract for Lab 2. It is deliberately more explicit than the
> handout in places (exact status codes, exact validation limits, exact defaults) because the
> handout leaves many decisions to the student. Every place a decision was made that the handout
> did not fix is recorded in **Section 11 — Assumptions and Decisions** so it can be defended to a
> grader or a reviewer.

---

## 1. Sprint Goal

Deliver a Requester-facing IT ticketing MVP, styled in the Zen Green theme, that lets a person
simulate being logged in as one of several seeded Development Requesters, submit a support ticket
with optional file attachments, and then find, review, and manage the attachments on their own
tickets only — with every read and write operation enforced against ticket ownership on the
backend, not just hidden in the UI.

## 2. Stakeholder Request Interpretation

IT wants a real intake channel for support requests before real login exists. In the student's own
words, the request breaks down into four promises to the Requester:

1. **"You can tell us what's wrong."** A responsive form to create a ticket with category, related
   system, priority, description, and evidence (attachments).
2. **"You'll get a receipt."** The backend hands back an official, unique Ticket Number the moment
   the ticket is saved — never a client-generated placeholder.
3. **"You can find it again."** A searchable, filterable, sortable, paginated list of *only your own*
   tickets, plus a read-only detail view.
4. **"Your stuff is yours."** No Requester can view, search into, download from, or delete another
   Requester's ticket or attachments — under any circumstance, including a forged or stale request.

Because real authentication is Lab 3 work, the "who is logged in" problem is solved with a
**Development Requester Selector**: a screen that stands in for login during testing only, and is
labeled as such everywhere it appears so nobody mistakes it for security.

## 3. Scope

### 3.1 Included
- Development Requester Selector: loads active Requesters from PostgreSQL, lets the tester pick
  one, stores the selection as the current testing context, and exposes a **Change Requester**
  action.
- Create Ticket: form with system-generated/read-only fields, required and optional inputs,
  client- and server-side validation, duplicate-submit prevention, optional attachments at
  creation time, and a success state showing the backend-issued Ticket Number.
- My Tickets: Requester-scoped list with search, multi-criteria filtering, sorting, pagination,
  desktop table / mobile card layouts, and distinct empty vs. no-results states.
- Requester Ticket Detail: fully read-only ticket header, plus an Attachment Management panel
  supporting add, download (active only), and soft-remove (with a required reason).
- Ownership isolation enforced in the backend for every read and write path — list scoping,
  detail retrieval, attachment upload, attachment download, and attachment removal.

### 3.2 Explicitly Excluded
- **Authentication & security** — real login/logout, password storage or hashing, sessions, JWTs,
  full role-based access control. The Development Requester selector is a *testing convenience*,
  never a security boundary against a determined attacker; it is deferred to Lab 3.
- **IT Staff workflow** — dashboard, queue, claim/reassign, IT Priority editing, Ticket Owner
  assignment.
- **Collaboration & lifecycle** — Public Comments, Internal Notes, Actions Taken, and any status
  transition beyond the initial `NEW` value.
- **Administration** — user, role, Category, or Related System management UI.

## 4. Functional Requirements

| ID | Requirement |
|---|---|
| FR-01 | The system loads and displays only **active** Development Requesters for selection. |
| FR-02 | The system lets the tester select a Development Requester, establishing it as the current Requester context for the rest of the session. |
| FR-03 | The system lets the tester switch to a different Development Requester at any time via a **Change Requester** action, which invalidates all previously loaded ticket data (see BR-14). |
| FR-04 | The system lets the current Requester create a new ticket by supplying Summary, Description, Category, Related System, Requested Priority, and (optionally) up to 5 attachments in the same submission. |
| FR-05 | On successful creation, the backend generates a unique, correctly formatted Ticket Number and returns it to the client; the client never invents or guesses this value. |
| FR-06 | The system retrieves and displays **only** the tickets owned by the current Requester in the My Tickets list. |
| FR-07 | The system lets the Requester search their own tickets by Ticket Number or Summary (case-insensitive, partial match). |
| FR-08 | The system lets the Requester filter their own tickets by Category, Requested Priority, IT Priority, and Current Status, independently and in combination. |
| FR-09 | The system lets the Requester sort their own tickets by a supported field, in either direction. |
| FR-10 | The system paginates the Requester's ticket list with a selectable page size and correct page metadata. |
| FR-11 | The system lets the Requester open a read-only Ticket Detail view for any ticket **they own**. |
| FR-12 | The system lets the Requester add a new attachment to an existing ticket they own, subject to the 5-active-file limit and file constraints. |
| FR-13 | The system lets the Requester download any of their own **active** (not removed) attachments. |
| FR-14 | The system lets the Requester soft-remove one of their own attachments by supplying a removal reason; the file becomes unavailable for preview/download but its metadata is retained. |
| FR-15 | The backend enforces ownership (`ticket.requesterId === current requester`) on every list, detail, upload, download, and removal operation, independent of what the UI allows the user to click. |

## 5. Business Rules

| ID | Rule |
|---|---|
| BR-01 | The official Ticket Number is generated by the backend in the format `TKT-YYYY-XXXXXX` (4-digit year, 6-digit zero-padded sequence) and must be globally unique. On the rare event of a unique-constraint collision (e.g., a race between two concurrent creations), the backend retries generation up to 3 times before returning `500`. |
| BR-02 | A newly created ticket always starts with `currentStatus = NEW`. No other initial value is valid. |
| BR-03 | The Development Requester Selector is a **testing mechanism only**. It must never be described, styled, or relied upon in tests as a secure authentication system. |
| BR-04 | **Ownership Protection.** A Requester may view, search, download from, or remove attachments from a ticket **only** if `ticket.requesterId` equals their own id. Any attempt to access another Requester's ticket or its attachments — whether through the UI, a hand-typed URL, or a direct API call — is rejected by the backend with `403 Forbidden` (see Section 11 for why `403` was chosen over `404`). |
| BR-05 | Only Development Requesters with `isActive = true` are shown in the selector dropdown. |
| BR-06 | **Backend Requester validation.** Every request that requires a Requester context must carry a valid `X-Requester-Id` header. The backend rejects the request with `401 Unauthorized` if the header is missing, refers to a Requester id that does not exist, or refers to a Requester whose `isActive` is `false` at the time of the request (covers the case where a Requester is deactivated mid-session). A header value that is not a positive integer is rejected with `400 Bad Request` instead, since that is a malformed request rather than an authentication failure. |
| BR-07 | **Attachment constraints.** Only `JPG`, `JPEG`, `PNG`, `WEBP`, and `PDF` files are accepted. Maximum size is 5 MB per file. A ticket may have at most 5 **active** (non-removed) attachments at any time; removed attachments do not count against this limit. |
| BR-08 | **Soft-removal.** Removing an attachment sets `removedAt` and `removalReason` and keeps the row (and the underlying file on disk) for audit purposes. A removed attachment is blocked from preview and download (`410 Gone`) but its filename, size, and removal reason remain visible in the UI. |
| BR-09 | **Form validation & trimming.** `Summary` must be 5–100 characters after trimming leading/trailing whitespace; `Description` must be 10–2000 characters after trimming. Both are required. Trimming happens before length validation and before persistence, on both client and server. |
| BR-10 | **Duplicate-submission prevention.** The Submit button becomes visually busy and is disabled the instant it is pressed, and stays disabled until the request settles (success or failure), so a slow network or an impatient double-click cannot create two tickets. |
| BR-11 | **Data retention on failure.** If ticket submission fails for any reason (validation error returned by the server, network failure, 5xx response), all values the Requester typed remain in the form. Nothing is cleared automatically. |
| BR-12 | **Query, sort, and pagination standard.** Default sort is `createdAt desc`, with `id desc` as a secondary/tie-breaking sort so ordering is always deterministic. Supported page sizes are `5, 8, 10, 20`; the default is `8`. Any `page` value below `1` or above `totalPages` is clamped into the valid range rather than producing an error or a blank page. |
| BR-13 | **Empty vs. no-results.** *Empty State* is shown when the Requester has never created a ticket (`totalItems === 0` with no search/filter applied) and includes a **Create First Ticket** action. *No-Results State* is shown when a search or filter is active and returns zero rows, and includes a **Clear Filters** action. These two states must never be visually identical. |
| BR-14 | **Requester switching invalidation.** Changing the current Development Requester immediately clears all cached/rendered ticket data from the previous Requester and reloads fresh data for the newly selected Requester; no stale rows from the previous Requester may remain visible even momentarily behind a loading state. |
| BR-15 | **Forward compatibility with Lab 3.** `Ticket.requesterId` is modeled as a real foreign key so that in Lab 3 it can point at an authenticated `User` record instead of a `RequesterUser` testing record, without a breaking schema change to the `Ticket` table itself. |
| BR-16 | **IT Priority default.** Because IT Staff triage is out of scope for Lab 2, `itPriority` is automatically set equal to `requestedPriority` at creation time and is rendered as read-only to the Requester. This is a deliberate simplification, not an omission — see Section 11. |
| BR-17 | **Ticket Owner default.** `ticketOwnerId` defaults to `null` and is rendered as "Unassigned" in the UI, since IT Staff assignment does not exist yet in Lab 2. |
| BR-18 | **Ticket-creation / attachment-upload transaction independence.** Saving the ticket record and storing its attachment files are treated as two separate steps, not one atomic transaction. The ticket row is committed first. If an individual attachment then fails to upload (e.g., disk write error), the ticket **still exists** with its Ticket Number; the failed file is reported to the Requester per-file (not as a whole-ticket failure), and the Requester can retry adding that attachment from the Ticket Detail screen afterward. A ticket is never silently lost because one of its attachments failed to save. |
| BR-19 | **Safe filename policy.** The original filename supplied by the Requester is stored as display metadata only. The name used on disk is always regenerated by the backend as `<timestamp>-<random>-<sanitized-original-name>`, and the upload directory lives outside the public web root. See `docs/lab-02/api-spec.md` Section 5 for the full sanitization algorithm. |

## 6. UI Specification Summary

Full detail lives in `docs/lab-02/ui-spec.md`; this section is the pointer plus the load-bearing
facts a reviewer needs without opening that file.

- **Theme:** Zen Green — Primary `#006B3C`, Secondary `#0B7A46`, Pale Green `#EAF6EF`, Canvas
  `#F5F7F6`, Read-only field shading `#F0F4F2`, Error `#DC2626`, Warning `#D97706`, Success
  `#15803D`.
- **Breakpoints:** Desktop `≥ 992px` (table layout), Tablet `768–991px` (two-column, compact
  table), Mobile `< 768px` (single column, card list, zero horizontal scroll).
- **Field states:** editable (white bg), read-only (soft gray-green bg), invalid (red border +
  message below the field), disabled (muted, `not-allowed` cursor), focused (visible focus ring
  for keyboard users).
- **Badges never rely on color alone** — every status and priority badge pairs a background color
  with an icon and a text label.
- **Every screen has explicit loading, empty, no-results, validation, submitting, success, and
  failure states** — "it just doesn't show anything" is not an acceptable state.

## 7. Data Changes

### 7.1 Entities

> **Check before migrating:** if the Lab 1 project foundation already created a `Category` model
> (e.g., via the "Create and seed IT request categories" issue), **reuse that table**. Only add the
> relation field(s) `Ticket` needs to point at it — do not create a duplicate `Category` model or
> re-seed rows that already exist. The idempotent-seed rule in Section 7.3 protects against
> duplication either way, but avoiding a second model keeps the schema clean.

```prisma
enum Priority {
  LOW
  MEDIUM
  HIGH
}

enum TicketStatus {
  NEW
  IN_PROGRESS
  RESOLVED
}

model RequesterUser {
  id         Int      @id @default(autoincrement())
  name       String
  email      String   @unique
  department String
  isActive   Boolean  @default(true)
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  tickets            Ticket[]     @relation("TicketRequester")
  uploadedAttachments Attachment[] @relation("AttachmentUploader")
}

model Category {
  id        Int      @id @default(autoincrement())
  name      String   @unique
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())

  tickets Ticket[]
}

model RelatedSystem {
  id        Int      @id @default(autoincrement())
  name      String   @unique
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())

  tickets Ticket[]
}

model Ticket {
  id                Int          @id @default(autoincrement())
  ticketNo          String       @unique
  summary           String
  description       String
  requestedPriority Priority
  itPriority        Priority
  currentStatus     TicketStatus @default(NEW)

  requesterId       Int
  requester         RequesterUser @relation("TicketRequester", fields: [requesterId], references: [id])

  categoryId        Int
  category          Category      @relation(fields: [categoryId], references: [id])

  relatedSystemId   Int
  relatedSystem     RelatedSystem @relation(fields: [relatedSystemId], references: [id])

  // Reserved for Lab 3+. No IT Staff model exists yet, so no relation is declared.
  ticketOwnerId     Int?

  attachments       Attachment[]

  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@index([requesterId, createdAt])
}

model Attachment {
  id                   Int       @id @default(autoincrement())
  ticketId             Int
  ticket               Ticket    @relation(fields: [ticketId], references: [id])

  fileName             String    // original name shown to the user
  storedFileName        String    // safe, generated name on disk (see api-spec.md Section 5)
  fileSize             Int       // bytes
  mimeType             String

  uploadedByRequesterId Int
  uploadedBy            RequesterUser @relation("AttachmentUploader", fields: [uploadedByRequesterId], references: [id])

  removedAt             DateTime?
  removalReason         String?

  createdAt             DateTime @default(now())

  @@index([ticketId])
}
```

### 7.2 Design Decisions Requiring Justification

- **Composite index `(requesterId, createdAt)` on `Ticket`.** Every My Tickets query filters by
  `requesterId` and defaults to sorting by `createdAt desc` (BR-12); a composite index matching
  that access pattern keeps the list query fast as ticket volume grows, instead of relying on a
  full scan filtered in application code.
- **Soft-removal via `removedAt`/`removalReason` instead of deleting the row.** Deleting the row
  would break the foreign key trail needed for IT support audit history and would make BR-08's
  "metadata stays visible" requirement impossible to satisfy.
- **`storedFileName` kept separate from `fileName`.** Keeping the user-facing name and the
  disk-safe name in two columns means the download endpoint can always serve the correct
  `Content-Disposition` filename to the user while the actual file on disk never has to hold
  untrusted characters.

### 7.3 Seed Data (must be idempotent — safe to run repeatedly)

Use `upsert` on the unique field (`name` for Category/RelatedSystem, `email` for RequesterUser) so
re-running the seed script never creates duplicates.

**Categories** (exactly these 4, per the labsheet):
`Account and Access`, `Hardware`, `Software`, `Network`

**Related Systems** (at least 6; these 7 are used):
`Email`, `Campus Wi-Fi`, `VPN`, `LEB2 App`, `Grade Submission App`, `Printer`, `Corporate Laptop`

**Development Requesters** (4 active + 1 inactive, minimum):

| Name | Email | Department | Active |
|---|---|---|---|
| Jennifer Anderson | jennifer.a@example.com | Marketing | ✅ |
| Sarah Johnson | sarah.j@example.com | Finance | ✅ |
| David Lee | david.l@example.com | Academic Affairs | ✅ |
| Emily Chen | emily.c@example.com | Sales | ✅ |
| Robert Wilson | robert.w@example.com | Facilities | ❌ (must **not** appear in the selector) |

## 8. API Contract

Full detail lives in `docs/lab-02/api-spec.md`. Summary of the surface area:

| Capability | Method & Path |
|---|---|
| Active Development Requesters | `GET /api/requesters/active` |
| Active Categories | `GET /api/categories` |
| Active Related Systems | `GET /api/related-systems` |
| Create Ticket | `POST /api/tickets` |
| List My Tickets (search/filter/sort/paginate) | `GET /api/tickets` |
| Ticket Detail | `GET /api/tickets/:id` |
| Upload Attachment | `POST /api/tickets/:id/attachments` |
| Download Attachment | `GET /api/attachments/:id/download` |
| Soft-remove Attachment | `DELETE /api/attachments/:id` |

Every write endpoint and every ownership-scoped read endpoint requires the `X-Requester-Id`
header. Validation failures always return the shape
`{ "error": "...", "details": { "field": "message" } }`; other failures return
`{ "error": "..." }` with no `details` key.

## 9. Acceptance Criteria

Given/When/Then criteria. `Part N` references the labsheet's submission-evidence sections
(Section 14) so the same list doubles as a submission checklist.

| ID | Criterion | Evidence Part |
|---|---|---|
| AC-01 | **Given** valid ticket data, **when** the Requester submits Create Ticket, **then** the ticket is saved and the backend-generated Ticket Number (e.g. `TKT-2026-000001`) is displayed. | Part 6 |
| AC-02 | **Given** no Development Requester is selected, **when** the user tries to open My Tickets or Create Ticket directly, **then** the app redirects to the Requester Selection screen. | Part 5/6 |
| AC-03 | **Given** a Requester is selected, **when** Create Ticket loads, **then** the Requester name shown is the selected identity, and the saved ticket's `requesterId` matches it exactly. | Part 6 |
| AC-04 | **Given** an empty or invalid required field, **when** the Requester presses Submit, **then** a red message appears directly under each invalid field and no request is sent to the API. | Part 6 |
| AC-05 | **Given** a selected file over 5 MB or with a disallowed extension, **when** it is attached, **then** the upload is rejected client-side with a clear message and no network request is made for that file. | Part 6 |
| AC-06 | **Given** a valid form, **when** the Requester presses Submit, **then** the button immediately becomes busy/disabled and stays that way until the request completes, preventing a second ticket from being created by a double click. | Part 6 |
| AC-07 | **Given** the backend is unreachable or returns a server error, **when** the Requester submits, **then** a safe failure message is shown and every field the Requester typed remains exactly as entered. | Part 6 |
| AC-08 | **Given** Requester B is selected, **when** a ticket belonging to Requester A is requested by ID (via URL or direct API call), **then** the response is `403 Forbidden` and no ticket data is returned. | Part 8 |
| AC-09 | **Given** an owned ticket, **when** its Ticket Detail screen is opened, **then** every field is rendered read-only (no editable control exists for any header field). | Part 8 |
| AC-10 | **Given** the My Tickets screen, **when** the Requester types a search term or picks a filter, **then** the list shows only their own tickets matching every active criterion. | Part 7 |
| AC-11 | **Given** the My Tickets screen, **when** a sortable column/direction is chosen, **then** the list re-orders correctly by that field and direction. | Part 7 |
| AC-12 | **Given** multiple pages of results, **when** the Requester changes page or an out-of-range page number is supplied, **then** the correct page is shown and the value is clamped into range rather than producing an error or blank page. | Part 7 |
| AC-13 | **Given** Requester A's data is loaded, **when** the tester switches to Requester B, **then** every trace of A's tickets disappears and only B's tickets load. | Part 7 |
| AC-14 | **Given** the My Tickets screen, **when** the Requester has never created a ticket, **then** the Empty State appears; **when** a search/filter matches nothing, **then** the distinct No-Results State appears instead. | Part 7 |
| AC-15 | **Given** a ticket with fewer than 5 active attachments, **when** the Requester uploads a valid file from Ticket Detail, **then** it is saved and appears immediately in the attachment list. | Part 8 |
| AC-16 | **Given** an active attachment, **when** the Requester removes it and supplies a reason, **then** it shows strikethrough, the reason text, and no Download button, while the metadata (filename, size) remains visible. | Part 8 |
| AC-17 | **Given** a removed attachment, **when** its download URL is requested directly, **then** the response is `410 Gone` and no file is streamed. | Part 8 |
| AC-18 | **Given** a missing, malformed, unknown, or inactive `X-Requester-Id`, **when** any Requester-scoped endpoint is called, **then** the request is rejected (`400` for malformed, `401` for missing/unknown/inactive) and no ticket data of any Requester is returned. | Part 6/7/8 |
| AC-19 | **Given** Desktop, Tablet, and Mobile viewports, **when** any of the three main screens is inspected, **then** the layout adapts per Section 8.7 of the labsheet with no clipped content and no unintended horizontal scroll. | Part 9 |
| AC-20 | **Given** any status or priority badge, **when** viewed without relying on color perception, **then** the badge's icon and text alone are sufficient to identify its meaning, and all interactive controls show a visible keyboard focus indicator. | Part 9 |

## 10. Definition of Done

### 10.1 Product Completion
- All of AC-01 through AC-20 pass, with test evidence, on the final `main` branch.
- `npm --prefix server run test`, `npm --prefix client run test`, and `npx playwright test` all
  pass with **zero** skipped, disabled, or commented-out tests.
- Every business rule in Section 5 has at least one test exercising it directly (see
  `docs/lab-02/tests.md` Section 10).
- The implemented screens and API responses match `ui-spec.md` and `api-spec.md` exactly —
  including status codes, error shapes, and color tokens.
- Seed script (`prisma db seed` or equivalent) can be run twice in a row with no duplicate rows
  and no errors.
- `README.md` setup and test-run instructions are current and were verified on a clean clone.

### 10.2 Course Delivery Requirements
- Every Lab 2 Issue is tracked on the Kanban board (`Backlog → Specified → Started → PR Review →
  Fixing → Done`) and ends in `Done`.
- Every change reaches `lab2-staging` through a peer-reviewed Pull Request from a feature branch;
  nothing is committed directly to `lab2-staging` or `main`.
- `docs/lab-02/reviewer.md` records real reviewer identity, real PR links, and real comments given
  and received, with replies to every comment (see the GitHub Workflow Guide, Part 8).
- `docs/lab-02/ai-use.md` records the actual LLM(s) used, 6–10 real key prompts, and a short
  reflection.
- One release Pull Request merges `lab2-staging → main` after `lab2-staging` is fully green.

## 11. Assumptions and Decisions

Decisions made here because the labsheet explicitly leaves them to the student:

1. **403 vs. 404 on cross-Requester access (AC-08, BR-04).** This spec chooses `403 Forbidden`
   uniformly (tickets and attachments) rather than `404 Not Found`. Reasoning: this is a testing
   environment where hiding resource existence has no real confidentiality value, and a `403` gives
   the grader and the automated tests an unambiguous signal that ownership logic — not a missing
   row — caused the rejection.
2. **401 vs. 400 for a bad `X-Requester-Id` (BR-06).** A syntactically invalid header (not a
   positive integer) is a client mistake → `400`. A syntactically valid header pointing at a
   Requester that doesn't exist or is inactive is an authentication-context failure → `401`. This
   split makes the two failure modes distinguishable in tests and logs.
3. **`itPriority = requestedPriority` at creation (BR-16).** IT triage doesn't exist yet in Lab 2,
   so leaving `itPriority` empty would make the read-only field meaningless on screen; mirroring
   the Requester's own priority keeps the UI coherent without inventing IT Staff behavior that is
   explicitly out of scope.
4. **Attachment upload is not wrapped in the same DB transaction as ticket creation (BR-18).** A
   ticket without an attachment is still a valid, useful ticket; an attachment without a ticket is
   not. Treating them as independent steps means a slow or failed file upload can never destroy an
   otherwise-valid support request.
5. **`storedFileName` as a separate column from `fileName` (Section 7.2).** Chosen instead of
   sanitizing `fileName` in place, so the original name a Requester recognizes is never altered for
   display, while the value actually touching the filesystem is always safe.
