# Phase 4 File Changes Log

**Branch:** `feature/8-lab2-my-tickets`<br>
**Base commit:** `1ac4d54` (`lab2-staging`)<br>
**Date:** 2026-09-04

---

## 1. Backend Files

| File | Change | Purpose |
|---|---|---|
| `server/src/app.ts` | Modified | Implements `GET /api/tickets` with `requireRequester` scoping, comprehensive query validation for all 7 parameters (`sortBy`, `sortOrder`, `limit`, `categoryId`, `requestedPriority`, `itPriority`, `status`), `clampPagination`, and relations query |
| `server/vitest.config.ts` | Modified | Sets `fileParallelism: false` to ensure deterministic sequential database integration tests without race conditions |
| `server/tests/lab-02/my-tickets.api.test.ts` | Added | Implements API-06, API-07, API-08, API-09, API-22, API-30, and API-31 using suite-isolated requesters, non-empty assertions, independent filter checks, and `id desc` tie-breaker verification |

## 2. Frontend Files

| File | Change | Purpose |
|---|---|---|
| `client/src/styles/zen-green.css` | Modified | Adds `.btn-secondary-zen` button styles (white background, `--zg-text-primary`, `1px solid var(--zg-border)`, hover `#F8FAFC`) per `ui-spec.md` Section 3.1 |
| `client/src/api.ts` | Modified | Adds `GetTicketsParams`, `TicketListItem`, `TicketsResponse` interfaces and implements `fetchMyTickets` helper |
| `client/src/pages/MyTickets.tsx` | Added | Implements My Tickets screen with desktop table (`≥ 992px`), vertical mobile cards (`< 992px`), search & 4-filter bar (Category, Requested Priority, IT Priority, Status), 1-column mobile collapse (`col-12 col-md-4 col-lg`), exact badge tokens (`#15803D`, `#F1F5F9`/`#475569`), button hierarchy (`.btn-secondary-zen` for search, clear filters, retry, previous/next, and inactive page numbers; `.btn-primary-zen` for active page number), clear filters, sort toggle, numeric pagination buttons, accessible badges, loading spinner, error retry, and immediate stale data clearance |
| `client/src/App.tsx` | Modified | Wires `MyTickets` into route `/my-tickets` under `RouteGuard` and handles inter-screen navigation |
| `client/tests/lab-02/MyTickets.test.tsx` | Added | Implements UI-05, UI-06 (deferred pending, switch failure, and out-of-order response paths), UI-14 (search, all 4 filters, sort toggle, limit, direct page numbers, previous/next, button hierarchy assertions for `.btn-secondary-zen`, genuine loading spinner, retry), and STYLE-02 (exact token checks) |

## 3. Documentation & Specification Files

| File | Change | Purpose |
|---|---|---|
| `docs/lab-02/api-spec.md` | Modified | Bumped to `1.1.1` (updated 2026-09-04); syncs query parameters table and 400 Bad Request error documentation with validation scope |
| `docs/lab-02/tests.md` | Modified | Bumped to `1.1.1` (updated 2026-09-04); syncs API-22 scope description to reflect all query parameters |
| `docs/lab-02/ambiguity-log.md` | Modified | Records Ambiguity 6 defining query parameter validation scope for `GET /api/tickets` |
| `docs/lab-02/whatihavedone4.md` | Added | Detailed summary of Phase 4 deliverables, architecture, and AC mapping |
| `docs/lab-02/filechange4.md` | Added | Log of created and modified files for Phase 4 |
| `docs/lab-02/test4.md` | Added | Test results from full server and client suites, build checks, and zero-skip audit |
| `docs/lab-02/ai4.md` | Added | AI assistance log documenting review findings, resolutions, and outcomes |
