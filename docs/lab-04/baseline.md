# TokTickIT Lab 4 — Baseline Assessment & Audit (L4-P00)

**Date:** 2026-09-25T20:42:00+07:00  
**Branch:** `main` (Tracking `origin/main`)  
**Commit SHA:** `baad45e09272d665bc0cf765236c456edcf0eff7` (`Merge pull request #45 from JinggXd/lab3-staging`)  
**Status:** Completed Baseline Audit & Safety Verification  

---

## 1. Git & Working Tree State

### 1.1 Branch & Commit Identification
- **Current Branch:** `main` (up to date with `origin/main`)
- **Base SHA:** `baad45e09272d665bc0cf765236c456edcf0eff7`
- **Recent Git Log:**
  - `baad45e` Merge pull request #45 from JinggXd/lab3-staging
  - `df9ad81` Merge pull request #43 from JinggXd/feature/f4-admin-and-verification
  - `7038238` test(lab-03): verify F3 and F4 full test suites on isolated test db and update tracking to Verified
  - `6f1f073` fix(auth): prevent change-password race against admin reset with row lock and optimistic match
  - `22bcb81` fix(auth): coordinate change-password vs reset, distinguish logout errors, and clear client auth state directly on self-revocation

### 1.2 Working Tree Modifications (Tracked vs Untracked)
- **Tracked Uncommitted Changes:**
  - `README.md`: Updates documenting Lab 3 test execution commands.
  - `docs/lab-03/PHASES.md`: Updated final status of F3–F5 to Merged/Completed.
  - `docs/lab-03/implementation-log.md`: Appended final verification logs for Lab 3 release.
  *(These files belong to the user's recent Lab 3 wrap-up and are preserved intact without reverting or staging).*
- **Untracked Directories & Artifacts:**
  - `artifacts/lab-03/f5-evidence-20260920/`, `artifacts/lab-03/final-main-20260925/`
  - `docs/lab-03/ai-use.md`, `docs/lab-03/reviewer.md`, `docs/lab-03/submission.pdf`, `docs/lab-03/f5-submission-checklist.md`, `docs/lab-03/visual-checklist.md`
  - `completeReport/`, `output/`, `tmp/`
  - `docs/lab-04/`: Contains `GEMINI-PIPELINE.md`, `GEMINI-START.md`, and `SE-Lab-4.pdf` (source requirements).

---

## 2. Test Environment Safety & Isolation Safeguards

### 2.1 Test Database Safeguards (`server/src/config/testEnvironment.ts`)
- **Database Name Enforcement:** Strict regex pattern `/^toktickit_test(?:_[a-z0-9_]+)?$/i`.
- **Fail-Closed Protection:** Rejects any execution against the main development database `toktickit` or any URL lacking `DATABASE_URL_TEST`.
- **Port Guard:** Explicitly refuses connections targeting dev port 3000 (test server runs on 3001).
- **Upload Directory Isolation:** Tests must provide `TOKTICKIT_TEST_RUN_ID` and files are strictly sandboxed inside `server/test-uploads/<runId>/`. Paths are validated with `assertContained` to prevent directory traversal.

### 2.2 Current Docker & Database Status
- **Docker Container Inspection (`docker ps -a`):**
  - Container ID: `0969efeae1d2`
  - Image: `postgres:16`
  - Name: `toktickit-db`
  - Port Mapping: `0.0.0.0:5433->5432/tcp`
  - Current Status: `Exited (255)`
- **Audit Decision:** In Phase F1 (Contract & Planning), no database mutations or migrations are applied. Database suites requiring active DB connection are marked **Blocked/Not Run** until Phase F2 starts with verified disposable DB environment.

---

## 3. Fresh Verification Suite Executions (2026-09-25)

| Suite / Command | Scope | Result | Passed / Total | Duration | Exit Code | Notes |
|---|---|---|---|---|---|---|
| `npm --prefix server run build` | Server TypeScript compilation (`tsc`) | **PASS** | Complete | ~3.5s | 0 | Clean build, 0 type errors |
| `npm --prefix client run build` | Client Vite & TypeScript build (`tsc && vite build`) | **PASS** | Complete | ~4.5s | 0 | Clean build, 0 type errors, 43 modules transformed |
| `npm run test:client` | Client Unit & Component tests (Vitest + RTL) | **PASS** | 82 / 82 (15 files) | 28.66s | 0 | Vitest run, all 15 suites passed |
| `npm --prefix server test -- tests/lab-03/test-environment.test.ts` | Test harness & runtime guard verification (HARNESS-01) | **PASS** | 24 / 24 (1 file) | 9.09s | 0 | Proves runtime fail-closed guard, ambient rejection, containment cleanup, Playwright worker propagation |
| `npm run test:server` | Server Unit & API tests (Vitest + Supertest) | **NOT RUN (BLOCKED)** | Requires DB | N/A | N/A | Docker container `toktickit-db` stopped; F1 does not start or mutate DB |
| `npm run test:e2e` | Playwright E2E suites | **NOT RUN (BLOCKED)** | Requires DB + Test Server | N/A | N/A | F1 planning phase only |

---

## 4. Current Schema Baseline (Lab 3 Inheritance)

### 4.1 Models Established in Lab 3
- **`User` (mapped to `RequesterUser`):** `id`, `name`, `email` (unique), `department`, `role` (`REQUESTER`, `IT_STAFF`, `ADMINISTRATOR`), `isActive`, `passwordHash`, `mustChangePassword`, `sessionVersion`, `createdAt`, `updatedAt`.
- **`Session`:** `id` (hash), `sessionVersion`, `csrfToken`, `userId`, `expiresAt`, `createdAt`.
- **`Category`:** `id`, `name` (unique), `isActive`, `createdAt`.
- **`RelatedSystem`:** `id`, `name` (unique), `isActive`, `createdAt`.
- **`Ticket`:** `id`, `ticketNo` (unique `TKT-YYYY-NNNNNN`), `summary`, `description`, `requestedPriority`, `itPriority`, `currentStatus` (8 enum values: `NEW`, `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `RESOLVED`, `CLOSED`, `REOPENED`, `CANCELLED`), `seedKey`, `requesterId`, `categoryId`, `relatedSystemId`, `ticketOwnerId`, `version`, `appearsResolvedAt`, `appearsResolvedById`, `createdAt`, `updatedAt`.
- **`Attachment`:** `id`, `ticketId`, `fileName`, `storedFileName`, `fileSize`, `mimeType`, `uploadedByRequesterId`, `removedAt`, `removalReason`, `createdAt`.
- **`PublicComment`:** `id`, `ticketId`, `authorId`, `body`, `createdAt`.
- **`InternalNote`:** `id`, `ticketId`, `authorId`, `body`, `createdAt`.

### 4.2 Increments Required for Lab 4
- **`ActionTaken` Model:** To be added in L4-P03 (Parent-child relationship with `Ticket`).
- **Status/Workflow Engine:** Transition rules and resolution gate logic at backend.
- **Dashboards:** Concise aggregation endpoints for Requester and IT Staff/Admin without fetching full collections.
