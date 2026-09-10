# TokTickIT — Test Plan & Traceability Matrix (Lab 3)

**Document Version:** 1.0.0  
**Status:** DRAFT CONTRACT — Frozen for Review  
**Sprint:** Sprint 3 (Lab 3)  
**Standard Compliance:** CPE 334 Lab 3 Testing Standards (§10, AC-01 through AC-56)  
**TDD Rule:** All test rows start with status `Planned`. For each feature, write the failing test first (Red), verify the expected failure reason, implement the minimal solution (Green), and verify regression.

---

## 1. Test Suite Architecture & Directory Structure

```text
server/tests/lab-03/
  ├── auth.api.test.ts                  # AUTH: Login, logout, me, session cookie, password change
  ├── authorization.api.test.ts         # AUTHZ: Role guards, foreign ticket 404, spoof rejection
  ├── staff-queue.api.test.ts           # QUEUE: Query filters, search, semantic sort, pagination
  ├── staff-ticket-detail.api.test.ts   # DETAIL: Claim, reassign, IT priority, 8 status transitions, 409 conflict
  ├── comments-notes.api.test.ts        # COMM: Public comments, internal notes, append-only, XSS sanitization
  ├── users-admin.api.test.ts           # ADMIN: User list/search, create, edit, self/last-admin safety, reset
  ├── migration-regression.test.ts      # MIG: Additive schema, non-destructive backfill, idempotent seed
  ├── requester-regression.api.test.ts  # REG: Preserved ticket creation, attachments, appears-resolved
  ├── password.unit.test.ts             # UNIT: Password validation rules (min/max/whitespace/diff)
  └── workflow.unit.test.ts             # UNIT: 8-status transition matrix validation engine

client/tests/lab-03/
  ├── Login.test.tsx                    # UI: Login form states, validation, busy indicator, generic error
  ├── ChangePassword.test.tsx           # UI: Mandatory password change screen, policy helpers, inline errors
  ├── StaffTicketQueue.test.tsx         # UI: Queue table, debounced search, filters, pagination, feedback states
  ├── StaffTicketDetail.test.tsx        # UI: Staff detail view, claim button, reassign, status confirmation modal
  ├── UserManagement.test.tsx           # UI: Admin user directory, add user modal, edit modal, reset modal
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
   - All server API and integration tests run against `DATABASE_URL_TEST=postgresql://toktickit:toktickit@localhost:5433/toktickit_test?schema=public`.
   - The shared development database (`toktickit`) is never used for automated test suites.
2. **Dedicated Test Upload Directory:**
   - Physical attachments generated during test runs are saved exclusively to `server/test-uploads/` and deleted immediately during teardown.
3. **Strict Per-Test ID Tracking:**
   - All test fixtures track dynamically created record IDs in arrays (e.g. `createdTicketIds`, `createdUserIds`).
   - Teardowns delete **strictly** by primary key: `where: { id: { in: createdIds } }`.
   - Broad wipes (e.g. `deleteMany({})`, `TRUNCATE`, or `summary startsWith 'E2E-'`) are strictly forbidden.

---

## 3. Comprehensive Traceability Matrix (AC-01 through AC-56)

| Test ID | Type | Target AC / FR / BR | Scenario Description | Expected Observable Result | Target File Path | Execution Command | Status |
|---|---|---|---|---|---|---|---|
| **API-01** | API | AC-01, R01, BR-01 | Login with valid credentials of active user | HTTP 200, returns user profile, sets `toktickit_session` HttpOnly cookie | `server/tests/lab-03/auth.api.test.ts` | `npm run test:server` | **Planned** |
| **API-02** | API | AC-02, R02, BR-02 | Call `/api/tickets` with session where `mustChangePassword: true` | HTTP 403 `PASSWORD_CHANGE_REQUIRED`; access blocked | `server/tests/lab-03/auth.api.test.ts` | `npm run test:server` | **Planned** |
| **API-03** | API | AC-05, R01, BR-05 | Login with wrong password, non-existent email, or inactive account | Uniform HTTP 401 `Invalid email or password`; no timing/existence leak | `server/tests/lab-03/auth.api.test.ts` | `npm run test:server` | **Planned** |
| **API-04** | API | AC-06, R02, BR-03 | Change password with mismatched confirmation or short length (<12) | HTTP 400 with field-level validation errors | `server/tests/lab-03/auth.api.test.ts` | `npm run test:server` | **Planned** |
| **API-05** | API | AC-07, R01 | Call `/api/auth/me` with valid active session vs. missing session | Valid: HTTP 200 with user DTO; Missing: HTTP 401 `Authentication required` | `server/tests/lab-03/auth.api.test.ts` | `npm run test:server` | **Planned** |
| **API-06** | API | AC-08, R01, BR-01 | Logout call `/api/auth/logout` and subsequent call with old cookie | HTTP 204 on logout, cookie cleared; subsequent call returns HTTP 401 | `server/tests/lab-03/auth.api.test.ts` | `npm run test:server` | **Planned** |
| **API-07** | API | AC-22, R16, BR-06 | Access `/api/staff/tickets` as IT Staff vs. Requester vs. Admin | IT Staff: HTTP 200; Requester/Admin: HTTP 403 Forbidden | `server/tests/lab-03/staff-queue.api.test.ts` | `npm run test:server` | **Planned** |
| **API-08** | API | AC-23, R16 | Query staff queue with combined filters (Category + Priority + Status) | Returns strictly filtered tickets matching all predicates | `server/tests/lab-03/staff-queue.api.test.ts` | `npm run test:server` | **Planned** |
| **API-09** | API | AC-24, R16 | Sort queue by `itPriority` descending | Ordering: `HIGH` tickets appear before `MEDIUM`, before `LOW` | `server/tests/lab-03/staff-queue.api.test.ts` | `npm run test:server` | **Planned** |
| **API-10** | API | AC-25, R16 | Query queue pagination boundaries (page 1, 2, invalid page) | Total count correct; invalid page clamped; empty array on out of bounds | `server/tests/lab-03/staff-queue.api.test.ts` | `npm run test:server` | **Planned** |
| **API-11** | API | AC-27, R18 | Fetch staff ticket detail as IT Staff vs. Requester | IT Staff: HTTP 200 with operational data; Requester: HTTP 403 | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | `npm run test:server` | **Planned** |
| **API-12** | API | AC-28, R06, BR-11 | Claim unassigned ticket as IT Staff | Ticket owner updated to claiming user; version incremented | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | `npm run test:server` | **Planned** |
| **API-13** | API | AC-29, R06, BR-16 | Concurrent claim or update with stale `expectedVersion` | First request succeeds (HTTP 200); second request returns HTTP 409 | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | `npm run test:server` | **Planned** |
| **API-14** | API | AC-30, R07 | IT Staff updates `itPriority` on ticket | `itPriority` updated to new value; `requestedPriority` remains untouched | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | `npm run test:server` | **Planned** |
| **API-15** | API | AC-31, R08, BR-14 | Transition status `NEW` -> `OPEN` vs. `NEW` -> `RESOLVED` | `NEW` -> `OPEN` succeeds (200); `NEW` -> `RESOLVED` rejected (400) | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | `npm run test:server` | **Planned** |
| **API-16** | API | AC-33, R09, BR-17 | Requester invokes `/api/tickets/:id/appears-resolved` | Sets `appearsResolvedAt` and actor; formal status remains unchanged | `server/tests/lab-03/requester-regression.api.test.ts` | `npm run test:server` | **Planned** |
| **API-17** | API | AC-34, R10 | Post and read public comments | Public comments returned for own Requester, Staff, and Admin | `server/tests/lab-03/comments-notes.api.test.ts` | `npm run test:server` | **Planned** |
| **API-18** | API | AC-36, R10 | Attempt `PATCH` or `DELETE` on a comment or internal note | HTTP 405 Method Not Allowed; entries are append-only | `server/tests/lab-03/comments-notes.api.test.ts` | `npm run test:server` | **Planned** |
| **API-19** | API | AC-37, R10 | Post comment with `<script>alert(1)</script>` | Content sanitized/escaped; rendered safely as text | `server/tests/lab-03/comments-notes.api.test.ts` | `npm run test:server` | **Planned** |
| **API-20** | API | AC-39, R19 | Admin queries `/api/admin/users` with name search | Returns matching users with role badges and active statuses | `server/tests/lab-03/users-admin.api.test.ts` | `npm run test:server` | **Planned** |
| **API-21** | API | AC-40, R20 | Admin creates new user with temporary credentials | HTTP 201; password hashed; `mustChangePassword: true` | `server/tests/lab-03/users-admin.api.test.ts` | `npm run test:server` | **Planned** |
| **API-22** | API | AC-41, R21, BR-18 | Admin creates user with duplicate email (case-insensitive) | HTTP 409 Conflict with message `An account with this email exists` | `server/tests/lab-03/users-admin.api.test.ts` | `npm run test:server` | **Planned** |
| **API-23** | API | AC-42, R20 | Admin edits user name, department, role | HTTP 200; updated profile returned; passwordHash untouched | `server/tests/lab-03/users-admin.api.test.ts` | `npm run test:server` | **Planned** |
| **API-24** | API | AC-43, R21, BR-19 | Admin attempts self-deactivation (`isActive: false` on own ID) | HTTP 400 Bad Request; self-deactivation blocked | `server/tests/lab-03/users-admin.api.test.ts` | `npm run test:server` | **Planned** |
| **API-25** | API | AC-44, R21, BR-20 | Admin attempts deactivating or demoting the sole active Admin | HTTP 400 Bad Request; last-admin protection blocked | `server/tests/lab-03/users-admin.api.test.ts` | `npm run test:server` | **Planned** |
| **API-26** | API | AC-45, R21, BR-21 | Admin deactivates an IT Staff member with assigned tickets | User deactivated; owned tickets have `ticketOwnerId` set to null | `server/tests/lab-03/users-admin.api.test.ts` | `npm run test:server` | **Planned** |
| **API-27** | API | AC-46, R20 | Admin resets initial password for a user | HTTP 204; active sessions revoked; forced change on next login | `server/tests/lab-03/users-admin.api.test.ts` | `npm run test:server` | **Planned** |
| **SEC-01** | Security | AC-03, R04 | Requester sends spoofed `X-Requester-Id: 2` with session of User 1 | Server ignores header; ticket created under User 1 | `server/tests/lab-03/authorization.api.test.ts` | `npm run test:server` | **Planned** |
| **SEC-02** | Security | AC-04, R11, BR-08 | Requester calls `/api/tickets/:id/internal-notes` directly | HTTP 403 Forbidden; zero note content or existence leaked | `server/tests/lab-03/authorization.api.test.ts` | `npm run test:server` | **Planned** |
| **SEC-03** | Security | AC-09, R01, BR-04 | 6 failed logins within 5 minutes for same account | 6th attempt returns HTTP 429 Too Many Requests with `Retry-After` | `server/tests/lab-03/auth.api.test.ts` | `npm run test:server` | **Planned** |
| **SEC-04** | Security | AC-10, R15 | State-changing mutation sent without valid CSRF / Origin | HTTP 403 Forbidden; CSRF validation failed | `server/tests/lab-03/authorization.api.test.ts` | `npm run test:server` | **Planned** |
| **SEC-05** | Security | AC-11, R01 | Deactivated user attempts API call with previously active cookie | HTTP 401 Unauthorized; session immediately rejected | `server/tests/lab-03/authorization.api.test.ts` | `npm run test:server` | **Planned** |
| **SEC-06** | Security | AC-20, R05 | Requester attempts downloading attachment belonging to another user | HTTP 404 Not Found; zero file bytes served | `server/tests/lab-03/authorization.api.test.ts` | `npm run test:server` | **Planned** |
| **SEC-07** | Security | AC-32, R08, BR-09 | Requester sends `PATCH /api/tickets/:id` attempting to set `RESOLVED` | HTTP 403 Forbidden; operational mutation blocked | `server/tests/lab-03/authorization.api.test.ts` | `npm run test:server` | **Planned** |
| **SEC-08** | Security | AC-35, R11 | Requester fetches ticket detail via `/api/tickets/:id` | Response JSON contains zero `internalNotes` keys | `server/tests/lab-03/authorization.api.test.ts` | `npm run test:server` | **Planned** |
| **SEC-09** | Security | AC-47, R03 | Requester or Staff calls `/api/admin/users` | HTTP 403 Forbidden; access denied | `server/tests/lab-03/authorization.api.test.ts` | `npm run test:server` | **Planned** |
| **SEC-10** | Security | AC-52, R15 | Trigger unhandled error or not-found resource | Response never returns SQL syntax, stack trace, or secrets | `server/tests/lab-03/authorization.api.test.ts` | `npm run test:server` | **Planned** |
| **UNIT-01** | Unit | AC-06, BR-03 | Password validator testing min (12), max (128), whitespace, identical | Rejects <12, rejects new === current, accepts 12+ with spaces | `server/tests/lab-03/password.unit.test.ts` | `npm run test:server` | **Planned** |
| **UNIT-02** | Unit | AC-31, BR-14 | State machine validator testing all 64 transition pairs | Exactly permitted pairs return true; all other 56 pairs return false | `server/tests/lab-03/workflow.unit.test.ts` | `npm run test:server` | **Planned** |
| **UNIT-03** | Unit | AC-37, R10 | Comment content validator testing whitespace, bounds (1–2000) | Rejects empty/whitespace-only; trims properly; accepts valid bounds | `server/tests/lab-03/workflow.unit.test.ts` | `npm run test:server` | **Planned** |
| **MIG-01** | Migration | AC-14, R05, R12 | Verify legacy table counts, IDs, FKs, and `ticketNo` post-migration | All 5 requesters, 35 tickets, 1 attachment intact with identical IDs | `server/tests/lab-03/migration-regression.test.ts` | `npm run test:server` | **Planned** |
| **MIG-02** | Migration | AC-15, R12 | Apply migration chain on fresh DB and populated DB copy | Migration succeeds with zero data loss and clean schema drift | `server/tests/lab-03/migration-regression.test.ts` | `npm run test:server` | **Planned** |
| **MIG-03** | Migration | AC-16, R13 | Run seed script twice sequentially | Second run creates zero duplicates and preserves changed passwords | `server/tests/lab-03/migration-regression.test.ts` | `npm run test:server` | **Planned** |
| **MIG-04** | Migration | AC-17, R12 | Verify legacy requesters have provisioned credentials | Requester account logs in with default credential; prompted to change | `server/tests/lab-03/migration-regression.test.ts` | `npm run test:server` | **Planned** |
| **MIG-05** | Migration | AC-30, R07 | Check `itPriority` backfill on pre-migration tickets | Existing `itPriority` values preserved without overwrite | `server/tests/lab-03/migration-regression.test.ts` | `npm run test:server` | **Planned** |
| **REG-01** | Regression | AC-18, R05 | Requester creates ticket, lists tickets, views detail under auth | All operations succeed; ticket number generated; data isolated | `server/tests/lab-03/requester-regression.api.test.ts` | `npm run test:server` | **Planned** |
| **REG-02** | Regression | AC-19, R05 | Requester uploads attachment, downloads, soft-removes with reason | Attachment is soft-removed with strikethrough; download blocked | `server/tests/lab-03/requester-regression.api.test.ts` | `npm run test:server` | **Planned** |
| **UI-01** | UI | AC-05, R01 | Login screen renders validation errors on blank submit | Inline red errors for missing email and password; no API call | `client/tests/lab-03/Login.test.tsx` | `npm run test:client` | **Planned** |
| **UI-02** | UI | AC-12, R01, R02 | Login and Change Password show busy submit and error alerts | Form controls disabled during submit; failure surfaces alert banner | `client/tests/lab-03/Login.test.tsx` | `npm run test:client` | **Planned** |
| **UI-03** | UI | AC-13, R17 | AppShell displays user name, role badge, role nav; no dev selector | Navigation reflects logged-in role; selector element absent | `client/tests/lab-03/Login.test.tsx` | `npm run test:client` | **Planned** |
| **UI-04** | UI | AC-23, R16 | Staff Queue UI renders filter controls, sort toggles, debounced search | Filter changes trigger updated table query; search input debounced | `client/tests/lab-03/StaffTicketQueue.test.tsx` | `npm run test:client` | **Planned** |
| **UI-05** | UI | AC-26, R16, R22 | Staff Queue renders Loading, Empty, No-Results, and Error states | Distinct skeleton rows, empty message, clear filter action, retry | `client/tests/lab-03/StaffTicketQueue.test.tsx` | `npm run test:client` | **Planned** |
| **UI-06** | UI | AC-27, R18 | Staff Detail displays read-only info vs. operational panels | Requester data read-only; claim/status/priority editable | `client/tests/lab-03/StaffTicketDetail.test.tsx` | `npm run test:client` | **Planned** |
| **UI-07** | UI | AC-31, R08 | Status dropdown displays only permitted next states with confirm modal | Only valid transitions in select; modal appears on terminal states | `client/tests/lab-03/StaffTicketDetail.test.tsx` | `npm run test:client` | **Planned** |
| **UI-08** | UI | AC-37, R10 | Public comments and internal notes rendered in separate tabs | Internal notes tab has yellow highlight; drafts are independent | `client/tests/lab-03/StaffTicketDetail.test.tsx` | `npm run test:client` | **Planned** |
| **UI-09** | UI | AC-39, R19 | Admin User Management displays user table with search | Search input filters table rows by name/email | `client/tests/lab-03/UserManagement.test.tsx` | `npm run test:client` | **Planned** |
| **UI-10** | UI | AC-47, R03 | Non-admin tries opening User Management view | Access denied banner rendered; no user data displayed | `client/tests/lab-03/UserManagement.test.tsx` | `npm run test:client` | **Planned** |
| **UI-11** | UI | AC-48, R22 | Admin user creation modal validation and busy states | Shows validation errors for blank fields; spinner on submission | `client/tests/lab-03/UserManagement.test.tsx` | `npm run test:client` | **Planned** |
| **UI-12** | UI | AC-52, R15 | Safe UI error presentation on API 500 failure | Friendly toast/banner rendered without technical dumps | `client/tests/lab-03/StaffTicketDetail.test.tsx` | `npm run test:client` | **Planned** |
| **VIS-01** | Visual | AC-49, R22 | Major screens desktop/tablet/mobile viewport inspection | No clipped text, no overlapping elements, zero horizontal scroll | `client/tests/lab-03/Responsive.style.test.tsx` | `npm run test:client` | **Planned** |
| **VIS-02** | Visual | AC-50, R17 | Zen Green tokens, status badges, and typography verification | Badges match exact tokens; primary button uses `#2D6A4F` | `client/tests/lab-03/Responsive.style.test.tsx` | `npm run test:client` | **Planned** |
| **A11Y-01** | A11y | AC-51, R22 | Keyboard navigation, focus rings, associated labels, touch targets | Focus rings visible; touch targets $\ge 44\text{px}$; inputs have labels | `client/tests/lab-03/Responsive.style.test.tsx` | `npm run test:client` | **Planned** |
| **E2E-01** | E2E | AC-01, AC-07, AC-13 | Valid login, view dashboard, logout flow | User logs in, sees name/role in shell, logs out, redirected to `/login` | `e2e/lab-03/authentication.spec.ts` | `playwright test` | **Planned** |
| **E2E-02** | E2E | AC-02, R02 | Forced initial password change flow | User logs in with temporary password, forced to change, then accesses app | `e2e/lab-03/authentication.spec.ts` | `playwright test` | **Planned** |
| **E2E-03** | E2E | AC-08, R01 | Invalidate session on logout and verify back navigation blocked | After logout, pressing browser back button does not reveal data | `e2e/lab-03/authentication.spec.ts` | `playwright test` | **Planned** |
| **E2E-04** | E2E | AC-12, R01 | Login error flows (wrong password, inactive account) | Displays accessible error banner without page crash | `e2e/lab-03/authentication.spec.ts` | `playwright test` | **Planned** |
| **E2E-05** | E2E | AC-13, R03 | Role-based navigation routing (Requester, Staff, Admin) | Each role lands on designated view (My Tickets, Queue, Users) | `e2e/lab-03/authentication.spec.ts` | `playwright test` | **Planned** |
| **E2E-06** | E2E | AC-18, R05 | Requester happy path: create ticket with attachment | Ticket appears in My Tickets; ticket number displayed | `e2e/lab-03/requester-regression.spec.ts` | `playwright test` | **Planned** |
| **E2E-07** | E2E | AC-19, R05 | Attachment upload, download, and soft-remove flow | Active attachment downloadable; soft-remove shows reason dialog | `e2e/lab-03/requester-regression.spec.ts` | `playwright test` | **Planned** |
| **E2E-08** | E2E | AC-21, R05 | Account switch: User A logs out, User B logs in | User B cannot view or search User A's tickets | `e2e/lab-03/requester-regression.spec.ts` | `playwright test` | **Planned** |
| **E2E-09** | E2E | AC-26, R16 | Staff Queue search, filter combinations, and pagination | Queue updates smoothly; shows no-results state on unmatched query | `e2e/lab-03/staff-ticket-flow.spec.ts` | `playwright test` | **Planned** |
| **E2E-10** | E2E | AC-33, R09 | Requester flags Problem Appears Resolved | Alert surfaces in Staff detail; ticket status remains `IN_PROGRESS` | `e2e/lab-03/staff-ticket-flow.spec.ts` | `playwright test` | **Planned** |
| **E2E-11** | E2E | AC-38, R18 | Complete IT Staff workflow: Queue -> Claim -> Priority -> Comment -> Resolve | Ticket progressed to `RESOLVED` with public explanation | `e2e/lab-03/staff-ticket-flow.spec.ts` | `playwright test` | **Planned** |
| **E2E-12** | E2E | AC-40, R20 | Admin provisions new user account and verifies login | Newly created user signs in and is prompted for password change | `e2e/lab-03/user-administration.spec.ts` | `playwright test` | **Planned** |
| **E2E-13** | E2E | AC-46, R20 | Admin resets user password | User's active session terminated; must sign in with new temporary secret | `e2e/lab-03/user-administration.spec.ts` | `playwright test` | **Planned** |
| **E2E-14** | E2E | AC-48, R21 | Admin user management safety guards (self-deactivate blocked) | Toggle disabled on own row; attempt returns inline warning | `e2e/lab-03/user-administration.spec.ts` | `playwright test` | **Planned** |
| **DOC-01** | Doc | AC-53, R23, R24 | Verify all 56 ACs have mapped tests and actual file paths | All 56 ACs traceable in `docs/lab-03/tests.md` with zero unmapped criteria | `docs/lab-03/tests.md` | Manual check | **Planned** |
| **WORK-01** | Workflow | AC-54, R25 | Verify git branch history, PR peer review records, and staging merges | Feature branches target `lab3-staging`; `reviewer.md` complete | `docs/lab-03/reviewer.md` | `git log --graph` | **Planned** |
| **RELEASE-01** | Release | AC-55, R28 | Full test suite execution on clean checkout of final `main` | Server, client, responsive, and E2E suites pass 100% on final HEAD SHA | Terminal full run | `npm run test:all` | **Planned** |
| **SUB-01** | Submission | AC-56, R28 | Verify single submission PDF contains Answer Part 1 through 9 | PDF verified with all 9 headings, functional links, and legible screenshots | `docs/lab-03/submission.pdf` | Visual inspection | **Planned** |
