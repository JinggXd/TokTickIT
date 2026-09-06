import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppShell } from "../../src/components/AppShell.js";
import { RequesterProvider } from "../../src/context/RequesterContext.js";

describe("UI-17: AppShell navigation and Change Requester", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("shows the selected identity and clears it immediately when Change is pressed", async () => {
    const user = userEvent.setup();
    const onTabChange = vi.fn();
    localStorage.setItem(
      "toktickit_current_requester",
      JSON.stringify({
        id: 1,
        name: "Jennifer Anderson",
        email: "jennifer.a@example.com",
        department: "Marketing",
      })
    );

    render(
      <RequesterProvider>
        <AppShell currentTab="my-tickets" onTabChange={onTabChange}>
          <div>Protected ticket content</div>
        </AppShell>
      </RequesterProvider>
    );

    expect(await screen.findByText("Jennifer Anderson")).toBeInTheDocument();
    expect(screen.getByTestId("nav-my-tickets")).toHaveClass("active");
    expect(screen.getByTestId("nav-create-ticket")).not.toHaveClass("active");
    await user.click(screen.getByRole("button", { name: "Change" }));

    expect(localStorage.getItem("toktickit_current_requester")).toBeNull();
    expect(screen.queryByTestId("user-profile-badge")).not.toBeInTheDocument();
    expect(onTabChange).toHaveBeenCalledWith("select-requester");
  });
});
