# F3 review packet — L4-P07–P10

Date: 2026-10-02. Branch: `codex/lab4-f3-dashboard`. Base: `lab4-staging` at `8bbd1aa9c975183279c43fe64d47330f9bd94293` (merged F2 PR #49). Tracking: [Issue #50](https://github.com/JinggXd/TokTickIT/issues/50), [PR #51](https://github.com/JinggXd/TokTickIT/pull/51).

F3 adds Requester, IT Staff and Administrator dashboards with server-calculated metrics, limited recent items and exact ticket-list drill-down filters. Login/password-change returns to each role's dashboard. Browser Back, reload, query-only changes and Clear Filters preserve the intended navigation. Administrators can read the queue and open their existing detail route; ticket workflow mutations remain Staff-only while Lab 4 action controls remain available to Admin.

## Review by work package

| Package | Main files | What to verify |
|---|---|---|
| L4-P07 | `server/src/routes/dashboard.ts`, `utils/dashboardFilters.ts`, requester/staff list routes | Requester ownership, personal performer identity, UTC rolling seven-day boundary, status intersections, stable top-five ordering, safe DTOs and role guards. Repeatable-read transactions keep each response's counts/feed consistent. |
| L4-P08 | `client/src/pages/Dashboard.tsx`, `App.tsx`, `MyTickets.tsx` | Four Requester card URLs match list API filters; zero, loading, error/Retry and account-switch behavior. |
| L4-P09 | shared dashboard, `AppShell.tsx`, `StaffTicketQueue.tsx` | Staff/Admin metrics, all eight status counts, three open-ticket priority counts, personal action feed, Admin user summary and correct detail routes. |
| L4-P10 | six changes in `F3-CARRYOVER.md`; API/component/E2E regressions | Retry/idempotency, assignee lookup feedback, strict inputs, nullable notes, success feedback, session isolation and concurrency. |

## Contract clarifications

- `My Actions Taken` uses the existing lifetime completed count and five-item performer feed. UI §3.2 and API §4.3 provide no all-actions page/endpoint. FR-17 now explicitly limits count-to-list parity to ticket-count cards. This is the minimal proposed resolution of that ambiguity; no additional business endpoint was invented.
- The feed exposes description/status/date exactly as the API projection specifies; outcome/result remains available in Ticket Detail.
- Priority breakdown counts open tickets per D05. Its sum equals Total Open Queue; status breakdown still includes all queue tickets. The API example was corrected so its open-status sum matches its declared total.
- Lab 3 regression expectations updated only for intentional Lab 4 changes: role dashboard landing, Admin queue read access/navigation. Ownership, session invalidation, attachment lifecycle and Staff-only workflow checks remain covered.

## Validation

Final evidence and results are recorded in `artifacts/lab-04/f3-evidence-20261002/verification.md` after the integrated verification run. Tests use the verified local disposable database `toktickit_test_f2_review_1790784843569` and run-specific upload directories, API port 3001 and client port 5174. Production/development data is not used.

New tests were run before implementation: datetime cases failed on coercion/invalid formats, UUID fallback failed the UUIDv4 assertion, dashboard API calls failed with 404 and component/routing tests failed because their screens/routes were absent. A subsequent priority regression failed when closed/resolved tickets were incorrectly included, then the query was corrected to D05's open scope.

PR #51 targets `lab4-staging`. GitHub confirmed it Open, Ready for review and not merged on 2026-10-02 before the keyboard correction. The last inspected Development panel showed **None yet**; its explicit Issue #50 link has not been verified. A signed-in repository member must link Issue #50 using the Development gear and verify the closing-issues sidebar. The prior approval predates the keyboard correction, so the reviewer must check the new commit before merging. No reviewer was messaged or review requested automatically; no merge was performed.

## Keyboard review correction — 2026-10-02

The dashboard home brand previously used a clickable span and could not receive keyboard focus. Source checkpoint `70f3808` replaces it with a native role-specific link, preserves modified-click navigation, and adds a visible 3px Zen Green surface focus outline. Three role component cases were red before the fix. New browser cases exercise home/card navigation with Enter and visible focus at all three viewports. Updated regression results and source hashes are recorded in `artifacts/lab-04/f3-pr51-review-fix-20261002/verification.md`. This correction is part of PR #51; F4 backup/restore and performance code remain separate.

Peer review/Development-panel linking and merge are separate from automated verification. F4 backup/restore and performance checks, F5 release/submission, and historical F1 Proposed decision records are not claimed complete by this packet.
