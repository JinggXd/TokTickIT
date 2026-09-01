import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { RouteGuard } from "../../src/components/RouteGuard.js";
import { RequesterProvider, useRequester } from "../../src/context/RequesterContext.js";

// Helper component that allows setting a requester in context for testing
const RequesterContextSetter: React.FC<{
  user?: { id: number; name: string; email: string; department: string } | null;
  children: React.ReactNode;
}> = ({ user, children }) => {
  const { setRequester } = useRequester();

  React.useEffect(() => {
    if (user !== undefined) {
      setRequester(user);
    }
  }, [user, setRequester]);

  return <>{children}</>;
};

describe("UI-10 (AC-02): RouteGuard Component", () => {
  beforeEach(() => {
    localStorage.clear();
    // Mock global fetch for RequesterSelection
    global.fetch = vi.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve([
            { id: 1, name: "Jennifer Anderson", email: "jennifer.a@example.com", department: "Marketing" },
          ]),
      })
    );
  });

  it("UI-10: intercepts and renders Requester Selection when no requester is in context", async () => {
    render(
      <RequesterProvider>
        <RouteGuard>
          <div data-testid="protected-content">Secret Protected Area</div>
        </RouteGuard>
      </RequesterProvider>
    );

    // Protected content must NOT be rendered
    expect(screen.queryByTestId("protected-content")).not.toBeInTheDocument();

    // Requester selection screen elements must appear
    expect(await screen.findByText("Select Development Requester")).toBeInTheDocument();
    expect(
      screen.getByText(/This is for testing only and is not a login screen/i)
    ).toBeInTheDocument();
  });

  it("renders protected children when an active requester is in context", async () => {
    const mockUser = {
      id: 1,
      name: "Jennifer Anderson",
      email: "jennifer.a@example.com",
      department: "Marketing",
    };

    localStorage.setItem("toktickit_current_requester", JSON.stringify(mockUser));

    render(
      <RequesterProvider>
        <RouteGuard>
          <div data-testid="protected-content">Secret Protected Area</div>
        </RouteGuard>
      </RequesterProvider>
    );

    // Protected content MUST be rendered
    expect(await screen.findByTestId("protected-content")).toBeInTheDocument();
    expect(screen.getByText("Secret Protected Area")).toBeInTheDocument();
  });
});
