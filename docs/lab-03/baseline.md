# TokTickIT Lab 3 — Phase P00 Baseline Assessment & Audit

**Execution Date:** 2026-09-10T14:46:00+07:00  
**Repository Branch:** `feature/13-lab2-docs-submission`  
**Current HEAD Commit SHA:** `1f04d49ff1cb8e4d1090e6a656dd470c20658ab2`  
**Working Tree State:** Clean with respect to tracked files; 9 untracked files/directories present.

---

## 1. Git & Working Tree State

### 1.1 Branch & Commit Information
- **Branch:** `feature/13-lab2-docs-submission` (Tracking `origin/feature/13-lab2-docs-submission`)
- **Last Commit:** `1f04d49 docs(submission): add reviewer.md, ai-use.md, and Phase 9 audit records (Issue #31)`
- **Working Tree Porcelain Status:**
  ```text
  ?? .antigravityrules
  ?? ANTIGRAVITY_LAB3_RULES_ADDENDUM.md
  ?? docs/lab-02/create-ticket-context.png
  ?? docs/lab-02/evidence/
  ?? docs/lab-02/git-graph.png
  ?? docs/lab-02/requester-change-action.png
  ?? docs/lab-02/requester-selection.png
  ?? docs/lab-02/ticket-created-success.png
  ?? docs/lab-03/
  ```

### 1.2 Untracked File Assessment
- **Lab 2 Submission Evidence:**
  - `docs/lab-02/*.png` and `docs/lab-02/evidence/git-graph.png`: Screenshots intended for final Lab 2 submission (Issue #31).
  - *Recommendation:* Commit these files to `feature/13-lab2-docs-submission` and open a PR into `lab2-staging` before creating `lab3-staging`.
- **Lab 3 Instruction Files:**
  - `.antigravityrules`: Coding agent pipeline for Lab 3.
  - `ANTIGRAVITY_LAB3_RULES_ADDENDUM.md`: Preservation and evidence rules.
  - `docs/lab-03/PHASES.md`: 15-phase overview.

---

## 2. Fresh Verification Runs (Current Working Tree)

All tests reported in this section were executed on the current working tree on 2026-09-10. These are **fresh, newly executed runs** and are explicitly separated from historical test logs.

| Suite / Command | Scope | Result | Passed / Total | Duration | Exit Code | Raw Log Reference |
|---|---|---|---|---|---|---|
| `npm run test:server` | Server Unit & API tests | **PASS** | 104 / 104 (14 files) | 5.31s | 0 | Task-75 / direct run |
| `npm run test:client` | Client Unit & Component tests | **PASS** | 37 / 37 (8 files) | 8.82s | 0 | Task-162 log |
| `npm --prefix server run build` | Server TypeScript compilation (`tsc`) | **PASS** | Complete | 6.0s | 0 | Direct shell |
| `npm --prefix client run build` | Client build (`tsc && vite build`) | **PASS** | Complete | 9.0s | 0 | Direct shell |
| `npm run test:e2e` | Playwright E2E flows | **BLOCKED** | Not Run | N/A | N/A | Safety Gate: See §4 |

### Summary of Passed Test Files (Server)
1. `tests/lab-02/my-tickets.api.test.ts` (8 tests)
2. `tests/lab-02/attachments.api.test.ts` (19 tests)
3. `tests/lab-02/ownership-hardening.api.test.ts` (37 tests)
4. `tests/lab-02/create-ticket.api.test.ts` (11 tests)
5. `tests/lab-02/ticket-detail.api.test.ts` (5 tests)
6. `tests/lab-02/requester-middleware.api.test.ts` (7 tests)
7. `tests/lab-02/safe-filename.unit.test.ts` (2 tests)
8. `tests/lab-02/ticket-number.unit.test.ts` (4 tests)
9. `tests/lab-02/reference-data.api.test.ts` (4 tests)
10. `tests/lab-02/validation.unit.test.ts` (1 test)
11. `tests/lab-02/requesters.api.test.ts` (3 tests)
12. `tests/lab-02/pagination.unit.test.ts` (1 test)
13. `tests/lab-01/health.test.ts` (1 test)
14. `tests/lab-01/categories.test.ts` (1 test)

### Summary of Passed Test Files (Client)
1. `tests/lab-01/App.test.tsx` (3 tests)
2. `tests/lab-02/RouteGuard.test.tsx` (4 tests)
3. `tests/lab-02/AppShell.test.tsx` (1 test)
4. `tests/lab-02/RequesterSelection.test.tsx` (4 tests)
5. `tests/lab-02/RequesterTicketDetail.test.tsx` (5 tests)
6. `tests/lab-02/AttachmentSection.test.tsx` (5 tests)
7. `tests/lab-02/MyTickets.test.tsx` (6 tests)
8. `tests/lab-02/CreateTicket.test.tsx` (9 tests)

---

## 3. Database Schema & Data Inventory

### 3.1 PostgreSQL Service
- **Instance:** Docker container `toktickit-db` (Port `5433 -> 5432`)
- **Database Name:** `toktickit`
- **Applied Migrations:**
  1. `20260811082549_add_category`
  2. `20260830151320_lab2_data_layer`

### 3.2 Schema Structure Verification
- **`Ticket` Model:**
  - `id`: `Int` (PK, autoincrement)
  - `ticketNo`: `String` (Unique, format `TKT-YYYY-NNNNNN`) — **Note:** Field is named `ticketNo`, not `ticketNumber`.
  - `summary`: `String`
  - `description`: `String`
  - `requestedPriority`: `Priority` (`LOW`, `MEDIUM`, `HIGH`)
  - `itPriority`: `Priority` — **Note:** Field already exists in Lab 2 schema!
  - `currentStatus`: `TicketStatus` — Currently contains only `NEW`, `IN_PROGRESS`, `RESOLVED`.
  - `requesterId`: `Int` (FK -> `RequesterUser.id`)
  - `categoryId`: `Int` (FK -> `Category.id`)
  - `relatedSystemId`: `Int` (FK -> `RelatedSystem.id`)
  - `ticketOwnerId`: `Int?` — **Note:** Field already reserved in Lab 2; no relation yet declared.
- **`RequesterUser` Model:**
  - `id`, `name`, `email` (Unique), `department`, `isActive`, `createdAt`, `updatedAt`
- **`Attachment` Model:**
  - `id`, `ticketId`, `fileName`, `storedFileName`, `fileSize`, `mimeType`, `uploadedByRequesterId`, `removedAt`, `removalReason`, `createdAt`

### 3.3 Live Data Counts (Read-Only Query)
- **`RequesterUser`:** 5 records (4 active, 1 inactive)
- **`Ticket`:** 35 records
  - All 35 records have `currentStatus = 'NEW'`
  - Priority distribution: 33 `HIGH / HIGH`, 2 `LOW / LOW`
- **`Attachment`:** 1 database record
- **`Category`:** 6 records
- **`RelatedSystem`:** 9 records
- **Physical Disk Storage (`server/uploads`):** 120 files present (119 orphaned test files from historical runs, 1 active file `1788614926412-e23c25-image0.jpg` of 202,106 bytes). All 120 files must be strictly preserved without deletion.

---

## 4. Test Safety & Cleanup Audit (Gate Findings)

### 4.1 Findings on Existing Cleanup Mechanisms
1. **Server API Tests (`server/tests/lab-02/`):**
   - `attachments.api.test.ts`, `my-tickets.api.test.ts`, `ownership-hardening.api.test.ts`, `ticket-detail.api.test.ts`:
     All use explicit per-test ID cleanup (`where: { id: { in: createdIds } }`), which satisfies the strict cleanup rule.
   - `create-ticket.api.test.ts`:
     Does **not** clean up tickets created in `API-01`. These records remain in the shared database.
2. **Playwright E2E (`e2e/lab-02/requester-ticket-flow.spec.ts`):**
   - Tracks created ticket IDs in `createdTicketIds` and deletes only those IDs in `afterAll`.
   - **Critical Safety Risk:** Currently runs against `server/.env` connecting to `postgresql://localhost:5433/toktickit`. Running E2E flows directly on the shared development database risks modifying or polluting live seed data if tests abort before recording IDs.
   - Physical attachments in E2E tests are written directly to `server/uploads/` instead of an isolated test directory.

### 4.2 Gate Status: BLOCKED on E2E Execution
Per user instructions and `ANTIGRAVITY_LAB3_RULES_ADDENDUM.md`:
> *"ถ้า test setup/cleanup ยังไม่ปลอดภัย ให้รายงาน Blocked และเสนอ patch ห้ามแก้ไฟล์เดิมเองเพื่อให้รันได้"*

Running the E2E suite is marked **BLOCKED** until an isolated disposable test database environment and isolated test upload directory are configured in Phase P02/P03 via an approved patch.

---

## 5. Summary of Completed vs. Missing Features

| Feature Area | Status in Current Checkout | Notes |
|---|---|---|
| Lab 1 Category & Health | **Implemented & Verified** | Unit and API tests passing |
| Lab 2 Requester Ticket Creation | **Implemented & Verified** | Full validation, ticket number generation, reference data |
| Lab 2 My Tickets & Search/Filter | **Implemented & Verified** | Paginated query, sorting, status/priority filtering |
| Lab 2 Requester Ticket Detail | **Implemented & Verified** | Read-only view, unassigned indicator, ownership protection |
| Lab 2 Attachment Lifecycle | **Implemented & Verified** | Upload, download, safe filename, soft remove with reason |
| Lab 2 Dev Requester Selector | **Implemented & Temporary** | To be decommissioned and replaced with authenticated identity |
| Lab 3 Auth (Login/Logout/Me) | **Missing** | To be implemented in P04 |
| Lab 3 Mandatory Password Change | **Missing** | To be implemented in P04 |
| Lab 3 Role-Based Authorization | **Missing** | To be implemented in P05 |
| Lab 3 Authenticated Shell | **Missing** | To be implemented in P06 |
| Lab 3 IT Staff Queue | **Missing** | To be implemented in P08 |
| Lab 3 Staff Operations (Claim/Status) | **Missing** | To be implemented in P09 |
| Lab 3 Public Comments / Internal Notes | **Missing** | To be implemented in P10 |
| Lab 3 User Administration | **Missing** | To be implemented in P11 |
