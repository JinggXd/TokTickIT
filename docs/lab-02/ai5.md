# AI Assistance Log - Phase 5 Requester Ticket Detail & Attachments

**Date:** 2026-09-05<br>
**Branch:** `feature/9-lab2-ticket-detail`<br>
**Target:** `lab2-staging`

---

## 1. Summary of Prompts and Tasks

### User Prompts:
1. `ไปต่อphrase5` (Proceed to Phase 5).

### Implementation Workflow & Fixes:
- **Dependency & Upload Architecture:**
  - Installed `multer` and `@types/multer` on `server` to handle `multipart/form-data` uploads.
  - Added `uploads/` and `server/uploads/` to `.gitignore` to prevent any uploaded test artifacts from polluting Git.
  - Configured robust upload directory resolution supporting execution from both repository root and `server/` directory.
- **Backend Implementation & TDD (Red -> Green):**
  - Implemented `server/tests/lab-02/ticket-detail.api.test.ts` covering API-10 (403 Forbidden cross-requester), API-11 (404 Not Found), API-12 (200 OK owned ticket with attachments array), 400 malformed ID, and 401 unauthenticated.
  - Verified test failure (RED), then implemented `GET /api/tickets/:id` in `server/src/app.ts` with strict validation and ownership protection, verifying tests pass (GREEN).
  - Implemented `server/tests/lab-02/attachments.api.test.ts` covering API-13 to API-20, API-23 to API-25, and API-32 to API-34.
  - Verified test failure (RED), then implemented `POST /api/tickets/:id/attachments`, `GET /api/attachments/:id/download`, and `DELETE /api/attachments/:id` in `server/src/app.ts`:
    - Upload: 5 MB size limit check, magic bytes & MIME type validation, 5-active-file limit check, safe filename sanitization, disk storage with safe rollback on error.
    - Concurrency row-level locking: Enforced PostgreSQL row-level lock (`SELECT id FROM "Ticket" WHERE id = $1 FOR UPDATE`) inside an interactive `$transaction` to serialize concurrent attachment uploads and prevent race condition overflows beyond 5 active attachments.
    - Buffer validation: Rejects files < 4 bytes or empty buffers to prevent bypassing magic bytes checks.
    - Download: Ownership check (403), soft-removed guard (410 Gone), and binary streaming with `Content-Disposition`.
    - Soft-remove: Ownership check (403), 409 Conflict idempotency guard against double-removal, and 3–200 character removal reason validation.
  - Verified all 19 attachment tests pass (GREEN).
- **Frontend Implementation & TDD (Red -> Green):**
  - Added `AttachmentItem` and `TicketDetail` interfaces and API client functions (`fetchTicketDetail`, `uploadAttachment`, `downloadAttachment`, `softRemoveAttachment`) in `client/src/api.ts`.
  - Implemented client component tests in `client/tests/lab-02/RequesterTicketDetail.test.tsx` (UI-07, UI-15, STYLE-03) and `client/tests/lab-02/AttachmentSection.test.tsx` (UI-08, UI-09, UI-16). Verified test failure (RED).
  - Built `AttachmentSection.tsx`:
    - Counter `(X/5 Active)` badge at card top.
    - Active file download and soft-remove actions.
    - Real-time transition to "Unavailable" on server 410 Gone.
    - Strikethrough filename and red removal reason for removed files.
    - Soft-removal reason confirmation modal with inline validation.
  - Built `RequesterTicketDetail.tsx`:
    - Prominent `← Back to My Tickets` navigation.
    - Monospace Ticket Number with status badge.
    - Read-only classification block with `--zg-readonly-bg`.
    - Read-only Summary and Description fields.
    - Safe loading, 403 Forbidden, 404 Not Found, and retry error banners.
  - Integrated post-create sequential attachment uploads in `client/src/pages/CreateTicket.tsx` (BR-18, UI-18), preserving created Ticket Number and providing per-file retry paths on upload failure. Added in-flight upload progress indicator and disabled "Create Another Ticket" / "View My Tickets" buttons while uploads are in flight. Added UI-18 tests to `client/tests/lab-02/CreateTicket.test.tsx`.
  - Wired `/tickets/:id` URL parsing and `ticket-detail` view under `RouteGuard` in `client/src/App.tsx`.
  - Verified all 37 client tests pass (GREEN).
- **Quality Gates & Cleanliness:**
  - Full server suite: 65/65 passing across 13 test files.
  - Full client suite: 37/37 passing across 8 test files.
  - Production builds (`tsc` on server, `tsc && vite build` on client): 0 errors.
  - Whitespace check (`git diff --check`): 0 trailing whitespace or blank line issues.
