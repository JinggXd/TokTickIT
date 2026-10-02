import React, { useEffect, useState } from "react";
import { fetchDashboard, DashboardData, DashboardTicket, RequesterDashboardMetrics, StaffDashboardMetrics } from "../api.js";
import type { Role } from "../types.js";
import { StatusBadge, PriorityBadge, ActionStatusBadge } from "../components/Badges.js";

type DashboardUser = { id: number; name: string; role: Role };
export function Dashboard({ user, onNavigate }: { user: DashboardUser; onNavigate: (path: string) => void }) {
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState<{ identity: string; data?: DashboardData; error?: string }>({ identity: "" });
  const identity = `${user.id}:${user.role}:${revision}`;
  useEffect(() => {
    let active = true;
    setState({ identity });
    fetchDashboard(user.role).then(data => { if (active) setState({ identity, data }); })
      .catch(error => { if (active) setState({ identity, error: error.status === 403 ? "You do not have permission to view this dashboard." : error.message || "Unable to load dashboard." }); });
    return () => { active = false; };
  }, [identity, user.role]);
  const refresh = () => setRevision(value => value + 1);
  const link = (path: string, text: React.ReactNode, props: React.AnchorHTMLAttributes<HTMLAnchorElement> & { "data-testid"?: string } = {}) => <a href={path} {...props} onClick={event => {
    if (event.button === 0 && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) { event.preventDefault(); onNavigate(path); }
  }}>{text}</a>;
  if (state.identity !== identity || (!state.data && !state.error)) return <div className="container" aria-busy="true" data-testid="dashboard-loading"><p role="status">Loading dashboard...</p><div className="row row-cols-1 row-cols-md-2 row-cols-lg-4 g-3">{[0, 1, 2, 3].map(i => <div className="col" key={i}><div className="card p-4 placeholder-glow"><span className="placeholder col-8" /><span className="placeholder col-5 mt-3" /></div></div>)}</div></div>;
  if (state.error) return <div className="container"><div className="alert alert-danger" role="alert">{state.error} <button className="btn btn-outline-danger ms-2" onClick={refresh}>Retry</button></div></div>;
  const data = state.data!;
  const isRequester = user.role === "REQUESTER", isAdmin = user.role === "ADMINISTRATOR";
  const metrics = (isAdmin ? data.staffMetrics! : data.metrics!) as StaffDashboardMetrics;
  const requesterMetrics = data.metrics as RequesterDashboardMetrics;
  const cards: Array<[string, number, string?]> = isRequester ? [
    ["Total Open Tickets", requesterMetrics.totalOpenTickets, "/my-tickets?statusGroup=open"],
    ["Waiting for My Response", requesterMetrics.ticketsWaitingForRequester, "/my-tickets?status=WAITING_FOR_REQUESTER"],
    ["Recently Updated (Last 7 Days)", requesterMetrics.recentlyUpdatedTicketsCount, "/my-tickets?recent=7d"],
    ["Recently Resolved (Last 7 Days)", requesterMetrics.recentlyResolvedTicketsCount, "/my-tickets?status=RESOLVED&recent=7d"],
  ] : [
    ["Unassigned Tickets", metrics.unassignedTickets, "/staff/queue?owner=unassigned&statusGroup=open"],
    ["My Assigned Tickets", metrics.myAssignedTickets, "/staff/queue?owner=me&statusGroup=active"],
    ["Total Open Queue", metrics.openQueueTickets, "/staff/queue?statusGroup=open"],
    ["Waiting for Requester", metrics.ticketsWaitingForRequester, "/staff/queue?status=WAITING_FOR_REQUESTER"],
    ["My Actions Taken", metrics.myActionsTakenCount],
  ];
  const detailPath = (id: number) => `${isRequester ? "/tickets" : isAdmin ? "/admin/tickets" : "/staff/tickets"}/${id}`;
  const ticketList = (tickets: DashboardTicket[]) => tickets.length === 0 ? <p className="text-muted mb-0">No recent tickets yet.</p> : <ul className="list-group list-group-flush">{tickets.map(ticket => <li className="list-group-item px-0" key={ticket.id}>
    {link(detailPath(ticket.id), <><strong>{ticket.ticketNo}</strong><span className="d-block text-break">{ticket.summary}</span></>, { className: "text-decoration-none" })}
    <div className="d-flex flex-wrap gap-2 my-2"><StatusBadge status={ticket.currentStatus} /><PriorityBadge priority={ticket.itPriority ?? ticket.requestedPriority!} /></div>
    {!isRequester && <div className="small text-muted">Owner: {ticket.ticketOwner?.name ?? "Unassigned"}</div>}
    <time dateTime={ticket.updatedAt} className="small text-muted">Updated {new Date(ticket.updatedAt).toLocaleString()}</time>
  </li>)}</ul>;
  return <div className="container dashboard" data-testid="dashboard-page">
    <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4"><div>
      <h1 className="h3 fw-bold">{isRequester ? `Welcome, ${user.name}!` : `Welcome back, ${user.name}!`}</h1>
      <p className="text-muted mb-0">{isRequester ? "Here's the latest on your requests" : "Here's what's happening in your queue today"}</p>
    </div>{isRequester ? link("/create-ticket", "+ Create Ticket", { className: "btn btn-primary-zen" }) : <button className="btn btn-secondary-zen" onClick={refresh}>Refresh</button>}</div>
    <div className={`row row-cols-1 row-cols-md-2 ${isRequester ? "row-cols-lg-4" : "row-cols-lg-5"} g-3 mb-4`}>
      {cards.map(([label, value, path], index) => <div className="col" key={label}>{path ? link(path, <><span className="small">{label}</span><strong className="d-block display-6 mt-2">{value}</strong></>, { className: "card h-100 p-3 text-decoration-none shadow-sm", "data-testid": `dashboard-metric-${index}` }) : <div className="card h-100 p-3 shadow-sm" data-testid={`dashboard-metric-${index}`}><span className="small">{label}</span><strong className="d-block display-6 mt-2">{value}</strong></div>}</div>)}
    </div>
    {!isRequester && <section className="card p-3 mb-4" aria-label="Queue summary"><h2 className="h5">Queue Summary</h2>
      <div className="d-flex flex-wrap gap-2 mb-3" data-testid="status-breakdown">{Object.entries(metrics.ticketsByStatus).map(([status, count]) => <span key={status}><StatusBadge status={status} /> <strong>{count}</strong></span>)}</div>
      <h3 className="h6">Open-ticket priorities</h3>
      <div className="d-flex flex-wrap gap-2" data-testid="priority-breakdown">{Object.entries(metrics.ticketsByPriority).map(([priority, count]) => <span key={priority}><PriorityBadge priority={priority} /> <strong>{count}</strong></span>)}</div>
    </section>}
    {isAdmin && data.userMetrics && <section className="card p-3 mb-4"><h2 className="h5">User Directory Summary</h2><div className="d-flex flex-wrap gap-3 mb-3">
      <span>Total Users: {data.userMetrics.totalUsers}</span><span>Active Users: {data.userMetrics.activeUsers}</span><span>Inactive Users: {data.userMetrics.inactiveUsers}</span>
    </div><div className="d-flex flex-wrap gap-3 mb-3">{Object.entries(data.userMetrics.usersByRole).map(([role, count]) => <span className="badge text-bg-light" key={role}>{role === "REQUESTER" ? "Requester" : role === "IT_STAFF" ? "IT Staff" : "Admin"}: {count}</span>)}</div>{link("/admin/users", "Manage Users", { className: "btn btn-primary-zen align-self-start" })}</section>}
    <div className="row g-4"><section className={isRequester ? "col-12" : "col-12 col-lg-6"}><div className="card p-3 h-100"><h2 className="h5">{isRequester ? "Recent Tickets" : "Recent & Urgent Tickets"}</h2>
      {ticketList(isRequester ? data.recentTickets! : data.recentOrUrgentTickets!)}
      {!isRequester && link("/staff/queue", "View all in Queue", { className: "mt-3" })}
    </div></section>{!isRequester && <section className="col-12 col-lg-6"><div className="card p-3 h-100"><h2 className="h5">My Recent Actions Taken</h2>
      {data.myRecentActions!.length === 0 ? <p className="text-muted">No actions taken yet.</p> : <ul className="list-group list-group-flush">{data.myRecentActions!.map(action => <li className="list-group-item px-0" key={action.id}>
        {link(detailPath(action.ticketId), action.ticketNo, { className: "fw-semibold" })} <ActionStatusBadge status={action.status} /><p className="text-break my-2">{action.actionDescription}</p><time className="small text-muted" dateTime={action.actionDateTime}>{new Date(action.actionDateTime).toLocaleString()}</time>
      </li>)}</ul>}
    </div></section>}</div>
  </div>;
}
