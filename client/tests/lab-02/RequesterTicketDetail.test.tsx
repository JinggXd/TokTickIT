import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import RequesterTicketDetail from "../../src/pages/RequesterTicketDetail.js";
import * as api from "../../src/api.js";

const mockTicketDetail: api.TicketDetail = {
  id: 101,
  ticketNo: "TKT-2026-000101",
  summary: "Laptop battery drains quickly",
  description: "My laptop battery drains in less than an hour after the update.",
  categoryName: "Hardware",
  relatedSystemName: "Corporate Laptop",
  requestedPriority: "MEDIUM",
  itPriority: "HIGH",
  currentStatus: "IN_PROGRESS",
  ticketOwnerName: "Unassigned",
  requesterId: 1,
  createdAt: "2026-08-29T10:00:00.000Z",
  updatedAt: "2026-08-29T10:00:00.000Z",
  attachments: [],
};

describe("RequesterTicketDetail (UI-07, UI-15, STYLE-03)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // -------------------------------------------------------------------------
  // UI-07: Field rendering — all fields read-only, IT priority read-only, null owner displays Unassigned
  // -------------------------------------------------------------------------
  it("UI-07: renders all ticket fields as read-only, displays IT Priority, and shows Unassigned for null owner", async () => {
    vi.spyOn(api, "fetchTicketDetail").mockResolvedValueOnce(mockTicketDetail);

    render(
      <RequesterTicketDetail
        ticketId={101}
        requesterId={1}
        requesterName="Somchai Prasert"
        onBack={vi.fn()}
      />
    );

    // Initial loading state
    expect(screen.getByText(/loading ticket detail/i)).toBeInTheDocument();

    // Wait for content to render
    await waitFor(() => {
      expect(screen.getByText("TKT-2026-000101")).toBeInTheDocument();
    });

    // Verify fields
    expect(screen.getByDisplayValue("Laptop battery drains quickly")).toBeInTheDocument();
    expect(screen.getByDisplayValue("My laptop battery drains in less than an hour after the update.")).toBeInTheDocument();
    expect(screen.getByText("Hardware")).toBeInTheDocument();
    expect(screen.getByText("Corporate Laptop")).toBeInTheDocument();
    expect(screen.getByText("Somchai Prasert")).toBeInTheDocument();
    expect(screen.getByText("Unassigned")).toBeInTheDocument();

    // Verify badges
    expect(screen.getByText("MEDIUM")).toBeInTheDocument();
    expect(screen.getByText("HIGH")).toBeInTheDocument();
    expect(screen.getByText(/IN_PROGRESS/)).toBeInTheDocument();

    // Verify read-only nature: summary & description must have readOnly attribute
    const summaryInput = screen.getByDisplayValue("Laptop battery drains quickly");
    expect(summaryInput).toHaveAttribute("readonly");

    const descriptionInput = screen.getByDisplayValue("My laptop battery drains in less than an hour after the update.");
    expect(descriptionInput).toHaveAttribute("readonly");
  });

  // -------------------------------------------------------------------------
  // UI-15: Loading, 403 Forbidden, 404 Not Found, unexpected failure, back navigation
  // -------------------------------------------------------------------------
  it("UI-15: renders 403 Access Denied state safely with Back link", async () => {
    const forbiddenErr: any = new Error("Access denied: You do not own this ticket");
    forbiddenErr.status = 403;
    vi.spyOn(api, "fetchTicketDetail").mockRejectedValueOnce(forbiddenErr);

    const onBack = vi.fn();
    render(
      <RequesterTicketDetail
        ticketId={999}
        requesterId={2}
        requesterName="Other User"
        onBack={onBack}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/access denied/i)).toBeInTheDocument();
    });

    // Should not render ticket fields
    expect(screen.queryByDisplayValue("Laptop battery drains quickly")).not.toBeInTheDocument();

    // Back button should work
    const backBtn = screen.getByRole("button", { name: /back to my tickets/i });
    await userEvent.click(backBtn);
    expect(onBack).toHaveBeenCalled();
  });

  it("UI-15: renders 404 Not Found state safely", async () => {
    const notFoundErr: any = new Error("Ticket not found");
    notFoundErr.status = 404;
    vi.spyOn(api, "fetchTicketDetail").mockRejectedValueOnce(notFoundErr);

    render(
      <RequesterTicketDetail
        ticketId={999999}
        requesterId={1}
        requesterName="Somchai Prasert"
        onBack={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/ticket not found/i)).toBeInTheDocument();
    });
  });

  it("UI-15: renders unexpected failure state with retry button", async () => {
    vi.spyOn(api, "fetchTicketDetail")
      .mockRejectedValueOnce(new Error("Network connection dropped"))
      .mockResolvedValueOnce(mockTicketDetail);

    render(
      <RequesterTicketDetail
        ticketId={101}
        requesterId={1}
        requesterName="Somchai Prasert"
        onBack={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/network connection dropped/i)).toBeInTheDocument();
    });

    const retryBtn = screen.getByRole("button", { name: /retry/i });
    await userEvent.click(retryBtn);

    await waitFor(() => {
      expect(screen.getByText("TKT-2026-000101")).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // STYLE-03: Read-only field contrast
  // -------------------------------------------------------------------------
  it("STYLE-03: read-only fields use --zg-readonly-bg style", async () => {
    vi.spyOn(api, "fetchTicketDetail").mockResolvedValueOnce(mockTicketDetail);

    render(
      <RequesterTicketDetail
        ticketId={101}
        requesterId={1}
        requesterName="Somchai Prasert"
        onBack={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue("Laptop battery drains quickly")).toBeInTheDocument();
    });

    const summaryInput = screen.getByDisplayValue("Laptop battery drains quickly");
    expect(summaryInput).toHaveClass("form-control-zen");
    expect(summaryInput).toHaveAttribute("readonly");
  });
});
