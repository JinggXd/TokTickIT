# TokTickIT Lab 4 — Phase & Work Package Pipeline (F1–F5 / L4-P00–L4-P14)

**Date:** 2026-09-25  
**Document Version:** 1.2.0 (Synchronized following F1-Review Round 2 Findings)  
**Baseline:** `main` at `baad45e09272d665bc0cf765236c456edcf0eff7`  
**Lab 4 Staging Branch:** `lab4-staging` (to be created from `main`)  

---

## 1. Major Phase Overview

| Phase | Description | Work Packages | Current Status | Acceptance Gate |
|---|---|---|---|---|
| **F1** | Baseline, Contracts, Decisions & Tests | L4-P00–L4-P02 | **In Progress** | Specifications & tests complete, D01–D10 addressed, test environment verified |
| **F2** | Actions Taken & Ticket Workflow | L4-P03–L4-P06 | **Planned** | DB migration, APIs, UI in Ticket Detail, and resolution gate passing |
| **F3** | Dashboards & Cross-Feature Integration | L4-P07–L4-P10 | **Planned** | Metrics accurate, drill-downs functional, role isolation & concurrency safe |
| **F4** | Regression, Hardening & Visual Polish | L4-P11–L4-P12 | **Planned** | Zero regressions across Labs 1–4, responsive 3 viewports, accessibility verified |
| **F5** | Peer Review, Release & Submission | L4-P13–L4-P14 | **Planned** | Staging PRs reviewed/merged, release to main verified, single submission PDF |

---

## 2. Work Package Details & Dependencies

### Phase F1 — Foundation, Engineering Contracts & Test Safety

#### L4-P00: Baseline Assessment & Audit
- **Status:** **Verified**
- **Dependencies:** None
- **Scope:** Verify git state, clean working tree, review existing schema/routes, verify test database safety guards (`server/src/config/testEnvironment.ts`) via runtime test execution (24/24 pass), run baseline builds and non-DB client tests (82/82 passed).
- **Deliverables:** `docs/lab-04/baseline.md`, `docs/lab-04/implementation-log.md`.
- **Gate:** Safe baseline established without any destructive actions or product code modifications.

#### L4-P01: Sprint 4 Engineering Contract & Decisions
- **Status:** **In Progress**
- **Dependencies:** L4-P00
- **Scope:** Define complete 11-section `specification.md`, `api-spec.md`, `ui-spec.md`, and resolve D01–D10 in `decisions.md`. Propose minimal patch for `AGENTS.md` and `.antigravityrules`.
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
- **Status:** **Planned**
- **Dependencies:** L4-P01, L4-P02
- **Scope:** Add `ActionTaken` model, relations, status enum, `version`, `clientRequestId`, `requestPayloadHash`, `@@unique([createdById, ticketId, clientRequestId])`, migration SQL, recovery documentation, and idempotent seed with 0, 1, and many actions per ticket.
- **Gate:** Preserves legacy rows and attachment files; seed safe to run repeatedly.

#### L4-P04: Actions Taken REST API & Authorization
- **Status:** **Planned**
- **Dependencies:** L4-P03
- **Scope:** Action Taken lifecycle endpoints (`GET list`, `POST create`, `PATCH edit/assign`, `POST complete`, `POST cancel`; soft-cancellation only, no DELETE endpoint), backend session actor enforcement (`createdById`, `performedById`), inactive assignee rejection (422 `INVALID_ASSIGNEE`), optimistic locking (`ActionTaken.version`), persistent idempotent retry (`clientRequestId` with UUIDv4, 201 created vs 200 replay scoped to `(createdById, ticketId, clientRequestId)`), parent ticket locking (`SELECT ... FOR UPDATE`), role isolation and confidentiality.
- **Gate:** All positive and negative API tests pass (`API-L4-01` to `API-L4-17`, `API-L4-22`, `API-L4-24a` to `API-L4-24h`).

#### L4-P05: Actions Taken UI in Ticket Detail
- **Status:** **Planned**
- **Dependencies:** L4-P04
- **Scope:** Actions Taken panel in Ticket Detail (list/table, create modal/form, view/edit, complete/cancel actions), Requester read-only view, Staff/Admin controls, responsive layout, idempotent UUIDv4 reuse on network retry.
- **Gate:** Component and flow tests pass; visual inspection verified (`UI-L4-04` to `UI-L4-07`, `UI-L4-11`, `UI-L4-12`).

#### L4-P06: Final Ticket Workflow & Resolution Gate
- **Status:** **Planned**
- **Dependencies:** L4-P04, L4-P05
- **Scope:** Complete 8-status transition matrix (17 allowed, 47 rejected), backend resolution gate requiring completed action and 0 pending actions (422 `RESOLUTION_GATE_FAILED`), Requester advisory appears-resolved handling, optimistic concurrency protection (`Ticket.version` check with 409 `CONFLICT`), atomic transaction row locking.
- **Gate:** Transition tests, bypass attempts rejected, legacy zero-action ticket resolution blocked with 422 (`API-L4-18` to `API-L4-21`, `API-L4-23a/b/c`, `API-L4-25a/b`, `API-L4-26`).

---

### Phase F3 — Dashboards & Cross-Feature Integration

#### L4-P07: Dashboard Backend API & Authoritative Metrics
- **Status:** **Planned**
- **Dependencies:** L4-P03, L4-P04, L4-P06
- **Scope:** Endpoints `GET /api/dashboard/requester`, `GET /api/dashboard/staff`, `GET /api/dashboard/admin` returning concise aggregated statistics, recent ticket items, and my recent actions (`performedById === currentUser.id`). API filter deltas for list endpoints: `GET /api/tickets?recent=7d` and `statusGroup=open`; `GET /api/staff/tickets?statusGroup=open/active` with read access extended to `ADMINISTRATOR`.
- **Gate:** API tests pass; metric counts match independent SQL database queries (`API-L4-27` to `API-L4-33a/b`).

#### L4-P08: Requester Dashboard UI
- **Status:** **Planned**
- **Dependencies:** L4-P07
- **Scope:** Requester Dashboard view with 4 metric cards, recent tickets list, drill-down navigation to My Tickets (`/my-tickets?statusGroup=open`, `status=WAITING_FOR_REQUESTER`, `recent=7d`, `status=RESOLVED&recent=7d`), empty/loading/error states.
- **Gate:** Component and E2E tests pass for Requester role (`UI-L4-01`, `UI-L4-08`).

#### L4-P09: IT Staff & Administrator Dashboard UI
- **Status:** **Planned**
- **Dependencies:** L4-P07
- **Scope:** Staff Dashboard with operational metrics, current-user actions taken, recent/urgent tickets list, drill-downs to Queue (`/staff/queue?owner=unassigned&statusGroup=open`, `owner=me&statusGroup=active`, `statusGroup=open`, `status=WAITING_FOR_REQUESTER`). Admin user-account counts and links to `/admin/tickets/:id`.
- **Gate:** Component and E2E tests pass for Staff and Admin roles (`UI-L4-02`, `UI-L4-03`).

#### L4-P10: Cross-Feature Integration, Security & Concurrency
- **Status:** **Planned**
- **Dependencies:** L4-P05, L4-P06, L4-P08, L4-P09
- **Scope:** Multi-role cross testing, session isolation, concurrent updates, network retry protection, form data preservation on failure.
- **Gate:** Security, concurrency, and E2E flows passing with zero private data leakage (`UNIT-L4-01/02`, `STYLE-L4-01/02`).

---

### Phase F4 — Regression & Final Polish

#### L4-P11: Full Regression Suite & Performance Smoke
- **Status:** **Planned**
- **Dependencies:** L4-P10
- **Scope:** Full regression test across Labs 1, 2, 3, and 4 (unit, API, client, Playwright E2E). Performance smoke checks under standard data loads.
- **Gate:** Zero failed tests, zero skipped tests, evidence captured with run times and commit SHAs.

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
