# What I Have Done - Phase 4 My Tickets

**Branch:** `feature/8-lab2-my-tickets`<br>
**Base branch:** `lab2-staging`<br>
**Date:** 2026-09-04<br>
**Status:** Completed and verified via TDD; ready for PR review into `lab2-staging`

---

## 1. Phase 4 Scope Completed

Phase 4 implements the Requester ticket list view, search & multi-parameter filter engine, column sorting, pagination controls, accessible status/priority badges, and responsive layout per `docs/lab-02/specification.md`, `api-spec.md`, `ui-spec.md`, and `tests.md`:

### Backend (Server)
- **Ticket List Endpoint (`GET /api/tickets`):**
  - Scoped strictly by `requireRequester` (`X-Requester-Id` header). Only tickets matching the current requester's ID are returned (AC-10, API-06).
  - Search filter: Case-insensitive partial substring match against both `summary` and `ticketNo` (AC-10, API-09).
  - Comprehensive query parameter validation (Contract-aligned in `api-spec.md` Section 6.5 and `tests.md`, API-22):
    - `sortBy`: Whitelisted against `createdAt`, `updatedAt`, `ticketNo`, `requestedPriority`, `itPriority`, `currentStatus`.
    - `sortOrder`: Whitelisted against `asc`, `desc`.
    - `limit`: Whitelisted against allowed page sizes (5, 8, 10, 20).
    - `categoryId`: Validated as positive integer or `ALL`.
    - `requestedPriority`: Whitelisted against `LOW`, `MEDIUM`, `HIGH`, `ALL`.
    - `itPriority`: Whitelisted against `LOW`, `MEDIUM`, `HIGH`, `ALL`.
    - `status`: Whitelisted against `NEW`, `IN_PROGRESS`, `RESOLVED`, `ALL`.
    - Any invalid query parameter triggers `400 Bad Request` with `{ error: "Validation failed", details }` identifying each invalid parameter.
  - Multi-parameter filtering (API-30): Category, Requested Priority, IT Priority, and Status filters operate independently and in combination without cross-requester data leakage.
  - Pagination clamping: Uses `clampPagination` helper to clamp requested page into `[1, totalPages]`, ensuring out-of-bounds page requests return the last valid page rather than an empty list or error (BR-12, AC-12, API-08).
  - Default sort order & tie-breaker: `createdAt desc, id desc` (BR-12, AC-11, API-31).
  - Safe database testing isolation: Suite creates isolated requesters (`my-tickets-suite-a@test.local`, `my-tickets-suite-b@test.local`) and cleans up only suite-created tickets and requesters in `afterAll`, never deleting seeded user records.
  - Sequential database integration tests: `server/vitest.config.ts` configured with `fileParallelism: false`.

### Frontend (Client)
- **Design System & Tokens:**
  - Added `.btn-secondary-zen` to `client/src/styles/zen-green.css` (white background, `--zg-text-primary` text, `1px solid var(--zg-border)`, hover `#F8FAFC`) strictly per `ui-spec.md` Section 3.1.
  - Badge colors strictly match `ui-spec.md` Section 7.2 tokens:
    - `RESOLVED`: Background `#DCFCE7`, Text `#15803D`, Icon `🟢`.
    - `LOW`: Background `#F1F5F9`, Text `#475569`.
    - `NEW`: Background `#E0F2FE`, Text `#0369A1`, Icon `🔵`.
    - `IN_PROGRESS`: Background `#FEF3C7`, Text `#92400E`, Icon `🟡`.
    - `MEDIUM`: Background `#FEF3C7`, Text `#B45309`.
    - `HIGH`: Background `#FEE2E2`, Text `#B91C1C`.
- **API Helpers (`client/src/api.ts`):**
  - Defined TypeScript interfaces `GetTicketsParams`, `TicketListItem`, `TicketsResponse`.
  - Implemented `fetchMyTickets` helper transmitting `X-Requester-Id` header and serialized query parameters.
- **My Tickets Screen (`client/src/pages/MyTickets.tsx`):**
  - Button Hierarchy Polish:
    - Primary actions (`+ Create Ticket` header, `Create First Ticket` in empty state, and active page number) styled with `.btn-primary-zen`.
    - Secondary actions (`Search`, `Clear Filters` in filter bar, `Clear Filters` in no-results state, `Retry` in error banner, `Previous`, `Next`, and inactive page numbers) styled with `.btn-secondary-zen` per `ui-spec.md` Section 3.1.
  - Header: Title, subtitle, and `+ Create Ticket` navigation button.
  - Filter & Search Bar (`ui-spec.md` Section 10.3):
    - Search input for Ticket # or summary with search icon button and Enter-key submission.
    - Category dropdown populated from `GET /api/categories`.
    - Requested Priority dropdown (`ALL`, `LOW`, `MEDIUM`, `HIGH`).
    - IT Priority dropdown (`ALL`, `LOW`, `MEDIUM`, `HIGH`) per FR-08, Section 10.3, AC-10, UI-14.
    - Status dropdown (`ALL`, `NEW`, `IN_PROGRESS`, `RESOLVED`).
    - Clear Filters button (`.btn-secondary-zen`) resetting all search and filter criteria to default.
    - Responsive grid: uses `col-12 col-md-4 col-lg` so mobile viewports `< 768px` collapse strictly into a single column (100% width each), while tablet (`768-991px`) uses 3 columns, and desktop (`≥ 992px`) forms an inline toolbar.
  - Distinct Empty State vs. No-Results State (BR-13, AC-14, UI-05):
    - **Empty State** (0 total tickets, no active filters): 📄 document icon, *"No tickets submitted yet"*, and *"Create First Ticket"* button (`.btn-primary-zen`).
    - **No-Results State** (0 matching tickets with active search/filters): 🔍 magnifying glass icon, *"No tickets match your filters"*, and *"Clear Filters"* button (`.btn-secondary-zen`).
  - Responsive Layouts (AC-19, Section 10.3):
    - **Desktop Table View (`≥ 992px`, `d-none d-lg-block`)**: Full table with sortable column headers showing directional indicators (▲/▼), monospace Ticket Number, formatted date, summary, category, accessible badges, and assigned owner.
    - **Mobile/Tablet Card View (`< 992px`, `d-block d-lg-none`)**: Stacked cards displaying Ticket Number, status badge, summary, category, and date stacked vertically with no table scrolling.
  - Accessible Badges (STYLE-02, AC-20):
    - Badges pair color with explicit text and distinctive visual icons, never color alone.
  - Pagination Toolbar:
    - Page summary text: `"Showing page X of Y (Z total tickets)"`.
    - Per-page size selector: 5, 8, 10, 20.
    - Numeric page buttons (`1, 2, ..., totalPages`) with active page indication (`aria-current="page"`).
    - Previous and Next buttons with proper `disabled` state on boundaries.
  - Requester Switching & Stale Data Elimination (AC-13, UI-06):
    - Previously rendered tickets are cleared immediately (`setTickets([])`) upon requester change.
    - Uses request generation token tracking (`activeRequestIdRef`) to discard delayed out-of-order responses.
    - Network failure on new requester keeps ticket list empty, ensuring old data never resurfaces.
  - Error and Retry State:
    - Renders error alert banner with Retry button if request fails; clicking Retry triggers reload.
- **Application Shell Wiring (`client/src/App.tsx`):**
  - Mounted `<MyTickets />` at `/my-tickets` under `<RouteGuard>`.

---

## 2. Acceptance Criteria & Test Mapping

| AC / BR | Test ID | Description | Result |
|---|---|---|---|
| AC-10 | API-06 | Scopes `GET /api/tickets` strictly to current requester in `X-Requester-Id` header | PASS |
| AC-11 | API-07 | Sorts tickets by requested field and order (`requestedPriority asc`) | PASS |
| AC-12, BR-12 | API-08 | Clamps out-of-bounds page requests to `totalPages` | PASS |
| AC-10 | API-09 | Case-insensitive search on ticket number and summary substrings | PASS |
| — | API-22 | Returns 400 with `details` for invalid `sortBy`, `sortOrder`, `limit`, `categoryId`, `requestedPriority`, `itPriority`, `status` | PASS |
| AC-10 | API-30 | Independent and combined filtering by category, requested priority, IT priority, and status with ownership preserved | PASS |
| AC-11, AC-12, BR-12 | API-31 | Default sort order (`createdAt desc, id desc` tie-breaker) and pagination metadata | PASS |
| AC-14, BR-13 | UI-05 | Distinct Empty State vs. No-Results State with distinct icons, copy, and actions | PASS |
| AC-13 | UI-06 | Refreshes tickets on requester change without stale data retention (deferred pending, failure, and out-of-order response paths) | PASS |
| AC-10, AC-11, AC-12 | UI-14 | Search, all 4 filters (including IT Priority), sort toggle, page size, direct page numbers, Previous/Next, genuine loading spinner, and retry | PASS |
| AC-20 | STYLE-02 | Accessible status and priority badges conveying status not by color alone, with exact spec color tokens | PASS |

---

## 3. Contract Versioning (v1.1.1)

- **`docs/lab-02/api-spec.md`**: Bumped to version `1.1.1` (updated 2026-09-04) explicitly documenting strict validation for all Phase 4 query parameters (`sortBy`, `sortOrder`, `limit`, `categoryId`, `requestedPriority`, `itPriority`, `status`).
- **`docs/lab-02/tests.md`**: Bumped to plan version `1.1.1` (updated 2026-09-04) noting the expanded scope of API-22 query parameter validation.

---

## 4. Live Verification of AC-10 through AC-14

- **AC-10 (Filter & Search):** Executed live HTTP calls with `categoryId=2`, `requestedPriority=LOW`, and `search=TKT-2026-900096` against `http://localhost:3000/api/tickets` with `X-Requester-Id: 1`. Filtered accurately to exactly matching tickets without data leakage.
- **AC-11 (Sorting):** Verified `sortBy=createdAt&sortOrder=asc` re-orders from oldest to newest; verified default `createdAt desc, id desc` orders deterministically.
- **AC-12 (Pagination & Clamping):** Verified out-of-range `page=999` clamped to `currentPage: 2`, `page=-5` clamped to `currentPage: 1`, valid page sizes `5, 8, 10, 20` return correct pagination metadata, and invalid `limit=15` returns `400 Bad Request`.
- **AC-13 (Requester Switching):** Requester 1 has 9 tickets, while Requester 2 and Requester 3 have 0 tickets. Switching between requesters immediately clears tickets with zero residual rows or stale data flash.
- **AC-14 (Empty vs. No-Results States):** Verified Requester 2 (0 tickets, no filters) triggers Empty State (📄 icon + "No tickets submitted yet" + "Create First Ticket" action), whereas Requester 1 with unmatched search `search=nonexistentterm` triggers No-Results State (🔍 icon + "No tickets match your filters" + "Clear Filters" action).

