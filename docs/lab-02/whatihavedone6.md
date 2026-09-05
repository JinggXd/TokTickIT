# What I Have Done - Phase 6 Ownership Hardening Pass

**Branch:** `feature/10-lab2-ownership-hardening`<br>
**Base branch:** `lab2-staging`<br>
**Date:** 2026-09-05<br>
**Status:** Completed and verified; ready for PR review into `lab2-staging`

---

## 1. Phase 6 Scope Completed

Phase 6 implements the dedicated **Ownership Hardening Pass** per `.agents/skills/lab2-toktickit-build/SKILL.md`, `docs/lab-02/specification.md` (BR-04, BR-06), `docs/lab-02/api-spec.md` (Section 7 Error Scenario Matrix), and `docs/lab-02/tests.md`:

### 1.1 Automated Ownership & Requester Context Hardening (`API-35`)
- Added comprehensive integration test suite `server/tests/lab-02/ownership-hardening.api.test.ts` with 27 exhaustive tests.
- **Section 1: Error Scenario Matrix Enforcement on all Requester-Scoped Routes:**
  - Systematically tests all 5 Requester-scoped routes:
    - `GET /api/tickets`
    - `GET /api/tickets/:id`
    - `POST /api/tickets/:id/attachments`
    - `GET /api/attachments/:id/download`
    - `DELETE /api/attachments/:id`
  - Validates all header failure triggers against the canonical Error Scenario Matrix:
    - Missing `X-Requester-Id` header returns `401 Unauthorized` with `{ "error": "Requester context is missing or invalid" }` without `details`.
    - Malformed `X-Requester-Id` (e.g. string `"abc"`) returns `400 Bad Request` with `{ "error": "Bad Request: Malformed X-Requester-Id header" }` without `details`.
    - Unknown `X-Requester-Id` (e.g. `99999999`) returns `401 Unauthorized` with `{ "error": "Requester context is missing or invalid" }` without `details`.
    - Inactive `X-Requester-Id` (`isActive: false`, e.g. seeded Robert Wilson) returns `401 Unauthorized` with `{ "error": "Requester context is missing or invalid" }` without `details`.

- **Section 2: Cross-Requester Ownership Boundary Enforcement (BR-04, AC-08):**
  - **Body Spoofing Protection:** Verified that sending `{ requesterId: otherRequester.id }` in `POST /api/tickets` body is ignored; created ticket's `requesterId` is strictly derived from the validated `X-Requester-Id` header.
  - **List Scoping:** Verified that `GET /api/tickets` with another Requester's context completely excludes other users' tickets from the database response.
  - **Ticket Detail Protection:** Verified that `GET /api/tickets/:id` by a non-owner returns `403 Forbidden` with `{ "error": "Access denied: You do not own this ticket" }` without leaking `ticketNo`, `summary`, `description`, or `attachments`.
  - **Attachment Upload Protection:** Verified that `POST /api/tickets/:id/attachments` by a non-owner returns `403 Forbidden` with `{ "error": "Access denied: You do not own this ticket" }` without persisting attachments or incrementing count.
  - **Attachment Download Protection:** Verified that `GET /api/attachments/:id/download` by a non-owner returns `403 Forbidden` with `{ "error": "Access denied: You do not own this attachment" }` without streaming bytes.
  - **Attachment Soft-Remove Protection:** Verified that `DELETE /api/attachments/:id` by a non-owner returns `403 Forbidden` with `{ "error": "Access denied: You do not own this attachment" }` and leaves `removedAt` null in the database.

- **Section 3: Real Seeded Development Requesters Verification (SKILL.md Phase 6 Item 2):**
  - Executed automated cross-requester assertions between real seeded Requester 1 (Jennifer Anderson) and Requester 2 (Sarah Johnson):
    - Requester 2 cannot view Requester 1's ticket (`403 Forbidden`).
    - Requester 2 cannot download Requester 1's attachment (`403 Forbidden`).
    - Requester 2 cannot remove Requester 1's attachment (`403 Forbidden`).

### 1.2 Live Server Manual Verification (Phase 6 Item 2)
- Tested live on running server (`http://localhost:3000`):
  - Created ticket #350 (`TKT-2026-900112`) and attachment #82 under Requester 1 (Jennifer Anderson).
  - Attempted `GET /api/tickets/350` with `X-Requester-Id: 2` (Sarah Johnson) -> returned `403 Forbidden` with `{ "error": "Access denied: You do not own this ticket" }`.
  - Attempted `GET /api/attachments/82/download` with `X-Requester-Id: 2` -> returned `403 Forbidden` with `{ "error": "Access denied: You do not own this attachment" }`.
  - Attempted `DELETE /api/attachments/82` with `X-Requester-Id: 2` -> returned `403 Forbidden` with `{ "error": "Access denied: You do not own this attachment" }`.
  - Cleaned up test records from database cleanly.

---

## 2. Verification Summary

- **Server Unit & Integration Tests:** 14 files, 92 tests passing (100%).
- **Client Unit & Component Tests:** 8 files, 37 tests passing (100%).
- **Server Production Build:** `tsc` passed with 0 errors.
- **Client Production Build:** `tsc && vite build` passed with 0 errors.
- **Git Diff Whitespace Check:** `git diff --check` passed with 0 errors.
- **Zero Skipped / Disabled Tests:** 0 `.skip()`, 0 `.todo()`.
