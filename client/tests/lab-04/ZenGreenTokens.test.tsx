import { describe, it, expect } from "vitest";
// @ts-ignore
import fs from "node:fs";
// @ts-ignore
import path from "node:path";
import React from "react";
import { render, screen } from "@testing-library/react";
import { ActionStatusBadge } from "../../src/components/Badges.js";

describe("Phase F2 / L4-P05: Zen Green Design Tokens & Badges (STYLE-L4-01, STYLE-L4-02)", () => {
  it("STYLE-L4-01: Zen Green CSS token values verification", () => {
    // @ts-ignore
    const dir = typeof __dirname !== "undefined" ? __dirname : path.resolve(".");
    const cssPath = path.resolve(dir, "../../src/styles/zen-green.css");
    let cssContent = "";
    if (fs.existsSync(cssPath)) {
      cssContent = fs.readFileSync(cssPath, "utf-8");
    } else {
      cssContent = fs.readFileSync(path.resolve("src/styles/zen-green.css"), "utf-8");
    }

    expect(cssContent).toContain("--zg-primary: #006B3C;");
    expect(cssContent).toContain("--zg-secondary: #0B7A46;");
    expect(cssContent).toContain("--zg-canvas: #F5F7F6;");
    expect(cssContent).toContain("--zg-warning: #D97706;");
    expect(cssContent).toContain("--zg-success: #15803D;");
  });

  it("STYLE-L4-02: Action status badge styling & token mapping", () => {
    // 1. PENDING: #FEF3C7 / #92400E
    const { unmount: unmountPending } = render(<ActionStatusBadge status="PENDING" />);
    const pendingBadge = screen.getByTestId("action-status-badge-PENDING");
    expect(pendingBadge.textContent).toContain("Pending");
    expect(pendingBadge.style.backgroundColor).toBe("rgb(254, 243, 199)"); // #FEF3C7
    expect(pendingBadge.style.color).toBe("rgb(146, 64, 14)"); // #92400E
    unmountPending();

    // 2. COMPLETED: #DCFCE7 / #15803D
    const { unmount: unmountCompleted } = render(<ActionStatusBadge status="COMPLETED" />);
    const completedBadge = screen.getByTestId("action-status-badge-COMPLETED");
    expect(completedBadge.textContent).toContain("Completed");
    expect(completedBadge.style.backgroundColor).toBe("rgb(220, 252, 231)"); // #DCFCE7
    expect(completedBadge.style.color).toBe("rgb(21, 128, 61)"); // #15803D
    unmountCompleted();

    // 3. CANCELLED: #F3F4F6 / #4B5563
    const { unmount: unmountCancelled } = render(<ActionStatusBadge status="CANCELLED" />);
    const cancelledBadge = screen.getByTestId("action-status-badge-CANCELLED");
    expect(cancelledBadge.textContent).toContain("Cancelled");
    expect(cancelledBadge.style.backgroundColor).toBe("rgb(243, 244, 246)"); // #F3F4F6
    expect(cancelledBadge.style.color).toBe("rgb(75, 85, 99)"); // #4B5563
    unmountCancelled();
  });
});
