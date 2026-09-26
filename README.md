# TokTickIT

TokTickIT is the CPE 334 Multi-Role IT Ticketing System (Lab 3), extending the Lab 2 requester baseline into an enterprise-grade service desk with role-based access control, operational queues, and administrative governance.

## Roles & Features

- **Authentication & Security:** Stateful session authentication using secure HttpOnly cookies, Argon2id password hashing, CSRF protection, and mandatory password change on initial login.
- **Requester Experience:** Complete ticket lifecycle management (Create Ticket, My Tickets, Ticket Detail, Attachments), public comment dialogue with support staff, and self-service resolution signalling (*Problem Appears Resolved*).
- **IT Staff Operational Workflow:** Comprehensive Staff Queue supporting multi-field filtering, semantic priority sorting, pagination, ticket claiming, reassignment, IT Priority adjustment, and permitted 8-state lifecycle transitions (`NEW` → `OPEN` → `IN_PROGRESS` → `WAITING_FOR_REQUESTER` → `RESOLVED` → `CLOSED` / `REOPENED` / `CANCELLED`).
- **Communication & Confidentiality:** Append-only Public Comments (shared between Requesters and IT Staff) and strictly confidential Internal Notes (restricted to IT Staff and Administrators, completely hidden from Requesters).
- **Administrator Governance:** User administration directory, account provisioning, credential reset with immediate session revocation, and fail-safe invariants (self-deactivation prevention, last active administrator protection, atomic owner deactivation unassignment).

## Stack

- **Client:** React 18, TypeScript, Vite, Bootstrap 5
- **Server:** Express 4, TypeScript, Prisma 5, PostgreSQL
- **Testing:** Vitest, React Testing Library, Supertest, Playwright (multi-viewport E2E across Desktop, Tablet, and Mobile)

## Prerequisites

- Node.js (v18+) and npm
- A running PostgreSQL instance (port 5433 or configured in `.env`)
- Docker (optional, for isolated test database container `toktickit-db`)

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
   npm --prefix server run prisma:migrate
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

# Run Server Tests (25 files, 263 tests)
npm run test:server

# Run Client Tests (15 files, 82 tests)
npm run test:client

# Run Full Playwright E2E across Desktop, Tablet, and Mobile (108 tests)
npm run test:e2e

# Production Builds
npm --prefix server run build
npm --prefix client run build
```

