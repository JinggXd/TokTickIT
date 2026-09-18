import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("../../src/api.js", () => ({
  fetchAdminUsers: vi.fn(),
  createAdminUser: vi.fn(),
  updateAdminUser: vi.fn(),
  resetAdminUserPassword: vi.fn(),
}));

const mockCurrentUser = {
  id: 1,
  name: "Super Admin",
  email: "admin@example.com",
  role: "ADMINISTRATOR" as const,
  mustChangePassword: false,
};

vi.mock("../../src/context/AuthContext.js", () => ({
  useAuth: () => ({
    user: mockCurrentUser,
    isAuthenticated: true,
    isLoading: false,
  }),
}));

import { UserManagement } from "../../src/pages/UserManagement.js";
import * as api from "../../src/api.js";

const mockUsers = [
  {
    id: 1,
    name: "Super Admin",
    email: "admin@example.com",
    role: "ADMINISTRATOR" as const,
    isActive: true,
    mustChangePassword: false,
    createdAt: "2026-01-01T00:00:00Z",
  },
  {
    id: 2,
    name: "Bob Staff",
    email: "bob.staff@example.com",
    role: "IT_STAFF" as const,
    isActive: true,
    mustChangePassword: false,
    createdAt: "2026-01-02T00:00:00Z",
  },
  {
    id: 3,
    name: "Alice Requester",
    email: "alice@example.com",
    role: "REQUESTER" as const,
    isActive: false,
    mustChangePassword: false,
    createdAt: "2026-01-03T00:00:00Z",
  },
];

describe("UserManagement UI Tests (UI-09, UI-10, UI-11, UI-15)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.fetchAdminUsers).mockResolvedValue(mockUsers);
  });

  describe("UI-09: User Directory & Search", () => {
    it("renders loading state initially", () => {
      vi.mocked(api.fetchAdminUsers).mockReturnValue(new Promise(() => {}));
      render(<UserManagement />);
      expect(screen.getByTestId("user-admin-loading")).toBeInTheDocument();
    });

    it("renders user table with all users", async () => {
      render(<UserManagement />);
      await waitFor(() => {
        expect(screen.getByTestId("user-table")).toBeInTheDocument();
      });

      expect(screen.getByText("Super Admin")).toBeInTheDocument();
      expect(screen.getByText("Bob Staff")).toBeInTheDocument();
      expect(screen.getByText("Alice Requester")).toBeInTheDocument();
      expect(screen.getAllByText("Active").length).toBeGreaterThan(0);
      expect(screen.getByText("Inactive")).toBeInTheDocument();
    });

    it("displays 'No users match your search' when search yields no results", async () => {
      vi.mocked(api.fetchAdminUsers).mockResolvedValue([]);
      render(<UserManagement />);

      const searchInput = screen.getByTestId("user-search-input");
      await userEvent.type(searchInput, "NonexistentUser");

      await waitFor(() => {
        expect(screen.getByTestId("user-admin-no-results")).toBeInTheDocument();
      });
    });
  });

  describe("UI-11: Add User Modal", () => {
    it("opens Add User modal when '+ Add User' button is clicked", async () => {
      render(<UserManagement />);
      await waitFor(() => screen.getByTestId("add-user-btn"));

      await userEvent.click(screen.getByTestId("add-user-btn"));
      expect(screen.getByTestId("add-user-modal")).toBeInTheDocument();
    });

    it("validates required fields and short password", async () => {
      render(<UserManagement />);
      await waitFor(() => screen.getByTestId("add-user-btn"));
      await userEvent.click(screen.getByTestId("add-user-btn"));

      const nameInput = screen.getByTestId("add-user-name");
      const emailInput = screen.getByTestId("add-user-email");
      const passInput = screen.getByTestId("add-user-password");
      const submitBtn = screen.getByTestId("submit-add-user-btn");

      await userEvent.type(nameInput, "New Person");
      await userEvent.type(emailInput, "new@example.com");
      await userEvent.type(passInput, "short"); // < 12 chars
      await userEvent.click(submitBtn);

      expect(screen.getByText("Password must be at least 12 characters")).toBeInTheDocument();
      expect(api.createAdminUser).not.toHaveBeenCalled();
    });

    it("calls createAdminUser and refreshes list on valid submission", async () => {
      vi.mocked(api.createAdminUser).mockResolvedValue({
        id: 4,
        name: "Charlie Staff",
        email: "charlie@example.com",
        role: "IT_STAFF",
        isActive: true,
        mustChangePassword: true,
        createdAt: "2026-01-04T00:00:00Z",
      });

      render(<UserManagement />);
      await waitFor(() => screen.getByTestId("add-user-btn"));
      await userEvent.click(screen.getByTestId("add-user-btn"));

      await userEvent.type(screen.getByTestId("add-user-name"), "Charlie Staff");
      await userEvent.type(screen.getByTestId("add-user-email"), "charlie@example.com");
      await userEvent.selectOptions(screen.getByTestId("add-user-role"), "IT_STAFF");
      await userEvent.type(screen.getByTestId("add-user-password"), "ValidPassword1234!");
      await userEvent.click(screen.getByTestId("submit-add-user-btn"));

      await waitFor(() => {
        expect(api.createAdminUser).toHaveBeenCalledWith({
          name: "Charlie Staff",
          email: "charlie@example.com",
          role: "IT_STAFF",
          isActive: true,
          initialPassword: "ValidPassword1234!",
        });
      });
    });
  });

  describe("UI-15 & Invariants: Edit User & Self-Deactivation", () => {
    it("disables Active toggle for logged-in admin with self-deactivation warning", async () => {
      render(<UserManagement />);
      await waitFor(() => screen.getByTestId("edit-user-btn-1")); // user 1 is mockCurrentUser

      await userEvent.click(screen.getByTestId("edit-user-btn-1"));
      expect(screen.getByTestId("edit-user-modal")).toBeInTheDocument();

      const activeToggle = screen.getByTestId("edit-user-active");
      expect(activeToggle).toBeDisabled();
      expect(screen.getByTestId("self-deactivation-warning")).toHaveTextContent(
        "You cannot deactivate your own account."
      );
    });

    it("allows editing other users and shows unassigned count notification", async () => {
      vi.mocked(api.updateAdminUser).mockResolvedValue({
        id: 2,
        name: "Bob Staff Demoted",
        email: "bob.staff@example.com",
        role: "REQUESTER",
        isActive: false,
        unassignedTicketsCount: 3,
      });

      render(<UserManagement />);
      await waitFor(() => screen.getByTestId("edit-user-btn-2"));

      await userEvent.click(screen.getByTestId("edit-user-btn-2"));
      await userEvent.selectOptions(screen.getByTestId("edit-user-role"), "REQUESTER");
      await userEvent.click(screen.getByTestId("edit-user-active")); // deactivate
      await userEvent.click(screen.getByTestId("submit-edit-user-btn"));

      await waitFor(() => {
        expect(api.updateAdminUser).toHaveBeenCalledWith(2, {
          name: "Bob Staff",
          email: "bob.staff@example.com",
          role: "REQUESTER",
          isActive: false,
        });
      });

      await waitFor(() => {
        expect(
          screen.getByText(/3 ticket\(s\) previously owned by this user were unassigned/i)
        ).toBeInTheDocument();
      });
    });
  });

  describe("Reset Password Modal", () => {
    it("validates temporary password and calls resetAdminUserPassword", async () => {
      vi.mocked(api.resetAdminUserPassword).mockResolvedValue();

      render(<UserManagement />);
      await waitFor(() => screen.getByTestId("reset-password-btn-2"));

      await userEvent.click(screen.getByTestId("reset-password-btn-2"));
      expect(screen.getByTestId("reset-password-modal")).toBeInTheDocument();

      const passInput = screen.getByTestId("reset-user-password");
      const submitBtn = screen.getByTestId("submit-reset-password-btn");

      await userEvent.type(passInput, "short");
      await userEvent.click(submitBtn);
      expect(screen.getByText("Password must be at least 12 characters")).toBeInTheDocument();

      await userEvent.clear(passInput);
      await userEvent.type(passInput, "NewTempPassword123!");
      await userEvent.click(submitBtn);

      await waitFor(() => {
        expect(api.resetAdminUserPassword).toHaveBeenCalledWith(2, "NewTempPassword123!");
      });
    });
  });
});
