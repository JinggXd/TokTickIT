# Antigravity Task — Phase 3 Create Ticket Corrections

**Date:** 2026-09-04  
**Branch:** `feature/7-lab2-create-ticket`  
**PR target:** `lab2-staging`  
**Scope:** Correct Phase 3 only. Do not implement Phase 4 or Phase 5 endpoints.

## Mandatory preparation

1. Read `AGENTS.md` and `.agents/skills/lab2-toktickit-build/SKILL.md` in full.
2. Read these four binding contracts in full before editing:
   - `docs/lab-02/specification.md`
   - `docs/lab-02/api-spec.md`
   - `docs/lab-02/ui-spec.md`
   - `docs/lab-02/tests.md`
3. Run `git status` and inspect the existing working-tree diff before editing. There are already
   uncommitted Phase 3 backend corrections in progress. Preserve and verify them; do not discard,
   reset, or overwrite them.
4. Use TDD for every uncovered case: add or strengthen the test, demonstrate the expected failure,
   then make the smallest implementation change that passes it. If implementation already exists,
   describe the new test honestly as regression coverage rather than fabricating a Red run.

## Corrections to complete

### P1 — Backend request safety and validation

- Finish the in-progress correction in `server/src/app.ts` so validation, Category/System lookups,
  and ticket creation are inside a safe error boundary.
- A non-object body such as JSON `null` must return the documented `400` validation response.
- Unexpected database failures during reference lookup or creation must return the documented flat
  `500` body without stack traces or internal details.
- Keep the exact `400` versus `401` behavior for malformed versus missing/inactive/unknown
  `X-Requester-Id`.
- In `server/src/utils/validation.ts`, accept IDs only when the original JSON value is a positive
  integer number. Strings such as `"1"` and booleans such as `true` must be rejected.
- Collect all independently discoverable input errors in one response. For example, an invalid
  summary together with nonexistent or inactive Category/System IDs must report all those fields.

### P1 — Strengthen server contract tests

Update `server/tests/lab-02/create-ticket.api.test.ts` and
`server/tests/lab-02/reference-data.api.test.ts` as needed:

- API-03, API-04, API-05, and API-28 must assert exact status codes and exact flat error bodies,
  including the absence of `details`.
- API-29 must cover both nonexistent and inactive Category/Related System records.
- API-29 must prove that syntax errors and reference errors are collected together.
- API-21 must cause three Prisma `P2002` ticket-number collisions, prove exactly three attempts,
  then assert the documented flat `500` response.
- API-27 must insert or otherwise arrange inactive Category and Related System records and prove
  that the reference endpoints exclude them while retaining ID ordering and exact response shape.
- Add regression coverage for a JSON `null` body, string/boolean IDs, and an unexpected reference
  lookup failure.
- Keep tests isolated and clean up test records/spies reliably.

### P1 — Attachment selection contract (staging only)

Correct `client/src/pages/CreateTicket.tsx` and UI-04 tests:

- Validate the real filename extension; a filename such as `jpg` without a dot is invalid.
- Extension matching may be case-insensitive, but accepted extensions are only `.jpg`, `.jpeg`,
  `.png`, `.webp`, and `.pdf`.
- Use the exact required messages:
  - `File exceeds the 5 MB size limit.`
  - `Only JPG, JPEG, PNG, WEBP, and PDF files are allowed.`
  - `This ticket already has 5 active attachments.`
- Display rejection feedback next to the offending file in the form's attachment area.
- Prove that rejected files are not staged and that selecting more than five files is rejected.
- Prove that Phase 3 makes no attachment upload/network request.
- Preserve valid files only in browser state. Do not create or call the Phase 5 attachment upload
  endpoint.

### P1 — Submitting and failure states

- While submission is pending, show the required busy button and make every editable control
  read-only or disabled: Category, Related System, Priority, Summary, Description, attachment
  picker, Submit, and Cancel/navigation action as required by the contract.
- Prevent duplicate submissions.
- On API failure, preserve every entered value and staged valid attachment.
- Fix the React Testing Library `act(...)` warning in UI-02 by resolving the pending promise inside
  `act` and awaiting the settled UI state. The client test output must contain no act warning.

### P2 — Exact Create Ticket layout and styling

- Change Category / Related System / Priority from the current three-column layout to the
  two-column grid required by `ui-spec.md` Section 10.2.
- Ensure the Description textarea has `min-height: 100px` and `resize: vertical`; the shared
  40-pixel input height must not override it.
- Do not introduce any color outside the documented Zen Green token set.
- Strengthen STYLE-01 to check computed Zen Green styling, not only CSS class names.
- Strengthen STYLE-04 to prove keyboard tab navigation and a visible focus indicator.

### P2 — Exact success state

- Make the backend-generated Ticket Number the success state's headline as required by the UI
  contract.
- UI-13 must verify the rendered Ticket Number, Ticket Date, and selected Requester identity.
- Do not generate the ticket number or authoritative created date in the client.

### P3 — Diff hygiene

- Remove the extra blank line at EOF reported by `git diff --check` in:
  - `client/src/api.ts`
  - `server/src/app.ts`
- Run `git diff --check` again and leave it clean.

## Explicitly out of scope

- Do not add `schema.integration.test.ts` or `seed.integration.test.ts` on this Phase 3 branch;
  DATA-01/DATA-02 are a separate Phase 1 audit issue unless a reviewer explicitly approves mixing
  that scope.
- Do not implement attachment upload/download/removal, My Tickets, Ticket Detail, real auth, staff
  workflow, comments, notes, actions taken, admin screens, or status transitions beyond `NEW`.
- Do not add dependencies, merge a PR, force-push, or alter the database destructively.

## Required verification before reporting completion

Run and record the real results of:

```powershell
npm --prefix server run test
npm --prefix client run test
npm --prefix server run build
npm --prefix client run build
git diff --check
rg -n "(?:it|test|describe)\\.(?:skip|todo)|\\.only\\(|xit\\(|xdescribe\\(" server client
```

If Playwright is already configured, run its current suite. If it is not configured yet, report it
as pending Phase 7; do not claim the full Playwright suite passed.

Manually verify AC-01, AC-03, AC-04, AC-05, AC-06, and AC-07 against the running application.

## Completion report

When finished, report:

1. Every changed file and why it changed.
2. Which findings above were fixed.
3. Which Acceptance Criteria and planned test IDs now pass.
4. Exact test/build counts and whether warnings or skips remain.
5. Any unresolved contract ambiguity, named by document and section.
6. The current `git status` and `git diff --check` result.

Do not describe the work as complete if a required assertion is missing, a test is skipped, a
warning remains, or a required manual check was not actually performed. Do not commit, push, or
merge until the user explicitly requests it.
