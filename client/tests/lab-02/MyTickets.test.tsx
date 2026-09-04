import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MyTickets } from "../../src/pages/MyTickets.js";
import { RequesterProvider, useRequester } from "../../src/context/RequesterContext.js";

const mockRequesterA = {
  id: 1,
  name: "Jennifer Anderson",
  email: "jennifer.a@example.com",
  department: "Marketing",
};

const mockRequesterB = {
  id: 2,
  name: "David Lee",
  email: "david.l@example.com",
  department: "Finance",
};

const mockCategories = [
  { id: 1, name: "Account and Access" },
  { id: 2, name: "Hardware" },
];

const mockTicketsData = [
  {
    id: 101,
    ticketNo: "TKT-2026-000101",
    summary: "Laptop battery drains quickly",
    categoryName: "Hardware",
    relatedSystemName: "Corporate Laptop",
    requestedPriority: "HIGH",
    itPriority: "HIGH",
    currentStatus: "NEW",
    ticketOwnerName: "Unassigned",
    createdAt: "2026-09-01T10:00:00.000Z",
    updatedAt: "2026-09-01T10:00:00.000Z",
  },
  {
    id: 102,
    ticketNo: "TKT-2026-000102",
    summary: "Cannot access VPN server",
    categoryName: "Account and Access",
    relatedSystemName: "VPN",
    requestedPriority: "MEDIUM",
    itPriority: "MEDIUM",
    currentStatus: "IN_PROGRESS",
    ticketOwnerName: "Unassigned",
    createdAt: "2026-09-01T11:00:00.000Z",
    updatedAt: "2026-09-01T11:00:00.000Z",
  },
];

function renderWithContext(ui: React.ReactElement, initialRequester = mockRequesterA) {
  localStorage.setItem("toktickit_current_requester", JSON.stringify(initialRequester));
  return render(<RequesterProvider>{ui}</RequesterProvider>);
}

describe("My Tickets Screen (UI-05, UI-06, UI-14, STYLE-02)", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  // UI-05 — AC-14, BR-13: Empty State vs. No-Results State
  it("UI-05: renders distinct Empty State vs. No-Results State with distinct icons, copy, and actions", async () => {
    // 1. Empty State (0 total tickets, no active filters)
    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/api/categories")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockCategories) });
      }
      if (url.includes("/api/tickets")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              data: [],
              pagination: { currentPage: 1, pageSize: 8, totalItems: 0, totalPages: 1 },
            }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
    }) as any;

    const onNavigateToCreate = vi.fn();
    const { unmount } = renderWithContext(<MyTickets onNavigateToCreate={onNavigateToCreate} />);

    // Assert Empty State copy, icon, and Create First Ticket button
    await waitFor(() => {
      expect(screen.getByText(/no tickets submitted yet/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /create first ticket/i })).toBeInTheDocument();
      expect(screen.queryByText(/no tickets match your filters/i)).not.toBeInTheDocument();
    });

    unmount();

    // 2. No-Results State (0 matching filtered tickets with active search/filter)
    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/api/categories")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockCategories) });
      }
      if (url.includes("/api/tickets")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              data: [],
              pagination: { currentPage: 1, pageSize: 8, totalItems: 0, totalPages: 1 },
            }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
    }) as any;

    renderWithContext(<MyTickets onNavigateToCreate={onNavigateToCreate} />);

    // Type a search query into the search bar and submit
    const searchInput = await screen.findByPlaceholderText(/search by ticket # or summary/i);
    const user = userEvent.setup();
    await user.type(searchInput, "nonexistent term{Enter}");

    // Wait for No-Results State
    await waitFor(() => {
      expect(screen.getByText(/no tickets match your filters/i)).toBeInTheDocument();
      expect(screen.getAllByRole("button", { name: /clear filters/i }).length).toBeGreaterThanOrEqual(1);
      expect(screen.queryByText(/no tickets submitted yet/i)).not.toBeInTheDocument();
    });
  });

  // UI-06 — AC-13: Switching requester leaves no stale data flash (deferred and failure paths)
  it("UI-06: refreshes tickets on requester change without stale data retention (deferred and failure paths)", async () => {
    let resolveRequesterB: (val: any) => void;
    const pendingPromiseB = new Promise((resolve) => {
      resolveRequesterB = resolve;
    });

    const mockTicketsB = [
      {
        id: 201,
        ticketNo: "TKT-2026-000201",
        summary: "Requester B finance workstation error",
        categoryName: "Hardware",
        relatedSystemName: "Corporate Laptop",
        requestedPriority: "LOW",
        itPriority: "LOW",
        currentStatus: "RESOLVED",
        ticketOwnerName: "Unassigned",
        createdAt: "2026-09-02T10:00:00.000Z",
        updatedAt: "2026-09-02T10:00:00.000Z",
      },
    ];

    globalThis.fetch = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (url.includes("/api/categories")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockCategories) });
      }
      if (url.includes("/api/tickets")) {
        const reqHeader = (init?.headers as any)?.["X-Requester-Id"];
        if (reqHeader === "2") {
          return pendingPromiseB;
        }
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              data: mockTicketsData,
              pagination: { currentPage: 1, pageSize: 8, totalItems: 2, totalPages: 1 },
            }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
    }) as any;

    const TestSwitcher = () => {
      const { setRequester } = useRequester();
      return (
        <div>
          <button onClick={() => setRequester(mockRequesterB)}>Switch to B</button>
          <MyTickets />
        </div>
      );
    };

    const user = userEvent.setup();
    renderWithContext(<TestSwitcher />);

    // 1. Initially Requester A's tickets are visible
    await waitFor(() => {
      expect(screen.getAllByText("TKT-2026-000101").length).toBeGreaterThanOrEqual(1);
    });

    // 2. Click Switch to B (Requester B fetch is now pending deferred)
    const switchBtn = screen.getByRole("button", { name: /switch to b/i });
    await user.click(switchBtn);

    // CRITICAL (AC-13 Point 2): Prior to B responding, Requester A's tickets MUST BE GONE immediately
    await waitFor(() => {
      expect(screen.queryByText("TKT-2026-000101")).not.toBeInTheDocument();
      expect(screen.getByText(/loading your tickets/i)).toBeInTheDocument();
    });

    // 3. Resolve B's promise now
    resolveRequesterB!({
      ok: true,
      json: () =>
        Promise.resolve({
          data: mockTicketsB,
          pagination: { currentPage: 1, pageSize: 8, totalItems: 1, totalPages: 1 },
        }),
    });

    // Requester B's rows appear
    await waitFor(() => {
      expect(screen.getAllByText("TKT-2026-000201").length).toBeGreaterThanOrEqual(1);
      expect(screen.queryByText("TKT-2026-000101")).not.toBeInTheDocument();
    });
  });

  // UI-06 Failure path: When switching to Requester B fails, Requester A's data NEVER reappears
  it("UI-06: retains zero stale data when switching to a requester whose request fails", async () => {
    globalThis.fetch = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (url.includes("/api/categories")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockCategories) });
      }
      if (url.includes("/api/tickets")) {
        const reqHeader = (init?.headers as any)?.["X-Requester-Id"];
        if (reqHeader === "2") {
          return Promise.reject(new Error("Network connection lost"));
        }
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              data: mockTicketsData,
              pagination: { currentPage: 1, pageSize: 8, totalItems: 2, totalPages: 1 },
            }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
    }) as any;

    const TestSwitcher = () => {
      const { setRequester } = useRequester();
      return (
        <div>
          <button onClick={() => setRequester(mockRequesterB)}>Switch to B</button>
          <MyTickets />
        </div>
      );
    };

    const user = userEvent.setup();
    renderWithContext(<TestSwitcher />);

    // Requester A loads first
    await waitFor(() => {
      expect(screen.getAllByText("TKT-2026-000101").length).toBeGreaterThanOrEqual(1);
    });

    // Switch to Requester B (which rejects)
    await user.click(screen.getByRole("button", { name: /switch to b/i }));

    // Requester A's tickets must not reappear, and error banner shows
    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
      expect(screen.queryByText("TKT-2026-000101")).not.toBeInTheDocument();
      expect(screen.queryByText("TKT-2026-000102")).not.toBeInTheDocument();
    });
  });

  // UI-06 Out-of-order response test: Slow response from Requester A is discarded after switching to Requester B
  it("UI-06: discards delayed out-of-order response from previous requester when newer requester responds first", async () => {
    let resolveRequesterA: (val: any) => void;
    const slowPromiseA = new Promise((resolve) => {
      resolveRequesterA = resolve;
    });

    const mockTicketsB = [
      {
        id: 201,
        ticketNo: "TKT-2026-000201",
        summary: "Requester B immediate ticket",
        categoryName: "Hardware",
        relatedSystemName: "Corporate Laptop",
        requestedPriority: "LOW",
        itPriority: "LOW",
        currentStatus: "RESOLVED",
        ticketOwnerName: "Unassigned",
        createdAt: "2026-09-02T10:00:00.000Z",
        updatedAt: "2026-09-02T10:00:00.000Z",
      },
    ];

    globalThis.fetch = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (url.includes("/api/categories")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockCategories) });
      }
      if (url.includes("/api/tickets")) {
        const reqHeader = (init?.headers as any)?.["X-Requester-Id"];
        if (reqHeader === "1") {
          return slowPromiseA;
        }
        if (reqHeader === "2") {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                data: mockTicketsB,
                pagination: { currentPage: 1, pageSize: 8, totalItems: 1, totalPages: 1 },
              }),
          });
        }
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
    }) as any;

    const TestSwitcher = () => {
      const { setRequester } = useRequester();
      return (
        <div>
          <button onClick={() => setRequester(mockRequesterB)}>Switch to B</button>
          <MyTickets />
        </div>
      );
    };

    const user = userEvent.setup();
    renderWithContext(<TestSwitcher />);

    // Requester A's request is pending in background. Switch to Requester B
    await user.click(screen.getByRole("button", { name: /switch to b/i }));

    // Requester B responds and displays its tickets
    await waitFor(() => {
      expect(screen.getAllByText("TKT-2026-000201").length).toBeGreaterThanOrEqual(1);
    });

    // NOW: Requester A's delayed response finally resolves
    resolveRequesterA!({
      ok: true,
      json: () =>
        Promise.resolve({
          data: mockTicketsData,
          pagination: { currentPage: 1, pageSize: 8, totalItems: 2, totalPages: 1 },
        }),
    });

    // Verify Requester A's stale response was discarded by generation token:
    // Requester B's ticket remains, and Requester A's tickets NEVER reappear
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.getAllByText("TKT-2026-000201").length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText("TKT-2026-000101")).not.toBeInTheDocument();
  });

  // UI-14 — AC-10, AC-11, AC-12: Full controls, filters, pagination, sort, genuine loading, and retry
  it("UI-14: search, all filters (including IT Priority), sort toggle, page size, direct page numbers, Previous/Next, loading, and retry", async () => {
    let capturedUrl = "";
    let shouldFail = false;

    let resolveInitialTickets: (val: any) => void;
    const initialTicketsPromise = new Promise((resolve) => {
      resolveInitialTickets = resolve;
    });
    let isInitialFetch = true;

    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      capturedUrl = url;
      if (url.includes("/api/categories")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockCategories) });
      }
      if (url.includes("/api/tickets")) {
        if (isInitialFetch) {
          isInitialFetch = false;
          return initialTicketsPromise;
        }
        if (shouldFail) {
          return Promise.reject(new Error("Database temporary failure"));
        }
        const urlObj = new URL(url, "http://localhost:3000");
        const reqPage = Number(urlObj.searchParams.get("page") || "1");
        const reqLimit = Number(urlObj.searchParams.get("limit") || "8");
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              data: mockTicketsData,
              pagination: { currentPage: reqPage, pageSize: reqLimit, totalItems: 24, totalPages: 3 },
            }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
    }) as any;

    const user = userEvent.setup();
    renderWithContext(<MyTickets />);

    // 1. GENUINE LOADING STATE TEST (Point 3): While initialTicketsPromise is pending
    expect(screen.getByText(/loading your tickets/i)).toBeInTheDocument();
    expect(screen.getAllByRole("status").length).toBeGreaterThanOrEqual(1);

    // Now resolve initialTicketsPromise
    resolveInitialTickets!({
      ok: true,
      json: () =>
        Promise.resolve({
          data: mockTicketsData,
          pagination: { currentPage: 1, pageSize: 8, totalItems: 24, totalPages: 3 },
        }),
    });

    // Loading disappears and tickets are rendered
    await waitFor(() => {
      expect(screen.queryByText(/loading your tickets/i)).not.toBeInTheDocument();
      expect(screen.getAllByText("TKT-2026-000101").length).toBeGreaterThanOrEqual(1);
    });

    // 2. Test search trigger
    const searchBtn = screen.getByRole("button", { name: "Search" });
    expect(searchBtn).toHaveClass("btn-secondary-zen");
    const searchInput = screen.getByPlaceholderText(/search by ticket # or summary/i);
    await user.type(searchInput, "battery{Enter}");

    await waitFor(() => {
      expect(capturedUrl).toContain("search=battery");
    });

    // 3. Test Category filter
    const categorySelect = screen.getByLabelText(/^Category$/i);
    await user.selectOptions(categorySelect, "2");

    await waitFor(() => {
      expect(capturedUrl).toContain("categoryId=2");
    });

    // 4. Test Requested Priority filter
    const reqPrioritySelect = screen.getByLabelText(/^Requested Priority$/i);
    await user.selectOptions(reqPrioritySelect, "HIGH");

    await waitFor(() => {
      expect(capturedUrl).toContain("requestedPriority=HIGH");
    });

    // 5. Test IT Priority filter (Point 1 & Point 4)
    const itPrioritySelect = screen.getByLabelText(/^IT Priority$/i);
    await user.selectOptions(itPrioritySelect, "MEDIUM");

    await waitFor(() => {
      expect(capturedUrl).toContain("itPriority=MEDIUM");
    });

    // 6. Test Status filter
    const statusSelect = screen.getByLabelText(/^Status$/i);
    await user.selectOptions(statusSelect, "NEW");

    await waitFor(() => {
      expect(capturedUrl).toContain("status=NEW");
    });

    // 7. Test Column Sort header click and direction toggle
    const priorityHeader = screen.getByRole("button", { name: /requested priority/i });
    await user.click(priorityHeader); // first click: sets sortBy to requestedPriority and sortOrder to desc

    await waitFor(() => {
      expect(capturedUrl).toContain("sortBy=requestedPriority");
      expect(capturedUrl).toContain("sortOrder=desc");
    });

    const priorityHeaderUpdated = screen.getByRole("button", { name: /requested priority/i });
    await user.click(priorityHeaderUpdated); // second click: toggles sortOrder to asc

    await waitFor(() => {
      expect(capturedUrl).toContain("sortBy=requestedPriority");
      expect(capturedUrl).toContain("sortOrder=asc");
    });

    // 8. Test Page-Size selector
    const limitSelect = screen.getByLabelText(/per page:/i);
    await user.selectOptions(limitSelect, "20");

    await waitFor(() => {
      expect(capturedUrl).toContain("limit=20");
    });

    // 9. Test direct page number buttons (Point 3)
    // totalPages is 3, so button "2" and "3" exist
    const page1Button = screen.getByRole("button", { name: "Page 1" });
    const page2Button = screen.getByRole("button", { name: "Page 2" });
    expect(page1Button).toHaveClass("btn-primary-zen");
    expect(page2Button).toHaveClass("btn-secondary-zen");
    await user.click(page2Button);

    await waitFor(() => {
      expect(capturedUrl).toContain("page=2");
    });
    expect(screen.getByRole("button", { name: "Page 2" })).toHaveClass("btn-primary-zen");
    expect(screen.getByRole("button", { name: "Page 1" })).toHaveClass("btn-secondary-zen");

    // 10. Test Next and Previous buttons
    const nextBtn = screen.getByRole("button", { name: /next page/i });
    expect(nextBtn).toHaveClass("btn-secondary-zen");
    await user.click(nextBtn);

    await waitFor(() => {
      expect(capturedUrl).toContain("page=3");
    });

    const prevBtn = screen.getByRole("button", { name: /previous page/i });
    expect(prevBtn).toHaveClass("btn-secondary-zen");
    await user.click(prevBtn);

    await waitFor(() => {
      expect(capturedUrl).toContain("page=2");
    });

    // 11. Test Clear Filters
    const clearBtn = screen.getAllByRole("button", { name: /clear filters/i })[0];
    expect(clearBtn).toHaveClass("btn-secondary-zen");
    await user.click(clearBtn);

    await waitFor(() => {
      expect(capturedUrl).not.toContain("search=battery");
      expect(capturedUrl).not.toContain("categoryId=2");
      expect(capturedUrl).not.toContain("requestedPriority=HIGH");
      expect(capturedUrl).not.toContain("itPriority=MEDIUM");
      expect(capturedUrl).not.toContain("status=NEW");
    });

    // 12. Test Failure state and Retry button
    shouldFail = true;
    const retryTriggerBtn = screen.getByRole("button", { name: "Page 2" });
    await user.click(retryTriggerBtn);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
    });

    // Clicking Retry when backend recovers
    shouldFail = false;
    const retryBtn = screen.getByRole("button", { name: /retry/i });
    expect(retryBtn).toHaveClass("btn-secondary-zen");
    await user.click(retryBtn);

    await waitFor(() => {
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      expect(screen.getAllByText("TKT-2026-000101").length).toBeGreaterThanOrEqual(1);
    });
  });

  // STYLE-02 — AC-20: Status and Priority badges non-color accessible with exact tokens
  it("STYLE-02: renders accessible status and priority badges with text, icons, and exact spec colors", async () => {
    const mockTicketsAllBadges = [
      ...mockTicketsData,
      {
        id: 103,
        ticketNo: "TKT-2026-000103",
        summary: "Resolved ticket with low priority",
        categoryName: "Hardware",
        relatedSystemName: "Corporate Laptop",
        requestedPriority: "LOW",
        itPriority: "LOW",
        currentStatus: "RESOLVED",
        ticketOwnerName: "Unassigned",
        createdAt: "2026-09-01T12:00:00.000Z",
        updatedAt: "2026-09-01T12:00:00.000Z",
      },
    ];

    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/api/categories")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockCategories) });
      }
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            data: mockTicketsAllBadges,
            pagination: { currentPage: 1, pageSize: 8, totalItems: 3, totalPages: 1 },
          }),
      });
    }) as any;

    renderWithContext(<MyTickets />);

    await waitFor(() => {
      expect(screen.getAllByText("TKT-2026-000101").length).toBeGreaterThanOrEqual(1);
    });

    // Verify status badge text and icon
    expect(screen.getAllByText(/NEW/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/IN_PROGRESS/i).length).toBeGreaterThanOrEqual(1);
    const resolvedBadges = screen.getAllByText(/🟢 RESOLVED/i);
    expect(resolvedBadges.length).toBeGreaterThanOrEqual(1);
    // Exact token check for RESOLVED (#DCFCE7 bg, #15803D text)
    expect(resolvedBadges[0]).toHaveStyle({
      backgroundColor: "rgb(220, 252, 231)",
      color: "rgb(21, 128, 61)",
    });

    // Verify priority badge text
    expect(screen.getAllByText(/HIGH/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/MEDIUM/i).length).toBeGreaterThanOrEqual(1);
    const lowBadge = screen
      .getAllByText(/^LOW$/i)
      .find((el) => el.classList.contains("badge"));
    expect(lowBadge).toBeTruthy();
    // Exact token check for LOW (#F1F5F9 bg, #475569 text)
    expect(lowBadge).toHaveStyle({
      backgroundColor: "rgb(241, 245, 249)",
      color: "rgb(71, 85, 105)",
    });
  });
});
