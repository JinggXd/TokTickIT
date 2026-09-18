import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Login } from "../../src/pages/Login.js";
import { AppShell } from "../../src/components/AppShell.js";
import { AuthProvider } from "../../src/context/AuthContext.js";
import * as api from "../../src/api.js";

describe("Phase F2 / P06 UI-01, UI-02, UI-03 Login & Navigation Tests", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("UI-01: Login screen validation on blank submit", () => {
    it("renders inline error text below email and password on blank submit without calling API", async () => {
      const loginSpy = vi.spyOn(api, "login");
      const onSuccess = vi.fn();

      render(
        <AuthProvider>
          <Login onSuccess={onSuccess} />
        </AuthProvider>,
      );

      const submitBtn = screen.getByTestId("login-submit-button");
      await userEvent.click(submitBtn);

      expect(screen.getByText("Email address is required")).toBeInTheDocument();
      expect(screen.getByText("Password is required")).toBeInTheDocument();
      expect(loginSpy).not.toHaveBeenCalled();
      expect(onSuccess).not.toHaveBeenCalled();
    });
  });

  describe("UI-02: Login busy state and error alert banners", () => {
    it("disables form controls during submit and shows error alert on failure", async () => {
      vi.spyOn(api, "login").mockRejectedValueOnce(new Error("Invalid email or password"));
      const onSuccess = vi.fn();

      render(
        <AuthProvider>
          <Login onSuccess={onSuccess} />
        </AuthProvider>,
      );

      await userEvent.type(screen.getByTestId("login-email-input"), "wrong@example.com");
      await userEvent.type(screen.getByTestId("login-password-input"), "WrongPass123!");
      await userEvent.click(screen.getByTestId("login-submit-button"));

      await waitFor(() => {
        const alert = screen.getByTestId("login-error-alert");
        expect(alert).toBeInTheDocument();
        expect(alert).toHaveTextContent("Invalid email or password");
      });
      expect(onSuccess).not.toHaveBeenCalled();
    });

    it("displays rate-limit error banner on 429 status", async () => {
      const err: any = new Error("Too many failed attempts");
      err.status = 429;
      vi.spyOn(api, "login").mockRejectedValueOnce(err);

      render(
        <AuthProvider>
          <Login onSuccess={vi.fn()} />
        </AuthProvider>,
      );

      await userEvent.type(screen.getByTestId("login-email-input"), "rate@example.com");
      await userEvent.type(screen.getByTestId("login-password-input"), "Pass12345678!");
      await userEvent.click(screen.getByTestId("login-submit-button"));

      await waitFor(() => {
        expect(screen.getByText("Too many failed attempts. Please try again later.")).toBeInTheDocument();
      });
    });

    it("calls onSuccess with role and mustChangePassword flag on successful login", async () => {
      vi.spyOn(api, "login").mockResolvedValueOnce({
        user: {
          id: 1,
          name: "Jennifer Anderson",
          email: "jennifer.a@example.com",
          role: "REQUESTER",
          mustChangePassword: false,
        },
      });
      vi.spyOn(api, "fetchCsrf").mockResolvedValueOnce({ csrfToken: "dummy-csrf" });

      const onSuccess = vi.fn();
      render(
        <AuthProvider>
          <Login onSuccess={onSuccess} />
        </AuthProvider>,
      );

      await userEvent.type(screen.getByTestId("login-email-input"), "jennifer.a@example.com");
      await userEvent.type(screen.getByTestId("login-password-input"), "ValidPassword123!");
      await userEvent.click(screen.getByTestId("login-submit-button"));

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledWith("REQUESTER", false);
      });
    });
  });

  describe("UI-03: AppShell authenticated display and removal of dev requester selector", () => {
    it("displays user name and role badge, and has no dev requester selector element", async () => {
      vi.spyOn(api, "fetchMe").mockResolvedValueOnce({
        user: {
          id: 12,
          name: "Alex IT",
          email: "alex.it@example.com",
          role: "IT_STAFF",
          mustChangePassword: false,
        },
      });
      vi.spyOn(api, "fetchCsrf").mockResolvedValueOnce({ csrfToken: "token" });

      render(
        <AuthProvider>
          <AppShell currentTab="staff-queue" onTabChange={vi.fn()}>
            <div>Child Content</div>
          </AppShell>
        </AuthProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId("user-profile-name")).toHaveTextContent("Alex IT");
        expect(screen.getByTestId("user-role-badge")).toHaveTextContent("IT Staff");
      });

      // Confirm development requester selector is completely absent (AC-13, R17)
      expect(screen.queryByTestId("change-requester-button")).not.toBeInTheDocument();
      expect(screen.queryByText("Select Requester")).not.toBeInTheDocument();
      expect(screen.queryByText("Switch to another Development Requester")).not.toBeInTheDocument();
    });
  });
});
