# Phase 5 Test Results

**Branch:** `feature/9-lab2-ticket-detail`<br>
**Run date:** 2026-09-05<br>
**Base:** `lab2-staging` (`6399e5a`)

---

## 1. Server Tests

Command:
```bash
npm --prefix server run test
```

Result:
```text
Test Files  13 passed (13)
Tests       65 passed (65)
Duration    7.20s
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
- Create ticket API (API-01 to API-05, API-21, API-28, API-29)
- My tickets API (API-06, API-07, API-08, API-09, API-22, API-30, API-31)
- Ticket detail API (`server/tests/lab-02/ticket-detail.api.test.ts`):
  - API-10: Cross-requester access returns `403 Forbidden` with no ticket data leaked
  - API-11: Nonexistent ticket ID returns `404 Not Found`
  - API-12: Owned ticket returns `200 OK` with full ticket details and `attachments` array
  - Malformed ticket ID returns `400 Bad Request`
  - Missing `X-Requester-Id` header returns `401 Unauthorized`
- Attachments API (`server/tests/lab-02/attachments.api.test.ts`):
  - API-13: Upload with file > 5 MB rejected with `400 Bad Request`
  - API-14: Disallowed extension or spoofed magic bytes / short file (< 4 bytes) rejected with `400 Bad Request`
  - API-15: 6th active file rejected with `400 Bad Request`
  - API-15 (concurrent): Concurrent upload requests to a ticket with 4 active attachments serialize via row lock and strictly enforce 5-active limit (1 succeeds, 1 returns 400)
  - API-16: Valid file upload returns `201 Created` and persists attachment metadata
  - API-17: Soft-removal with reason sets `removedAt` and `removalReason`, returns `200 OK`
  - API-18: Double-removal attempt rejected with `409 Conflict`
  - API-19: Soft-removed file download returns `410 Gone` with no binary stream
  - API-20: Cross-requester download attempt returns `403 Forbidden`
  - API-23: Cross-requester upload attempt returns `403 Forbidden`
  - API-24: Missing or short `removalReason` (< 3 or > 200 chars) returns `400 Bad Request`
  - API-25: Cross-requester removal attempt returns `403 Forbidden`
  - API-32: Owned active file download returns `200 OK` with binary bytes and original `Content-Disposition` filename
  - API-33: Missing ticket/attachment IDs on upload, download, and removal return `404 Not Found`
  - API-34: Simulated storage write failure returns `500 Internal Server Error` without damaging the ticket

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
Duration    9.59s
```

Covered suites:
- Lab 1 App regression
- UI-10 RouteGuard protection & URL restoration
- UI-11 RequesterSelection loading, empty, failure, retry, continue
- UI-17 AppShell active tab, requester identity, change requester
- UI-01 to UI-04, UI-12, UI-13, STYLE-01, STYLE-04, UI-18 CreateTicket:
  - UI-01 to UI-04: Client-side validation, busy states, API failure preservation, file staging limits
  - UI-12, UI-13: Reference data loading, success screen with Ticket Number headline
  - UI-18: Post-create attachment failure preserves created Ticket Number and reports failed file with inline Retry
  - UI-18: Disables navigation and action buttons ("Create Another Ticket", "View My Tickets") while post-create attachments are uploading and displays live progress
- UI-05, UI-06, UI-14, STYLE-02 MyTickets
- RequesterTicketDetail (`client/tests/lab-02/RequesterTicketDetail.test.tsx`):
  - UI-07: All fields read-only, IT Priority read-only, null owner displays "Unassigned"
  - UI-15: Loading state, 403 Forbidden, 404 Not Found, unexpected failure with retry, back navigation
  - STYLE-03: Read-only inputs and textareas use `.form-control-zen[readonly]` with `--zg-readonly-bg`
- AttachmentSection (`client/tests/lab-02/AttachmentSection.test.tsx`):
  - UI-08: Soft-removed attachment renders strikethrough filename, removal reason, and no Download button
  - UI-09: Attachment counter `(X/5 Active)` and disables file picker at 5 active attachments
  - UI-16: Uploading state shows spinner without action buttons; server 410 on download transitions to Unavailable
  - Soft-removal modal with 3–200 character reason validation and inline confirmation

---

## 3. Build & Quality Gates

1. **Server Build (`tsc`):** Clean exit code 0.
2. **Client Build (`tsc && vite build`):** Clean exit code 0.
3. **No Skipped or Disabled Tests:** 0 `.skip()`, 0 `.todo()`, 0 commented out assertions.
4. **Whitespace Check (`git diff --check`):** Clean exit code 0.
