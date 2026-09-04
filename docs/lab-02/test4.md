# Phase 4 Test Results

**Branch:** `feature/8-lab2-my-tickets`<br>
**Run date:** 2026-09-04<br>
**Base:** `lab2-staging` (`1ac4d54`)

---

## 1. Server Tests

Command:
```bash
npm --prefix server run test
```

Result:
```text
Test Files  11 passed (11)
Tests       41 passed (41)
Duration    3.50s
```

Covered suites:
- Lab 1 health and categories regression
- UNIT-01/UNIT-02 ticket-number generation & collision retry
- UNIT-03 trim & validate ticket input
- UNIT-04/UNIT-05 safe filename policy
- UNIT-06 pagination helper
- MW-03/MW-04/MW-05/MW-06 shared requester middleware
- Active requester API (API-26)
- Reference data endpoints (API-27: active categories & related systems)
- Create ticket API (API-01 to API-05, API-21, API-28, API-29)
- My tickets API (API-06 ownership scoping, API-07 sorting, API-08 pagination clamping, API-09 search, API-22 query validation for all 7 params, API-30 independent & combined filters with ownership preserved, API-31 default sort and id desc tie-breaker)

---

## 2. Client Tests

Command:
```bash
npm --prefix client run test
```

Result:
```text
Test Files  6 passed (6)
Tests       25 passed (25)
Duration    5.82s
```

Covered suites:
- Lab 1 App regression
- UI-10 RouteGuard protection & URL restoration
- UI-11 RequesterSelection loading, empty, failure, retry, continue
- UI-17 AppShell active tab, requester identity, change requester
- UI-01 to UI-04, UI-12, UI-13, STYLE-01, STYLE-04 CreateTicket intake, busy button, value preservation, attachment rejection, success card
- UI-05, UI-06, UI-14, STYLE-02 MyTickets:
  - UI-05: Distinct Empty State vs No-Results State
  - UI-06: Requester switching stale data clearance (deferred pending, failure, and out-of-order response paths)
  - UI-14: Search, all 4 filters (Category, Requested Priority, IT Priority, Status), column sort direction toggle, page-size selector, direct page numbers, Previous/Next, button hierarchy assertions for `.btn-secondary-zen`, genuine loading spinner, and retry banner
  - STYLE-02: Accessible status and priority badges (icon + text, not color alone) with exact spec color tokens (`#15803D`, `#F1F5F9`/`#475569`)

---

## 3. Production Build Verification

| Command | Result |
|---|---|
| `npm --prefix server run build` | PASS (`tsc` exit code 0) |
| `npm --prefix client run build` | PASS (`tsc && vite build` exit code 0) |

---

## 4. Skipped-Test Check

Zero `.skip`, `.todo`, `xdescribe`, `xit`, or `xtest` instances across `server/tests` and `client/tests`.
Zero whitespace issues via `git diff --check`.
Zero test leakage or modification to seeded database users.

---

## 5. Live Application Verification (AC-10 to AC-14)

Live API verification conducted on running backend (`http://localhost:3000`):
- **AC-10 (Filtering & Search):** Tested Category filter (`categoryId=2`), Priority filter (`requestedPriority=LOW`), and Search (`search=TKT-2026-900096`) against Requester 1. Returned exactly 1 matching ticket with no data leakage.
- **AC-11 (Sorting):** Tested `sortBy=createdAt&sortOrder=asc` vs default `createdAt desc, id desc`. Verified deterministic tie-breaker sorting.
- **AC-12 (Pagination Clamping):** Tested `page=999` (clamped to `currentPage: 2`), `page=-5` (clamped to `currentPage: 1`), and invalid `limit=15` (returns `400 Bad Request`).
- **AC-13 (Requester Switching):** Confirmed Requester 1 (9 tickets) and Requester 2 (0 tickets) switch cleanly with immediate state reset (`tickets: []`) and zero residual rows.
- **AC-14 (Empty vs. No-Results):** Confirmed Requester 2 displays Empty State (📄 icon + "Create First Ticket" action), and Requester 1 with unmatched search displays No-Results State (🔍 icon + "Clear Filters" action).

