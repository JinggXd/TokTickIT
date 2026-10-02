# F4 review packet — L4-P11–P12

**2026-10-02 requirement-audit update:** The recorded test runs still pass, but this is not full F4 closure. [Current audit](requirements-audit-F2-F3-F4.md) identifies raw unexpected Actions API 500 messages, incomplete Edit-modal/AA-contrast evidence, and pending peer review/Development-link/integration. Canonical AI Use and reviewer records plus phase-suffixed reports are added. No product source changed in this documentation audit; the full runs below are reused evidence.

Date: 2026-10-02. Branch: `codex/lab4-f4-verification`. Tracking: [Issue #52](https://github.com/JinggXd/TokTickIT/issues/52). Base: `lab4-staging` at `1ee7786cda440c03f830ca2a271d45ce9eb45864`, the reviewed merge of F3 PR #51 including its keyboard correction. Full-suite source checkpoint: `e8185c7b73100f723acd8ff78a9b40379aaec4f6`. Final affected-flow checkpoint: `fd842950e738479386272962284d5887e574c818` (capture and initial-focus test changes only; 3/3 passed).

F4 adds executable database/attachment recovery verification, Dashboard performance checks with the prescribed dataset and sample protocol, and browser modal keyboard/cancellation checks. README, test traceability and visual evidence describe how to repeat and assess verification. Product/API behavior remains the merged F3 baseline.

Pull request: [Draft PR #53](https://github.com/JinggXd/TokTickIT/pull/53), targeting `lab4-staging`. Explicit Development-panel Issue #52 linking remains unverified; keep the PR draft until that link and peer review gates are satisfied.

## Review by work package

| Package | Files / evidence | Reviewer checks |
|---|---|---|
| L4-P11 | `server/scripts/verify-recovery.mjs`, declaration, recovery/safety/performance tests | Only explicitly verified local disposable databases; a fresh empty restore database; mandatory row/schema/sequence and attachment byte comparisons; scoped fixture cleanup; real HTTP latency samples. |
| L4-P12 | `e2e/lab-04/actions-taken-flow.spec.ts`, README, `visual-checklist.md`, screenshot directory | No conditional/skipped assignment assertions; Log/Complete/Cancel focus traps; Escape dismissal and confirmed cancellation; responsive layouts and readable states across all three viewports. Keyboard home/card checks are inherited from reviewed F3. |

## Recovery proof — MIG-L4-02

The source is `toktickit_test_f2_review_1790784843569` on localhost:5433, previously created solely for review tests. The safe runner rechecks its recorded allowlist and `current_database()` before execution. Recovery independently verifies source/destination identities and a fresh empty destination. No existing database is dropped or overwritten.

`pg_dump` uses an exported repeatable-read snapshot. A custom archive is restored with PostgreSQL native tools, then every public table's complete row hash/count, column/constraint/index/enum definitions and sequence state are compared. Both active and soft-removed attachment fixtures pass actual backup-copy and restore-copy SHA-256 comparisons. The source is checked again to detect concurrent writers. Latest corrected results are in `artifacts/lab-04/f4-pr53-review-fix-20261002/recovery.json`. Active and soft-removed Attachment references and recorded file sizes are checked in the source and restored manifests using the dump snapshot; a missing file fails certification. The source file manifest is also checked again for concurrent changes.

This machine has PostgreSQL 18.1 tools and a 16.14 server. The restore list omits only creation of the already-present empty public schema. For this version combination, `pg_restore` generates SQL and `psql --single-transaction` executes it after removal of only the unsupported `SET transaction_timeout = 0`. Object/data entries remain present and all comparison assertions remain mandatory. Owner/ACL/global-role recovery is outside this proof.

The newly created restore database is retained for inspection. Archive/SQL/upload copies are temporary under the isolated run directory and are removed by the test runner. Evidence contains counts/hashes/tool versions, without credentials, database row contents or a dump.

## Performance proof — PERF-L4-01

The fixture adds exactly 500 tickets and 1,000 actions; existing test rows remain, so the total load is at least this size. Each Staff/Requester endpoint receives five warm-ups and 50 sequential Supertest HTTP samples, requiring status 200 and a metrics response. p95 uses the nearest-rank sample at `ceil(50 × 0.95) - 1`; all 50 samples are retained in `artifacts/lab-04/f4-pr53-review-fix-20261002/performance.json`.

Latest p95 after the review correction: Staff **54.63ms**, Requester **14.59ms**, both below **200ms**. These measurements include session and database work on this local test machine. They do not measure a remote network, concurrent production load or browser rendering. Fixtures/sessions are removed only for the uniquely created test users.

## Regression and visual proof

Final suite results, commands, source hashes and browser result are recorded in `artifacts/lab-04/f4-evidence-20261002/verification.md`. Visual inspection is recorded in `visual-checklist.md`, with selected screenshots archived under `artifacts/lab-04/screenshots/f4-20261002/`.

Database suites run sequentially with isolated uploads and API/client ports 3001/5174. An earlier recovery attempt correctly rejected concurrent source writes from a browser run; the final server-only run passes without weakening that guard. Earlier PostgreSQL compatibility and sandbox browser-launch failures are diagnostic history; final successful logs certify the integrated source checkpoint, with the final affected Actions Taken flow separately verified after capture/initial-focus changes. An intermediate Tablet failure exposed a race with deferred initial modal focus; waiting for actual initial focus resolves it while retaining all assertions.

## Closure gates

PHASES previously required the entire Product Definition of Done at P12, while specification §10 includes a submission PDF assigned to F5/P14. The phase gate is clarified to cover F4 technical/visual checks; the overall release/submission DoD remains open for F5. D01–D13 decision acceptance is a separate F1 record and is not inferred from tests.

F3 PR #51 is merged. F4 requires peer review, explicit Development-panel linking of Issue #52 and reviewer merge into `lab4-staging`. Release to `main` and the final submission PDF remain F5 work.


## PR #53 review correction

The recovery finding is fixed at `bde66e99e6bfeece12835a4beef85badcc0df6ba`: three new source regressions fail before the fix, and all five recovery scenarios plus safety pass afterward. Full server **353/353**, client **115/115**, Playwright **132/132**, both builds passed at this checkpoint. See [latest verification](../../artifacts/lab-04/f4-pr53-review-fix-20261002/verification.md). Earlier source checkpoints above are historical; the correction evidence supersedes their recovery certification.
