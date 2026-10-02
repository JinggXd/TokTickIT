import express from "express";
import { Prisma, TicketStatus, Priority, Role } from "@prisma/client";
import { getPrisma } from "../prisma.js";
import { requireAuth, requirePasswordChanged, requireRole } from "../middleware/sessionAuth.js";
import { OPEN_STATUSES, ACTIVE_STATUSES, recentCutoff } from "../utils/dashboardFilters.js";

export const dashboardRouter = express.Router();
dashboardRouter.use(requireAuth, requirePasswordChanged);

dashboardRouter.get("/requester", requireRole("REQUESTER"), async (req, res) => {
  try {
    const requesterId = req.user!.id, cutoff = recentCutoff();
    const data = await getPrisma().$transaction(async (tx) => {
      const scope = { requesterId };
      const [open, waiting, updated, resolved, recentTickets] = await Promise.all([
        tx.ticket.count({ where: { ...scope, currentStatus: { in: OPEN_STATUSES } } }),
        tx.ticket.count({ where: { ...scope, currentStatus: "WAITING_FOR_REQUESTER" } }),
        tx.ticket.count({ where: { ...scope, updatedAt: { gte: cutoff } } }),
        tx.ticket.count({ where: { ...scope, currentStatus: "RESOLVED", updatedAt: { gte: cutoff } } }),
        tx.ticket.findMany({
          where: scope, take: 5, orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
          select: { id: true, ticketNo: true, summary: true, currentStatus: true, requestedPriority: true, updatedAt: true }
        }),
      ]);
      return {
        metrics: {
          totalOpenTickets: open, ticketsWaitingForRequester: waiting,
          recentlyUpdatedTicketsCount: updated, recentlyResolvedTicketsCount: resolved
        }, recentTickets
      };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
    res.json(data);
  } catch { res.status(500).json({ error: "Unable to load requester dashboard." }); }
});

async function staffSummary(tx: Prisma.TransactionClient, userId: number) {
  const openWhere = { currentStatus: { in: OPEN_STATUSES } };
  const [unassigned, assigned, open, waiting, mine, statuses, priorities, recentOrUrgentTickets, recentActions] = await Promise.all([
    tx.ticket.count({ where: { ...openWhere, ticketOwnerId: null } }),
    tx.ticket.count({ where: { currentStatus: { in: ACTIVE_STATUSES }, ticketOwnerId: userId } }),
    tx.ticket.count({ where: openWhere }),
    tx.ticket.count({ where: { currentStatus: "WAITING_FOR_REQUESTER" } }),
    tx.actionTaken.count({ where: { performedById: userId, status: "COMPLETED" } }),
    tx.ticket.groupBy({ by: ["currentStatus"], _count: { _all: true } }),
    tx.ticket.groupBy({ by: ["itPriority"], where: openWhere, _count: { _all: true } }),
    tx.$queryRaw(Prisma.sql`SELECT t.id, t."ticketNo", t.summary, t."itPriority", t."currentStatus", t."updatedAt",
      CASE WHEN u.id IS NULL THEN NULL ELSE json_build_object('id',u.id,'name',u.name,'role',u.role) END AS "ticketOwner"
      FROM "Ticket" t LEFT JOIN "RequesterUser" u ON u.id = t."ticketOwnerId"
      WHERE t."currentStatus"::text IN (${Prisma.join(OPEN_STATUSES)})
      ORDER BY (t."itPriority" = 'HIGH') DESC, t."updatedAt" DESC, t.id DESC LIMIT 5`),
    tx.actionTaken.findMany({
      where: { performedById: userId }, take: 5,
      orderBy: [{ actionDateTime: "desc" }, { id: "desc" }],
      select: { id: true, ticketId: true, actionDescription: true, status: true, actionDateTime: true, ticket: { select: { ticketNo: true } } }
    }),
  ]);
  const ticketsByStatus = Object.fromEntries(Object.values(TicketStatus).map(s => [s, 0]));
  const ticketsByPriority = Object.fromEntries(Object.values(Priority).map(p => [p, 0]));
  for (const row of statuses) ticketsByStatus[row.currentStatus] = row._count._all;
  for (const row of priorities) ticketsByPriority[row.itPriority] = row._count._all;
  return {
    metrics: {
      unassignedTickets: unassigned, myAssignedTickets: assigned, openQueueTickets: open,
      ticketsWaitingForRequester: waiting, myActionsTakenCount: mine, ticketsByStatus, ticketsByPriority
    },
    recentOrUrgentTickets, myRecentActions: recentActions.map(({ ticket, ...action }) => ({ ...action, ticketNo: ticket.ticketNo }))
  };
}

dashboardRouter.get("/staff", requireRole("IT_STAFF", "ADMINISTRATOR"), async (req, res) => {
  try {
    res.json(await getPrisma().$transaction(tx => staffSummary(tx, req.user!.id), { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead }));
  } catch { res.status(500).json({ error: "Unable to load staff dashboard." }); }
});

dashboardRouter.get("/admin", requireRole("ADMINISTRATOR"), async (req, res) => {
  try {
    const data = await getPrisma().$transaction(async (tx) => {
      const [staff, totalUsers, activeUsers, roles] = await Promise.all([
        staffSummary(tx, req.user!.id), tx.user.count(), tx.user.count({ where: { isActive: true } }),
        tx.user.groupBy({ by: ["role"], _count: { _all: true } }),
      ]);
      const usersByRole = Object.fromEntries(Object.values(Role).map(r => [r, 0]));
      for (const row of roles) usersByRole[row.role] = row._count._all;
      return {
        staffMetrics: staff.metrics, userMetrics: { totalUsers, activeUsers, inactiveUsers: totalUsers - activeUsers, usersByRole },
        recentOrUrgentTickets: staff.recentOrUrgentTickets, myRecentActions: staff.myRecentActions
      };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
    res.json(data);
  } catch { res.status(500).json({ error: "Unable to load admin dashboard." }); }
});
