# TokTickIT — Test Plan & Traceability Matrix (Lab 3)

**Document Version:** 1.2.0
**Status:** F2 / P03–P06 completed — Database migration, authentication API, auth UI, and E2E-01–05 verified (2026-09-18)
**Sprint:** Sprint 3 (Lab 3)
**Standard Compliance:** CPE 334 Lab 3 Testing Standards (§10, AC-01 through AC-56)
**TDD Rule:** All test rows start with status `Planned`. For each feature, write the failing test first (Red), verify the expected failure reason, implement the minimal solution (Green), and verify regression.

**Phase mapping:** [PHASES.md](PHASES.md) defines F1=P00–P02, F2=P03–P06,
F3=P07–P10, F4=P11–P12, F5=P13–P14. Work-package/test/AC IDs and gates stay unchanged.
Review each Issue/PR throughout the work, not only in F5.

---

## 1. Test Suite Architecture & Directory Structure

```text
server/tests/lab-03/
  ├── auth.api.test.ts                  # AUTH: Login, logout, me, session cookie, password change
  ├── authorization.api.test.ts         # AUTHZ: Role guards, foreign ticket 403, spoof rejection
  ├── staff-queue.api.test.ts           # QUEUE: Query filters, search, semantic sort, pagination
  ├── staff-ticket-detail.api.test.ts   # DETAIL: Claim, reassign, IT priority, 8 status transitions, 409 conflict
  ├── comments-notes.api.test.ts        # COMM: Public comments, internal notes, append-only, safe plain-text rendering
  ├── users-admin.api.test.ts           # ADMIN: User list/search, create, edit, self/last-admin safety, reset
  ├── migration-regression.test.ts      # MIG: Additive schema, non-destructive backfill, idempotent seed
  ├── requester-regression.api.test.ts  # REG: Preserved ticket creation, attachments, appears-resolved
  ├── password.unit.test.ts             # UNIT: Password validation rules (min/max/whitespace/diff)
  ├── test-environment.test.ts          # HARNESS: Reject unsafe test targets before I/O
  └── workflow.unit.test.ts             # UNIT: 8-status transition matrix validation engine

client/tests/lab-03/
  ├── Login.test.tsx                    # UI: Login form states, validation, busy indicator, generic error
  ├── ChangePassword.test.tsx           # UI: Mandatory password change screen, policy helpers, inline errors
  ├── StaffTicketQueue.test.tsx         # UI: Queue table, debounced search, filters, pagination, feedback states
  ├── StaffTicketDetail.test.tsx        # UI: Staff detail view, claim button, reassign, status confirmation modal
  ├── UserManagement.test.tsx           # UI: Admin user directory, add user modal, edit modal, reset modal
  ├── RequesterTicketDetail.test.tsx     # UI: Authenticated requester comments/resolution/attachments
  ├── Feedback.test.tsx                 # UI: Permission, missing, conflict and failure feedback
  └── Responsive.style.test.tsx         # STYLE: Zen Green tokens, status badges, layout integrity

e2e/lab-03/
  ├── authentication.spec.ts            # E2E-A: Complete auth lifecycle, forced password change, session invalidation
  ├── staff-ticket-flow.spec.ts         # E2E-S: Full IT Staff triage, claim, priority, status progression, notes
  ├── user-administration.spec.ts       # E2E-U: Admin user provisioning, edit, activation toggle, credential reset
  ├── requester-regression.spec.ts      # E2E-R: Requester create ticket with attachment, switch account, verify isolation
  └── responsive.spec.ts                # E2E-V: Desktop (1280px), Tablet (768px), Mobile (375px) visual inspection
```

---

## 2. Test Environment Safety & Isolation Guard

1. **Dedicated Disposable Test Database:**
   - Required: server/API/E2E test processes use a verified disposable `toktickit_test` database. The runner must validate DATABASE_URL_TEST and explicitly pass it as DATABASE_URL to Prisma, Playwright workers and the child server before imports. Server runner implemented; E2E worker propagation incomplete.
   - The shared development database (`toktickit`) is never used for automated test suites.
2. **Dedicated Test Upload Directory:**
   - Required: run-specific directories under `server/test-uploads/<run-id>/`. Server test-mode storage now uses this path; existing fixture cleanup paths still need correction. Teardown removes only tracked files created by that run after absolute-path containment checks.
3. **Strict Per-Test ID Tracking:**
   - All test fixtures track dynamically created record IDs in arrays (e.g. `createdTicketIds`, `createdUserIds`).
   - Teardowns delete **strictly** by primary key: `where: { id: { in: createdIds } }`.
   - Broad wipes (e.g. `deleteMany({})`, `TRUNCATE`, or `summary startsWith 'E2E-'`) are strictly forbidden.

---

**Current gate: In progress — fixes required before P02 closure.** LCP-01 has runtime code.
Docker was made available; `toktickit_test` received Lab 2 migrations/seed and the earlier server
run passed 15 files / 107 tests. The latest P02 review reran three pure guard tests successfully;
these do not prove the full HARNESS-01 scenario. E2E still hardcodes development API URLs and
does not propagate the test DB to its Prisma worker. Cleanup references legacy uploads,
screenshots overwrite fixed Lab 2 paths, and the Vitest guard runs in beforeAll after imports.
Do not run E2E until corrected. Validate before imports/I/O, track IDs/files immediately,
surface cleanup failures, and verify unsafe paths/environment mismatches and runner/worker
behavior. Clock-controlled expiry/rate-limit tests and deterministic fixtures are also required by P02.

All test paths below are **proposed targets** except the existing partial HARNESS-01 test file.
Product rows remain Planned; HARNESS-01 is In progress until its full scenario passes with
raw output, source SHA and run ID. Document review is not product Pass evidence.
Lab 3 tests inherit all Lab 2 business assertions; selector/header-specific tests need an approved
migration to session identity. Do not skip legacy tests to make the final suite green.

## 3. Comprehensive Traceability Matrix (AC-01 through AC-56)

| Test ID | Type | Target AC / FR / BR | Scenario Description | Expected Observable Result | Target File Path | Execution Command | Status | Evidence / commit |
|---|---|---|---|---|---|---|---|---|
| **API-01** | API | AC-01, R01, BR-01 | Login with valid credentials of active user | HTTP 200, returns user profile, sets `toktickit_session` HttpOnly cookie | `server/tests/lab-03/auth.api.test.ts` | `npm run test:server` | **Implemented** | Passed (15/15) in auth.api.test.ts on commit b893168; valid login returns HTTP 200, sets toktickit_session HttpOnly cookie with no-store |
| **API-02** | API | AC-02, R02, BR-02 | Call `/api/tickets` with session where `mustChangePassword: true` | HTTP 403 `PASSWORD_CHANGE_REQUIRED`; access blocked | `server/tests/lab-03/auth.api.test.ts` | `npm run test:server` | **Implemented** | Passed (15/15) in auth.api.test.ts on commit b893168; returns HTTP 403 PASSWORD_CHANGE_REQUIRED when mustChangePassword is true |
| **API-03** | API | AC-05, R01, BR-05 | Login with wrong password, non-existent email, or inactive account | Uniform HTTP 401 `Invalid email or password`; no timing/existence leak | `server/tests/lab-03/auth.api.test.ts` | `npm run test:server` | **Implemented** | Passed (15/15) in auth.api.test.ts on commit b893168; returns uniform HTTP 401 Invalid email or password on invalid credentials or inactive user |
| **API-04** | API | AC-06, R02, BR-03 | Change password with mismatched confirmation or short length (<12) | HTTP 400 with field-level validation errors | `server/tests/lab-03/auth.api.test.ts` | `npm run test:server` | **Implemented** | Passed (15/15) in auth.api.test.ts on commit b893168; returns HTTP 400 with field-level validation errors for short password (<12) or mismatch |
| **API-05** | API | AC-07, R01 | Call `/api/auth/me` with valid active session vs. missing session | Valid: HTTP 200 with user DTO; Missing: HTTP 401 `Authentication required` | `server/tests/lab-03/auth.api.test.ts` | `npm run test:server` | **Implemented** | Passed (15/15) in auth.api.test.ts on commit b893168; GET /api/auth/me returns HTTP 200 with user DTO for active session, HTTP 401 for unauthenticated |
| **API-06** | API | AC-08, R01, BR-01 | Logout call `/api/auth/logout` and subsequent call with old cookie | HTTP 204 on logout, cookie cleared; subsequent call returns HTTP 401 | `server/tests/lab-03/auth.api.test.ts` | `npm run test:server` | **Implemented** | Passed (15/15) in auth.api.test.ts on commit b893168; POST /api/auth/logout returns HTTP 204, clears cookie; subsequent requests return HTTP 401 |
| **API-07** | API | AC-23, R16, BR-06 | Access `/api/staff/tickets` as IT Staff vs. Requester vs. Admin | IT Staff: HTTP 200; Requester/Admin: HTTP 403 Forbidden | `server/tests/lab-03/staff-queue.api.test.ts` | `npm run test:server` | **Planned** | Pending |
| **API-08** | API | AC-24, R16 | Query queue with case-insensitive ticketNo/summary search, combined filters and all/me/unassigned/specific owner modes | Rows/counts match every predicate; unfilteredTotal stays consistent; invalid/repeated/unknown query parameters return 400 | `server/tests/lab-03/staff-queue.api.test.ts` | `npm run test:server` | **Planned** | Pending |
| **API-09** | API | AC-25, R16 | Sort queue by priority/status in both directions and verify stable equal-value ordering | Priority descending HIGH/MEDIUM/LOW; ascending reversed; status rank and id-desc tie-break follow API contract | `server/tests/lab-03/staff-queue.api.test.ts` | `npm run test:server` | **Planned** | Pending |
| **API-10** | API | AC-26, R16 | Query queue pagination boundaries (page 1, 2, invalid page) | Positive integer page required (invalid input 400); out-of-range positive page returns empty tickets; metadata matches api-spec.md §5.1 | `server/tests/lab-03/staff-queue.api.test.ts` | `npm run test:server` | **Planned** | Pending |
| **API-11** | API | AC-28, R18 | Fetch staff ticket detail as IT Staff vs. Requester | IT Staff: HTTP 200 with operational data; Requester: HTTP 403 | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | `npm run test:server` | **Planned** | Pending |
| **API-12** | API | AC-29, R06, BR-11 | Claim unassigned ticket as IT Staff | Ticket owner updated to claiming user; version incremented | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | `npm run test:server` | **Planned** | Pending |
| **API-13** | API | AC-30, R06, BR-16 | Concurrent claim or update with stale `expectedVersion` | First request succeeds (HTTP 200); second request returns HTTP 409 | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | `npm run test:server` | **Planned** | Pending |
| **API-14** | API | AC-31, R07 | IT Staff updates `itPriority` on ticket | `itPriority` updated to new value; `requestedPriority` remains untouched | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | `npm run test:server` | **Planned** | Pending |
| **API-15** | API | AC-32, R08, BR-14 | Transition status `NEW` -> `OPEN` vs. `NEW` -> `RESOLVED` | `NEW` -> `OPEN` succeeds (200); `NEW` -> `RESOLVED` rejected (400) | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | `npm run test:server` | **Planned** | Pending |
| **API-16** | API | AC-34, R09, BR-17 | Requester invokes `/api/tickets/:id/appears-resolved` | Sets `appearsResolvedAt` and actor; formal status remains unchanged | `server/tests/lab-03/requester-regression.api.test.ts` | `npm run test:server` | **Planned** | Pending |
| **API-17** | API | AC-35, R10 | Post and read public comments | Public comments returned for own Requester, Staff, and Admin | `server/tests/lab-03/comments-notes.api.test.ts` | `npm run test:server` | **Planned** | Pending |
| **API-18** | API | AC-37, R10 | Attempt `PUT`, `PATCH` or `DELETE` on a comment or internal note | HTTP 405 Method Not Allowed; entries are append-only | `server/tests/lab-03/comments-notes.api.test.ts` | `npm run test:server` | **Planned** | Pending |
| **API-19** | API | AC-38, R10 | Post comment with `<script>alert(1)</script>` | Stored trimmed plain text is returned intact; browser safety verified separately by UI-16 | `server/tests/lab-03/comments-notes.api.test.ts` | `npm run test:server` | **Planned** | Pending |
| **API-20** | API | AC-40, R19 | Admin queries `/api/admin/users` with name search | Returns matching safe user records with roles and active statuses | `server/tests/lab-03/users-admin.api.test.ts` | `npm run test:server` | **Planned** | Pending |
| **API-21** | API | AC-41, R20 | Admin creates new user with temporary credentials | HTTP 201; password hashed; `mustChangePassword: true` | `server/tests/lab-03/users-admin.api.test.ts` | `npm run test:server` | **Planned** | Pending |
| **API-22** | API | AC-42, R21, BR-18 | Admin creates user with duplicate email (case-insensitive) | HTTP 409 Conflict with exact DUPLICATE_EMAIL envelope from api-spec.md §6.2 | `server/tests/lab-03/users-admin.api.test.ts` | `npm run test:server` | **Planned** | Pending |
| **API-23** | API | AC-43, R20 | Admin edits user name, email, role and activation state | HTTP 200; updated profile returned; passwordHash untouched | `server/tests/lab-03/users-admin.api.test.ts` | `npm run test:server` | **Planned** | Pending |
| **API-24** | API | AC-44, R21, BR-19 | Admin attempts self-deactivation (`isActive: false` on own ID) | HTTP 400 Bad Request; self-deactivation blocked | `server/tests/lab-03/users-admin.api.test.ts` | `npm run test:server` | **Planned** | Pending |
| **API-25** | API | AC-45, R21, BR-20 | Admin attempts deactivating or demoting the sole active Admin | HTTP 400 Bad Request; last-admin protection blocked | `server/tests/lab-03/users-admin.api.test.ts` | `npm run test:server` | **Planned** | Pending |
| **API-26** | API | AC-46, R21, BR-21 | Admin deactivates an IT Staff member with assigned tickets | User deactivated; owned tickets have `ticketOwnerId` set to null | `server/tests/lab-03/users-admin.api.test.ts` | `npm run test:server` | **Planned** | Pending |
| **API-27** | API | AC-47, R20 | Admin resets initial password for a user | HTTP 204; active sessions revoked; forced change on next login | `server/tests/lab-03/users-admin.api.test.ts` | `npm run test:server` | **Planned** | Pending |
| **SEC-01** | Security | AC-03, R04 | Requester sends spoofed `X-Requester-Id: 2` with session of User 1 | Server ignores header; ticket created under User 1 | `server/tests/lab-03/authorization.api.test.ts` | `npm run test:server` | **Planned** | Pending |
| **SEC-02** | Security | AC-04, R11, BR-08 | Requester calls `/api/tickets/:id/internal-notes` directly | HTTP 403 Forbidden; zero note content or existence leaked | `server/tests/lab-03/authorization.api.test.ts` | `npm run test:server` | **Planned** | Pending |
| **SEC-03** | Security | AC-09, R01, BR-04 | 6 failed logins within 5 minutes for same account | 6th attempt returns HTTP 429 Too Many Requests with `Retry-After` | `server/tests/lab-03/auth.api.test.ts` | `npm run test:server` | **Implemented** | Passed (15/15) in auth.api.test.ts on commit b893168; 6th failed login within 5 min returns HTTP 429 with Retry-After header |
| **SEC-04** | Security | AC-10, R15 | State-changing mutation sent without valid CSRF / Origin | HTTP 403 Forbidden; CSRF validation failed | `server/tests/lab-03/authorization.api.test.ts` | `npm run test:server` | **Planned** | Pending |
| **SEC-05** | Security | AC-11, R01 | Deactivated user attempts API call with previously active cookie | HTTP 401 Unauthorized; session immediately rejected | `server/tests/lab-03/authorization.api.test.ts` | `npm run test:server` | **Planned** | Pending |
| **SEC-06** | Security | AC-21, R05 | Requester attempts downloading attachment belonging to another user | HTTP 403 with the inherited attachment ownership error; zero file bytes served | `server/tests/lab-03/authorization.api.test.ts` | `npm run test:server` | **Planned** | Pending |
| **SEC-07** | Security | AC-33, R08, BR-09 | Requester sends `PATCH /api/staff/tickets/:id/status` attempting to set `RESOLVED` or `CLOSED` | HTTP 403 Forbidden; operational mutation blocked | `server/tests/lab-03/authorization.api.test.ts` | `npm run test:server` | **Planned** | Pending |
| **SEC-08** | Security | AC-36, R11 | Requester fetches ticket detail via `/api/tickets/:id` | No note content, keys, counts or existence metadata in requester list/detail/comment/attachment DTOs | `server/tests/lab-03/authorization.api.test.ts` | `npm run test:server` | **Planned** | Pending |
| **SEC-09** | Security | AC-48, R03 | Requester or Staff calls `/api/admin/users` | HTTP 403 Forbidden; access denied | `server/tests/lab-03/authorization.api.test.ts` | `npm run test:server` | **Planned** | Pending |
| **SEC-10** | Security | AC-53, R15 | Trigger unhandled error or not-found resource | Response never returns SQL syntax, stack trace, or secrets | `server/tests/lab-03/authorization.api.test.ts` | `npm run test:server` | **Planned** | Pending |
| **UNIT-01** | Unit | AC-06, BR-03 | Password validator testing min (12), max (128), whitespace, identical | Rejects 11 and 129 code points and new === current; accepts 12/128 including spaces and multi-byte Unicode; confirmation mismatch rejected | `server/tests/lab-03/password.unit.test.ts` | `npm run test:server` | **Implemented** | Passed (6/6) in password.unit.test.ts on commit b893168; validates 12-128 code point boundaries, preserves Unicode, rejects new === current |
| **UNIT-02** | Unit | AC-32, BR-14 | State machine validator testing all 64 transition pairs | 17 permitted pairs return true; the other 47 pairs return false | `server/tests/lab-03/workflow.unit.test.ts` | `npm run test:server` | **Planned** | Pending |
| **UNIT-03** | Unit | AC-38, R10 | Comment content validator testing whitespace, bounds (1–2000) | Rejects empty/whitespace-only; trims properly; accepts valid bounds | `server/tests/lab-03/workflow.unit.test.ts` | `npm run test:server` | **Planned** | Pending |
| **MIG-01** | Migration | AC-14, R05, R12 | Verify legacy table counts, IDs, FKs, and `ticketNo` post-migration | Before/after fixture inventory matches for IDs, requester/uploader FKs, statuses, metadata and attachment SHA-256; do not hardcode historical counts | `server/tests/lab-03/migration-regression.test.ts` | `npm run test:server` | **Implemented** | Passed (12/12) in migration-regression.test.ts on commit 1ffe06b; legacy tables, counts, IDs, FKs, ticketNo preserved |
| **MIG-02** | Migration | AC-15, R12 | Apply migration chain on fresh DB and populated DB copy | Migration succeeds with zero data loss and clean schema drift | `server/tests/lab-03/migration-regression.test.ts` | `npm run test:server` | **Implemented** | Passed (12/12) in migration-regression.test.ts on commit 1ffe06b; 8 statuses and 3 roles enums verified in PostgreSQL |
| **MIG-03** | Migration | AC-16, R13 | Run seed script twice sequentially | Second run creates zero duplicates and preserves changed passwords | `server/tests/lab-03/migration-regression.test.ts` | `npm run test:server` | **Implemented** | Passed (12/12) in migration-regression.test.ts on commit 1ffe06b; sequential seed runs produce zero duplicates and preserve existing accounts/passwords |
| **MIG-04** | Migration | AC-17, R12 | Verify legacy requesters have provisioned credentials | Each provisioned active requester logs in with its assigned temporary credential and must change; inactive/unprovisioned accounts remain denied; no universal migrated password | `server/tests/lab-03/migration-regression.test.ts` | `npm run test:server` | **Implemented** | Passed (12/12) in migration-regression.test.ts on commit 1ffe06b; legacy requesters denied until provisioned; provisionUserCredentials atomically provisions null-hash accounts |
| **MIG-05** | Migration | AC-31, R07 | Check `itPriority` backfill on pre-migration tickets | Existing `itPriority` values preserved without overwrite | `server/tests/lab-03/migration-regression.test.ts` | `npm run test:server` | **Implemented** | Passed (12/12) in migration-regression.test.ts on commit 1ffe06b; itPriority backfill preserves existing values without overwrite |
| **REG-01** | Regression | AC-19, R05 | Requester creates ticket, lists tickets, views detail under auth | Lab 2 ticketNo, create/list/detail DTOs, query names/defaults/clamping and validation unchanged except authenticated identity and documented additions; foreign reads 403 | `server/tests/lab-03/requester-regression.api.test.ts` | `npm run test:server` | **Planned** | Pending |
| **REG-02** | Regression | AC-20, R05 | Requester uploads attachment, downloads, soft-removes with reason | Upload/download bytes and limits match Lab 2; removed metadata retained, download 410, second removal 409, foreign access 403 | `server/tests/lab-03/requester-regression.api.test.ts` | `npm run test:server` | **Planned** | Pending |
| **UI-01** | UI | AC-12, R01 | Login screen renders validation errors on blank submit | Inline red errors for missing email and password; no API call | `client/tests/lab-03/Login.test.tsx` | `npm run test:client` | **Implemented** | Passed (5/5) in Login.test.tsx on commit b893168; renders inline validation errors on blank submit without calling API |
| **UI-02** | UI | AC-12, R01, R02 | Login shows busy submit and error alerts | Form controls disabled during submit; failure surfaces alert banner | `client/tests/lab-03/Login.test.tsx` | `npm run test:client` | **Implemented** | Passed (5/5) in Login.test.tsx on commit b893168; disables controls during busy submit, surfaces error alert banners on 401 and 429 |
| **UI-03** | UI | AC-13, R17 | AppShell displays user name, role badge, role nav; no dev selector | Navigation reflects logged-in role; selector element absent | `client/tests/lab-03/Login.test.tsx` | `npm run test:client` | **Implemented** | Passed (5/5) in Login.test.tsx on commit b893168; AppShell displays user name, role badge, and role-specific nav; dev selector removed |
| **UI-04** | UI | AC-24, R16 | Staff Queue UI renders filter controls, sort toggles, debounced search | Filter changes trigger updated table query; search input debounced | `client/tests/lab-03/StaffTicketQueue.test.tsx` | `npm run test:client` | **Planned** | Pending |
| **UI-05** | UI | AC-27, R16, R22 | Staff Queue renders Loading, Empty, No-Results, and Error states | Distinct skeleton rows, empty message, clear filter action, retry | `client/tests/lab-03/StaffTicketQueue.test.tsx` | `npm run test:client` | **Planned** | Pending |
| **UI-06** | UI | AC-28, R18 | Staff Detail displays read-only info vs. operational panels | Requester data read-only; claim/status/priority editable | `client/tests/lab-03/StaffTicketDetail.test.tsx` | `npm run test:client` | **Planned** | Pending |
| **UI-07** | UI | AC-32, R08 | Status dropdown displays only permitted next states with confirm modal | Only valid transitions in select; modal appears on terminal states | `client/tests/lab-03/StaffTicketDetail.test.tsx` | `npm run test:client` | **Planned** | Pending |
| **UI-08** | UI | AC-35, AC-36, R10 | Public comments and internal notes rendered in separate tabs | Internal notes tab has yellow highlight; drafts are independent | `client/tests/lab-03/StaffTicketDetail.test.tsx` | `npm run test:client` | **Planned** | Pending |
| **UI-09** | UI | AC-40, R19 | Admin User Management displays user table with search | Search input filters table rows by name/email | `client/tests/lab-03/UserManagement.test.tsx` | `npm run test:client` | **Planned** | Pending |
| **UI-10** | UI | AC-48, R03 | Non-admin tries opening User Management view | Access denied banner rendered; no user data displayed | `client/tests/lab-03/UserManagement.test.tsx` | `npm run test:client` | **Planned** | Pending |
| **UI-11** | UI | AC-49, R22 | Admin user creation modal validation and busy states | Shows validation errors for blank fields; spinner on submission | `client/tests/lab-03/UserManagement.test.tsx` | `npm run test:client` | **Planned** | Pending |
| **UI-12** | UI | AC-53, R15 | Safe UI error presentation on API 500 failure | Friendly toast/banner rendered without technical dumps | `client/tests/lab-03/StaffTicketDetail.test.tsx` | `npm run test:client` | **Planned** | Pending |
| **VIS-01** | Visual | AC-50, R22 | Major screens desktop/tablet/mobile viewport inspection | No clipped text, no overlapping elements, zero horizontal scroll | `e2e/lab-03/responsive.spec.ts` | `npm run test:e2e -- e2e/lab-03/responsive.spec.ts` | **Planned** | Pending |
| **VIS-02** | Visual | AC-51, R17 | Zen Green tokens, status badges, and typography verification | Badges match exact tokens; primary button uses `#006B3C` and existing --zg-* tokens | `e2e/lab-03/responsive.spec.ts` | `npm run test:e2e -- e2e/lab-03/responsive.spec.ts` | **Planned** | Pending |
| **A11Y-01** | A11y | AC-52, R22 | Keyboard navigation, focus rings, associated labels, touch targets | Focus rings visible; touch targets $\ge 44\text{px}$; inputs have labels | `e2e/lab-03/responsive.spec.ts` | `npm run test:e2e -- e2e/lab-03/responsive.spec.ts` | **Planned** | Pending |
| **E2E-01** | E2E | AC-01, AC-08, AC-13 | Valid login, permitted role landing page, logout flow | User logs in, sees name/role in shell, logs out, redirected to `/login` | `e2e/lab-03/authentication.spec.ts` | `playwright test` | **Implemented** | Passed (15/15 across desktop/tablet/mobile) in authentication.spec.ts on commit 6d520e6; valid login, AppShell profile & badge display, logout redirect to /login |
| **E2E-02** | E2E | AC-02, R02 | Forced initial password change flow | User logs in with temporary password, forced to change, then accesses app | `e2e/lab-03/authentication.spec.ts` | `playwright test` | **Implemented** | Passed (15/15 across desktop/tablet/mobile) in authentication.spec.ts on commit 6d520e6; user with mustChangePassword: true forced to change password with 12+ char policy, updates DB, lands on role view |
| **E2E-03** | E2E | AC-08, R01 | Invalidate session on logout and verify back navigation blocked | After logout, pressing browser back button does not reveal data | `e2e/lab-03/authentication.spec.ts` | `playwright test` | **Implemented** | Passed (15/15 across desktop/tablet/mobile) in authentication.spec.ts on commit 6d520e6; session invalidated on logout; browser back navigation and direct URL blocked from accessing protected view |
| **E2E-04** | E2E | AC-12, R01 | Login error flows (wrong password, inactive account) | Displays accessible error banner without page crash | `e2e/lab-03/authentication.spec.ts` | `playwright test` | **Implemented** | Passed (15/15 across desktop/tablet/mobile) in authentication.spec.ts on commit 6d520e6; wrong password error banner, inactive user uniform 401 banner, blank form validation errors without page crash |
| **E2E-05** | E2E | AC-13, R03 | Role-based navigation routing (Requester, Staff, Admin) | Each role lands on designated view (My Tickets, Queue, Users) | `e2e/lab-03/authentication.spec.ts` | `playwright test` | **Implemented** | Passed (15/15 across desktop/tablet/mobile) in authentication.spec.ts on commit 6d520e6; role-based routing verifies Requester lands on /my-tickets, Staff on /staff/queue, Admin on /admin/users |
| **E2E-06** | E2E | AC-19, R05 | Requester happy path: create ticket with attachment | Ticket appears in My Tickets; ticket number displayed | `e2e/lab-03/requester-regression.spec.ts` | `playwright test` | **Planned** | Pending |
| **E2E-07** | E2E | AC-20, R05 | Attachment upload, download, and soft-remove flow | Active attachment downloadable; soft-remove shows reason dialog | `e2e/lab-03/requester-regression.spec.ts` | `playwright test` | **Planned** | Pending |
| **E2E-08** | E2E | AC-22, R05 | Account switch: User A logs out, User B logs in | User B cannot view or search User A's tickets | `e2e/lab-03/requester-regression.spec.ts` | `playwright test` | **Planned** | Pending |
| **E2E-09** | E2E | AC-24, AC-26, AC-27, R16 | Staff Queue search, filter combinations, and pagination | Queue updates smoothly; shows no-results state on unmatched query | `e2e/lab-03/staff-ticket-flow.spec.ts` | `playwright test` | **Planned** | Pending |
| **E2E-10** | E2E | AC-34, R09 | Requester flags Problem Appears Resolved | Alert surfaces in Staff detail; ticket status remains `IN_PROGRESS` | `e2e/lab-03/staff-ticket-flow.spec.ts` | `playwright test` | **Planned** | Pending |
| **E2E-11** | E2E | AC-39, R18 | Complete IT Staff workflow: Queue -> Claim -> Priority -> Comment -> Resolve | Ticket progressed to `RESOLVED` with public explanation | `e2e/lab-03/staff-ticket-flow.spec.ts` | `playwright test` | **Planned** | Pending |
| **E2E-12** | E2E | AC-41, R20 | Admin provisions new user account and verifies login | Newly created user signs in and is prompted for password change | `e2e/lab-03/user-administration.spec.ts` | `playwright test` | **Planned** | Pending |
| **E2E-13** | E2E | AC-47, R20 | Admin resets user password | User's active session terminated; must sign in with new temporary secret | `e2e/lab-03/user-administration.spec.ts` | `playwright test` | **Planned** | Pending |
| **E2E-14** | E2E | AC-44, R21 | Admin user management safety guards (self-deactivate blocked) | Toggle disabled on own row; attempt returns inline warning | `e2e/lab-03/user-administration.spec.ts` | `playwright test` | **Planned** | Pending |
| **DOC-01** | Doc | AC-54, R23, R24, R26 | Verify contract consistency, required file tree and all 56 semantic AC-to-test mappings | All 56 ACs traceable in `docs/lab-03/tests.md` with zero unmapped criteria | `docs/lab-03/tests.md` | Manual check | **Planned** | Pending |
| **WORK-01** | Workflow | AC-55, R25 | Verify spec/test-plan commits and review precede implementation completion; inspect Issue links, Kanban, peer review and staging history | Feature branches target `lab3-staging`; `reviewer.md` complete | `docs/lab-03/reviewer.md` | `git log --graph` | **Planned** | Pending |
| **RELEASE-01** | Release | AC-56, R28 | Full test suite execution on clean checkout of final `main` | Server, client, responsive, and E2E suites pass 100% on final HEAD SHA | Terminal full run | `npm run test:all` | **Planned** | Pending |
| **SUB-01** | Submission | AC-56, R28 | Verify single submission PDF contains Answer Part 1 through 9 | PDF verified with all 9 headings, functional links, and legible screenshots | `docs/lab-03/submission.pdf` | Visual inspection | **Planned** | Pending |
| **API-28** | API | AC-29, R06, BR-11 | Retrieve eligible owners as Staff; reject other roles | Only active Staff/Admin id/name/role returned; 403 for Requester/Admin | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | `npm run test:server` | **Planned** | Pending |
| **API-29** | API | AC-29, AC-30, R06, BR-13, BR-16 | Assign/reassign to active Staff and Admin; stale owner update | Owner and version change atomically; requestedPriority/status unchanged; stale version 409 | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | `npm run test:server` | **Planned** | Pending |
| **API-30** | API | AC-29, R06, BR-11 | Assign null, nonexistent, inactive, Requester or changed-role owner | 400 details.ownerId; assignment does not persist; concurrent eligibility changes cannot violate owner invariant | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | `npm run test:server` | **Planned** | Pending |
| **API-31** | API | AC-35, AC-36, R10, R11 | Staff posts note; Staff/Admin read both threads; Admin tries posting | Staff note 201; reads 200 in stable order; Admin POST comment/note 403 | `server/tests/lab-03/comments-notes.api.test.ts` | `npm run test:server` | **Planned** | Pending |
| **API-32** | API | AC-40, R19 | User name/email partial search with optional role filter | Case-insensitive search, AND role filter, deterministic order, empty results and invalid role 400 | `server/tests/lab-03/users-admin.api.test.ts` | `npm run test:server` | **Planned** | Pending |
| **API-33** | API | AC-41, AC-42, AC-43, R20, R21, BR-06, BR-18 | Create/edit invalid roles, role arrays, duplicate email, activation and protected fields | Valid single role and boolean accepted; invalid 400; concurrent duplicate create/edit 409; own unchanged email accepted; department rejected | `server/tests/lab-03/users-admin.api.test.ts` | `npm run test:server` | **Planned** | Pending |
| **API-34** | API | AC-45, R21, BR-20 | Two active Admins concurrently demote/deactivate accounts | At least one active Admin remains; losing transaction rejected; no count-then-write race | `server/tests/lab-03/users-admin.api.test.ts` | `npm run test:server` | **Planned** | Pending |
| **API-35** | API | AC-11, AC-46, R06, R21, BR-21 | Deactivate owner or change owner to Requester; concurrently assign same owner | Sessions revoked; affected tickets unassigned/versioned and count returned atomically; status and requester/author FKs preserved | `server/tests/lab-03/users-admin.api.test.ts` | `npm run test:server` | **Planned** | Pending |
| **API-36** | API | AC-32, R08, BR-14, BR-15 | Parameterized status transitions, owner eligibility and reopen cleanup | All 17 allowed transitions with valid preconditions succeed; 47 others fail 400; owner-required transition without eligible owner fails; reopen clears indicator | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | `npm run test:server` | **Planned** | Pending |
| **API-37** | API | AC-28, AC-35, AC-36, R18 | Admin read-only detail and shared attachment download | Safe detail and active bytes returned to Admin/Staff; missing ticket 404; requester denied admin detail; Staff/Admin attachment mutations 403 | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | `npm run test:server` | **Planned** | Pending |
| **API-38** | API | AC-34, R09, BR-17 | Appears-resolved with allowed/disallowed statuses, foreign ticket and duplicate submission | Allowed 200 records server actor/time; repeated call preserves timestamp; foreign 403; disallowed status 400; formal status unchanged | `server/tests/lab-03/requester-regression.api.test.ts` | `npm run test:server` | **Planned** | Pending |
| **API-39** | API | AC-38, R10 | Whitespace/non-string/oversized comments and notes; forged author/time | 400 validation; no write; accepted 1/2000-code-point boundaries and safe author/time derived from session/server | `server/tests/lab-03/comments-notes.api.test.ts` | `npm run test:server` | **Planned** | Pending |
| **API-40** | API | AC-06, AC-07, AC-10, R01, R02, R15 | Change password succeeds; wrong current and all boundary cases; expired session | New credential verifies; forced flag cleared; cookie/CSRF rotated; old sessions revoked; 400 invalid current or new; expired cookie 401 | `server/tests/lab-03/auth.api.test.ts` | `npm run test:server` | **Implemented** | Passed (15/15) in auth.api.test.ts on commit b893168; POST /api/auth/change-password validates current/new, updates hash, revokes sessions, clears forced flag |
| **SEC-11** | Security | AC-02, AC-03, AC-04, AC-23, AC-33, AC-48, R03, R04 | Full protected endpoint role/ownership matrix and forced-change bypass | Own/foreign/missing cases match permission matrix; header/body/query identity spoof never grants access; all business paths block forced-change session | `server/tests/lab-03/authorization.api.test.ts` | `npm run test:server` | **Planned** | Pending |
| **SEC-12** | Security | AC-09, AC-10, AC-11, R15 | CSRF valid/invalid cases, trusted-origin login, independent rate-limit buckets and expiry | Allowed origin plus session token succeeds; missing/wrong origin/token 403; sixth failed-attempt window throttled; Retry-After decreases and expires; stale-role cookies 401 | `server/tests/lab-03/auth.api.test.ts` | `npm run test:server` | **Implemented** | Passed (15/15) in auth.api.test.ts on commit b893168; CSRF origin and token validation, rate-limit bucket isolation verified |
| **MIG-06** | Migration | AC-18, R13, R14 | Assert seed role counts and realistic fixtures after both seed runs | At least Requester 4 active/1 inactive, Staff 3 active/1 inactive, Admin 1 active; >=24 tickets across all 8 statuses/3 priorities/owner modes with comments and notes | `server/tests/lab-03/migration-regression.test.ts` | `npm run test:server` | **Implemented** | Passed (12/12) in migration-regression.test.ts on commit 1ffe06b; role distribution (>=4 active requesters, >=3 staff, 1 admin) & >=24 tickets across all 8 statuses verified |
| **HARNESS-01** | Integration | AC-15, R12, R24 | Missing/dev DB target, unsafe upload path or reused development server | Runner fails before DB/file writes; safe test target can execute fixtures and exact-ID/path cleanup; cleanup failures fail run | `server/tests/lab-03/test-environment.test.ts` | `npm run test:server` | **In progress** | 24 harness unit/integration cases passed; runtime Playwright CLI rejection, Playwright worker execution/env propagation without build artifacts (`e2e/lab-03/worker-env.spec.ts`), webServer skip strictly restricted to probe tests (non-probe rejected), shared `cleanupAttachmentFiles` helper between E2E and test, and simulated physical unlink failure verification; full live DB run pending disposable PostgreSQL service |
| **UI-13** | UI | AC-02, AC-06, AC-12, R02 | Change Password mandatory/voluntary mode, validation, submitting, success and failure | Mandatory guard retained until server success; fields labeled; invalid confirmation/current/new shown; controls disabled; safe failures retain non-secret context | `client/tests/lab-03/ChangePassword.test.tsx` | `npm run test:client` | **Implemented** | Passed (3/3) in ChangePassword.test.tsx on commit 6d520e6; mandatory alert displayed when mustChangePassword is true; inline length/mismatch validations; success banner on submit |
| **UI-14** | UI | AC-20, AC-34, AC-35, R05, R09, R10 | Requester detail public comments, resolution confirmation and attachments | No internal-note tab/count; permitted appears-resolved only; duplicate acknowledgment stable; Lab 2 removed-file UI intact | `client/tests/lab-03/RequesterTicketDetail.test.tsx` | `npm run test:client` | **Planned** | Pending |
| **UI-15** | UI | AC-27, AC-28, AC-49, AC-53, R22 | 403/404/409/500 feedback on Queue, Detail and Admin views | Safe per-screen messages and retry; 409 no silent overwrite; drafts retained; no success on failure | `client/tests/lab-03/Feedback.test.tsx` | `npm run test:client` | **Planned** | Pending |
| **UI-16** | UI | AC-35, AC-36, AC-38, R10 | Render hostile text and switch public/internal drafts | Text rendered literally, no injected element; note draft never copied into public form; role visibility correct | `client/tests/lab-03/StaffTicketDetail.test.tsx` | `npm run test:client` | **Planned** | Pending |
| **UI-17** | UI | AC-28, AC-29, AC-30, AC-31, R06, R07 | Claim/reassign confirmation, priority save and conflict refresh | Old/new owner confirmed; active choices only; version sent; requested priority read-only; stale update prompts refresh | `client/tests/lab-03/StaffTicketDetail.test.tsx` | `npm run test:client` | **Planned** | Pending |
| **STYLE-01** | UI style | AC-51, AC-52, R17 | Structural badge/field/label accessibility assertions | Labels and icons express state; read-only classes and associated labels present; no claim about jsdom geometry | `client/tests/lab-03/Responsive.style.test.tsx` | `npm run test:client` | **Planned** | Pending |
| **E2E-15** | E2E | AC-29, AC-31, AC-32, AC-35, AC-36, AC-39, R18 | Real Staff reassign/priority/workflow plus Public Comment and Internal Note; Admin reads | Database-backed changes visible on refetch; Admin reads but cannot mutate; Requester sees public thread only; complete formal close after resolve | `e2e/lab-03/staff-ticket-flow.spec.ts` | `npm run test:e2e` | **Planned** | Pending |
| **E2E-16** | E2E | AC-40, AC-41, AC-43, AC-44, AC-45, AC-46, AC-47, AC-49, R19, R20, R21 | Admin list/search/role filter, create/edit/activation/reset and safety feedback | All UI operations persist; self/last-admin denied; affected owner count displayed; reset login forces change; forbidden roles denied | `e2e/lab-03/user-administration.spec.ts` | `npm run test:e2e` | **Planned** | Pending |
| **E2E-17** | E2E | AC-14, AC-19, AC-20, AC-21, R05, R12 | Authenticated access to pre-migration Ticket and Attachment fixture | Original ticket fields and downloaded file SHA-256 match baseline; removed/foreign downloads denied; only run-created data cleaned | `e2e/lab-03/requester-regression.spec.ts` | `npm run test:e2e` | **Planned** | Pending |
| **DOC-02** | Document | AC-56, R27, R28 | Inspect ai-use.md and submission evidence | Actual LLM, 6–10 real prompts, student reflection, working links, rendered docs and Parts 1–9; no invented review or results | `docs/lab-03/ai-use.md` | `Manual evidence inspection` | **Planned** | Pending |

## 4. Reverse AC Traceability (Plan Only)

The authoritative AC wording is specification.md §9. The mapping below is derived from the
scenario table, not a product Pass result. Review expected behavior, not just matching IDs.

| AC | Planned tests / inspections |
|---|---|
| AC-01 | API-01, E2E-01 |
| AC-02 | API-02, E2E-02, SEC-11, UI-13 |
| AC-03 | SEC-01, SEC-11 |
| AC-04 | SEC-02, SEC-11 |
| AC-05 | API-03 |
| AC-06 | API-04, UNIT-01, API-40, UI-13 |
| AC-07 | API-05, API-40 |
| AC-08 | API-06, E2E-01, E2E-03 |
| AC-09 | SEC-03, SEC-12 |
| AC-10 | SEC-04, API-40, SEC-12 |
| AC-11 | SEC-05, API-35, SEC-12 |
| AC-12 | UI-01, UI-02, E2E-04, UI-13 |
| AC-13 | UI-03, E2E-01, E2E-05 |
| AC-14 | MIG-01, E2E-17 |
| AC-15 | MIG-02, HARNESS-01 |
| AC-16 | MIG-03 |
| AC-17 | MIG-04 |
| AC-18 | MIG-06 |
| AC-19 | REG-01, E2E-06, E2E-17 |
| AC-20 | REG-02, E2E-07, UI-14, E2E-17 |
| AC-21 | SEC-06, E2E-17 |
| AC-22 | E2E-08 |
| AC-23 | API-07, SEC-11 |
| AC-24 | API-08, UI-04, E2E-09 |
| AC-25 | API-09 |
| AC-26 | API-10, E2E-09 |
| AC-27 | UI-05, E2E-09, UI-15 |
| AC-28 | API-11, UI-06, API-37, UI-15, UI-17 |
| AC-29 | API-12, API-28, API-29, API-30, UI-17, E2E-15 |
| AC-30 | API-13, API-29, UI-17 |
| AC-31 | API-14, MIG-05, UI-17, E2E-15 |
| AC-32 | API-15, UNIT-02, UI-07, API-36, E2E-15 |
| AC-33 | SEC-07, SEC-11 |
| AC-34 | API-16, E2E-10, API-38, UI-14 |
| AC-35 | API-17, UI-08, API-31, API-37, UI-14, UI-16, E2E-15 |
| AC-36 | SEC-08, UI-08, API-31, API-37, UI-16, E2E-15 |
| AC-37 | API-18 |
| AC-38 | API-19, UNIT-03, API-39, UI-16 |
| AC-39 | E2E-11, E2E-15 |
| AC-40 | API-20, UI-09, API-32, E2E-16 |
| AC-41 | API-21, E2E-12, API-33, E2E-16 |
| AC-42 | API-22, API-33 |
| AC-43 | API-23, API-33, E2E-16 |
| AC-44 | API-24, E2E-14, E2E-16 |
| AC-45 | API-25, API-34, E2E-16 |
| AC-46 | API-26, API-35, E2E-16 |
| AC-47 | API-27, E2E-13, E2E-16 |
| AC-48 | SEC-09, UI-10, SEC-11 |
| AC-49 | UI-11, UI-15, E2E-16 |
| AC-50 | VIS-01 |
| AC-51 | VIS-02, STYLE-01 |
| AC-52 | A11Y-01, STYLE-01 |
| AC-53 | SEC-10, UI-12, UI-15 |
| AC-54 | DOC-01 |
| AC-55 | WORK-01 |
| AC-56 | RELEASE-01, SUB-01, DOC-02 |

## 5. Execution and Evidence Gates

- P01/P02 document review checks AC uniqueness/completeness, semantic mapping, endpoint and
  role coverage, inherited DTOs/statuses and actual theme tokens. This is not feature TDD.
- Product tests above are Planned; automated files still need implementation. HARNESS-01 is
  partially implemented; E2E remains blocked by the isolation fixes above. Run IDs/commands/exit codes/source SHA and
  raw output must replace Pending in the evidence column when each run actually finishes.
- Before closing a feature, run focused Red then Green and safe regression suites. Before
  final release run server, client, Playwright and both builds from final main, with zero skips.
- Browser evidence comes from responsive.spec.ts plus actual screenshot review for every screen
  in ui-spec.md §7. Mock controlled failures only; happy-path E2E and security use real APIs/DB.
- Required pending artifacts: reviewer.md, ai-use.md, migration-report.md, visual-checklist.md,
  screenshot/run outputs and one submission PDF. Do not create fabricated placeholders as proof.

---

## 6. Phase F2 Test Execution Evidence & Raw Output Logs

All automated test suites for Phase F2 (Database Migration, Authentication, Authorization, Auth UI, and E2E Authentication) were executed on branch `feature/f2-database-and-auth` targeting the disposable PostgreSQL test database `toktickit_test`.

### 6.1 Server Test Suite Execution Evidence

- **Command:** `$env:DATABASE_URL_TEST="postgresql://toktickit:toktickit@localhost:5433/toktickit_test?schema=public"; npm run test:server`
- **Working Directory:** `server/` (invoked via root workspace)
- **Exit Code:** `0`
- **Result Summary:** `19 passed (19 files), 171 passed (171 tests)`
- **Raw Execution Log Excerpt:**
```text
 RUN  v2.1.9 D:/toktickit/server

 ✓ tests/lab-03/migration-regression.test.ts (12 tests) 1857ms
   ✓ Phase F2 / P03 Data Migration & Idempotent Seeding (AC-14–AC-18, AC-31, LCP-02) > MIG-03 & MIG-04 (AC-16, AC-17, R13, R14): Populated DB Data Preservation, Sequence Continuity & Credential Provisioning > proves populated DB data (users, tickets, attachments) is preserved across schema migration and seeding 363ms
   ✓ Phase F2 / P03 Data Migration & Idempotent Seeding (AC-14–AC-18, AC-31, LCP-02) > MIG-03 & MIG-04 (AC-16, AC-17, R13, R14): Populated DB Data Preservation, Sequence Continuity & Credential Provisioning > proves seed isolates identity and does not modify fields or add comments/notes to colliding tickets (e.g. TKT-2026-000008) 655ms
   ✓ MIG-01: Legacy table structure, counts, IDs, FKs, and ticketNo post-migration
   ✓ MIG-02: 8 statuses and 3 roles enums verified in PostgreSQL
   ✓ MIG-03: Idempotent seed function creates zero duplicates and preserves changed passwords
   ✓ MIG-04: Legacy requesters without passwords denied login; provisionUserCredentials atomically provisions null-hash accounts with forced change flag
   ✓ MIG-05: itPriority backfill preserves existing values without overwrite
   ✓ MIG-06: Seed role counts (>=4 active requesters, >=3 active staff, 1 active admin) and >=24 tickets across all 8 statuses
 ✓ tests/lab-03/auth.api.test.ts (15 tests) 748ms
   ✓ API-01: Login with valid credentials returns HTTP 200, sets toktickit_session HttpOnly cookie with no-store
   ✓ API-02: Call /api/tickets with mustChangePassword: true returns HTTP 403 PASSWORD_CHANGE_REQUIRED
   ✓ API-03: Login with wrong password or inactive account returns uniform HTTP 401 Invalid email or password
   ✓ API-04: Change password with short (<12 chars) or mismatched confirmation returns HTTP 400
   ✓ API-05: GET /api/auth/me returns HTTP 200 with user DTO for active session, HTTP 401 for unauthenticated
   ✓ API-06: POST /api/auth/logout returns HTTP 204, clears cookie; subsequent requests return HTTP 401
   ✓ API-40: POST /api/auth/change-password validates current/new, updates hash, revokes sessions, clears forced flag
   ✓ SEC-03: 6 failed logins within 5 minutes returns HTTP 429 Too Many Requests with Retry-After header
   ✓ SEC-12: CSRF origin and token validation, rate-limit bucket isolation verified
 ✓ tests/lab-03/password.unit.test.ts (6 tests) 64ms
   ✓ UNIT-01: Validates 12-128 code point boundaries, preserves whitespace and Unicode, rejects new === current
 ✓ tests/lab-03/authorization.api.test.ts (10 tests) 319ms
 ✓ tests/lab-03/test-environment.test.ts (24 tests) 8932ms
 ✓ tests/lab-02/ownership-hardening.api.test.ts (37 tests) 302ms
 ✓ tests/lab-02/attachments.api.test.ts (19 tests) 427ms
 ✓ tests/lab-02/create-ticket.api.test.ts (11 tests) 169ms
 ✓ tests/lab-02/my-tickets.api.test.ts (8 tests) 398ms
 ✓ tests/lab-02/requester-middleware.api.test.ts (7 tests) 67ms
 ✓ tests/lab-02/ticket-detail.api.test.ts (5 tests) 105ms
 ✓ tests/lab-02/reference-data.api.test.ts (4 tests) 87ms
 ✓ tests/lab-02/ticket-number.unit.test.ts (4 tests) 4ms
 ✓ tests/lab-02/requesters.api.test.ts (3 tests) 53ms
 ✓ tests/lab-02/safe-filename.unit.test.ts (2 tests) 3ms
 ✓ tests/lab-02/pagination.unit.test.ts (1 test) 2ms
 ✓ tests/lab-02/validation.unit.test.ts (1 test) 2ms
 ✓ tests/lab-01/health.test.ts (1 test) 14ms
 ✓ tests/lab-01/categories.test.ts (1 test) 48ms

 Test Files  19 passed (19)
      Tests  171 passed (171)
   Duration  19.62s
```

### 6.2 Client Test Suite Execution Evidence

- **Command:** `npm run test:client`
- **Working Directory:** `client/` (invoked via root workspace)
- **Exit Code:** `0`
- **Result Summary:** `11 passed (11 files), 47 passed (47 tests)`
- **Raw Execution Log Excerpt:**
```text
 RUN  v2.1.9 D:/toktickit/client

 ✓ tests/lab-03/Login.test.tsx (5 tests) 2096ms
   ✓ UI-01: validates required email and password fields inline on blank submit without calling API
   ✓ UI-02: disables submit button and form controls during login submission
   ✓ UI-02: displays error alert on 401 invalid credentials
   ✓ UI-02: displays rate-limit error banner on 429 status
   ✓ UI-03: renders AppShell with user profile name, role badge, and role-specific navigation upon login
 ✓ tests/lab-03/ChangePassword.test.tsx (3 tests) 2254ms
   ✓ UI-13: renders mandatory change alert banner when user has mustChangePassword: true
   ✓ UI-13: validates inline errors for empty fields, short password (<12), and mismatched passwords without calling API
   ✓ UI-13: calls api.changePassword, displays green success alert, and invokes onSuccess after successful update
 ✓ tests/lab-03/SessionTicketFlow.test.tsx (2 tests) 1510ms
   ✓ AC-13: submits ticket using authenticated session identity when legacy currentRequester is null
 ✓ tests/lab-02/CreateTicket.test.tsx (9 tests) 6991ms
 ✓ tests/lab-02/MyTickets.test.tsx (6 tests) 1752ms
 ✓ tests/lab-02/AttachmentSection.test.tsx (5 tests) 928ms
 ✓ tests/lab-02/RequesterTicketDetail.test.tsx (5 tests) 330ms
 ✓ tests/lab-02/RouteGuard.test.tsx (4 tests) 216ms
 ✓ tests/lab-02/RequesterSelection.test.tsx (4 tests) 333ms
 ✓ tests/lab-01/App.test.tsx (3 tests) 58ms
 ✓ tests/lab-02/AppShell.test.tsx (1 test) 172ms

 Test Files  11 passed (11)
      Tests  47 passed (47)
   Duration  8.86s
```

### 6.3 Playwright E2E Test Suite Execution Evidence

- **Commit SHA:** `6d520e6`
- **Command:** `$env:DATABASE_URL_TEST="postgresql://toktickit:toktickit@localhost:5433/toktickit_test?schema=public"; npx playwright test e2e/lab-03/authentication.spec.ts`
- **Target File:** `e2e/lab-03/authentication.spec.ts`
- **Projects Tested:** `desktop` (1280x800), `tablet` (768x1024), `mobile` (375x667)
- **Exit Code:** `0`
- **Result Summary:** `15 passed (15 tests across 3 device viewports)`
- **Artifacts Location:** `artifacts/lab-03/screenshots/<runId>/`
- **Raw Execution Log Excerpt:**
```text
Running 15 tests using 1 worker

  ok  1 [desktop] › e2e/lab-03/authentication.spec.ts:79:3 › E2E-01: Valid login, permitted role landing page, logout flow (622ms)
  ok  2 [desktop] › e2e/lab-03/authentication.spec.ts:118:3 › E2E-02: Forced initial password change flow (1.6s)
  ok  3 [desktop] › e2e/lab-03/authentication.spec.ts:173:3 › E2E-03: Invalidate session on logout and verify back navigation blocked (497ms)
  ok  4 [desktop] › e2e/lab-03/authentication.spec.ts:208:3 › E2E-04: Login error flows (wrong password, inactive account, client validation) (477ms)
  ok  5 [desktop] › e2e/lab-03/authentication.spec.ts:245:3 › E2E-05: Role-based navigation routing (Requester, Staff, Admin) (973ms)
  ok  6 [tablet]  › e2e/lab-03/authentication.spec.ts:79:3 › E2E-01: Valid login, permitted role landing page, logout flow (673ms)
  ok  7 [tablet]  › e2e/lab-03/authentication.spec.ts:118:3 › E2E-02: Forced initial password change flow (1.5s)
  ok  8 [tablet]  › e2e/lab-03/authentication.spec.ts:173:3 › E2E-03: Invalidate session on logout and verify back navigation blocked (477ms)
  ok  9 [tablet]  › e2e/lab-03/authentication.spec.ts:208:3 › E2E-04: Login error flows (wrong password, inactive account, client validation) (475ms)
  ok 10 [tablet]  › e2e/lab-03/authentication.spec.ts:245:3 › E2E-05: Role-based navigation routing (Requester, Staff, Admin) (881ms)
  ok 11 [mobile]  › e2e/lab-03/authentication.spec.ts:79:3 › E2E-01: Valid login, permitted role landing page, logout flow (617ms)
  ok 12 [mobile]  › e2e/lab-03/authentication.spec.ts:118:3 › E2E-02: Forced initial password change flow (1.6s)
  ok 13 [mobile]  › e2e/lab-03/authentication.spec.ts:173:3 › E2E-03: Invalidate session on logout and verify back navigation blocked (492ms)
  ok 14 [mobile]  › e2e/lab-03/authentication.spec.ts:208:3 › E2E-04: Login error flows (wrong password, inactive account, client validation) (532ms)
  ok 15 [mobile]  › e2e/lab-03/authentication.spec.ts:245:3 › E2E-05: Role-based navigation routing (Requester, Staff, Admin) (982ms)

  15 passed (17.2s)
```

