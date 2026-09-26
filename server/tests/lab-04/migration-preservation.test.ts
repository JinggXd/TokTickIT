import fs from "node:fs";
import path from "node:path";
import { describe, it, expect } from "vitest";
import { getPrisma } from "../../src/prisma.js";
import { seed } from "../../prisma/seed.js";
import { getWorkspaceRoot } from "../../src/config/testEnvironment.js";

function stripComments(sql: string): string {
  return sql
    .replace(/--.*$/gm, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .trim();
}

function splitSqlStatements(sql: string): string[] {
  const statements: string[] = [];
  let current = "";
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let inLineComment = false;
  let inBlockComment = false;
  let dollarTag: string | null = null;

  let i = 0;
  while (i < sql.length) {
    const char = sql[i];
    const nextChar = sql[i + 1] ?? "";

    if (inLineComment) {
      current += char;
      if (char === "\n") {
        inLineComment = false;
      }
      i++;
      continue;
    }

    if (inBlockComment) {
      current += char;
      if (char === "*" && nextChar === "/") {
        current += nextChar;
        inBlockComment = false;
        i += 2;
        continue;
      }
      i++;
      continue;
    }

    if (dollarTag !== null) {
      current += char;
      if (sql.startsWith(dollarTag, i)) {
        current += dollarTag.slice(1);
        i += dollarTag.length;
        dollarTag = null;
        continue;
      }
      i++;
      continue;
    }

    if (inSingleQuote) {
      current += char;
      if (char === "'") {
        if (nextChar === "'") {
          current += nextChar;
          i += 2;
          continue;
        }
        inSingleQuote = false;
      }
      i++;
      continue;
    }

    if (inDoubleQuote) {
      current += char;
      if (char === '"') {
        if (nextChar === '"') {
          current += nextChar;
          i += 2;
          continue;
        }
        inDoubleQuote = false;
      }
      i++;
      continue;
    }

    if (char === "-" && nextChar === "-") {
      inLineComment = true;
      current += char;
      i++;
      continue;
    }
    if (char === "/" && nextChar === "*") {
      inBlockComment = true;
      current += "/*";
      i += 2;
      continue;
    }

    if (char === "$") {
      const match = sql.slice(i).match(/^(\$[a-zA-Z0-9_]*\$)/);
      if (match) {
        dollarTag = match[1];
        current += dollarTag;
        i += dollarTag.length;
        continue;
      }
    }

    if (char === "'") {
      inSingleQuote = true;
      current += char;
      i++;
      continue;
    }

    if (char === '"') {
      inDoubleQuote = true;
      current += char;
      i++;
      continue;
    }

    if (char === ";") {
      const trimmed = current.trim();
      if (trimmed.length > 0 && stripComments(trimmed).length > 0) {
        statements.push(trimmed);
      }
      current = "";
      i++;
      continue;
    }

    current += char;
    i++;
  }

  const trimmed = current.trim();
  if (trimmed.length > 0 && stripComments(trimmed).length > 0) {
    statements.push(trimmed);
  }

  return statements;
}

async function executeSqlScriptInSchema(
  prismaClient: any,
  schemaName: string,
  sqlScript: string,
): Promise<void> {
  const statements = splitSqlStatements(sqlScript);
  await prismaClient.$transaction(
    async (tx: any) => {
      await tx.$executeRawUnsafe(`SET LOCAL search_path = "${schemaName}";`);
      for (const statement of statements) {
        await tx.$executeRawUnsafe(statement);
      }
    },
    {
      maxWait: 10000,
      timeout: 60000,
    },
  );
}

describe("Phase F2 / L4-P03: Database Migration, Model & Idempotent Seed (MIG-L4-01, MIG-L4-02)", () => {
  const prisma = getPrisma();

  it("MIG-L4-01: proves ActionTaken model and schema fields exist on Prisma Client", async () => {
    // Assert prisma.actionTaken exists
    expect(prisma).toHaveProperty("actionTaken");
    expect(typeof (prisma as any).actionTaken.findMany).toBe("function");
    expect(typeof (prisma as any).actionTaken.create).toBe("function");
  });

  it("MIG-L4-01: proves forward migration applies cleanly to authentic Lab 3 data and preserves all users, tickets, attachments, comments, and notes", async () => {
    const proofSchema = `lab4_migration_proof_${Date.now()}`;

    try {
      await prisma.$executeRawUnsafe(`CREATE SCHEMA "${proofSchema}";`);

      // 1. Establish authentic Lab 3 database schema by executing migrations 1 through 4 in order
      const migrationFiles = [
        "server/prisma/migrations/20260811082549_add_category/migration.sql",
        "server/prisma/migrations/20260830151320_lab2_data_layer/migration.sql",
        "server/prisma/migrations/20260917000000_lab3_schema_expansion/migration.sql",
        "server/prisma/migrations/20260918000000_add_ticket_seed_key/migration.sql",
      ];

      for (const migFile of migrationFiles) {
        const filePath = path.resolve(getWorkspaceRoot(), migFile);
        const sqlContent = fs.readFileSync(filePath, "utf8");
        await executeSqlScriptInSchema(prisma, proofSchema, sqlContent);
      }

      // 2. Populate authentic Lab 3 pre-existing records (Users, Categories, Systems, Tickets, Attachments, Comments, Notes, Sessions)
      await prisma.$transaction(async (tx) => {
        await tx.$executeRawUnsafe(`SET LOCAL search_path = "${proofSchema}";`);

        // Categories & Systems
        await tx.$executeRawUnsafe(`INSERT INTO "Category" (id, name, "isActive") VALUES (10, 'Hardware & Devices', true);`);
        await tx.$executeRawUnsafe(`INSERT INTO "RelatedSystem" (id, name, "isActive") VALUES (10, 'Campus Network', true);`);

        // Users (Requester, Staff, Admin) with authentic Argon2-style password hashes & roles
        await tx.$executeRawUnsafe(`
          INSERT INTO "RequesterUser" (id, name, email, department, "isActive", role, "passwordHash", "mustChangePassword", "sessionVersion", "createdAt", "updatedAt")
          VALUES
            (101, 'Requester One', 'requester1@example.com', 'Academics', true, 'REQUESTER', '$argon2id$v=19$m=19456,p=1,t=2$mockHash1', false, 1, NOW(), NOW()),
            (102, 'Staff Alice', 'staff1@example.com', 'IT Operations', true, 'IT_STAFF', '$argon2id$v=19$m=19456,p=1,t=2$mockHash2', false, 1, NOW(), NOW()),
            (103, 'Admin Bob', 'admin1@example.com', 'IT Security', true, 'ADMINISTRATOR', '$argon2id$v=19$m=19456,p=1,t=2$mockHash3', false, 1, NOW(), NOW());
        `);

        // Tickets (spanning legacy fields and Lab 3 fields: version, appearsResolvedAt, seedKey)
        await tx.$executeRawUnsafe(`
          INSERT INTO "Ticket" (id, "ticketNo", summary, description, "requestedPriority", "itPriority", "currentStatus", "requesterId", "categoryId", "relatedSystemId", "ticketOwnerId", version, "appearsResolvedAt", "appearsResolvedById", "seedKey", "createdAt", "updatedAt")
          VALUES
            (201, 'TKT-2026-000101', 'Network Connectivity Issue', 'Detailed description of Wi-Fi outage', 'HIGH', 'HIGH', 'IN_PROGRESS', 101, 10, 10, 102, 1, NULL, NULL, 'seed-ticket-101', NOW(), NOW()),
            (202, 'TKT-2026-000102', 'Resolved Laptop Issue', 'Laptop battery replaced', 'MEDIUM', 'LOW', 'RESOLVED', 101, 10, 10, 102, 3, NOW(), 102, 'seed-ticket-102', NOW(), NOW());
        `);

        // Attachments (proving authentic attachment preservation: active and soft-removed)
        await tx.$executeRawUnsafe(`
          INSERT INTO "Attachment" (id, "ticketId", "fileName", "storedFileName", "fileSize", "mimeType", "uploadedByRequesterId", "removedAt", "createdAt")
          VALUES
            (301, 201, 'network_diagnostics.txt', 'safe_diag_301.txt', 2048, 'text/plain', 101, NULL, NOW()),
            (302, 201, 'screenshot_error.png', 'safe_screen_302.png', 10240, 'image/png', 101, NOW(), NOW());
        `);

        // PublicComment & InternalNote
        await tx.$executeRawUnsafe(`
          INSERT INTO "PublicComment" (id, "ticketId", "authorId", body, "createdAt")
          VALUES (401, 201, 101, 'Has anyone looked at this ticket yet?', NOW());
        `);
        await tx.$executeRawUnsafe(`
          INSERT INTO "InternalNote" (id, "ticketId", "authorId", body, "createdAt")
          VALUES (501, 201, 102, 'Checked switch port 4, signal level is degraded.', NOW());
        `);

        // Session
        await tx.$executeRawUnsafe(`
          INSERT INTO "Session" (id, "userId", "sessionVersion", "csrfToken", "expiresAt", "createdAt")
          VALUES ('sess-proof-101', 101, 1, 'mock-csrf-token-101', NOW() + interval '1 day', NOW());
        `);
      });

      // 3. Verify that BEFORE Lab 4 migration:
      // ActionTaken table does NOT exist in proofSchema
      const tablesBefore: Array<{ table_name: string }> = await prisma.$queryRawUnsafe(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = '${proofSchema}' AND table_name = 'ActionTaken';
      `);
      expect(tablesBefore.length).toBe(0);

      // 4. Execute the Lab 4 migration: 20260925000000_lab4_actions_taken
      const lab4MigrationPath = path.resolve(
        getWorkspaceRoot(),
        "server/prisma/migrations/20260925000000_lab4_actions_taken/migration.sql",
      );
      const lab4Sql = fs.readFileSync(lab4MigrationPath, "utf8");
      await executeSqlScriptInSchema(prisma, proofSchema, lab4Sql);

      // 5. Verify that AFTER Lab 4 migration:
      // ActionTaken table now exists
      const tablesAfter: Array<{ table_name: string }> = await prisma.$queryRawUnsafe(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = '${proofSchema}' AND table_name = 'ActionTaken';
      `);
      expect(tablesAfter.length).toBe(1);

      // Verify ActionTaken table columns
      const actionColumns: Array<{ column_name: string; data_type: string }> = await prisma.$queryRawUnsafe(`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_schema = '${proofSchema}' AND table_name = 'ActionTaken';
      `);
      const actionColNames = actionColumns.map((c) => c.column_name);
      expect(actionColNames).toContain("id");
      expect(actionColNames).toContain("ticketId");
      expect(actionColNames).toContain("actionDateTime");
      expect(actionColNames).toContain("actionDescription");
      expect(actionColNames).toContain("result");
      expect(actionColNames).toContain("status");
      expect(actionColNames).toContain("createdById");
      expect(actionColNames).toContain("performedById");
      expect(actionColNames).toContain("assigneeId");
      expect(actionColNames).toContain("followUpRequired");
      expect(actionColNames).toContain("followUpNote");
      expect(actionColNames).toContain("attachmentNotes");
      expect(actionColNames).toContain("version");
      expect(actionColNames).toContain("clientRequestId");
      expect(actionColNames).toContain("requestPayloadHash");
      expect(actionColNames).toContain("createdAt");
      expect(actionColNames).toContain("updatedAt");

      // Verify ActionStatus enum exists
      const enumLabels: Array<{ enumlabel: string }> = await prisma.$queryRawUnsafe(`
        SELECT e.enumlabel
        FROM pg_type t
        JOIN pg_enum e ON t.oid = e.enumtypid
        WHERE t.typname = 'ActionStatus';
      `);
      const labels = enumLabels.map((l) => l.enumlabel);
      expect(labels).toContain("PENDING");
      expect(labels).toContain("COMPLETED");
      expect(labels).toContain("CANCELLED");

      // 6. VERIFY EXACT DATA PRESERVATION ACROSS ALL ENTITIES

      // Users preserved
      const usersAfter: Array<{
        id: number;
        name: string;
        email: string;
        department: string;
        role: string;
        passwordHash: string | null;
        mustChangePassword: boolean;
        sessionVersion: number;
        isActive: boolean;
      }> = await prisma.$queryRawUnsafe(`
        SELECT id, name, email, department, role::text, "passwordHash", "mustChangePassword", "sessionVersion", "isActive"
        FROM "${proofSchema}"."RequesterUser"
        ORDER BY id ASC;
      `);
      expect(usersAfter.length).toBe(3);
      expect(usersAfter[0]).toMatchObject({
        id: 101,
        name: "Requester One",
        email: "requester1@example.com",
        department: "Academics",
        role: "REQUESTER",
        mustChangePassword: false,
        sessionVersion: 1,
        isActive: true,
      });
      expect(usersAfter[1]).toMatchObject({
        id: 102,
        name: "Staff Alice",
        email: "staff1@example.com",
        department: "IT Operations",
        role: "IT_STAFF",
        isActive: true,
      });
      expect(usersAfter[2]).toMatchObject({
        id: 103,
        name: "Admin Bob",
        email: "admin1@example.com",
        department: "IT Security",
        role: "ADMINISTRATOR",
        isActive: true,
      });

      // Tickets preserved
      const ticketsAfter: Array<{
        id: number;
        ticketNo: string;
        summary: string;
        description: string;
        requestedPriority: string;
        itPriority: string;
        currentStatus: string;
        requesterId: number;
        categoryId: number;
        relatedSystemId: number;
        ticketOwnerId: number | null;
        version: number;
        seedKey: string | null;
      }> = await prisma.$queryRawUnsafe(`
        SELECT id, "ticketNo", summary, description, "requestedPriority", "itPriority", "currentStatus", "requesterId", "categoryId", "relatedSystemId", "ticketOwnerId", version, "seedKey"
        FROM "${proofSchema}"."Ticket"
        ORDER BY id ASC;
      `);
      expect(ticketsAfter.length).toBe(2);
      expect(ticketsAfter[0]).toMatchObject({
        id: 201,
        ticketNo: "TKT-2026-000101",
        summary: "Network Connectivity Issue",
        description: "Detailed description of Wi-Fi outage",
        requestedPriority: "HIGH",
        itPriority: "HIGH",
        currentStatus: "IN_PROGRESS",
        requesterId: 101,
        ticketOwnerId: 102,
        version: 1,
        seedKey: "seed-ticket-101",
      });
      expect(ticketsAfter[1]).toMatchObject({
        id: 202,
        ticketNo: "TKT-2026-000102",
        summary: "Resolved Laptop Issue",
        currentStatus: "RESOLVED",
        version: 3,
        seedKey: "seed-ticket-102",
      });

      // Attachments preserved (proving zero data loss on active and soft-removed attachments)
      const attachmentsAfter: Array<{
        id: number;
        ticketId: number;
        fileName: string;
        storedFileName: string;
        fileSize: number;
        mimeType: string;
        uploadedByRequesterId: number;
        removedAt: Date | null;
      }> = await prisma.$queryRawUnsafe(`
        SELECT id, "ticketId", "fileName", "storedFileName", "fileSize", "mimeType", "uploadedByRequesterId", "removedAt"
        FROM "${proofSchema}"."Attachment"
        ORDER BY id ASC;
      `);
      expect(attachmentsAfter.length).toBe(2);
      expect(attachmentsAfter[0]).toMatchObject({
        id: 301,
        ticketId: 201,
        fileName: "network_diagnostics.txt",
        storedFileName: "safe_diag_301.txt",
        fileSize: 2048,
        mimeType: "text/plain",
        uploadedByRequesterId: 101,
        removedAt: null,
      });
      expect(attachmentsAfter[1]).toMatchObject({
        id: 302,
        ticketId: 201,
        fileName: "screenshot_error.png",
        storedFileName: "safe_screen_302.png",
        fileSize: 10240,
        mimeType: "image/png",
        uploadedByRequesterId: 101,
      });
      expect(attachmentsAfter[1].removedAt).not.toBeNull();

      // Comments, Notes, Sessions preserved
      const commentsCount: Array<{ count: string | bigint }> = await prisma.$queryRawUnsafe(`
        SELECT COUNT(*) as count FROM "${proofSchema}"."PublicComment";
      `);
      const notesCount: Array<{ count: string | bigint }> = await prisma.$queryRawUnsafe(`
        SELECT COUNT(*) as count FROM "${proofSchema}"."InternalNote";
      `);
      const sessionCount: Array<{ count: string | bigint }> = await prisma.$queryRawUnsafe(`
        SELECT COUNT(*) as count FROM "${proofSchema}"."Session";
      `);
      expect(Number(commentsCount[0].count)).toBe(1);
      expect(Number(notesCount[0].count)).toBe(1);
      expect(Number(sessionCount[0].count)).toBe(1);

      // 7. Verify new ActionTaken table functions correctly with foreign keys to pre-existing data
      await prisma.$executeRawUnsafe(`
        INSERT INTO "${proofSchema}"."ActionTaken" (
          "ticketId", "actionDateTime", "actionDescription", result, status,
          "createdById", "performedById", "assigneeId", "followUpRequired",
          "followUpNote", "attachmentNotes", version, "clientRequestId", "requestPayloadHash"
        ) VALUES (
          201, NOW(), 'Replaced RJ-45 cable and reset port', 'Link established at 1Gbps', 'COMPLETED',
          102, 102, 102, false,
          NULL, 'Diagnostic log attached in previous step', 1, 'client-req-proof-1', 'hash123'
        );
      `);

      const insertedActions: Array<{
        id: number;
        ticketId: number;
        actionDescription: string;
        result: string | null;
        status: string;
        createdById: number;
        performedById: number | null;
      }> = await prisma.$queryRawUnsafe(`
        SELECT id, "ticketId", "actionDescription", result, status::text, "createdById", "performedById"
        FROM "${proofSchema}"."ActionTaken"
        WHERE "ticketId" = 201;
      `);
      expect(insertedActions.length).toBe(1);
      expect(insertedActions[0].actionDescription).toBe("Replaced RJ-45 cable and reset port");
      expect(insertedActions[0].result).toBe("Link established at 1Gbps");
      expect(insertedActions[0].status).toBe("COMPLETED");
      expect(insertedActions[0].createdById).toBe(102);

      // Foreign key constraint verification: referencing non-existent ticket must reject
      await expect(
        prisma.$executeRawUnsafe(`
          INSERT INTO "${proofSchema}"."ActionTaken" (
            "ticketId", "actionDescription", status, "createdById"
          ) VALUES (
            99999, 'Action on invalid ticket', 'COMPLETED', 102
          );
        `),
      ).rejects.toThrow();

      // Foreign key constraint verification: referencing non-existent user must reject
      await expect(
        prisma.$executeRawUnsafe(`
          INSERT INTO "${proofSchema}"."ActionTaken" (
            "ticketId", "actionDescription", status, "createdById"
          ) VALUES (
            201, 'Action by invalid user', 'COMPLETED', 99999
          );
        `),
      ).rejects.toThrow();
    } finally {
      // 8. Isolated schema cleanup
      await prisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${proofSchema}" CASCADE;`);
    }
  });

  it("MIG-L4-01: proves idempotent seed can run repeatedly without duplicate key errors", async () => {
    // Run seed twice
    await seed(prisma);
    const countAfterFirst = await (prisma as any).actionTaken.count();

    await seed(prisma);
    const countAfterSecond = await (prisma as any).actionTaken.count();

    expect(countAfterFirst).toBeGreaterThan(0);
    expect(countAfterSecond).toBe(countAfterFirst);
  });

  it("MIG-L4-01: proves tickets are seeded with 0, 1, and multiple ActionTaken records", async () => {
    const tickets = await prisma.ticket.findMany({
      include: {
        actionsTaken: true,
      } as any,
    });

    const ticketsWithZero = (tickets as any[]).filter((t) => t.actionsTaken.length === 0);
    const ticketsWithOne = (tickets as any[]).filter((t) => t.actionsTaken.length === 1);
    const ticketsWithMany = (tickets as any[]).filter((t) => t.actionsTaken.length > 1);

    expect(ticketsWithZero.length).toBeGreaterThanOrEqual(1);
    expect(ticketsWithOne.length).toBeGreaterThanOrEqual(1);
    expect(ticketsWithMany.length).toBeGreaterThanOrEqual(1);
  });

  it("MIG-L4-01: proves unique constraint on (createdById, ticketId, clientRequestId)", async () => {
    const user = await prisma.user.findFirst({ where: { role: "IT_STAFF", isActive: true } });
    const ticket = await prisma.ticket.findFirst();
    expect(user).toBeTruthy();
    expect(ticket).toBeTruthy();

    const clientRequestId = "test-uuid-" + Date.now();

    // First creation succeeds
    const action1 = await (prisma as any).actionTaken.create({
      data: {
        ticketId: ticket!.id,
        createdById: user!.id,
        performedById: user!.id,
        actionDescription: "Initial investigation",
        status: "COMPLETED",
        clientRequestId,
        requestPayloadHash: "dummyhash1",
      },
    });
    expect(action1.id).toBeDefined();

    // Duplicate creation with same (createdById, ticketId, clientRequestId) must throw P2002
    await expect(
      (prisma as any).actionTaken.create({
        data: {
          ticketId: ticket!.id,
          createdById: user!.id,
          performedById: user!.id,
          actionDescription: "Duplicate attempt",
          status: "COMPLETED",
          clientRequestId,
          requestPayloadHash: "dummyhash2",
        },
      }),
    ).rejects.toThrow();

    // Different user with same clientRequestId and ticket succeeds
    const anotherUser = await prisma.user.findFirst({
      where: { role: "ADMINISTRATOR", id: { not: user!.id } },
    });
    if (anotherUser) {
      const actionDifferentUser = await (prisma as any).actionTaken.create({
        data: {
          ticketId: ticket!.id,
          createdById: anotherUser.id,
          performedById: anotherUser.id,
          actionDescription: "Different user same key",
          status: "COMPLETED",
          clientRequestId,
          requestPayloadHash: "dummyhash1",
        },
      });
      expect(actionDifferentUser.id).toBeDefined();
    }
  });
});

