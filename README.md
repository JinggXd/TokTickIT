# TokTickIT

TokTickIT is the CPE 334 Multi-Role IT Ticketing System (Lab 4), extending the requester and staff workflows with Actions Taken, a ticket resolution gate, and role dashboards.

## Roles & Features

- **Authentication & Security:** Stateful session authentication using secure HttpOnly cookies, Argon2id password hashing, CSRF protection, and mandatory password change on initial login.
- **Requester Experience:** Complete ticket lifecycle management (Create Ticket, My Tickets, Ticket Detail, Attachments), public comment dialogue with support staff, and self-service resolution signalling (*Problem Appears Resolved*).
- **IT Staff Operational Workflow:** Comprehensive Staff Queue supporting multi-field filtering, semantic priority sorting, pagination, ticket claiming, reassignment, IT Priority adjustment, and permitted 8-state lifecycle transitions (`NEW` → `OPEN` → `IN_PROGRESS` → `WAITING_FOR_REQUESTER` → `RESOLVED` → `CLOSED` / `REOPENED` / `CANCELLED`).
- **Communication & Confidentiality:** Append-only Public Comments (shared between Requesters and IT Staff) and strictly confidential Internal Notes (restricted to IT Staff and Administrators, completely hidden from Requesters).
- **Administrator Governance:** User administration directory, account provisioning, credential reset with immediate session revocation, and fail-safe invariants (self-deactivation prevention, last active administrator protection, atomic owner deactivation unassignment).
- **Actions Taken:** Staff and Administrators can log, assign, edit, complete and cancel ticket actions. Requesters can read all actions on their own tickets. Session identity records the performer; retry keys prevent duplicate creation and versions reject stale updates.
- **Resolution Gate:** Resolving a ticket requires at least one completed action and no pending actions. Resolved, closed and cancelled tickets lock action mutations.
- **Dashboards:** Requester `/dashboard`, Staff `/staff/dashboard`, and Administrator `/admin/dashboard` provide server-calculated metrics, ticket-list drill-downs and recent work. Administrators can read the Queue while ticket workflow mutations remain Staff-only.

## Stack

- **Client:** React 18, TypeScript, Vite, Bootstrap 5
- **Server:** Express 4, TypeScript, Prisma 5, PostgreSQL
- **Testing:** Vitest, React Testing Library, Supertest, Playwright (multi-viewport E2E across Desktop, Tablet, and Mobile)

## Prerequisites

- Node.js (v18+) and npm
- A running PostgreSQL instance (port 5433 or configured in `.env`)
- Docker (optional, for isolated test database container `toktickit-db`)
- PostgreSQL CLI tools (`pg_dump`, `pg_restore`, `psql`) for the disposable recovery test. Prefer tools matching the database major version; explicit Windows binary paths can be configured below.

## Setup

1. Install dependencies:

   ```bash
   npm --prefix server install
   npm --prefix client install
   ```

2. Configure environment:
   Copy `server/.env.example` to `server/.env` and set `DATABASE_URL` for your PostgreSQL database.

3. Apply migrations and seed reference accounts & realistic fixtures:

   ```bash
   # Forward migrations only; do not reset an existing database.
   cd server
   npx prisma migrate deploy
   cd ..
   npm --prefix server run prisma:seed
   ```

4. Start development servers:

   ```bash
   # Terminal 1: Backend API (runs at http://localhost:3000)
   npm --prefix server run dev

   # Terminal 2: Frontend Client (runs at http://localhost:5173)
   npm --prefix client run dev
   ```

## Default Seed Credentials

All seeded accounts have the initial password: `InitialPassword123!` (forced to change password upon first login).

| Role | Email | Department |
|---|---|---|
| Administrator | `admin@example.com` | IT Administration |
| IT Staff | `staff1@example.com`, `staff2@example.com`, `staff3@example.com` | IT Support / Infrastructure / Applications |
| Requester | `jennifer.a@example.com`, `sarah.j@example.com`, `david.l@example.com`, `emily.c@example.com` | Marketing / Finance / Academic Affairs / Sales |
| Inactive Staff / Requester | `staff.inactive@example.com`, `robert.w@example.com` | Verified inactive account error handling |

## Verification

To run the complete verification test suites against the isolated test database:

```bash
# Set isolated test database environment
$env:DATABASE_URL_TEST="postgresql://toktickit:toktickit@localhost:5433/toktickit_test?schema=public"

# Windows PostgreSQL tools, if they are not already on PATH
$env:PG_DUMP_BIN="C:/Program Files/PostgreSQL/18/bin/pg_dump.exe"
$env:PG_RESTORE_BIN="C:/Program Files/PostgreSQL/18/bin/pg_restore.exe"

# Run Server Tests (includes recovery and performance smoke)
npm run test:server

# Run Client Tests
npm run test:client

# Run Full Playwright E2E across Desktop, Tablet, and Mobile
npm run test:e2e

# Production Builds
npm --prefix server run build
npm --prefix client run build
```

Only use a verified disposable database for tests. Server runs use isolated uploads under `server/test-uploads/<runId>`; browser runs start isolated servers on API 3001 and client 5174 and refuse to reuse existing servers. Run database suites sequentially so recovery snapshots are not changed by another suite.

`PERF-L4-01` adds 500 tickets and 1,000 actions, warms each Staff/Requester Dashboard endpoint five times, then measures 50 consecutive Supertest HTTP responses per endpoint. It prints every latency sample and requires p95 < 200ms. The fixtures are removed after the test; existing test data remains, so the load is at least this size.

`MIG-L4-02` uses `pg_dump` and `pg_restore` against the explicit local test database, restoring into a newly created `toktickit_test_restore_*` database without dropping or overwriting an existing database. Every active and soft-removed Attachment reference from the dump snapshot must have a file of its recorded byte size in the source and restored uploads; missing files fail verification. It compares all public-table row hashes, column/constraint/index/enum definitions, sequence state, and attachment backup/restoration hashes. Owner/ACL/global-role backup is outside this test proof. With PostgreSQL 17+ tools and a PostgreSQL 16 server, it uses SQL generated by `pg_restore` plus `psql --single-transaction`, omitting only the unsupported `SET transaction_timeout = 0`; the restored data and schema checks remain mandatory. The fresh database retains its restored rows for inspection; archives and copied uploads are temporary and are removed with the isolated test run directory.

Lab 4 seed fixtures include tickets with zero, one and multiple actions. For a demo, log in as each role to show the dashboard, follow a metric into its filtered list, log/complete an action as Staff, then resolve the ticket. The original forced-password-change and Requester attachment flows remain available.

F4 results and visual inspection are recorded in `docs/lab-04/F4-REVIEW.md` and `docs/lab-04/visual-checklist.md`; latest correction counts and source hashes live in `artifacts/lab-04/f4-pr53-review-fix-20261002/verification.md`. These checks do not certify a release to `main` or the final submission PDF.
