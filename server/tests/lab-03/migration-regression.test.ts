import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { getWorkspaceRoot, getUploadDirectory } from "../../src/config/testEnvironment.js";
import { getPrisma } from "../../src/prisma.js";
import { seed, getDefaultSeedAccounts } from "../../prisma/seed.js";
import { hashPassword, verifyPassword } from "../../src/utils/password.js";

describe("Phase F2 / P03 Data Migration & Idempotent Seeding (AC-14–AC-18, AC-31, LCP-02)", () => {
  const prisma = getPrisma();

  describe("MIG-01 (AC-14, R05, R12): Database Schema & Model Preservation", () => {
    it("verifies live PostgreSQL table columns for User (RequesterUser) and Ticket", async () => {
      // Query actual database columns from PostgreSQL information_schema
      const userColumns: Array<{ column_name: string; data_type: string }> = await prisma.$queryRaw`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'RequesterUser';
      `;
      const userColNames = userColumns.map((c) => c.column_name);

      // Legacy fields preserved
      expect(userColNames).toContain("id");
      expect(userColNames).toContain("name");
      expect(userColNames).toContain("email");
      expect(userColNames).toContain("department");
      expect(userColNames).toContain("isActive");
      expect(userColNames).toContain("createdAt");
      expect(userColNames).toContain("updatedAt");

      // Lab 3 security fields added
      expect(userColNames).toContain("role");
      expect(userColNames).toContain("passwordHash");
      expect(userColNames).toContain("mustChangePassword");
      expect(userColNames).toContain("sessionVersion");

      // Verify Ticket table columns
      const ticketColumns: Array<{ column_name: string }> = await prisma.$queryRaw`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'Ticket';
      `;
      const ticketColNames = ticketColumns.map((c) => c.column_name);

      // Legacy ticket fields preserved
      expect(ticketColNames).toContain("id");
      expect(ticketColNames).toContain("ticketNo");
      expect(ticketColNames).toContain("summary");
      expect(ticketColNames).toContain("description");
      expect(ticketColNames).toContain("requestedPriority");
      expect(ticketColNames).toContain("itPriority");
      expect(ticketColNames).toContain("currentStatus");
      expect(ticketColNames).toContain("requesterId");
      expect(ticketColNames).toContain("categoryId");
      expect(ticketColNames).toContain("relatedSystemId");
      expect(ticketColNames).toContain("ticketOwnerId");

      // Lab 3 operational fields added
      expect(ticketColNames).toContain("version");
      expect(ticketColNames).toContain("appearsResolvedAt");
      expect(ticketColNames).toContain("appearsResolvedById");
      expect(ticketColNames).toContain("seedKey");
    });

    it("verifies Session, PublicComment, and InternalNote tables exist in the database", async () => {
      const tables: Array<{ table_name: string }> = await prisma.$queryRaw`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
          AND table_name IN ('Session', 'PublicComment', 'InternalNote');
      `;
      const tableNames = tables.map((t) => t.table_name);
      expect(tableNames).toContain("Session");
      expect(tableNames).toContain("PublicComment");
      expect(tableNames).toContain("InternalNote");
    });
  });

  describe("MIG-02 (AC-15, R12): 8 Statuses and 3 Roles Enums in PostgreSQL", () => {
    it("verifies TicketStatus enum in DB contains all 8 required values", async () => {
      const enumValues: Array<{ enumlabel: string }> = await prisma.$queryRaw`
        SELECT e.enumlabel
        FROM pg_type t
        JOIN pg_enum e ON t.oid = e.enumtypid
        WHERE t.typname = 'TicketStatus';
      `;
      const labels = enumValues.map((v) => v.enumlabel);
      const expected = [
        "NEW",
        "OPEN",
        "IN_PROGRESS",
        "WAITING_FOR_REQUESTER",
        "RESOLVED",
        "CLOSED",
        "REOPENED",
        "CANCELLED",
      ];
      for (const st of expected) {
        expect(labels).toContain(st);
      }
    });

    it("verifies Role enum in DB contains REQUESTER, IT_STAFF, ADMINISTRATOR", async () => {
      const enumValues: Array<{ enumlabel: string }> = await prisma.$queryRaw`
        SELECT e.enumlabel
        FROM pg_type t
        JOIN pg_enum e ON t.oid = e.enumtypid
        WHERE t.typname = 'Role';
      `;
      const labels = enumValues.map((v) => v.enumlabel);
      expect(labels).toContain("REQUESTER");
      expect(labels).toContain("IT_STAFF");
      expect(labels).toContain("ADMINISTRATOR");
    });

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
      sqlScript: string
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
        }
      );
    }

    it("proves forward migration chain applies cleanly to an authentic Lab 2 schema with populated data (AC-14, AC-15, MIG-01, MIG-02)", async () => {
      const proofSchema = `lab2_migration_proof_${Date.now()}`;
      try {
        await prisma.$executeRawUnsafe(`CREATE SCHEMA "${proofSchema}";`);

        // 1. Establish authentic Lab 2 database schema by executing the full migration chain in order:
        // Migration 1: Initial Category table (20260811082549_add_category)
        const addCategorySqlPath = path.resolve(
          getWorkspaceRoot(),
          "server/prisma/migrations/20260811082549_add_category/migration.sql"
        );
        const addCategorySql = fs.readFileSync(addCategorySqlPath, "utf8");
        await executeSqlScriptInSchema(prisma, proofSchema, addCategorySql);

        // Migration 2: Lab 2 Data Layer expansion (20260830151320_lab2_data_layer)
        const lab2MigrationPath = path.resolve(
          getWorkspaceRoot(),
          "server/prisma/migrations/20260830151320_lab2_data_layer/migration.sql"
        );
        const lab2Sql = fs.readFileSync(lab2MigrationPath, "utf8");
        await executeSqlScriptInSchema(prisma, proofSchema, lab2Sql);

        // 2. Populate authentic Lab 2 records (strictly using Lab 2 columns only, completely isolated without fallback to public)
        // Note: Prisma Client raw query restriction requires 1 query per $executeRawUnsafe call; we execute each statement individually inside a transaction.
        await prisma.$transaction(async (tx) => {
          await tx.$executeRawUnsafe(`SET LOCAL search_path = "${proofSchema}";`);
          await tx.$executeRawUnsafe(`INSERT INTO "Category" (id, name, "isActive") VALUES (10, 'Lab2 Category', true);`);
          await tx.$executeRawUnsafe(`INSERT INTO "RelatedSystem" (id, name, "isActive") VALUES (10, 'Lab2 System', true);`);
          await tx.$executeRawUnsafe(`INSERT INTO "RequesterUser" (id, name, email, department, "isActive", "createdAt", "updatedAt") VALUES (501, 'Lab2 Requester', 'legacy.requester@example.com', 'Academics', true, NOW(), NOW());`);
          await tx.$executeRawUnsafe(`INSERT INTO "Ticket" (id, "ticketNo", summary, description, "requestedPriority", "itPriority", "currentStatus", "requesterId", "categoryId", "relatedSystemId", "ticketOwnerId", "createdAt", "updatedAt") VALUES (601, 'TKT-2026-000001', 'Lab2 Legacy Ticket', 'Description from authentic Lab 2', 'MEDIUM', 'HIGH', 'IN_PROGRESS', 501, 10, 10, NULL, NOW(), NOW());`);
          await tx.$executeRawUnsafe(`INSERT INTO "Attachment" (id, "ticketId", "fileName", "storedFileName", "fileSize", "mimeType", "uploadedByRequesterId", "createdAt") VALUES (701, 601, 'lab2_document.pdf', 'safe_lab2_doc.pdf', 1024, 'application/pdf', 501, NOW());`);
        });

        // 3. Verify that before migration, Lab 3 columns and tables DO NOT exist
        const userColsBefore: Array<{ column_name: string }> = await prisma.$queryRawUnsafe(`
          SELECT column_name
          FROM information_schema.columns
          WHERE table_schema = '${proofSchema}' AND table_name = 'RequesterUser';
        `);
        const userColNamesBefore = userColsBefore.map((c) => c.column_name);
        expect(userColNamesBefore).not.toContain("role");
        expect(userColNamesBefore).not.toContain("passwordHash");
        expect(userColNamesBefore).not.toContain("mustChangePassword");
        expect(userColNamesBefore).not.toContain("sessionVersion");

        const ticketColsBefore: Array<{ column_name: string }> = await prisma.$queryRawUnsafe(`
          SELECT column_name
          FROM information_schema.columns
          WHERE table_schema = '${proofSchema}' AND table_name = 'Ticket';
        `);
        const ticketColNamesBefore = ticketColsBefore.map((c) => c.column_name);
        expect(ticketColNamesBefore).not.toContain("version");
        expect(ticketColNamesBefore).not.toContain("appearsResolvedAt");
        expect(ticketColNamesBefore).not.toContain("appearsResolvedById");
        expect(ticketColNamesBefore).not.toContain("seedKey");

        const tablesBefore: Array<{ table_name: string }> = await prisma.$queryRawUnsafe(`
          SELECT table_name
          FROM information_schema.tables
          WHERE table_schema = '${proofSchema}'
            AND table_name IN ('Session', 'PublicComment', 'InternalNote');
        `);
        expect(tablesBefore.length).toBe(0);

        // 4. Apply Lab 3 forward migration chain
        // Migration 3: Lab 3 schema expansion (20260917000000_lab3_schema_expansion)
        const lab3MigrationPath = path.resolve(
          getWorkspaceRoot(),
          "server/prisma/migrations/20260917000000_lab3_schema_expansion/migration.sql"
        );
        const lab3Sql = fs.readFileSync(lab3MigrationPath, "utf8");
        await executeSqlScriptInSchema(prisma, proofSchema, lab3Sql);

        // Migration 4: Add seedKey to Ticket (20260918000000_add_ticket_seed_key)
        const seedKeyMigrationPath = path.resolve(
          getWorkspaceRoot(),
          "server/prisma/migrations/20260918000000_add_ticket_seed_key/migration.sql"
        );
        const seedKeySql = fs.readFileSync(seedKeyMigrationPath, "utf8");
        await executeSqlScriptInSchema(prisma, proofSchema, seedKeySql);

        // 5. Verify post-migration schema and data preservation
        const legacyUserAfter: Array<{
          id: number;
          name: string;
          email: string;
          role: string;
          passwordHash: string | null;
          mustChangePassword: boolean;
          sessionVersion: number;
        }> = await prisma.$queryRawUnsafe(`
          SELECT id, name, email, role::text, "passwordHash", "mustChangePassword", "sessionVersion"
          FROM "${proofSchema}"."RequesterUser"
          WHERE id = 501;
        `);
        expect(legacyUserAfter.length).toBe(1);
        expect(legacyUserAfter[0].name).toBe("Lab2 Requester");
        expect(legacyUserAfter[0].email).toBe("legacy.requester@example.com");
        expect(legacyUserAfter[0].role).toBe("REQUESTER");
        expect(legacyUserAfter[0].mustChangePassword).toBe(true);
        expect(legacyUserAfter[0].sessionVersion).toBe(1);
        expect(legacyUserAfter[0].passwordHash).toBeNull();

        const legacyTicketAfter: Array<{
          id: number;
          ticketNo: string;
          summary: string;
          currentStatus: string;
          version: number;
          appearsResolvedAt: Date | null;
          appearsResolvedById: number | null;
          seedKey: string | null;
        }> = await prisma.$queryRawUnsafe(`
          SELECT id, "ticketNo", summary, "currentStatus"::text, version, "appearsResolvedAt", "appearsResolvedById", "seedKey"
          FROM "${proofSchema}"."Ticket"
          WHERE id = 601;
        `);
        expect(legacyTicketAfter.length).toBe(1);
        expect(legacyTicketAfter[0].ticketNo).toBe("TKT-2026-000001");
        expect(legacyTicketAfter[0].summary).toBe("Lab2 Legacy Ticket");
        expect(legacyTicketAfter[0].currentStatus).toBe("IN_PROGRESS");
        expect(legacyTicketAfter[0].version).toBe(1);
        expect(legacyTicketAfter[0].appearsResolvedAt).toBeNull();
        expect(legacyTicketAfter[0].appearsResolvedById).toBeNull();
        expect(legacyTicketAfter[0].seedKey).toBeNull();

        // 6. Verify newly expanded Lab 3 features can be inserted into the migrated schema
        // Note: Each INSERT statement is executed as a single query per $executeRawUnsafe call within a transaction
        await prisma.$transaction(async (tx) => {
          await tx.$executeRawUnsafe(`SET LOCAL search_path = "${proofSchema}";`);
          await tx.$executeRawUnsafe(`INSERT INTO "Ticket" ("ticketNo", summary, description, "requestedPriority", "itPriority", "currentStatus", "requesterId", "categoryId", "relatedSystemId", version, "createdAt", "updatedAt") VALUES ('TKT-2026-000002', 'New Lab 3 Ticket', 'Created post-migration', 'LOW', 'LOW', 'OPEN', 501, 10, 10, 1, NOW(), NOW());`);
          await tx.$executeRawUnsafe(`INSERT INTO "PublicComment" ("ticketId", "authorId", body, "createdAt") VALUES (601, 501, 'Sample public comment on legacy ticket', NOW());`);
          await tx.$executeRawUnsafe(`INSERT INTO "InternalNote" ("ticketId", "authorId", body, "createdAt") VALUES (601, 501, 'Sample internal note on legacy ticket', NOW());`);
          await tx.$executeRawUnsafe(`INSERT INTO "Session" (id, "sessionVersion", "csrfToken", "userId", "expiresAt", "createdAt") VALUES ('test-session-proof-id', 1, 'csrf-token-proof', 501, NOW() + INTERVAL '1 day', NOW());`);
        });
      } finally {
        await prisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${proofSchema}" CASCADE;`);
      }
    });
  });

  describe("MIG-03 & MIG-04 (AC-16, AC-17, R13, R14): Populated DB Data Preservation, Sequence Continuity & Credential Provisioning", () => {
    it("proves populated DB data (users, tickets, attachments) is preserved across schema migration and seeding", async () => {
      // 1. Create a legacy staff user to test assigned ownership preservation
      const legacyStaff = await prisma.user.create({
        data: {
          name: "Legacy Staff",
          email: `legacy.staff.${Date.now()}@example.com`,
          department: "IT Support",
          isActive: true,
          passwordHash: null,
          mustChangePassword: true,
          role: "IT_STAFF",
        },
      });

      // 2. Create a test user simulating a legacy Lab 2 requester without password
      const legacyEmail = `legacy.user.${Date.now()}@example.com`;
      const legacyUser = await prisma.user.create({
        data: {
          name: "Legacy User",
          email: legacyEmail,
          department: "Operations",
          isActive: true,
          // In Lab 2, passwordHash was null
          passwordHash: null,
          mustChangePassword: true,
          role: "REQUESTER",
        },
      });

      // Verify legacy fields are intact
      expect(legacyUser.id).toBeGreaterThan(0);
      expect(legacyUser.name).toBe("Legacy User");
      expect(legacyUser.email).toBe(legacyEmail);
      expect(legacyUser.department).toBe("Operations");
      expect(legacyUser.isActive).toBe(true);
      expect(legacyUser.passwordHash).toBeNull();

      // Find active category and related system
      const cat = await prisma.category.findFirst({ where: { isActive: true } });
      const sys = await prisma.relatedSystem.findFirst({ where: { isActive: true } });
      expect(cat).toBeDefined();
      expect(sys).toBeDefined();

      // 3. Create a legacy ticket with assigned owner and in-progress status
      const testTicketNo = `TKT-LEGACY-${Date.now()}`;
      const legacyTicket = await prisma.ticket.create({
        data: {
          ticketNo: testTicketNo,
          summary: "Legacy pre-migration ticket",
          description: "Testing data preservation across schema expansion and seeding",
          requestedPriority: "MEDIUM",
          itPriority: "HIGH",
          currentStatus: "IN_PROGRESS",
          requesterId: legacyUser.id,
          ticketOwnerId: legacyStaff.id,
          categoryId: cat!.id,
          relatedSystemId: sys!.id,
          version: 1,
        },
      });

      // 4. Create physical file on disk and active attachment linked to the legacy ticket
      const uploadDir = getUploadDirectory();
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      const activeStoredName = `${Date.now()}-safe-legacy_document.pdf`;
      const activeFilePath = path.join(uploadDir, activeStoredName);
      const fileBytes = Buffer.from("%PDF-1.4 Mock legacy attachment binary content for testing data preservation");
      fs.writeFileSync(activeFilePath, fileBytes);
      const originalFileHash = crypto.createHash("sha256").update(fileBytes).digest("hex");

      const activeAttachment = await prisma.attachment.create({
        data: {
          ticketId: legacyTicket.id,
          fileName: "legacy_document.pdf",
          storedFileName: activeStoredName,
          fileSize: fileBytes.byteLength,
          mimeType: "application/pdf",
          uploadedByRequesterId: legacyUser.id,
        },
      });

      // 5. Create soft-removed attachment linked to the legacy ticket (per AC-16 & API-18)
      const removedAttachment = await prisma.attachment.create({
        data: {
          ticketId: legacyTicket.id,
          fileName: "legacy_removed_screenshot.png",
          storedFileName: `1726000000001-safe-legacy_removed_screenshot.png`,
          fileSize: 2048,
          mimeType: "image/png",
          uploadedByRequesterId: legacyUser.id,
          removedAt: new Date("2026-09-01T10:00:00.000Z"),
          removalReason: "Replaced with updated screenshot",
        },
      });

      try {
        // Verify ticket preservation with foreign keys
        expect(legacyTicket.id).toBeGreaterThan(0);
        expect(legacyTicket.ticketNo).toBe(testTicketNo);
        expect(legacyTicket.itPriority).toBe("HIGH");
        expect(legacyTicket.requestedPriority).toBe("MEDIUM");
        expect(legacyTicket.currentStatus).toBe("IN_PROGRESS");
        expect(legacyTicket.ticketOwnerId).toBe(legacyStaff.id);
        expect(legacyTicket.version).toBe(1);

        // Verify attachment preservation
        expect(activeAttachment.id).toBeGreaterThan(0);
        expect(activeAttachment.ticketId).toBe(legacyTicket.id);
        expect(activeAttachment.fileName).toBe("legacy_document.pdf");
        expect(activeAttachment.fileSize).toBe(fileBytes.byteLength);
        expect(activeAttachment.removedAt).toBeNull();
        expect(activeAttachment.removalReason).toBeNull();

        expect(removedAttachment.id).toBeGreaterThan(activeAttachment.id);
        expect(removedAttachment.ticketId).toBe(legacyTicket.id);
        expect(removedAttachment.removedAt).not.toBeNull();
        expect(removedAttachment.removalReason).toBe("Replaced with updated screenshot");

        // Verify sequence continuity: inserting another ticket and attachment accepts next sequential ID without collision
        const nextTicket = await prisma.ticket.create({
          data: {
            ticketNo: `TKT-SEQ-${Date.now()}`,
            summary: "Sequential ticket check",
            description: "Testing sequence continuity",
            requestedPriority: "LOW",
            itPriority: "LOW",
            currentStatus: "NEW",
            requesterId: legacyUser.id,
            categoryId: cat!.id,
            relatedSystemId: sys!.id,
          },
        });
        expect(nextTicket.id).toBeGreaterThan(legacyTicket.id);

        const nextAttachment = await prisma.attachment.create({
          data: {
            ticketId: nextTicket.id,
            fileName: "sequential_attachment.txt",
            storedFileName: `1726000000002-safe-sequential_attachment.txt`,
            fileSize: 512,
            mimeType: "text/plain",
            uploadedByRequesterId: legacyUser.id,
          },
        });
        expect(nextAttachment.id).toBeGreaterThan(removedAttachment.id);

        // Run seed to prove AC-17 provisions credentials and does NOT overwrite existing tickets or change owners
        // (Note: Authentic Lab 2 forward schema migration DDL under AC-14/AC-15 is proven in MIG-02 above)
        await seed(prisma);

        // Verify physical file bytes and SHA-256 on disk remain intact post-migration (AC-14, MIG-01)
        expect(fs.existsSync(activeFilePath)).toBe(true);
        const fileBytesAfter = fs.readFileSync(activeFilePath);
        expect(fileBytesAfter.byteLength).toBe(fileBytes.byteLength);
        const fileHashAfter = crypto.createHash("sha256").update(fileBytesAfter).digest("hex");
        expect(fileHashAfter).toBe(originalFileHash);

        // Verify legacy user received temporary password and mustChangePassword = true (AC-17)
        const provisionedLegacyUser = await prisma.user.findUnique({
          where: { id: legacyUser.id },
        });
        expect(provisionedLegacyUser).toBeDefined();
        expect(provisionedLegacyUser!.passwordHash).toContain("$argon2id$");
        expect(provisionedLegacyUser!.mustChangePassword).toBe(true);
        expect(provisionedLegacyUser!.role).toBe("REQUESTER");
        expect(provisionedLegacyUser!.name).toBe("Legacy User");
        expect(provisionedLegacyUser!.department).toBe("Operations");

        // Verify legacy staff received password without losing role
        const provisionedStaff = await prisma.user.findUnique({
          where: { id: legacyStaff.id },
        });
        expect(provisionedStaff!.role).toBe("IT_STAFF");
        expect(provisionedStaff!.passwordHash).toContain("$argon2id$");
        expect(provisionedStaff!.mustChangePassword).toBe(true);

        // Verify legacy ticket was NOT overwritten by seed and ownership was preserved
        const ticketAfterSeed = await prisma.ticket.findUnique({
          where: { id: legacyTicket.id },
          include: { attachments: true },
        });
        expect(ticketAfterSeed).toBeDefined();
        expect(ticketAfterSeed!.summary).toBe("Legacy pre-migration ticket");
        expect(ticketAfterSeed!.description).toBe("Testing data preservation across schema expansion and seeding");
        expect(ticketAfterSeed!.currentStatus).toBe("IN_PROGRESS");
        expect(ticketAfterSeed!.ticketOwnerId).toBe(legacyStaff.id);
        expect(ticketAfterSeed!.itPriority).toBe("HIGH");
        expect(ticketAfterSeed!.requestedPriority).toBe("MEDIUM");

        // Verify attachments on the ticket remain intact
        expect(ticketAfterSeed!.attachments.length).toBe(2);
        const activeAttAfterSeed = ticketAfterSeed!.attachments.find((a) => a.id === activeAttachment.id);
        const removedAttAfterSeed = ticketAfterSeed!.attachments.find((a) => a.id === removedAttachment.id);
        expect(activeAttAfterSeed).toBeDefined();
        expect(activeAttAfterSeed!.fileName).toBe("legacy_document.pdf");
        expect(activeAttAfterSeed!.fileSize).toBe(fileBytes.byteLength);
        expect(activeAttAfterSeed!.removedAt).toBeNull();
        expect(removedAttAfterSeed).toBeDefined();
        expect(removedAttAfterSeed!.removedAt).not.toBeNull();
        expect(removedAttAfterSeed!.removalReason).toBe("Replaced with updated screenshot");

        // Cleanup created records
        await prisma.attachment.deleteMany({
          where: { id: { in: [activeAttachment.id, removedAttachment.id, nextAttachment.id] } },
        });
        await prisma.ticket.deleteMany({
          where: { id: { in: [legacyTicket.id, nextTicket.id] } },
        });
      } finally {
        if (fs.existsSync(activeFilePath)) {
          fs.unlinkSync(activeFilePath);
        }
        await prisma.attachment.deleteMany({
          where: { fileName: { in: ["legacy_document.pdf", "legacy_removed_screenshot.png", "sequential_attachment.txt"] } },
        });
        await prisma.ticket.deleteMany({
          where: { ticketNo: { in: [testTicketNo, `TKT-SEQ-${Date.now()}`] } },
        });
        await prisma.user.deleteMany({
          where: { id: { in: [legacyUser.id, legacyStaff.id] } },
        });
      }
    });

    it("proves seed isolates identity and does not modify fields or add comments/notes to colliding tickets (e.g. TKT-2026-000008)", async () => {
      const collisionTicketNo = "TKT-2026-000008";
      const cat = await prisma.category.findFirst({ where: { isActive: true } });
      const sys = await prisma.relatedSystem.findFirst({ where: { isActive: true } });
      const existingUser = await prisma.user.findFirst({ where: { role: "REQUESTER", isActive: true } });
      const staffUser = await prisma.user.findFirst({ where: { role: "IT_STAFF", isActive: true } });

      // Clean up any existing collision ticket first
      await prisma.ticket.deleteMany({ where: { ticketNo: collisionTicketNo } });

      const realTicket = await prisma.ticket.create({
        data: {
          ticketNo: collisionTicketNo,
          summary: "Pre-existing real user ticket from Lab 2",
          description: "This ticket must not be modified or touched by seed",
          requestedPriority: "LOW",
          itPriority: "LOW",
          currentStatus: "NEW",
          requesterId: existingUser!.id,
          ticketOwnerId: staffUser!.id,
          categoryId: cat!.id,
          relatedSystemId: sys!.id,
          version: 1,
        },
      });

      try {
        // Run seed
        await seed(prisma);

        // Verify real ticket remains strictly unmodified
        const ticketCheck = await prisma.ticket.findUnique({
          where: { id: realTicket.id },
          include: { publicComments: true, internalNotes: true },
        });

        expect(ticketCheck).toBeDefined();
        expect(ticketCheck!.summary).toBe("Pre-existing real user ticket from Lab 2");
        expect(ticketCheck!.description).toBe("This ticket must not be modified or touched by seed");
        expect(ticketCheck!.ticketOwnerId).toBe(staffUser!.id);
        expect(ticketCheck!.currentStatus).toBe("NEW");

        // Fixture comments/notes MUST NOT have been attached to this real ticket
        expect(ticketCheck!.publicComments.length).toBe(0);
        expect(ticketCheck!.internalNotes.length).toBe(0);

        // Verify the seed fixture ("LEB2 submission upload timeout") was created with its own allocated ticket
        const seedFixtureTicket = await prisma.ticket.findFirst({
          where: { summary: "LEB2 submission upload timeout" },
          include: { publicComments: true, internalNotes: true },
        });
        expect(seedFixtureTicket).toBeDefined();
        expect(seedFixtureTicket!.id).not.toBe(realTicket.id);
        expect(seedFixtureTicket!.ticketNo).not.toBe(collisionTicketNo);
        // Comments and notes belong to the seed fixture ticket
        expect(seedFixtureTicket!.publicComments.length).toBeGreaterThanOrEqual(1);
        expect(seedFixtureTicket!.internalNotes.length).toBeGreaterThanOrEqual(1);
      } finally {
        await prisma.ticket.deleteMany({
          where: { ticketNo: collisionTicketNo },
        });
        await prisma.ticket.deleteMany({
          where: { summary: { in: ["Pre-existing real user ticket from Lab 2", "LEB2 submission upload timeout"] } },
        });
      }
    });

    it("proves seed creates required fixtures and provisions credentials without destroying existing passwords", async () => {
      // 1. Run seed
      const seedResult = await seed(prisma);
      expect(seedResult.usersCount).toBeGreaterThanOrEqual(9);

      // Verify default accounts in database
      const accounts = getDefaultSeedAccounts();
      const admin = await prisma.user.findUnique({ where: { email: "admin@example.com" } });
      expect(admin).toBeDefined();
      expect(admin!.role).toBe("ADMINISTRATOR");
      expect(admin!.mustChangePassword).toBe(true);
      expect(admin!.passwordHash).toContain("$argon2id$");

      // Verify requester has passwordHash
      const reqUser = await prisma.user.findUnique({ where: { email: "jennifer.a@example.com" } });
      expect(reqUser).toBeDefined();
      expect(reqUser!.passwordHash).toContain("$argon2id$");

      // 2. Simulate user changing password
      const changedPasswordHash = await hashPassword("UserChangedTheirPassword2026!");
      await prisma.user.update({
        where: { email: "jennifer.a@example.com" },
        data: { passwordHash: changedPasswordHash, mustChangePassword: false },
      });

      // 3. Re-run seed to prove idempotency and AC-17 password preservation
      await seed(prisma);

      const reqUserAfterSeed = await prisma.user.findUnique({ where: { email: "jennifer.a@example.com" } });
      expect(reqUserAfterSeed!.passwordHash).toBe(changedPasswordHash);
      expect(reqUserAfterSeed!.mustChangePassword).toBe(false);
    });
  });

  describe("MIG-05 (AC-18, AC-31): Argon2id Password Cryptography and itPriority", () => {
    it("proves hashPassword outputs OWASP-compliant Argon2id hash", async () => {
      const plain = "SecureTestingPassword2026!";
      const hashed = await hashPassword(plain);

      // OWASP profile check: starts with $argon2id$ and contains m=19456,p=1,t=2
      expect(hashed).toMatch(/^\$argon2id\$v=19\$m=19456,p=1,t=2\$/);
      expect(await verifyPassword(plain, hashed)).toBe(true);
      expect(await verifyPassword("WrongPassword123!", hashed)).toBe(false);
    });

    it("preserves itPriority field and values on tickets in the database", async () => {
      const ticketsWithItPriority = await prisma.ticket.findMany({
        select: { id: true, requestedPriority: true, itPriority: true },
        take: 5,
      });
      for (const t of ticketsWithItPriority) {
        expect(["LOW", "MEDIUM", "HIGH"]).toContain(t.itPriority);
        expect(["LOW", "MEDIUM", "HIGH"]).toContain(t.requestedPriority);
      }
    });
  });

  describe("MIG-06 (AC-18, R13, R14): Seed Role Counts and Realistic Fixtures", () => {
    it("proves seed creates >=4 active & 1 inactive Requester, 3 active & 1 inactive Staff, 1 active Admin", async () => {
      await seed(prisma);

      const activeRequesters = await prisma.user.count({
        where: { role: "REQUESTER", isActive: true },
      });
      const inactiveRequesters = await prisma.user.count({
        where: { role: "REQUESTER", isActive: false },
      });
      const activeStaff = await prisma.user.count({
        where: { role: "IT_STAFF", isActive: true },
      });
      const inactiveStaff = await prisma.user.count({
        where: { role: "IT_STAFF", isActive: false },
      });
      const activeAdmin = await prisma.user.count({
        where: { role: "ADMINISTRATOR", isActive: true },
      });

      expect(activeRequesters).toBeGreaterThanOrEqual(4);
      expect(inactiveRequesters).toBeGreaterThanOrEqual(1);
      expect(activeStaff).toBeGreaterThanOrEqual(3);
      expect(inactiveStaff).toBeGreaterThanOrEqual(1);
      expect(activeAdmin).toBeGreaterThanOrEqual(1);
    });

    it("proves seed creates >=24 tickets spanning all 8 statuses, all 3 priorities, assigned/unassigned ownership, and comments/notes", async () => {
      await seed(prisma);

      const totalTickets = await prisma.ticket.count();
      expect(totalTickets).toBeGreaterThanOrEqual(24);

      // Verify all 8 statuses exist in seeded tickets
      const allStatuses = [
        "NEW",
        "OPEN",
        "IN_PROGRESS",
        "WAITING_FOR_REQUESTER",
        "RESOLVED",
        "CLOSED",
        "REOPENED",
        "CANCELLED",
      ] as const;

      for (const st of allStatuses) {
        const count = await prisma.ticket.count({ where: { currentStatus: st } });
        expect(count, `Status ${st} should have at least 1 ticket`).toBeGreaterThanOrEqual(1);
      }

      // Verify all 3 priorities exist
      for (const prio of ["LOW", "MEDIUM", "HIGH"] as const) {
        const count = await prisma.ticket.count({ where: { requestedPriority: prio } });
        expect(count, `Priority ${prio} should have at least 1 ticket`).toBeGreaterThanOrEqual(1);
      }

      // Verify both assigned and unassigned ownership modes
      const assignedCount = await prisma.ticket.count({
        where: { ticketOwnerId: { not: null } },
      });
      const unassignedCount = await prisma.ticket.count({
        where: { ticketOwnerId: null },
      });
      expect(assignedCount).toBeGreaterThanOrEqual(1);
      expect(unassignedCount).toBeGreaterThanOrEqual(1);

      // Verify sample PublicComment and InternalNote records
      const publicCommentCount = await prisma.publicComment.count();
      const internalNoteCount = await prisma.internalNote.count();
      expect(publicCommentCount).toBeGreaterThanOrEqual(1);
      expect(internalNoteCount).toBeGreaterThanOrEqual(1);

      // Verify RESOLVED and CLOSED tickets have appearsResolvedAt and appearsResolvedById populated
      const resolvedTickets = await prisma.ticket.findMany({
        where: { currentStatus: { in: ["RESOLVED", "CLOSED"] } },
        select: { id: true, appearsResolvedAt: true, appearsResolvedById: true },
      });
      expect(resolvedTickets.length).toBeGreaterThan(0);
      const withResolutionMetadata = resolvedTickets.filter(
        (t) => t.appearsResolvedAt !== null && t.appearsResolvedById !== null
      );
      expect(withResolutionMetadata.length).toBeGreaterThan(0);

      // Verify idempotency: run seed again and assert exact row count preservation
      const beforeTickets = await prisma.ticket.count();
      const beforeComments = await prisma.publicComment.count();
      const beforeNotes = await prisma.internalNote.count();

      await seed(prisma);

      const afterTickets = await prisma.ticket.count();
      const afterComments = await prisma.publicComment.count();
      const afterNotes = await prisma.internalNote.count();

      expect(afterTickets).toBe(beforeTickets);
      expect(afterComments).toBe(beforeComments);
      expect(afterNotes).toBe(beforeNotes);
    });
  });
});
