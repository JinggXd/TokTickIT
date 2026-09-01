# Lab 2 Ambiguity & Resolution Log (ambiguity-log.md)

**Sprint:** TokTickIT Lab 2 (Requester Ticketing MVP)  
**Governance:** `AGENTS.md` Hard Rule #1 (Contract Ambiguity Surfacing & Resolution)  
**Date:** 2026-09-01  
**Status:** ✅ Confirmed by Reviewer & Integrated into Contract Files  

---

## 1. Executive Summary

Per **`AGENTS.md` Hard Rule #1**:
> *"Read all four contract files in full before writing any code for a new phase. If anything is ambiguous, contradictory, or missing, list it explicitly and propose a resolution instead of silently inventing a business rule."*

During the architectural review of `docs/lab-02/specification.md`, `api-spec.md`, `ui-spec.md`, `tests.md`, and `.agents/skills/lab2-toktickit-build/SKILL.md`, a total of **5 structural contradictions/gaps** were identified and systematically resolved before Phase 2–9 implementation.

---

## 2. Log of Ambiguities & Confirmed Resolutions

### 📌 Ambiguity 1 — API-03/04/05 Test Target & Lifecycle (Phase 2 vs Phase 3)
- **Problem:**
  - `SKILL.md` Phase 2, item 1 (lines 63-65): Instructs `API-03/04/05` to be written against the shared `X-Requester-Id` validation middleware during Phase 2, before `POST /api/tickets` exists.
  - `tests.md` Section 4 (lines 60-62): Pins `API-03/04/05`'s file column to `server/tests/lab-02/create-ticket.api.test.ts`, which is only created in Phase 3.
- **Confirmed Resolution:**
  - **Phase 2:** Write `MW-03, MW-04, MW-05` against the middleware directly via a throwaway route in `server/tests/lab-02/requester-middleware.api.test.ts` to satisfy Phase 2 "Done when" without depending on Phase 3.
  - **Phase 3:** Write `API-03, API-04, API-05` in `server/tests/lab-02/create-ticket.api.test.ts` asserting the real wired response on `POST /api/tickets` (including no `details` key to distinguish from `API-02`).
  - **Updates made:** `tests.md` Section 4, 10; `SKILL.md` Phase 2, Phase 3.

---

### 📌 Finding A — AC-05 Traceability Mismatch (tests.md Section 9)
- **Problem:**
  - `specification.md` Section 3.1 & 8 defines `AC-05` strictly as **client-side attachment rejection** (disallowed types, files > 5MB, active count > 5).
  - `tests.md` Section 9 mapped `API-13, API-14, UI-04` to `AC-05`, making Phase 3's "Done when: AC-05..." appear dependent on server-side attachment endpoints from Phase 5.
- **Confirmed Resolution:**
  - Correct `AC-05` mapping in `tests.md` Section 9 to map strictly to `UI-04` (client-side form rejection).
  - Server-side attachment limits remain mapped to `BR-07` (`API-13, API-14, API-15, UI-09`) in Section 10.
  - **Updates made:** `tests.md` Section 9.

---

### 📌 Finding B — RESP-01 Scheduled in Phase 4 for Phase 7 Deliverable
- **Problem:**
  - `SKILL.md` Phase 4 item 5 instructed writing `RESP-01` in Phase 4.
  - However, `RESP-01` is pinned to `e2e/lab-02/requester-ticket-flow.spec.ts`, which is a Phase 7 deliverable. Writing it in Phase 4 violated SKILL.md's rule: *"Do not skip ahead to a later phase's files"*.
- **Confirmed Resolution:**
  - Phase 4 focuses on `STYLE-02` (badge non-color accessibility) and informal manual checking of responsive card layout.
  - Formal automated `RESP-01` test execution remains in Phase 7 alongside `RESP-02, RESP-03`.
  - **Updates made:** `SKILL.md` Phase 4 item 5.

---

### 📌 Finding C — ACs Traceability to Phase 8 E2E Tests
- **Problem:**
  - `AC-01, AC-07, AC-08, AC-13, AC-17` map to `E2E-0X` tests written in Phase 8, but earlier phases' "Done when" list these ACs as passing before E2E files exist.
- **Confirmed Resolution:**
  - Added an explicit note in `SKILL.md`: For Phases 2–5, *"pass by hand and by test"* means verified manually once + every test ID assigned to a completed phase; the `E2E-0X` test formally closes the loop in Phase 8.
  - **Updates made:** `SKILL.md` introductory section.

---

### 📌 Finding D — 5 Missing Test IDs in Error Scenario Matrix (api-spec.md Section 7)
- **Problem:**
  - `api-spec.md` Section 7 defines 5 distinct error paths that had no corresponding test IDs in `tests.md` Section 4:
    1. `POST /api/tickets` ticket-number retry exhausted $\rightarrow$ `500`
    2. `GET /api/tickets` unsupported `sortBy`/`limit` $\rightarrow$ `400`
    3. `POST /api/tickets/:id/attachments` cross-Requester upload $\rightarrow$ `403`
    4. `DELETE /api/attachments/:id` missing/short `removalReason` $\rightarrow$ `400`
    5. `DELETE /api/attachments/:id` cross-Requester removal $\rightarrow$ `403`
- **Confirmed Resolution:**
  - Created 5 new test IDs (appended to Section 4 without renumbering):
    - `API-21` (`POST /api/tickets` retry exhausted $\rightarrow$ `500`, in `create-ticket.api.test.ts`)
    - `API-22` (`GET /api/tickets` unsupported query params $\rightarrow$ `400`, in `my-tickets.api.test.ts`)
    - `API-23` (`POST /.../attachments` cross-Requester upload $\rightarrow$ `403`, in `attachments.api.test.ts`)
    - `API-24` (`DELETE /attachments/:id` missing reason $\rightarrow$ `400`, in `attachments.api.test.ts`)
    - `API-25` (`DELETE /attachments/:id` cross-Requester removal $\rightarrow$ `403`, in `attachments.api.test.ts`)
  - Updated traceability in Section 9 (`AC-08` $\rightarrow$ `API-10, API-20, API-23, API-25, E2E-03`) and Section 10 (`BR-01, BR-04, BR-12`).
  - Added test creation steps into `SKILL.md` Phases 3, 4, 5, and updated Phase 6 re-run list.
  - **Updates made:** `tests.md` Section 4, 9, 10; `SKILL.md` Phases 3, 4, 5, 6.

---

### 📌 Note — Phase 9 Documentation Deliverables
- In Phase 9, individual phase logs (`whatihavedone*.md`, `test*.md`, `ai*.md`, `filechange*.md`) will be consolidated into the official project-level files required by `specification.md` Section 10.2:
  - `docs/lab-02/reviewer.md`
  - `docs/lab-02/ai-use.md`

---

## 3. Impact Assessment & Status

All changes maintain 100% backward compatibility with Lab 1 and eliminate any blocker or ambiguity for Phase 2 through Phase 9. All contract updates are committed and ready for execution.
