# What I Have Done - Phase 2 Requester Context (Audited)

**Branch:** `feature/6-lab2-requester-context`<br>
**Base branch:** `lab2-staging`<br>
**Original implementation date:** 2026-09-01<br>
**Audit/update date:** 2026-09-04<br>
**Status:** Fixing and verification - not yet ready to claim PR completion

**Contract/skill update:** Version `1.1.0` adds missing regression coverage. Phase 2 must now add
MW-06, complete API-26's empty/failure cases, and add the named UI-11/UI-17 coverage before its
updated Done gate is satisfied. These are planned corrections, not tests that have already passed.

---

## 1. Phase 2 Scope Completed

The Phase 2 increment implements the Development Requester testing context required before ticket
features can be built:

- `GET /api/requesters/active` returns active seeded Requesters.
- Shared `requireRequester` middleware distinguishes missing/inactive context (`401`) from a
  malformed positive-integer header (`400`).
- `RequesterContext` stores and restores the selected Requester for the testing session.
- `RouteGuard` prevents requester-scoped screens from rendering when no Requester is selected.
- `RequesterSelection` includes loading, empty, API failure, dropdown, Continue action, and clear
  wording that the selector is not real authentication.
- `AppShell` shows the selected Requester and provides a Change action.
- Zen Green tokens and reusable shell/form classes establish the Lab 2 UI foundation.

This directly supports FR-01, FR-02, AC-02, BR-03, BR-05, and the Phase 2 middleware portion of
BR-06/AC-18.

## 2. TDD Evidence Preserved

The original Phase 2 implementation added middleware/API tests and client component tests before
the implementation was completed. The branch contains:

- `MW-03`: missing `X-Requester-Id` -> `401`.
- `MW-04`: malformed header -> `400` without a validation `details` object.
- `MW-05`: inactive Requester -> `401`.
- active-requester list API coverage.
- `UI-10`: route guard behavior.
- Requester Selection loading, success, empty, and failure states.

The endpoint-level `API-03`, `API-04`, and `API-05` tests remain correctly scheduled for Phase 3,
when `POST /api/tickets` exists.

## 3. Corrections Made During the Audit

The following changes improve contract accuracy and regression safety:

- middleware `401` responses now use the exact generic API-contract message;
- tests locate active/inactive seeded Requesters by stable email instead of assuming database IDs
  are always `1` and `5`;
- the active-requester API test verifies data and ascending order without hard-coding generated
  primary keys;
- the selector now uses the shared API helper and honors `VITE_API_URL`;
- client tests use `globalThis.fetch` and assert the expected API URL;
- `noEmit` prevents TypeScript build artifacts from being written into source/test folders;
- README now documents setup, migration, seed, test, and build commands;
- the contract explicitly traces backend `createdAt` to the read-only Ticket Date required on the
  future Create Ticket screen; and
- the Phase 1 ticket-number helper was hardened to retry only Prisma `P2002` collisions for
  `ticketNo`, reject sequence overflow, and immediately rethrow unrelated database errors.

## 4. Important Scope Qualification

The old report stated that FR-03 and BR-14 were complete. Phase 2 provides the Change Requester
action and context reset foundation, but the strict requirement that previously rendered ticket
rows disappear cannot be fully proven until My Tickets exists in Phase 4 and UI-06/E2E-01 run.
Therefore FR-03/BR-14 are only partially evidenced at this stage.

The ticket-number hardening belongs to the Phase 1 data-layer scope. It is currently present as an
uncommitted correction on the Phase 2 branch, so the work should be split into its own Issue/branch
or explicitly approved and documented by the reviewer before the Phase 2 PR.

## 5. Current Verification

| Check | Current result |
|---|---|
| Server tests | PASS - 8 files, 15 tests |
| Client tests | PASS - 3 files, 9 tests |
| Server TypeScript build | PASS |
| Client production build | PASS |
| Skipped/disabled tests | None found |
| Playwright | Not available yet; planned for Phases 7-8 |

## 6. Correct Current State

The feature implementation exists and its available tests/builds pass, but the branch should not
be called `Completed`, `Ready for PR`, or `Done` until:

1. mixed Phase 1/Phase 2 changes are assigned to the correct Issue/branch scope;
2. all intended corrections are committed and pushed;
3. the PR targets `lab2-staging` and is linked from the Development panel;
4. a peer reviewer reviews and approves it; and
5. the reviewer, not the author, merges it.
