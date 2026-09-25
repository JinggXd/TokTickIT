# TokTickIT Lab 4 — Architectural & Business Rule Decisions (D01–D10)

**Date:** 2026-09-25  
**Document Version:** 1.2.0 (Revised following F1-Review Round 2 Findings)  
**Document Status:** PROPOSED (Awaiting User Review & Explicit Approval)  
**Contract Baseline:** CPE 334 Sprint 4 Handout (`SE-Lab-4.pdf`), Lab 3 Engineering Contracts, `GEMINI-PIPELINE.md`, `F1-REVIEW-ROUND2.md`

---

## Decision Summary Table

| ID | Title / Topic | Handout Sources | Status | Recommendation Summary |
|---|---|---|---|---|
| **D01** | Action Taken Actor Semantics, Model Fields, Lifecycle & Inactive Assignee Rejection | §3, §4.1, §4.3, §4.4, §8.3, §14 Part 6 | **Proposed (TBD)** | `createdById` (server auto), `performedById` (set on completion/creation), `assigneeId` (nullable, active IT Staff/Admin). Statuses `PENDING`, `COMPLETED`, `CANCELLED`. Inactive assignee rejected with 422 `INVALID_ASSIGNEE`. Model includes `version: Int @default(1)`. |
| **D02** | Ticket Resolution Gate, Follow-Up Semantics & Concurrency Serialization | §4.5, §9, §14 Part 7 | **Proposed (TBD)** | Resolution requires >= 1 `COMPLETED` Action Taken and 0 `PENDING` actions (422 `RESOLUTION_GATE_FAILED`). Follow-up flag/note is an informational audit trail; any necessary follow-up work is logged as a separate action. Action mutations acquire row lock on Ticket and increment `Ticket.version`. |
| **D03** | Append-Only Scope vs Action Modification & Terminal Locking | §8.3, §14 Part 7 | **Proposed (TBD)** | Comments, Notes, and Ticket status transitions remain append-only without inventing a new history table. Pending actions editable by staff/admin. Completed actions editable only by original performer or Admin for description/notes. Parent RESOLVED, CLOSED, or CANCELLED locks all actions. Nested `actionId` must belong to `ticketId`. |
| **D04** | Requester Visibility into All Actions Taken & Confidentiality Safeguards | §4.3, §8.3 | **Proposed (TBD)** | Requesters view **ALL** Actions Taken (`PENDING`, `COMPLETED`, `CANCELLED`) on owned tickets in read-only mode. Foreign tickets strictly 403 Forbidden with exact baseline message. Zero leakage of Internal Notes. |
| **D05** | Single Metric Dictionary, Drill-down Targets & Status-Set Parity | §4.6, §6.2, §8.1, §8.2, §14 Part 5 & 8 | **Proposed (TBD)** | 1-to-1 parity between Card Count <-> API Field <-> DB Query <-> Drill-down URL. Added `recent=7d` and `statusGroup=open/active` query parameters. `myRecentActions` contains actions performed by current user. Admin dashboard links to `/admin/tickets/:id`. |
| **D06** | Action Event Date/Time vs Server Creation Timestamp | §3, §4.1, §8.3 | **Proposed (TBD)** | `actionDateTime` is event time (<= now + 5m clock-skew tolerance). `createdAt` is immutable server timestamp. |
| **D07** | Administrator Role Capabilities & Workflow Inheritance Delta | §4.3 | **Proposed (TBD)** | Administrators possess full IT Staff capabilities for Actions Taken. For `PATCH /api/staff/tickets/:id/status`, retain Lab 3 baseline access as `IT_STAFF` to preserve RBAC stability. |
| **D08** | AGENTS.md & .antigravityrules Minimal Scope Adjustment | AGENTS.md, .antigravityrules | **Proposed (TBD)** | Minimal patch verified with `git apply --check` (code 0) without overwriting Lab 3 pipeline. |
| **D09** | Concurrency, Optimistic Locking & Idempotent Retry Protocol | §5.1, §6.1, §8.5 | **Proposed (TBD)** | Persistent `clientRequestId` scoped to `(createdById, ticketId, clientRequestId)` with 200 replay vs 201 created. Transactional parent ticket locking before any action mutation. Action updates require `expectedVersion` (409 Conflict). |
| **D10** | Safe Database Recovery & Sandbox Procedure | §5.2 | **Proposed (TBD)** | Sandbox backup/restore test procedure documented using `pg_dump`/`pg_restore` on disposable test database. |

---

## Detailed Decision Records

### D01 — Action Taken Model, Actor Semantics, Lifecycle & Inactive-Assignee Rejection

- **Handout References:** §3 (p1-2), §4.1 (p2), §4.3 (p2-3), §4.4 (p3), §8.3 (p6), §14 Part 6 (p11).
- **Review Finding:** Round 1 R02, R03, R09; Round 2 Item 4.
- **Resolution & Concrete Proposal:**
  1. **Actor Fields:**
     - **`createdById: Int`**: The IT Staff / Admin who created the action (auto-populated by server from session `req.user.id`).
     - **`performedById: Int?`**: The IT Staff / Admin who actually executed/completed the work.
       - When created directly as `COMPLETED`: `performedById = createdById`.
       - When created as `PENDING`: `performedById` is `null`.
       - When transitioned to `COMPLETED`: `performedById` is set to the session user executing the completion request.
     - **`assigneeId: Int?`**: The IT Staff / Admin assigned to execute the work (optional).
  2. **Lifecycle Statuses:** `PENDING`, `COMPLETED`, `CANCELLED`.
  3. **Concurrency Field:** `version: Int @default(1)` on `ActionTaken`.
  4. **Inactive Assignee Rejection:** If `assigneeId` is supplied, the server validates:
     - User exists.
     - Role is `IT_STAFF` or `ADMINISTRATOR`.
     - `isActive === true`.
     If any condition fails, reject with `422 Unprocessable Entity` (`{ "error": "INVALID_ASSIGNEE", "message": "Assignee must be an active IT Staff or Administrator." }`).
- **Status:** Proposed (TBD)

---

### D02 — Ticket Resolution Gate, Follow-Up Semantics & Concurrency Serialization

- **Handout References:** §4.5 (p3), §9 (p7), §14 Part 7 (p11).
- **Review Finding:** Round 2 Items 1 & 3.
- **Problem Statement:**
  - Round 2 Finding 3 noted: "followUpRequired ต้องมี subsequent action หรือ confirmation acknowledgment แต่ท้ายประโยคกลับตรวจเพียง completed>=1/pending=0... เลือก business rule เดียวให้ชัด".
- **Resolution & Concrete Proposal:**
  1. **Follow-Up Semantics (Informational Audit Log):**
     - `followUpRequired: Boolean` and `followUpNote: String?` serve as **informational collaboration notes** between staff members and requesters.
     - When an action is completed, setting `followUpRequired: true` documents that future routine inspection or monitoring is advised.
     - If actionable technical work is required, staff logs a subsequent `ActionTaken` (initially `PENDING` with an assignee).
     - **Resolution Gate Rule:**
       - Transition to `RESOLVED` requires:
         1. **`COMPLETED >= 1`**: At least one completed Action Taken under the ticket.
         2. **`PENDING === 0`**: Exactly zero pending Action Taken records.
       - Because any actionable follow-up work is logged as an action, having zero pending actions mathematically guarantees that all planned work lines are completed. This eliminates contradictory double-gating while strictly enforcing the handout's resolution gate.
  2. **Atomic Transaction Serialization & Parent Ticket Locking:**
     - **Lock Order:** In all Action Taken mutations (`POST /actions`, `PATCH /actions/:id`, `POST /complete`, `POST /cancel`):
       1. Begin Prisma transaction.
       2. Lock parent `Ticket` row (`SELECT id, version, currentStatus FROM "Ticket" WHERE id = :ticketId FOR UPDATE`).
       3. **Idempotency Replay Priority (`POST /actions`):** If creating an action with `clientRequestId`, the server checks whether `(createdById, ticketId, clientRequestId)` already exists in `ActionTaken` **before** evaluating the parent ticket's status (where `createdById = req.user.id`). If a matching record with identical payload hash exists, commit and return `200 OK` (with `X-Idempotent-Replay: true`). This ensures network retries succeed even if the ticket transitioned to `RESOLVED`, `CLOSED`, or `CANCELLED` after the initial creation.
       4. **Enforce Terminal Status Lock:** For new action creations or mutations, if `ticket.currentStatus` is in (`RESOLVED`, `CLOSED`, `CANCELLED`), abort transaction and return `400 Bad Request` (`{ "error": "BAD_REQUEST", "message": "Cannot modify actions on a resolved, closed, or cancelled ticket." }`).
       5. Apply action changes and increment `ActionTaken.version`.
       6. Increment parent `Ticket.version = Ticket.version + 1` and update `Ticket.updatedAt = NOW()`.
     - **Resolution Lock:** In `PATCH /api/staff/tickets/:id/status` transitioning to `RESOLVED`:
       1. Lock `Ticket` row (`FOR UPDATE`).
       2. Check `expectedVersion === ticket.version` (if not, return 409 `CONFLICT`).
       3. Count actions: `COMPLETED >= 1` and `PENDING === 0`. If not, return 422 `RESOLUTION_GATE_FAILED`.
       4. Update `Ticket.currentStatus = 'RESOLVED'`, `Ticket.version = Ticket.version + 1`.
     - **Races Handled:**
       - If Resolution commits first: Action creation acquires lock second, detects `currentStatus === 'RESOLVED'`, and fails with 400 Bad Request (unless it is a replay of an action created prior to resolution).
       - If Action mutation commits first: Parent `Ticket.version` was incremented; Resolution acquires lock second, detects stale `expectedVersion`, and fails with 409 Conflict.
  3. **Legacy Tickets:** Legacy tickets from Labs 1–3 with 0 actions cannot transition to `RESOLVED` directly; server returns `422 Unprocessable Entity` (`{ "error": "RESOLUTION_GATE_FAILED", "message": "Ticket resolution requires at least one completed Action Taken and no pending actions." }`). Existing tickets already in `RESOLVED` or `CLOSED` remain valid.
- **Status:** Proposed (TBD)

---

### D03 — Append-Only Scope vs Action Modification & Terminal Locking

- **Handout References:** §8.3 (p6) vs §14 Part 7 (p11).
- **Review Finding:** Round 2 Item 3.
- **Resolution & Concrete Proposal:**
  1. **Append-Only Scope (No Invented History Tables):**
     - `PublicComment` and `InternalNote` records are strictly append-only (no edit or delete capabilities).
     - Ticket status transitions advance through the permitted state machine without deleting past actions or overwriting comments/notes.
     - `ActionTaken` records serve as the parent-child operational log; no separate `TicketHistory` table is invented.
  2. **Action Taken Modification Rules:**
     - **Pending Actions:** Any permitted IT Staff/Admin can edit `actionDescription`, `assigneeId`, `followUpRequired`, `followUpNote`, and `attachmentNotes`.
     - **Completed Actions:** Only the original performer (`performedById === currentUser.id`) OR an `ADMINISTRATOR` can edit `actionDescription`, `followUpRequired`, `followUpNote`, and `attachmentNotes`. Modifying `assigneeId`, `result`, or reverting `status` back to `PENDING` is forbidden (400 Bad Request).
     - **Cancelled Actions:** Strictly immutable (400 Bad Request).
  3. **Terminal Locking:**
     - If `parentTicket.currentStatus` is in (`RESOLVED`, `CLOSED`, `CANCELLED`), all action mutations (`POST create`, `PATCH edit`, `POST complete`, `POST cancel`) are rejected with `400 Bad Request` (`{ "error": "BAD_REQUEST", "message": "Cannot modify actions on a resolved, closed, or cancelled ticket." }`).
  4. **Nested Resource Integrity:**
     - Endpoints verify `action.ticketId === parseInt(req.params.id)`. If an action ID exists but belongs to a different ticket, return `404 Not Found` (`{ "error": "NOT_FOUND", "message": "Action Taken not found under this ticket." }`).
- **Status:** Proposed (TBD)

---

### D04 — Requester Visibility into All Actions Taken & Confidentiality Safeguards

- **Handout References:** §4.3 (p2-3), §8.3 (p6).
- **Resolution & Concrete Proposal:**
  1. **Visibility of Actions:** Requesters viewing their own ticket see **all** Actions Taken, including `PENDING`, `COMPLETED`, and `CANCELLED`.
  2. **Field Scoping:** The requester payload includes: `id`, `actionDateTime`, `actionDescription`, `result`, `status`, `performedBy { id, name }`, `assignee { id, name }`, `followUpRequired`, `followUpNote`, `attachmentNotes`, `createdAt`.
  3. **Strict Confidentiality (Zero Leakage):**
     - Actions Taken responses contain no internal staff notes or comments.
     - Requesters attempting to access Actions Taken on tickets owned by others receive strictly **`403 Forbidden`** with the exact baseline message:
       `{ "error": "Access denied: You do not own this ticket" }`.
- **Status:** Proposed (TBD)

---

### D05 — Single Metric Dictionary, Drill-down Targets & Status-Set Parity

- **Handout References:** §4.6 (p3), §6.2 (p4), §8.1 (p5), §8.2 (p6), §14 Part 5 & 8.
- **Review Finding:** Round 2 Item 2.
- **Resolution & Concrete Proposal:**
  1. **API Filter Delta for List Endpoints:**
     - `GET /api/tickets` (Requester list): Add query parameters `recent=7d` (filters `updatedAt >= NOW() - INTERVAL '7 days'`) and `statusGroup=open` (filters `currentStatus IN ('NEW', 'OPEN', 'IN_PROGRESS', 'WAITING_FOR_REQUESTER', 'REOPENED')`).
     - `GET /api/staff/tickets` (Staff queue): Add query parameters `statusGroup=open` (active statuses) and `statusGroup=active` (excludes `CLOSED`, `CANCELLED`). Extend read access to `ADMINISTRATOR`.
  2. **Requester Metrics Dictionary:**
     - `totalOpenTickets`: count where `currentStatus` in (`NEW`, `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `REOPENED`) and `requesterId === currentUser.id`. Drill-down URL: `/my-tickets?statusGroup=open`.
     - `ticketsWaitingForRequester`: count where `currentStatus === 'WAITING_FOR_REQUESTER'` and `requesterId === currentUser.id`. Drill-down URL: `/my-tickets?status=WAITING_FOR_REQUESTER`.
     - `recentlyUpdatedTicketsCount`: count where `requesterId === currentUser.id` and `updatedAt >= NOW() - INTERVAL '7 days'`. Drill-down URL: `/my-tickets?recent=7d`.
     - `recentlyResolvedTicketsCount`: count where `currentStatus === 'RESOLVED'` and `updatedAt >= NOW() - INTERVAL '7 days'` and `requesterId === currentUser.id`. Drill-down URL: `/my-tickets?status=RESOLVED&recent=7d`.
  3. **IT Staff Metrics Dictionary:**
     - `unassignedTickets`: count where `ticketOwnerId === null` and `currentStatus` in active statuses. Drill-down URL: `/staff/queue?owner=unassigned&statusGroup=open`.
     - `myAssignedTickets`: count where `ticketOwnerId === currentUser.id` and `currentStatus` not in (`CLOSED`, `CANCELLED`). Drill-down URL: `/staff/queue?owner=me&statusGroup=active`.
     - `openQueueTickets`: count where `currentStatus` in (`NEW`, `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `REOPENED`). Drill-down URL: `/staff/queue?statusGroup=open`.
     - `ticketsWaitingForRequester`: count where `currentStatus === 'WAITING_FOR_REQUESTER'`. Drill-down URL: `/staff/queue?status=WAITING_FOR_REQUESTER`.
     - `myActionsTakenCount`: count where `performedById === currentUser.id` and `status === 'COMPLETED'`.
     - `ticketsByStatus`: counts object for all 8 statuses.
     - `ticketsByPriority`: counts object for `HIGH`, `MEDIUM`, `LOW` on active tickets.
  4. **List & Ordering Definitions:**
     - `recentOrUrgentTickets`: Tickets where `currentStatus` in active statuses, prioritized by `itPriority === 'HIGH' DESC`, then `updatedAt DESC`, then `id DESC`, limit 5.
     - `myRecentActions`: Actions where **`performedById === currentUser.id`**, sorted `actionDateTime DESC, id DESC`, limit 5 (strictly matching §14 Part 5 "current-user Actions Taken").
  5. **Admin Dashboard Links:**
     - On the Admin Dashboard, ticket rows link to `/admin/tickets/:id` (preserving baseline Administrator detail route).
- **Status:** Proposed (TBD)

---

### D06 — Action Event Date/Time vs Server Creation Timestamp

- **Handout References:** §3 (p1), §4.1 (p2), §8.3 (p6).
- **Resolution & Concrete Proposal:**
  - `actionDateTime`: Datetime when the intervention took place. Must not be in the future (`<= now() + 5m`). Defaults to current time if omitted.
  - UI date-time input restricts max date to `new Date(Date.now() + 5 * 60 * 1000).toISOString().slice(0, 16)`.
  - `createdAt`: System audit timestamp recorded by PostgreSQL `now()`.
- **Status:** Proposed (TBD)

---

### D07 — Administrator Role Capabilities & Workflow Inheritance Delta

- **Handout References:** §4.3 (p3), Lab 3 Baseline §5.8.
- **Resolution & Concrete Proposal:**
  - **Actions Taken:** Administrators have full IT Staff capabilities (create, edit, assign, complete, cancel).
  - **Ticket Status Transitions (`PATCH /api/staff/tickets/:id/status`):** Retain baseline Lab 3 access restricted to `IT_STAFF`.
  - **Queue Read Access:** `GET /api/staff/tickets` extends read-only access to `ADMINISTRATOR` to support queue inspection.
  - **Transition Matrix Inheritance:** All 17 allowed status transitions from Lab 3 are preserved, including `CLOSED -> REOPENED`. Only `CANCELLED` is terminal. Reopening clears `appearsResolvedAt` and `appearsResolvedById`.
- **Status:** Proposed (TBD)

---

### D08 — AGENTS.md & .antigravityrules Minimal Scope Adjustment

- **Handout References:** AGENTS.md, .antigravityrules.
- **Resolution & Concrete Proposal:**
  - Prepared verified patch in `docs/lab-04/proposed-agents-patch.md` that passes `git apply --check` with code 0 on the actual repository files.
  - Prepend Lab 4 Execution Authority section at the top of `.antigravityrules` without invalidating Lab 3 rules.
- **Status:** Proposed (TBD)

---

### D09 — Concurrency, Optimistic Locking & Idempotent Retry Protocol

- **Handout References:** §5.1 (p4), §6.1 (p4), §8.5 (p7).
- **Review Finding:** Round 2 Item 1.
- **Resolution & Concrete Proposal:**
  1. **Dual Optimistic Concurrency:**
     - `Ticket.version`: Checked on status transitions and ownership changes (`expectedVersion`). Stale versions return `409 Conflict` with baseline message:
       `{ "error": "CONFLICT", "message": "The ticket was modified by another user. Please refresh and try again.", "currentVersion": ... }`.
     - `ActionTaken.version`: Checked on action updates, completion, and cancellation (`expectedVersion`). Stale versions return `409 Conflict`.
  2. **Idempotent Retry Protocol (`POST /api/tickets/:id/actions`):**
     - **Location & Precedence:** Header `X-Client-Request-Id` is primary; request body property `clientRequestId` is accepted as fallback. If both are provided, they must match; otherwise reject with `400 Bad Request` (`{ "error": "VALIDATION_FAILED", "message": "Header and body clientRequestId must match." }`).
     - **Persistence & Scoping:** Stored in column `clientRequestId String?` on `ActionTaken` with constraint `@@unique([createdById, ticketId, clientRequestId])`, where `createdById` is derived from authenticated session `req.user.id`.
       - *Same user + same ticket + same key + same payload:* Replay returns `200 OK` (`X-Idempotent-Replay: true`).
       - *Same scope (`createdById, ticketId, clientRequestId`) + different payload:* Rejected with `409 Conflict`.
       - *Different user + same ticket + same key:* Creates a separate Action Taken (`201 Created`) if authorized, preserving isolated idempotency namespaces.
     - **Canonical Request Payload Hash (All 8 Fields):** To ensure retries remain idempotent even if the created action is later edited or completed by staff, the server computes a SHA-256 hash of all 8 request fields:
       `normalizedPayload = { actionDateTime, actionDescription, status, result, assigneeId, followUpRequired, followUpNote, attachmentNotes }`
       and stores `requestPayloadHash String?` on `ActionTaken`.
     - **Mismatched Payload Check:** When a matching `(createdById, ticketId, clientRequestId)` is found, the server compares the incoming request's hash against the stored `requestPayloadHash`. If the hash differs, reject with `409 Conflict` (`{ "error": "CONFLICT", "message": "Idempotency key reused with mismatched request payload." }`). If the hash matches, return `200 OK` (even if the action was subsequently edited or completed, and even if the parent ticket is now `RESOLVED`, `CLOSED`, or `CANCELLED`).
     - **Replay Response Status:** Initial creation returns **`201 Created`**. Replayed response for identical request returns **`200 OK`** with header `X-Idempotent-Replay: true`.
     - **UI Behavior:** The Action Taken modal generates a UUIDv4 on open and reuses that identical key if resubmitting following a network error.
- **Status:** Proposed (TBD)

---

### D10 — Database Backup & Rollback Recovery Procedure

- **Handout References:** §5.2 (p4).
- **Resolution & Concrete Proposal:**
  - Sandbox backup script: `docker exec toktickit-db pg_dump -U toktickit -d toktickit_test -F c -f /tmp/backup_pre_lab4.dump`.
  - Sandbox restore script: `docker exec toktickit-db pg_restore -U toktickit -d toktickit_test --clean --if-exists /tmp/backup_pre_lab4.dump`.
  - Automated migration test verifies that pre-existing rows and schema survive intact.
- **Status:** Proposed (TBD)

---

### D11 — Datetime-Local Form Input & Local Timezone Formatting (7-Hour UTC Skew Prevention)

- **Finding / Problem:** Using `new Date().toISOString().slice(0, 16)` as default value or `max` constraint for HTML5 `<input type="datetime-local">` causes a 7-hour timezone skew in Thailand (UTC+7). Because the browser expects `YYYY-MM-DDTHH:mm` in local time, an ISO UTC string sets the upper bound 7 hours into the past, falsely rejecting current local timestamps.
- **Resolution & Decision:**
  1. Frontend helper `formatLocalDatetime(date: Date)` formats date components using local getter methods (`getFullYear()`, `getMonth() + 1`, `getDate()`, `getHours()`, `getMinutes()`), returning `YYYY-MM-DDTHH:mm` in the client's local timezone.
  2. Input initialization sets `value = formatLocalDatetime(new Date())`.
  3. Upper bound constraint sets `max = formatLocalDatetime(new Date(Date.now() + 5 * 60 * 1000))` (enforcing 5-minute future tolerance in local time).
  4. Transmission to backend converts the local datetime string to UTC ISO-8601 (`new Date(actionDateTime).toISOString()`).
- **Status:** Proposed (TBD)

---

### D12 — Eligible Ticket Owners & Assignees Authorization Expansion (`GET /api/staff/ticket-owners`)

- **Finding / Problem:** In Lab 3, `GET /api/staff/ticket-owners` was restricted to `IT_STAFF` only (`requireRole("IT_STAFF")`), preventing Administrators from fetching eligible owners or assigning action tasks from the Administrator interface.
- **Resolution & Decision:**
  1. Expand authorization on `GET /api/staff/ticket-owners` to allow both `IT_STAFF` and `ADMINISTRATOR` (`requireRole("IT_STAFF", "ADMINISTRATOR")`).
  2. The database query already filters `WHERE role IN ('IT_STAFF', 'ADMINISTRATOR') AND isActive = true`.
  3. Reuses the exact existing route and response schema, maintaining full backward compatibility.
- **Status:** Proposed (TBD)

---

### D13 — Normalized Action Mutation Contracts (Edit, Complete, Cancel)

- **Finding / Problem:** `PATCH /api/tickets/:id/actions/:actionId`, `POST .../complete`, and `POST .../cancel` lacked detailed request schemas, validation criteria tables, and exact response envelopes in documentation, risking frontend/backend discrepancy.
- **Resolution & Decision:**
  1. `PATCH /api/tickets/:id/actions/:actionId`:
     - Accepts `expectedVersion`, `actionDescription` (1–1000), `assigneeId` (null or active staff/admin; allowed only if action is PENDING), `followUpRequired`, `followUpNote` (mandatory if followUpRequired is true), `attachmentNotes` (max 500).
     - Completed actions can only be edited by the original performer or an Administrator. Changing assignee or result on a completed action returns 400 Bad Request.
  2. `POST /api/tickets/:id/actions/:actionId/complete`:
     - Requires `expectedVersion` and `result` (1–1000 chars non-empty), optional `attachmentNotes`.
     - Validates action is currently `PENDING`. Transitions to `COMPLETED`, records `performedById = req.user.id`.
  3. `POST /api/tickets/:id/actions/:actionId/cancel`:
     - Requires `expectedVersion`, optional `reason` (max 500 chars).
     - Validates action is currently `PENDING`. Transitions to `CANCELLED`.
  4. All three mutations acquire row-lock on parent `Ticket` (`SELECT ... FOR UPDATE`), verify parent ticket is not in terminal/resolved status (`RESOLVED`, `CLOSED`, `CANCELLED`), increment `ActionTaken.version`, increment `Ticket.version`, and return the updated action object in a `200 OK` response.
- **Status:** Proposed (TBD)
