# Phase 9 Test Results

**Branch:** `feature/13-lab2-docs-submission`<br>
**Run date:** 2026-09-06<br>
**Base:** `lab2-staging`

---

## 1. Full Quality Verification Matrix

| Suite | Command | Result |
|---|---|---|
| **Server Vitest** | `npm --prefix server test` | **PASS** — 14 files, 104 tests (100%) |
| **Client Vitest** | `npm --prefix client test` | **PASS** — 8 files, 37 tests (100%) |
| **Playwright Full Suite** | `npx playwright test` | **PASS** — 21/21 tests (100% across Desktop, Tablet, Mobile) |
| **Server Build** | `npm --prefix server run build` | **PASS** — `tsc` exit code 0 |
| **Client Build** | `npm --prefix client run build` | **PASS** — `tsc && vite build` exit code 0 |
| **Git Hygiene** | `git diff --check` | **PASS** — 0 whitespace errors |
| **DB Seed Idempotency** | Seed script execution | **PASS** — Idempotent execution verified |

---

## 2. Server Test Suite Output

```text
> toktickit-server@1.0.0 test
> vitest run

 ✓ tests/lab-02/my-tickets.api.test.ts (8 tests)
 ✓ tests/lab-02/attachments.api.test.ts (19 tests)
 ✓ tests/lab-02/ownership-hardening.api.test.ts (37 tests)
 ✓ tests/lab-02/create-ticket.api.test.ts (11 tests)
 ✓ tests/lab-02/ticket-detail.api.test.ts (5 tests)
 ✓ tests/lab-02/requester-middleware.api.test.ts (7 tests)
 ✓ tests/lab-02/safe-filename.unit.test.ts (2 tests)
 ✓ tests/lab-02/ticket-number.unit.test.ts (4 tests)
 ✓ tests/lab-02/reference-data.api.test.ts (4 tests)
 ✓ tests/lab-02/validation.unit.test.ts (1 test)
 ✓ tests/lab-02/requesters.api.test.ts (3 tests)
 ✓ tests/lab-02/pagination.unit.test.ts (1 test)
 ✓ tests/lab-01/health.test.ts (1 test)
 ✓ tests/lab-01/categories.test.ts (1 test)

 Test Files  14 passed (14)
      Tests  104 passed (104)
```

---

## 3. Client Test Suite Output

```text
> toktickit-client@1.0.0 test
> vitest run

 ✓ tests/lab-01/App.test.tsx (3 tests)
 ✓ tests/lab-02/RouteGuard.test.tsx (4 tests)
 ✓ tests/lab-02/AppShell.test.tsx (1 test)
 ✓ tests/lab-02/RequesterTicketDetail.test.tsx (5 tests)
 ✓ tests/lab-02/RequesterSelection.test.tsx (4 tests)
 ✓ tests/lab-02/AttachmentSection.test.tsx (5 tests)
 ✓ tests/lab-02/MyTickets.test.tsx (6 tests)
 ✓ tests/lab-02/CreateTicket.test.tsx (9 tests)

 Test Files  8 passed (8)
      Tests  37 passed (37)
```

---

## 4. Playwright Suite Output

```text
Running 21 tests using 1 worker

  ok  1 [desktop] RESP-01: My Tickets at <768px replaces table with card list
  ok  2 [desktop] RESP-02: Create Ticket at 768–991px shows two-column classification fields
  ok  3 [desktop] RESP-03: All three screens at ≥992px center content with max width 1200px
  ok  4 [desktop] Capture 3 screenshots for current viewport project
  ok  5 [desktop] E2E-01: Full happy path
  ok  6 [desktop] E2E-02: Simulated backend failure during ticket submission retains form values
  ok  7 [desktop] E2E-03: Negative security flows (403 direct URL & 410 stale download UI)
  ok  8 [tablet]  RESP-01: My Tickets at <768px replaces table with card list
  ok  9 [tablet]  RESP-02: Create Ticket at 768–991px shows two-column classification fields
  ok 10 [tablet]  RESP-03: All three screens at ≥992px center content with max width 1200px
  ok 11 [tablet]  Capture 3 screenshots for current viewport project
  ok 12 [tablet]  E2E-01: Full happy path
  ok 13 [tablet]  E2E-02: Simulated backend failure during ticket submission retains form values
  ok 14 [tablet]  E2E-03: Negative security flows (403 direct URL & 410 stale download UI)
  ok 15 [mobile]  RESP-01: My Tickets at <768px replaces table with card list
  ok 16 [mobile]  RESP-02: Create Ticket at 768–991px shows two-column classification fields
  ok 17 [mobile]  RESP-03: All three screens at ≥992px center content with max width 1200px
  ok 18 [mobile]  Capture 3 screenshots for current viewport project
  ok 19 [mobile]  E2E-01: Full happy path
  ok 20 [mobile]  E2E-02: Simulated backend failure during ticket submission retains form values
  ok 21 [mobile]  E2E-03: Negative security flows (403 direct URL & 410 stale download UI)

  21 passed (27.1s)
```
