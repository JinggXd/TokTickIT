import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";

vi.mock("../../src/api.js", () => ({
  fetchStaffTicketDetail: vi.fn(),
  fetchAdminTicketDetail: vi.fn(),
  fetchTicketOwners: vi.fn(),
  fetchPublicComments: vi.fn(),
  fetchInternalNotes: vi.fn(),
  postPublicComment: vi.fn(),
  postInternalNote: vi.fn(),
  downloadAttachment: vi.fn(),
  claimTicket: vi.fn(),
  reassignTicket: vi.fn(),
  updateItPriority: vi.fn(),
  updateTicketStatus: vi.fn(),
  fetchActionsTaken: vi.fn(),
  createActionTaken: vi.fn(),
  completeActionTaken: vi.fn(),
}));

vi.mock("../../src/context/AuthContext.js", () => ({
  useAuth: () => ({ user: { id: 20, name: "Bob Staff", role: "IT_STAFF" } }),
}));

import { StaffTicketDetail } from "../../src/pages/StaffTicketDetail.js";
import * as api from "../../src/api.js";

const mockTicketInProgress = {
  id: 42,
  ticketNo: "TKT-2026-0042",
  summary: "Database connection timeouts",
  description: "Investigate connection pool exhaustion.",
  requester: { id: 10, name: "Alice Requester", email: "alice@test.local", department: "Engineering" },
  category: { id: 1, name: "Database" },
  relatedSystem: { id: 1, name: "Postgres Cluster" },
  requestedPriority: "HIGH" as const,
  itPriority: "HIGH" as const,
  currentStatus: "IN_PROGRESS" as const,
  ticketOwner: { id: 20, name: "Bob Staff", role: "IT_STAFF" as const },
  version: 3,
  appearsResolvedAt: null,
  appearsResolvedById: null,
  createdAt: "2026-09-25T10:00:00Z",
  updatedAt: "2026-09-25T12:00:00Z",
  attachments: [],
};

describe("Phase F2 / L4-P06: Ticket Workflow UI Tests (UI-L4-09, UI-L4-10)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.fetchTicketOwners).mockResolvedValue([
      { id: 20, name: "Bob Staff", role: "IT_STAFF" as const },
    ]);
    vi.mocked(api.fetchPublicComments).mockResolvedValue([]);
    vi.mocked(api.fetchInternalNotes).mockResolvedValue([]);
    vi.mocked(api.fetchActionsTaken).mockResolvedValue({ ticketId: 42, actions: [] });
    vi.mocked(api.fetchStaffTicketDetail).mockResolvedValue(mockTicketInProgress);
  });

  it("UI-L4-09: TicketWorkflow: Resolution gate error alert banner on modal when 0 actions (422)", async () => {
    vi.mocked(api.updateTicketStatus).mockRejectedValueOnce({
      status: 422,
      error: "RESOLUTION_GATE_FAILED",
      message: "Ticket resolution requires at least one completed Action Taken and no pending actions.",
    });

    render(<StaffTicketDetail ticketId={42} onBack={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByTestId("staff-ticket-detail-page")).toBeInTheDocument();
      expect(screen.getByTestId("staff-status-select")).toBeInTheDocument();
    });

    // Select RESOLVED
    const statusSelect = screen.getByTestId("staff-status-select") as HTMLSelectElement;
    fireEvent.change(statusSelect, { target: { value: "RESOLVED" } });

    // Click Change Status button to open confirmation modal
    const changeStatusBtn = screen.getByTestId("staff-change-status-btn");
    fireEvent.click(changeStatusBtn);

    // Confirm modal opens
    expect(screen.getByText("Confirm Status Change")).toBeInTheDocument();
    const confirmBtn = screen.getByTestId("confirm-status-transition-btn");
    fireEvent.click(confirmBtn);

    // Assert 422 resolution gate error alert banner renders inside the modal
    await waitFor(() => {
      const modalAlert = screen.getByTestId("status-modal-error");
      expect(modalAlert).toBeInTheDocument();
      expect(modalAlert).toHaveTextContent(
        "Ticket resolution requires at least one completed Action Taken and no pending actions."
      );
    });

    expect(api.updateTicketStatus).toHaveBeenCalledWith(42, "RESOLVED", 3);
  });

  it("UI-L4-10: TicketWorkflow: 409 conflict renders reload banner", async () => {
    vi.mocked(api.updateTicketStatus).mockRejectedValueOnce({
      status: 409,
      error: "CONFLICT",
      message: "The ticket was modified by another user. Please refresh and try again.",
    });

    render(<StaffTicketDetail ticketId={42} onBack={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByTestId("staff-ticket-detail-page")).toBeInTheDocument();
      expect(screen.getByTestId("staff-status-select")).toBeInTheDocument();
    });

    // Select RESOLVED
    const statusSelect = screen.getByTestId("staff-status-select") as HTMLSelectElement;
    fireEvent.change(statusSelect, { target: { value: "RESOLVED" } });

    const changeStatusBtn = screen.getByTestId("staff-change-status-btn");
    fireEvent.click(changeStatusBtn);

    const confirmBtn = screen.getByTestId("confirm-status-transition-btn");
    fireEvent.click(confirmBtn);

    // Assert 409 conflict alert banner renders on page alerting user to reload/refresh
    await waitFor(() => {
      const conflictBanner = screen.getByTestId("staff-conflict-alert");
      expect(conflictBanner).toBeInTheDocument();
      expect(conflictBanner).toHaveTextContent(
        "The ticket was modified by another user. Please refresh and try again."
      );
      expect(screen.getByRole("button", { name: /Refresh/i })).toBeInTheDocument();
    });

    // Clicking Refresh calls loadData / fetchStaffTicketDetail again
    const refreshBtn = screen.getByRole("button", { name: /Refresh/i });
    fireEvent.click(refreshBtn);

    await waitFor(() => {
      expect(api.fetchStaffTicketDetail).toHaveBeenCalledTimes(2);
    });
  });

  it("UI-L4-16: assignee lookup failure is visible, blocks assignment, and Retry restores choices", async () => {
    vi.mocked(api.fetchTicketOwners).mockRejectedValueOnce(new Error("Lookup unavailable"));
    render(<StaffTicketDetail ticketId={42} onBack={vi.fn()} />);
    const alert = await screen.findByTestId("staff-owners-error");
    expect(alert).toHaveTextContent("Lookup unavailable");
    expect(screen.getByTestId("staff-reassign-owner-select")).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: /\+ Log Action/i }));
    fireEvent.click(screen.getByLabelText(/^Pending Task$/i));
    expect(screen.getByLabelText(/Assignee \(Optional\)/i)).toBeDisabled();
    expect(screen.getByRole("button", { name: "Save Action" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    fireEvent.click(screen.getByRole("button", { name: "Retry assignee list" }));
    await waitFor(() => expect(screen.queryByTestId("staff-owners-error")).not.toBeInTheDocument());
    expect(screen.getByTestId("staff-reassign-owner-select")).not.toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: /\+ Log Action/i }));
    fireEvent.click(screen.getByLabelText(/^Pending Task$/i));
    expect(screen.getByLabelText(/Assignee \(Optional\)/i)).not.toBeDisabled();
    expect(screen.getByRole("option", { name: "Bob Staff" })).toBeInTheDocument();
  });

  it.each(["create", "complete"])("UI-L4-17: %s success remains visible after ticket reload", async (operation) => {
    const action: any = { id: 9, ticketId: 42, status: "PENDING", version: 1,
      actionDateTime: "2026-09-25T10:00:00Z", actionDescription: "Inspect database",
      result: null, assignee: null, performedBy: null, followUpRequired: false };
    vi.mocked(api.fetchActionsTaken).mockResolvedValue({ ticketId: 42, actions: [action] });
    vi.mocked(api.createActionTaken).mockResolvedValueOnce({ ticketId: 42, action });
    vi.mocked(api.completeActionTaken).mockResolvedValueOnce({ ticketId: 42, action });
    render(<StaffTicketDetail ticketId={42} onBack={vi.fn()} />);
    await screen.findByTestId("complete-action-btn-9");
    if (operation === "create") {
      fireEvent.click(screen.getByRole("button", { name: /\+ Log Action/i }));
      fireEvent.change(screen.getByLabelText(/Action Description/i), { target: { value: "Checked connections" } });
      fireEvent.change(screen.getByLabelText(/Result \/ Resolution Details/i), { target: { value: "Healthy" } });
      fireEvent.click(screen.getByRole("button", { name: "Save Action" }));
    } else {
      fireEvent.click(screen.getByTestId("complete-action-btn-9"));
      fireEvent.change(screen.getByLabelText(/Result/i), { target: { value: "Healthy" } });
      fireEvent.click(screen.getByRole("button", { name: "Mark Completed" }));
    }
    await screen.findByText("Action Taken saved successfully.");
    await waitFor(() => expect(api.fetchStaffTicketDetail).toHaveBeenCalledTimes(2));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
