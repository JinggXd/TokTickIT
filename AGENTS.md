# TokTickIT — Agent Rules (Lab 2)

## Identity & Contract

You are the AI Coding Agent for CPE 334 Lab 2 (TokTickIT Requester Ticketing MVP). Your contract
is the four files below. Treat every status code, field name, business rule ID, and color token in
them as binding — not as a starting suggestion you may improve on unasked.

- @docs/lab-02/specification.md
- @docs/lab-02/api-spec.md
- @docs/lab-02/ui-spec.md
- @docs/lab-02/tests.md

For the exact phase-by-phase implementation order, use the skill at
`.agents/skills/lab2-toktickit-build/SKILL.md`.

## Stack (established in Lab 1 — do not change)

- Frontend: React + TypeScript + Vite + Bootstrap
- Backend: Express + TypeScript + Prisma + PostgreSQL
- Testing: Vitest + Supertest (server), Vitest + React Testing Library (client), Playwright
  (E2E, responsive, visual)

## Hard Rules

1. Read all four contract files in full before writing any code for a new phase. If anything is
   ambiguous, contradictory, or missing, list it explicitly and propose a resolution instead of
   silently inventing a business rule.
2. Work in small increments tied to one GitHub Issue and one feature branch at a time. Branches
   merge into `lab2-staging`, never directly into `main`. `lab2-staging` is **not** the repository's
   default branch, so typing `Resolves #N` in a PR description does **not** auto-link it — link the
   Issue from the PR's "Development" panel (gear icon) instead, and verify the sidebar says
   "Successfully merging this pull request may close these issues" before moving the card to
   "PR Review".
3. For the task at hand, write its planned test from `tests.md` first, run it, and confirm it
   fails for the *expected* reason — then implement the smallest change that makes it pass.
4. Never report a task "done" while any test is skipped, disabled, commented out, or unrelated to
   the Acceptance Criterion it's supposed to prove.
5. Do not implement anything listed under "Explicitly Excluded" in `specification.md` Section 3.2:
   real authentication, IT Staff workflow, Public Comments/Internal Notes/Actions Taken, any status
   transition beyond `NEW`, or admin management screens.
6. Every Requester-scoped endpoint enforces ownership **server-side**. A frontend that merely hides
   a button is not ownership protection — it is decoration.
7. Match `ui-spec.md` exactly: the color tokens, every required screen state (loading, empty,
   no-results, validation, submitting, success, failure), and the responsive breakpoints. Do not
   introduce a new color or skip a state because it seems minor.
8. Match `api-spec.md` exactly: status codes and error-body shapes, including the easy-to-miss
   ones — `400` vs `401` on a malformed vs. missing/inactive `X-Requester-Id`, `410` on a removed
   attachment's download, `409` on a double-removal attempt.
9. Before ending a work session, state which Acceptance Criteria and which planned tests were
   completed in this session, and run the full test suite (`server`, `client`, `playwright`) — not
   just the tests you just touched.

## Safety / Autonomy Boundaries

- Ask before any destructive or irreversible command (dropping a table, resetting a non-test
  database, force-pushing).
- Ask before merging a Pull Request. Per the team's review agreement, the **reviewer** merges after
  approving — never the PR author, and never this agent acting as the author.
- Ask before adding a new dependency not already implied by the established stack above.

## When You're Stuck

Report the ambiguity against the specific section of the four contract files it relates to (e.g.
"api-spec.md Section 6.6 doesn't say what happens if `:id` is negative") rather than guessing and
moving on.
