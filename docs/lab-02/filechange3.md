# Phase 3 File Changes Log

**Branch:** `feature/7-lab2-create-ticket`<br>
**Base commit:** `7dc61d5` (`lab2-staging`)<br>
**Date:** 2026-09-04

---

## 1. Backend Files

| File | Change | Purpose |
|---|---|---|
| `server/src/app.ts` | Modified | Adds `GET /api/related-systems` and `POST /api/tickets` with error boundary, input validation, foreign key checks, and ticket number generation with collision retry |
| `server/src/utils/validation.ts` | Modified | Adds strict type checking for IDs (`number`, integer, `> 0`), array check, and candidate IDs collection |
| `server/tests/lab-02/reference-data.api.test.ts` | Added | Implements API-27 for category and related systems endpoints including inactive exclusion |
| `server/tests/lab-02/create-ticket.api.test.ts` | Added | Implements API-01 to API-05, API-21, API-28, and API-29 with regression tests for null body, non-numeric IDs, and DB errors |

## 2. Frontend Files

| File | Change | Purpose |
|---|---|---|
| `client/src/api.ts` | Modified | Adds `fetchCategories`, `fetchRelatedSystems`, and `createTicket` |
| `client/src/pages/CreateTicket.tsx` | Added | Implements Create Ticket form, two-column layout, field validation, client attachment staging with exact spec messages, read-only submitting state, error retention, and success card |
| `client/src/styles/zen-green.css` | Modified | Adds `textarea.form-control-zen` override for `min-height: 100px` and vertical resize |
| `client/src/App.tsx` | Modified | Wires `CreateTicket` into the `/create-ticket` route under `RouteGuard` |
| `client/tests/lab-02/CreateTicket.test.tsx` | Added | Implements UI-01, UI-02, UI-03, UI-04, UI-12, UI-13, STYLE-01, and STYLE-04 with act-warning resolution and tab navigation |

## 3. Documentation & Evidence Files

| File | Change | Purpose |
|---|---|---|
| `docs/lab-02/whatihavedone3.md` | Added | Detailed summary of Phase 3 deliverables and AC traceability |
| `docs/lab-02/filechange3.md` | Added | Log of changed files in Phase 3 |
| `docs/lab-02/test3.md` | Added | Full server and client test outputs and build results |
| `docs/lab-02/ai3.md` | Added | AI log documenting prompts, decisions, and outcomes |
| `docs/lab-02/antigravity-phase3-fixes.md` | Added | Task specifications and review audit checklist for Phase 3 fixes |
