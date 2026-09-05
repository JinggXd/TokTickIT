# What I Have Done - Phase 5 Requester Ticket Detail & Attachments

**Branch:** `feature/9-lab2-ticket-detail`<br>
**Base branch:** `lab2-staging`<br>
**Date:** 2026-09-05<br>
**Status:** Completed and verified via TDD; ready for PR review into `lab2-staging`

---

## 1. Phase 5 Scope Completed

Phase 5 implements the Requester Ticket Detail view, Attachment Management component, upload/download/soft-remove backend endpoints, and Create Ticket post-creation attachment integration per `docs/lab-02/specification.md`, `api-spec.md`, `ui-spec.md`, and `tests.md`:

### Backend (Server)
- **Ticket Detail Endpoint (`GET /api/tickets/:id`):**
  - Parameter validation: Validates `:id` as a positive integer (`400 Bad Request` if malformed).
  - Resource check: Returns `404 Not Found` with `{ "error": "Ticket not found" }` if ticket ID does not exist.
  - Ownership protection: Enforces server-side check `ticket.requesterId !== req.requester.id`, returning `403 Forbidden` with `{ "error": "Access denied: You do not own this ticket" }` without leaking any ticket fields (API-10, AC-08).
  - Returns complete read-only ticket header with joined `Category`, `RelatedSystem`, `ticketOwnerName` ("Unassigned" if null), and ordered `attachments` list (API-12, AC-09).
- **Attachment Upload Endpoint (`POST /api/tickets/:id/attachments`):**
  - Parameter validation & ownership: Enforces positive integer ID, existence, and requester ownership (`403 Forbidden` if ticket belongs to another user per API-23).
  - Active limit enforcement & concurrency protection: Uses PostgreSQL interactive transaction with row-level lock (`SELECT id FROM "Ticket" WHERE id = $1 FOR UPDATE`) to prevent race conditions during concurrent uploads, rejecting with `400 Bad Request` and `{ "error": "Validation failed", "details": { "file": "This ticket already has 5 active attachments" } }` if 5 active attachments already exist (API-15, BR-07).
  - File size validation: Limits file size to 5 MB (`5,242,880` bytes), returning `400 Bad Request` with `{ "error": "Validation failed", "details": { "file": "File exceeds the 5 MB size limit" } }` (API-13, BR-07).
  - Content type, length & magic bytes validation: Validates extensions, enforces minimum buffer length (rejecting empty or < 4 byte files), and inspects magic bytes for JPG, JPEG, PNG, WEBP, and PDF files. Rejects invalid extensions, truncated files, and spoofed bytes with `400 Bad Request` and `{ "error": "Validation failed", "details": { "file": "Only JPG, JPEG, PNG, WEBP, and PDF files are allowed" } }` (API-14, BR-07, BR-19).
  - Safe on-disk storage: Writes uploaded file to `server/uploads/` using safe sanitization `<timestamp>-<random>-<sanitized-original-name>`.
  - Failure atomicity: On disk write error, returns `500 Internal Server Error` with `{ "error": "Unable to save the attachment. Please try again." }` without damaging the ticket or creating an attachment record (API-34, BR-18).
  - Successful upload returns `201 Created` with attachment metadata (API-16, AC-15).
- **Attachment Download Endpoint (`GET /api/attachments/:id/download`):**
  - Parameter validation & resource check: Returns `400` if ID is not a positive integer, `404 Not Found` if attachment does not exist (API-33).
  - Ownership protection: Returns `403 Forbidden` with `{ "error": "Access denied: You do not own this attachment" }` if the parent ticket belongs to another requester (API-20, AC-08).
  - Soft-removed guard: Returns `410 Gone` with `{ "error": "This attachment has been removed and cannot be downloaded" }` if `removedAt !== null` (API-19, BR-08, AC-17).
  - Streams binary file with `Content-Type: <mimeType>` and `Content-Disposition: attachment; filename="<original fileName>"` (API-32, AC-21).
- **Attachment Soft-Remove Endpoint (`DELETE /api/attachments/:id`):**
  - Reason validation: Requires string `removalReason` with trimmed length between 3 and 200 characters (`400 Bad Request` with `{ "error": "Validation failed", "details": { "removalReason": "A removal reason is required (3–200 characters)" } }` per API-24).
  - Ownership protection: Returns `403 Forbidden` if parent ticket belongs to another requester (API-25).
  - Double-removal idempotency guard: Returns `409 Conflict` with `{ "error": "This attachment has already been removed" }` if `removedAt !== null` (API-18).
  - Success: Updates `removedAt: new Date()` and `removalReason`, returning `200 OK` (API-17, AC-16).

### Frontend (Client)
- **API Helpers (`client/src/api.ts`):**
  - Defined interfaces `AttachmentItem` and `TicketDetail`.
  - Implemented `fetchTicketDetail`, `uploadAttachment`, `downloadAttachment`, and `softRemoveAttachment`.
- **AttachmentSection Component (`client/src/components/AttachmentSection.tsx`):**
  - Visual hierarchy: Distinct card container with `(X/5 Active)` badge counter at the top (UI-09).
  - Upload file picker: Disabled when 5 active attachments exist or an upload is in progress (UI-09).
  - Active attachment state: Displays filename, formatted size (`KB`/`MB`), `.btn-secondary-zen` **Download** button, and **Remove** button.
  - Uploading state: Displays filename, spinner progress indicator, and "Uploading..." badge without action buttons (UI-16).
  - Soft-removal modal: Accessible confirmation modal requesting a removal reason (3–200 characters), validating inline before submission.
  - Removed state: Strikethrough filename, red removal reason below, and muted "Unavailable" label with no Download button (UI-08).
  - 410 Gone handling: If downloading an attachment returns `410 Gone`, it immediately transitions in-place to the "Unavailable" state (UI-16).
- **RequesterTicketDetail Page (`client/src/pages/RequesterTicketDetail.tsx`):**
  - Prominent `← Back to My Tickets` link above header (Section 10.4).
  - Full read-only header card matching Zen Green tokens:
    - Monospace Ticket Number headline with status badge.
    - Classification card with `--zg-readonly-bg`: Requester, Category, Related System, Ticket Owner ("Unassigned" if null per BR-17), Requested Priority, and IT Priority (read-only per BR-16, UI-07).
    - Summary input (`.form-control-zen[readonly]` with `--zg-readonly-bg` per STYLE-03).
    - Description textarea (`.form-control-zen[readonly]` with `--zg-readonly-bg` per STYLE-03).
  - States: Loading spinner, 403 Access Denied banner, 404 Not Found banner, error retry banner (UI-15).
  - Embedded `<AttachmentSection />`.
- **CreateTicket Post-Create Upload Integration (`client/src/pages/CreateTicket.tsx`):**
  - Staged files uploaded sequentially only after ticket creation returns `201 Created` (BR-18, UI-18).
  - In-flight upload safeguards: Shows live uploading progress banner and disables "Create Another Ticket" and "View My Tickets" action buttons while attachments are in flight to prevent premature navigation or state reset.
  - On per-file upload failure: Created ticket and Ticket Number remain fully intact on the success screen. Failed files are listed with an error message and an inline **Retry** button (UI-18).
- **Routing Integration (`client/src/App.tsx`):**
  - Supports `/tickets/:id` URL parsing and `ticket-detail` tab.
  - Clicking any desktop table row or mobile card in `MyTickets` navigates directly to `RequesterTicketDetail`.
  - `← Back to My Tickets` returns to `/my-tickets`.

---

## 2. Verification Summary

- **Server Unit & Integration Tests:** 13 files, 65 tests passing (100%).
- **Client Unit & Component Tests:** 8 files, 37 tests passing (100%).
- **Server Production Build:** `tsc` passed with 0 errors.
- **Client Production Build:** `tsc && vite build` passed with 0 errors.
- **Git Diff Whitespace Check:** `git diff --check` passed with 0 errors.
