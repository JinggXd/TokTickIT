# AI Assistance Log - Phase 4 My Tickets

**Date:** 2026-09-04<br>
**Branch:** `feature/8-lab2-my-tickets`<br>
**Target:** `lab2-staging`

---

## 1. Summary of Prompts and Tasks

### User Prompts:
1. `เช็คก่อนว่าmergeยัง ถ้าmeargeแล้วไปต่อ้เลย` (Check if Phase 3 PR #20 was merged; if merged, proceed to Phase 4).
2. `อ่านskilใmdยัง` (Did you read SKILL.md?)
3. Review audit round 1: 9 critical findings (IT Priority, stale data, pagination, UI-14 coverage, API-30/31, mobile layout, docs accuracy, query validation ambiguity, server test isolation).
4. Review audit round 2: 4 remaining points & contract alignment:
   - Badge colors: RESOLVED (`#15803D`) and LOW (`#F1F5F9`/`#475569`)
   - Mobile 576–767px 2-column fix: replace `col-sm-6` with `col-12 col-md-4 col-lg`
   - UI-14 genuine loading deferred test & UI-06 out-of-order response test
   - `.btn-secondary-zen` styling per Section 3.1
   - Contract alignment: sync `api-spec.md` Section 6.5 and `tests.md` with the query validation resolution
5. Review audit round 3: PR-ready final polish:
   - Button hierarchy: replace remaining Bootstrap `btn-outline-` button classes with `.btn-secondary-zen` for secondary actions (`Retry`, `Search`, `Clear Filters`, `Previous`, `Next`, inactive page numbers) while maintaining `.btn-primary-zen` for active page number and primary actions.
   - Contract version bump: bump `api-spec.md` and `tests.md` to version `1.1.1` noting strict validation for Phase 4 query parameters.
   - Live application verification: verify AC-10 through AC-14 against running PostgreSQL and Express backend.

### Implementation Workflow & Fixes:
- **Contract Synchronization & Version Bump:**
  - Updated `docs/lab-02/api-spec.md` and `docs/lab-02/tests.md` to version `1.1.1` (updated 2026-09-04) explicitly documenting strict validation for all Phase 4 query parameters (`sortBy`, `sortOrder`, `limit`, `categoryId`, `requestedPriority`, `itPriority`, `status`).
  - Recorded Ambiguity 6 in `docs/lab-02/ambiguity-log.md`.
- **Backend Hardening (`server/src/app.ts`):**
  - Implemented strict validation for all 7 query parameters (`sortBy`, `sortOrder`, `limit`, `categoryId`, `requestedPriority`, `itPriority`, `status`), returning `400` with `details` on any invalid value.
  - Enforced default ordering with `createdAt desc, id desc` tie-breaker.
- **Database Isolation & Server Tests (`server/tests/lab-02/my-tickets.api.test.ts`):**
  - Created isolated test users for the suite (`my-tickets-suite-a@test.local`, `my-tickets-suite-b@test.local`), ensuring zero mutation or deletion of seeded users.
  - Added fixture tickets with identical timestamps to prove the `id desc` tie-breaker.
  - Implemented independent and combined tests for `itPriority` and `requestedPriority`, asserting non-empty data arrays and verifying cross-requester data isolation under active filters.
  - Set `fileParallelism: false` in `server/vitest.config.ts` for clean sequential execution against the database.
  - Confirmed all 41 server tests pass across 11 test files.
- **Design System & Frontend Architecture (`client/src/styles/zen-green.css`, `client/src/pages/MyTickets.tsx`):**
  - Added `.btn-secondary-zen` CSS rule (white background, `--zg-text-primary`, `1px solid var(--zg-border)`, hover `#F8FAFC`) strictly per `ui-spec.md` Section 3.1.
  - Updated button hierarchy in `client/src/pages/MyTickets.tsx`:
    - Converted Clear Filters button in filter bar, Previous button, Next button, and inactive numeric page buttons to `.btn-secondary-zen`.
    - Maintained `.btn-primary-zen` on active page number, `+ Create Ticket` header button, and `Create First Ticket` empty state button.
  - Corrected badge tokens to exact spec values: RESOLVED `#15803D`, LOW `#F1F5F9`/`#475569`.
  - Replaced `col-sm-6` with `col-12 col-md-4 col-lg` on all filter controls to ensure single-column collapse on mobile `< 768px`.
  - Adjusted desktop breakpoint to `≥ 992px` (`d-none d-lg-block`) and card view for `< 992px` (`d-block d-lg-none`).
  - Reformatted mobile cards to display Ticket Number, status badge, summary, category, and date stacked vertically without horizontal flex splitting.
  - Added numeric pagination buttons (`1, 2, ... totalPages`) alongside Previous/Next with active page styling.
  - Implemented immediate state clearance (`setTickets([])`) and request generation tracking (`activeRequestIdRef`) to eliminate stale data flashing or race conditions during requester switching.
- **Client Test Suite (`client/tests/lab-02/MyTickets.test.tsx`):**
  - Added button hierarchy assertions in UI-14 verifying that Search, Clear Filters, Retry, Previous, Next, and inactive page number buttons carry `.btn-secondary-zen`, while active page carries `.btn-primary-zen`.
  - Added genuine deferred loading test in UI-14 verifying spinner and loading text while pending.
  - Added out-of-order response test in UI-06 proving older delayed responses are discarded when a newer requester responds first.
  - Added failure test verifying Requester A's data never returns if Requester B's fetch fails.
  - Added comprehensive UI-14 tests covering search, all 4 filters, sort direction toggle (`desc` -> `asc`), limit selection, direct page number clicks, Previous/Next navigation, loading spinner, and retry banner.
  - Asserted exact color tokens for RESOLVED and LOW badges in STYLE-02.
  - Confirmed all 25 client tests pass across 6 test files.
- **Live Verification of AC-10 through AC-14:**
  - Tested AC-10 (search and category/priority/status filters) via live API calls.
  - Tested AC-11 (sorting direction and tie-breaker).
  - Tested AC-12 (clamping page out-of-bounds low/high and validating limits).
  - Tested AC-13 (requester switching without stale data flash).
  - Tested AC-14 (Empty State vs. No-Results State).
- **Verification:**
  - `npm --prefix server run test`: 11 test files, 41 tests passing (100%).
  - `npm --prefix client run test`: 6 test files, 25 tests passing (100%).
  - `npm --prefix server run build`: `tsc` exit 0.
  - `npm --prefix client run build`: `tsc && vite build` exit 0.
  - `git diff --check`: clean (0 whitespace errors).
  - Repository-wide audit: 0 skipped/disabled tests.
