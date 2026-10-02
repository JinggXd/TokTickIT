import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { describe, it, expect } from "vitest";
import { getPrisma } from "../../src/prisma.js";
import { requireTestEnvironment } from "../../src/config/testEnvironment.js";
// Recovery is a real pg_dump/pg_restore round trip, not migration SQL replay.
import { verifyRecovery } from "../../scripts/verify-recovery.mjs";

describe("MIG-L4-02: disposable database and attachment recovery", () => {
  it("restores schema, every row, sequence state and attachment bytes into a fresh database", async () => {
    const environment = requireTestEnvironment();
    const p = getPrisma();
    const suffix = randomUUID();
    const users: number[] = [];
    let ticketId: number | undefined;
    const fileNames = [`recovery-${suffix}-active.txt`, `recovery-${suffix}-removed.txt`];
    try {
      for (const role of ["REQUESTER", "IT_STAFF"] as const) {
        const user = await p.user.create({ data: { name: `Recovery ${role}`, email: `recovery-${role}-${suffix}@test.local`, role, mustChangePassword: false } });
        users.push(user.id);
      }
      const category = await p.category.findFirstOrThrow(), system = await p.relatedSystem.findFirstOrThrow();
      const ticket = await p.ticket.create({ data: { ticketNo: `RECOVERY-${suffix}`, summary: "Recovery proof", description: "Backup/restore fixture",
        requesterId: users[0], ticketOwnerId: users[1], categoryId: category.id, relatedSystemId: system.id,
        requestedPriority: "HIGH", itPriority: "MEDIUM", currentStatus: "IN_PROGRESS", version: 3 } });
      ticketId = ticket.id;
      for (const [i, storedFileName] of fileNames.entries()) {
        const bytes = Buffer.from(`Recovery bytes ${suffix} ${i}\n`);
        await fs.writeFile(path.join(environment.uploadDir, storedFileName), bytes);
        await p.attachment.create({ data: { ticketId, storedFileName, fileName: storedFileName,
          fileSize: bytes.length, mimeType: "text/plain", uploadedByRequesterId: users[0], removedAt: i ? new Date() : null } });
      }
      await p.publicComment.create({ data: { ticketId, authorId: users[0], body: "Public comment recovery proof" } });
      await p.internalNote.create({ data: { ticketId, authorId: users[1], body: "Internal note recovery proof" } });
      await p.actionTaken.create({ data: { ticketId, createdById: users[1], performedById: users[1], status: "COMPLETED", actionDescription: "Recovery action proof", result: "Verified", version: 2, clientRequestId: randomUUID(), requestPayloadHash: "a".repeat(64) } });
      await p.session.create({ data: { id: `recovery-${suffix}`, userId: users[0], sessionVersion: 1,
        csrfToken: `recovery-csrf-${suffix}`, expiresAt: new Date(Date.now() + 3600000) } });
      const result = await verifyRecovery({ databaseUrl: environment.databaseUrl,
        uploadDir: environment.uploadDir, outputDir: path.join(environment.uploadDir, "recovery-proof"),
        pgDump: process.env.PG_DUMP_BIN, pgRestore: process.env.PG_RESTORE_BIN });
      expect(result.databaseMatched).toBe(true);
      expect(result.filesMatched).toBe(true);
      expect(result.files.map((file: any) => file.path)).toEqual(expect.arrayContaining(fileNames));
      expect(result.tables.map((table: any) => table.name)).toEqual(expect.arrayContaining([
        "RequesterUser", "Ticket", "Attachment", "PublicComment", "InternalNote", "ActionTaken", "Session", "_prisma_migrations",
      ]));
      console.log("MIG-L4-02", JSON.stringify(result));
    } finally {
      if (ticketId) {
        await p.attachment.deleteMany({ where: { ticketId } });
        await p.ticket.deleteMany({ where: { id: ticketId } });
      }
      await p.user.deleteMany({ where: { id: { in: users } } });
      for (const name of fileNames) await fs.rm(path.join(environment.uploadDir, name), { force: true });
    }
  }, 180000);
});
