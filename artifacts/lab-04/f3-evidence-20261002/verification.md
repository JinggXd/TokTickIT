# F3 integrated verification — 2026-10-02

Source checkpoint: `88cb104357b245f9091064f2e16e9b8666f6af5d` on `codex/lab4-f3-dashboard`, based on F2 merge `8bbd1aa9c975183279c43fe64d47330f9bd94293`. The following evidence/documentation commit does not change product or test code. `source-manifest.json` records SHA-256 hashes of all 29 changed source/test files.

| Check | Result | Evidence |
|---|---|---|
| Server Vitest, full configured suite | 31 files; **345 passed**, 0 failed/skipped; 28.95s | `server.log` |
| Client Vitest, full configured suite | 20 files; **112 passed**, 0 failed/skipped; 9.42s | `client.log` |
| Server TypeScript build | Exit 0 | `server-build.log` |
| Client TypeScript + Vite build | Exit 0 | `client-build.log` |
| Playwright, full configured suite | **129 passed**, 0 failed/skipped; 3.3m, Desktop 1280 / Tablet 768 / Mobile 375 | `playwright.log`, `playwright-result.json` |

The browser suite includes 15 new Dashboard cases (three roles, all four ticket-count drill-downs with API count parity, URL reload/Back, empty/no-results/Clear Filters, account switching and network Retry), the Actions Taken lifecycle and resolution gate on all viewports, and existing requester/auth/staff/user-administration regression flows. Admin can log actions while its ticket-operations panel remains absent; status mutation is still rejected by the API.

## Test environment and commands

- Verified local disposable PostgreSQL: `toktickit_test_f2_review_1790784843569`, localhost port 5433. Created solely for review tests in the earlier run; the runner rechecked `current_database()` against its recorded allowlist before every invocation. No development/shared database was used.
- Tests set `DATABASE_URL_TEST` only through the local safe runner; run-specific upload directories under `server/test-uploads/`, API 3001/client 5174, no reused application servers.
- Server: `node tmp/f2-fixes-runner.mjs test` (delegates to `server/scripts/run-tests.mjs`).
- Client: `npm --prefix client test`; builds: `npm --prefix server run build`, `npm --prefix client run build`.
- Browser: `SCREENSHOT_DIR=artifacts/lab-03/screenshots/f3-20261002-final node tmp/f2-fixes-runner.mjs e2e`. Temporary config uses the freshly compiled server because tsx's Windows userInfo lookup is unavailable in the sandbox. The suite's original three projects and safety gates are preserved.
- Nine final dashboard captures copied to `artifacts/lab-04/screenshots/f3-20261002/{desktop,tablet,mobile}/f3-{requester,it_staff,administrator}.png`. Mobile menu wraps instead of clipping. Automated root overflow assertions pass.

## Red/green and scope

- Carry-over date tests: expected coercion/non-ISO failures, then 59/59 targeted server tests passed. UUID fallback: expected format failure, then 15/15 ActionsTaken component tests passed.
- Dashboard APIs: eight tests initially failed because routes were absent; final metric/auth/filter tests all pass. Component/routing tests failed before screens/routes existed, then all eight pass.
- Priority regression initially failed (35 counted versus 23 open fixtures); query and independent SQL expectation now use the open set specified by D05.
- First broad browser run had six failures from an obsolete Admin navigation expectation and overriding the harness's expected Lab 3 screenshot root. The final run fixes the intentional Lab 4 expectation and uses the expected root: **129/129**. No assertions were skipped or disabled to pass.
- All six F2 review follow-ups pass in this integrated tree (`API-L4-22j–22m`, `UNIT-L4-01b`, `UI-L4-06b`, `UI-L4-16–18`). Dashboard AC-18–24 and account/responsive AC-29–30 have API/component/browser evidence; existing accessibility/confidentiality/concurrency tests also pass.

F4's disposable backup/restore (`MIG-L4-02`) and dedicated performance smoke dataset are **not run in F3**. Peer approval, explicit Development-panel Issue linking, merge, release to main and final submission remain separate gates. Historical F1 Proposed decision status is not changed by these test results.
