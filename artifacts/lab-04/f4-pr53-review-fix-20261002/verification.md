# F4 PR #53 review correction — 2026-10-02

Source checkpoint: bde66e99e6bfeece12835a4beef85badcc0df6ba. [PR #53](https://github.com/JinggXd/TokTickIT/pull/53), Issue #52. These results supersede the earlier F4 recovery certification; historical logs remain preserved.

The previous implementation scanned existing upload files without checking Attachment references. A real disposable reproduction returned filesMatched=true with one active Attachment and zero files. The fix queries storedFileName/fileSize for every active and soft-removed Attachment inside the same repeatable-read snapshot as pg_dump. Every reference must have a file of the recorded byte size in the source and restored upload manifests. All upload byte hashes still match; the source upload manifest is checked again for changes during verification.

| Check | Result | Evidence |
|---|---|---|
| Red regressions before fix | 3 failed / 2 passed: active missing, soft-removed missing and wrong size resolved incorrectly; lost restored copy was already rejected | [red.log](red.log) |
| Targeted recovery + safety after fix | 6/6 passed | [green.log](green.log) |
| Full server | 34 files, 353/353 passed, 0 failed/skipped; 44.09s | [server-full.log](server-full.log) |
| Full client | 21 files, 115/115 passed, 0 failed/skipped; 15.86s | [client-full.log](client-full.log) |
| Full Playwright | 132/132 passed, 0 failed/skipped, Desktop/Tablet/Mobile | [playwright-full.log](playwright-full.log), [raw result](playwright-result.json) |
| Builds | Server and client exit 0 | [build.log](build.log), [client-build.log](client-build.log) |
| Recovery | 10 tables / 162 rows and 10 files matched; all 2 active/soft-removed references checked before/after; 685ms | [recovery.json](recovery.json) |
| Dashboard p95 | Staff 54.63ms / Requester 14.59ms, both <200ms, all 50 samples retained | [performance.json](performance.json) |

Tests use the previously created and reverified local disposable toktickit_test_f2_review_1790784843569, run-specific uploads and isolated browser ports 3001/5174. Server database tests completed before browser tests started. Native PostgreSQL 18.1 tools against server 16.14 use the existing compatibility adapter. Positive restore database toktickit_test_restore_1790956729149_33e8e226 is retained for inspection. A separate fault-injection restore destination is also retained; scoped source fixtures/proof directories are cleaned. No existing database reset/drop, new dependency or product/API behavior change.

The post-restore regression omits only its fixture's restored copy via a scoped fs.copyFile spy while native database restore still runs, proving files cannot disappear unnoticed after backup. Three source regressions prove missing active/soft-removed files and inconsistent file sizes fail certification. No assertions were disabled. [Manifest](source-manifest.json) records code/log hashes. The previously inspected 33 selected visual captures remain valid for unchanged UI; this run repeats the full browser suite at the corrected checkpoint.

Peer approval, explicit Development-panel linking and reviewer merge remain pending. F5 release/submission and F1 decision acceptance are separate gates.
