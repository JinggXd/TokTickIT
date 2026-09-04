---
name: lab2-toktickit-build
description: Use this skill when implementing any part of CPE 334 Lab 2 for TokTickIT — the Development Requester selector, Create Ticket, My Tickets, Requester Ticket Detail, or the Attachment lifecycle (upload / download / soft-remove). Provides the exact phase-by-phase build order, the file list per phase, and the TDD sequence (test first, confirm red, then implement) derived from docs/lab-02/specification.md, api-spec.md, ui-spec.md, and tests.md. Read this in full before starting Phase 1, and re-check the relevant phase section before starting each new GitHub Issue.
metadata:
  version: "1.1.0"
  updated: "2026-09-04"
---

# Lab 2 Build Guide — TokTickIT Requester Ticketing MVP

**Update version:** `1.1.0` (2026-09-04)

Version 1.1.0 clarifies the Phase 3/Phase 5 attachment boundary, replaces placeholder client-test
paths with repository paths, completes the test/evidence gates, adds the actual Playwright setup
files, and requires a final verification run on `main` after the release PR is merged.

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

## Common Issue, PR, and Evidence Gates

Apply these gates to every phase:

1. Confirm the GitHub Issue, current feature branch, and base commit before editing. One branch must
   carry one coherent Issue scope; do not mix corrections from an earlier phase into the current
   feature branch without recording reviewer agreement.
2. Create the planned test first and retain the real Red output. If a test is added after its
   implementation already exists because an audit found a gap, label it honestly as regression
   coverage; never fabricate a Red run.
3. Before requesting review, run the focused tests, all currently available regression suites,
   both production builds, and a skipped/disabled-test scan. If Playwright is not installed yet,
   record it as pending Phase 7 rather than reporting the full suite as passing.
4. A feature PR targets `lab2-staging`. Link its Issue through GitHub's Development panel and
   verify the PR sidebar says merging may close the Issue before moving the card to `PR Review`.
5. The author responds to review comments; the peer reviewer approves and merges. Do not call an
   Issue `Done` merely because implementation tests pass locally.
6. Optional phase logs (`whatihavedoneN.md`, `testN.md`, `filechangeN.md`, and `aiN.md`) may be kept
   as supporting evidence. They must contain only real commands, outputs, changed files, prompts,
   commit hashes, and PR/Issue links. They never replace the required canonical files
   `specification.md`, `tests.md`, `ui-spec.md`, `api-spec.md`, `reviewer.md`, and `ai-use.md`.

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
`server/tests/lab-02/validation.unit.test.ts`, `server/tests/lab-02/schema.integration.test.ts`,
`server/tests/lab-02/seed.integration.test.ts`.

1. Write UNIT-01 through UNIT-06 and DATA-01/DATA-02 (`tests.md` Section 3) against behavior that
   does not exist yet.
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
   and confirm no duplicate rows. Make DATA-01/DATA-02 pass.

**Done when:** UNIT-01 through UNIT-06 and DATA-01/DATA-02 pass; seed script is safely re-runnable;
schema matches `specification.md` Section 7.1 field-for-field.

---

## Phase 2 — Requester Context (API + Selector Screen)

**Files:** `GET /api/requesters/active` route + its `X-Requester-Id` validation middleware (used by
every later endpoint), `RequesterSelection` screen, requester-context state (React Context or
equivalent), route guard and app-shell components,
`server/tests/lab-02/requester-middleware.api.test.ts`,
`server/tests/lab-02/requesters.api.test.ts`,
`client/tests/lab-02/RequesterSelection.test.tsx`,
`client/tests/lab-02/RouteGuard.test.tsx`, and `client/tests/lab-02/AppShell.test.tsx`.

1. Write MW-03, MW-04, MW-05, MW-06 — middleware-level equivalents of API-03/04/05/28 (missing /
   malformed / inactive / unknown header) — against the
   *middleware* directly via a throwaway route in `requester-middleware.api.test.ts`, not a
   specific endpoint yet. Also write API-26 for the active-Requester endpoint. These verify Phase 2
   behavior; the official API-03/04/05/28 integration test IDs are written in Phase 3 against
   `create-ticket.api.test.ts` per `tests.md`'s file pin.
2. Implement `GET /api/requesters/active` (`api-spec.md` Section 6.1) and the shared middleware.
   Make MW-03/04/05/06 and API-26 pass.
3. Write UI-10 (route guard), UI-11 (Requester Selection states/disclaimer), and UI-17 (app shell
   navigation/Change action) against not-yet-built components; confirm they fail.
4. Build the Requester Selection screen per `ui-spec.md` Section 10.1 — all required elements:
   title, "testing only" explanation, dropdown, Continue button, loading/empty/failure states.
5. Build the route guard (FR-02, AC-02) so My Tickets / Create Ticket redirect here when no
   Requester is selected. Make UI-10 and UI-11 pass.
6. Build the app shell (`ui-spec.md` Section 9): header, active nav, Requester name + Change action.
   Make UI-17 pass.

**Done when:** AC-02 passes end-to-end by hand; API-26, MW-03/04/05/06, UI-10, UI-11, and UI-17
pass; the shell shows the selected Requester's name and offers Change.

---

## Phase 3 — Create Ticket

**Files:** `GET /api/categories`, `GET /api/related-systems`, `POST /api/tickets`, `CreateTicket`
screen + reusable Zen Green form components, `server/tests/lab-02/create-ticket.api.test.ts`,
`server/tests/lab-02/reference-data.api.test.ts`,
`client/tests/lab-02/CreateTicket.test.tsx`.

1. Write API-01 through API-05, API-21, and API-27 through API-29 (`tests.md` Section 4) against
   the not-yet-implemented endpoints; confirm they fail for the expected missing behavior. Mock
   API-21's ticket-number collision the same way UNIT-02 does. API-03/04/05/28 must exercise the
   real `POST /api/tickets` route, not only the middleware throwaway route, and must assert the
   documented error-body shape without a validation `details` key.
2. Implement `GET /api/categories` and `GET /api/related-systems` (`api-spec.md` 6.2, 6.3).
3. Implement `POST /api/tickets` per `api-spec.md` Section 6.4, including every listed error case
   (validation `400`, reference-not-found `400`, `401` from the shared middleware, `500` after
   3 retry-exhausted attempts). Make API-01–05, API-21, and API-27–29 pass.
4. Write UI-01, UI-02, UI-03, UI-04, UI-12, and UI-13 (`tests.md` Section 5) against the
   not-yet-built form; confirm they fail.
5. Build the Create Ticket screen per `ui-spec.md` Section 10.2 — field-by-field control mapping,
   busy-button behavior (BR-10), failure state that preserves form values (BR-11), client-side
   attachment rejection messages (`ui-spec.md` Section 4.2). Make UI-01–04 and UI-12/UI-13 pass.
6. Implement attachment selection, client-side validation, and staging only. Do not call or build
   the attachment upload endpoint in Phase 3 because it is a Phase 5 deliverable. Keep the staged
   files ready for the post-create integration completed in Phase 5.
7. Write STYLE-01 and STYLE-04 against this screen; make them pass.

**Done when:** AC-01, AC-03, AC-04, AC-05, AC-06, AC-07 all pass by hand and by test.

---

## Phase 4 — My Tickets

**Files:** `GET /api/tickets`, `MyTickets` screen, `server/tests/lab-02/my-tickets.api.test.ts`,
`client/tests/lab-02/MyTickets.test.tsx`.

1. Write API-06 through API-09, API-22, API-30, and API-31 (`tests.md` Section 4); confirm they
   fail.
2. Implement `GET /api/tickets` per `api-spec.md` Section 6.5 — search, filters, sort, pagination,
   the exact default sort and clamping behavior from BR-12. Make API-06–09, API-22, API-30, and
   API-31 pass.
3. Write UI-05, UI-06, and UI-14 (`tests.md` Section 5) against the not-yet-built list; confirm
   they fail.
4. Build the My Tickets screen per `ui-spec.md` Section 10.3: desktop table / mobile card, search
   bar, filter dropdowns, Clear Filters, sortable columns, pagination control, distinct Empty vs.
   No-Results states. Make UI-05, UI-06, and UI-14 pass.
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
`client/tests/lab-02/RequesterTicketDetail.test.tsx`,
`client/tests/lab-02/AttachmentSection.test.tsx`.

1. Write API-10, API-11, API-12 (ticket detail); confirm they fail. Implement
   `GET /api/tickets/:id` per `api-spec.md` Section 6.6, enforcing ownership (`403`/`404`). Make
   them pass. **This 403 case (API-10) is the single most important test in the sprint — do not
   let it slip.**
2. Write API-13 through API-20 and API-23 through API-25 (attachment limits, upload, download,
   soft-remove, and ownership), plus API-32, API-33, and API-34 (owned download, missing resources,
   and disk-write failure); confirm they fail.
3. Implement upload (`api-spec.md` 6.7, with the safe-filename policy from Section 5 and the
   5-active-file limit), download (6.8, `410` on removed files), and soft-remove (6.9, `409` on
   double-removal). Make API-13–20, API-23–25, and API-32–34 pass.
4. Write UI-07, UI-08, UI-09, UI-15, UI-16, and UI-18 (`tests.md` Section 5); confirm they fail.
5. Build the Ticket Detail screen per `ui-spec.md` Section 10.4 — fully read-only header,
   Attachment Management card with every attachment state (active / uploading / removed /
   unavailable) from the state table. Make UI-07–09, UI-15, and UI-16 pass.
6. Write STYLE-03 (read-only vs. editable contrast); make it pass.
7. Now that the upload endpoint exists, complete Create Ticket's post-create attachment upload.
   Upload staged files only after `POST /api/tickets` returns `201`; report failures per file and
   preserve the created ticket and Ticket Number. Make API-34 and UI-18 pass.

**Done when:** AC-08, AC-09, AC-15, AC-16, AC-17, AC-20, AC-21 all pass by hand and by test.

---

## Phase 6 — Ownership Hardening Pass

A dedicated pass, *after* every screen exists, specifically re-testing ownership because it's easy
to get right for the happy path and wrong for the edge cases once multiple endpoints exist.

1. Re-run the named ownership and Requester-context coverage: API-06, API-10, API-20, API-23,
   API-25, API-28, API-33, MW-03, MW-04, MW-05, and MW-06. If an uncovered path is discovered,
   add it to `tests.md` with a new test ID and actual file path before implementing the test; do
   not create an untracked test that is absent from the plan.
2. Manually try, with a real second seeded Requester: opening another Requester's ticket by URL,
   downloading another Requester's attachment by direct link, and soft-removing another
   Requester's attachment by direct API call. All three must fail with the documented status code.

**Done when:** every write and read path in `api-spec.md` Section 7 (Error Scenario Matrix) has a
corresponding passing test.

---

## Phase 7 — Responsive & Visual Polish

**Files:** root `package.json`/lockfile (only if the repository does not already have a root test
workspace), `playwright.config.ts`, `e2e/lab-02/requester-ticket-flow.spec.ts`, and
`artifacts/lab-02/screenshots/**`.

1. If Playwright is not already installed, ask before adding the dependency. Configure desktop,
   tablet, and mobile projects in `playwright.config.ts`; do not mislabel the E2E spec as the
   Playwright configuration.
2. Write RESP-01, RESP-02, RESP-03 against the built screens (not fresh builds — these
   screens already exist from Phases 2–5); confirm any gaps.
3. Fix layout issues until all three pass, then capture the 9 required screenshots listed in
   `ui-spec.md` Section 11.
4. Walk through the Visual Inspection Checklist in `ui-spec.md` Section 8 against the actual
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
5. After the peer reviewer approves and merges the release PR, check out the final `main`, rerun
   the server, client, and Playwright suites with zero skips, and record the real output in
   `docs/lab-02/tests.md` Section 12. Also rerun both production builds.
6. Assemble exactly one concise submission PDF using headings `Answer Part 1` through
   `Answer Part 9` in that order, with real working links and readable evidence screenshots.

**Done when:** every checkbox in `specification.md` Section 10 is genuinely true on final `main`,
the final test results are recorded, the reviewer has merged the release PR, and all nine PDF
evidence sections are complete.
