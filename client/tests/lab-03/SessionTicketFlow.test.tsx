import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MyTickets } from "../../src/pages/MyTickets.js";
import { CreateTicket } from "../../src/pages/CreateTicket.js";
import { AuthProvider } from "../../src/context/AuthContext.js";
import { RequesterProvider } from "../../src/context/RequesterContext.js";
import * as api from "../../src/api.js";
import type { SafeUser } from "../../src/types.js";

const mockSessionRequester: SafeUser = {
  id: 42,
  name: "Session Requester Somchai",
  email: "somchai@example.com",
  department: "Logistics",
  role: "REQUESTER",
  mustChangePassword: false,
};

describe("Phase F2 / P06 Session Identity in Requester Ticket Flow", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    // Default API stubs
    vi.spyOn(api, "fetchCategories").mockResolvedValue([
      { id: 1, name: "Hardware", isActive: true },
    ]);
    vi.spyOn(api, "fetchRelatedSystems").mockResolvedValue([
      { id: 1, name: "Corporate Laptop", isActive: true },
    ]);
    vi.spyOn(api, "fetchActiveRequesters").mockResolvedValue([]);
    vi.spyOn(api, "fetchCsrf").mockResolvedValue({ csrfToken: "test-csrf-token" });
  });

  it("loads tickets using authenticated session identity when legacy currentRequester is null", async () => {
    vi.spyOn(api, "fetchMe").mockResolvedValue({ user: mockSessionRequester });
    const fetchTicketsSpy = vi.spyOn(api, "fetchMyTickets").mockResolvedValue({
      data: [
        {
          id: 101,
          ticketNo: "TKT-2026-000101",
          summary: "Monitor display issue",
          categoryName: "Hardware",
          relatedSystemName: "Corporate Laptop",
          requestedPriority: "MEDIUM",
          itPriority: "MEDIUM",
          currentStatus: "NEW",
          ticketOwnerName: "Unassigned",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      pagination: {
        currentPage: 1,
        pageSize: 8,
        totalItems: 1,
        totalPages: 1,
      },
    });

    render(
      <AuthProvider>
        <RequesterProvider>
          <MyTickets />
        </RequesterProvider>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(fetchTicketsSpy).toHaveBeenCalled();
    });

    // Proves that requesterId passed to fetchMyTickets is the authenticated session user's ID
    expect(fetchTicketsSpy).toHaveBeenCalledWith(
      expect.anything(),
      mockSessionRequester.id
    );

    // Verify ticket appears on the screen
    const ticketNodes = await screen.findAllByText("TKT-2026-000101");
    expect(ticketNodes.length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Monitor display issue")[0]).toBeInTheDocument();
  });

  it("submits ticket using authenticated session identity when legacy currentRequester is null", async () => {
    vi.spyOn(api, "fetchMe").mockResolvedValue({ user: mockSessionRequester });
    const createTicketSpy = vi.spyOn(api, "createTicket").mockResolvedValue({
      id: 202,
      ticketNo: "TKT-2026-000202",
      summary: "Broken keyboard key",
      description: "Spacebar is completely stuck and cannot type",
      requestedPriority: "MEDIUM",
      itPriority: "MEDIUM",
      currentStatus: "NEW",
      requesterId: mockSessionRequester.id,
      createdAt: new Date().toISOString(),
    });

    render(
      <AuthProvider>
        <RequesterProvider>
          <CreateTicket />
        </RequesterProvider>
      </AuthProvider>
    );

    // Verify readonly requester field reflects session user name and department
    await waitFor(() => {
      const requesterInput = screen.getByDisplayValue("Session Requester Somchai (Logistics)");
      expect(requesterInput).toBeInTheDocument();
    });

    // Fill the form
    await userEvent.type(screen.getByLabelText(/summary/i), "Broken keyboard key");
    await userEvent.type(
      screen.getByLabelText(/description/i),
      "Spacebar is completely stuck and cannot type"
    );
    await userEvent.selectOptions(screen.getByLabelText(/category/i), "1");
    await userEvent.selectOptions(screen.getByLabelText(/related system/i), "1");

    // Submit form
    await userEvent.click(screen.getByRole("button", { name: /create ticket|submit/i }));

    await waitFor(() => {
      expect(createTicketSpy).toHaveBeenCalled();
    });

    // Proves ticket creation was attributed to session user's ID
    expect(createTicketSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        summary: "Broken keyboard key",
        description: "Spacebar is completely stuck and cannot type",
        categoryId: 1,
        relatedSystemId: 1,
      }),
      mockSessionRequester.id
    );

    // Success screen proves prominent ticket number and user identity
    expect(await screen.findByTestId("success-ticket-no")).toHaveTextContent("TKT-2026-000202");
    expect(screen.getByTestId("success-requester")).toHaveTextContent("Session Requester Somchai (Logistics)");
  });
});
