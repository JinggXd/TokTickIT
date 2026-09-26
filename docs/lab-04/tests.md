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
├── ZenGreenTokens.test.ts
├── StaffDashboard.test.tsx
├── RequesterDashboard.test.tsx
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
| **UNIT-L4-01** | Unit | BR-08 | Action event datetime validation with 5m clock-skew tolerance | Rejects date > now + 5m, accepts now, accepts backdated date | `server/tests/lab-04/action-validation.unit.test.ts` | Planned |
| **UNIT-L4-02** | Unit | D09 | Idempotency UUIDv4 format validation | Valid UUIDv4 passes; malformed strings return validation failure | `server/tests/lab-04/action-validation.unit.test.ts` | Planned |
| **STYLE-L4-01** | Style | FR-18 | Zen Green CSS token values verification | Assert `--zg-primary: #006B3C`, `--zg-secondary: #0B7A46`, `--zg-canvas: #F5F7F6`, `--zg-warning: #D97706`, `--zg-success: #15803D` | `client/tests/lab-04/ZenGreenTokens.test.ts` | Planned |
| **STYLE-L4-02** | Style | FR-18 | Action status badge styling & token mapping | Assert `PENDING` (#FEF3C7/#92400E), `COMPLETED` (#DCFCE7/#15803D), `CANCELLED` (#F3F4F6/#4B5563) | `client/tests/lab-04/ZenGreenTokens.test.ts` | Planned |
| **API-L4-01** | API | AC-01, FR-01 | Create completed Action Taken with valid data | 201 Created, `createdById` and `performedById` set to caller, status `COMPLETED` | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| **API-L4-02** | API | AC-02, FR-01 | Create pending Action Taken with active staff assignee | 201 Created, `assigneeId` set, `performedById` is null, status `PENDING` | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| **API-L4-03** | API | AC-03, BR-04 | Create or reassign Action Taken targeting inactive or non-staff assignee | 422 Unprocessable Entity (`INVALID_ASSIGNEE`) on create and PATCH | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| **API-L4-04** | API | AC-04, BR-07 | Create Action Taken with `followUpRequired=true` without note | 400 Bad Request, validation error | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| **API-L4-05** | API | AC-05, BR-06 | Create completed Action Taken without `result` | 400 Bad Request, result required | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| **API-L4-06** | API | AC-06, BR-08 | Create Action Taken with future `actionDateTime` (> now + 5m) | 400 Bad Request, future date rejected | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| **API-L4-07** | API | AC-07, FR-04 | Transition pending action to completed with result & expectedVersion | 200 OK, status `COMPLETED`, `performedById` set, parent ticket version increments | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| **API-L4-08** | API | AC-08, FR-04 | Cancel pending action with expectedVersion | 200 OK, status `CANCELLED`, parent ticket version increments | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| **API-L4-09** | API | AC-09, BR-05 | Attempt transition of completed or cancelled action back to pending | 400 Bad Request, invalid transition | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| **API-L4-10a** | API | AC-10, BR-10 | Attempt creating action on a RESOLVED, CLOSED, or CANCELLED ticket | 400 Bad Request (`BAD_REQUEST`), ticket locked | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| **API-L4-10b** | API | AC-10, BR-10 | Attempt editing, completing, or cancelling action on RESOLVED, CLOSED, or CANCELLED ticket | 400 Bad Request (`BAD_REQUEST`), action locked | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| **API-L4-11** | API | AC-11, FR-07 | Requester lists actions on owned ticket | 200 OK, returns ALL actions (`PENDING`, `COMPLETED`, `CANCELLED`) in chronological order | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| **API-L4-12** | API | AC-12, FR-07 | Requester attempts to create, edit, complete, or cancel an action | 403 Forbidden | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| **API-L4-13** | API | AC-13, FR-07 | Requester attempts to list actions on another user's ticket | Strictly 403 Forbidden with exact baseline `{ "error": "Access denied: You do not own this ticket" }` | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| **API-L4-14** | API | BR-11 | Mismatched actionId in URL path (actionId exists but belongs to different ticketId) | 404 Not Found (`NOT_FOUND`) | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| **API-L4-15** | API | FR-05 | Non-performer Staff attempts to edit completed action | 403 Forbidden (only original performer or Admin allowed) | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| **API-L4-16** | API | FR-05 | Original performer or Administrator edits completed action description/notes | 200 OK, updated fields saved, version increments | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| **API-L4-17** | API | FR-08 | Confidentiality check: actions response does not leak internal notes | Assert response keys/body contain zero internal note text | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| **API-L4-18** | API | AC-14, BR-12 | Transition ticket to RESOLVED with 0 actions taken (legacy & new) | 422 Unprocessable Entity (`RESOLUTION_GATE_FAILED`) | `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned |
| **API-L4-19** | API | AC-15, BR-12 | Transition ticket to RESOLVED with only PENDING actions taken | 422 Unprocessable Entity (`RESOLUTION_GATE_FAILED`) | `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned |
| **API-L4-20** | API | AC-16, BR-12 | Transition ticket to RESOLVED with >= 1 COMPLETED and 0 PENDING | 200 OK, status `RESOLVED`, ticket `version` incremented | `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned |
| **API-L4-21** | API | AC-17, BR-14 | Transition ticket status with stale `expectedVersion` | 409 Conflict (`CONFLICT`) with exact baseline message | `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned |
| **API-L4-22** | API | D09, BR-14 | Concurrent action edit with stale action `expectedVersion` | 409 Conflict (`CONFLICT`) | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| **API-L4-23a**| API | D02, BR-14 | Resolution race: Resolution commits before concurrent action create | Action create fails 400 Bad Request (ticket already resolved) | `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned |
| **API-L4-23b**| API | D02, BR-14 | Resolution race: Action create commits before concurrent resolution | Resolution fails 409 Conflict (stale ticket version) | `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned |
| **API-L4-23c**| API | D03, BR-10 | Parent Close/Cancel race: Ticket closed concurrently while action mutation in-flight | Action mutation fails 400 Bad Request (ticket terminal/locked) | `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned |
| **API-L4-24a**| API | D09 | Idempotent network replay: same user + same ticket + same key + same payload | 200 OK with `X-Idempotent-Replay: true` header without creating duplicate row | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| **API-L4-24b**| API | D09 | Idempotent payload mismatch: same scope (`createdById, ticketId, clientRequestId`) with different payload | 409 Conflict (`CONFLICT`) | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| **API-L4-24c**| API | D09 | Idempotent key isolation across users: different user + same ticket + same key | 201 Created (two distinct actions created; keys isolated per `createdById`) | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| **API-L4-24d**| API | D09 | Idempotent key scoping across tickets: same user + different ticket + same key | 201 Created (keys scoped to `ticketId` via `@@unique([createdById, ticketId, clientRequestId])`) | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| **API-L4-24e**| API | D09 | Idempotent retry: mismatched header vs body `clientRequestId` | 400 Bad Request (`VALIDATION_FAILED`) | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| **API-L4-24f**| API | D09 | Simultaneous concurrent retry: two identical requests by same user in exact same millisecond | One 201 Created, one 200 OK replay (serialized by row lock; exactly 1 row created) | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| **API-L4-24g**| API | D09, BR-10 | Idempotent replay on resolved/closed ticket by same user | 200 OK replay with `X-Idempotent-Replay: true` (replay succeeds; not blocked by terminal check) | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| **API-L4-24h**| API | D09, FR-05 | Idempotent replay after subsequent action mutation | 200 OK replay matching immutable `requestPayloadHash` (not rejected by 409) | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| **API-L4-25a**| API | BR-13 | Status transitions matrix: verify all 17 permitted transitions | 200 OK on all 17 permitted pairs (including CLOSED->REOPENED) | `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned |
| **API-L4-25b**| API | BR-13 | Status transitions matrix: verify all 47 rejected transitions | 400 Bad Request (`ILLEGAL_STATUS_TRANSITION`) on all 47 forbidden pairs | `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned |
| **API-L4-26** | API | BR-13 | Transition requiring owner without eligible owner assigned | 400 Bad Request (`ELIGIBLE_OWNER_REQUIRED`) | `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned |
| **API-L4-27** | API | AC-18, FR-13 | Requester dashboard metrics return only owned tickets data | 200 OK, accurate counts & recent tickets | `server/tests/lab-04/requester-dashboard.api.test.ts` | Planned |
| **API-L4-28** | API | D05, BR-17 | Fixed-clock 7-day boundary test: (boundary-1s excluded, boundary included, boundary+1s included) | 200 OK, exact window filtering verified with frozen clock | `server/tests/lab-04/requester-dashboard.api.test.ts` | Planned |
| **API-L4-29** | API | AC-19, FR-14 | IT Staff dashboard metrics return unassigned, assigned, statuses, my actions | 200 OK, accurate counts matching independent DB query | `server/tests/lab-04/staff-dashboard.api.test.ts` | Planned |
| **API-L4-30** | API | AC-20, FR-15 | Admin dashboard returns staff metrics + user account counts | 200 OK, user metrics included | `server/tests/lab-04/staff-dashboard.api.test.ts` | Planned |
| **API-L4-30b**| API | FR-03, D12 | Eligible assignees authorization: `GET /api/staff/ticket-owners` allows both IT_STAFF and ADMINISTRATOR | 200 OK on Staff and Admin; 403 on Requester | `server/tests/lab-04/actions-taken.api.test.ts` | Implemented |
| **API-L4-31** | API | AC-21 | Unauthorized role access to staff/admin dashboard | 401 Unauthorized / 403 Forbidden | `server/tests/lab-04/staff-dashboard.api.test.ts` | Planned |
| **API-L4-32** | API | D05 | Zero-ticket state: user with 0 tickets receives 0 counts and empty arrays | 200 OK, 0 counts, no crashes | `server/tests/lab-04/requester-dashboard.api.test.ts` | Planned |
| **API-L4-33a**| API | D05, BR-18 | Staff count-to-drilldown parity: dashboard metric count equals matching tickets from queue API | Counts identical across queue filters (`owner=unassigned&statusGroup=open`, etc.) | `server/tests/lab-04/staff-dashboard.api.test.ts` | Planned |
| **API-L4-33b**| API | D05, BR-18 | Requester count-to-drilldown parity: dashboard recent counts equal list API with `recent=7d` | Counts identical across `/api/tickets?recent=7d` and `status=RESOLVED&recent=7d` | `server/tests/lab-04/requester-dashboard.api.test.ts` | Planned |
| **UI-L4-01** | Component | AC-22 | Requester dashboard card click triggers filter navigation | Navigates to `/my-tickets?statusGroup=open`, `recent=7d`, etc. | `client/tests/lab-04/RequesterDashboard.test.tsx` | Planned |
| **UI-L4-02** | Component | AC-23 | Staff dashboard unassigned card click triggers queue navigation | Navigates to `/staff/queue?owner=unassigned&statusGroup=open` | `client/tests/lab-04/StaffDashboard.test.tsx` | Planned |
| **UI-L4-03** | Component | AC-24 | Staff dashboard my assigned card click triggers queue navigation | Navigates to `/staff/queue?owner=me&statusGroup=active` | `client/tests/lab-04/StaffDashboard.test.tsx` | Planned |
| **UI-L4-04** | Component | AC-25 | Actions Taken list in Ticket Detail displays items and badges in order | Chronological display, badges match Zen Green tokens | `client/tests/lab-04/ActionsTaken.test.tsx` | Implemented |
| **UI-L4-05** | Component | AC-26 | Requester Ticket Detail displays all actions in read-only mode | Renders pending/completed/cancelled without edit controls | `client/tests/lab-04/ActionsTaken.test.tsx` | Implemented |
| **UI-L4-06** | Component | AC-27 | Action submit button enters busy state on submission | Form controls disabled during submit | `client/tests/lab-04/ActionsTaken.test.tsx` | Implemented |
| **UI-L4-07** | Component | AC-28 | Form preserves input values after recoverable API failure and reuses clientRequestId | Input fields retain entered text on retry | `client/tests/lab-04/ActionsTaken.test.tsx` | Implemented |
| **UI-L4-08** | Component | AC-29 | Account switching refreshes dashboard without stale data | Fresh metrics rendered after login | `client/tests/lab-04/RequesterDashboard.test.tsx` | Planned |
| **UI-L4-09** | Component | BR-12 | TicketWorkflow: Resolution gate error alert banner on modal when 0 actions | Renders 422 error banner with guidance | `client/tests/lab-04/TicketWorkflow.test.tsx` | Planned |
| **UI-L4-10** | Component | BR-14 | TicketWorkflow: 409 conflict renders reload banner | Stale update alerts user to reload page | `client/tests/lab-04/TicketWorkflow.test.tsx` | Planned |
| **UI-L4-11** | Component | UI-4 | ActionsTaken: Renders success confirmation banner on create and complete | Displays green confirmation toast | `client/tests/lab-04/ActionsTaken.test.tsx` | Implemented |
| **UI-L4-12** | Component | UI-4 | ActionsTaken: Renders not-found state on invalid action reference | Accessible 404 message with return link | `client/tests/lab-04/ActionsTaken.test.tsx` | Implemented |
| **UI-L4-13** | Component | BR-08, D11 | Action date/time input formatted in local browser timezone without UTC skew | Input initializes and enforces max in local timezone (not UTC -7h) | `client/tests/lab-04/ActionsTaken.test.tsx` | Implemented |
| **RESP-L4-01** | Responsive | AC-30 | Dashboards and Actions Taken render on Desktop/Tablet/Mobile | No horizontal scroll, no clipping | `e2e/lab-04/dashboards.spec.ts` | Planned |
| **A11Y-L4-01** | A11y | AC-31 | Modal focus trap and visible focus indicators | Focus trapped in modal, esc closes, visible ring | `e2e/lab-04/actions-taken-flow.spec.ts` | Planned |
| **E2E-L4-01** | E2E | AC-01, AC-07 | End-to-end action logging, assignment, and completion | Action flow fully traversable | `e2e/lab-04/actions-taken-flow.spec.ts` | Planned |
| **E2E-L4-02** | E2E | AC-14, AC-16 | End-to-end ticket resolution gate enforcement | Blocked before action, allowed after | `e2e/lab-04/ticket-resolution.spec.ts` | Planned |
| **REG-L4-01** | Regression | AC-32 | Full Lab 1 & 2 regression test execution | All existing tests pass 100% | `server/tests/lab-02/`, `client/tests/lab-02/` | Planned |
| **REG-L4-02** | Regression | AC-33 | Full Lab 3 regression test execution | All existing tests pass 100% | `server/tests/lab-03/`, `client/tests/lab-03/` | Planned |
| **MIG-L4-01** | Migration | AC-34, AC-35 | Idempotent seed and schema migration preservation | Zero data loss, seed twice identical | `server/tests/lab-04/migration-preservation.test.ts`| Planned |
| **MIG-L4-02** | Migration | D10 | Sandbox backup and restore recovery verification | pg_dump and pg_restore test successful | `server/tests/lab-04/migration-preservation.test.ts`| Planned |
| **PERF-L4-01** | Performance | DoD | Dashboard metrics performance smoke test on 500 tickets (p95 < 200ms) | 50 samples, p95 < 200ms | `server/tests/lab-04/performance-smoke.test.ts` | Planned |

## Evidence status clarification — 2026-09-26

`Implemented` means a test body exists. `API-L4-30b` is the eligible-assignee lookup test; `API-L4-30` remains the Admin dashboard test. The lookup test title was aligned with this matrix. In F2 implementation verification, `UI-L4-13` and `UI-L4-13b` verified both local initialization and fixed-clock `max = local now + 5m` boundary (8/8 pass in `ActionsTaken.test.tsx`). `API-L4-22b` through `API-L4-22e` verified version guards, empty complete results, and follow-up notes (32/32 pass in `actions-taken.api.test.ts`). Full client suite passed at 91/91 (100%).
