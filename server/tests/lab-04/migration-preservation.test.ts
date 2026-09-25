import { describe, it, expect, beforeAll } from "vitest";
import { getPrisma } from "../../src/prisma.js";
import { seed } from "../../prisma/seed.js";

describe("Phase F2 / L4-P03: Database Migration, Model & Idempotent Seed (MIG-L4-01, MIG-L4-02)", () => {
  const prisma = getPrisma();

  it("MIG-L4-01: proves ActionTaken model and schema fields exist on Prisma Client", async () => {
    // Assert prisma.actionTaken exists
    expect(prisma).toHaveProperty("actionTaken");
    expect(typeof (prisma as any).actionTaken.findMany).toBe("function");
    expect(typeof (prisma as any).actionTaken.create).toBe("function");
  });

  it("MIG-L4-01: proves populated database data is preserved and zero tables dropped", async () => {
    const userCount = await prisma.user.count();
    const ticketCount = await prisma.ticket.count();
    const categoryCount = await prisma.category.count();
    const systemCount = await prisma.relatedSystem.count();

    expect(userCount).toBeGreaterThanOrEqual(5);
    expect(ticketCount).toBeGreaterThanOrEqual(20);
    expect(categoryCount).toBeGreaterThanOrEqual(4);
    expect(systemCount).toBeGreaterThanOrEqual(4);
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
