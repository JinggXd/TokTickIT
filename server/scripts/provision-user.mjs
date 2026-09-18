#!/usr/bin/env node
import { PrismaClient } from "@prisma/client";
import { provisionUserCredentials } from "../dist/src/utils/provisionUser.js";

// Specification §7.2 Rule 6:
// "A local provisioning helper accepts per-user temporary secrets at runtime, hashes them,
// sets mustChangePassword, and never prints or commits plaintext secrets."

function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--email" && args[i + 1]) {
      parsed.email = args[++i];
    } else if (args[i] === "--userId" && args[i + 1]) {
      parsed.userId = parseInt(args[++i], 10);
    } else if (args[i] === "--password" && args[i + 1]) {
      parsed.password = args[++i];
    }
  }
  return parsed;
}

async function main() {
  const { email, userId, password } = parseArgs();
  const secret = password || process.env.PROVISION_PASSWORD;

  if (!email && !userId) {
    console.error("Usage: node scripts/provision-user.mjs --email <email> [--password <secret>]");
    process.exit(1);
  }

  if (!secret) {
    console.error("Error: temporary password is required (via --password or PROVISION_PASSWORD env var).");
    process.exit(1);
  }

  const prisma = new PrismaClient();
  try {
    const result = await provisionUserCredentials({
      email,
      userId,
      temporaryPassword: secret,
    }, prisma);

    // Never print or log plaintext secret to console per §7.2 Rule 6
    console.log(`Provisioned temporary credentials for ${result.email} (ID: ${result.id}, role: ${result.role}, mustChangePassword: true). Plaintext secrets are never logged.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("Provisioning error:", err.message);
  process.exit(1);
});
