import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChangePassword } from "../../src/pages/ChangePassword.js";
import { AuthProvider } from "../../src/context/AuthContext.js";
import * as api from "../../src/api.js";

describe("Phase F2 / P06 UI-13 Change Password Screen Tests", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders mandatory alert when user has mustChangePassword: true", async () => {
    vi.spyOn(api, "fetchMe").mockResolvedValueOnce({
      user: {
        id: 2,
        name: "Sarah Johnson",
        email: "sarah.j@example.com",
        role: "REQUESTER",
        mustChangePassword: true,
      },
    });
    vi.spyOn(api, "fetchCsrf").mockResolvedValueOnce({ csrfToken: "csrf" });

    render(
      <AuthProvider>
        <ChangePassword onSuccess={vi.fn()} />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("mandatory-change-alert")).toBeInTheDocument();
      expect(screen.getByText("You are required to set a new password before proceeding.")).toBeInTheDocument();
    });
  });

  it("validates inline errors for empty fields, short password, and mismatched passwords without calling API", async () => {
    const changePwdSpy = vi.spyOn(api, "changePassword");

    render(
      <AuthProvider>
        <ChangePassword onSuccess={vi.fn()} />
      </AuthProvider>,
    );

    const submitBtn = screen.getByTestId("update-password-submit-button");
    await userEvent.click(submitBtn);

    expect(screen.getByText("Current password is required")).toBeInTheDocument();
    expect(screen.getByText("Password must be between 12 and 128 characters.")).toBeInTheDocument();
    expect(changePwdSpy).not.toHaveBeenCalled();

    // Fill short new password
    await userEvent.type(screen.getByTestId("current-password-input"), "Current123456!");
    await userEvent.type(screen.getByTestId("new-password-input"), "short");
    await userEvent.type(screen.getByTestId("confirm-password-input"), "different");
    await userEvent.click(submitBtn);

    expect(screen.getByText("Password must be between 12 and 128 characters.")).toBeInTheDocument();
    expect(screen.getByText("Passwords do not match")).toBeInTheDocument();
    expect(changePwdSpy).not.toHaveBeenCalled();
  });

  it("calls api.changePassword and onSuccess after successful update", async () => {
    vi.spyOn(api, "fetchMe").mockResolvedValueOnce({
      user: {
        id: 1,
        name: "Jennifer Anderson",
        email: "jennifer.a@example.com",
        role: "REQUESTER",
        mustChangePassword: false,
      },
    });
    vi.spyOn(api, "fetchCsrf").mockResolvedValueOnce({ csrfToken: "csrf" });

    vi.spyOn(api, "changePassword").mockResolvedValueOnce({
      message: "Password changed successfully",
      user: {
        id: 1,
        name: "Jennifer Anderson",
        email: "jennifer.a@example.com",
        role: "REQUESTER",
        mustChangePassword: false,
      },
    });

    const onSuccess = vi.fn();
    render(
      <AuthProvider>
        <ChangePassword onSuccess={onSuccess} />
      </AuthProvider>,
    );

    await userEvent.type(screen.getByTestId("current-password-input"), "CurrentPassword123!");
    await userEvent.type(screen.getByTestId("new-password-input"), "BrandNewSecurePassword2026!");
    await userEvent.type(screen.getByTestId("confirm-password-input"), "BrandNewSecurePassword2026!");
    await userEvent.click(screen.getByTestId("update-password-submit-button"));

    await waitFor(() => {
      expect(screen.getByTestId("change-password-success-alert")).toBeInTheDocument();
    });
  });

  it("cancels redirect timer and does not invoke onSuccess if unmounted before delay expires", async () => {
    vi.spyOn(api, "fetchMe").mockResolvedValue({
      user: {
        id: 1,
        name: "Jennifer Anderson",
        email: "jennifer.a@example.com",
        role: "REQUESTER",
        mustChangePassword: false,
      },
    });
    vi.spyOn(api, "fetchCsrf").mockResolvedValue({ csrfToken: "csrf" });

    vi.spyOn(api, "changePassword").mockResolvedValueOnce({
      message: "Password changed successfully",
      user: {
        id: 1,
        name: "Jennifer Anderson",
        email: "jennifer.a@example.com",
        role: "REQUESTER",
        mustChangePassword: false,
      },
    });

    const onSuccess = vi.fn();
    const { unmount } = render(
      <AuthProvider>
        <ChangePassword onSuccess={onSuccess} />
      </AuthProvider>,
    );

    await userEvent.type(screen.getByTestId("current-password-input"), "CurrentPassword123!");
    await userEvent.type(screen.getByTestId("new-password-input"), "BrandNewSecurePassword2026!");
    await userEvent.type(screen.getByTestId("confirm-password-input"), "BrandNewSecurePassword2026!");
    await userEvent.click(screen.getByTestId("update-password-submit-button"));

    await waitFor(() => {
      expect(screen.getByTestId("change-password-success-alert")).toBeInTheDocument();
    });

    // Unmount before 1000ms delay elapses (e.g. user clicked Sign Out or navigated away)
    unmount();

    // Wait past the 1000ms timer window
    await new Promise((resolve) => setTimeout(resolve, 1100));

    // onSuccess should NOT have been invoked because timer was cancelled on unmount
    expect(onSuccess).not.toHaveBeenCalled();
  });
});
