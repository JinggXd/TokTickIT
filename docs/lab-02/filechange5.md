# Phase 5 File Changes Log

**Branch:** `feature/9-lab2-ticket-detail`<br>
**Base commit:** `6399e5a` (`lab2-staging`)<br>
**Date:** 2026-09-05

---

## 1. Backend Files

| File | Change | Purpose |
|---|---|---|
| `server/package.json` | Modified | Adds `multer` runtime dependency and `@types/multer` devDependency |
| `server/package-lock.json` | Modified | Records locked versions for `multer` and dependencies |
| `.gitignore` | Modified | Adds `uploads/` and `server/uploads/` to git ignore list |
| `server/src/utils/safeFilename.ts` | Modified | Adds strict minimum file size checks (rejecting files < 4 bytes, empty files, and incomplete headers) to prevent bypassing magic bytes validation |
| `server/src/app.ts` | Modified | Implements `GET /api/tickets/:id`, `POST /api/tickets/:id/attachments`, `GET /api/attachments/:id/download`, and `DELETE /api/attachments/:id` with strict validation, ownership protection, safe disk storage, and PostgreSQL row lock (`SELECT ... FOR UPDATE`) in an interactive transaction to prevent concurrent upload limit bypass |
| `server/tests/lab-02/safe-filename.unit.test.ts` | Modified | Adds unit tests for rejecting 0–3 byte files and empty buffers |
| `server/tests/lab-02/ticket-detail.api.test.ts` | Added | Implements API-10 (403 cross-requester access), API-11 (404 nonexistent ID), API-12 (200 owned ticket), 400 malformed ID, and 401 unauthenticated |
| `server/tests/lab-02/attachments.api.test.ts` | Added | Implements API-13 (> 5 MB), API-14 (disallowed type/spoofed extension/< 4 bytes), API-15 (6th active file limit & concurrent upload race serialization), API-16 (valid upload), API-17 (soft-remove), API-18 (409 double-removal), API-19 (410 removed download), API-20 (403 cross-requester download), API-23 (403 cross-requester upload), API-24 (400 invalid removalReason), API-25 (403 cross-requester removal), API-32 (owned download binary stream), API-33 (404 missing IDs), and API-34 (500 storage failure handling) |

## 2. Frontend Files

| File | Change | Purpose |
|---|---|---|
| `client/src/api.ts` | Modified | Adds `AttachmentItem` and `TicketDetail` interfaces; implements `fetchTicketDetail`, `uploadAttachment`, `downloadAttachment`, and `softRemoveAttachment` |
| `client/src/components/AttachmentSection.tsx` | Added | Implements Attachment Management card with `(X/5 Active)` counter, file picker disabled at limit, active/uploading/removed/unavailable states, 410 transition, and soft-removal modal with 3–200 character validation |
| `client/src/pages/RequesterTicketDetail.tsx` | Added | Implements Ticket Detail screen with prominent `← Back to My Tickets` link, read-only classification card (`--zg-readonly-bg`), summary, multiline description, status/priority badges, loading spinner, 403 access denied banner, 404 not found banner, and embedded `<AttachmentSection />` |
| `client/src/pages/CreateTicket.tsx` | Modified | Implements sequential post-create attachment uploads (BR-18, UI-18), preserves created Ticket Number on per-file upload failure, provides inline Retry upload path, shows upload progress banner, and disables "Create Another Ticket" / "View My Tickets" buttons while uploads are in flight |
| `client/src/App.tsx` | Modified | Wires route `/tickets/:id` and tab `ticket-detail`, navigates from `MyTickets` row/card click to `RequesterTicketDetail`, and connects back navigation to `/my-tickets` |
| `client/tests/lab-02/RequesterTicketDetail.test.tsx` | Added | Implements UI-07 (read-only fields, IT priority, null owner "Unassigned"), UI-15 (loading, 403, 404, unexpected error, back navigation), and STYLE-03 (read-only contrast) |
| `client/tests/lab-02/AttachmentSection.test.tsx` | Added | Implements UI-08 (soft-removed strikethrough, reason, no download button), UI-09 (`(X/5 Active)` counter and disabled file picker), and UI-16 (uploading state, 410 download transition to Unavailable) |
| `client/tests/lab-02/CreateTicket.test.tsx` | Modified | Adds UI-18 tests proving post-create attachment failure preserves Ticket Number with retry path, and proving action buttons are disabled with progress displayed during in-flight uploads |

## 3. Documentation Files

| File | Change | Purpose |
|---|---|---|
| `docs/lab-02/whatihavedone5.md` | Added | Comprehensive summary of Phase 5 implementation and verification |
| `docs/lab-02/filechange5.md` | Added | Detailed file change log for Phase 5 |
| `docs/lab-02/test5.md` | Added | Complete test output audit for Phase 5 |
| `docs/lab-02/ai5.md` | Added | AI engineering log for Phase 5 |
