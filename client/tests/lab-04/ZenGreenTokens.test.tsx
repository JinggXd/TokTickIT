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

  it("STYLE-L4-03: WCAG AA contrast ratios (>= 4.5:1) for Zen Green tokens, badges, and Pending Task button states", () => {
    const relativeLuminance = (hex: string): number => {
      const normalized = hex.replace("#", "");
      const [r, g, b] = [0, 2, 4]
        .map((idx) => parseInt(normalized.slice(idx, idx + 2), 16) / 255)
        .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };

    const contrastRatio = (fg: string, bg: string): number => {
      const [l1, l2] = [relativeLuminance(fg), relativeLuminance(bg)].sort((a, b) => a - b);
      return (l2 + 0.05) / (l1 + 0.05);
    };

    // Normal text pairs must meet WCAG 2.2 SC 1.4.3 AA (>= 4.5:1)
    const pairs: Array<[string, string, string]> = [
      ["Primary brand on white", "#006B3C", "#FFFFFF"],
      ["Secondary brand on white", "#0B7A46", "#FFFFFF"],
      ["Body ink on white card", "#1C2520", "#FFFFFF"],
      ["Body ink on canvas", "#1C2520", "#F5F7F6"],
      ["Muted text on white", "#526058", "#FFFFFF"],
      ["Pending badge / selected button (#92400E on #FEF3C7)", "#92400E", "#FEF3C7"],
      ["Pending Task unselected button (#92400E on #FFFFFF)", "#92400E", "#FFFFFF"],
      ["Completed badge (#15803D on #DCFCE7)", "#15803D", "#DCFCE7"],
      ["Cancelled badge (#4B5563 on #F3F4F6)", "#4B5563", "#F3F4F6"],
    ];

    for (const [label, fg, bg] of pairs) {
      expect(contrastRatio(fg, bg), label).toBeGreaterThanOrEqual(4.5);
    }

    // Verify zen-green.css defines .btn-action-pending with #92400E and focus-visible outline
    // @ts-ignore
    const dir = typeof __dirname !== "undefined" ? __dirname : path.resolve(".");
    const cssPath = path.resolve(dir, "../../src/styles/zen-green.css");
    const cssContent = fs.existsSync(cssPath)
      ? fs.readFileSync(cssPath, "utf-8")
      : fs.readFileSync(path.resolve("src/styles/zen-green.css"), "utf-8");

    expect(cssContent).toContain(".btn-action-pending");
    expect(cssContent).toContain("--bs-btn-color: #92400E;");
    expect(cssContent).toContain(".btn-check:focus-visible + .btn-action-pending");
  });
});
