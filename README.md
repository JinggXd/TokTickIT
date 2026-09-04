# TokTickIT

TokTickIT is the CPE 334 requester-facing IT ticketing project. Lab 2 is currently under
development and uses a temporary Development Requester selector to simulate requester context.
It is a testing mechanism only, not authentication.

## Stack

- Client: React, TypeScript, Vite, Bootstrap
- Server: Express, TypeScript, Prisma
- Database: PostgreSQL
- Tests: Vitest, React Testing Library, Supertest; Playwright is added in Lab 2 Phase 7

## Prerequisites

- Node.js and npm
- A running PostgreSQL instance

## Setup

1. Install dependencies:

   ```bash
   npm --prefix server install
   npm --prefix client install
   ```

2. Copy `server/.env.example` to `server/.env` and set `DATABASE_URL` for your local PostgreSQL
   database. Optionally copy `client/.env.example` to `client/.env` when the API is not served at
   `http://localhost:3000`.

3. Apply migrations and seed the required reference data:

   ```bash
   npm --prefix server run prisma:migrate
   npm --prefix server run prisma:seed
   ```

4. Start the API and client in separate terminals:

   ```bash
   npm --prefix server run dev
   npm --prefix client run dev
   ```

   The API runs at `http://localhost:3000` and the Vite client at `http://localhost:5173` by
   default.

## Verification

```bash
npm --prefix server run test
npm --prefix client run test
npm --prefix server run build
npm --prefix client run build
```

The Playwright command below becomes available after the Phase 7 configuration and E2E test file
have been added:

```bash
npx playwright test
```

The final Lab 2 release is complete only when every acceptance criterion in
`docs/lab-02/specification.md` is satisfied and all three required test levels pass with zero
skipped tests.
