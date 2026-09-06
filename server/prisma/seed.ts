import { getPrisma } from "../src/prisma.js";

// Lab 2 — Idempotent Seed Data (specification.md Section 7.3)
// Safe to run repeatedly without creating duplicates.
async function main() {
  const prisma = getPrisma();

  // 1. Four required Ticket Categories
  const categories = [
    "Account and Access",
    "Hardware",
    "Software",
    "Network",
  ];

  for (const name of categories) {
    await prisma.category.upsert({
      where: { name },
      update: { isActive: true },
      create: { name, isActive: true },
    });
  }
  console.log(`Seeded ${categories.length} categories.`);

  // 2. Seven realistic Related Systems
  const relatedSystems = [
    "Email",
    "Campus Wi-Fi",
    "VPN",
    "LEB2 App",
    "Grade Submission App",
    "Printer",
    "Corporate Laptop",
  ];

  for (const name of relatedSystems) {
    await prisma.relatedSystem.upsert({
      where: { name },
      update: { isActive: true },
      create: { name, isActive: true },
    });
  }
  console.log(`Seeded ${relatedSystems.length} related systems.`);

  // 3. Five Development Requesters (4 active + 1 inactive)
  const requesters = [
    {
      name: "Jennifer Anderson",
      email: "jennifer.a@example.com",
      department: "Marketing",
      isActive: true,
    },
    {
      name: "Sarah Johnson",
      email: "sarah.j@example.com",
      department: "Finance",
      isActive: true,
    },
    {
      name: "David Lee",
      email: "david.l@example.com",
      department: "Academic Affairs",
      isActive: true,
    },
    {
      name: "Emily Chen",
      email: "emily.c@example.com",
      department: "Sales",
      isActive: true,
    },
    {
      name: "Robert Wilson",
      email: "robert.w@example.com",
      department: "Facilities",
      isActive: false, // inactive requester for negative tests
    },
  ];

  for (const requester of requesters) {
    await prisma.requesterUser.upsert({
      where: { email: requester.email },
      update: {
        name: requester.name,
        department: requester.department,
        isActive: requester.isActive,
      },
      create: requester,
    });
  }
  console.log(`Seeded ${requesters.length} Development Requesters.`);

  console.log("Lab 2 seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await getPrisma().$disconnect();
  });
