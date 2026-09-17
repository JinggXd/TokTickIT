# TokTickIT Lab 3 — Implementation Log

This log records chronological actions, commands executed, exit codes, and evidence across all phases of Lab 3.
Entries dated 2026-09-10 are historical records of that working tree, not current verification.
The 2026-09-13 correction below supersedes the earlier P01/P02 completion and traceability
claims. Preserve the history; do not use its assertions as approval or product Pass evidence.

**Current state (2026-09-16):** F1 / P02 In progress — isolation harness partially implemented;
server baseline passed, but E2E isolation/cleanup and pre-import guard review fixes remain.
Docker/test database blocker is resolved. F2–F5 (P03–P14) remain Planned. Use
[PHASES.md](PHASES.md) for the five-major-phase plan; P00–P14 are retained work-package IDs.
Older entries below describe their state at the time and are superseded by the latest entry.

---

## Phase P00 — Baseline Assessment & Pre-flight Inspection

**Date:** 2026-09-10
**Operating System:** Windows
**Shell:** PowerShell
**Active Git Branch:** `feature/13-lab2-docs-submission`
**HEAD Commit SHA:** `1f04d49ff1cb8e4d1090e6a656dd470c20658ab2`

---

### Command Execution Log (P00)

#### 1. Repository Status & Git Branch Verification
- **Command:** `git status`
  - **Timestamp:** 2026-09-10T14:27:49+07:00
  - **Exit Code:** 0
  - **Result:** Branch `feature/13-lab2-docs-submission` up to date with origin. Detected 9 untracked items (`.antigravityrules`, `ANTIGRAVITY_LAB3_RULES_ADDENDUM.md`, 5 PNG screenshots in `docs/lab-02/`, `docs/lab-02/evidence/`, and `docs/lab-03/`).
- **Command:** `git rev-parse HEAD`
  - **Timestamp:** 2026-09-10T14:44:10+07:00
  - **Exit Code:** 0
  - **Output:** `1f04d49ff1cb8e4d1090e6a656dd470c20658ab2`
- **Command:** `git status --porcelain`
  - **Timestamp:** 2026-09-10T14:44:19+07:00
  - **Exit Code:** 0
  - **Result:** Tracked working tree clean; no modified files.

#### 2. Test Suite Baseline Execution (Fresh Runs)
- **Command:** `npm run test:server`
  - **Timestamp:** 2026-09-10T14:46:05+07:00
  - **Exit Code:** 0
  - **Duration:** 5.31s
  - **Results:** 14 test files passed, 104 tests passed, 0 failed.
- **Command:** `npm run test:client`
  - **Timestamp:** 2026-09-10T14:46:23+07:00
  - **Exit Code:** 0
  - **Duration:** 8.82s
  - **Results:** 8 test files passed, 37 tests passed, 0 failed.
- **Command:** `npm --prefix server run build`
  - **Timestamp:** 2026-09-10T14:46:40+07:00
  - **Exit Code:** 0
  - **Result:** TypeScript server build (`tsc`) succeeded with no type errors.
- **Command:** `npm --prefix client run build`
  - **Timestamp:** 2026-09-10T14:46:48+07:00
  - **Exit Code:** 0
  - **Result:** Client production build (`tsc && vite build`) succeeded in 1.38s.
- **Action on `npm run test:e2e`:**
  - **Status:** **BLOCKED**
  - **Rationale:** Playwright E2E configuration currently targets the live development database on port 5433 without an isolated disposable test database. Per user instructions and `ANTIGRAVITY_LAB3_RULES_ADDENDUM.md`, tests with safety risks to live data are blocked until a test isolation patch is approved.

#### 3. Database & Schema Inspection
- **PostgreSQL Container:** `toktickit-db` (Port 5433)
- **Migration Chain Verified:**
  - `20260811082549_add_category`
  - `20260830151320_lab2_data_layer`
- **Live Record Counts (Read-Only Query via scratch script):**
  - `RequesterUser`: 5 records
  - `Ticket`: 35 records (All `currentStatus = 'NEW'`; 33 `HIGH`, 2 `LOW`)
  - `Attachment`: 1 database record
  - `Category`: 6 records
  - `RelatedSystem`: 9 records
- **Disk Uploads Directory (`server/uploads`):**
  - 120 files present. All preserved without modification.

#### 4. Document Creation
- **File Created:** [`docs/lab-03/baseline.md`](file:///d:/toktickit/docs/lab-03/baseline.md)
  - Purpose: Full record of working tree, fresh test runs, schema inventory, and safety gate audit.
- **File Created:** [`docs/lab-03/legacy-change-proposals.md`](file:///d:/toktickit/docs/lab-03/legacy-change-proposals.md)
  - Purpose: Formal patch proposals LCP-01 through LCP-05 for anticipated legacy modifications.
- **File Created:** [`docs/lab-03/implementation-log.md`](file:///d:/toktickit/docs/lab-03/implementation-log.md)
  - Purpose: Chronological execution log.

---

### P00 Gate Summary & Review Request
- **Gate Status:** Complete in Read-Only Mode.
- **Legacy Files Modified:** Exactly 0.
- **Commit/Push/Merge Executed:** None.
- **Review:** Baseline and proposals reviewed and approved by user.

---

## Phase P01 — Engineering Contracts Specification

**Date:** 2026-09-10
**Operating System:** Windows
**Shell:** PowerShell
**Active Git Branch:** `docs/lab3-contract` (Branched from `lab3-staging`, based on `main` `b94642a`)

### Command Execution Log (P01)
1. **Lab 2 Evidence Staging & Push:**
   - Staged 6 evidence screenshots in `docs/lab-02/`.
   - Committed `a08a87f docs(submission): add final submission evidence screenshots and git-graph (Issue #31)`.
   - Pushed `feature/13-lab2-docs-submission` to origin.
   - Remote PR #32 merged into `lab2-staging`; PR #33 merged into `main` (`b94642a`).
2. **Branch Management:**
   - `git checkout main && git pull origin main` (Synchronized with `b94642a`).
   - `git checkout -b lab3-staging` (Created Lab 3 staging baseline).
   - `git checkout -b docs/lab3-contract` (Active feature branch for P01 contracts).
3. **Contract Document Generation:**
   - **File Created:** [`docs/lab-03/specification.md`](file:///d:/toktickit/docs/lab-03/specification.md)
     - 11 formal sections per Lab 3 sheet §9.
     - Functional Requirements R01–R28, Business Rules BR-01–BR-21.
     - Acceptance Criteria AC-01–AC-56.
   - **File Created:** [`docs/lab-03/api-spec.md`](file:///d:/toktickit/docs/lab-03/api-spec.md)
     - Exact REST routes, query params, request/response JSON schemas, exact error envelopes.
     - Authentication, RBAC, Requester scoping, Staff Queue/Operations, Admin User Management, and Concurrency 409 schemas.
   - **File Created:** [`docs/lab-03/ui-spec.md`](file:///d:/toktickit/docs/lab-03/ui-spec.md)
     - Zen Green tokens reuse, 5 main screens, authenticated shell regression.
     - Responsive breakpoints (Desktop ≥992px, Tablet 768–991px, Mobile <768px).
     - Component states matrix (7 states: Loading, Empty, No-Results, Validation, Submitting, Success, Failure).

### P01 Gate Summary
- **Historical gate claim (superseded 2026-09-13):** Complete. Contracts created, frozen, and ready for user review. Current P01 status is revised documents pending review.
- **Legacy Files Modified:** 0 files modified.
- **Ready for Next Phase:** P02 (Test DD Plan & Traceability Matrix in `docs/lab-03/tests.md`).

---

## Phase P02 — Test-Driven Development Plan (Test DD)

**Date:** 2026-09-10
**Operating System:** Windows
**Shell:** PowerShell
**Active Git Branch:** `docs/lab3-contract`

### Command Execution Log (P02)
1. **Traceability Matrix & Test Strategy Authoring:**
   - **File Created:** [`docs/lab-03/tests.md`](file:///d:/toktickit/docs/lab-03/tests.md)
     - Complete mapping of **AC-01 through AC-56** to planned test paths.
     - Test classifications: API (27), Security (10), Unit (3), Migration (5), Regression (2), UI (12), Visual (2), A11y (1), E2E (14), Documentation/Workflow/Release (4).
     - Defined test isolation rules: Dedicated disposable test database (`toktickit_test`), dedicated upload directory (`test-uploads`), and strict per-test ID tracking.
     - All initial test statuses explicitly set to `Planned`. Zero fabricated `Pass` statuses.
2. **Review & Cross-Check:**
   - **Historical claim, corrected 2026-09-13:** Reported 100% alignment with specification/API. Audit found missing AC-18, shifted mappings and conflicting contracts; this was not a valid completion check.

### P02 Gate Summary
- **Gate Status (corrected 2026-09-13):** Test plan revised; harness Blocked. The earlier Complete label was premature because isolation was only proposed.
- **Legacy Files Modified:** 0 files modified.
- **Next Phase:** P03 remains gated on contract review, approved migration scope and verified LCP-01/HARNESS-01. Do not proceed from documentation alone.



---

## 2026-09-13 — P01/P02 contract audit corrections

- **Request:** “แก้ให้หน่อยได้ไหมเดี๋ยวpushไปใหม่” following the Lab 3 pipeline audit.
- **Scope:** Correct the reviewed documentation/pipeline/rules; leave commit/push to the user.
- **Branch / base HEAD:** docs/lab3-contract / 1b2e66426186ad6b5eff4eae810a9942901a86fe.
  Started with a clean working tree. Verification below ran on the uncommitted documentation
  changes, not a new commit. GitHub Issue/PR/reviewer state was not queried or changed.
- **Status:** Documentation corrections verified; P01 review pending, P02 harness Blocked.
  No product AC or planned Lab 3 automated test is claimed passing.

### Files changed and resulting decisions

| File | Change / requirement |
|---|---|
| AGENTS.md | Applied LCP-05: separate Lab 2/Lab 3 contract, exclusions and staging rules; preserve safety and reviewer merge boundaries |
| .antigravityrules | Remove stale duplicated AC/API decisions; use the four current contracts as the authority; keep phase order and rubric Parts 1–9 |
| docs/lab-03/PHASES.md | Record resolved decisions and actual pending gates; P02 is not complete without the harness |
| docs/lab-03/specification.md | Restore missing AC-18 for seed inventory; retain existing AC-19–56 identifiers; explicit role matrix, migration/index/seed choices, Admin read-only access and release DoD |
| docs/lab-03/api-spec.md | Preserve Lab 2 requester fields/query/DTO/403/410/409; complete detail/owner/attachment/Admin read contracts; session/CSRF/hash/query/error decisions |
| docs/lab-03/ui-spec.md | Reuse actual --zg-* palette and existing badge pairs; remove Department management; add role/error/mode and real-browser evidence requirements |
| docs/lab-03/tests.md | Repair semantic mappings; 56 ACs covered by 107 Planned rows, reverse matrix and pending evidence columns; add missing owner/admin/seed/communication/feedback coverage |
| docs/lab-03/legacy-change-proposals.md | Correct LCP-01 to cover actual Prisma/upload/test startup paths; mark LCP-05 docs applied, all runtime proposals unapplied |
| docs/lab-03/implementation-log.md | Correct premature historical claims explicitly and record this session |
| artifacts/lab-03/contract-review-20260913/client.txt | New raw output of the existing client suite, stored outside the ignored test-results directory |

### Verification actually executed

| Command / check | Result | Evidence |
|---|---|---|
| git status --short --branch; git rev-parse HEAD | docs/lab3-contract; clean before edits; base SHA above | Tool output in this session |
| Python read-only contract consistency check | Exit 0: 56 unique AC definitions, all 56 mapped, 107 unique Planned rows, no unknown AC IDs, nine table columns per row | Check output in this session; these are document checks, not product test results |
| Python JSON and matrix check | Exit 0: 64 fenced JSON examples parse; 17 permitted + 47 rejected status pairs; all existing root hex color tokens present in UI spec | Check output in this session |
| npm run test:client | Exit 0; 8 files, 37 passed, 0 failed, 0 skipped; started 18:12:35 Asia/Bangkok, duration 8.34s | artifacts/lab-03/contract-review-20260913/client.txt |
| git diff --check | Exit 0 after whitespace correction | Tool output in this session |
| npm run test:server / npm run test:e2e | NOT RUN — current harness still targets shared DB/uploads and E2E overwrites existing screenshots; LCP-01/HARNESS-01 required first | Current config inspection and legacy-change-proposals.md |
| Server/client builds | NOT RUN — no application/build/dependency files changed | Diff scope |

Client results are Lab 1–2 regression evidence only. Planned Lab 3 tests remain unimplemented;
no Red/Green feature claim was created for this documentation correction. Historical test
results from 2026-09-10 were not reused as current results.

### Remaining gates and next work

1. Review the revised P01 contract and P02 plan; keep specification/test history before features.
2. Produce and approve the executable LCP-01 patch, prove fail-closed isolation with HARNESS-01,
   and then run the full safe baseline before P03 migration on disposable copies.
3. Implement P03–P12 per Issue using actual Red/Green evidence; obtain separate dependency and
   migration patch approval. Existing code, applied migrations, database and uploads were unchanged.
4. Peer review/merge, final-main suites/SHA, screenshots/checklists, reviewer.md, ai-use.md and
   final submission PDF remain pending. No commit, push, PR update or merge was performed.

---

## 2026-09-16 — P02 isolation harness implementation (in progress)

- **Authorization:** The user asked the agent to continue the Lab 3 plan through implementation and
  to record actual work in this log. No commit, push, PR merge, shared-database change, or new
  dependency installation was authorized by this entry.
- **Branch / starting state:** `docs/lab3-contract`, clean before this implementation pass.

### Changes made

| Path | Change |
|---|---|
| `server/src/config/testEnvironment.ts` | New fail-closed test-target validator. It accepts only PostgreSQL database names `toktickit_test` or `toktickit_test_<suffix>`, requires a run ID, and resolves uploads only inside `server/test-uploads/<run-id>`. |
| `server/scripts/run-tests.mjs` | New server test launcher. It maps `DATABASE_URL_TEST` to `DATABASE_URL` before Vitest starts, enables test mode, creates one run-specific upload directory, then removes only that directory after the child process exits. |
| `server/tests/setup.ts`, `server/vitest.config.ts` | Every Vitest suite now invokes the guard before test imports exercise application/database code. |
| `server/tests/lab-03/test-environment.test.ts` | HARNESS-01 test written first: missing/unsafe development database URLs fail; an allowlisted test URL receives a contained upload path. |
| `server/src/app.ts` | Attachment storage now uses the guarded test directory in test mode and preserves `server/uploads` for normal runtime. |
| `server/scripts/run-test-server.mjs`, `playwright.config.ts` | Playwright now requires the same disposable database target, starts a dedicated server on port 3001 and client on 5174, and never reuses a developer server. |
| `.gitignore` | Ignores only generated `server/test-uploads/` content. |

### Commands actually run

| Command | Exit | Result |
|---|---:|---|
| `npx vitest run tests/lab-03/test-environment.test.ts` before implementation | 1 | Expected Red: module `src/config/testEnvironment` did not exist. |
| `DATABASE_URL_TEST=...toktickit_test... npm test -- tests/lab-03/test-environment.test.ts` in `server/` | 0 | Green: 1 file, 3 HARNESS-01 tests passed. This test does not connect to PostgreSQL. |
| `npx playwright test --list` with an allowlisted test URL | 0 | Playwright configuration loaded and listed 21 existing tests without starting services. |
| `npm run build` in `server/` | 0 | TypeScript build passed. |
| `git diff --check` | 0 | No whitespace errors. |

### Gate status and blocker

- **P02:** Implemented but **not fully verified**. The fail-closed guard has unit evidence, but the
  complete server/E2E suites have not run.
- **P03:** **Blocked on a verified disposable PostgreSQL service.** A read-only Docker check found
  that the Docker daemon is unavailable on this host. The agent did not fall back to the development
  database and did not create, migrate, seed, truncate, or delete any database.
- **Next safe action:** Configure `DATABASE_URL_TEST` to an accessible disposable database named
  `toktickit_test` (or `toktickit_test_<suffix>`), then apply migration/seed there and run the
  migration and regression suites. Authentication phases also require explicit approval to add the
  contract-required Argon2id package before implementation.

---

## 2026-09-16 — F1 / P02 status correction and five-phase plan update

- **Request:** Update PHASES.md and related files to group the plan into five major phases.
- **Branch / starting HEAD:** `feature/14-lab3-test-harness` / `06ada5d`; clean before these
  documentation edits. The working-tree documentation changes are not a new commit.
- **Scope:** Documentation only. Runtime fixes identified by the P02 review remain outstanding.

### Results from earlier work in this session (not rerun for this documentation change)

- After the user started Docker, the container `toktickit-db` was reachable. A database-list
  query showed only `toktickit`; `CREATE DATABASE toktickit_test` then succeeded.
- `npx prisma migrate deploy` with DATABASE_URL explicitly targeting `toktickit_test` applied
  the two existing Lab 2 migrations successfully. This was not a Lab 3 schema migration.
- `npm run prisma:seed` initially failed inside the sandbox with `uv_os_get_passwd ENOMEM`;
  the escalated retry on `toktickit_test` succeeded (4 categories, 7 systems, 5 requesters).
- `npm test` in server with DATABASE_URL_TEST targeting `toktickit_test` exited 0:
  15 files / 107 tests passed, duration 9.03 s, start 21:53:13. Evidence is the actual tool output
  earlier in this conversation; no separate raw-output artifact was saved for that run.
- The subsequent P02 review on `06ada5d` checked AC mapping (56 ACs, 107 test rows) and ran
  `npm --prefix server test -- tests/lab-03/test-environment.test.ts` with a nonconnecting,
  allowlisted dummy DB URL: exit 0, 3/3 passed, duration 248 ms, start 23:04:09.
  These pure tests did not connect to a database. No E2E run was attempted in that review.
- Local git history contains `d22b01a` (merge PR #35 from docs/lab3-contract). Reviewer identity,
  substantive comments/approval, current Issue links and harness PR state were not inspected
  on GitHub. Local history is not evidence that the harness has been reviewed or merged.

### Plan changes

| Files | Change |
|---|---|
| docs/lab-03/PHASES.md | Five major phases F1–F5, outcomes, retained P00–P14 work packages, current status and P02 fix checklist; Issue/PR/reviewer workflow throughout |
| AGENTS.md, .antigravityrules, ANTIGRAVITY_LAB3_RULES_ADDENDUM.md | Consistent major-phase/work-package naming; retain dependencies and reviewable Issues/PRs rather than requiring exactly five PRs |
| docs/lab-03/tests.md | Replace stale unimplemented/Docker-blocked status; mark HARNESS-01 In progress with partial evidence; preserve all 56 AC mappings and 107 test rows |
| docs/lab-03/legacy-change-proposals.md | Record LCP-01 as partially implemented with review fixes pending; preserve remaining proposals |
| docs/lab-03/implementation-log.md | Preserve historical entries and record latest actual status, evidence limits and plan regrouping |

F1=P00–P02; F2=P03–P06; F3=P07–P10; F4=P11–P12; F5=P13–P14.
This grouping does not remove any requirement, acceptance criterion, test or review gate.

### Outstanding P02 findings

1. E2E still hardcodes localhost:3000 and creates its own Prisma client without the server's
   test environment. Configure both worker and server before imports.
2. The guard runs in beforeAll after application imports; reject unsafe configuration before I/O.
3. Create-ticket fixtures lack cleanup; attachment/E2E cleanup references legacy upload paths
   and some errors are swallowed. Track created IDs/files immediately and fail visibly on cleanup errors.
4. Screenshots still target fixed Lab 2 evidence paths. Use Lab 3 run-specific output paths.
5. Three unit cases do not cover HARNESS-01 path rejection, environment mismatch, worker/runner
   integration or failed cleanup. Add meaningful coverage and verify deterministic fixture/clock support.

F1 (P00–P02) findings are addressed in the 2026-09-17 session below.
F2 / P03 is next after peer review and gate approval; no Lab 3 migration/auth code was added in this update.

---

## 2026-09-17 — Major Phase F1 (P00–P02) completion, P02 review fixes & documentation

- **Authorization:** User approved implementation plan for completing Major Phase F1, renaming the branch to `feature/f1-prep-and-test-harness`, fixing P02 review findings, and creating `whatihavedone1.md` and `ai1.md` / `aiused1.md` matching Lab 2 format.
- **Active Branch:** `feature/f1-prep-and-test-harness` (renamed from `feature/14-lab3-test-harness`).

### Changes made

| Path | Change |
|---|---|
| `server/src/config/testEnvironment.ts` | Exported `assertContained`, `validateApiEndpoint`, and `resolveApiBase` to establish a single source of truth for test configuration. |
| `server/tests/setup.ts` | Moved `requireTestEnvironment()` invocation out of `beforeAll` to module evaluation scope to fail-closed before any test file or application import runs. |
| `server/tests/lab-03/test-environment.test.ts` | Expanded HARNESS-01 coverage to 23 tests exercising real exported functions, run-specific containment, runtime Playwright CLI fail-closed checks, and runtime worker process environment propagation. |
| `playwright.config.ts` | Synchronized `TOKTICKIT_TEST_RUN_ID`, `TOKTICKIT_TEST_MODE`, `DATABASE_URL`, `DATABASE_URL_TEST`, `API_URL` (3001), `VITE_API_URL` (3001), and `SCREENSHOT_DIR` to runner `process.env` so worker processes receive identical environment. |
| `e2e/lab-02/requester-ticket-flow.spec.ts` | Imported and called `resolveApiBase` and `assertContained` directly from `server/src/config/testEnvironment.js` (eliminating duplicate helper code), added test DB guard for `PrismaClient`, strictly contained attachment cleanup to `runSpecificDir` (`server/test-uploads/<runId>`) with `assertContained` (omitting legacy `server/uploads` in test mode), and isolated screenshot output to `artifacts/lab-03/screenshots/<runId>`. |
| `docs/lab-03/whatihavedone1.md` | Documented all peer review fixes and maintained accurate in-progress status. |
| `docs/lab-03/ai1.md`, `docs/lab-03/aiused1.md` | Documented peer review feedback prompts and reflections. |
| `docs/lab-03/PHASES.md` | Maintained F1 status as `In progress — P02 review fixes applied; disposable DB verification pending`. |
| `docs/lab-03/tests.md` | Maintained `HARNESS-01` row as `In progress` (23 tests passed; full live DB run pending). |

### Commands actually run

| Command | Exit | Result |
|---|---:|---|
| `git branch -m feature/14-lab3-test-harness feature/f1-prep-and-test-harness` | 0 | Renamed local branch to represent Major Phase F1. |
| `DATABASE_URL_TEST=...toktickit_test... npm --prefix server test -- tests/lab-03/test-environment.test.ts` | 0 | 1 file, 24/24 HARNESS-01 tests passed (including Playwright CLI runtime checks, real Playwright worker env propagation without dist artifacts, strictly restricting webServer skipping to probe tests only, and simulated physical unlink failure). |
| `npm run test:client` | 0 | 8 files, 37/37 client tests passed in 8.90 s. |
| `npm --prefix server run build` | 0 | TypeScript compilation (`tsc`) succeeded with 0 errors. |
| `npm --prefix client run build` | 0 | Client production build succeeded in 0.78 s. |

### Gate status

- **Major Phase F1 (P00–P02):** **In progress — P02 review fixes applied**. 24 HARNESS-01 unit/integration tests passed; client suites passed (37/37); worker propagation verified via real Playwright CLI without build artifacts (`e2e/lab-03/worker-env.spec.ts`), webServer skip strictly restricted to probe tests (non-probe rejected), shared `cleanupAttachmentFiles` helper used across E2E and server tests, simulated physical unlink failure tested and verified not swallowed, API dev-port rejection and resolveApiBase protection, run-specific containment cleanup, and screenshot isolation implemented. Full server DB and Playwright E2E suites remain pending an active disposable PostgreSQL service on the host.
- **Major Phase F2 (P03–P06):** Planned next. Requires disposable DB verification and peer review before starting F2 data migration.
