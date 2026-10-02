# TokTickIT — Test Plan & Traceability Matrix (Lab 4)

**Document Version:** 1.2.0 (Revised following F1-Review Round 2 Findings)  
**Status:** PROPOSED TEST PLAN (Sprint 4 F1 / L4-P02)  
**Standard Compliance:** CPE 334 Lab 4 Handout (`SE-Lab-4.pdf`, §10, §14 Part 3), `GEMINI-PIPELINE.md`, `F1-REVIEW-ROUND2.md`

---

## 1. Test Harness & Safety Protocols

### 1.1 Disposable Database Safeguard
- All backend integration and API tests run exclusively against the isolated disposable database:
  - Allowed DB Name Pattern: `/^toktickit_test(?:_[a-z0-9_]+)?$/i` (enforced by `server/src/config/testEnvironment.ts`).
  - Strict refusal if targeting the main development database `toktickit` or port 3000.
- Each test run uses a unique `TOKTICKIT_TEST_RUN_ID` for isolated file uploads (`server/test-uploads/<runId>/`).

### 1.2 Performance Smoke Specification (DoD Gate)
- **Target Environment:** Disposable PostgreSQL database `toktickit_test`.
- **Dataset Size:** 500 tickets and 1,000 ActionTaken records seeded in sandbox.
- **Protocol:**
  - 5 warm-up requests.
  - 50 consecutive sample requests to `GET /api/dashboard/staff` and `GET /api/dashboard/requester`.
  - Metric: 95th percentile (p95) response latency must be `< 200ms`.
- **Run Command:** `npm --prefix server test -- tests/lab-04/performance-smoke.test.ts`.

### 1.3 Test Layout in Workspace
```text
server/tests/lab-04/
├── action-validation.unit.test.ts
├── actions-taken.api.test.ts
├── ticket-workflow.api.test.ts
├── requester-dashboard.api.test.ts
├── staff-dashboard.api.test.ts
├── migration-preservation.test.ts
└── performance-smoke.test.ts

client/tests/lab-04/
├── ZenGreenTokens.test.tsx
├── Dashboard.test.tsx
├── DashboardRouting.test.tsx
├── ActionsTaken.test.tsx
└── TicketWorkflow.test.tsx

e2e/lab-04/
├── actions-taken-flow.spec.ts
├── ticket-resolution.spec.ts
└── dashboards.spec.ts
```

---

## 2. Comprehensive Acceptance Criteria to Test Mapping Matrix

| Test ID | Level / Type | Target AC / FR | Description / Scenario | Expected Result | Automated Test File | Status |
|---|---|---|---|---|---|---|
| **UNIT-L4-01** | Unit | BR-08 | Action event datetime validation with 5m clock-skew tolerance | Rejects date > now + 5m, accepts now, accepts backdated date | `server/tests/lab-04/action-validation.unit.test.ts` | Passed |
| **UNIT-L4-01b** | Unit | BR-08, F3 carry-over | Reject non-string/non-ISO action datetime values while retaining default and clock-skew behavior | Invalid types/formats rejected; omitted date defaults to now | `server/tests/lab-04/action-validation.unit.test.ts` | Passed (F3, 2026-10-02) |
| **UNIT-L4-02** | Unit | D09 | Idempotency UUIDv4 format validation | Valid UUIDv4 passes; malformed strings return validation failure | `server/tests/lab-04/action-validation.unit.test.ts` | Passed |
| **STYLE-L4-01** | Style | FR-18 | Zen Green CSS token values verification | Assert `--zg-primary: #006B3C`, `--zg-secondary: #0B7A46`, `--zg-canvas: #F5F7F6`, `--zg-warning: #D97706`, `--zg-success: #15803D` | `client/tests/lab-04/ZenGreenTokens.test.tsx` | Passed |
| **STYLE-L4-02** | Style | FR-18 | Action status badge styling & token mapping | Assert `PENDING` (#FEF3C7/#92400E), `COMPLETED` (#DCFCE7/#15803D), `CANCELLED` (#F3F4F6/#4B5563) | `client/tests/lab-04/ZenGreenTokens.test.tsx` | Passed |
| **API-L4-01** | API | AC-01, FR-01 | Create completed Action Taken with valid data | 201 Created, `createdById` and `performedById` set to caller, status `COMPLETED` | `server/tests/lab-04/actions-taken.api.test.ts` | Passed |
| **API-L4-02** | API | AC-02, FR-01 | Create pending Action Taken with active staff assignee | 201 Created, `assigneeId` set, `performedById` is null, status `PENDING` | `server/tests/lab-04/actions-taken.api.test.ts` | Passed |
| **API-L4-03** | API | AC-03, BR-04 | Create or reassign Action Taken targeting inactive or non-staff assignee | 422 Unprocessable Entity (`INVALID_ASSIGNEE`) on create and PATCH | `server/tests/lab-04/actions-taken.api.test.ts` | Passed |
| **API-L4-04** | API | AC-04, BR-07 | Create Action Taken with `followUpRequired=true` without note | 400 Bad Request, validation error | `server/tests/lab-04/actions-taken.api.test.ts` | Passed |
| **API-L4-05** | API | AC-05, BR-06 | Create completed Action Taken without `result` | 400 Bad Request, result required | `server/tests/lab-04/actions-taken.api.test.ts` | Passed |
| **API-L4-06** | API | AC-06, BR-08 | Create Action Taken with future `actionDateTime` (> now + 5m) | 400 Bad Request, future date rejected | `server/tests/lab-04/actions-taken.api.test.ts` | Passed |
| **API-L4-07** | API | AC-07, FR-04 | Transition pending action to completed with result & expectedVersion | 200 OK, status `COMPLETED`, `performedById` set, parent ticket version increments | `server/tests/lab-04/actions-taken.api.test.ts` | Passed |
| **API-L4-07b** | API | FR-04, D13 | Complete pending action with invalid or non-string result returns 400 | 400 Bad Request (`VALIDATION_FAILED`), no unhandled TypeError | `server/tests/lab-04/actions-taken.api.test.ts` | Passed |
| **API-L4-08** | API | AC-08, FR-04 | Cancel pending action with expectedVersion | 200 OK, status `CANCELLED`, parent ticket version increments | `server/tests/lab-04/actions-taken.api.test.ts` | Passed |
| **API-L4-09** | API | AC-09, BR-05 | Attempt transition of completed or cancelled action back to pending | 400 Bad Request, invalid transition | `server/tests/lab-04/actions-taken.api.test.ts` | Passed |
| **API-L4-10a** | API | AC-10, BR-10 | Attempt creating action on a RESOLVED, CLOSED, or CANCELLED ticket | 400 Bad Request (`BAD_REQUEST`), ticket locked across all 3 terminal statuses | `server/tests/lab-04/actions-taken.api.test.ts` | Passed |
| **API-L4-10b** | API | AC-10, BR-10 | Attempt editing, completing, or cancelling action on RESOLVED, CLOSED, or CANCELLED ticket | 400 Bad Request (`BAD_REQUEST`), action locked across all 3 terminal statuses | `server/tests/lab-04/actions-taken.api.test.ts` | Passed |
| **API-L4-11** | API | AC-11, FR-07 | Requester lists actions on owned ticket | 200 OK, returns ALL actions (`PENDING`, `COMPLETED`, `CANCELLED`) in chronological order | `server/tests/lab-04/actions-taken.api.test.ts` | Passed |
| **API-L4-12** | API | AC-12, FR-07 | Requester attempts to create, edit, complete, or cancel an action | 403 Forbidden | `server/tests/lab-04/actions-taken.api.test.ts` | Passed |
| **API-L4-13** | API | AC-13, FR-07 | Requester attempts to list actions on another user's ticket | Strictly 403 Forbidden with exact baseline `{ "error": "Access denied: You do not own this ticket" }` | `server/tests/lab-04/actions-taken.api.test.ts` | Passed |
| **API-L4-14** | API | BR-11 | Mismatched actionId in URL path (actionId exists but belongs to different ticketId) | 404 Not Found (`NOT_FOUND`) | `server/tests/lab-04/actions-taken.api.test.ts` | Passed |
| **API-L4-14b** | API | BR-11, D13 | Closed or resolved ticket with mismatched or non-existent actionId | 404 Not Found (`NOT_FOUND`) takes precedence over 400 terminal lock | `server/tests/lab-04/actions-taken.api.test.ts` | Passed |
| **API-L4-15** | API | FR-05 | Non-performer Staff attempts to edit completed action | 403 Forbidden (only original performer or Admin allowed) | `server/tests/lab-04/actions-taken.api.test.ts` | Passed |
| **API-L4-16** | API | FR-05 | Original performer or Administrator edits completed action description/notes | 200 OK, updated fields saved, version increments | `server/tests/lab-04/actions-taken.api.test.ts` | Passed |
| **API-L4-17** | API | FR-08 | Confidentiality check: actions response does not leak internal notes | Assert response keys/body contain zero internal note text | `server/tests/lab-04/actions-taken.api.test.ts` | Passed |
| **API-L4-18** | API | AC-14, BR-12 | Transition ticket to RESOLVED with 0 actions taken (legacy & new) | 422 Unprocessable Entity (`RESOLUTION_GATE_FAILED`) | `server/tests/lab-04/ticket-workflow.api.test.ts` | Passed |
| **API-L4-19** | API | AC-15, BR-12 | Transition ticket to RESOLVED with only PENDING actions taken | 422 Unprocessable Entity (`RESOLUTION_GATE_FAILED`) | `server/tests/lab-04/ticket-workflow.api.test.ts` | Passed |
| **API-L4-20** | API | AC-16, BR-12 | Transition ticket to RESOLVED with >= 1 COMPLETED and 0 PENDING | 200 OK, status `RESOLVED`, ticket `version` incremented | `server/tests/lab-04/ticket-workflow.api.test.ts` | Passed |
| **API-L4-21** | API | AC-17, BR-14 | Transition ticket status with stale `expectedVersion` | 409 Conflict (`CONFLICT`) with exact baseline message | `server/tests/lab-04/ticket-workflow.api.test.ts` | Passed |
| **API-L4-22** | API | D09, BR-14 | Concurrent action edit with stale action `expectedVersion` | 409 Conflict (`CONFLICT`) | `server/tests/lab-04/actions-taken.api.test.ts` | Passed |
| **API-L4-22b** | API | D13, BR-14 | PATCH returns 400 VALIDATION_FAILED when expectedVersion missing/non-positive | 400 Bad Request (`VALIDATION_FAILED`), version guard enforced | `server/tests/lab-04/actions-taken.api.test.ts` | Passed |
| **API-L4-22c** | API | D13, BR-14 | Complete returns 400 VALIDATION_FAILED when expectedVersion missing or result empty | 400 Bad Request (`VALIDATION_FAILED`), result and version required | `server/tests/lab-04/actions-taken.api.test.ts` | Passed |
| **API-L4-22d** | API | D13, BR-14 | Cancel returns 400 VALIDATION_FAILED when expectedVersion missing | 400 Bad Request (`VALIDATION_FAILED`), version required | `server/tests/lab-04/actions-taken.api.test.ts` | Passed |
| **API-L4-22e** | API | BR-07 | PATCH returns 400 VALIDATION_FAILED when followUpRequired true without followUpNote | 400 Bad Request (`VALIDATION_FAILED`) | `server/tests/lab-04/actions-taken.api.test.ts` | Passed |
| **API-L4-22f** | API | BR-08 | POST returns 400 VALIDATION_FAILED when actionDateTime invalid or actionDescription non-string | 400 Bad Request (`VALIDATION_FAILED`), clean validation error | `server/tests/lab-04/actions-taken.api.test.ts` | Passed |
| **API-L4-22g** | API | BR-05 | POST returns 400 VALIDATION_FAILED when status is invalid | 400 Bad Request (`VALIDATION_FAILED`), status must be PENDING/COMPLETED | `server/tests/lab-04/actions-taken.api.test.ts` | Passed |
| **API-L4-22h** | API | BR-15 | Cancel returns 400 VALIDATION_FAILED when reason exceeds 500 characters | 400 Bad Request (`VALIDATION_FAILED`), length guard enforced | `server/tests/lab-04/actions-taken.api.test.ts` | Passed |
| **API-L4-22i** | API | BR-07 | PATCH returns 400 VALIDATION_FAILED when sending empty followUpNote on follow-up action | 400 Bad Request (`VALIDATION_FAILED`) | `server/tests/lab-04/actions-taken.api.test.ts` | Passed |
| **API-L4-22j** | API | FR-12, BR-14 | PATCH/complete/cancel reject boolean, array, string, object, and fractional JSON versions | 400 `VALIDATION_FAILED`; action and ticket versions unchanged | `server/tests/lab-04/actions-taken.api.test.ts` | Passed |
| **API-L4-22k** | API | BR-07 | POST/PATCH reject non-boolean follow-up flags | 400 `VALIDATION_FAILED`; no added actions or changed versions | `server/tests/lab-04/actions-taken.api.test.ts` | Passed |
| **API-L4-22l** | API | FR-04, D13 | Complete with valid If-Match and null attachment notes | 200; notes cleared in response and database | `server/tests/lab-04/actions-taken.api.test.ts` | Passed |
| **API-L4-22m** | API | BR-08, F3 carry-over | POST rejects non-string/non-ISO actionDateTime | 400 VALIDATION_FAILED; no added action or changed ticket version | `server/tests/lab-04/actions-taken.api.test.ts` | Passed (F3, 2026-10-02) |
| **API-L4-23a**| API | D02, BR-14 | Resolution race: Resolution commits before concurrent action create | Action create fails 400 Bad Request (ticket already resolved) | `server/tests/lab-04/ticket-workflow.api.test.ts` | Passed |
| **API-L4-23b**| API | D02, BR-14 | Resolution race: Action create commits before concurrent resolution | Resolution fails 409 Conflict (stale ticket version) | `server/tests/lab-04/ticket-workflow.api.test.ts` | Passed |
| **API-L4-23c**| API | D03, BR-10 | Parent Close/Cancel race: Ticket closed concurrently while action mutation in-flight | Action mutation fails 400 Bad Request (ticket terminal/locked) | `server/tests/lab-04/ticket-workflow.api.test.ts` | Passed |
| **API-L4-24a**| API | D09 | Idempotent network replay: same user + same ticket + same key + same payload | 200 OK with `X-Idempotent-Replay: true` header without creating duplicate row | `server/tests/lab-04/actions-taken.api.test.ts` | Passed |
| **API-L4-24b**| API | D09 | Idempotent payload mismatch: same scope (`createdById, ticketId, clientRequestId`) with different payload | 409 Conflict (`CONFLICT`) | `server/tests/lab-04/actions-taken.api.test.ts` | Passed |
| **API-L4-24c**| API | D09 | Idempotent key isolation across users: different user + same ticket + same key | 201 Created (two distinct actions created; keys isolated per `createdById`) | `server/tests/lab-04/actions-taken.api.test.ts` | Passed |
| **API-L4-24d**| API | D09 | Idempotent key scoping across tickets: same user + different ticket + same key | 201 Created (keys scoped to `ticketId` via `@@unique([createdById, ticketId, clientRequestId])`) | `server/tests/lab-04/actions-taken.api.test.ts` | Passed |
| **API-L4-24e**| API | D09 | Idempotent retry: mismatched header vs body `clientRequestId` | 400 Bad Request (`VALIDATION_FAILED`) | `server/tests/lab-04/actions-taken.api.test.ts` | Passed |
| **API-L4-24f**| API | D09 | Simultaneous concurrent retry: two identical requests by same user in exact same millisecond | One 201 Created, one 200 OK replay (serialized by row lock; exactly 1 row created) | `server/tests/lab-04/actions-taken.api.test.ts` | Passed |
| **API-L4-24g**| API | D09, BR-10 | Idempotent replay on resolved/closed ticket by same user | 200 OK replay with `X-Idempotent-Replay: true` (replay succeeds; not blocked by terminal check) | `server/tests/lab-04/actions-taken.api.test.ts` | Passed |
| **API-L4-24h**| API | D09, FR-05 | Idempotent replay after subsequent action mutation | 200 OK replay matching immutable `requestPayloadHash` (not rejected by 409) | `server/tests/lab-04/actions-taken.api.test.ts` | Passed |
| **API-L4-25a**| API | BR-13 | Status transitions matrix: verify all 17 permitted transitions | 200 OK on all 17 permitted pairs (including CLOSED->REOPENED) | `server/tests/lab-04/ticket-workflow.api.test.ts` | Passed |
| **API-L4-25b**| API | BR-13 | Status transitions matrix: verify all 47 rejected transitions | 400 Bad Request (`ILLEGAL_STATUS_TRANSITION`) on all 47 forbidden pairs | `server/tests/lab-04/ticket-workflow.api.test.ts` | Passed |
| **API-L4-26** | API | BR-13 | Transition requiring owner without eligible owner assigned | 400 Bad Request (`ELIGIBLE_OWNER_REQUIRED`) | `server/tests/lab-04/ticket-workflow.api.test.ts` | Passed |
| **API-L4-27** | API | AC-18, FR-13 | Requester dashboard metrics return only owned tickets data | 200 OK, accurate counts & recent tickets | `server/tests/lab-04/requester-dashboard.api.test.ts` | Passed (F3, 2026-10-02) |
| **API-L4-28** | API | D05, BR-17 | Fixed-clock 7-day boundary test: (boundary-1s excluded, boundary included, boundary+1s included) | 200 OK, exact window filtering verified with frozen clock | `server/tests/lab-04/requester-dashboard.api.test.ts` | Passed (F3, 2026-10-02) |
| **API-L4-29** | API | AC-19, FR-14 | IT Staff dashboard metrics return unassigned, assigned, statuses, my actions | 200 OK, accurate counts matching independent DB query | `server/tests/lab-04/staff-dashboard.api.test.ts` | Passed (F3, 2026-10-02) |
| **API-L4-30** | API | AC-20, FR-15 | Admin dashboard returns staff metrics + user account counts | 200 OK, user metrics included | `server/tests/lab-04/staff-dashboard.api.test.ts` | Passed (F3, 2026-10-02) |
| **API-L4-30b**| API | FR-03, D12 | Eligible assignees authorization: `GET /api/staff/ticket-owners` allows both IT_STAFF and ADMINISTRATOR | 200 OK on Staff and Admin; 403 on Requester | `server/tests/lab-04/actions-taken.api.test.ts` | Passed |
| **API-L4-31** | API | AC-21 | Unauthorized role access to staff/admin dashboard | 401 Unauthorized / 403 Forbidden | `server/tests/lab-04/staff-dashboard.api.test.ts` | Passed (F3, 2026-10-02) |
| **API-L4-32** | API | D05 | Zero-ticket state: user with 0 tickets receives 0 counts and empty arrays | 200 OK, 0 counts, no crashes | `server/tests/lab-04/requester-dashboard.api.test.ts` | Passed (F3, 2026-10-02) |
| **API-L4-33a**| API | D05, BR-18 | Staff count-to-drilldown parity: dashboard metric count equals matching tickets from queue API | Counts identical across queue filters (`owner=unassigned&statusGroup=open`, etc.) | `server/tests/lab-04/staff-dashboard.api.test.ts` | Passed (F3, 2026-10-02) |
| **API-L4-33b**| API | D05, BR-18 | Requester count-to-drilldown parity: dashboard recent counts equal list API with `recent=7d` | Counts identical across `/api/tickets?recent=7d` and `status=RESOLVED&recent=7d` | `server/tests/lab-04/requester-dashboard.api.test.ts` | Passed (F3, 2026-10-02) |
| **UI-L4-01** | Component | AC-22 | Requester dashboard card click triggers filter navigation | Navigates to `/my-tickets?statusGroup=open`, `recent=7d`, etc. | `client/tests/lab-04/Dashboard.test.tsx` | Passed (F3, 2026-10-02) |
| **UI-L4-02** | Component | AC-23 | Staff dashboard unassigned card click triggers queue navigation | Navigates to `/staff/queue?owner=unassigned&statusGroup=open` | `client/tests/lab-04/Dashboard.test.tsx` | Passed (F3, 2026-10-02) |
| **UI-L4-03** | Component | AC-24 | Staff dashboard my assigned card click triggers queue navigation | Navigates to `/staff/queue?owner=me&statusGroup=active` | `client/tests/lab-04/Dashboard.test.tsx` | Passed (F3, 2026-10-02) |
| **UI-L4-04** | Component | AC-25 | Actions Taken list in Ticket Detail displays items and badges in order | Chronological display, badges match Zen Green tokens | `client/tests/lab-04/ActionsTaken.test.tsx` | Passed |
| **UI-L4-04b**| Component | UI-4 | Actions Taken renders loading state and error state with retry button | Accessible loading spinner and retry CTA | `client/tests/lab-04/ActionsTaken.test.tsx` | Passed |
| **UI-L4-04c**| Component | UI-4 | Admin sees Log Action and Controls; Staff performer sees Edit on completed | Role-based action controls verified | `client/tests/lab-04/ActionsTaken.test.tsx` | Passed |
| **UI-L4-05** | Component | AC-26 | Log Action Taken modal opens with focus trap, validates max datetime and result | Validates max datetime and required result on complete | `client/tests/lab-04/ActionsTaken.test.tsx` | Passed |
| **UI-L4-05b**| Component | A11Y | Focus trap cycles focus inside modal dialog on Tab and Shift+Tab | Accessible modal navigation without leaving dialog | `client/tests/lab-04/ActionsTaken.test.tsx` | Passed |
| **UI-L4-06** | Component | AC-27 | Complete Action Taken modal requires result and calls complete handler | Result required, busy state handled | `client/tests/lab-04/ActionsTaken.test.tsx` | Passed |
| **UI-L4-06b** | Component | FR-04, API-2.4 | Clear existing attachment notes in Complete modal | Sends explicit null with result and expectedVersion | `client/tests/lab-04/ActionsTaken.test.tsx` | Passed |
| **UI-L4-07** | Component | AC-28 | Cancel Action Taken modal renders prompt and confirm button | Confirmation prompt and cancel handler verified | `client/tests/lab-04/ActionsTaken.test.tsx` | Passed |
| **UI-L4-08** | Component | AC-29 | Account switching refreshes dashboard without stale data | Fresh metrics rendered after login | `client/tests/lab-04/Dashboard.test.tsx` | Passed (F3, 2026-10-02) |
| **UI-L4-09** | Component | BR-12 | TicketWorkflow: Resolution gate error alert banner on modal when 0 actions | Renders 422 error banner with guidance | `client/tests/lab-04/TicketWorkflow.test.tsx` | Passed |
| **UI-L4-10** | Component | BR-14 | TicketWorkflow: 409 conflict renders reload banner | Stale update alerts user to reload page | `client/tests/lab-04/TicketWorkflow.test.tsx` | Passed |
| **UI-L4-11** | Component | FR-07 | Requester view: read-only Actions Taken list, zero mutation buttons | Renders pending/completed/cancelled without edit controls | `client/tests/lab-04/ActionsTaken.test.tsx` | Passed |
| **UI-L4-12** | Component | FR-08 | Requester view: confidentiality verified, internal notes are never rendered | Assert rendered HTML contains zero internal note text | `client/tests/lab-04/ActionsTaken.test.tsx` | Passed |
| **UI-L4-13** | Component | BR-08, D11 | Action date/time input formatted in local browser timezone without UTC skew | Input initializes and enforces max in local timezone (not UTC -7h) | `client/tests/lab-04/ActionsTaken.test.tsx` | Passed |
| **UI-L4-13b**| Component | BR-08, D11 | Fixed-clock assertion verifies local now and max = now + 5m boundary | Clock frozen, asserts exact local string format | `client/tests/lab-04/ActionsTaken.test.tsx` | Passed |
| **UI-L4-14** | Component | UI-4 | Modal locks close button, Escape key, and form inputs during submission | In-flight submission guards prevent duplicate clicks | `client/tests/lab-04/ActionsTaken.test.tsx` | Passed |
| **UI-L4-15** | Component | UI-spec:208| Mobile (<768px): Actions Taken renders responsive card list (not table) | Date/time, badges, description, result, assignee, follow-up, staff buttons | `client/tests/lab-04/ActionsTaken.test.tsx` | Passed |
| **UI-L4-16** | Component | FR-03, UI-4 | Eligible-assignee lookup fails and user retries | Visible error; assignment controls disabled until successful retry restores choices | `client/tests/lab-04/TicketWorkflow.test.tsx` | Passed |
| **UI-L4-17** | Component | UI-4.2 | Action create/complete succeeds then ticket reloads | Green success feedback survives ticket reload; modal closes | `client/tests/lab-04/TicketWorkflow.test.tsx` | Passed |
| **UI-L4-18** | Component | D09, AC-28, F3 carry-over | Create action without crypto.randomUUID, then retry a recoverable failure | Valid UUIDv4 accepted by server format; same key/payload reused on retry; reopening gets a new key | `client/tests/lab-04/ActionsTaken.test.tsx` | Passed (F3, 2026-10-02) |
| **UI-L4-19** | Integration component | AC-22–24 | Dashboard query navigation, Clear Filters, Back and Admin detail route | Query is preserved/restored; Admin opens read-only ticket operations | `client/tests/lab-04/DashboardRouting.test.tsx` | Passed (F3, 2026-10-02) |
| **RESP-L4-01** | Responsive | AC-30 | Dashboards and Actions Taken render on Desktop/Tablet/Mobile | No horizontal scroll, no clipping | `e2e/lab-04/dashboards.spec.ts`, `actions-taken-flow.spec.ts` | Passed (F3, 2026-10-02) |
| **A11Y-L4-01** | Component + E2E | AC-31 | Log/Complete/Cancel modal keyboard focus and visible indicators | Initial focus observed; Tab/Shift+Tab wrap; Escape dismisses Cancel, confirmed cancel persists; inherited submission guards pass component tests | `e2e/lab-04/actions-taken-flow.spec.ts`, `client/tests/lab-04/ActionsTaken.test.tsx` | Passed (F4, 2026-10-02); final affected flow 3/3 and visual checklist |
| **A11Y-L4-02** | Component + E2E | AC-31, UI-spec §7 | Dashboard home brand is a native focusable link for all three roles | Role-specific href, modified-click preserved, Enter navigation and visible 3px focus at all three viewports | `client/tests/lab-04/AppShellAccessibility.test.tsx`, `e2e/lab-04/dashboards.spec.ts` | Passed (F3 review correction, 2026-10-02); evidence in `artifacts/lab-04/f3-pr51-review-fix-20261002/verification.md` |
| **E2E-L4-01** | E2E | AC-01, AC-07 | End-to-end action logging, assignment, and completion | Action flow fully traversable on desktop, tablet, and mobile | `e2e/lab-04/actions-taken-flow.spec.ts` | Passed |
| **E2E-L4-02** | E2E | AC-14, AC-16 | End-to-end ticket resolution gate enforcement | Blocked before action (422), allowed after action completed | `e2e/lab-04/ticket-resolution.spec.ts` | Passed |
| **E2E-L4-03** | E2E | AC-18–24, AC-29–30 | Role dashboards, all ticket-count drill-downs, Back/reload, empty/clear, account switch and network Retry | 15 cases pass across Desktop/Tablet/Mobile with real API parity | `e2e/lab-04/dashboards.spec.ts` | Passed (F3, 2026-10-02) |
| **REG-L4-01** | Regression | AC-32 | Full Lab 1 & 2 regression test execution | All existing tests pass 100% | `server/tests/lab-02/`, `client/tests/lab-02/` | Passed (F4, 2026-10-02); full suite evidence in `artifacts/lab-04/f4-evidence-20261002/verification.md` |
| **REG-L4-02** | Regression | AC-33 | Full Lab 3 regression test execution | All existing tests pass 100% | `server/tests/lab-03/`, `client/tests/lab-03/` | Passed (F4, 2026-10-02); full suite evidence in `artifacts/lab-04/f4-evidence-20261002/verification.md` |
| **MIG-L4-01** | Migration | AC-34, AC-35 | Idempotent seed and schema migration preservation | Zero data loss, seed twice identical | `server/tests/lab-04/migration-preservation.test.ts`| Passed |
| **MIG-L4-02** | Migration + safety | D10 | Native dump/restore into a fresh disposable database; compare all rows/schema/sequences and active/removed upload bytes | All Attachment references/sizes verified before and after restore; missing active/removed files rejected; source unchanged; unsafe targets refused | `server/tests/lab-04/database-recovery.test.ts`, `recovery-safety.unit.test.ts` | Passed (F4 review correction, 2026-10-02); `artifacts/lab-04/f4-pr53-review-fix-20261002/recovery.json` |
| **PERF-L4-01** | Performance | DoD | Dashboard metrics on 500 fixture tickets / 1,000 actions | Each Staff/Requester: 5 warm-ups + 50 HTTP samples, nearest-rank p95 < 200ms | `server/tests/lab-04/performance-smoke.test.ts` | Passed (F4, 2026-10-02); Staff 54.63ms / Requester 14.59ms; `artifacts/lab-04/f4-pr53-review-fix-20261002/performance.json` |

---

## 3. Visual Evidence Artifacts (Phase F2 / L4-P05)

Visual inspection screenshots for the Actions Taken panel in Ticket Detail have been captured across Desktop (1280px), Tablet (768px), and Mobile (375px) viewports for both IT Staff and Requester roles, along with all three modal states, and archived under `artifacts/lab-04/screenshots/actions-taken/`:

| Screenshot Artifact | Target Spec | Viewport | View / Description |
|---|---|---|---|
| `artifacts/lab-04/screenshots/actions-taken/staff-actions-taken-desktop-1280.png` | UI-L4-04 | Desktop (1280×720) | IT Staff Ticket Detail: Actions Taken section with timeline, Zen Green badges, and "+ Log Action" CTA |
| `artifacts/lab-04/screenshots/actions-taken/staff-actions-taken-tablet-768.png` | UI-L4-04 | Tablet (768×1024) | IT Staff Ticket Detail: Actions Taken responsive tablet layout |
| `artifacts/lab-04/screenshots/actions-taken/staff-actions-taken-mobile-375.png` | UI-L4-04, UI-L4-15 | Mobile (375×667) | IT Staff Ticket Detail: Actions Taken responsive mobile card list (`scrollWidth <= 375px`) |
| `artifacts/lab-04/screenshots/actions-taken/requester-actions-taken-desktop-1280.png` | UI-L4-05, UI-L4-11, UI-L4-12 | Desktop (1280×720) | Requester Ticket Detail: Read-only Actions Taken list, zero mutation buttons, zero internal note leakage |
| `artifacts/lab-04/screenshots/actions-taken/requester-actions-taken-tablet-768.png` | UI-L4-05, UI-L4-11, UI-L4-12 | Tablet (768×1024) | Requester Ticket Detail: Read-only responsive tablet view |
| `artifacts/lab-04/screenshots/actions-taken/requester-actions-taken-mobile-375.png` | UI-L4-05, UI-L4-11, UI-L4-12, UI-L4-15 | Mobile (375×667) | Requester Ticket Detail: Read-only responsive mobile card list (`scrollWidth <= 375px`) |
| `artifacts/lab-04/screenshots/actions-taken/modal-log-action-desktop.png` | UI-L4-05, UI-L4-13 | Desktop (1280×720) | Log Action Taken modal: Status, assignee, local timezone datetime input, and follow-up fields |
| `artifacts/lab-04/screenshots/actions-taken/modal-complete-action-desktop.png` | UI-L4-06 | Desktop (1280×720) | Complete Action Taken modal: Required Result textarea with validation and busy state |
| `artifacts/lab-04/screenshots/actions-taken/modal-cancel-action-desktop.png` | UI-L4-07 | Desktop (1280×720) | Cancel Action Taken modal: Cancellation reason input and confirmation prompt |

---

## 4. Evidence status clarification — 2026-09-27

Phase F2 (L4-P03–L4-P06) implementation and verification completed on branch `feature/actions-and-workflow-phase2-lab4`.
- **Server Vitest suite:** 29 files, 324 passed, 0 failed, 0 skipped.
- **Client Vitest suite:** 18 files, 99 passed, 0 failed, 0 skipped.
- **Playwright E2E suite:** 114 passed across desktop, tablet, and mobile viewports (2.7m), 0 failed, 0 skipped.
- **Builds:** Server TypeScript (`tsc`) 0 errors, Client Vite (`tsc && vite build`) 0 errors.
- **Visual evidence:** All 9 screenshot artifacts archived in `artifacts/lab-04/screenshots/actions-taken/`, including retaken 375px mobile screenshots proving `document.documentElement.scrollWidth <= 375px`.
- **Accessibility:** Associated `<label htmlFor="...">` added for page size dropdown (`StaffTicketQueue.tsx`), reassign owner dropdown, public comment textarea, and internal note textarea (`StaffTicketDetail.tsx`) per UI-spec 7.1.
- **MIG-L4-02 Deferral:** Sandbox backup/restore recovery verification is deferred to Phase F4 (L4-P11) on disposable test DB (`toktickit_test_*`).
- **F3–F5 status:** All remaining Dashboard, Regression, and Performance tests remain `Planned` pending their respective phases.

## 5. F2 review-correction verification — 2026-10-01

- Latest correction regressions: API-L4-22j–22l, UI-L4-06b, UI-L4-16, and UI-L4-17 passed.
- Full server suite: 29 files / **327 passed**, client suite: 18 files / **103 passed**; no failed or skipped tests. Server/client builds passed (2026-09-30).
- Full Playwright suite: **114 passed**, no failed or skipped tests, on Desktop/Tablet/Mobile (2026-10-01). Includes E2E-L4-01 and E2E-L4-02 on all three viewports.
- Disposable database: `toktickit_test_f2_review_1790784843569`; isolated browser upload run: `f2-fixes-1790841869802`.
- Logs and screenshot evidence are linked by path in `implementation-log.md`. These results supersede the earlier blocked browser attempt; F3–F5 gates and MIG-L4-02 remain separate.


## 6. F4 integrated verification — 2026-10-02

REG-L4-01/02, MIG-L4-02, PERF-L4-01, RESP-L4-01 and A11Y-L4-01 are verified on the merged F3 baseline plus F4 changes. Server 349/349 (34 files), client 115/115 (21 files), full Playwright 132/132 across all three viewports, both builds passed; no failed/skipped tests in these final runs. Subsequent capture/initial-focus test edits passed the affected Actions Taken flow 3/3; full and final checkpoint SHAs are kept separately in `artifacts/lab-04/f4-evidence-20261002/verification.md`. The raw latest browser result covers only that targeted run.

Recovery retains a newly created restored database and proves row/schema/sequence hashes plus upload copy/restore byte hashes; it excludes owner/ACL/global roles. Performance is local sequential authenticated HTTP timing, with all 50 samples for each role recorded. All 33 selected captures were visually inspected; see `visual-checklist.md`. F1 decision acceptance and F4 peer/link/merge gates remain distinct from passing product tests.


## 7. F4 recovery review correction — 2026-10-02

MIG-L4-02 adds four negative cases: active source file missing, soft-removed source file missing, file size different from Attachment metadata, and loss of a referenced restored copy. Before the fix, the first three resolve incorrectly; the restored-copy case already rejects. After the fix, all five recovery cases plus safety pass (6/6). Full server 353/353, client 115/115, full Playwright 132/132 and both builds pass at `bde66e99e6bfeece12835a4beef85badcc0df6ba`. Latest hashes, referenced-file counts, Red/Green and complete logs: `artifacts/lab-04/f4-pr53-review-fix-20261002/verification.md`. This supersedes the earlier recovery certification in section 6.
