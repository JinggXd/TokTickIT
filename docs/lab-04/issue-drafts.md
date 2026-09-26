# TokTickIT Lab 4 — GitHub Issue Drafts

**Date:** 2026-09-25  
**Document Version:** 1.1.0 (Revised following F1-Review Findings)  
**Status:** Planning index. F1 Issue #46 / PR #47 are recorded in implementation-log.md; current remote review/link status is not reverified. Remaining entries are drafts unless linked to actual evidence.
**Target Branch Policy:** All feature branches (`codex/lab4-*` by default; preserve existing team branch names) merge into `lab4-staging` via PR. Explicit Development-panel Issue linking is required for every PR. Peer review occurs per feature package. Only the reviewed release PR merges `lab4-staging` into `main`.

---

### Issue 1: [L4-P00] Baseline Assessment & Environment Audit
- **Phase:** F1
- **Labels:** `phase:f1`, `type:chore`, `scope:baseline`
- **Dependencies:** None
- **Scope:**
  - Audit existing repo state, preserve existing working-tree changes, inspect previous Lab 3 PR release.
  - Verify fail-closed test environment safeguards (`server/src/config/testEnvironment.ts`).
  - Execute baseline build checks and client test suites (82/82 passing).
- **Planned Test IDs / Evidence:** `tsc` server build (0 errors), Vite client build (0 errors), `npm run test:client` (82/82 pass).
- **Gate:** `docs/lab-04/baseline.md` and `implementation-log.md` complete; 0 product code edits.

---

### Issue 2: [L4-P01] Sprint 4 Engineering Contracts & Decision Gates (D01–D13)
- **Phase:** F1
- **Labels:** `phase:f1`, `type:documentation`, `scope:contract`
- **Dependencies:** L4-P00
- **Scope:**
  - Formulate 11-section `specification.md` compliant with §9.
  - Draft REST API contracts in `api-spec.md` with uniform error envelopes matching Lab 3.
  - Draft Zen Green UI and multi-viewport responsive design in `ui-spec.md`.
  - Address Decision Gates D01–D13 in `decisions.md`.
  - Prepare verified patch for `AGENTS.md` and `.antigravityrules` in `proposed-agents-patch.md`.
- **Planned Test IDs / Evidence:** Documentation consistency check; `git apply --check` on proposed patches (code 0).
- **Gate:** Contracts internally consistent and matching rubric and baseline requirements.

---

### Issue 3: [L4-P02] Test DD Plan & Safety Harness Traceability Matrix
- **Phase:** F1
- **Labels:** `phase:f1`, `type:test`, `scope:test-plan`
- **Dependencies:** L4-P01
- **Scope:**
  - Formulate complete `tests.md` mapping AC-01 through AC-35 to planned test IDs, types, and files.
  - Detail negative tests, concurrency tests, idempotent retry tests, and performance smoke criteria.
  - Define disposable database safeguards and sandbox recovery tests.
- **Planned Test IDs / Evidence:** Traceability matrix covering 100% of ACs across unit, API, component, E2E, and regression.
- **Gate:** Traceability matrix complete with 0 unmapped criteria; test harness verified.

---

### Issue 4: [L4-P03] Database Migration, ActionTaken Model & Idempotent Seed
- **Phase:** F2
- **Branch:** `codex/lab4-p03-db-migration` -> target `lab4-staging`
- **Labels:** `phase:f2`, `type:database`, `scope:migration`
- **Dependencies:** L4-P01, L4-P02
- **Scope:**
  - Add `ActionTaken` model, status enum (`PENDING`, `COMPLETED`, `CANCELLED`), `version`, `clientRequestId`, `requestPayloadHash`, `@@unique([createdById, ticketId, clientRequestId])`, and relations in `schema.prisma`.
  - Implement forward migration `20260925000000_lab4_actions_taken`.
  - Expand seed data with tickets having 0, 1, and multiple actions taken across all statuses.
  - Verify idempotent re-seeding and sandbox backup/recovery.
- **Planned Test IDs / Evidence:** `MIG-L4-01`, `MIG-L4-02` passing on disposable test database.
- **PR Gate:** Peer review approved, Issue linked via Development panel, merged into `lab4-staging`.

---

### Issue 5: [L4-P04] Actions Taken REST API & Authorization Matrix
- **Phase:** F2
- **Branch:** `codex/lab4-p04-actions-api` -> target `lab4-staging`
- **Labels:** `phase:f2`, `type:backend`, `scope:api`
- **Dependencies:** L4-P03
- **Scope:**
  - Endpoints: list (`GET`), create (`POST`), edit/assign (`PATCH`), complete (`POST`), cancel (`POST`) under `/api/tickets/:id/actions` (soft-cancel only, no DELETE endpoint).
  - Server-side caller attribution (`createdById`, `performedById`) from session.
  - Inactive assignee rejection (422 `INVALID_ASSIGNEE`), mandatory result on completion, follow-up note validation.
  - Parent ticket row lock (`SELECT ... FOR UPDATE`) before mutation; 400 Bad Request on terminal tickets (`RESOLVED`, `CLOSED`, `CANCELLED`).
  - Optimistic locking via `ActionTaken.version` (409 `CONFLICT`) and persistent idempotent retry via `clientRequestId` (UUIDv4; 201 created vs 200 replay scoped to `(createdById, ticketId, clientRequestId)` with canonical `requestPayloadHash`).
  - Role scoping: Requester read-only on owned tickets; Staff/Admin full access; foreign ticket access strictly 403 (`{ "error": "Access denied: You do not own this ticket" }`).
- **Planned Test IDs / Evidence:** `API-L4-01` through `API-L4-17`, `API-L4-22`, `API-L4-24a` through `API-L4-24h`.
- **PR Gate:** Peer review approved, Issue linked via Development panel, merged into `lab4-staging`.

---

### Issue 6: [L4-P05] Actions Taken UI in Ticket Detail
- **Phase:** F2
- **Branch:** `codex/lab4-p05-actions-ui` -> target `lab4-staging`
- **Labels:** `phase:f2`, `type:frontend`, `scope:ui`
- **Dependencies:** L4-P04
- **Scope:**
  - Actions Taken section/tab in Ticket Detail (`/staff/tickets/:id` and `/tickets/:id`).
  - Log Action modal, Complete Action modal, Cancel Action modal, Edit Action modal.
  - Requester read-only view displaying **all** actions (`PENDING`, `COMPLETED`, `CANCELLED`) with zero Internal Notes leakage.
  - Responsive layout (Desktop, Tablet, Mobile) and accessible modal focus trap.
  - Persistent form values on network error and reuse of identical `clientRequestId`.
- **Planned Test IDs / Evidence:** `UI-L4-04`, `UI-L4-05`, `UI-L4-06`, `UI-L4-07`, `UI-L4-11`, `UI-L4-12`, `A11Y-L4-01`, `E2E-L4-01`.
- **PR Gate:** Peer review approved, visual checks captured, merged into `lab4-staging`.

---

### Issue 7: [L4-P06] Final Ticket Status Workflow & Resolution Gate
- **Phase:** F2
- **Branch:** `codex/lab4-p06-ticket-workflow` -> target `lab4-staging`
- **Labels:** `phase:f2`, `type:fullstack`, `scope:workflow`
- **Dependencies:** L4-P04, L4-P05
- **Scope:**
  - Enforce permitted 17 status transitions and reject all 47 forbidden transitions (preserving Lab 3 baseline, only CANCELLED terminal).
  - Backend resolution gate: `RESOLVED` requires >= 1 `COMPLETED` action and 0 `PENDING` actions (422 `RESOLUTION_GATE_FAILED` on failure).
  - Optimistic concurrency protection (`Ticket.version` check with 409 `CONFLICT`).
  - Concurrency serialization: action mutations increment `Ticket.version`.
  - UI resolution modal with error feedback and conflict reload banner.
- **Planned Test IDs / Evidence:** `API-L4-18`, `API-L4-19`, `API-L4-20`, `API-L4-21`, `API-L4-23a/b/c`, `API-L4-25a/b`, `API-L4-26`, `UI-L4-09`, `UI-L4-10`, `E2E-L4-02`.
- **PR Gate:** Peer review approved, Issue linked via Development panel, merged into `lab4-staging`.

---

### Issue 8: [L4-P07] Dashboard Backend API & Authoritative Metrics Calculation
- **Phase:** F3
- **Branch:** `codex/lab4-p07-dashboard-api` -> target `lab4-staging`
- **Labels:** `phase:f3`, `type:backend`, `scope:dashboard-api`
- **Dependencies:** L4-P03, L4-P04, L4-P06
- **Scope:**
  - `GET /api/dashboard/requester`: concise summary metrics and recent tickets.
  - `GET /api/dashboard/staff`: queue metrics, my actions count, recent/urgent tickets, my recent actions (`performedById === currentUser.id`).
  - `GET /api/dashboard/admin`: staff metrics + user account counts.
  - List endpoint filter deltas: `GET /api/tickets?recent=7d` and `statusGroup=open`; `GET /api/staff/tickets?statusGroup=open/active` with read access extended to `ADMINISTRATOR`.
  - 7-day UTC rolling window calculation with fixed clock boundary tests; independent SQL verification.
- **Planned Test IDs / Evidence:** `API-L4-27`, `API-L4-28`, `API-L4-29`, `API-L4-30`, `API-L4-31`, `API-L4-32`, `API-L4-33a/b`.
- **PR Gate:** Peer review approved, Issue linked via Development panel, merged into `lab4-staging`.

---

### Issue 9: [L4-P08] Requester Dashboard UI
- **Phase:** F3
- **Branch:** `codex/lab4-p08-requester-dashboard` -> target `lab4-staging`
- **Labels:** `phase:f3`, `type:frontend`, `scope:requester-dashboard`
- **Dependencies:** L4-P07
- **Scope:**
  - Requester Dashboard page (`/dashboard`).
  - 4 metric cards matching API dictionary with direct drill-down links to `/my-tickets` (`statusGroup=open`, `status=WAITING_FOR_REQUESTER`, `recent=7d`, `status=RESOLVED&recent=7d`).
  - Recent tickets list with status badges.
  - Loading, empty, and safe error states.
- **Planned Test IDs / Evidence:** `UI-L4-01`, `UI-L4-08`, `RESP-L4-01`.
- **PR Gate:** Peer review approved, Issue linked via Development panel, merged into `lab4-staging`.

---

### Issue 10: [L4-P09] IT Staff & Administrator Dashboard UI
- **Phase:** F3
- **Branch:** `codex/lab4-p09-staff-dashboard` -> target `lab4-staging`
- **Labels:** `phase:f3`, `type:frontend`, `scope:staff-dashboard`
- **Dependencies:** L4-P07
- **Scope:**
  - Staff Dashboard page (`/staff/dashboard`) and Admin Dashboard (`/admin/dashboard`).
  - 5 metric cards matching API dictionary with drill-downs to `/staff/queue` (`owner=unassigned&statusGroup=open`, `owner=me&statusGroup=active`, `statusGroup=open`, `status=WAITING_FOR_REQUESTER`).
  - Admin dashboard user-account counts and ticket links navigating to `/admin/tickets/:id`.
  - Status/priority summary strip.
  - Recent/urgent tickets table and my recent actions feed.
- **Planned Test IDs / Evidence:** `UI-L4-02`, `UI-L4-03`, `RESP-L4-01`.
- **PR Gate:** Peer review approved, Issue linked via Development panel, merged into `lab4-staging`.

---

### Issue 11: [L4-P10] Cross-Feature Integration, Role Isolation & Concurrency
- **Phase:** F3
- **Branch:** `codex/lab4-p10-integration` -> target `lab4-staging`
- **Labels:** `phase:f3`, `type:integration`, `scope:security`
- **Dependencies:** L4-P05, L4-P06, L4-P08, L4-P09
- **Scope:**
  - Multi-role session switching without state bleed.
  - Concurrency conflict handling and safe failure feedback.
  - Confidentiality verification: zero Internal Notes leakage in Actions Taken or Requester views.
  - Unit tests for action datetime clock skew and UUIDv4 idempotency keys.
  - Style token tests for Zen Green custom properties and badge mappings.
- **Planned Test IDs / Evidence:** `UNIT-L4-01`, `UNIT-L4-02`, `STYLE-L4-01`, `STYLE-L4-02`; full cross-role E2E suites passing.
- **PR Gate:** Peer review approved, Issue linked via Development panel, merged into `lab4-staging`.

---

### Issue 12: [L4-P11] Full Regression Test Suite & Performance Smoke
- **Phase:** F4
- **Branch:** `codex/lab4-p11-regression` -> target `lab4-staging`
- **Labels:** `phase:f4`, `type:test`, `scope:regression`
- **Dependencies:** L4-P10
- **Scope:**
  - Execute complete Vitest server and client test suites across Labs 1, 2, 3, and 4.
  - Execute Playwright E2E suites across Desktop, Tablet, and Mobile.
  - Performance smoke verification on 500-ticket dataset (< 200ms).
- **Planned Test IDs / Evidence:** `REG-L4-01`, `REG-L4-02`, `PERF-L4-01`; 0 failed tests, 0 skipped tests.
- **PR Gate:** Peer review approved, Issue linked via Development panel, merged into `lab4-staging`.

---

### Issue 13: [L4-P12] Multi-Viewport Visual Inspection, Accessibility & Documentation
- **Phase:** F4
- **Branch:** `codex/lab4-p12-visual-polish` -> target `lab4-staging`
- **Labels:** `phase:f4`, `type:docs`, `scope:visual-polish`
- **Dependencies:** L4-P11
- **Scope:**
  - Capture clean visual evidence across Desktop (1280px), Tablet (768px), and Mobile (375px).
  - Verify WCAG AA contrast and keyboard accessibility.
  - Update `README.md` and complete `visual-checklist.md`.
- **Planned Test IDs / Evidence:** Verified screenshots and completed visual checklist.
- **PR Gate:** Peer review approved, visual checks captured, merged into `lab4-staging`.

---

### Issue 14: [L4-P13] Peer Review, Staged Integration & Release
- **Phase:** F5
- **Branch:** Release PR from `lab4-staging` to `main`
- **Labels:** `phase:f5`, `type:release`, `scope:peer-review`
- **Dependencies:** L4-P11, L4-P12
- **Scope:**
  - Review packet preparation, PR review records in `reviewer.md`.
  - Peer reviewer approves and merges release PR into `main`.
  - Post-merge verification on clean `main`.
- **Planned Test IDs / Evidence:** Verified `main` commit SHA with full passing test run.
- **PR Gate:** Merged by peer reviewer (never agent self-merge).

---

### Issue 15: [L4-P14] Submission Document Generation (Single PDF)
- **Phase:** F5
- **Branch:** `codex/lab4-p14-submission` -> target `main`
- **Labels:** `phase:f5`, `type:submission`, `scope:pdf`
- **Dependencies:** L4-P13
- **Scope:**
  - Assemble single comprehensive submission PDF covering Answer Part 1 through Part 9 according to rubric.
  - Complete `ai-use.md` with prompt log and human reflection.
- **Planned Test IDs / Evidence:** Rendered single PDF inspected page by page.
- **Gate:** Valid single PDF matching rubric scoring criteria ready for submission.
