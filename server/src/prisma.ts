import { PrismaClient } from "@prisma/client";

// Module augmentation: preserve backward compatibility for legacy Lab 2 code & tests calling prisma.requesterUser
declare module "@prisma/client" {
  interface PrismaClient {
    requesterUser: PrismaClient["user"];
  }
}

// Lazy singleton: the client is created on first use, not at import time.
// This keeps route modules and tests that don't touch the DB (e.g. /api/health)
// free of database side effects.
let client: PrismaClient | null = null;

export function getPrisma(): PrismaClient {
  if (!client) {
    const raw = new PrismaClient();
    if (!(raw as any).requesterUser && (raw as any).user) {
      (raw as any).requesterUser = (raw as any).user;
    }
    client = raw;
  }
  return client;
}
