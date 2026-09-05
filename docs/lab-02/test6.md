# Phase 6 Test Results

**Branch:** `feature/10-lab2-ownership-hardening`<br>
**Run date:** 2026-09-05<br>
**Base:** `lab2-staging` (`1dd6803`)

---

## 1. Server Tests

Command:
```bash
npm --prefix server run test
```

Result:
```text
Test Files  14 passed (14)
Tests       104 passed (104)
Duration    5.30s
```

Covered suites:
- Lab 1 health and categories regression
- UNIT-01/UNIT-02 ticket-number generation & collision retry
- UNIT-03 trim & validate ticket input
- UNIT-04/UNIT-05 safe filename policy & minimum length / magic bytes validation (< 4 bytes rejection)
- UNIT-06 pagination helper
- MW-03/MW-04/MW-05/MW-06 shared requester middleware (including empty header 400 and integer overflow guard 401)
- Active requester API (API-26)
- Reference data endpoints (API-27: active categories & related systems)
- Create ticket API (API-01 to API-05, API-21, API-28, API-29)
- My tickets API (API-06, API-07, API-08, API-09, API-22, API-30, API-31)
- Ticket detail API (API-10, API-11, API-12, malformed ID, missing header)
- Attachments API (API-13, API-14, API-15, API-16, API-17, API-18, API-19, API-20, API-23, API-24, API-25, API-32, API-33, API-34)
- **Phase 6 Ownership Hardening Pass (`API-35` in `server/tests/lab-02/ownership-hardening.api.test.ts`):**
  - Section 1 (30 tests): Missing (401), empty (400), malformed (400), unknown (401), out-of-range integer (401), and inactive (401) header triggers across `GET /api/tickets`, `GET /api/tickets/:id`, `POST /api/tickets/:id/attachments`, `GET /api/attachments/:id/download`, and `DELETE /api/attachments/:id`
  - Section 2 (6 tests): Cross-requester ownership boundaries — body requesterId spoofing ignored (creates ticket with 201 Created), ticket list filtering, ticket detail 403, attachment upload 403, attachment download 403, attachment removal 403
  - Section 3 (1 test): Real seeded Requesters cross-access verification (Sarah Johnson cannot view, download, or delete Jennifer Anderson's records)

---

## 2. Client Tests

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

Covered suites:
- Lab 1 App regression
- UI-10 RouteGuard protection & URL restoration
- UI-11 RequesterSelection loading, empty, failure, retry, continue
- UI-17 AppShell active tab, requester identity, change requester
- UI-01 to UI-04, UI-12, UI-13, STYLE-01, STYLE-04, UI-18 CreateTicket
- UI-05, UI-06, UI-14, STYLE-02 MyTickets
- RequesterTicketDetail (UI-07, UI-15, STYLE-03)
- AttachmentSection (UI-08, UI-09, UI-16)

---

## 3. Build & Quality Gates

1. **Server Build (`tsc`):** Clean exit code 0.
2. **Client Build (`tsc && vite build`):** Clean exit code 0.
3. **No Skipped or Disabled Tests:** 0 `.skip()`, 0 `.todo()`, 0 commented out assertions.
4. **Whitespace Check (`git diff --check`):** Clean exit code 0.
