import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { AppShell } from "../../src/components/AppShell.js";
let role: string;
vi.mock("../../src/context/AuthContext.js", () => ({ useAuth: () => ({ user: { id: 5, name: "Keyboard user", role }, logout: vi.fn() }) }));
vi.mock("../../src/context/RequesterContext.js", () => ({ useRequester: () => ({ currentRequester: null, clearRequester: vi.fn() }) }));

describe("F3 review fix: shell keyboard navigation (AC-31)", () => {
  it.each([
    ["REQUESTER", "/dashboard", "dashboard"],
    ["IT_STAFF", "/staff/dashboard", "staff-dashboard"],
    ["ADMINISTRATOR", "/admin/dashboard", "admin-dashboard"],
  ])("%s brand is a focusable home link with native modified-click behavior", (userRole, path, tab) => {
    role = userRole;
    const navigate = vi.fn();
    render(<AppShell currentTab={tab} onTabChange={navigate}>Content</AppShell>);
    const brand = screen.getByRole("link", { name: /TokTickIT/ });
    expect(brand).toHaveAttribute("href", path);
    brand.focus(); expect(brand).toHaveFocus();
    fireEvent.click(brand); expect(navigate).toHaveBeenCalledWith(tab);
    navigate.mockClear(); fireEvent.click(brand, { ctrlKey: true }); expect(navigate).not.toHaveBeenCalled();
  });
});
