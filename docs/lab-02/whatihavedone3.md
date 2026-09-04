# What I Have Done - Phase 3 Create Ticket

**Branch:** `feature/7-lab2-create-ticket`<br>
**Base branch:** `lab2-staging`<br>
**Date:** 2026-09-04<br>
**Status:** Completed and verified via TDD; ready for PR review into `lab2-staging`

---

## 1. Phase 3 Scope Completed

Phase 3 implements the full ticket intake channel per `docs/lab-02/specification.md`, `api-spec.md`, and `ui-spec.md`:

### Backend (Server)
- **Reference Data Endpoints:**
  - `GET /api/categories` returns active Categories in `id` ascending order (`api-spec.md` Section 6.2). Inactive categories are excluded.
  - `GET /api/related-systems` returns active Related Systems in `id` ascending order (`api-spec.md` Section 6.3). Inactive systems are excluded.
- **Ticket Creation Endpoint & Validation Hardening:**
  - `POST /api/tickets` enforced by `requireRequester` (`X-Requester-Id` header).
  - Enclosed in an error boundary: returns `400` on invalid payload syntax/null body and flat `500` on unexpected database errors without details leakage.
  - Validates input length & syntax: Summary (5–100 chars), Description (10–2000 chars), Priority (LOW, MEDIUM, HIGH) (BR-09).
  - Strict type validation: `categoryId` and `relatedSystemId` must be positive integer numbers (rejects strings like `"1"` and booleans like `true`).
  - Reference collection: Candidate IDs are evaluated even when syntax errors exist, reporting all errors simultaneously in `details` (API-29).
  - Generates unique Ticket Number via `generateTicketNumber` with up to 3 collision retries before returning flat `500` (BR-01, API-21).
  - Enforces `currentStatus = NEW` (BR-02), `itPriority = requestedPriority` (BR-16), `ticketOwnerId = null` (BR-17).
  - Returns `201 Created` with backend-issued `ticketNo` and ISO `createdAt` timestamp.

### Frontend (Client)
- **API Helpers:**
  - `fetchCategories`, `fetchRelatedSystems`, and `createTicket` added to `client/src/api.ts`.
- **Create Ticket Screen (`client/src/pages/CreateTicket.tsx`):**
  - Read-only system header: Ticket Number and Ticket Date placeholders ("Assigned on save"), Requester identity display (AC-03, UI-12), excluded from Tab focus (`tabIndex={-1}`).
  - Classification grid: Two-column responsive layout per `ui-spec.md` Section 10.2 for Category, Related System, and Requested Priority.
  - Text fields: Summary and Description with live character counts, trimmed validation, and `textarea` height override (`min-height: 100px`, `resize: vertical`).
  - Attachment staging (client-side only for Phase 3, deferred upload in Phase 5 per SKILL.md): file picker with exact spec error copy (`"File exceeds the 5 MB size limit."`, `"Only JPG, JPEG, PNG, WEBP, and PDF files are allowed."`, `"This ticket already has 5 active attachments."`), strictly checking dot extensions (rejecting extensionless files like `"jpg"`), and proving zero upload requests are made in Phase 3 (BR-07, UI-04).
  - Submitting state: Disables all editable controls (dropdowns, inputs, attachment picker, submit button) during submission to make form read-only (BR-10, UI-02).
  - Failure state: Retains all entered values on API failure (BR-11, UI-03).
  - Success view: Displays backend-issued Ticket Number prominently as headline `<h2>`, with Ticket Date and Requester identity (AC-01, UI-13).
  - Zen Green theme tokens and keyboard tab navigation applied (`STYLE-01`, `STYLE-04`).
- **Application Shell Wiring:**
  - Wired into `client/src/App.tsx` guarded by `RouteGuard`.

---

## 2. Acceptance Criteria & Test Mapping

| AC / BR | Test ID | Description | Result |
|---|---|---|---|
| AC-01, AC-03 | API-01, UI-13 | Create Ticket happy path with backend-issued Ticket Number and Date | PASS |
| AC-04 | API-02, UI-01 | Field-level validation on required inputs | PASS |
| AC-18 | API-03, API-04, API-05, API-28 | Requester context enforcement (missing, malformed, inactive, unknown) | PASS |
| BR-01 | API-21 | 3 collision retries exhausted returns 500 | PASS |
| FR-04 | API-27 | Active reference data endpoints | PASS |
| AC-04 | API-29 | Nonexistent or inactive reference data validation | PASS |
| AC-06 | UI-02 | Busy button state during submission | PASS |
| AC-07 | UI-03 | Form values preserved on submission failure | PASS |
| AC-05, BR-07 | UI-04 | Client-side attachment rejection | PASS |
| AC-03, AC-04 | UI-12 | Read-only system fields and reference data loading | PASS |
| — | STYLE-01, STYLE-04 | Zen Green styling and focus indicators | PASS |
