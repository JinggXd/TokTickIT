# AI Assistance Log - Phase 6 Ownership Hardening Pass

**Date:** 2026-09-05<br>
**Branch:** `feature/10-lab2-ownership-hardening`<br>
**Target:** `lab2-staging`

---

## 1. Summary of Prompts and Tasks

### User Prompts:
2. `[requireRequester.ts] เพิ่ม validation ของ X-Requester-Id (ไม่ส่ง header -> 401, header ว่าง -> 400, ตัวเลขเกิน DB range -> 401 ก่อน query กัน 500) และแก้คำอธิบาย API-35 ใน tests.md`

### Implementation Workflow & Verification:
- **Phase 6 Requirements & Audit:**
  - Audited the canonical Error Scenario Matrix from `docs/lab-02/api-spec.md` Section 7 against existing test suites.
  - Re-verified that `API-06`, `API-10`, `API-20`, `API-23`, `API-25`, `API-28`, `API-33`, `MW-03`, `MW-04`, `MW-05`, and `MW-06` pass.
  - Identified requirement for explicit regression test coverage verifying that every Requester-scoped route enforces missing (`401`), malformed (`400`), unknown (`401`), and inactive (`401`) headers, as well as body spoofing prevention and seeded requesters cross-access.
- **Contract & Test Plan Update:**
  - Added test specification `API-35` in `docs/lab-02/tests.md` Section 4.
  - Clarified `API-35` description in `docs/lab-02/tests.md`: cross-requester access is blocked with 403 Forbidden, while `requesterId` in request body is ignored in favor of header context and creates ticket with 201 Created.
  - Mapped `API-35` to `AC-08`, `AC-18` in Section 9 (Traceability Matrix) and `BR-04`, `BR-06` in Section 10 (Business Rule Coverage).
- **Middleware Validation Hardening (`server/src/middleware/requireRequester.ts`):**
  - Explicitly separated missing header (`401 Unauthorized`) from empty/whitespace header (`400 Bad Request`).
  - Added pre-query integer range boundary check (`trimmed.length > 10 || Number(trimmed) > 2147483647`) to return `401 Unauthorized` without issuing an invalid query that triggers PostgreSQL INT4 overflow and unhandled `500`.
- **Automated Hardening Implementation (`server/tests/lab-02/ownership-hardening.api.test.ts` & `requester-middleware.api.test.ts`):**
  - Created 37 automated integration tests in `ownership-hardening.api.test.ts`:
    - 30 tests verifying header failure matrix (missing 401, empty 400, malformed 400, unknown 401, out-of-range 401, inactive 401) across all 5 Requester-scoped routes.
    - 6 tests verifying cross-requester ownership enforcement (body spoofing, list filtering, detail 403, upload 403, download 403, soft-remove 403).
    - 1 test verifying real seeded Requesters cross-access boundary (Sarah Johnson vs. Jennifer Anderson).
  - Added 2 new tests in `requester-middleware.api.test.ts` for empty/whitespace headers and out-of-range integer bounds handling.
- **Live Server Manual Verification (Phase 6 Item 2):**
  - Tested live against `http://localhost:3000` using seeded Requester 1 (`jennifer.a@example.com`) and Requester 2 (`sarah.j@example.com`):
    - `GET /api/tickets/350` with `X-Requester-Id: 2` returned `403 Forbidden` (`{"error":"Access denied: You do not own this ticket"}`).
    - `GET /api/attachments/82/download` with `X-Requester-Id: 2` returned `403 Forbidden` (`{"error":"Access denied: You do not own this attachment"}`).
    - `DELETE /api/attachments/82` with `X-Requester-Id: 2` returned `403 Forbidden` (`{"error":"Access denied: You do not own this attachment"}`).
  - Cleaned up manual test rows from database.
- **Quality Gates & Cleanliness:**
  - Server suite: 14 test files, 104 tests passing (100%).
  - Client suite: 8 test files, 37 tests passing (100%).
  - Production builds: Server `tsc` and client `tsc && vite build` both exited with code 0.
  - Zero whitespace errors: `git diff --check` passed cleanly.
