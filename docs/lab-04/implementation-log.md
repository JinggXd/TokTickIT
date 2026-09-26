# TokTickIT Lab 4 — Implementation & Audit Log

**Author / Agent:** AI Coding Agent (Gemini 3.8 Flash High)  
**Repository:** `d:/toktickit`  
**Base Commit SHA:** `baad45e09272d665bc0cf765236c456edcf0eff7` (`Merge pull request #45 from JinggXd/lab3-staging`)  
**Target Staging Branch:** `lab4-staging` (to be created from `main`)  

---

## 2026-09-25 — Phase F1 Kickoff: Baseline Audit & Initial Drafts (L4-P00 – L4-P02)

### 1. Context & Scope
- Initiated Lab 4 (TokTickIT Actions Taken, Dashboards, and Final Regression).
- Reviewed authoritative inputs:
  - Source handout: `SE-Lab-4.pdf` (all 11 pages analyzed).
  - Guidelines and execution plan: `GEMINI-PIPELINE.md` and `GEMINI-START.md`.
  - Previous contract files: `docs/lab-03/specification.md`, `api-spec.md`, `ui-spec.md`, `tests.md`.
  - Repository rules: `AGENTS.md` and `.antigravityrules`.

### 2. Baseline Status Verification (L4-P00)
- Git Working Tree verified on `main` at `baad45e`.
- Verification runs:
  - Server TypeScript compilation: `npm --prefix server run build` -> **PASS** (exit code 0, 0 errors, ~3.5s).
  - Client Vite build: `npm --prefix client run build` -> **PASS** (exit code 0, 43 modules transformed, ~4.5s).
  - Client Vitest suite: `npm run test:client` -> **PASS** (82 / 82 tests passed across 15 test files in 28.66s).
  - Server & E2E tests: Marked **BLOCKED** per safety rules (disposable test database `toktickit-db` container exited; no DB mutations performed during F1 planning).

---

## 2026-09-25 — Technical Review Findings & Comprehensive Contract Revision (R01–R10)

Received review feedback documented in `docs/lab-04/F1-REVIEW.md` containing 10 specific findings. Addressed all findings comprehensively across contract deliverables:

### 1. Finding R01 (Global Error Envelope & Foreign Ticket 403)
- Restored exact Lab 3 flat error envelope `{ error: string, message?: string, details?: any }` in `api-spec.md` and `specification.md`.
- Concurrency conflict uses `{ "error": "CONFLICT", "message": "Ticket was modified by another user. Reload and try again." }`.
- Foreign ticket access by Requester strictly returns `403 Forbidden` (`{ "error": "FORBIDDEN", "message": "You do not have access to this ticket." }`); removed 404 ambiguity.

### 2. Finding R02 (Concurrency Protocol & Retry Safety)
- Added `version: Int @default(1)` to `ActionTaken` model.
- Action mutations (`PATCH`, `/complete`, `/cancel`) require `expectedVersion` and return `409 Conflict` on mismatch.
- Documented atomic serialization: Ticket status update executes in transaction locking `Ticket` row and counting actions; every action creation, update, completion, or cancellation increments parent `Ticket.version`.
- Added `clientRequestId` idempotency support for `POST /api/tickets/:id/actions`.

### 3. Finding R03 (Action Authorization & Terminal Locking)
- Clarified permission matrix:
  - `PENDING` actions: editable by any permitted IT Staff/Admin.
  - `COMPLETED` actions: editable only by original performer or Admin for description/notes; cannot edit assignee, result, or revert to pending.
  - `CANCELLED` actions: strictly immutable (400 Bad Request).
  - Parent ticket in `CLOSED` or `CANCELLED`: all action mutations rejected with 400 Bad Request.
  - Nested resource guard: action must belong to `:id` in URL path; mismatch returns 404.

### 4. Finding R04 (Requester UI Visibility into All Actions)
- Updated `ui-spec.md` and `specification.md`: Requesters viewing owned tickets see **all** Actions Taken (`PENDING`, `COMPLETED`, `CANCELLED`) in chronological order.
- Internal Notes remain 100% confidential with zero leakage.

### 5. Finding R05 (Dashboard Cards, Metrics & Drill-Down Alignment)
- Created single unified Metric Dictionary in `decisions.md` D05, `api-spec.md` §4, `ui-spec.md` §3, `specification.md` §5.3.
- Removed speculative "+N from yesterday" from mockups.
- Mapped 4 Requester cards to exact API fields and query parameters (`/my-tickets?status=open`, `WAITING_FOR_REQUESTER`, `recent=7d`, `status=RESOLVED`).
- Mapped 5 Staff cards to exact API fields and `/staff/queue` query parameters.
- Defined `recentOrUrgentTickets` prioritization (`itPriority === HIGH DESC`, `updatedAt DESC`, `id DESC`, limit 5).

### 6. Finding R06 (Ticket Workflow & Admin Permission Inheritance)
- Preserved full 64-status transition matrix from Lab 3 (17 allowed, 47 rejected; only `CANCELLED` is terminal; `CLOSED -> REOPENED` permitted).
- Preserved active eligible owner requirement for transitions to `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `RESOLVED`.
- Preserved clearing of `appearsResolvedAt` and `appearsResolvedById` on reopening.
- Ticket status transition endpoint (`PATCH /api/staff/tickets/:id/status`) access remains `IT_STAFF` only to preserve Lab 3 RBAC.
- Resolution Gate delta: Transition to `RESOLVED` requires >= 1 `COMPLETED` action and 0 `PENDING` actions.

### 7. Finding R07 (Zen Green Tokens & Badges)
- Aligned `ui-spec.md` with actual `client/src/styles/zen-green.css` tokens (`--zg-primary: #006B3C`, `--zg-secondary: #0B7A46`, `--zg-canvas: #F5F7F6`, `--zg-warning: #D97706`, `--zg-success: #15803D`).
- Aligned action status badges with `client/src/components/Badges.tsx`:
  - `PENDING`: `#FEF3C7` / `#92400E` (🟡 Pending)
  - `COMPLETED`: `#DCFCE7` / `#15803D` (🟢 Completed)
  - `CANCELLED`: `#F3F4F6` / `#4B5563` (⚪ Cancelled)

### 8. Finding R08 (Expanded Test Matrix & Traceability)
- Expanded `tests.md` with explicit test cases:
  - `API-L4-10a` & `API-L4-10b`: Create, edit, complete, cancel on closed/cancelled ticket (all rejected 400).
  - `API-L4-03`: Inactive assignee on creation and PATCH reassignment (422).
  - `API-L4-15` & `API-L4-16`: Completed action edit permissions (non-performer 403, performer/admin 200).
  - `API-L4-14`: Mismatched nested resource (404).
  - `API-L4-17`: Zero internal note leakage.
  - `API-L4-22` & `API-L4-23`: Concurrent action edit (409) and action/resolution race test.
  - `API-L4-24`: Network retry with `clientRequestId`.
  - `API-L4-28`: 7-day date boundary test (6-day included, 8-day excluded).
  - `API-L4-32` & `API-L4-33`: Zero-ticket state and count-to-drilldown parity test.
  - `UI-L4-09` & `UI-L4-10`: TicketWorkflow component tests.
  - `MIG-L4-02`: Sandbox backup/restore recovery test.
  - `PERF-L4-01`: Performance smoke test on 500 tickets (< 200ms).

### 9. Finding R09 (Actor Semantics, Model Fields & DB Recovery)
- Formulated clear actor semantics: `createdById: Int`, `performedById: Int?`, `assigneeId: Int?`.
- Documented sandbox database backup (`pg_dump`) and recovery (`pg_restore`) procedures in `decisions.md` D10.

### 10. Finding R10 (Verified Proposed Agent Patches)
- Replaced proposed diffs in `proposed-agents-patch.md` with clean patches verified with `git apply --check` (exit code 0).
- In `.antigravityrules`, preserved all Lab 3 historical rules and prepended an explicit Lab 4 execution authority section.

---

### Current F1 Deliverables Status:
All F1 contract documents have been comprehensively synchronized and updated:
- `docs/lab-04/baseline.md`
- `docs/lab-04/PHASES.md`
- `docs/lab-04/decisions.md` (D01–D10)
- `docs/lab-04/specification.md` (11 sections)
- `docs/lab-04/api-spec.md`
- `docs/lab-04/ui-spec.md`
- `docs/lab-04/tests.md`
- `docs/lab-04/proposed-agents-patch.md`
- `docs/lab-04/issue-drafts.md`
- `docs/lab-04/implementation-log.md`

---

## 2026-09-25 — Technical Re-Review Round 2 Resolution (Items 1–5 & Environment Audit)

Addressed all remaining items documented in `docs/lab-04/F1-REVIEW-ROUND2.md`:

### 1. Item 1 (R02: Idempotency Protocol & Atomic Transaction Serialization)
- Replaced temporary in-memory map with persistent `clientRequestId String?` column in `ActionTaken` table constrained by `@@unique([ticketId, clientRequestId])`.
- Protocol specifies: Header `X-Client-Request-Id` (primary) and body `clientRequestId` (fallback), validated as UUIDv4 regex. If both supplied, must match (or 400 `VALIDATION_FAILED`).
- Replay semantics: Identical payload returns `200 OK` with header `X-Idempotent-Replay: true`. Mismatched payload returns `409 Conflict` (`CONFLICT`). Key scoping is strictly `[ticketId, clientRequestId]`, surviving restarts without TTL loss.
- Atomic transaction serialization: Every action mutation (`POST /actions`, `PATCH /actions/:id`, `POST /complete`, `POST /cancel`) begins a transaction, acquires parent `Ticket` row lock (`SELECT ... FOR UPDATE`), rejects mutations on terminal tickets (`RESOLVED`, `CLOSED`, `CANCELLED`) with 400 Bad Request (`BAD_REQUEST`), increments `ActionTaken.version`, and increments parent `Ticket.version`.
- Race condition outcomes documented for both commit orders in resolution and cancellation races.
- Added tests `API-L4-23a/b/c` and `API-L4-24a/b/c/d/e`.

### 2. Item 2 (R05: Dashboard Filter & Drill-down Parity)
- Added shared query parameter deltas to list endpoints:
  - `GET /api/tickets`: `recent=7d` (UTC rolling 7 days) and `statusGroup=open`.
  - `GET /api/staff/tickets`: `statusGroup=open` and `statusGroup=active`, with read access extended to `ADMINISTRATOR`.
- Fixed Requester drill-downs: `/my-tickets?statusGroup=open`, `/my-tickets?status=WAITING_FOR_REQUESTER`, `/my-tickets?recent=7d`, `/my-tickets?status=RESOLVED&recent=7d`.
- Fixed Staff drill-downs: `/staff/queue?owner=unassigned&statusGroup=open`, `/staff/queue?owner=me&statusGroup=active`, `/staff/queue?statusGroup=open`, `/staff/queue?status=WAITING_FOR_REQUESTER`.
- Aligned `myRecentActions` strictly to current user performer (`performedById === currentUser.id`).
- Admin Dashboard routes ticket clicks to `/admin/tickets/:id`.
- Added tests `API-L4-28` (fixed clock boundary) and `API-L4-33a/b` (count-to-drilldown parity).

### 3. Item 3 (R09: Follow-Up Semantics & Audit Scope)
- Unified `followUpRequired`: Defined strictly as an **informational audit/collaboration flag** (accompanied by mandatory `followUpNote` when checked). It is NOT a blocking resolution gate.
- Resolution Gate remains strictly: `>= 1 COMPLETED` action and `0 PENDING` actions.
- Audit Scope: Confirmed append-only principles apply to existing models (`PublicComment`, `InternalNote`, `ActionTaken` soft-cancellation via `status = 'CANCELLED'`). No extra unbacked history table is invented.

### 4. Item 4 (R01: Standardized Error Constants & Baseline Compatibility)
- Standardized single error constants across `specification.md`, `api-spec.md`, and `tests.md`:
  - `INVALID_ASSIGNEE` (422)
  - `RESOLUTION_GATE_FAILED` (422)
  - `CONFLICT` (409) with baseline message `"The ticket was modified by another user. Please refresh and try again."`
  - `BAD_REQUEST` (400) with message `"Cannot modify actions on a resolved, closed, or cancelled ticket."`
  - Foreign ticket access: 403 Forbidden with exact baseline body `{ "error": "Access denied: You do not own this ticket" }`.

### 5. Item 5 (R08: Comprehensive Test Plan Expansion)
- Added explicit test cases in `tests.md`:
  - `API-L4-25b`: All 47 forbidden status transition pairs tested.
  - `API-L4-28`: Fixed-clock 7-day boundary test (now - 7d - 1s excluded, boundary included, now - 7d + 1s included).
  - `API-L4-33a/b`: Count-to-drilldown parity tests for both Staff and Requester.
  - `UNIT-L4-01/02`: Datetime clock skew tolerance (5m) and UUIDv4 format validation.
  - `STYLE-L4-01/02`: Zen Green CSS custom properties and badge token mappings.
  - `UI-L4-11/12`: Success toast/banner and accessible not-found (404) states.
  - `PERF-L4-01`: 500 tickets, 1,000 actions, 5 warm-ups, 50 samples, p95 < 200ms with explicit run command.

### 6. Test Environment Audit & Verification Evidence
- Executed `tests/lab-03/test-environment.test.ts` via test runner: **PASS** (24 / 24 tests passed in 9.09s, Exit Code 0).
- Confirmed runtime fail-closed enforcement, ambient database rejection, directory containment cleanup, and Playwright worker propagation without touching database.
- Audited Docker state via `docker ps -a`: Container `toktickit-db` (PostgreSQL 16, ports `5433->5432`, status Exited). Verified DB suites remain safely blocked until F2.
- Synchronized `PHASES.md` (v1.2.0), `issue-drafts.md` (v1.2.0), and `baseline.md`.
- D01–D10 remain marked as **Proposed (TBD)** pending user explicit approval.

### 7. User Feedback Resolution: Idempotency Replay Invariants & Complete Payload Hash
- Resolved race between action mutations and retries: Added `requestPayloadHash String?` to `ActionTaken` schema representing SHA-256 hash of normalized 8-field payload object (`actionDateTime`, `actionDescription`, `status`, `result`, `assigneeId`, `followUpRequired`, `followUpNote`, `attachmentNotes`).
- Replaced comparison against mutable action fields with comparison against immutable `requestPayloadHash`, preventing spurious 409 rejections when retrying an action that was subsequently edited or completed.
- Re-ordered atomic transaction steps: Idempotency replay check is evaluated **before** checking parent ticket terminal status. If `clientRequestId` and payload match an already-committed action, returns `200 OK` replay even if parent ticket transitioned to `RESOLVED`, `CLOSED`, or `CANCELLED`.
- Added tests `API-L4-24f` (retry on resolved/closed ticket) and `API-L4-24g` (retry after subsequent action mutation) to `tests.md`, `issue-drafts.md`, and `PHASES.md`.

### 8. User Feedback Resolution: Full-Document Synchronization of Idempotency Scope to `(createdById, ticketId, clientRequestId)`
- Standardized unique constraint and scoping across all contract documents and Prisma schema to `@@unique([createdById, ticketId, clientRequestId])`.
- Verified `createdById` is server-derived exclusively from authenticated session (`req.user.id`).
- Expanded planned test suite with:
  - `API-L4-24a`: Same user + same ticket + same key + same payload -> 200 OK replay (`X-Idempotent-Replay: true`).
  - `API-L4-24b`: Same scope (`createdById, ticketId, clientRequestId`) + different payload -> 409 Conflict (`CONFLICT`).
  - `API-L4-24c`: Different user + same ticket + same key -> 201 Created (keys isolated per `createdById`, creating two distinct action records).
  - `API-L4-24d`: Same user + different ticket + same key -> 201 Created (keys scoped to `ticketId`).
  - `API-L4-24e`: Mismatched header vs body `clientRequestId` -> 400 Bad Request (`VALIDATION_FAILED`).
  - `API-L4-24f`: Simultaneous concurrent retry by same user -> 1 created (201), 1 replay (200).
  - `API-L4-24g`: Replay on resolved/closed ticket -> 200 OK replay (not blocked by terminal check).
  - `API-L4-24h`: Replay after action mutation -> 200 OK replay matching immutable payload hash.
- Synchronized [decisions.md](file:///d:/toktickit/docs/lab-04/decisions.md), [specification.md](file:///d:/toktickit/docs/lab-04/specification.md), [api-spec.md](file:///d:/toktickit/docs/lab-04/api-spec.md), [tests.md](file:///d:/toktickit/docs/lab-04/tests.md), and [PHASES.md](file:///d:/toktickit/docs/lab-04/PHASES.md).
- Confirmed D01–D10 remain **Proposed (TBD)** awaiting explicit user approval.

---

## 9. GitHub Workflow Execution: Staging Branch, Contract Branch, Issue #46 & Pull Request #47

**Date:** 2026-09-26T01:14:00+07:00  
**Operating System:** Windows  
**Shell:** PowerShell  

### Actions Executed:
1. **Created Staging Branch `lab4-staging`:**
   - Branched from `main` at `baad45e09272d665bc0cf765236c456edcf0eff7` (post-Lab 3 release PR #45).
   - Command: `git branch lab4-staging baad45e09272d665bc0cf765236c456edcf0eff7; git push origin lab4-staging`
   - Exit Code: 0. Successfully pushed new branch `lab4-staging` to GitHub remote `origin`.

2. **Created Contract Feature Branch `docs/lab4-contract`:**
   - Branched from `lab4-staging`.
   - Command: `git checkout -b docs/lab4-contract lab4-staging`
   - Staged exclusively 14 markdown files under `docs/lab-04/` (leaving unmodified/unstaged repo files and untracked artifacts untouched).
   - Committed: `cb6996b` (`docs(lab4): establish contracts, decision gates, and test traceability (P00-P02)`).
   - Pushed to remote: `git push origin docs/lab4-contract`. Exit Code: 0.

3. **Created GitHub Issue #46:**
   - Title: `Lab 4 P00–P02: establish engineering contracts, decision gates, and test traceability`
   - URL: [https://github.com/JinggXd/TokTickIT/issues/46](https://github.com/JinggXd/TokTickIT/issues/46)
   - Scope: P00 Baseline audit, P01 Contracts & Decisions (D01–D10 Proposed), P02 Test traceability matrix & issue drafts.

4. **Opened Pull Request #47:**
   - Title: `docs(lab4): establish contracts and align test/pipeline gates (P00-P02)`
   - URL: [https://github.com/JinggXd/TokTickIT/pull/47](https://github.com/JinggXd/TokTickIT/pull/47)
   - Base: `lab4-staging` | Head: `docs/lab4-contract`
   - Description includes Phase F1 overview, acceptance criteria, validation evidence, and reference `Resolves #46`.
   - Status: Open. Ready for peer review and Development panel issue linking.

---

## 10. Phase F1 Contract Revisions (Peer Review Round 2 & Decisions D11–D13)

**Date:** 2026-09-26T02:10:00+07:00  

### Addressed Findings:
1. **Form Datetime Local Timezone Alignment (D11):**
   - **Root Cause:** Using `new Date().toISOString().slice(0, 16)` as `value` or `max` for `<input type="datetime-local">` produced UTC timestamps, introducing a 7-hour timezone skew in Thailand (UTC+7) that falsely blocked users from logging actions at the current local time.
   - **Resolution:** Updated `ui-spec.md` §3.4.A, `specification.md` FR-01/BR-08, and `ActionsTakenSection.tsx` with `formatLocalDatetime(date: Date)` (`YYYY-MM-DDTHH:mm` using local getters). Tested via `UI-L4-13` in `ActionsTaken.test.tsx`.
2. **Eligible Assignees Authorization Expansion for Administrator (D12):**
   - **Root Cause:** Baseline `GET /api/staff/ticket-owners` was restricted to `IT_STAFF` only (`requireRole("IT_STAFF")`), blocking Administrators from fetching eligible assignees or delegating action tasks.
   - **Resolution:** Expanded route authorization in `api-spec.md` §1.4, `specification.md` FR-03, and `server/src/routes/staff.ts` to `requireRole("IT_STAFF", "ADMINISTRATOR")`. Tested via `API-L4-30b` in `actions-taken.api.test.ts`.
3. **Normalized Action Mutation Contracts: Edit, Complete, Cancel (D13):**
   - **Root Cause:** Contracts lacked explicit request body schemas, validation rules, permitted mutable fields per status, and exact response bodies for `PATCH /api/tickets/:id/actions/:actionId`, `POST .../complete`, and `POST .../cancel`.
   - **Resolution:** Updated `api-spec.md` §§2.3, 2.4, 2.5 with complete request schemas, permissions matrix, validation rules, 200 OK responses, and comprehensive error status codes. Tested across 28 tests in `actions-taken.api.test.ts`.



## 2026-09-26 — Codex F1 documentation closeout cleanup

User requested all remaining F1 document corrections in one pass. Updated decisions summary to D01–D13, aligned specification references, phase status and Issue draft index, and created F1-CLOSEOUT.md as the single current closure record. Renamed only the eligible-assignee test title from API-L4-30 to API-L4-30b (no assertion or product-code change). Added evidence limitations to tests.md. Preserved existing user changes and historical logs.

Current checkout at inspection: feature/actions-and-workflow-phase2-lab4, HEAD 3efa5e4981b0434241da9db44a82b29b230b11cb. F2 code exists; this cleanup does not verify F2. GitHub CLI lookup was unavailable because gh was not in PATH, so current remote approval/link/merge status is not asserted. No commit, push, migration, agent-rule patch application, or merge performed. Decisions remain Proposed; closure awaits actual acceptance and peer-review evidence. Validation: document structure/AC mapping/test-title consistency, proposed patch dry checks and git diff checks; no product tests run.

---

## 11. Phase F1 Remote Verification & Closeout Completion (2026-09-26)

**Date:** 2026-09-26T12:15:00+07:00  

### Actions Executed:
1. **Product Owner Direction:**
   - Received explicit confirmation and direction from Product Owner to resolve all three reviewed findings in F1 / L4-P01 Engineering Contracts (`ui-spec.md`, `decisions.md`, `api-spec.md`), and to complete all closeout items in `F1-CLOSEOUT.md` with self-verification.
2. **GitHub Remote Verification via GraphQL API:**
   - Queried GitHub API for PR #47 and Issue #46:
     - PR #47: `docs(lab4): establish contracts and align test/pipeline gates (P00-P02)`
     - Base branch: `lab4-staging` | Head branch: `docs/lab4-contract`
     - Status: `OPEN` (merged: false, reviewDecision: null)
     - Linked Issues: Confirmed Development panel link to Issue #46 (`Lab 4 P00–P02: establish engineering contracts, decision gates, and test traceability`) through `closingIssuesReferences`.
     - Review Status: Pending peer-reviewer approval & merge (in strict accordance with team policy: agent/author does not self-merge).
3. **Implementation & Test Verification:**
   - Enforced strict version precondition guards in `server/src/routes/actions.ts` (`parseExpectedVersion`), returning 400 `VALIDATION_FAILED` when `expectedVersion` is missing or non-positive.
   - Added unit/integration test coverage in `actions-taken.api.test.ts` (32/32 passing): `API-L4-22b` (missing/invalid version), `API-L4-22c` (missing version / empty complete result), `API-L4-22d` (missing version on cancel), and `API-L4-22e` (missing follow-up note).
   - Added fixed-clock assertion in `ActionsTaken.test.tsx` (`UI-L4-13b`), verifying local timezone initialization and `max = now + 5m` boundary (8/8 passing).
   - Full client suite: 17/17 files, 91/91 tests passed (100%).
4. **Documentation Synchronization:**
   - Synchronized all contract documents (`ui-spec.md`, `decisions.md`, `api-spec.md`, `specification.md`, `tests.md`, `PHASES.md`, `issue-drafts.md`, `F1-CLOSEOUT.md`) onto `docs/lab4-contract` and pushed to remote to ensure PR #47 contains the authoritative snapshot.
