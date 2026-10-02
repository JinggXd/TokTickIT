import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import App from "../../src/App.js";
let user: any;
vi.mock("../../src/context/AuthContext.js", () => ({ AuthProvider: ({ children }: any) => children, useAuth: () => ({ user, isLoading: false, logout: vi.fn() }) }));
vi.mock("../../src/context/RequesterContext.js", () => ({ RequesterProvider: ({ children }: any) => children, useRequester: () => ({ currentRequester: null }) }));
vi.mock("../../src/pages/Dashboard.js", () => ({ Dashboard: ({ onNavigate }: any) => <button onClick={() => onNavigate(user.role === "REQUESTER" ? "/my-tickets?status=RESOLVED&recent=7d" : "/staff/queue?owner=me&statusGroup=active")}>Dashboard drill-down</button> }));
vi.mock("../../src/pages/MyTickets.js", () => ({ MyTickets: ({ queryString, onClearQuery }: any) => <><p>Requester filters: {queryString}</p><button onClick={onClearQuery}>Clear Filters</button></> }));
vi.mock("../../src/pages/StaffTicketQueue.js", () => ({ StaffTicketQueue: ({ queryString, onSelectTicket }: any) => <><p>Queue filters: {queryString}</p><button onClick={() => onSelectTicket(8)}>Open ticket</button></> }));
vi.mock("../../src/pages/StaffTicketDetail.js", () => ({ StaffTicketDetail: ({ readOnly }: any) => <p>Read-only: {String(readOnly)}</p> }));
beforeEach(() => { user = { id: 5, name: "Jane", role: "REQUESTER", mustChangePassword: false }; });
describe("F3 dashboard route integration", () => {
  it("drill-down preserves query, clears it, and browser Back restores filters", async () => {
    window.history.replaceState({}, "", "/dashboard"); render(<App />); fireEvent.click(screen.getByText("Dashboard drill-down"));
    expect(window.location.search).toBe("?status=RESOLVED&recent=7d"); expect(screen.getByText(/Requester filters:/)).toHaveTextContent("?status=RESOLVED&recent=7d");
    fireEvent.click(screen.getByText("Clear Filters")); expect(window.location.search).toBe("");
    window.history.back(); await waitFor(() => expect(screen.getByText(/Requester filters:/)).toHaveTextContent("?status=RESOLVED&recent=7d"));
  });
  it.each(["IT_STAFF", "ADMINISTRATOR"])("%s has dashboard navigation and preserves queue drill-down", role => {
    user.role = role; window.history.replaceState({}, "", role === "IT_STAFF" ? "/staff/dashboard" : "/admin/dashboard"); render(<App />);
    expect(screen.getByTestId("nav-dashboard")).toBeInTheDocument(); fireEvent.click(screen.getByText("Dashboard drill-down"));
    expect(screen.getByText(/Queue filters:/)).toHaveTextContent("?owner=me&statusGroup=active");
    fireEvent.click(screen.getByText("Open ticket")); expect(window.location.pathname).toBe(role === "IT_STAFF" ? "/staff/tickets/8" : "/admin/tickets/8");
    if (role === "ADMINISTRATOR") expect(screen.getByText("Read-only: true")).toBeInTheDocument();
  });
});
