# TokTickIT Lab 3 — Legacy Change Proposals

**Status:** Runtime patches PROPOSED; LCP-05 documentation scope applied on 2026-09-13
**Rule Reference:** [`.antigravityrules`](../../.antigravityrules) Section 0 & 4 (P00)
**Notice:** Runtime proposals remain unapplied. AGENTS.md documentation alignment (LCP-05) was applied under the user's request to fix the audit findings; this is not approval of database/code/dependency changes.

---

## Overview of Proposed Patches

| Patch ID | Target Path | Purpose / Requirement | Impact on Lab 2 | Status |
|---|---|---|---|---|
| **LCP-01** | `playwright.config.ts`, server test/bootstrap/upload configuration | Isolated test DB & uploads folder (Safety Gate) | Zero regression; protects live DB from test writes | **Proposed** |
| **LCP-02** | `server/prisma/schema.prisma` | Additive schema expansion for Lab 3 models/enums | Fully backwards-compatible; no column drops | **Proposed** |
| **LCP-03** | `server/src/app.ts` | Auth router mounting & session middleware integration | Replaces header spoofing with real session | **Proposed** |
| **LCP-04** | `client/src/App.tsx`, `AppShell.tsx` | Authenticated shell & role navigation | Removes temporary Dev Requester selector | **Proposed** |
| **LCP-05** | `AGENTS.md` | Align branch rules to `lab3-staging` | Documents Lab 3 workflow boundaries | **Applied — docs only** |

---

## Detailed Proposals

### LCP-01: Isolated Test Environment and Upload Directory (Proposed)

Requirement: P02 safety gate, tests.md §2 and HARNESS-01. A variable declaration alone does
not isolate tests: Prisma reads DATABASE_URL and app.ts currently hardcodes uploads.

| Target / symbol | Before | Proposed after |
|---|---|---|
| New test runner + root/server package scripts | npm invokes suites with ambient DB settings | Validate DATABASE_URL_TEST database name against disposable test allowlist; reject missing/dev target before any connection; pass as DATABASE_URL to all child processes before Prisma import |
| server/vitest.config.ts + new test setup | No isolation guard | Fail-closed guard shared by all API/integration tests; deterministic fixtures and controllable clocks |
| server/src/app.ts UPLOADS_DIR + proposed storage helper | Hardcoded server/uploads or uploads | Explicit test-mode directory under server/test-uploads/<run-id>; resolved containment guard; production path preserved outside test mode |
| playwright.config.ts webServer | reuseExistingServer=true, ambient server env | Dedicated test ports/server env, reuseExistingServer=false; validated DB/upload paths inherited; no development server reuse |
| Existing server/API and E2E setup/teardown | Mixed ID tracking; create-ticket API leaves a created row; snapshots overwrite fixed paths | Track created IDs/files immediately, including failure paths; remove only those IDs/files; fail cleanup visibly; screenshots use a new run-specific Lab 3 path |
| Proposed test-environment.test.ts | Missing | HARNESS-01 proves unsafe/missing DB and paths fail before I/O; safe targets and tracked cleanup succeed |

Affected existing paths include package.json, server/package.json, server/vitest.config.ts,
server/src/app.ts, server/tests/lab-02/create-ticket.api.test.ts, existing API fixture helpers,
playwright.config.ts and e2e/lab-02/requester-ticket-flow.spec.ts. Inspect exact current setup
before producing the executable patch; no edits to these runtime/test files are applied here.
Recovery is a normal revert of the isolated config/code patch; never reset development DB or
remove shared uploads. Preserve all existing Lab 2 screenshots. Approve the concrete diff
before applying. Server/client/Playwright regression results remain pending after this patch.

---

### LCP-02: Additive Prisma Schema Expansion
- **Target File:** `server/prisma/schema.prisma`
- **Requirements:** R03, R04, R06, R07, R08, R10, R12 (AC-14, AC-15, AC-18, AC-31, AC-32).
- **Preservation Verification:**
  - Confirmed `Ticket` already has `ticketOwnerId Int?` and `itPriority Priority`. We will **not** add a duplicate `ownerId` column.
  - Confirmed `ticketNo` is preserved as-is.
- **Design sketch (not an executable or approved Prisma diff):**
  ```prisma
  // 1. Expand TicketStatus to 8 values
  enum TicketStatus {
    NEW
    OPEN
    IN_PROGRESS
    WAITING_FOR_REQUESTER
    RESOLVED
    CLOSED
    REOPENED
    CANCELLED
  }

  // 2. Introduce Role enum
  enum Role {
    REQUESTER
    IT_STAFF
    ADMINISTRATOR
  }

  // 3. User model mapping RequesterUser table
  model User {
    id                  Int       @id @default(autoincrement())
    name                String
    email               String    @unique
    department          String    @default("")
    role                Role      @default(REQUESTER)
    isActive            Boolean   @default(true)
    passwordHash        String?
    mustChangePassword  Boolean   @default(true)
    sessionVersion      Int       @default(1)
    createdAt           DateTime  @default(now())
    updatedAt           DateTime  @updatedAt

    ticketsRequested    Ticket[]         @relation("TicketRequester")
    ticketsOwned        Ticket[]         @relation("TicketOwner")
    attachmentsUploaded Attachment[]     @relation("AttachmentUploader")
    publicComments      PublicComment[]
    internalNotes       InternalNote[]
    sessions            Session[]

    @@map("RequesterUser")
  }

  // 4. Session model for server-side PostgreSQL session store
  model Session {
    id         String   @id // SHA-256(raw session token), never the raw cookie
    sessionVersion Int
    csrfToken  String
    userId     Int
    user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
    expiresAt  DateTime
    createdAt  DateTime @default(now())
    @@index([userId])
    @@index([expiresAt])
  }

  // 5. Update Ticket relations
  // ticketOwnerId Int?
  // ticketOwner   User? @relation("TicketOwner", fields: [ticketOwnerId], references: [id])
  // appearsResolvedAt DateTime?
  // appearsResolvedById Int? (User FK with inverse relation)
  // version Int @default(1)

  // 6. Add PublicComment & InternalNote models (append-only)
  model PublicComment {
    id        Int      @id @default(autoincrement())
    ticketId  Int
    ticket    Ticket   @relation(fields: [ticketId], references: [id], onDelete: Cascade)
    authorId  Int
    author    User     @relation(fields: [authorId], references: [id])
    body      String
    createdAt DateTime @default(now())

    @@index([ticketId, createdAt])
  }

  model InternalNote {
    id        Int      @id @default(autoincrement())
    ticketId  Int
    ticket    Ticket   @relation(fields: [ticketId], references: [id], onDelete: Cascade)
    authorId  Int
    author    User     @relation(fields: [authorId], references: [id])
    body      String
    createdAt DateTime @default(now())

    @@index([ticketId, createdAt])
  }
  ```
- **Impact on Lab 2:** `@@map("RequesterUser")` preserves the physical table; migration tests must prove every baseline row, ID, email and FK is retained. A Prisma model rename still requires approved generated-client/caller/test changes and is not automatically source-compatible. Existing `itPriority` data is preserved without overwrite.

---

### LCP-03: Server Auth Router & Session Middleware
- **Target File:** `server/src/app.ts`
- **Requirements:** R01, R02, R04, R15 (AC-01, AC-02, AC-03).
- **Proposed Change:**
  - Add cookie parsing via a specifically proposed helper/library; any new package requires its own manifest/lockfile diff approval.
  - Propose Argon2id package/version for the fixed hashing profile in api-spec.md §2.6; no package is installed by this document.
  - Mount `/api/auth` router implementing login, logout, me, change-password, and csrf.
  - Update `requireRequester` middleware to extract user from session instead of `X-Requester-Id`.
  - Add safe fallback / backward-compatibility check: ignore legacy `X-Requester-Id` header to prevent spoofing.
- **Impact on Lab 2:** Lab 2 requester endpoints (`/api/tickets`, `/api/tickets/:id`) continue functioning, now backed by authenticated session security.

---

### LCP-04: Authenticated AppShell & Role Navigation
- **Target Files:** `client/src/App.tsx`, `client/src/components/AppShell.tsx`
- **Requirements:** R01, R04, R17 (AC-12, AC-13).
- **Proposed Change:**
  - Remove Dev Requester selector dropdown and "Change Requester" action.
  - Wrap application in `AuthProvider`.
  - Add routes for `/login` and `/change-password`.
  - Render authenticated user name, role badge, and role-scoped navigation:
    - **Requester:** `My Tickets`, `Create Ticket`
    - **IT Staff:** `Ticket Queue`
    - **Administrator:** `User Management`
  - Render `Logout` and `Change Password` in user menu.
- **Impact on Lab 2:** Eliminates development-only selector and enforces proper authentication flow across all pages.

---

### LCP-05: AGENTS.md Scope Alignment
- **Target File:** `AGENTS.md`
- **Requirement:** Scope Lab 2 and Lab 3 contracts/branches separately; preserve the Lab 2 regression baseline.
- **Before:** Global Lab 2 exclusions blocked authentication/Staff/Admin; only lab2-staging was specified.
- **After (applied):** Lab 3 uses docs/lab-03 and lab3-staging, with safe-test gates; Lab 2 rules remain scoped to Lab 2.
- **Authority:** User requested correction of the audit findings on 2026-09-13: “แก้ให้หน่อยได้ไหมเดี๋ยวpushไปใหม่”. No runtime patch, dependency installation, migration, commit, push or merge is implied.
- **Verification:** Review the AGENTS.md diff and contract consistency; runtime code is unchanged.
