# TokTickIT Lab 3 — Legacy Change Proposals

**Status:** PROPOSED — Awaiting User Review & Explicit Approval  
**Rule Reference:** [`.antigravityrules`](file:///d:/toktickit/.antigravityrules) Section 0 & 4 (P00)  
**Notice:** No code from these proposals has been applied. All legacy files remain strictly unmodified in Phase P00.

---

## Overview of Proposed Patches

| Patch ID | Target Path | Purpose / Requirement | Impact on Lab 2 | Status |
|---|---|---|---|---|
| **LCP-01** | `playwright.config.ts`, `server/package.json` | Isolated test DB & uploads folder (Safety Gate) | Zero regression; protects live DB from test writes | **Proposed** |
| **LCP-02** | `server/prisma/schema.prisma` | Additive schema expansion for Lab 3 models/enums | Fully backwards-compatible; no column drops | **Proposed** |
| **LCP-03** | `server/src/app.ts` | Auth router mounting & session middleware integration | Replaces header spoofing with real session | **Proposed** |
| **LCP-04** | `client/src/App.tsx`, `AppShell.tsx` | Authenticated shell & role navigation | Removes temporary Dev Requester selector | **Proposed** |
| **LCP-05** | `AGENTS.md` | Align branch rules to `lab3-staging` | Documents Lab 3 workflow boundaries | **Proposed** |

---

## Detailed Proposals

### LCP-01: Isolated Test Environment & Upload Directory
- **Target Files:** `playwright.config.ts`, `server/package.json`
- **Requirement:** User Review Point 5 & `ANTIGRAVITY_LAB3_RULES_ADDENDUM.md` Rule 5.
- **Problem:** Currently `npm run test:e2e` and server tests connect to the shared development database `postgresql://localhost:5433/toktickit` and upload to `server/uploads/`.
- **Proposed Change:**
  - Introduce `DATABASE_URL_TEST=postgresql://toktickit:toktickit@localhost:5433/toktickit_test?schema=public` in test scripts.
  - Set `UPLOAD_DIR_TEST=server/test-uploads` during test runs so physical files never pollute `server/uploads`.
- **Regression Test:** Server and client test suites continue passing with 100% isolation.

---

### LCP-02: Additive Prisma Schema Expansion
- **Target File:** `server/prisma/schema.prisma`
- **Requirements:** R03, R04, R06, R07, R08, R10, R12 (AC-14, AC-15, AC-30, AC-31).
- **Preservation Verification:**
  - Confirmed `Ticket` already has `ticketOwnerId Int?` and `itPriority Priority`. We will **not** add a duplicate `ownerId` column.
  - Confirmed `ticketNo` is preserved as-is.
- **Proposed Additions (Unified Diff Outline):**
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
    department          String?
    role                Role      @default(REQUESTER)
    isActive            Boolean   @default(true)
    passwordHash        String?
    mustChangePassword  Boolean   @default(true)
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
    id         String   @id
    userId     Int
    user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
    expiresAt  DateTime
    createdAt  DateTime @default(now())
  }

  // 5. Update Ticket relations
  // ticketOwnerId Int?
  // ticketOwner   User? @relation("TicketOwner", fields: [ticketOwnerId], references: [id])
  // appearsResolvedAt DateTime?
  // appearsResolvedById Int?

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
- **Impact on Lab 2:** `@@map("RequesterUser")` ensures all 5 existing requester records, their IDs, emails, and foreign keys in `Ticket` and `Attachment` remain 100% intact. Existing `itPriority` data is preserved without overwrite.

---

### LCP-03: Server Auth Router & Session Middleware
- **Target File:** `server/src/app.ts`
- **Requirements:** R01, R02, R04, R15 (AC-01, AC-02, AC-03).
- **Proposed Change:**
  - Add cookie parsing middleware (`cookie-parser`).
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
- **Requirement:** Update target branch from `lab2-staging` to `lab3-staging`, and update contract document links to `docs/lab-03/`.
