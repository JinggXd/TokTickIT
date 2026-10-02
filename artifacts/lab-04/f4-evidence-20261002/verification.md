# F4 verification — 2026-10-02

Tracking: [Issue #52](https://github.com/JinggXd/TokTickIT/issues/52). Base lab4-staging: 1ee7786cda440c03f830ca2a271d45ce9eb45864 (merged F3 PR #51).

Full-suite checkpoint: e8185c7b73100f723acd8ff78a9b40379aaec4f6. Final affected-flow checkpoint: fd842950e738479386272962284d5887e574c818. See [source-manifest.json](source-manifest.json) for the six changed source/test files and log hashes. Subsequent commits package documentation and evidence only.

| Verification | Result | Evidence |
|---|---|---|
| Server Vitest | 34 files, 349 passed, 0 failed/skipped; 52.68s | [server-integrated.log](server-integrated.log) |
| Client Vitest | 21 files, 115 passed, 0 failed/skipped; 22.90s | [client-integrated.log](client-integrated.log) |
| Server build | exit 0 | [server-build-integrated.log](server-build-integrated.log) |
| Client build | exit 0 | [client-build-integrated.log](client-build-integrated.log) |
| Full Playwright | 132 passed, 0 failed/skipped, all three viewports; 3.2m | [playwright-integrated.log](playwright-integrated.log), [derived summary](playwright-result-summary.json) |
| Final Actions Taken flow | 3 passed, 0 failed/skipped; 9.5s | [panels-playwright-verified.log](panels-playwright-verified.log), [raw latest result](panels-playwright-result.json) |
| MIG-L4-02 recovery | 10 tables / 154 rows, schema/sequence hashes and 10 files matched; 838ms | [recovery.json](recovery.json) |
| PERF-L4-01 | Staff p95 14.21ms; Requester 10.34ms; threshold 200ms | [performance.json](performance.json) |
| Visual inspection | 33 selected captures across 1280/768/375 CSS px | [manifest](screenshots-manifest.json), [checklist](../../../docs/lab-04/visual-checklist.md) |

## Execution environment and commands

Local disposable database toktickit_test_f2_review_1790784843569 was created solely for review tests and verified against its metadata allowlist and current_database() before each database run. Uploads use server/test-uploads/<runId>. Browser servers use ports 3001/5174 without reusing servers. Database suites ran sequentially. No shared/development database was reset or tested.

Runtime: D:/node.exe. Safe local wrapper commands: node tmp/f2-fixes-runner.mjs test (delegates to server/scripts/run-tests.mjs); npm --prefix client test -- --run; npm --prefix server run build; npm --prefix client run build; node tmp/f2-fixes-runner.mjs e2e; final targeted run adds e2e/lab-04/actions-taken-flow.spec.ts. The temporary Playwright config starts the freshly built server because the sandbox blocks tsx userInfo. The private wrapper reads existing credentials without logging them; it is not a published application dependency. README documents the repository's standard commands.

PG_DUMP_BIN and PG_RESTORE_BIN point to PostgreSQL 18.1 tools; the server is 16.14. The native recovery adapter and its limits are described in [F4-REVIEW.md](../../../docs/lab-04/F4-REVIEW.md). Restored database toktickit_test_restore_1790953346295_ae34e520 is retained for inspection; temporary archive/SQL/upload copies were cleaned by the isolated runner. No database dump, credentials or row contents are committed.

## Evidence scope and diagnostics

The full suite ran at the integrated checkpoint. Subsequent edits only change the affected browser test's capture method and wait for the modal's initial focus before checking Tab. The final targeted run verifies that flow at the final source checkpoint. The latest raw Playwright result represents the targeted three tests; the full 132 result is derived explicitly from its complete log.

An intermediate capture run exposed a race with the existing modal's deferred initial focus on Tablet. The test now waits for that focus before filling the modal; no assertion was removed or retried silently. Earlier evidence attempts detected concurrent source writes during recovery and native-tool/sandbox compatibility issues. Final successful runs retain the source-unchanged guard and all recovery comparisons.

Completed F4 planned checks: REG-L4-01/02, MIG-L4-02, PERF-L4-01, RESP-L4-01, A11Y-L4-01, plus inherited A11Y-L4-02 and E2E-L4-01/02/03. Peer approval, explicit Development-panel Issue link, reviewer merge and F5 release/submission are separate gates. F1 decision acceptance is not inferred from these results.
