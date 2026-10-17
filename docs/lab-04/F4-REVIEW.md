# F4 review packet — L4-P11–P12

**2026-10-17 audit-remediation update:** Product/test findings `AUD-01`, `AUD-02`, and `AUD-08` from [requirements-audit-F2-F3-F4.md](requirements-audit-F2-F3-F4.md) are now **resolved and verified**:
- **`AUD-01` (`API-L4-34`)**: `server/src/routes/actions.ts` sanitizes unexpected runtime errors and `status >= 500` errors via `sendInternalError()`, returning generic `{ error: "INTERNAL_ERROR", message: "Unable to process actions request." }`. Verified by 10 fault-injection tests across all 5 endpoints (`52/52` passed in `server/tests/lab-04/actions-taken.api.test.ts`).
- **`AUD-02` (`A11Y-L4-03`)**: Edit Pending Action modal (`role="dialog"`, `aria-modal="true"`) verified for initial focus, forward/reverse `Tab` wrapping, `Escape` dismissal, focus restoration to the invoking Edit button, and 3-viewport screenshot captures (`modal-edit.png` across Desktop 1280×800, Tablet 768×1024, Mobile 375×812 — bringing the archived F4 visual set to **36 captures**).
- **`AUD-08` (`STYLE-L4-03`)**: Unselected Pending Task button uses `.btn-action-pending` (`#92400E` text/border on `#FFFFFF`, `#FEF3C7` hover/active, 3px `#16A34A` focus ring), achieving **8.26:1** contrast on white (exceeding WCAG 2.1 AA 4.5:1). Verified in both `client/tests/lab-04/ZenGreenTokens.test.tsx` (`3/3` passed) and `e2e/lab-04/actions-taken-flow.spec.ts` (`3/3` viewports passed).

Date: 2026-10-17. Branch: `codex/lab4-f4-verification`. Tracking: [Issue #52](https://github.com/JinggXd/TokTickIT/issues/52). Base: `lab4-staging` at `1ee7786cda440c03f830ca2a271d45ce9eb45864`, the reviewed merge of F3 PR #51 including its keyboard correction.

F4 adds executable database/attachment recovery verification, Dashboard performance checks with the prescribed dataset and sample protocol, safe 500 error sanitization on Actions Taken routes, WCAG AA contrast hardening for `.btn-action-pending`, and browser modal keyboard/cancellation/visual checks across Log, Edit, Complete, and Cancel modals.

Pull request: [Draft PR #53](https://github.com/JinggXd/TokTickIT/pull/53), targeting `lab4-staging`. Explicit Development-panel Issue #52 linking and peer review remain the human workflow gates before merging into `lab4-staging`.

## Review by work package

| Package | Files / evidence | Reviewer checks |
|---|---|---|
| L4-P11 | `server/scripts/verify-recovery.mjs`, `server/src/routes/actions.ts`, `server/tests/lab-04/actions-taken.api.test.ts`, recovery/safety/performance tests | Only explicitly verified local disposable databases; a fresh empty restore database; mandatory row/schema/sequence and attachment byte comparisons; scoped fixture cleanup; real HTTP latency samples; sanitized 500 responses (`API-L4-34`). |
| L4-P12 | `client/src/components/ActionsTakenSection.tsx`, `client/src/styles/zen-green.css`, `e2e/lab-04/actions-taken-flow.spec.ts`, `client/tests/lab-04/ActionsTaken.test.tsx`, `client/tests/lab-04/ZenGreenTokens.test.tsx`, README, `visual-checklist.md`, screenshot directory (36 captures) | No conditional/skipped assignment assertions; Log/Edit/Complete/Cancel focus traps and trigger focus restoration (`A11Y-L4-01..03`); `.btn-action-pending` contrast ≥ 4.5:1 (`STYLE-L4-03`); Escape dismissal and confirmed cancellation; responsive layouts and readable states across all three viewports. |

## Recovery proof — MIG-L4-02

The source is `toktickit_test_f2_review_1790784843569` on localhost:5433, previously created solely for review tests. The safe runner rechecks its recorded allowlist and `current_database()` before execution. Recovery independently verifies source/destination identities and a fresh empty destination. No existing database is dropped or overwritten.

`pg_dump` uses an exported repeatable-read snapshot. A custom archive is restored with PostgreSQL native tools, then every public table's complete row hash/count, column/constraint/index/enum definitions and sequence state are compared. Both active and soft-removed attachment fixtures pass actual backup-copy and restore-copy SHA-256 comparisons. The source is checked again to detect concurrent writers. Latest corrected results are in `artifacts/lab-04/f4-pr53-review-fix-20261002/recovery.json`. Active and soft-removed Attachment references and recorded file sizes are checked in the source and restored manifests using the dump snapshot; a missing file fails certification. The source file manifest is also checked again for concurrent changes.

This machine has PostgreSQL 18.1 tools and a 16.14 server. The restore list omits only creation of the already-present empty public schema. For this version combination, `pg_restore` generates SQL and `psql --single-transaction` executes it after removal of only the unsupported `SET transaction_timeout = 0`. Object/data entries remain present and all comparison assertions remain mandatory. Owner/ACL/global-role recovery is outside this proof.

The newly created restore database is retained for inspection. Archive/SQL/upload copies are temporary under the isolated run directory and are removed by the test runner. Evidence contains counts/hashes/tool versions, without credentials, database row contents or a dump.

## Performance proof — PERF-L4-01

The fixture adds exactly 500 tickets and 1,000 actions; existing test rows remain, so the total load is at least this size. Each Staff/Requester endpoint receives five warm-ups and 50 sequential Supertest HTTP samples, requiring status 200 and a metrics response. p95 uses the nearest-rank sample at `ceil(50 × 0.95) - 1`; all 50 samples are retained in `artifacts/lab-04/f4-pr53-review-fix-20261002/performance.json`.

Latest p95 after the review correction: Staff **54.63ms**, Requester **14.59ms**, both below **200ms**. These measurements include session and database work on this local test machine. They do not measure a remote network, concurrent production load or browser rendering. Fixtures/sessions are removed only for the uniquely created test users.

## Regression and visual proof

Final suite results, commands, source hashes and browser result are recorded in `artifacts/lab-04/f4-evidence-20261002/verification.md` and updated with the `AUD-01`/`AUD-02`/`AUD-08` remediation suites (`52/52` in `actions-taken.api.test.ts`, `117/117` in client tests, `3/3` viewports in `actions-taken-flow.spec.ts`, builds exit 0). Visual inspection is recorded in `visual-checklist.md`, with **36** screenshots archived under `artifacts/lab-04/screenshots/f4-20261002/` and indexed in `artifacts/lab-04/f4-evidence-20261002/screenshots-manifest.json`.

## Closure gates

PHASES clarifies the P12 gate to cover F4 technical/visual checks; the overall release/submission DoD remains open for F5 (L4-P13–P14).

F3 PR #51 is merged. All technical code, test, visual, and accessibility findings for F4 (`AUD-01`, `AUD-02`, `AUD-08`) are resolved. F4 now requires human peer review, explicit Development-panel linking of Issue #52, and reviewer merge into `lab4-staging`. Release to `main` and the final submission PDF remain F5 work.
