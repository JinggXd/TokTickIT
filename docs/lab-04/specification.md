# TokTickIT — Engineering Specification (Lab 4)

**Document Version:** 1.2.0 (Revised following F1-Review Round 2 Findings)  
**Status:** PROPOSED ENGINEERING CONTRACT (Sprint 4 F1)  
**Sprint:** Sprint 4 (Lab 4: Actions Taken, Ticket Workflow Resolution Gate, Dashboards, and Final Regression)  
**Target Staging Branch:** `lab4-staging`  
**Base Commit SHA:** `baad45e09272d665bc0cf765236c456edcf0eff7`  
**Standard Compliance:** CPE 334 Lab 4 Handout (`SE-Lab-4.pdf`, §9 11 Sections), Lab 3 Engineering Baseline, `GEMINI-PIPELINE.md`, `F1-REVIEW-ROUND2.md`

---

## 1. Sprint Goal

Complete the full-stack TokTickIT service-desk lifecycle by adding an IT Staff **Actions Taken** work-logging parent-child sub-system, enforcing strict backend **Ticket Status & Resolution Gate** rules, delivering role-appropriate **Operational Dashboards** for Requesters, IT Staff, and Administrators, and hardening the entire application across all three previous labs with comprehensive regression testing and visual/accessibility polish under the Zen Green design system.

---

## 2. Stakeholder Request & Background

TokTickIT established requester ticket creation, attachment handling, multi-role authentication (RBAC), staff ticket triage/queue, public comments, and confidential internal notes across Labs 1 through 3.

Stakeholders now require:
1. **Parent-Child Work Planning & Execution (Actions Taken):** IT Staff need an authoritative way to log and track discrete operational actions performed under each ticket. Each action must record date/time, description, result, automated performer attribution, follow-up flags, and attachment references. A ticket coordinator (Ticket Owner) may oversee the ticket while multiple different IT Staff members execute and log individual actions.
2. **Definitive Ticket Workflow & Resolution Gate:** Requesters may indicate their problem appears resolved, but formal resolution requires IT Staff action. Transition to `RESOLVED` must be strictly validated at the backend to ensure work was completed and zero pending actions remain.
3. **Role-Appropriate Dashboards:** Requesters, IT Staff, and Administrators require dedicated, concise dashboards providing immediate operational awareness, key metric cards, urgent ticket queues, and direct drill-downs to underlying detailed lists.
4. **Complete Regression & System Hardening:** The entire application must be thoroughly verified with zero regressions against Labs 1–3, with robust optimistic concurrency, retry safety, responsive layouts across desktop/tablet/mobile, and full accessibility.

---

## 3. Scope

### 3.1 Included Scope
- **Actions Taken Sub-system:**
  - Database model `ActionTaken` related 1:N with `Ticket`.
  - Actor semantics: `createdById` (server-derived from session), `performedById` (set on completion/creation), and optional `assigneeId` (active IT Staff or Admin).
  - Action lifecycle statuses (`PENDING`, `COMPLETED`, `CANCELLED`).
  - Action concurrency control via `version: Int @default(1)`.
  - Inactive assignee rejection (`422 Unprocessable Entity` with `INVALID_ASSIGNEE`).
  - Required fields: `actionDateTime` (event time <= now + 5m), `actionDescription` (1–1000 chars), `result` (mandatory if completed), `followUpRequired`, `followUpNote` (mandatory if followUpRequired is true), `attachmentNotes` (max 500 chars).
  - Idempotent creation retry via `clientRequestId` (UUIDv4) with 200 replay vs 201 created.
  - IT Staff/Admin creation, assignment, editing, completion, and cancellation in Ticket Detail.
  - Completed action editing: restricted to original performer or Administrator.
  - Parent terminal & resolved locking: tickets in `RESOLVED`, `CLOSED`, or `CANCELLED` status lock all Actions Taken as immutable.
  - Requester read-only visibility for **all** Actions Taken on owned tickets. Foreign ticket access returns strictly `403 Forbidden` (`Access denied: You do not own this ticket`).
  - Zero leakage of `InternalNotes` to Requesters.
- **Ticket Status Workflow & Resolution Gate:**
  - Preservation of the full 64-status transition matrix from Lab 3 (17 allowed, 47 rejected; only `CANCELLED` is terminal; `CLOSED -> REOPENED` permitted; clearing `appearsResolvedAt` and `appearsResolvedById` on reopening).
  - Backend resolution gate: Resolving a ticket requires at least one `COMPLETED` Action Taken and zero `PENDING` Actions Taken. Direct API bypasses are rejected (`422 Unprocessable Entity` with `RESOLUTION_GATE_FAILED`).
  - Legacy ticket compatibility: Legacy tickets without actions cannot transition to `RESOLVED` until a completed action is added.
  - Concurrency control via optimistic locking (`Ticket.version` with `409 Conflict` and `CONFLICT`).
  - Atomic transaction serialization: Status updates lock `Ticket` row (`FOR UPDATE`); all action mutations acquire row lock on `Ticket` and increment `Ticket.version`.
- **Role-Appropriate Dashboards & Drill-Down Parity:**
  - **Requester Dashboard:** Authoritative counts for Open tickets, Waiting for Requester, Recently updated (7 days), and Recently resolved (7 days), plus recent tickets list with direct drill-down links to My Tickets (`statusGroup=open`, `recent=7d`, `status=RESOLVED&recent=7d`).
  - **IT Staff Dashboard:** Authoritative counts for Unassigned tickets, My Assigned tickets, Open queue tickets, Waiting for Requester, and My Actions Taken count, plus recent/urgent tickets list and my recent actions feed with drill-downs to Queue (`owner=unassigned&statusGroup=open`, `owner=me&statusGroup=active`).
  - **Administrator Dashboard:** Reuses IT Staff dashboard metrics, links ticket rows to `/admin/tickets/:id`, and supplements with user-account metrics (Total Users, Active Users, Users by Role).
- **Final Hardening & Regression:**
  - Full suite regression across Labs 1, 2, and 3 (Authentication, Attachments, Comments, Notes, User Administration).
  - Responsive layouts on Desktop (1280px), Tablet (768px), and Mobile (375px).
  - Keyboard navigation, visible focus indicators, screen reader accessible labels, and non-color status cues.

### 3.2 Explicitly Excluded (Per Handout §4.2)
- Automatic SLA clocks, escalation engines, on-call scheduling, and breach notifications.
- Email, SMS, LINE, push, or external notification services.
- Inventory consumption, spare-parts management, purchasing, or cost accounting for services.
- Time-sheet billing, payroll, or detailed labor-cost calculation.
- Multi-level approval workflows and electronic signatures.
- Advanced business-intelligence tools, custom report builders, or export warehouses.
- Multi-tenant organizations and production-scale cloud operations.
- New product features not approved in this Sprint 4 engineering contract.

---

## 4. Functional Requirements (FR: R01 – R20)

- **FR-01 (Action Creation & Attributes):** Permitted IT Staff and Administrators can add an Action Taken under any accessible Ticket, specifying `actionDateTime` (input via local browser timezone avoiding UTC skew, serialized to ISO-8601 UTC, <= now + 5m), `actionDescription` (1–1000 chars), `status` (`PENDING` or `COMPLETED`), optional `assigneeId`, `result` (mandatory if completed), `followUpRequired`, `followUpNote` (required if follow-up checked), `attachmentNotes` (max 500 chars), and optional `clientRequestId` (UUIDv4).
- **FR-02 (Server Actor Attribution):** The backend automatically records `createdById` from the authenticated session. If completed, `performedById` is set to the session user. Clients cannot spoof or override actor identity.
- **FR-03 (Action Assignment & Inactive Rejection):** Actions can be assigned to an active IT Staff or Administrator. The eligible assignee list is provided via `GET /api/staff/ticket-owners` (expanded to authorize both `IT_STAFF` and `ADMINISTRATOR`). If `assigneeId` targets a non-existent, inactive, or non-staff user, the backend rejects with `422 Unprocessable Entity` (`INVALID_ASSIGNEE`).
- **FR-04 (Action Status Transitions):** Permitted staff can transition a `PENDING` action to `COMPLETED` (providing required `result`) or `CANCELLED`, supplying `expectedVersion`.
- **FR-05 (Action Editing & Permissions):** IT Staff/Admin can edit details of `PENDING` actions. For `COMPLETED` actions, only the original performer (`performedById === currentUser.id`) or an Administrator can edit description, follow-up, or attachment notes. Parent tickets in `RESOLVED`, `CLOSED`, or `CANCELLED` lock all Actions Taken as immutable.
- **FR-06 (Parent Ticket Multiple Actions):** A Ticket supports an arbitrary number of Actions Taken (0, 1, or many), presented in stable chronological order (`actionDateTime ASC, id ASC`).
- **FR-07 (Requester Read-Only Visibility):** Requesters can view **all** Actions Taken (`PENDING`, `COMPLETED`, `CANCELLED`) on tickets that they own. The interface is strictly read-only with no modification controls. Accessing actions on foreign tickets returns strictly `403 Forbidden` (`Access denied: You do not own this ticket`).
- **FR-08 (Internal Notes Confidentiality):** Actions Taken responses do not expose or leak `InternalNotes`. Internal Notes remain strictly hidden from Requesters.
- **FR-09 (Backend Resolution Gate):** A Ticket transition to `RESOLVED` requires that the ticket has >= 1 `COMPLETED` Action Taken and 0 `PENDING` Actions Taken. Direct API calls violating this condition receive `422 Unprocessable Entity` (`RESOLUTION_GATE_FAILED`).
- **FR-10 (Legacy Ticket Resolution Handling):** Legacy tickets from Labs 1–3 without Actions Taken cannot be resolved without first logging at least one completed Action Taken. Existing resolved/closed legacy tickets remain valid and unmodified.
- **FR-11 (Requester Advisory Status):** Requester "Problem Appears Resolved" remains strictly advisory and does not automatically transition the ticket status to `RESOLVED`.
- **FR-12 (Concurrency & Stale Update Protection):** Ticket status and assignment updates require current `expectedVersion`. Action updates require action `expectedVersion`. Mismatched versions return `409 Conflict` (`CONFLICT`).
- **FR-13 (Requester Dashboard Metrics):** Endpoint `GET /api/dashboard/requester` returns authenticated requester's counts for Open tickets, Waiting for Requester, Recently updated (7 days), and Recently resolved (7 days), plus up to 5 recent tickets.
- **FR-14 (IT Staff Dashboard Metrics):** Endpoint `GET /api/dashboard/staff` returns operational metrics: Unassigned tickets, My Assigned tickets, Open queue tickets, Waiting for Requester, and My Actions Taken count, plus up to 5 recent/urgent tickets and up to 5 my recent actions.
- **FR-15 (Administrator Dashboard Summary):** Endpoint `GET /api/dashboard/admin` returns all IT Staff dashboard metrics plus user-account statistics (`totalUsers`, `activeUsers`, `usersByRole`).
- **FR-16 (Authoritative Metric Queries):** All dashboard metrics are calculated authoritatively on the backend using targeted SQL aggregation queries; full collections are never dumped to the frontend.
- **FR-17 (Dashboard Drill-Down Navigation):** Every dashboard metric card and list item links directly to the corresponding filtered view in My Tickets, Staff Queue, or Ticket Detail with exact count-to-drilldown parity.
- **FR-18 (Zen Green Theme & UI Consistency):** Dashboard and Actions Taken interfaces strictly preserve Zen Green tokens, typography, badges, cards, and buttons established in Labs 2 and 3.
- **FR-19 (Multi-Viewport Responsiveness & A11y):** All new screens and components function cleanly without clipping, overflow, or broken controls on Desktop (1280px), Tablet (768px), and Mobile (375px), supporting keyboard navigation and WCAG AA contrast.
- **FR-20 (Full System Regression):** All features from Labs 1–3 (authentication, password changes, ticket creation, attachments, comments, notes, user admin) continue to operate with zero regression.

---

## 5. Business Rules (BR)

### 5.1 Action Taken Rules
- **BR-01 (Ticket Parent Constraint):** Every Action Taken belongs to exactly one Ticket (`ticketId` is required, immutable, and foreign-keyed to `Ticket.id`).
- **BR-02 (Performer vs Ticket Owner Independence):** The primary Ticket Owner coordinates the Ticket, but an Action Taken may be created, assigned to, or performed by any eligible IT Staff member or Administrator (Handout §4.4 BR-02).
- **BR-03 (Automated Performer Attribution):** `createdById` is populated by the backend from the active session `req.user.id`. When completed, `performedById` is recorded.
- **BR-04 (Assignee Role & Active State Validation):** If `assigneeId` is specified, the user must exist, have role `IT_STAFF` or `ADMINISTRATOR`, and have `isActive === true`. Otherwise, the backend rejects with `422 Unprocessable Entity` (`INVALID_ASSIGNEE`).
- **BR-05 (Action Statuses & Transitions):**
  - Allowed statuses: `PENDING`, `COMPLETED`, `CANCELLED`.
  - Allowed transitions: `PENDING` -> `COMPLETED`, `PENDING` -> `CANCELLED`.
  - A `COMPLETED` or `CANCELLED` action cannot be reverted back to `PENDING`.
- **BR-06 (Action Result Requirement):** `result` is mandatory (non-empty string, 1–1000 chars) when an action is created as or transitioned to `COMPLETED`.
- **BR-07 (Follow-Up Conditional Requirement):** When `followUpRequired === true`, `followUpNote` is mandatory (non-empty string, 1–1000 chars). When `followUpRequired === false`, `followUpNote` is stored as `null`. Follow-up is an informational audit trail.
- **BR-08 (Action Event Time Validation & Local Timezone Formatting):** In the frontend, `<input type="datetime-local">` must format timestamps in the browser's local timezone (`YYYY-MM-DDTHH:mm`), avoiding the 7-hour timezone skew that occurs when using UTC ISO strings in regions such as Thailand (UTC+7). On submission, the local value is serialized to UTC ISO-8601. On the backend, `actionDateTime` cannot exceed current server time plus a 5-minute clock-skew tolerance (`actionDateTime <= now() + 5m`). Future dates beyond tolerance are rejected with `400 Bad Request` (`VALIDATION_FAILED`).
- **BR-09 (Attachment Notes Boundary):** `attachmentNotes` is an optional text field (max 500 chars) used to reference ticket attachment filenames or external artifacts.
- **BR-10 (Ticket Terminal State Locking):** If parent `Ticket.currentStatus` is in (`RESOLVED`, `CLOSED`, `CANCELLED`), all Actions Taken under that ticket are strictly read-only; no new actions may be added and existing actions cannot be edited, completed, or cancelled (400 Bad Request `BAD_REQUEST`).
- **BR-11 (Nested Resource Integrity):** `actionId` must belong to the `:id` (ticketId) specified in the URL path. Mismatches return `404 Not Found` (`NOT_FOUND`).

### 5.2 Ticket Workflow & Resolution Gate Rules
- **BR-12 (Resolution Gate Prerequisite):** Transitioning a ticket to `RESOLVED` requires:
  1. The ticket has at least one Action Taken with `status === 'COMPLETED'`.
  2. The ticket has zero Actions Taken with `status === 'PENDING'`.
  Attempting to resolve without satisfying both rules returns `422 Unprocessable Entity` (`RESOLUTION_GATE_FAILED`).
- **BR-13 (Permitted Ticket Transitions & Delta Inheritance):**
  - Inherits the complete 64-status transition matrix from Lab 3: exactly 17 allowed transitions, 47 rejected.
  - Only `CANCELLED` is terminal. `CLOSED` can transition to `REOPENED`.
  - Transitions to `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, or `RESOLVED` require an active eligible owner (400 `ELIGIBLE_OWNER_REQUIRED`).
  - Reopening clears `appearsResolvedAt` and `appearsResolvedById`.
- **BR-14 (Atomic Concurrency Protection):** Every status transition and ticket ownership change requires `expectedVersion`. If `expectedVersion !== ticket.version`, transaction aborts with `409 Conflict` (`CONFLICT`). Action updates check `ActionTaken.expectedVersion`. All action mutations acquire a row lock on `Ticket` and increment parent `Ticket.version`.
- **BR-15 (Requester Resolution Independence):** Requesters indicating `appearsResolved` sets `appearsResolvedAt` and `appearsResolvedById` on the ticket, but does not modify `currentStatus`. Only IT Staff can formally execute status transitions.

### 5.3 Dashboard Calculation & Boundary Rules
- **BR-16 (Authoritative Scoping):**
  - Requester metrics include only tickets where `requesterId === currentUser.id`.
  - Staff metrics aggregate tickets across the organization queue and identify personal workload (`ticketOwnerId === currentUser.id`, `performedById === currentUser.id`).
- **BR-17 (Time-Window Boundaries):** The "Recently Updated" and "Recently Resolved" metrics use a rolling 7-day window evaluated in UTC: `updatedAt >= NOW() - INTERVAL '7 days'`.
- **BR-18 (Metric Drill-Down Consistency):** The total count reported on a dashboard card must exactly equal the number of matching records returned when navigating to the target drill-down route with the specified query parameters.

---

## 6. UI Specification Summary

Reference: [ui-spec.md](file:///d:/toktickit/docs/lab-04/ui-spec.md)

### 6.1 IT Staff Dashboard Screen (`/staff/dashboard`)
- **5 Metric Cards Row:**
  - `Unassigned Tickets` -> Links to `/staff/queue?owner=unassigned&statusGroup=open`
  - `My Assigned Tickets` -> Links to `/staff/queue?owner=me&statusGroup=active`
  - `Total Open Queue` -> Links to `/staff/queue?statusGroup=open`
  - `Waiting for Requester` -> Links to `/staff/queue?status=WAITING_FOR_REQUESTER`
  - `My Actions Taken` (Completed actions count by current staff)
- **Status & Priority Breakdown:** Pill charts for 8 statuses and 3 priorities.
- **Recent or Urgent Tickets Table:** Top 5 tickets prioritizing `itPriority === HIGH` followed by `updatedAt DESC`.
- **My Recent Actions Feed:** Up to 5 recent actions performed by the current user (`performedById === currentUser.id`).

### 6.2 Requester Dashboard Screen (`/dashboard`)
- **4 Metric Cards Row:**
  - `Total Open Tickets` -> Links to `/my-tickets?statusGroup=open`
  - `Waiting for My Response` -> Links to `/my-tickets?status=WAITING_FOR_REQUESTER`
  - `Recently Updated` (Last 7 Days) -> Links to `/my-tickets?recent=7d`
  - `Recently Resolved` (Last 7 Days) -> Links to `/my-tickets?status=RESOLVED&recent=7d`
- **Recent Tickets List:** 5 most active tickets with status badges and links to `/tickets/:id`.
- **Quick Action Bar:** Direct button to Create Ticket (`/create-ticket`).

### 6.3 Administrator Dashboard Screen (`/admin/dashboard`)
- Extends IT Staff Dashboard with an Administrative Statistics Card:
  - User counts: Total, Active, Inactive, and breakdown by Role.
  - Link to `/admin/users`.
  - Ticket links navigate to `/admin/tickets/:id`.

### 6.4 Actions Taken Area in Ticket Detail (`/staff/tickets/:id` & `/tickets/:id`)
- **Staff / Admin View:**
  - Actions Taken section below ticket description.
  - "Log Action" modal button (disabled if ticket is Resolved, Closed or Cancelled).
  - List of actions with Date/Time, Status badge, Description, Result, Performer, Assignee, Follow-Up details, Attachment notes.
  - Action controls: "Complete Action" modal, "Cancel Action" confirmation, "Edit Details" (for pending, or completed by performer/admin).
- **Requester View:**
  - Read-only list of **all** Actions Taken for owned tickets (`PENDING`, `COMPLETED`, `CANCELLED`).
  - Strict confidentiality: Zero display or leakage of Internal Notes.

---

## 7. Data Changes & Database Design Decisions

### 7.1 New Database Model: `ActionTaken`
```prisma
enum ActionStatus {
  PENDING
  COMPLETED
  CANCELLED
}

model ActionTaken {
  id                Int          @id @default(autoincrement())
  ticketId          Int
  ticket            Ticket       @relation(fields: [ticketId], references: [id], onDelete: Cascade)

  actionDateTime    DateTime     @default(now())
  actionDescription String
  result            String?
  status            ActionStatus @default(COMPLETED)

  createdById       Int
  createdBy         User         @relation("ActionCreator", fields: [createdById], references: [id])

  performedById     Int?
  performedBy       User?        @relation("ActionPerformer", fields: [performedById], references: [id])

  assigneeId        Int?
  assignee          User?        @relation("ActionAssignee", fields: [assigneeId], references: [id])

  followUpRequired  Boolean      @default(false)
  followUpNote      String?
  attachmentNotes   String?

  version            Int          @default(1)
  clientRequestId    String?
  requestPayloadHash String?

  createdAt          DateTime     @default(now())
  updatedAt          DateTime     @updatedAt

  @@index([ticketId, actionDateTime])
  @@index([performedById])
  @@index([assigneeId])
  @@index([status])
  @@unique([createdById, ticketId, clientRequestId])
}
```

### 7.2 Relations Added to Existing `User` Model
```prisma
model User {
  // ... existing fields ...
  actionsCreated   ActionTaken[] @relation("ActionCreator")
  actionsPerformed ActionTaken[] @relation("ActionPerformer")
  actionsAssigned  ActionTaken[] @relation("ActionAssignee")
}
```

### 7.3 Relations Added to Existing `Ticket` Model
```prisma
model Ticket {
  // ... existing fields ...
  actionsTaken ActionTaken[]
}
```

### 7.4 Justification of Database Design Decisions (Mandatory per Handout §5.1)
1. **Decision 1: Actor Separation (`createdById`, `performedById`, `assigneeId`) with Action Lifecycle & Persistent Idempotency**
   - *Justification:* Supports the real-world operational requirement where a coordinator creates an action and assigns it to another staff member, who subsequently executes it and logs the result. Separating these three fields allows precise metrics tracking and enables strict authorization of completed action edits. Adding `version: Int` ensures concurrent edits on the same action are safely rejected with `409 Conflict`. Storing `clientRequestId` and `requestPayloadHash` with `@@unique([createdById, ticketId, clientRequestId])` ensures atomic, persistent protection against network retries across process restarts, guaranteeing that retries of identical creation requests by the same user succeed with `200 OK` even if the created action is later updated or the parent ticket is subsequently resolved/closed, while isolating key namespaces per user.
2. **Decision 2: Optimistic Concurrency Invariant Linking Actions to Parent Ticket Version**
   - *Justification:* Resolution gate checks require that zero pending actions exist and at least one completed action exists. Having all action mutations acquire a row lock on `Ticket` and increment parent `Ticket.version` guarantees that any attempt to resolve a ticket while an action is being concurrently added or modified encounters a version conflict (`409 Conflict`), eliminating race conditions between action logging and ticket resolution.

---

## 8. REST API Contract Summary

Reference: [api-spec.md](file:///d:/toktickit/docs/lab-04/api-spec.md)

### 8.1 Actions Taken Endpoints
- `GET /api/tickets/:id/actions`: List all Actions Taken for a ticket (Requester owned, Staff/Admin all).
- `POST /api/tickets/:id/actions`: Create new Action Taken (Staff/Admin only; supports `clientRequestId`, 201 created vs 200 replay).
- `PATCH /api/tickets/:id/actions/:actionId`: Update action details / assignment (Staff/Admin only; checks `expectedVersion`).
- `POST /api/tickets/:id/actions/:actionId/complete`: Mark action completed with result (Staff/Admin only; checks `expectedVersion`).
- `POST /api/tickets/:id/actions/:actionId/cancel`: Mark action cancelled (Staff/Admin only; checks `expectedVersion`).

### 8.2 Ticket Status & Resolution Endpoint
- `PATCH /api/staff/tickets/:id/status`: Transition ticket status. Validates resolution gate on `RESOLVED` and verifies `expectedVersion`.

### 8.3 Dashboard Endpoints
- `GET /api/dashboard/requester`: Requester metrics and recent tickets.
- `GET /api/dashboard/staff`: Operational queue metrics, current-user actions count, recent/urgent tickets.
- `GET /api/dashboard/admin`: Staff metrics + administrative user counts.

---

## 9. Acceptance Criteria (AC: AC-01 – AC-35)

- **AC-01:** Given an authenticated IT Staff member and valid action payload, when creating an Action Taken, then it is saved under the ticket with `createdById` and `performedById` set to the caller's user ID and status `COMPLETED`.
- **AC-02:** Given an authenticated IT Staff member creating an action with status `PENDING` and a valid `assigneeId`, when submitted, then the action is created with the specified assignee and `performedById` is null.
- **AC-03:** Given an IT Staff member creating or reassigning an action with an `assigneeId` belonging to an inactive user or a requester, then the server rejects with `422 Unprocessable Entity` (`INVALID_ASSIGNEE`).
- **AC-04:** Given an action with `followUpRequired === true`, when submitted without `followUpNote`, then the server rejects with `400 Bad Request`.
- **AC-05:** Given an action with status `COMPLETED`, when submitted without `result`, then the server rejects with `400 Bad Request`.
- **AC-06:** Given an action with `actionDateTime` set in the future (> now + 5 min), then the server rejects with `400 Bad Request`.
- **AC-07:** Given a `PENDING` action, when an IT Staff member calls the complete endpoint with a non-empty `result` and valid `expectedVersion`, then its status transitions to `COMPLETED`, `performedById` is set to caller, and parent `Ticket.version` increments.
- **AC-08:** Given a `PENDING` action, when an IT Staff member calls the cancel endpoint with valid `expectedVersion`, then its status transitions to `CANCELLED` and parent `Ticket.version` increments.
- **AC-09:** Given a `COMPLETED` action, when attempting to transition back to `PENDING`, then the server rejects with `400 Bad Request`.
- **AC-10:** Given a Ticket in `RESOLVED`, `CLOSED`, or `CANCELLED` status, when attempting to create, edit, complete, or cancel an Action Taken, then the server rejects with `400 Bad Request` (`BAD_REQUEST`).
- **AC-11:** Given an authenticated Requester viewing an owned Ticket, when fetching actions, then **all** Actions Taken (`PENDING`, `COMPLETED`, `CANCELLED`) for that ticket are returned in chronological order.
- **AC-12:** Given an authenticated Requester attempting to create, edit, or transition an Action Taken, then the server rejects with `403 Forbidden`.
- **AC-13:** Given an authenticated Requester attempting to view actions for another user's Ticket, then the server rejects strictly with `403 Forbidden` (`Access denied: You do not own this ticket`).
- **AC-14:** Given a Ticket with 0 Actions Taken, when an IT Staff member attempts to transition status to `RESOLVED`, then the server rejects with `422 Unprocessable Entity` (`RESOLUTION_GATE_FAILED`).
- **AC-15:** Given a Ticket with only `PENDING` Actions Taken, when attempting to transition status to `RESOLVED`, then the server rejects with `422 Unprocessable Entity` (`RESOLUTION_GATE_FAILED`).
- **AC-16:** Given a Ticket with at least one `COMPLETED` Action Taken and zero `PENDING` actions, when transitioning status to `RESOLVED`, then the status updates successfully and ticket `version` increments.
- **AC-17:** Given a concurrent status transition with a stale `expectedVersion`, then the server rejects with `409 Conflict` (`CONFLICT`).
- **AC-18:** Given an authenticated Requester, when calling `GET /api/dashboard/requester`, then returned metrics and recent tickets reflect only tickets owned by that requester.
- **AC-19:** Given an authenticated IT Staff member, when calling `GET /api/dashboard/staff`, then operational metrics (`unassignedTickets`, `myAssignedTickets`, `openQueueTickets`, `ticketsWaitingForRequester`, `myActionsTakenCount`) and recent/urgent tickets are returned.
- **AC-20:** Given an authenticated Administrator, when calling `GET /api/dashboard/admin`, then IT Staff metrics plus user-account metrics (`totalUsers`, `activeUsers`, `usersByRole`) are returned.
- **AC-21:** Given an unauthenticated or unauthorized role accessing `/api/dashboard/staff` or `/api/dashboard/admin`, then the server returns `401 Unauthorized` or `403 Forbidden`.
- **AC-22:** Given the Requester Dashboard UI, clicking a metric card navigates to `/my-tickets` with the exact corresponding shared filter applied.
- **AC-23:** Given the Staff Dashboard UI, clicking the "Unassigned Tickets" card navigates to `/staff/queue?owner=unassigned&statusGroup=open`.
- **AC-24:** Given the Staff Dashboard UI, clicking "My Assigned Tickets" navigates to `/staff/queue?owner=me&statusGroup=active`.
- **AC-25:** Given the Staff Ticket Detail UI, multiple Actions Taken are displayed in chronological order with distinct badges for status and follow-up.
- **AC-26:** Given the Requester Ticket Detail UI, the Actions Taken area is rendered in read-only mode showing all actions without create/edit/transition buttons.
- **AC-27:** Given a form submission in progress on Actions Taken, form inputs and submit buttons are disabled to prevent duplicate submissions.
- **AC-28:** Given a recoverable network error during action creation, entered form fields are preserved so the user does not lose input and reuses the same `clientRequestId`.
- **AC-29:** Given a user switching between accounts, dashboard data refreshes immediately without displaying stale cached data from the prior user.
- **AC-30:** Given any Lab 4 screen, layout renders cleanly on Desktop (1280px), Tablet (768px), and Mobile (375px) without horizontal scrolling or overlapping elements.
- **AC-31:** Given any interactive element on the new screens, keyboard focus is visible and all modal dialogs trap focus correctly.
- **AC-32:** Given existing Lab 1 and Lab 2 features (ticket creation, attachments, soft-remove, category listing), all regression tests pass without regression.
- **AC-33:** Given existing Lab 3 features (authentication, password change, RBAC, comments, notes, user admin), all regression tests pass without regression.
- **AC-34:** Given the idempotent seed script, executing it twice leaves all records, counts, and credentials intact without creating duplicate rows or erroring.
- **AC-35:** Given the migration script, applying it to a database populated with Lab 1–3 data preserves all existing users, tickets, comments, notes, and attachment records without data loss.

---

## 10. Product Definition of Done (DoD)

- [ ] All 35 Acceptance Criteria (AC-01 through AC-35) have corresponding automated tests passing in disposable test environment.
- [ ] Backend resolution gate strictly prevents resolving tickets lacking completed actions.
- [ ] Inactive assignee rejection verified on action creation and assignment.
- [ ] Dashboard metrics verified against independent SQL database queries.
- [ ] Requester privacy strictly maintained: no access to foreign tickets and zero leakage of Internal Notes.
- [ ] Optimistic locking verified for concurrent status transitions and action mutations (`409 Conflict`).
- [ ] Clean builds on server (`tsc`) and client (`tsc && vite build`) with zero TypeScript errors.
- [ ] Full regression suite across Labs 1, 2, 3, and 4 passing with zero skipped tests.
- [ ] Visual inspection and accessibility verified across 3 viewports (Desktop, Tablet, Mobile) with captured screenshots.
- [ ] Single submission PDF prepared matching Answer Part 1 through Part 9 according to rubric.

---

## 11. Assumptions & Decisions Reference

Cross-reference: [decisions.md](file:///d:/toktickit/docs/lab-04/decisions.md)
- D01: Separated `createdById`, `performedById`, and `assigneeId`; statuses `PENDING`, `COMPLETED`, `CANCELLED`; inactive assignee rejected with 422 `INVALID_ASSIGNEE`; action versioning.
- D02: Resolution gate requires >= 1 completed action and 0 pending actions; legacy zero-action tickets cannot be resolved until an action is added; atomic transaction serialization with row lock.
- D03: Append-only integrity for comments, notes, and ticket history without extra history tables; pending actions editable; completed actions editable only by original performer or Admin; locked when resolved/closed/cancelled.
- D04: Requesters view all actions for owned tickets in read-only mode; internal notes strictly isolated; foreign ticket access returns 403 `Access denied: You do not own this ticket`.
- D05: Authoritative backend dashboard metrics with 7-day rolling window for recent activity; 1-to-1 metric card to drill-down mapping; `statusGroup` query parameter.
- D06: `actionDateTime` represents event time (<= now + 5m); `createdAt` is immutable server timestamp.
- D07: Administrator role has full staff capabilities for Actions Taken; ticket status transition endpoint preserves Lab 3 IT_STAFF access; queue read access extended to Admin.
- D08: Minimal scope patch proposal for `AGENTS.md` targeting `lab4-staging`.
- D09: Optimistic concurrency using `Ticket.version` and `ActionTaken.version`; persistent idempotent retry scoped to `(createdById, ticketId, clientRequestId)` with canonical `requestPayloadHash` (201 create vs 200 replay).
- D10: Database recovery sandbox backup/restore verification procedure.
