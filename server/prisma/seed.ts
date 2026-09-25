import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { getPrisma } from "../src/prisma.js";
import { hashPassword } from "../src/utils/password.js";

export const DEFAULT_INITIAL_PASSWORD = "InitialPassword123!";

export interface SeedAccount {
  name: string;
  email: string;
  department: string;
  role: "REQUESTER" | "IT_STAFF" | "ADMINISTRATOR";
  isActive: boolean;
  mustChangePassword: boolean;
}

export function getDefaultSeedAccounts(): SeedAccount[] {
  return [
    // Administrator (≥1 active)
    {
      name: "Admin User",
      email: "admin@example.com",
      department: "IT Administration",
      role: "ADMINISTRATOR",
      isActive: true,
      mustChangePassword: true,
    },
    // IT Staff (3 active + 1 inactive)
    {
      name: "Staff Alex",
      email: "staff1@example.com",
      department: "IT Support",
      role: "IT_STAFF",
      isActive: true,
      mustChangePassword: true,
    },
    {
      name: "Staff Brian",
      email: "staff2@example.com",
      department: "IT Infrastructure",
      role: "IT_STAFF",
      isActive: true,
      mustChangePassword: true,
    },
    {
      name: "Staff Chloe",
      email: "staff3@example.com",
      department: "IT Applications",
      role: "IT_STAFF",
      isActive: true,
      mustChangePassword: true,
    },
    {
      name: "Staff Inactive",
      email: "staff.inactive@example.com",
      department: "IT Support",
      role: "IT_STAFF",
      isActive: false,
      mustChangePassword: true,
    },
    // Requesters (4 active + 1 inactive — preserved Lab 2 requesters)
    {
      name: "Jennifer Anderson",
      email: "jennifer.a@example.com",
      department: "Marketing",
      role: "REQUESTER",
      isActive: true,
      mustChangePassword: true,
    },
    {
      name: "Sarah Johnson",
      email: "sarah.j@example.com",
      department: "Finance",
      role: "REQUESTER",
      isActive: true,
      mustChangePassword: true,
    },
    {
      name: "David Lee",
      email: "david.l@example.com",
      department: "Academic Affairs",
      role: "REQUESTER",
      isActive: true,
      mustChangePassword: true,
    },
    {
      name: "Emily Chen",
      email: "emily.c@example.com",
      department: "Sales",
      role: "REQUESTER",
      isActive: true,
      mustChangePassword: true,
    },
    {
      name: "Robert Wilson",
      email: "robert.w@example.com",
      department: "Facilities",
      role: "REQUESTER",
      isActive: false, // inactive requester
      mustChangePassword: true,
    },
  ];
}

export interface SeedActionFixture {
  clientRequestId: string;
  actionDateTime?: string;
  performedByEmail: string;
  actionDescription: string;
  status: "COMPLETED" | "PENDING" | "CANCELLED";
  result?: string;
  assigneeEmail?: string;
  followUpRequired?: boolean;
  followUpNote?: string;
  attachmentNotes?: string;
}

export interface SeedTicketFixture {
  seedKey: string;
  ticketNo: string;
  summary: string;
  description: string;
  categoryName: string;
  systemName: string;
  requesterEmail: string;
  requestedPriority: "LOW" | "MEDIUM" | "HIGH";
  itPriority: "LOW" | "MEDIUM" | "HIGH";
  currentStatus:
    | "NEW"
    | "OPEN"
    | "IN_PROGRESS"
    | "WAITING_FOR_REQUESTER"
    | "RESOLVED"
    | "CLOSED"
    | "REOPENED"
    | "CANCELLED";
  ownerEmail?: string;
  resolvedByEmail?: string;
  comments?: Array<{ authorEmail: string; body: string }>;
  notes?: Array<{ authorEmail: string; body: string }>;
  actions?: SeedActionFixture[];
}

export function getSeedTicketFixtures(): SeedTicketFixture[] {
  const fixtures: Array<Omit<SeedTicketFixture, "seedKey">> = [
    // 1-3: NEW
    {
      ticketNo: "TKT-2026-000001",
      summary: "Cannot access department shared folder",
      description: "Permission denied when attempting to open network drive P:/",
      categoryName: "Account and Access",
      systemName: "Corporate Laptop",
      requesterEmail: "jennifer.a@example.com",
      requestedPriority: "LOW",
      itPriority: "LOW",
      currentStatus: "NEW",
    },
    {
      ticketNo: "TKT-2026-000002",
      summary: "Second monitor not detected via HDMI",
      description: "Connecting HDMI cable to dock does not mirror or extend display",
      categoryName: "Hardware",
      systemName: "Corporate Laptop",
      requesterEmail: "sarah.j@example.com",
      requestedPriority: "MEDIUM",
      itPriority: "MEDIUM",
      currentStatus: "NEW",
    },
    {
      ticketNo: "TKT-2026-000003",
      summary: "Critical spreadsheet software crashing on launch",
      description: "Application immediately terminates with memory error code 0xC0000005",
      categoryName: "Software",
      systemName: "LEB2 App",
      requesterEmail: "david.l@example.com",
      requestedPriority: "HIGH",
      itPriority: "HIGH",
      currentStatus: "NEW",
    },

    // 4-6: OPEN
    {
      ticketNo: "TKT-2026-000004",
      summary: "Need VPN profile for remote work",
      description: "Requesting configuration profile to connect from home",
      categoryName: "Network",
      systemName: "VPN",
      requesterEmail: "emily.c@example.com",
      requestedPriority: "LOW",
      itPriority: "LOW",
      currentStatus: "OPEN",
      ownerEmail: "staff1@example.com",
    },
    {
      ticketNo: "TKT-2026-000005",
      summary: "Email mailbox quota almost exceeded",
      description: "Received 90% full warning on primary mailbox",
      categoryName: "Account and Access",
      systemName: "Email",
      requesterEmail: "jennifer.a@example.com",
      requestedPriority: "MEDIUM",
      itPriority: "MEDIUM",
      currentStatus: "OPEN",
    },
    {
      ticketNo: "TKT-2026-000006",
      summary: "Wi-Fi disconnecting continuously in building B",
      description: "Signal drops every 5 minutes during lab sessions",
      categoryName: "Network",
      systemName: "Campus Wi-Fi",
      requesterEmail: "sarah.j@example.com",
      requestedPriority: "HIGH",
      itPriority: "HIGH",
      currentStatus: "OPEN",
      ownerEmail: "staff2@example.com",
    },

    // 7-9: IN_PROGRESS
    {
      ticketNo: "TKT-2026-000007",
      summary: "Request replacement ergonomic mouse",
      description: "Old mouse scroll wheel is unresponsive and double-clicking",
      categoryName: "Hardware",
      systemName: "Corporate Laptop",
      requesterEmail: "david.l@example.com",
      requestedPriority: "LOW",
      itPriority: "LOW",
      currentStatus: "IN_PROGRESS",
      ownerEmail: "staff3@example.com",
      actions: [
        {
          clientRequestId: "seed-act-000007-1",
          actionDateTime: "2026-09-17T09:30:00.000Z",
          performedByEmail: "staff3@example.com",
          actionDescription: "Verified mouse failure and ordered replacement from IT stock room",
          status: "COMPLETED",
          result: "Replaced faulty mouse with spare Logitech M185 from inventory.",
          attachmentNotes: "Logitech M185 wireless mouse serial #98124",
        },
      ],
    },
    {
      ticketNo: "TKT-2026-000008",
      summary: "LEB2 submission upload timeout",
      description: "Students report timeout when submitting 25MB zip archive",
      categoryName: "Software",
      systemName: "LEB2 App",
      requesterEmail: "emily.c@example.com",
      requestedPriority: "MEDIUM",
      itPriority: "MEDIUM",
      currentStatus: "IN_PROGRESS",
      ownerEmail: "staff1@example.com",
      comments: [
        { authorEmail: "staff1@example.com", body: "Investigating server ingress body limit." },
      ],
      notes: [
        { authorEmail: "staff1@example.com", body: "Check nginx client_max_body_size setting." },
      ],
      actions: [
        {
          clientRequestId: "seed-act-000008-1",
          actionDateTime: "2026-09-17T11:00:00.000Z",
          performedByEmail: "staff1@example.com",
          actionDescription: "Inspected ingress proxy logs and tested timeout threshold",
          status: "COMPLETED",
          result: "Identified nginx client_max_body_size threshold causing upload drop.",
        },
      ],
    },
    {
      ticketNo: "TKT-2026-000009",
      summary: "Faculty grading system unavailable",
      description: "502 Bad Gateway when submitting final grades",
      categoryName: "Software",
      systemName: "Grade Submission App",
      requesterEmail: "jennifer.a@example.com",
      requestedPriority: "HIGH",
      itPriority: "HIGH",
      currentStatus: "IN_PROGRESS",
      ownerEmail: "staff2@example.com",
      notes: [
        { authorEmail: "staff2@example.com", body: "DB connection pool exhausted on prod cluster." },
      ],
      actions: [
        {
          clientRequestId: "seed-act-000009-1",
          actionDateTime: "2026-09-17T13:00:00.000Z",
          performedByEmail: "staff2@example.com",
          actionDescription: "Restarted backend service instances to alleviate connection backlog",
          status: "COMPLETED",
          result: "Restarted backend instances to drain backlog; 502 cleared temporarily.",
        },
        {
          clientRequestId: "seed-act-000009-2",
          actionDateTime: "2026-09-17T13:30:00.000Z",
          performedByEmail: "staff2@example.com",
          assigneeEmail: "staff2@example.com",
          actionDescription: "Perform tuning on database max_connections pool settings",
          status: "PENDING",
          followUpRequired: true,
          followUpNote: "Tune pool size during 02:00 maintenance window.",
        },
      ],
    },

    // 10-12: WAITING_FOR_REQUESTER
    {
      ticketNo: "TKT-2026-000010",
      summary: "Office printer jam and error light",
      description: "Paper jammed in tray 2, orange status indicator is blinking",
      categoryName: "Hardware",
      systemName: "Printer",
      requesterEmail: "sarah.j@example.com",
      requestedPriority: "LOW",
      itPriority: "LOW",
      currentStatus: "WAITING_FOR_REQUESTER",
      ownerEmail: "staff3@example.com",
      comments: [
        {
          authorEmail: "staff3@example.com",
          body: "Can you confirm the room number where this printer is located?",
        },
      ],
    },
    {
      ticketNo: "TKT-2026-000011",
      summary: "Password reset for student portal",
      description: "User forgot password and security questions",
      categoryName: "Account and Access",
      systemName: "Email",
      requesterEmail: "david.l@example.com",
      requestedPriority: "MEDIUM",
      itPriority: "MEDIUM",
      currentStatus: "WAITING_FOR_REQUESTER",
      ownerEmail: "staff1@example.com",
    },
    {
      ticketNo: "TKT-2026-000012",
      summary: "Certificate authority expired warning",
      description: "Browser warns about untrusted internal root CA certificate",
      categoryName: "Network",
      systemName: "Campus Wi-Fi",
      requesterEmail: "emily.c@example.com",
      requestedPriority: "HIGH",
      itPriority: "HIGH",
      currentStatus: "WAITING_FOR_REQUESTER",
    },

    // 13-15: RESOLVED
    {
      ticketNo: "TKT-2026-000013",
      summary: "Install PDF editor license",
      description: "License activation key requested for newly assigned laptop",
      categoryName: "Software",
      systemName: "Corporate Laptop",
      requesterEmail: "jennifer.a@example.com",
      requestedPriority: "LOW",
      itPriority: "LOW",
      currentStatus: "RESOLVED",
      ownerEmail: "staff2@example.com",
      resolvedByEmail: "staff2@example.com",
      actions: [
        {
          clientRequestId: "seed-act-000013-1",
          actionDateTime: "2026-09-17T10:00:00.000Z",
          performedByEmail: "staff2@example.com",
          actionDescription: "Assigned license seat in portal and dispatched activation key to user",
          status: "COMPLETED",
          result: "License seat assigned from Adobe enterprise console and dispatched.",
        },
      ],
    },
    {
      ticketNo: "TKT-2026-000014",
      summary: "Replace toner in 3rd floor printer",
      description: "Black toner cartridge is depleted",
      categoryName: "Hardware",
      systemName: "Printer",
      requesterEmail: "sarah.j@example.com",
      requestedPriority: "MEDIUM",
      itPriority: "MEDIUM",
      currentStatus: "RESOLVED",
      ownerEmail: "staff3@example.com",
      resolvedByEmail: "staff3@example.com",
      comments: [
        { authorEmail: "staff3@example.com", body: "Replaced cartridge with OEM HP 58A toner." },
      ],
      notes: [
        { authorEmail: "staff3@example.com", body: "Spare toner stock now down to 1 box." },
      ],
      actions: [
        {
          clientRequestId: "seed-act-000014-1",
          actionDateTime: "2026-09-17T09:00:00.000Z",
          performedByEmail: "staff3@example.com",
          actionDescription: "Retrieved replacement toner cartridge from 2nd floor supply room",
          status: "COMPLETED",
          result: "Obtained 1 box OEM HP 58A toner.",
        },
        {
          clientRequestId: "seed-act-000014-2",
          actionDateTime: "2026-09-17T09:45:00.000Z",
          performedByEmail: "staff3@example.com",
          actionDescription: "Installed toner cartridge, ran test print page, and verified output quality",
          status: "COMPLETED",
          result: "Printed clean test alignment sheet successfully.",
        },
      ],
    },
    {
      ticketNo: "TKT-2026-000015",
      summary: "Department switch port inactive",
      description: "Wall ethernet jack port 4B does not link up",
      categoryName: "Network",
      systemName: "Campus Wi-Fi",
      requesterEmail: "david.l@example.com",
      requestedPriority: "HIGH",
      itPriority: "HIGH",
      currentStatus: "RESOLVED",
      ownerEmail: "staff1@example.com",
      resolvedByEmail: "staff1@example.com",
      actions: [
        {
          clientRequestId: "seed-act-000015-1",
          actionDateTime: "2026-09-17T14:00:00.000Z",
          performedByEmail: "staff1@example.com",
          actionDescription: "Patched wall port 4B to core switch 3 port 24 and verified link status",
          status: "COMPLETED",
          result: "Port link verified active at 1Gbps.",
        },
      ],
    },

    // 16-18: CLOSED
    {
      ticketNo: "TKT-2026-000016",
      summary: "Setup guest Wi-Fi voucher",
      description: "Visiting lecturer requires guest credentials for 3 days",
      categoryName: "Account and Access",
      systemName: "Campus Wi-Fi",
      requesterEmail: "emily.c@example.com",
      requestedPriority: "LOW",
      itPriority: "LOW",
      currentStatus: "CLOSED",
      ownerEmail: "staff2@example.com",
      resolvedByEmail: "staff2@example.com",
      actions: [
        {
          clientRequestId: "seed-act-000016-1",
          actionDateTime: "2026-09-17T08:30:00.000Z",
          performedByEmail: "staff2@example.com",
          actionDescription: "Attempted automated SMS voucher delivery",
          status: "CANCELLED",
          result: "SMS gateway provider timed out, fallback to manual voucher printout.",
        },
        {
          clientRequestId: "seed-act-000016-2",
          actionDateTime: "2026-09-17T08:45:00.000Z",
          performedByEmail: "staff2@example.com",
          actionDescription: "Generated guest Wi-Fi portal voucher code and handed printout to visitor",
          status: "COMPLETED",
          result: "Delivered printed 3-day access credentials to lecturer.",
        },
      ],
    },
    {
      ticketNo: "TKT-2026-000017",
      summary: "Laptop battery draining within 30 minutes",
      description: "Battery cycle count exceeds 1200, requires replacement",
      categoryName: "Hardware",
      systemName: "Corporate Laptop",
      requesterEmail: "jennifer.a@example.com",
      requestedPriority: "MEDIUM",
      itPriority: "MEDIUM",
      currentStatus: "CLOSED",
      resolvedByEmail: "staff1@example.com",
      actions: [
        {
          clientRequestId: "seed-act-000017-1",
          actionDateTime: "2026-09-17T15:00:00.000Z",
          performedByEmail: "staff1@example.com",
          actionDescription: "Replaced laptop battery pack and calibrated charging cycle",
          status: "COMPLETED",
          result: "Replaced battery pack; health reading reports 100% capacity.",
        },
      ],
    },
    {
      ticketNo: "TKT-2026-000018",
      summary: "VPN access restored after credential update",
      description: "Re-synced Active Directory security group membership",
      categoryName: "Network",
      systemName: "VPN",
      requesterEmail: "sarah.j@example.com",
      requestedPriority: "HIGH",
      itPriority: "HIGH",
      currentStatus: "CLOSED",
      ownerEmail: "staff3@example.com",
      resolvedByEmail: "staff3@example.com",
      comments: [
        { authorEmail: "sarah.j@example.com", body: "Confirmed working now, thank you!" },
      ],
      notes: [
        { authorEmail: "staff3@example.com", body: "AD sync delay was caused by replication lag." },
      ],
      actions: [
        {
          clientRequestId: "seed-act-000018-1",
          actionDateTime: "2026-09-17T16:00:00.000Z",
          performedByEmail: "staff3@example.com",
          actionDescription: "Re-synced Active Directory VPN security group and verified token login",
          status: "COMPLETED",
          result: "User successfully authenticated through VPN tunnel.",
        },
      ],
    },

    // 19-21: REOPENED
    {
      ticketNo: "TKT-2026-000019",
      summary: "Software re-install requested",
      description: "Application corrupted after OS patch",
      categoryName: "Software",
      systemName: "Corporate Laptop",
      requesterEmail: "david.l@example.com",
      requestedPriority: "LOW",
      itPriority: "LOW",
      currentStatus: "REOPENED",
      ownerEmail: "staff1@example.com",
      comments: [
        {
          authorEmail: "david.l@example.com",
          body: "Issue recurred this morning after system reboot.",
        },
      ],
    },
    {
      ticketNo: "TKT-2026-000020",
      summary: "Email rule filtering legitimate messages to spam",
      description: "Course registration confirmations misclassified as junk",
      categoryName: "Software",
      systemName: "Email",
      requesterEmail: "emily.c@example.com",
      requestedPriority: "MEDIUM",
      itPriority: "MEDIUM",
      currentStatus: "REOPENED",
    },
    {
      ticketNo: "TKT-2026-000021",
      summary: "Subnet routing issue to lab servers",
      description: "Cannot route packets from Room 402 to datacenter VLAN",
      categoryName: "Network",
      systemName: "Campus Wi-Fi",
      requesterEmail: "jennifer.a@example.com",
      requestedPriority: "HIGH",
      itPriority: "HIGH",
      currentStatus: "REOPENED",
      ownerEmail: "staff2@example.com",
    },

    // 22-24: CANCELLED
    {
      ticketNo: "TKT-2026-000022",
      summary: "Duplicate ticket submitted by mistake",
      description: "Accidentally submitted identical ticket twice",
      categoryName: "Account and Access",
      systemName: "LEB2 App",
      requesterEmail: "sarah.j@example.com",
      requestedPriority: "LOW",
      itPriority: "LOW",
      currentStatus: "CANCELLED",
    },
    {
      ticketNo: "TKT-2026-000023",
      summary: "Old monitor disposal request",
      description: "Decommissioned CRT monitor ready for e-waste recycling",
      categoryName: "Hardware",
      systemName: "Corporate Laptop",
      requesterEmail: "david.l@example.com",
      requestedPriority: "MEDIUM",
      itPriority: "MEDIUM",
      currentStatus: "CANCELLED",
      ownerEmail: "staff3@example.com",
      notes: [
        {
          authorEmail: "staff3@example.com",
          body: "E-waste vendor pickup scheduled for end of month.",
        },
      ],
    },
    {
      ticketNo: "TKT-2026-000024",
      summary: "Test emergency alert network drill",
      description: "Drill exercise completed, closing test broadcast ticket",
      categoryName: "Network",
      systemName: "Campus Wi-Fi",
      requesterEmail: "emily.c@example.com",
      requestedPriority: "HIGH",
      itPriority: "HIGH",
      currentStatus: "CANCELLED",
    },
  ];

  return fixtures.map((fix, idx) => ({
    seedKey: `seed-ticket-${String(idx + 1).padStart(6, "0")}`,
    ...fix,
  }));
}

export async function seed(prismaClient?: any) {
  const prisma = prismaClient || getPrisma();
  const defaultHash = await hashPassword(DEFAULT_INITIAL_PASSWORD);

  // 1. Four required Ticket Categories (preserved from Lab 2)
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

  // 2. Seven realistic Related Systems (preserved from Lab 2)
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

  // 3. User Accounts (Administrator, IT Staff, Requesters)
  const accounts = getDefaultSeedAccounts();
  for (const account of accounts) {
    const existing = await prisma.user.findUnique({
      where: { email: account.email },
    });

    if (existing) {
      // AC-17: If existing account has no passwordHash (e.g. from Lab 2), provision initial credentials
      // while preserving existing passwords and administrator modifications (name, department, role, isActive).
      if (!existing.passwordHash) {
        await prisma.user.update({
          where: { id: existing.id },
          data: {
            passwordHash: defaultHash,
            mustChangePassword: account.mustChangePassword,
          },
        });
      }
    } else {
      await prisma.user.create({
        data: {
          ...account,
          passwordHash: defaultHash,
        },
      });
    }
  }


  // 4. Seed at least 24 realistic fictional tickets per AC-18 and MIG-06
  // Spans all 8 statuses, all 3 priorities, assigned and unassigned ownership, with sample comments and notes.
  const catMap = new Map((await prisma.category.findMany()).map((c: any) => [c.name, c.id]));
  const sysMap = new Map((await prisma.relatedSystem.findMany()).map((s: any) => [s.name, s.id]));
  const userMap = new Map((await prisma.user.findMany()).map((u: any) => [u.email, u.id]));

  const ticketFixtures = getSeedTicketFixtures();
  for (const fix of ticketFixtures) {
    const categoryId = catMap.get(fix.categoryName);
    const relatedSystemId = sysMap.get(fix.systemName);
    const requesterId = userMap.get(fix.requesterEmail);
    if (!categoryId || !relatedSystemId || !requesterId) continue;

    const ticketOwnerId = fix.ownerEmail ? userMap.get(fix.ownerEmail) ?? null : null;
    const appearsResolvedById = fix.resolvedByEmail ? userMap.get(fix.resolvedByEmail) ?? null : null;
    const appearsResolvedAt = appearsResolvedById ? new Date("2026-09-17T10:00:00.000Z") : null;

    // Stable unique seed key check (AC-18, specification.md Section 7, MIG-03, MIG-06)
    // 1. Check if this specific seed fixture already exists via its unique seedKey column
    let ticket = await prisma.ticket.findUnique({
      where: { seedKey: fix.seedKey },
    });

    if (!ticket) {
      // 2. Resolve ticketNo: if fix.ticketNo is taken by a pre-existing real ticket (e.g. from Lab 2),
      // strictly isolate seed identity and allocate an unused ticket number so the real ticket remains untouched.
      let targetTicketNo = fix.ticketNo;
      const collision = await prisma.ticket.findUnique({
        where: { ticketNo: targetTicketNo },
      });

      if (collision) {
        let seq = 1;
        while (true) {
          const candidateNo = `TKT-2026-${String(seq).padStart(6, "0")}`;
          const taken = await prisma.ticket.findUnique({ where: { ticketNo: candidateNo } });
          if (!taken) {
            targetTicketNo = candidateNo;
            break;
          }
          seq++;
        }
      }

      ticket = await prisma.ticket.create({
        data: {
          seedKey: fix.seedKey,
          ticketNo: targetTicketNo,
          summary: fix.summary,
          description: fix.description,
          categoryId,
          relatedSystemId,
          requesterId,
          requestedPriority: fix.requestedPriority,
          itPriority: fix.itPriority,
          currentStatus: fix.currentStatus,
          ticketOwnerId,
          appearsResolvedAt,
          appearsResolvedById,
        },
      });
    }

    // 3. Comments and notes are attached strictly to the seed ticket (never to pre-existing real tickets)
    // and use stable unique checks (ticketId + authorId + body) to ensure idempotent runs never duplicate
    if (fix.comments) {
      for (const com of fix.comments) {
        const authorId = userMap.get(com.authorEmail);
        if (authorId) {
          const existingComment = await prisma.publicComment.findFirst({
            where: { ticketId: ticket.id, authorId, body: com.body },
          });
          if (!existingComment) {
            await prisma.publicComment.create({
              data: { ticketId: ticket.id, authorId, body: com.body },
            });
          }
        }
      }
    }

    if (fix.notes) {
      for (const note of fix.notes) {
        const authorId = userMap.get(note.authorEmail);
        if (authorId) {
          const existingNote = await prisma.internalNote.findFirst({
            where: { ticketId: ticket.id, authorId, body: note.body },
          });
          if (!existingNote) {
            await prisma.internalNote.create({
              data: { ticketId: ticket.id, authorId, body: note.body },
            });
          }
        }
      }
    }

    // 4. Actions Taken are attached strictly to the seed ticket with idempotent unique clientRequestId
    if (fix.actions) {
      for (const act of fix.actions) {
        const performedById = userMap.get(act.performedByEmail);
        const assigneeId = act.assigneeEmail ? userMap.get(act.assigneeEmail) ?? null : null;
        if (!performedById) continue;
        const createdById = performedById;

        const existingAction = await prisma.actionTaken.findUnique({
          where: {
            createdById_ticketId_clientRequestId: {
              createdById,
              ticketId: ticket.id,
              clientRequestId: act.clientRequestId,
            },
          },
        });

        if (!existingAction) {
          const actionDateTime = act.actionDateTime
            ? new Date(act.actionDateTime)
            : new Date("2026-09-17T09:00:00.000Z");
          const payloadObj = {
            actionDateTime: actionDateTime.toISOString(),
            actionDescription: act.actionDescription.trim(),
            status: act.status,
            result: act.result ? act.result.trim() : null,
            assigneeId,
            followUpRequired: Boolean(act.followUpRequired),
            followUpNote: act.followUpNote ? act.followUpNote.trim() : null,
            attachmentNotes: act.attachmentNotes ? act.attachmentNotes.trim() : null,
          };
          await prisma.actionTaken.create({
            data: {
              ticketId: ticket.id,
              actionDateTime,
              createdById,
              performedById: act.status === "COMPLETED" ? performedById : null,
              actionDescription: act.actionDescription.trim(),
              status: act.status,
              result: act.result ? act.result.trim() : null,
              assigneeId,
              followUpRequired: Boolean(act.followUpRequired),
              followUpNote: act.followUpNote ? act.followUpNote.trim() : null,
              attachmentNotes: act.attachmentNotes ? act.attachmentNotes.trim() : null,
              clientRequestId: act.clientRequestId,
              requestPayloadHash: createHash("sha256").update(JSON.stringify(payloadObj)).digest("hex"),
            },
          });
        }
      }
    }
  }

  const actionsCount = await prisma.actionTaken.count();

  return {
    categoriesCount: categories.length,
    systemsCount: relatedSystems.length,
    usersCount: accounts.length,
    ticketsCount: ticketFixtures.length,
    actionsCount,
  };
}

async function main() {
  const result = await seed();
  console.log(`Seeded ${result.categoriesCount} categories, ${result.systemsCount} systems, and ${result.usersCount} users.`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await getPrisma().$disconnect();
    });
}
