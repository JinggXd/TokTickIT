import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { RequesterSelection } from "../../src/pages/RequesterSelection.js";
import { RequesterProvider } from "../../src/context/RequesterContext.js";

const mockRequesters = [
  { id: 1, name: "Jennifer Anderson", email: "jennifer.a@example.com", department: "Marketing" },
  { id: 2, name: "Sarah Johnson", email: "sarah.j@example.com", department: "Finance" },
];

describe("RequesterSelection Component (ui-spec.md Section 10.1, BR-03, BR-05)", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("renders loading state initially and then shows active requesters", async () => {
    globalThis.fetch = vi.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockRequesters),
      })
    );

    render(
      <RequesterProvider>
        <RequesterSelection />
      </RequesterProvider>
    );

    expect(screen.getByTestId("loading-state")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId("requester-form")).toBeInTheDocument();
    });

    expect(globalThis.fetch).toHaveBeenCalledWith(
      "http://localhost:3000/api/requesters/active"
    );
    expect(screen.getByText("Select Development Requester")).toBeInTheDocument();
    expect(screen.getByText(/This is for testing only and is not a login screen/i)).toBeInTheDocument();
    expect(screen.getByTestId("requester-dropdown")).toBeInTheDocument();
    expect(screen.getByText(/Jennifer Anderson \(Marketing\)/)).toBeInTheDocument();
    expect(screen.getByText(/Sarah Johnson \(Finance\)/)).toBeInTheDocument();
  });

  it("allows selecting a requester and submitting to call onSuccess", async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();

    globalThis.fetch = vi.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockRequesters),
      })
    );

    render(
      <RequesterProvider>
        <RequesterSelection onSuccess={onSuccess} />
      </RequesterProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("requester-dropdown")).toBeInTheDocument();
    });

    const select = screen.getByTestId("requester-dropdown");
    await user.selectOptions(select, "2");

    const continueBtn = screen.getByTestId("continue-button");
    await user.click(continueBtn);

    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem("toktickit_current_requester")).toContain("Sarah Johnson");
  });

  it("renders empty state when no active requesters exist", async () => {
    globalThis.fetch = vi.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve([]),
      })
    );

    render(
      <RequesterProvider>
        <RequesterSelection />
      </RequesterProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("empty-state")).toBeInTheDocument();
    });

    expect(
      screen.getByText(/No active Development Requesters are available — contact your instructor/i)
    ).toBeInTheDocument();
  });

  it("renders failure state when API fails with retry option", async () => {
    globalThis.fetch = vi.fn().mockImplementation(() =>
      Promise.resolve({
        ok: false,
        status: 500,
      })
    );

    render(
      <RequesterProvider>
        <RequesterSelection />
      </RequesterProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("error-state")).toBeInTheDocument();
    });

    expect(screen.getByText(/Failed to Load Requesters/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Try Again/i })).toBeInTheDocument();
  });
});
