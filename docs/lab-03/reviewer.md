# Lab 3 Peer Review Record

Evidence captured from the public GitHub API on 2026-09-20. Repository: https://github.com/JinggXd/TokTickIT. This record separates formal reviews, ordinary comments and developer-reported test results. No comment or approval was posted by this documentation task.

## 1. Incoming review and integration

| PR | Base | Reviewer | Formal review | Merge UTC | Merger |
|---|---|---|---|---|---|
| [#35](https://github.com/JinggXd/TokTickIT/pull/35) | lab3-staging | yuminnini | APPROVED | 2026-09-16T14:24:15Z | yuminnini |
| [#37](https://github.com/JinggXd/TokTickIT/pull/37) | lab3-staging | yuminnini | APPROVED | 2026-09-17T11:18:33Z | yuminnini |
| [#39](https://github.com/JinggXd/TokTickIT/pull/39) | lab3-staging | yuminnini | APPROVED | 2026-09-18T12:05:40Z | yuminnini |
| [#41](https://github.com/JinggXd/TokTickIT/pull/41) | lab3-staging | yuminnini | APPROVED | 2026-09-18T15:45:50Z | yuminnini |
| [#43](https://github.com/JinggXd/TokTickIT/pull/43) | lab3-staging | b4ymin | APPROVED | 2026-09-20T11:02:20Z | b4ymin |
| [#45](https://github.com/JinggXd/TokTickIT/pull/45) | main | yuminnini | APPROVED | 2026-09-20T11:32:03Z | yuminnini |

### PR 35
The reviewer found AC-01-56 linked to the test plan, session identity consistent with Lab 2 ownership, and role separation aligned across the contract.
Review: https://github.com/JinggXd/TokTickIT/pull/35#pullrequestreview-5223975129
Submitted: 2026-09-16T14:23:34Z; reviewed commit: 11307f3cbe2e2d43df58d33fe4801dc6f4ae1fe8
Author response: no separate response comment was returned by the issue-comments endpoint. Do not invent a response.

### PR 37
The reviewer confirmed shared API/cleanup helpers, run-contained cleanup with propagated errors, real worker environment checks and probe-only server skipping. The review reports 24 harness tests and the server build passing.
Review: https://github.com/JinggXd/TokTickIT/pull/37#pullrequestreview-5234857309
Submitted: 2026-09-17T11:15:33Z; reviewed commit: 157b7804b56ba6f7556f2993dbea8b5832bea125
Author response: no separate response comment was returned by the issue-comments endpoint. Do not invent a response.

### PR 39
The reviewer covered migration/seed, legacy-account provisioning, auth/session/RBAC and Login/Change Password. The approval records corrections to atomic provisioning, cleanup, timers, mobile identity and viewport-isolated screenshots.
Review: https://github.com/JinggXd/TokTickIT/pull/39#pullrequestreview-5247564417
Submitted: 2026-09-18T12:04:55Z; reviewed commit: 081d3e7fbed4d704e174ff659f1e1ec43904577f
Author response: no separate response comment was returned by the issue-comments endpoint. Do not invent a response.

### PR 41
The reviewer covered Requester regression, Queue, claim/reassign, priority/status concurrency and communications. The approval explicitly attributes test counts to the developer; it does not verify the later local commit 7038238.
Review: https://github.com/JinggXd/TokTickIT/pull/41#pullrequestreview-5249703626
Submitted: 2026-09-18T15:42:48Z; reviewed commit: 78bf7cf092b399749d2990a34828d5bb7d13cb2d
Author response by JinggXd: "Thank you".
Response: https://github.com/JinggXd/TokTickIT/pull/41#issuecomment-5732454846

### PR 43
The reviewer reviewed Administrator user management, duplicate-email mapping, last-active-admin concurrency locking, Unicode password length validation, and full E2E verification.
PR: https://github.com/JinggXd/TokTickIT/pull/43
Merged by: b4ymin at 2026-09-20T11:02:20Z; merged commit: df9ad815c558ea2d1b5e8ac2c2991581afb2bf8b.

### PR 45 (Release: lab3-staging -> main)
The reviewer verified complete integration of Phases F1 through F4, 56 Acceptance Criteria satisfied, 100% test pass rate across Server (263/263), Client (82/82), and Playwright E2E (108/108) with zero skipped tests.
PR: https://github.com/JinggXd/TokTickIT/pull/45
Merged by: yuminnini at 2026-09-20T11:32:03Z; merged commit: baad45e09272d665bc0cf765236c456edcf0eff7.

## 2. Outgoing review given to a peer
Peer repository: https://github.com/yuminnini/toktickit. PR #38: https://github.com/yuminnini/toktickit/pull/38. Author: yuminnini. Reviewer: JinggXd.
Formal review on 2026-09-17: CHANGES_REQUESTED. The later comment says no further corrections; it is an ordinary comment, not a formal APPROVED event.
Formal review: https://github.com/yuminnini/toktickit/pull/38#pullrequestreview-5233441410

| Round | What JinggXd reviewed | What yuminnini replied | Evidence |
|---|---|---|---|
| 1 | Guard not on the real test entry path; E2E still targeted dev port; unsafe upload/database matching; premature Verified status. | Reported startup guard wiring, a shared test endpoint, tighter upload/database validation and a return to In progress. | [Review](https://github.com/yuminnini/toktickit/pull/38#pullrequestreview-5233441410); [Response](https://github.com/yuminnini/toktickit/pull/38#issuecomment-5712060272) |
| 2 | API variable scope; checks after server startup/import; junction traversal; swallowed cleanup failures. | Reported module-level endpoint, config-time environment validation, realpath checks, pre-import validation and propagated cleanup errors. | [Review](https://github.com/yuminnini/toktickit/pull/38#issuecomment-5712380137); [Response](https://github.com/yuminnini/toktickit/pull/38#issuecomment-5712419475) |
| 3 | Fallback environment propagation and cleanup integration still needed review. | Reported another correction round and harness/server/client test results. | [Review](https://github.com/yuminnini/toktickit/pull/38#issuecomment-5715904429); [Response](https://github.com/yuminnini/toktickit/pull/38#issuecomment-5716015853) |
| 4 | Cleanup failure could still pass; a UI failure after backend creation could leave unregistered resources. | Reported error aggregation, response listeners, tracked pending registrations and regression tests. | [Review](https://github.com/yuminnini/toktickit/pull/38#issuecomment-5716087324); [Response](https://github.com/yuminnini/toktickit/pull/38#issuecomment-5716549098) |
| 5 | Response-body read errors were still swallowed, losing IDs while teardown succeeded. | Reported ResponseRegistrationTracker, afterEach registration waits and teardown errors when body reading fails. | [Review](https://github.com/yuminnini/toktickit/pull/38#issuecomment-5716913076); [Response](https://github.com/yuminnini/toktickit/pull/38#issuecomment-5717061501) |

Final comment by JinggXd: "ตรวจแล้วไม่มีข้อแก้ไขแล้วครับ".
https://github.com/yuminnini/toktickit/pull/38#issuecomment-5717302336
Merge: 2026-09-17T15:52:44Z; merger: JinggXd. This is a peer-authored PR merged by its reviewer, not a self-merge.

## 3. Pending final evidence
- F4 formal review/approval and reviewer merge.
- Push/local-source reconciliation for 7038238 before requesting review of that state.
- Release PR from lab3-staging to main, review, actual merge and final-main test outputs.
- Actual Development-panel links and final Project/Kanban Done evidence; do not infer these from PR text or Issue closure.

Raw API snapshots: artifacts/lab-03/f5-evidence-20260920/.
