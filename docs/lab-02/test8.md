# Phase 8 Test Results

**Branch:** `feature/12-lab2-e2e-flows`<br>
**Run date:** 2026-09-05<br>
**Base:** `lab2-staging`

---

## 1. Playwright Suite (Responsive + End-to-End Integration Flows)

Command:
```bash
npx playwright test e2e/lab-02/requester-ticket-flow.spec.ts
```

Result:
```text
Running 21 tests using 1 worker

  ok  1 [desktop] › e2e\lab-02\requester-ticket-flow.spec.ts:185:3 › RESP-01: My Tickets at <768px replaces table with card list, buttons full width, and has zero horizontal scroll (606ms)
  ok  2 [desktop] › e2e\lab-02\requester-ticket-flow.spec.ts:240:3 › RESP-02: Create Ticket at 768–991px shows two-column classification fields while Summary/Description remain full width, and My Tickets shows compact table (363ms)
  ok  3 [desktop] › e2e\lab-02\requester-ticket-flow.spec.ts:303:3 › RESP-03: All three screens at ≥992px center content with max width 1200px, no clipped text, and handle long content (416ms)
  ok  4 [desktop] › e2e\lab-02\requester-ticket-flow.spec.ts:385:3 › Capture 3 screenshots for current viewport project (desktop, tablet, or mobile) (1.0s)
  ok  5 [desktop] › e2e\lab-02\requester-ticket-flow.spec.ts:416:3 › E2E-01: Full happy path — select Requester, verify read-only fields, create ticket with attachment, find in My Tickets, switch Requester (1.9s)
  ok  6 [desktop] › e2e\lab-02\requester-ticket-flow.spec.ts:586:3 › E2E-02: Simulated backend failure during ticket submission retains form values (985ms)
  ok  7 [desktop] › e2e\lab-02\requester-ticket-flow.spec.ts:653:3 › E2E-03: Negative security flows — cross-requester direct URL (403) and removed attachment direct download (410) (1.4s)
  ok  8 [tablet] › e2e\lab-02\requester-ticket-flow.spec.ts:185:3 › RESP-01: My Tickets at <768px replaces table with card list, buttons full width, and has zero horizontal scroll (670ms)
  ok  9 [tablet] › e2e\lab-02\requester-ticket-flow.spec.ts:240:3 › RESP-02: Create Ticket at 768–991px shows two-column classification fields while Summary/Description remain full width, and My Tickets shows compact table (330ms)
  ok 10 [tablet] › e2e\lab-02\requester-ticket-flow.spec.ts:303:3 › RESP-03: All three screens at ≥992px center content with max width 1200px, no clipped text, and handle long content (372ms)
  ok 11 [tablet] › e2e\lab-02\requester-ticket-flow.spec.ts:385:3 › Capture 3 screenshots for current viewport project (desktop, tablet, or mobile) (980ms)
  ok 12 [tablet] › e2e\lab-02\requester-ticket-flow.spec.ts:416:3 › E2E-01: Full happy path — select Requester, verify read-only fields, create ticket with attachment, find in My Tickets, switch Requester (1.8s)
  ok 13 [tablet] › e2e\lab-02\requester-ticket-flow.spec.ts:586:3 › E2E-02: Simulated backend failure during ticket submission retains form values (890ms)
  ok 14 [tablet] › e2e\lab-02\requester-ticket-flow.spec.ts:653:3 › E2E-03: Negative security flows — cross-requester direct URL (403) and removed attachment direct download (410) (973ms)
  ok 15 [mobile] › e2e\lab-02\requester-ticket-flow.spec.ts:185:3 › RESP-01: My Tickets at <768px replaces table with card list, buttons full width, and has zero horizontal scroll (420ms)
  ok 16 [mobile] › e2e\lab-02\requester-ticket-flow.spec.ts:240:3 › RESP-02: Create Ticket at 768–991px shows two-column classification fields while Summary/Description remain full width, and My Tickets shows compact table (320ms)
  ok 17 [mobile] › e2e\lab-02\requester-ticket-flow.spec.ts:303:3 › RESP-03: All three screens at ≥992px center content with max width 1200px, no clipped text, and handle long content (417ms)
  ok 18 [mobile] › e2e\lab-02\requester-ticket-flow.spec.ts:385:3 › Capture 3 screenshots for current viewport project (desktop, tablet, or mobile) (1.2s)
  ok 19 [mobile] › e2e\lab-02\requester-ticket-flow.spec.ts:416:3 › E2E-01: Full happy path — select Requester, verify read-only fields, create ticket with attachment, find in My Tickets, switch Requester (3.3s)
  ok 20 [mobile] › e2e\lab-02\requester-ticket-flow.spec.ts:586:3 › E2E-02: Simulated backend failure during ticket submission retains form values (1.6s)
  ok 21 [mobile] › e2e\lab-02\requester-ticket-flow.spec.ts:653:3 › E2E-03: Negative security flows — cross-requester direct URL (403) and removed attachment direct download (410) (1.5s)

  21 passed (27.1s)
```

---

## 2. Server Unit & Integration Tests

Command:
```bash
npm --prefix server test
```

Result:
```text
Test Files  14 passed (14)
Tests       104 passed (104)
Duration    9.39s
```

---

## 3. Client Unit & Component Tests

Command:
```bash
npm --prefix client test
```

Result:
```text
Test Files  8 passed (8)
Tests       37 passed (37)
Duration    21.00s
```

---

## 4. Production Builds

Commands:
```bash
npm --prefix server run build
npm --prefix client run build
```

Result:
- Server `tsc`: 0 errors
- Client `vite build`: 0 errors (built in 1.32s)
