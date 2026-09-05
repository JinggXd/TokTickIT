# What I Have Done - Phase 8 End-to-End Integration Flows

**Branch:** `feature/12-lab2-e2e-flows`<br>
**Base branch:** `lab2-staging`<br>
**Date:** 2026-09-05<br>
**Status:** Completed, reviewed, and verified; ready for PR review into `lab2-staging`

---

## 1. Phase 8 Scope Completed

Phase 8 implements **End-to-End Integration Flows** per `.agents/skills/lab2-toktickit-build/SKILL.md`, `docs/lab-02/specification.md` (AC-01, AC-02, AC-03, AC-07, AC-08, AC-13, AC-17), and `docs/lab-02/tests.md` (E2E-01, E2E-02, E2E-03):

### 1.1 `E2E-01` — Full Happy Path & Cross-Requester Switch (AC-01, AC-02, AC-03, AC-13)
- **Step 1: AC-02 Route Guard Verification:**
  - Started session with empty `localStorage`.
  - Navigated to `/my-tickets`; verified automatic client redirection to `/select-requester`.
- **Step 2: Requester Selection & Identity Context:**
  - Selected active Requester 1 (Jennifer Anderson).
  - Confirmed redirection to `/my-tickets` with user profile badge visible in AppShell.
- **Step 3 & 4: AC-03 Read-Only System and Requester Fields:**
  - Navigated to `/create-ticket`.
  - Verified Ticket Number and Ticket Date display `"Assigned on save (will be assigned on save)"` as read-only inputs (`tabIndex={-1}`).
  - Verified Requester input displays `"Jennifer Anderson (IT Support)"` as a read-only input.
- **Step 5: Form Completion & Staged Attachment:**
  - Filled valid category, related system, urgency (`HIGH`), unique summary, and description.
  - Staged valid PDF attachment (`e2e_happy_attachment.pdf`).
- **Step 6: AC-01 Ticket Submission & Success Screen:**
  - Listened to `POST /api/tickets` response to record ticket ID into `createdTicketIds` immediately upon creation.
  - Submitted form; verified success screen displayed formatted Ticket Number (`/^TKT-\d{4}-\d{6}$/`), Requester name, and uploaded attachment with confirmation checkmark.
- **Step 7: Ticket Presence in My Tickets:**
  - Clicked "View My Tickets", awaited `GET /api/tickets` response, and verified loading state finished before asserting.
  - Verified created ticket and summary are displayed in the desktop/tablet table and mobile card list.
- **Step 8: AC-13 / BR-14 Requester Switching & Loading Completion:**
  - Clicked "Change" requester button in AppShell; switched active identity to Requester 2 (Sarah Johnson).
  - Explicitly waited for the `GET /api/tickets` network response and confirmed the loading indicator (`"Loading your tickets..."`) was detached before running assertions.
  - Verified that Jennifer's newly created ticket is strictly absent (`toHaveCount(0)`) from Sarah's view.
- Captured step-by-step screenshots: `01-select-requester`, `02-create-ticket-form`, `03-ticket-created-success`, `04-my-tickets-owner`, `05-switched-requester`.

### 1.2 `E2E-02` — Backend Failure & Form Retention (AC-07, BR-11)
- Simulated backend failure during ticket submission by intercepting `POST /api/tickets` to return `500 Internal Server Error` with contract-compliant shape `{ "error": "Unable to create ticket. Please try again." }` per `api-spec.md` Section 6.4.
- Submitted ticket and verified:
  - Safe error banner appears (`.alert.alert-danger`) displaying `"Unable to create ticket. Please try again."`.
  - Form fields retain values: summary, description, requested priority, and staged attachments remain on screen without reset.
  - Submit button re-enables for user retry without permanent lock.
- Cleaned up client `createTicket` error handling in `client/src/api.ts` to strictly rely on `data.error` per specification.
- Captured screenshot: `06-backend-failure-retained`.

### 1.3 `E2E-03` — Direct URL Security Flows (AC-08, AC-17, BR-04, BR-08)
- **Part A: Cross-Requester Direct URL Access (`403 Forbidden`):**
  - Created private ticket owned by Requester 2 (Sarah Johnson) via API.
  - Authenticated browser as Requester 1 (Jennifer Anderson) and navigated directly to `/tickets/:sarahTicketId`.
  - Verified safe Access Denied screen appears (`"Access Denied"`, `"You do not own this ticket and cannot view its details."`).
  - Verified no confidential ticket details leaked.
- **Part B: Stale UI Concurrent Removal & 410 Download Transition:**
  - Created ticket owned by Requester 1 with an active PDF attachment.
  - Navigated to ticket detail as owner while attachment is still active; verified "Download" and "Remove" buttons are visible and enabled.
  - Concurrently soft-removed the attachment on the server via API with removal reason to simulate stale UI state.
  - Clicked "Download" button from the stale UI; verified browser receives `410 Gone`.
  - Verified UI dynamically updates without page refresh: "Download" and "Remove" buttons disappear, the `"Unavailable"` badge appears, and `"Removal reason:"` is displayed.
  - Verified direct download API request by owner returns `410 Gone` with `{ "error": "This attachment has been removed and cannot be downloaded" }`.
  - Verified direct download API request by non-owner returns `403 Forbidden` with `{ "error": "Access denied: You do not own this attachment" }`.
- Captured screenshots: `07-cross-requester-403`, `08-removed-attachment-410`.

### 1.4 Automated Test Database & Filesystem Hygiene
- Scoped `test.afterAll` strictly to `createdTicketIds` without broad summary queries or loose prefixes that could affect unrelated seed data.
- Unlinked physical uploaded files from `server/uploads/` and `uploads/`.
- Ensured cleanup errors are not swallowed as mere warnings, allowing cleanup failures to surface immediately.

---

## 2. Verification Summary
- **Playwright Suite:** 21/21 tests passed across Desktop, Tablet, and Mobile viewports (27.1s).
- **Server Vitest:** 14 files, 104/104 tests passed (100%).
- **Client Vitest:** 8 files, 37/37 tests passed (100%).
- **TypeScript & Production Builds:** Server `tsc` passed; Client `vite build` passed (0 errors).
- **Git Diff Hygiene:** `git diff --check` clean with 0 whitespace issues.
