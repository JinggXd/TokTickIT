# Phase 8 File Changes

**Branch:** `feature/12-lab2-e2e-flows`<br>
**Base:** `lab2-staging`<br>
**Date:** 2026-09-05

---

## Modified Files

### 1. `e2e/lab-02/requester-ticket-flow.spec.ts`
- Extended test suite with Phase 8 End-to-End integration tests:
  - `E2E-01`: Happy path across requester selection, read-only field verification, form submission with attachment, ticket visibility in My Tickets, and cross-requester switching isolation. Awaits network response and loading completion to prevent premature evaluation.
  - `E2E-02`: Simulated backend 500 error during ticket creation submission with assertion of contract-compliant `{ error: string }` response, user-facing error alert, and strict retention of form values (BR-11).
  - `E2E-03`: Direct-URL negative security flows covering cross-requester ticket access (403 Access Denied), stale UI download with 410 dynamic transition to Unavailable state, and direct download endpoint ownership enforcement (403/410).
- Scoped `test.afterAll` strictly to `createdTicketIds` and unlinks associated physical files without broad pattern deletions or swallowed warnings.
- Automated step-by-step screenshot capture for all 3 viewports into `artifacts/lab-02/screenshots/e2e/**`.

### 2. `client/src/api.ts`
- Cleaned up error handling in `createTicket` to strictly align with `api-spec.md` Section 6.4 error response `{ "error": "<message>" }`.

### 3. `docs/lab-02/tests.md`
- Added End-to-End flow screenshot matrix to Section 8 linking all 24 screenshots across Desktop, Tablet, and Mobile viewports.

---

## Created Artifacts & Documentation
- `artifacts/lab-02/screenshots/e2e/01-select-requester-{desktop,tablet,mobile}.png`
- `artifacts/lab-02/screenshots/e2e/02-create-ticket-form-{desktop,tablet,mobile}.png`
- `artifacts/lab-02/screenshots/e2e/03-ticket-created-success-{desktop,tablet,mobile}.png`
- `artifacts/lab-02/screenshots/e2e/04-my-tickets-owner-{desktop,tablet,mobile}.png`
- `artifacts/lab-02/screenshots/e2e/05-switched-requester-{desktop,tablet,mobile}.png`
- `artifacts/lab-02/screenshots/e2e/06-backend-failure-retained-{desktop,tablet,mobile}.png`
- `artifacts/lab-02/screenshots/e2e/07-cross-requester-403-{desktop,tablet,mobile}.png`
- `artifacts/lab-02/screenshots/e2e/08-removed-attachment-410-{desktop,tablet,mobile}.png`
- `docs/lab-02/whatihavedone8.md`
- `docs/lab-02/filechange8.md`
- `docs/lab-02/test8.md`
- `docs/lab-02/ai8.md`
