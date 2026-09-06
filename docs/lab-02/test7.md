# Phase 7 Test Results

**Branch:** `feature/11-lab2-responsive-visual`<br>
**Run date:** 2026-09-05<br>
**Base:** `lab2-staging` (`c937c7a`)

---

## 1. Playwright Responsive Suite (`RESP-01`, `RESP-02`, `RESP-03` & Project-Isolated Screenshots)

Command:
```bash
npx playwright test
```

Result:
```text
Running 12 tests using 1 worker

  ok  1 [desktop] › e2e/lab-02/requester-ticket-flow.spec.ts:192:3 › RESP-01: My Tickets at <768px replaces table with card list, buttons full width, and has zero horizontal scroll (489ms)
  ok  2 [desktop] › e2e/lab-02/requester-ticket-flow.spec.ts:247:3 › RESP-02: Create Ticket at 768–991px shows two-column classification fields while Summary/Description remain full width, and My Tickets shows compact table (460ms)
  ok  3 [desktop] › e2e/lab-02/requester-ticket-flow.spec.ts:310:3 › RESP-03: All three screens at ≥992px center content with max width 1200px, no clipped text, and handle long content (662ms)
  ok  4 [desktop] › e2e/lab-02/requester-ticket-flow.spec.ts:392:3 › Capture 3 screenshots for current viewport project (desktop, tablet, or mobile) (684ms)
  ok  5 [tablet] › e2e/lab-02/requester-ticket-flow.spec.ts:192:3 › RESP-01: My Tickets at <768px replaces table with card list, buttons full width, and has zero horizontal scroll (1.3s)
  ok  6 [tablet] › e2e/lab-02/requester-ticket-flow.spec.ts:247:3 › RESP-02: Create Ticket at 768–991px shows two-column classification fields while Summary/Description remain full width, and My Tickets shows compact table (401ms)
  ok  7 [tablet] › e2e/lab-02/requester-ticket-flow.spec.ts:310:3 › RESP-03: All three screens at ≥992px center content with max width 1200px, no clipped text, and handle long content (430ms)
  ok  8 [tablet] › e2e/lab-02/requester-ticket-flow.spec.ts:392:3 › Capture 3 screenshots for current viewport project (desktop, tablet, or mobile) (514ms)
  ok  9 [mobile] › e2e/lab-02/requester-ticket-flow.spec.ts:192:3 › RESP-01: My Tickets at <768px replaces table with card list, buttons full width, and has zero horizontal scroll (461ms)
  ok 10 [mobile] › e2e/lab-02/requester-ticket-flow.spec.ts:247:3 › RESP-02: Create Ticket at 768–991px shows two-column classification fields while Summary/Description remain full width, and My Tickets shows compact table (356ms)
  ok 11 [mobile] › e2e/lab-02/requester-ticket-flow.spec.ts:310:3 › RESP-03: All three screens at ≥992px center content with max width 1200px, no clipped text, and handle long content (469ms)
  ok 12 [mobile] › e2e/lab-02/requester-ticket-flow.spec.ts:392:3 › Capture 3 screenshots for current viewport project (desktop, tablet, or mobile) (855ms)

  12 passed (9.4s)
```

---

## 2. Server Unit & Integration Tests

Command:
```bash
npm --prefix server run test
```

Result:
```text
Test Files  14 passed (14)
Tests       104 passed (104)
Duration    5.56s
```

Covered suites:
- Lab 1 health and categories regression
- UNIT-01/UNIT-02 ticket-number generation & collision retry
- UNIT-03 trim & validate ticket input
- UNIT-04/UNIT-05 safe filename policy & minimum length / magic bytes validation (< 4 bytes rejection)
- UNIT-06 pagination helper
- MW-03/MW-04/MW-05/MW-06 shared requester middleware
- Active requester API (API-26)
- Reference data endpoints (API-27: active categories & related systems)
- Ticket creation API (API-01 to API-05, API-29)
- Ticket detail endpoint (API-12, API-14)
- My Tickets listing, search, filtering, and pagination (API-06 to API-09, API-30, API-31)
- Attachment lifecycle (API-15 to API-25)
- Cross-requester ownership boundary regression suite (37 tests)

---

## 3. Client Unit & Component Tests

Command:
```bash
npm --prefix client run test
```

Result:
```text
Test Files  8 passed (8)
Tests       37 passed (37)
Duration    9.13s
```

Covered components:
- Lab 1 App shell & routing
- Requester Selection screen & identity switching (UI-10, UI-11, UI-17)
- Dev Requester Route Guard (UI-10)
- Application Header & Shell navigation (UI-spec Section 9)
- Create Ticket form, client-side validation, submit prevention, and error recovery (UI-01 to UI-04, UI-12, UI-13, UI-18)
- My Tickets table & card list, search, multi-field filters, pagination, sort, empty state vs no-results state (UI-05, UI-06, UI-14)
- Requester Ticket Detail screen & read-only field rendering (UI-07, UI-15)
- AttachmentSection upload, download, and soft removal with reason dialog (UI-08, UI-09, UI-16)

---

## 4. Build Verifications

```bash
npm --prefix server run build
# tsc -> exit code 0

npm --prefix client run build
# tsc && vite build -> exit code 0
```
