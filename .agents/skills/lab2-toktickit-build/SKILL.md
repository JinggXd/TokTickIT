---
name: lab2-toktickit-build
description: Use this skill when implementing any part of CPE 334 Lab 2 for TokTickIT — the Development Requester selector, Create Ticket, My Tickets, Requester Ticket Detail, or the Attachment lifecycle (upload / download / soft-remove). Provides the exact phase-by-phase build order, the file list per phase, and the TDD sequence (test first, confirm red, then implement) derived from docs/lab-02/specification.md, api-spec.md, ui-spec.md, and tests.md. Read this in full before starting Phase 1, and re-check the relevant phase section before starting each new GitHub Issue.
---

# Lab 2 Build Guide — TokTickIT Requester Ticketing MVP

Read `AGENTS.md` first for the standing rules. This file is the *sequence* — what to build, in
what order, with which test written first, so that no phase depends on unfinished work from a
later phase.

Each phase below is sized to become one or more GitHub Issues on the Kanban board (`Backlog →
Specified → Started → PR Review → Fixing → Done`), on its own feature branch, merged into
`lab2-staging` via a reviewed Pull Request. Do not skip ahead to a later phase's files.

> **Note:** AC-01, AC-07, AC-08, AC-13, AC-17 also trace to an E2E-0X test that isn't written
> until Phase 8. Where an earlier phase's "Done when" lists one of these, "pass by hand and by
> test" means verified manually once, plus every test ID already assigned to a completed phase —
> not the E2E-0X test, which closes the loop in Phase 8.

---

## Phase 0 — Read the Contract (no code)

1. Read `docs/lab-02/specification.md`, `api-spec.md`, `ui-spec.md`, and `tests.md` in full.
2. Check whether a `Category` model already exists from Lab 1 (grep the Prisma schema and past
   migrations for it). If it does, plan to extend it, not replace it — see
   `specification.md` Section 7.1's note.
3. List every ambiguity you find, with the exact section it came from. Do not resolve them
   yourself with a guess — surface them and wait for confirmation.
4. **Do not write implementation code in this phase.**

**Suggested Issue:** "Review Lab 2 contract and confirm implementation order."

---

## Phase 1 — Data Layer

**Files:** `server/prisma/schema.prisma`, one new migration, `server/prisma/seed.ts` (or
equivalent), `server/tests/lab-02/ticket-number.unit.test.ts`,
`server/tests/lab-02/safe-filename.unit.test.ts`, `server/tests/lab-02/pagination.unit.test.ts`,
`server/tests/lab-02/validation.unit.test.ts`.

1. Write UNIT-01 through UNIT-06 (`tests.md` Section 3) against functions that don't exist yet.
   Confirm they fail to compile/run for the right reason (missing implementation, not a typo).
2. Implement the Prisma models from `specification.md` Section 7.1 (`RequesterUser`, `Category` if
   not already present, `RelatedSystem`, `Ticket`, `Attachment`, plus the `Priority` and
   `TicketStatus` enums). Add the composite index from Section 7.2.
3. Run the migration against a local/test Postgres instance.
4. Implement the ticket-number generator, the filename sanitizer, the pagination-clamp helper, and
   the trim+validate helper as small, independently testable functions — this is what UNIT-01
   through UNIT-06 are exercising. Make them pass.
5. Write the idempotent seed script per `specification.md` Section 7.3 (4 Categories, 7 Related
   Systems, 4 active + 1 inactive Requester, exact names/emails given there). Run it twice locally
   and confirm no duplicate rows.

**Done when:** UNIT-01 through UNIT-06 pass; seed script is safely re-runnable; schema matches
`specification.md` Section 7.1 field-for-field.

---

## Phase 2 — Requester Context (API + Selector Screen)

**Files:** `GET /api/requesters/active` route + its `X-Requester-Id` validation middleware (used by
every later endpoint), `RequesterSelection` screen, requester-context state (React Context or
equivalent), route guard component, `server/tests/lab-02/requester-middleware.api.test.ts`,
`server/tests/lab-02/requesters.api.test.ts`.

1. Write MW-03, MW-04, MW-05 — middleware-level equivalents of API-03/04/05 (same three
   scenarios from `tests.md` Section 4: missing / malformed / inactive header) — against the
   *middleware* directly via a throwaway route in `requester-middleware.api.test.ts`, not a
   specific endpoint yet. These verify middleware correctness in Phase 2; the official API-03/04/05
   test IDs are written for real in Phase 3 against `create-ticket.api.test.ts` per `tests.md`'s
   file pin.
2. Implement `GET /api/requesters/active` (`api-spec.md` Section 6.1) and the shared middleware.
   Make MW-03/04/05 and requesters API tests pass.
3. Write UI-10 (route guard) against a not-yet-built guard component; confirm it fails.
4. Build the Requester Selection screen per `ui-spec.md` Section 10.1 — all required elements:
   title, "testing only" explanation, dropdown, Continue button, loading/empty/failure states.
5. Build the route guard (FR-02, AC-02) so My Tickets / Create Ticket redirect here when no
   Requester is selected. Make UI-10 pass.
6. Build the app shell (`ui-spec.md` Section 9): header, nav, Requester name + Change action.

**Done when:** AC-02 passes end-to-end by hand; MW-03/04/05 and UI-10 pass; the shell shows the
selected Requester's name and offers Change.

---

## Phase 3 — Create Ticket

**Files:** `GET /api/categories`, `GET /api/related-systems`, `POST /api/tickets`, `CreateTicket`
screen + reusable Zen Green form components, `server/tests/lab-02/create-ticket.api.test.ts`,
`client/.../lab-02 tests/CreateTicket.test.tsx`.

1. Write API-01, API-02 (`tests.md` Section 4) against `POST /api/tickets`; confirm they fail.
   Also write API-21 (ticket-number-retry-exhausted → 500), mocking the collision the same way
   UNIT-02 does.
2. Implement `GET /api/categories` and `GET /api/related-systems` (`api-spec.md` 6.2, 6.3).
3. Implement `POST /api/tickets` per `api-spec.md` Section 6.4, including every listed error case
   (validation `400`, reference-not-found `400`, `401` from the shared middleware, `500` after
   3 retry-exhausted attempts). Make API-01/02 and API-21 pass.
3b. Write API-03, API-04, API-05 in full (`tests.md` Section 4) against the real
    `POST /api/tickets` endpoint in `create-ticket.api.test.ts` — same three scenarios as
    MW-03/04/05, but asserting the actual wired response, including the error-body shape
    (no `details` key) so these are never confused with API-02's validation-400. Do not treat
    this as a "quick check" — it is the test ID `tests.md`'s Traceability Matrix and Section 10
    point to; skipping or shortening it leaves those sections false.
4. Write UI-01, UI-02, UI-03, UI-04 (`tests.md` Section 5) against the not-yet-built form; confirm
   they fail.
5. Build the Create Ticket screen per `ui-spec.md` Section 10.2 — field-by-field control mapping,
   busy-button behavior (BR-10), failure state that preserves form values (BR-11), client-side
   attachment rejection messages (`ui-spec.md` Section 4.2). Make UI-01–04 pass.
6. Wire attachment selection into the create form (files staged client-side, uploaded after the
   ticket itself is created — see Phase 5 for the actual upload endpoint; Create Ticket can call it
   immediately after receiving the new `id` on `201`).
7. Write STYLE-01 and STYLE-04 against this screen; make them pass.

**Done when:** AC-01, AC-03, AC-04, AC-05, AC-06, AC-07 all pass by hand and by test.

---

## Phase 4 — My Tickets

**Files:** `GET /api/tickets`, `MyTickets` screen, `server/tests/lab-02/my-tickets.api.test.ts`,
`client/.../lab-02 tests/MyTickets.test.tsx`.

1. Write API-06 through API-09 (`tests.md` Section 4); confirm they fail.
   Also write API-22 (unsupported sortBy/limit → 400).
2. Implement `GET /api/tickets` per `api-spec.md` Section 6.5 — search, filters, sort, pagination,
   the exact default sort and clamping behavior from BR-12. Make API-06–09 and API-22 pass.
3. Write UI-05, UI-06 (`tests.md` Section 5) against the not-yet-built list; confirm they fail.
4. Build the My Tickets screen per `ui-spec.md` Section 10.3: desktop table / mobile card, search
   bar, filter dropdowns, Clear Filters, sortable columns, pagination control, distinct Empty vs.
   No-Results states. Make UI-05–06 pass.
5. Write STYLE-02 (badge non-color accessibility); make it pass. (RESP-01 stays in Phase 7 —
   its file is a Phase-7 deliverable; do an informal manual check of the mobile card layout
   here if you like, but don't write the formal test yet.)

**Done when:** AC-10 through AC-14 all pass by hand and by test.

---

## Phase 5 — Ticket Detail & Attachments

**Files:** `GET /api/tickets/:id`, `POST /api/tickets/:id/attachments`,
`GET /api/attachments/:id/download`, `DELETE /api/attachments/:id`,
`RequesterTicketDetail` screen, `AttachmentSection` component,
`server/tests/lab-02/ticket-detail.api.test.ts`, `server/tests/lab-02/attachments.api.test.ts`,
`client/.../lab-02 tests/RequesterTicketDetail.test.tsx`,
`client/.../lab-02 tests/AttachmentSection.test.tsx`.

1. Write API-10, API-11, API-12 (ticket detail); confirm they fail. Implement
   `GET /api/tickets/:id` per `api-spec.md` Section 6.6, enforcing ownership (`403`/`404`). Make
   them pass. **This 403 case (API-10) is the single most important test in the sprint — do not
   let it slip.**
2. Write API-13 through API-20 (attachments — upload limits, soft-remove, download-blocking);
   confirm they fail. Also write API-23 (upload cross-Requester → 403) and API-24/API-25 (missing-reason 400 /
   removal cross-Requester → 403) in the same file.
3. Implement upload (`api-spec.md` 6.7, with the safe-filename policy from Section 5 and the
   5-active-file limit), download (6.8, `410` on removed files), and soft-remove (6.9, `409` on
   double-removal). Make API-13–20 and API-23–25 pass.
4. Write UI-07, UI-08, UI-09 (`tests.md` Section 5); confirm they fail.
5. Build the Ticket Detail screen per `ui-spec.md` Section 10.4 — fully read-only header,
   Attachment Management card with every attachment state (active / uploading / removed /
   unavailable) from the state table. Make UI-07–09 pass.
6. Write STYLE-03 (read-only vs. editable contrast); make it pass.

**Done when:** AC-08, AC-09, AC-15, AC-16, AC-17, AC-20 all pass by hand and by test.

---

## Phase 6 — Ownership Hardening Pass

A dedicated pass, *after* every screen exists, specifically re-testing ownership because it's easy
to get right for the happy path and wrong for the edge cases once multiple endpoints exist.

1. Re-run API-10, API-20, and add any missing cross-Requester negative test for an endpoint that
   didn't get one during its own phase. API-21 through API-25 (added in Phases 3–5) should
   already exist and pass by now — re-run them, don't invent new untracked tests here.
2. Manually try, with a real second seeded Requester: opening another Requester's ticket by URL,
   downloading another Requester's attachment by direct link, and soft-removing another
   Requester's attachment by direct API call. All three must fail with the documented status code.

**Done when:** every write and read path in `api-spec.md` Section 7 (Error Scenario Matrix) has a
corresponding passing test.

---

## Phase 7 — Responsive & Visual Polish

**Files:** `e2e/lab-02/requester-ticket-flow.spec.ts` (Playwright config for 3 viewports),
`artifacts/lab-02/screenshots/**`.

1. Write RESP-01, RESP-02, RESP-03 against the built screens (not fresh builds — these
   screens already exist from Phases 2–5); confirm any gaps.
2. Fix layout issues until all three pass, then capture the 9 required screenshots listed in
   `ui-spec.md` Section 11.
3. Walk through the Visual Inspection Checklist in `ui-spec.md` Section 8 against the actual
   screenshots, not memory. Record the result.

**Done when:** AC-19 passes at all three breakpoints and the checklist is complete.

---

## Phase 8 — End-to-End

**Files:** `e2e/lab-02/requester-ticket-flow.spec.ts` (extend from Phase 7).

1. Write E2E-01 (full happy path across Requester selection → create → find → switch-away).
2. Write E2E-02 (simulated backend failure during submission — confirm form retains values).
3. Write E2E-03 (direct-URL cross-Requester access + direct-URL removed-attachment download).

**Done when:** all of `tests.md` Section 8 passes headlessly.

---

## Phase 9 — Docs & Submission

1. Fill `docs/lab-02/reviewer.md` and `docs/lab-02/ai-use.md` with **real** content — actual PR
   links, actual reviewer comments and replies, actual prompts used. Do not let the coding agent
   fabricate this; it documents what a human did, not what the agent can infer.
2. Walk the Definition of Done in `specification.md` Section 10 top to bottom.
3. Confirm `npm --prefix server run test`, `npm --prefix client run test`, and
   `npx playwright test` are all green with zero skips on the tip of `lab2-staging`.
4. Open the single release Pull Request `lab2-staging → main`.

**Done when:** every checkbox in `specification.md` Section 10 is genuinely true, not just
believed to be true.
