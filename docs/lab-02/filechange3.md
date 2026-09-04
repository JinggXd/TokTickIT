# Phase 3 File Changes Log

**Branch:** `feature/7-lab2-create-ticket`<br>
**Base commit:** `7dc61d5` (`lab2-staging`)<br>
**Date:** 2026-09-04

---

## 1. Backend Files

| File | Change | Purpose |
|---|---|---|
| `server/src/app.ts` | Modified | Adds `GET /api/related-systems` and `POST /api/tickets` with input validation, foreign key checks, and ticket number generation with collision retry |
| `server/tests/lab-02/reference-data.api.test.ts` | Added | Implements API-27 for category and related systems endpoints |
| `server/tests/lab-02/create-ticket.api.test.ts` | Added | Implements API-01 to API-05, API-21, API-28, and API-29 |

## 2. Frontend Files

| File | Change | Purpose |
|---|---|---|
| `client/src/api.ts` | Modified | Adds `fetchCategories`, `fetchRelatedSystems`, and `createTicket` |
| `client/src/pages/CreateTicket.tsx` | Added | Implements Create Ticket form, field validation, client attachment staging, busy state, error retention, and success card |
| `client/src/App.tsx` | Modified | Wires `CreateTicket` into the `/create-ticket` route under `RouteGuard` |
| `client/tests/lab-02/CreateTicket.test.tsx` | Added | Implements UI-01, UI-02, UI-03, UI-04, UI-12, UI-13, STYLE-01, and STYLE-04 |

## 3. Documentation & Evidence Files

| File | Change | Purpose |
|---|---|---|
| `docs/lab-02/whatihavedone3.md` | Added | Detailed summary of Phase 3 deliverables and AC traceability |
| `docs/lab-02/filechange3.md` | Added | Log of changed files in Phase 3 |
| `docs/lab-02/test3.md` | Added | Full server and client test outputs and build results |
| `docs/lab-02/ai3.md` | Added | AI log documenting prompts, decisions, and outcomes |
