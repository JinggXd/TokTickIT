# F3 PR #51 keyboard correction — 2026-10-02

Source checkpoint: `70f3808ae53552795f81b74df77f92828d7b2555`. All four changed source/test files match this commit; their SHA-256 hashes are in source-manifest.json. Subsequent commits update documentation/evidence only.

| Check | Final result | Evidence |
|---|---|---|
| Server full suite | 31 files, 345 passed, zero failed/skipped | server.log |
| Client full suite | 21 files, 115 passed, zero failed/skipped | client.log |
| Server TypeScript build | Exit 0 | server-build.log |
| Client TypeScript/Vite build | Exit 0 | client-build.log |
| Full Playwright | 132 passed, zero failed/skipped; Desktop 1280, Tablet 768, Mobile 375 | playwright.log, playwright-result.json |

The previous clickable home brand could not receive keyboard focus. Three new role component tests failed before implementation because no native home link existed (red.log). The fix uses role-specific anchor hrefs, preserves modified-click behavior and adds a visible 3px focus outline using the existing Zen Green surface token. A11Y-L4-02 browser tests use Enter for home/card navigation and assert focused controls and outline width across all three viewports.

Verification ran in a separate checkout of codex/lab4-f3-dashboard, isolated from F4 product/tests. Commands: npm --prefix server run build; npm --prefix client run build; node D:/toktickit/client/node_modules/vitest/vitest.mjs run (cwd: the separate checkout's client directory); node tmp/f2-fixes-runner.mjs test; SCREENSHOT_DIR=artifacts/lab-03/screenshots/f3-pr51-keyboard node tmp/f2-fixes-runner.mjs e2e --reporter=line. The existing temporary compiled-server adapter was used because tsx cannot read Windows userInfo in the sandbox; all original Playwright projects and safety guards were retained.

The runner verified current_database() as toktickit_test_f2_review_1790784843569 (local disposable PostgreSQL, localhost:5433) before each database suite. Uploads use isolated run directories, API port 3001/client 5174, without reused application servers. No dependency, migration, shared-data reset or merge was added.

Earlier approval predates this correction. PR #51 requires reviewer verification of the new commit, explicit Development-panel linking of Issue #50 and reviewer merge. This evidence does not close F1 decisions, F4 backup/restore/performance, or F5 release/submission.
