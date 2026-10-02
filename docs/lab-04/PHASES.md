# TokTickIT Lab 4 — Phase & Work Package Pipeline (F1–F5 / L4-P00–L4-P14)

**Date:** 2026-09-25  
**Document Version:** 1.2.0 (Synchronized following F1-Review Round 2 Findings)  
**Baseline:** `main` at `baad45e09272d665bc0cf765236c456edcf0eff7`  
**Lab 4 Staging Branch:** `lab4-staging` at `8bbd1aa9c975183279c43fe64d47330f9bd94293` (verified 2026-10-02)

---

## 1. Major Phase Overview

| Phase | Description | Work Packages | Current Status | Acceptance Gate |
|---|---|---|---|---|
| **F1** | Baseline, Contracts, Decisions & Tests | L4-P00–L4-P02 | **In Progress** | Specifications & tests complete, D01–D13 addressed, test environment verified |
| **F2** | Actions Taken & Ticket Workflow | L4-P03–L4-P06 | **Merged; review follow-ups assigned to F3** | PR #49 merged into lab4-staging at `8bbd1aa` on 2026-10-02. Four local corrections and two additional findings are tracked in F3-CARRYOVER.md; local test results do not certify the merged version. |
| **F3** | Dashboards & Cross-Feature Integration | L4-P07–L4-P10 | **Verified (automated); awaiting peer review/integration** | All six follow-ups integrated. Server 345/345, client 112/112, Playwright 129/129, builds passed on 2026-10-02. Issue #50 / Draft PR #51; evidence in F3-REVIEW.md. Development linking requires a signed-in GitHub browser; reviewer approval/merge remain pending. |
| **F4** | Regression, Hardening & Visual Polish | L4-P11–L4-P12 | **Planned** | Zero regressions across Labs 1–4, responsive 3 viewports, accessibility verified |
| **F5** | Peer Review, Release & Submission | L4-P13–L4-P14 | **Planned** | Staging PRs reviewed/merged, release to main verified, single submission PDF |

---

## 2. Work Package Details & Dependencies

### Phase F1 — Foundation, Engineering Contracts & Test Safety

#### L4-P00: Baseline Assessment & Audit
- **Status:** **Verified**
- **Dependencies:** None
- **Scope:** Verify git state and preserve existing working-tree changes, review existing schema/routes, verify test database safety guards (`server/src/config/testEnvironment.ts`) via runtime test execution (24/24 pass), run baseline builds and non-DB client tests (82/82 passed).
- **Deliverables:** `docs/lab-04/baseline.md`, `docs/lab-04/implementation-log.md`.
- **Gate:** Safe baseline established without any destructive actions or product code modifications.

#### L4-P01: Sprint 4 Engineering Contract & Decisions
- **Status:** **In Progress**
- **Dependencies:** L4-P00
- **Scope:** Define complete 11-section `specification.md`, `api-spec.md`, `ui-spec.md`, and resolve D01–D13 in `decisions.md`. Propose minimal patch for `AGENTS.md` and `.antigravityrules`.
- **Deliverables:** `docs/lab-04/specification.md`, `docs/lab-04/api-spec.md`, `docs/lab-04/ui-spec.md`, `docs/lab-04/decisions.md`, `docs/lab-04/proposed-agents-patch.md`.
- **Gate:** Contracts complete, internally consistent, adhering to rubric and stakeholder requirements without silently inventing rules.

#### L4-P02: Test DD Plan & Safety Harness Traceability
- **Status:** **In Progress**
- **Dependencies:** L4-P01
- **Scope:** Map every Acceptance Criterion (AC-01 through AC-35) to planned test IDs, types, files, commands, and expected results in `tests.md`. Draft GitHub Issues list for Lab 4 work packages.
- **Deliverables:** `docs/lab-04/tests.md`, `docs/lab-04/issue-drafts.md`.
- **Gate:** 100% AC-to-test traceability with zero skipped/unmapped criteria; safety harness verified.

---

### Phase F2 — Actions Taken & Ticket Workflow

#### L4-P03: Database Migration, Model & Idempotent Seed
- **Status:** **Verified (automated)**
- **Dependencies:** L4-P01, L4-P02
- **Scope:** Add `ActionTaken` model, relations, status enum, `version`, `clientRequestId`, `requestPayloadHash`, `@@unique([createdById, ticketId, clientRequestId])`, migration SQL, recovery documentation, and idempotent seed with 0, 1, and many actions per ticket.
- **Gate:** Preserves legacy rows and attachment files; seed safe to run repeatedly. Verified by `server/tests/lab-04/migration-preservation.test.ts` (5/5 tests pass).
- **MIG-L4-02 Note:** Sandbox backup and restore recovery verification (`MIG-L4-02`) is explicitly **deferred to Phase F4 (L4-P11)** regression testing on disposable test DB (`toktickit_test_*`) to isolate database dump/restore operations from feature branch cycles.

#### L4-P04: Actions Taken REST API & Authorization
- **Status:** **Verified (automated)**
- **Dependencies:** L4-P03
- **Scope:** Action Taken lifecycle endpoints (`GET list`, `POST create`, `PATCH edit/assign`, `POST complete`, `POST cancel`; soft-cancellation only, no DELETE endpoint), backend session actor enforcement (`createdById`, `performedById`), inactive assignee rejection (422 `INVALID_ASSIGNEE`), optimistic locking (`ActionTaken.version`), persistent idempotent retry (`clientRequestId` with UUIDv4, 201 created vs 200 replay scoped to `(createdById, ticketId, clientRequestId)`), parent ticket locking (`SELECT ... FOR UPDATE`), role isolation and confidentiality.
- **Gate:** All positive and negative API tests pass (`API-L4-01` to `API-L4-17`, `API-L4-22a-i`, `API-L4-24a` to `API-L4-24h`, `API-L4-30b`). Verified by `server/tests/lab-04/actions-taken.api.test.ts` (38/38 tests pass).

#### L4-P05: Actions Taken UI in Ticket Detail
- **Status:** **Verified (automated)**
- **Dependencies:** L4-P04
- **Scope:** Actions Taken panel in Ticket Detail (desktop table & mobile `<768px` card list, create modal/form, view/edit, complete/cancel actions), Requester read-only view, Staff/Admin controls, responsive layout with zero horizontal overflow (`scrollWidth <= 375px`), idempotent UUIDv4 reuse on network retry, accessible form labels (UI-spec 7.1).
- **Gate:** Component and flow tests pass (`UI-L4-04` to `UI-L4-07`, `UI-L4-11` to `UI-L4-15`, 13/13 pass in `ActionsTaken.test.tsx`, `ZenGreenTokens.test.tsx` 2/2 pass; 99/99 total client suite). Mobile card rendering verified (`UI-L4-15`). Visual inspection screenshots retaken at 375px and archived in `artifacts/lab-04/screenshots/actions-taken/` (zero horizontal overflow asserted). E2E lifecycle flow verified by `e2e/lab-04/actions-taken-flow.spec.ts` (`E2E-L4-01`, 3/3 viewports pass).

#### L4-P06: Final Ticket Workflow & Resolution Gate
- **Status:** **Verified (automated)**
- **Dependencies:** L4-P04, L4-P05
- **Scope:** Complete 8-status transition matrix (17 allowed, 47 rejected), backend resolution gate requiring completed action and 0 pending actions (422 `RESOLUTION_GATE_FAILED`), Requester advisory appears-resolved handling, optimistic concurrency protection (`Ticket.version` check with 409 `CONFLICT`), atomic transaction row locking, resolution gate alert banner and conflict reload banner on client.
- **Gate:** Transition tests, bypass attempts rejected, legacy zero-action ticket resolution blocked with 422 (`API-L4-18` to `API-L4-21`, `API-L4-23a/b/c`, `API-L4-25a/b`, `API-L4-26` in `ticket-workflow.api.test.ts` 10/10 pass). Component workflow banners verified (`UI-L4-09`, `UI-L4-10` in `TicketWorkflow.test.tsx` 2/2 pass). End-to-end resolution gate enforcement verified by `e2e/lab-04/ticket-resolution.spec.ts` (`E2E-L4-02`, 3/3 viewports pass: blocked before action, succeeds after completing action). Full Playwright suite: 114/114 passed across desktop, tablet, and mobile.

---

### Phase F3 — Dashboards & Cross-Feature Integration

**User scope update — 2026-10-02:** Include all six F2 review follow-ups in F3. Prepare the existing four local fixes and implement the datetime/UUID fixes at F3 startup; track acceptance under L4-P10 without changing the existing work-package dependencies. See `F3-CARRYOVER.md` for current implementation status, test IDs, and integration gates.

#### L4-P07: Dashboard Backend API & Authoritative Metrics
- **Status:** **Verified (automated, 2026-10-02)**
- **Dependencies:** L4-P03, L4-P04, L4-P06
- **Scope:** Endpoints `GET /api/dashboard/requester`, `GET /api/dashboard/staff`, `GET /api/dashboard/admin` returning concise aggregated statistics, recent ticket items, and my recent actions (`performedById === currentUser.id`). API filter deltas for list endpoints: `GET /api/tickets?recent=7d` and `statusGroup=open`; `GET /api/staff/tickets?statusGroup=open/active` with read access extended to `ADMINISTRATOR`.
- **Gate:** API tests pass; metric counts match independent SQL database queries (`API-L4-27` to `API-L4-33a/b`).

#### L4-P08: Requester Dashboard UI
- **Status:** **Verified (automated, 2026-10-02)**
- **Dependencies:** L4-P07
- **Scope:** Requester Dashboard view with 4 metric cards, recent tickets list, drill-down navigation to My Tickets (`/my-tickets?statusGroup=open`, `status=WAITING_FOR_REQUESTER`, `recent=7d`, `status=RESOLVED&recent=7d`), empty/loading/error states.
- **Gate:** Component and E2E tests pass for Requester role (`UI-L4-01`, `UI-L4-08`).

#### L4-P09: IT Staff & Administrator Dashboard UI
- **Status:** **Verified (automated, 2026-10-02)**
- **Dependencies:** L4-P07
- **Scope:** Staff Dashboard with operational metrics, current-user actions taken, recent/urgent tickets list, drill-downs to Queue (`/staff/queue?owner=unassigned&statusGroup=open`, `owner=me&statusGroup=active`, `statusGroup=open`, `status=WAITING_FOR_REQUESTER`). Admin user-account counts and links to `/admin/tickets/:id`.
- **Gate:** Component and E2E tests pass for Staff and Admin roles (`UI-L4-02`, `UI-L4-03`).

#### L4-P10: Cross-Feature Integration, Security & Concurrency
- **Status:** **Verified (automated, 2026-10-02)**
- **Dependencies:** L4-P05, L4-P06, L4-P08, L4-P09
- **Scope:** Multi-role cross testing, session isolation, concurrent updates, network retry protection, form data preservation on failure, and all six review corrections in `F3-CARRYOVER.md`.
- **Gate:** Security, concurrency, and E2E flows passing with zero private data leakage (`UNIT-L4-01/02`, `STYLE-L4-01/02`); carry-over checks `API-L4-22j–22m`, `UNIT-L4-01b`, `UI-L4-06b`, `UI-L4-16–18` verified on the integrated F3 branch.

---

### Phase F4 — Regression & Final Polish

#### L4-P11: Full Regression Suite & Performance Smoke
- **Status:** **Planned**
- **Dependencies:** L4-P10
- **Scope:** Full regression test across Labs 1, 2, 3, and 4 (unit, API, client, Playwright E2E). Sandbox backup and restore recovery verification (`MIG-L4-02`, deferred from F2) on disposable test DB (`toktickit_test_*`). Performance smoke checks under standard data loads.
- **Gate:** Zero failed tests, zero skipped tests, evidence captured with run times and commit SHAs. MIG-L4-02 backup/restore verified.

#### L4-P12: Responsive, Accessibility, Visual Inspection & Documentation
- **Status:** **Planned**
- **Dependencies:** L4-P11
- **Scope:** Visual inspection across Desktop (1280px), Tablet (768px), and Mobile (375px). Accessibility (a11y) verification, screenshot captures, README update, `visual-checklist.md`.
- **Gate:** Product Definition of Done satisfied; clean visual screenshots archived.

---

### Phase F5 — Peer Review & Final Submission

#### L4-P13: Peer Review & Staged Integration
- **Status:** **Planned**
- **Dependencies:** L4-P11, L4-P12
- **Scope:** Review packet preparation, PR review records in `reviewer.md`, peer approval, merge into `lab4-staging`, and release PR to `main`.
- **Gate:** Release PR merged into `main` by peer reviewer; final verification on clean `main`.

#### L4-P14: Final Submission Document (Single PDF)
- **Status:** **Planned**
- **Dependencies:** L4-P13
- **Scope:** Generate single comprehensive submission PDF covering Answer Part 1 through Part 9 according to rubric; complete `ai-use.md` with prompt records and human reflection.
- **Gate:** PDF rendered cleanly with working links, legible screenshots, and full rubric compliance.

## F1 closure checkpoint — 2026-09-26

See `F1-CLOSEOUT.md` for the single current gate record. F1 document fixes do not certify F2 code or product tests. F2 code exists in the current checkout (HEAD `3efa5e4981b0434241da9db44a82b29b230b11cb` at inspection); its acceptance gates were not rerun. Decisions D01–D13 remain Proposed pending an actual acceptance record. Peer review and Development-panel linking must be evidenced, not inferred from PR prose.
