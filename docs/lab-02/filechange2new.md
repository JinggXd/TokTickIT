# Phase 2 File Changes Log - Audited

**Branch:** `feature/6-lab2-requester-context`<br>
**Commit audited:** `71425f1`<br>
**Audit date:** 2026-09-04

---

## 1. Files in the Phase 2 Implementation Commit

### Backend

| File | Change | Purpose |
|---|---|---|
| `server/src/app.ts` | Modified | Adds `GET /api/requesters/active` |
| `server/src/middleware/requireRequester.ts` | Added | Validates and attaches Requester context |
| `server/tests/lab-02/requester-middleware.api.test.ts` | Added | Covers MW-03, MW-04, MW-05, and valid context |
| `server/tests/lab-02/requesters.api.test.ts` | Added | Covers active Requester listing |

### Client

| File | Change | Purpose |
|---|---|---|
| `client/src/App.tsx` | Modified | Wires Requester context, guard, and shell |
| `client/src/Lab1App.tsx` | Added | Preserves the Lab 1 UI component |
| `client/src/components/AppShell.tsx` | Added | Adds required navigation and Change action |
| `client/src/components/RouteGuard.tsx` | Added | Shows selector without a Requester context |
| `client/src/context/RequesterContext.tsx` | Added | Manages selected Requester state |
| `client/src/pages/RequesterSelection.tsx` | Added | Implements selector states and actions |
| `client/src/styles/zen-green.css` | Added | Adds required Zen Green UI tokens |
| `client/src/types.ts` | Added | Adds Lab 2 shared client types |
| `client/src/main.tsx` | Modified | Loads the Lab 2 application styles |
| `client/tests/lab-01/App.test.tsx` | Modified | Keeps the Lab 1 regression test valid |
| `client/tests/lab-02/RequesterSelection.test.tsx` | Added | Covers loading/success/empty/failure states |
| `client/tests/lab-02/RouteGuard.test.tsx` | Added | Covers UI-10 / AC-02 |
| `client/vite.config.ts` | Modified | Supports the test/client configuration |

### Contract and Evidence

| File | Change | Purpose |
|---|---|---|
| `.agents/skills/lab2-toktickit-build/SKILL.md` | Modified | Aligns the phase/Test-DD order |
| `docs/lab-02/tests.md` | Modified | Aligns test IDs and traceability |
| `docs/lab-02/ambiguity-log.md` | Added | Records five contract gaps and resolutions |
| `docs/lab-02/ai2.md` | Added | Records Phase 2 AI interaction |
| `docs/lab-02/filechange2.md` | Added | Original file-change report |
| `docs/lab-02/test2.md` | Added | Original Phase 2 test output |
| `docs/lab-02/whatihavedone2.md` | Added | Original Phase 2 work summary |

## 2. Current Uncommitted Correction Set

| File | Correction | Scope |
|---|---|---|
| `README.md` | Adds setup, run, test, build, and Playwright-phase notes | Cross-cutting docs |
| `client/src/api.ts` | Adds shared active-Requester fetch using `VITE_API_URL` | Phase 2 |
| `client/src/pages/RequesterSelection.tsx` | Uses shared API helper | Phase 2 |
| `client/tests/lab-02/RequesterSelection.test.tsx` | Uses `globalThis.fetch`; checks correct URL | Phase 2 |
| `client/tests/lab-02/RouteGuard.test.tsx` | Uses portable `globalThis.fetch` | Phase 2 |
| `client/tsconfig.json` | Adds `noEmit` for a clean build | Phase 2/build |
| `server/src/middleware/requireRequester.ts` | Matches the generic `401` contract message | Phase 2 |
| `server/tests/lab-02/requester-middleware.api.test.ts` | Removes hard-coded seeded IDs; checks exact errors | Phase 2 |
| `server/tests/lab-02/requesters.api.test.ts` | Removes hard-coded IDs; checks sort/data dynamically | Phase 2 |
| `docs/lab-02/specification.md` | Clarifies backend-issued Ticket Date requirement | Contract/Phase 3 |
| `docs/lab-02/tests.md` | Adds Ticket Date traceability and accurate collision-test wording | Contract |
| `docs/lab-02/ui-spec.md` | Adds Ticket Date to the Create Ticket field map | Contract/Phase 3 |
| `server/src/utils/ticketNumber.ts` | Correct collision retry, overflow, and error handling | Phase 1 correction |
| `server/tests/lab-02/ticket-number.unit.test.ts` | Adds realistic collision and negative-path tests | Phase 1 correction |

## 3. Audit Finding

The changes are technically compatible and the available suite passes, but the current correction
set mixes Phase 1, Phase 2, and cross-cutting documentation in one uncommitted working tree. This
does not cleanly satisfy the one-Issue/one-feature-branch workflow. Split the scopes before PR, or
record explicit reviewer approval for the combined scope.

## 4. Files Added by This Documentation Audit

- `docs/lab-02/pipelinenew.md`
- `docs/lab-02/whatihavedone2new.md`
- `docs/lab-02/filechange2new.md`
- `docs/lab-02/test2new.md`
- `docs/lab-02/ai2new.md`

The original evidence files were preserved unchanged so the student can compare them with the
audited drafts.

## 5. Contract and Skill Version 1.1.0 Update

The follow-up audit also modifies the canonical implementation guidance:

- `.agents/skills/lab2-toktickit-build/SKILL.md` - version metadata, common Issue/PR/evidence gates,
  corrected phase boundaries, complete planned-test routing, Playwright setup, and final-main gate;
- `docs/lab-02/specification.md` - contract version, AC-21, and expanded Product/Course Definition
  of Done;
- `docs/lab-02/tests.md` - actual client paths, complete missing API/UI/data cases, AC/BR mappings,
  and regression-evidence honesty rule;
- `docs/lab-02/api-spec.md` - version marker and complete attachment missing-resource matrix;
- `docs/lab-02/ui-spec.md` - matching contract version marker; and
- `docs/lab-02/ambiguity-log.md` - Findings E-H and the truthful local/unreviewed status.
