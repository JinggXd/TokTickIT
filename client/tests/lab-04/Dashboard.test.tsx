import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Dashboard } from "../../src/pages/Dashboard.js";
import { fetchDashboard } from "../../src/api.js";
vi.mock("../../src/api.js", () => ({ fetchDashboard: vi.fn() }));
const requester = { id: 5, name: "Jane", role: "REQUESTER" as const };
const data = { metrics: { totalOpenTickets: 4, ticketsWaitingForRequester: 1, recentlyUpdatedTicketsCount: 7, recentlyResolvedTicketsCount: 2 }, recentTickets: [{ id: 8, ticketNo: "T-8", summary: "Printer", currentStatus: "NEW", requestedPriority: "HIGH", updatedAt: "2026-10-02T05:00:00Z" }] };
const staffMetrics = { unassignedTickets: 2, myAssignedTickets: 3, openQueueTickets: 6, ticketsWaitingForRequester: 1, myActionsTakenCount: 9, ticketsByStatus: { NEW: 1, OPEN: 2, IN_PROGRESS: 1, WAITING_FOR_REQUESTER: 1, REOPENED: 1, RESOLVED: 2, CLOSED: 3, CANCELLED: 4 }, ticketsByPriority: { HIGH: 2, MEDIUM: 4, LOW: 9 } };
beforeEach(() => vi.resetAllMocks());
describe("F3 Dashboard UI-L4-01/02/03/08", () => {
  it("requester cards navigate with exact filters and recent ticket goes to owned detail", async () => {
    vi.mocked(fetchDashboard).mockResolvedValue(data as any);
    const navigate = vi.fn(); render(<Dashboard user={requester} onNavigate={navigate} />);
    expect(screen.getByTestId("dashboard-loading")).toBeInTheDocument();
    await screen.findByText("Welcome, Jane!");
    const paths = ["/my-tickets?statusGroup=open", "/my-tickets?status=WAITING_FOR_REQUESTER", "/my-tickets?recent=7d", "/my-tickets?status=RESOLVED&recent=7d"];
    for (let i = 0; i < paths.length; i++) { fireEvent.click(screen.getByTestId(`dashboard-metric-${i}`)); expect(navigate).toHaveBeenLastCalledWith(paths[i]); }
    fireEvent.click(screen.getByText("T-8")); expect(navigate).toHaveBeenLastCalledWith("/tickets/8");
    fireEvent.click(screen.getByText("+ Create Ticket")); expect(navigate).toHaveBeenLastCalledWith("/create-ticket");
  });
  it("staff shows all breakdowns, completed count and performer feed, with four exact queue links", async () => {
    vi.mocked(fetchDashboard).mockResolvedValue({ metrics: staffMetrics, recentOrUrgentTickets: [], myRecentActions: [{ id: 1, ticketId: 8, ticketNo: "T-8", actionDescription: "Fixed printer", status: "COMPLETED", actionDateTime: "2026-10-02T05:00:00Z" }] } as any);
    const navigate = vi.fn(); render(<Dashboard user={{ ...requester, role: "IT_STAFF" }} onNavigate={navigate} />);
    await screen.findByText("Welcome back, Jane!");
    expect(screen.getByText("Fixed printer")).toBeInTheDocument(); expect(screen.getByTestId("dashboard-metric-4")).toHaveTextContent("9");
    expect(screen.getByTestId("status-breakdown").children).toHaveLength(8); expect(screen.getByTestId("priority-breakdown").children).toHaveLength(3);
    const paths = ["/staff/queue?owner=unassigned&statusGroup=open", "/staff/queue?owner=me&statusGroup=active", "/staff/queue?statusGroup=open", "/staff/queue?status=WAITING_FOR_REQUESTER"];
    for (let i = 0; i < paths.length; i++) { fireEvent.click(screen.getByTestId(`dashboard-metric-${i}`)); expect(navigate).toHaveBeenLastCalledWith(paths[i]); }
    fireEvent.click(screen.getByText("T-8")); expect(navigate).toHaveBeenLastCalledWith("/staff/tickets/8");
    fireEvent.click(screen.getByText("Refresh")); await waitFor(() => expect(fetchDashboard).toHaveBeenCalledTimes(2));
  });
  it("admin uses staffMetrics and user counts, and opens admin detail", async () => {
    vi.mocked(fetchDashboard).mockResolvedValue({ staffMetrics, userMetrics: { totalUsers: 10, activeUsers: 8, inactiveUsers: 2, usersByRole: { REQUESTER: 6, IT_STAFF: 3, ADMINISTRATOR: 1 } }, recentOrUrgentTickets: [{ ...data.recentTickets[0], itPriority: "HIGH", ticketOwner: null }], myRecentActions: [] } as any);
    const navigate = vi.fn(); render(<Dashboard user={{ ...requester, role: "ADMINISTRATOR" }} onNavigate={navigate} />);
    await screen.findByText("User Directory Summary"); expect(screen.getByText("Total Users: 10")).toBeInTheDocument();
    fireEvent.click(screen.getByText("T-8")); expect(navigate).toHaveBeenLastCalledWith("/admin/tickets/8");
    fireEvent.click(screen.getByText("Manage Users")); expect(navigate).toHaveBeenLastCalledWith("/admin/users");
  });
  it("failed refresh clears old metrics and Retry recovers with explicit empty state", async () => {
    vi.mocked(fetchDashboard).mockRejectedValueOnce(new Error("Network unavailable")).mockResolvedValueOnce({ ...data, recentTickets: [] } as any);
    render(<Dashboard user={requester} onNavigate={vi.fn()} />); await screen.findByRole("alert");
    expect(screen.queryByTestId("dashboard-metric-0")).not.toBeInTheDocument(); fireEvent.click(screen.getByText("Retry"));
    await screen.findByText("No recent tickets yet.");
  });
  it("identity change discards a pending previous user's response", async () => {
    let resolve!: (value: any) => void; vi.mocked(fetchDashboard).mockReturnValueOnce(new Promise(r => { resolve = r; })).mockResolvedValueOnce({ ...data, metrics: { ...data.metrics, totalOpenTickets: 0 }, recentTickets: [] } as any);
    const view = render(<Dashboard user={requester} onNavigate={vi.fn()} />);
    view.rerender(<Dashboard user={{ ...requester, id: 99, name: "Other" }} onNavigate={vi.fn()} />);
    await screen.findByText("Welcome, Other!"); resolve(data);
    await waitFor(() => expect(screen.getByTestId("dashboard-metric-0")).toHaveTextContent("0")); expect(screen.queryByText("Printer")).not.toBeInTheDocument();
  });
});
