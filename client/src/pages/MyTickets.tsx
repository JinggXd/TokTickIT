import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRequester } from "../context/RequesterContext.js";
import { fetchCategories, fetchMyTickets, Category, TicketListItem, PaginationMetadata } from "../api.js";

interface MyTicketsProps {
  onNavigateToCreate?: () => void;
  onSelectTicket?: (ticketId: number) => void;
}

export const MyTickets: React.FC<MyTicketsProps> = ({
  onNavigateToCreate,
  onSelectTicket,
}) => {
  const { currentRequester } = useRequester();

  // Reference data
  const [categories, setCategories] = useState<Category[]>([]);

  // Query & Filter State
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [selectedReqPriority, setSelectedReqPriority] = useState("ALL");
  const [selectedItPriority, setSelectedItPriority] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);

  // Data & State
  const [tickets, setTickets] = useState<TicketListItem[]>([]);
  const [pagination, setPagination] = useState<PaginationMetadata>({
    currentPage: 1,
    pageSize: 8,
    totalItems: 0,
    totalPages: 1,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Requester switch & race condition prevention (AC-13, UI-06)
  const previousRequesterIdRef = useRef<number | null>(currentRequester?.id ?? null);
  const activeRequestIdRef = useRef(0);

  // Immediately clear tickets when switching requester to prevent stale data flash
  useEffect(() => {
    if (previousRequesterIdRef.current !== (currentRequester?.id ?? null)) {
      previousRequesterIdRef.current = currentRequester?.id ?? null;
      setTickets([]);
      setError(null);
      setCurrentPage(1);
    }
  }, [currentRequester?.id]);

  // Has active filter? (Used to distinguish Empty vs No-Results state per BR-13)
  const hasActiveFilter = Boolean(
    searchTerm.trim() !== "" ||
      selectedCategory !== "ALL" ||
      selectedReqPriority !== "ALL" ||
      selectedItPriority !== "ALL" ||
      selectedStatus !== "ALL"
  );

  // Load Categories on mount
  useEffect(() => {
    let isMounted = true;
    fetchCategories()
      .then((cats) => {
        if (isMounted) setCategories(cats);
      })
      .catch(() => {
        // Silently continue if categories fail to load
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch Tickets
  const loadTickets = useCallback(async () => {
    if (!currentRequester) return;

    const requestId = ++activeRequestIdRef.current;
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetchMyTickets(
        {
          search: searchTerm || undefined,
          categoryId: selectedCategory !== "ALL" ? selectedCategory : undefined,
          requestedPriority: selectedReqPriority !== "ALL" ? selectedReqPriority : undefined,
          itPriority: selectedItPriority !== "ALL" ? selectedItPriority : undefined,
          status: selectedStatus !== "ALL" ? selectedStatus : undefined,
          sortBy,
          sortOrder,
          page: currentPage,
          limit: pageSize,
        },
        currentRequester.id
      );

      // Discard stale response if a newer request was dispatched
      if (requestId !== activeRequestIdRef.current) return;

      setTickets(res.data);
      setPagination(res.pagination);
    } catch (err: any) {
      if (requestId !== activeRequestIdRef.current) return;
      setTickets([]); // ensure no stale rows remain on failure
      setError(err.message || "Unable to load tickets. Please try again.");
    } finally {
      if (requestId === activeRequestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [
    currentRequester,
    searchTerm,
    selectedCategory,
    selectedReqPriority,
    selectedItPriority,
    selectedStatus,
    sortBy,
    sortOrder,
    currentPage,
    pageSize,
  ]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  // Handlers
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchTerm(searchInput.trim());
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setSearchInput("");
    setSearchTerm("");
    setSelectedCategory("ALL");
    setSelectedReqPriority("ALL");
    setSelectedItPriority("ALL");
    setSelectedStatus("ALL");
    setCurrentPage(1);
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
    setCurrentPage(1);
  };

  // Badges per ui-spec.md Section 7.2 & STYLE-02 (Accessible with icon + text)
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "NEW":
        return (
          <span
            className="badge fw-medium px-2 py-1"
            style={{ backgroundColor: "#E0F2FE", color: "#0369A1" }}
          >
            🔵 NEW
          </span>
        );
      case "IN_PROGRESS":
        return (
          <span
            className="badge fw-medium px-2 py-1"
            style={{ backgroundColor: "#FEF3C7", color: "#92400E" }}
          >
            🟡 IN_PROGRESS
          </span>
        );
      case "RESOLVED":
        return (
          <span
            className="badge fw-medium px-2 py-1"
            style={{ backgroundColor: "#DCFCE7", color: "#15803D" }}
          >
            🟢 RESOLVED
          </span>
        );
      default:
        return (
          <span className="badge bg-secondary px-2 py-1">
            ⚪ {status}
          </span>
        );
    }
  };

  const renderPriorityBadge = (priority: string) => {
    switch (priority) {
      case "HIGH":
        return (
          <span
            className="badge fw-semibold px-2 py-1"
            style={{ backgroundColor: "#FEE2E2", color: "#B91C1C" }}
          >
            HIGH
          </span>
        );
      case "MEDIUM":
        return (
          <span
            className="badge fw-semibold px-2 py-1"
            style={{ backgroundColor: "#FEF3C7", color: "#B45309" }}
          >
            MEDIUM
          </span>
        );
      case "LOW":
        return (
          <span
            className="badge fw-semibold px-2 py-1"
            style={{ backgroundColor: "#F1F5F9", color: "#475569" }}
          >
            LOW
          </span>
        );
      default:
        return <span className="badge bg-light text-dark px-2 py-1">{priority}</span>;
    }
  };

  return (
    <div className="container py-4" style={{ maxWidth: 1100 }}>
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <div>
          <h1 className="h3 fw-bold mb-1">My Tickets</h1>
          <p className="text-muted small mb-0">View and track all of your support requests.</p>
        </div>
        {onNavigateToCreate && (
          <button
            className="btn btn-primary-zen"
            data-testid="create-ticket-header-btn"
            onClick={onNavigateToCreate}
          >
            + Create Ticket
          </button>
        )}
      </div>

      {/* Error Alert */}
      {error && (
        <div className="alert alert-danger d-flex justify-content-between align-items-center mb-4" role="alert">
          <div>
            <span className="me-2">⚠️</span>
            <span>{error}</span>
          </div>
          <button className="btn btn-sm btn-secondary-zen" onClick={loadTickets}>
            Retry
          </button>
        </div>
      )}

      {/* Search & Filter Bar (ui-spec.md Section 10.3: collapses to 1 column on mobile via col-12) */}
      <div className="card card-zen p-3 mb-4">
        <form onSubmit={handleSearchSubmit}>
          <div className="row g-2 align-items-end">
            {/* Search input */}
            <div className="col-12 col-md-4">
              <label htmlFor="ticket-search" className="form-label small fw-semibold mb-1">
                Search
              </label>
              <div className="input-group">
                <input
                  id="ticket-search"
                  type="text"
                  className="form-control form-control-sm form-control-zen"
                  placeholder="Search by Ticket # or summary..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                />
                <button type="submit" className="btn btn-sm btn-secondary-zen" aria-label="Search">
                  🔍
                </button>
              </div>
            </div>

            {/* Category dropdown */}
            <div className="col-12 col-md-4 col-lg">
              <label htmlFor="filter-category" className="form-label small fw-semibold mb-1">
                Category
              </label>
              <select
                id="filter-category"
                aria-label="Category"
                className="form-select form-select-sm form-select-zen"
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="ALL">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Requested Priority dropdown */}
            <div className="col-12 col-md-4 col-lg">
              <label htmlFor="filter-req-priority" className="form-label small fw-semibold mb-1">
                Requested Priority
              </label>
              <select
                id="filter-req-priority"
                aria-label="Requested Priority"
                className="form-select form-select-sm form-select-zen"
                value={selectedReqPriority}
                onChange={(e) => {
                  setSelectedReqPriority(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="ALL">All Priorities</option>
                <option value="LOW">LOW</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="HIGH">HIGH</option>
              </select>
            </div>

            {/* IT Priority dropdown (Point 1: FR-08, Section 10.3, AC-10, UI-14) */}
            <div className="col-12 col-md-4 col-lg">
              <label htmlFor="filter-it-priority" className="form-label small fw-semibold mb-1">
                IT Priority
              </label>
              <select
                id="filter-it-priority"
                aria-label="IT Priority"
                className="form-select form-select-sm form-select-zen"
                value={selectedItPriority}
                onChange={(e) => {
                  setSelectedItPriority(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="ALL">All IT Priorities</option>
                <option value="LOW">LOW</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="HIGH">HIGH</option>
              </select>
            </div>

            {/* Status dropdown */}
            <div className="col-12 col-md-4 col-lg">
              <label htmlFor="filter-status" className="form-label small fw-semibold mb-1">
                Status
              </label>
              <select
                id="filter-status"
                aria-label="Status"
                className="form-select form-select-sm form-select-zen"
                value={selectedStatus}
                onChange={(e) => {
                  setSelectedStatus(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="ALL">All Statuses</option>
                <option value="NEW">NEW</option>
                <option value="IN_PROGRESS">IN_PROGRESS</option>
                <option value="RESOLVED">RESOLVED</option>
              </select>
            </div>

            {/* Clear Filters Button */}
            <div className="col-12 col-md-4 col-lg-auto d-grid">
              <button
                type="button"
                className="btn btn-sm btn-secondary-zen"
                onClick={handleClearFilters}
              >
                Clear Filters
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <div className="card card-zen p-5 text-center" role="status" aria-live="polite">
          <div className="spinner-border text-success mx-auto mb-3" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <div className="text-muted small">Loading your tickets...</div>
        </div>
      ) : tickets.length === 0 ? (
        // Empty State vs. No-Results State (BR-13, UI-05)
        hasActiveFilter ? (
          // No-Results State: 🔍 icon + "No tickets match your filters" + Clear Filters button
          <div className="card card-zen p-5 text-center">
            <div style={{ fontSize: "3rem" }} className="mb-2">
              🔍
            </div>
            <h5 className="fw-bold mb-2">No tickets match your filters</h5>
            <p className="text-muted small mb-4" style={{ maxWidth: 400, margin: "0 auto" }}>
              Try adjusting your search terms or clearing your filters to see more tickets.
            </p>
            <div>
              <button className="btn btn-secondary-zen btn-sm" onClick={handleClearFilters}>
                Clear Filters
              </button>
            </div>
          </div>
        ) : (
          // Empty State: 📄 icon + "No tickets submitted yet" + Create First Ticket button
          <div className="card card-zen p-5 text-center">
            <div style={{ fontSize: "3rem" }} className="mb-2">
              📄
            </div>
            <h5 className="fw-bold mb-2">No tickets submitted yet</h5>
            <p className="text-muted small mb-4" style={{ maxWidth: 400, margin: "0 auto" }}>
              You haven't submitted any support requests yet. Click below to create your first ticket.
            </p>
            <div>
              {onNavigateToCreate && (
                <button className="btn btn-primary-zen btn-sm" onClick={onNavigateToCreate}>
                  Create First Ticket
                </button>
              )}
            </div>
          </div>
        )
      ) : (
        <>
          {/* Desktop Table View (≥ 992px) per ui-spec.md Section 10.3 */}
          <div className="d-none d-lg-block card card-zen overflow-hidden mb-3">
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light text-muted small">
                  <tr>
                    <th scope="col">
                      <button
                        type="button"
                        className="btn btn-link btn-sm text-decoration-none text-muted p-0 fw-semibold"
                        onClick={() => handleSort("ticketNo")}
                      >
                        Ticket No. {sortBy === "ticketNo" && (sortOrder === "asc" ? "▲" : "▼")}
                      </button>
                    </th>
                    <th scope="col">
                      <button
                        type="button"
                        className="btn btn-link btn-sm text-decoration-none text-muted p-0 fw-semibold"
                        onClick={() => handleSort("createdAt")}
                      >
                        Created Date {sortBy === "createdAt" && (sortOrder === "asc" ? "▲" : "▼")}
                      </button>
                    </th>
                    <th scope="col" style={{ minWidth: 200 }}>
                      Summary
                    </th>
                    <th scope="col">Category</th>
                    <th scope="col">
                      <button
                        type="button"
                        className="btn btn-link btn-sm text-decoration-none text-muted p-0 fw-semibold"
                        onClick={() => handleSort("requestedPriority")}
                      >
                        Requested Priority {sortBy === "requestedPriority" && (sortOrder === "asc" ? "▲" : "▼")}
                      </button>
                    </th>
                    <th scope="col">
                      <button
                        type="button"
                        className="btn btn-link btn-sm text-decoration-none text-muted p-0 fw-semibold"
                        onClick={() => handleSort("itPriority")}
                      >
                        IT Priority {sortBy === "itPriority" && (sortOrder === "asc" ? "▲" : "▼")}
                      </button>
                    </th>
                    <th scope="col">
                      <button
                        type="button"
                        className="btn btn-link btn-sm text-decoration-none text-muted p-0 fw-semibold"
                        onClick={() => handleSort("currentStatus")}
                      >
                        Current Status {sortBy === "currentStatus" && (sortOrder === "asc" ? "▲" : "▼")}
                      </button>
                    </th>
                    <th scope="col">Ticket Owner</th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map((t) => (
                    <tr
                      key={t.id}
                      onClick={() => onSelectTicket?.(t.id)}
                      style={{ cursor: onSelectTicket ? "pointer" : "default" }}
                    >
                      <td className="font-monospace fw-bold text-success small">{t.ticketNo}</td>
                      <td className="text-muted small">
                        {new Date(t.createdAt).toLocaleDateString()}
                      </td>
                      <td className="text-dark small fw-medium">{t.summary}</td>
                      <td className="small text-muted">{t.categoryName}</td>
                      <td>{renderPriorityBadge(t.requestedPriority)}</td>
                      <td>{renderPriorityBadge(t.itPriority)}</td>
                      <td>{renderStatusBadge(t.currentStatus)}</td>
                      <td className="small text-muted">{t.ticketOwnerName}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile / Tablet Card View (< 992px) per ui-spec.md Section 10.3 (stacked vertically) */}
          <div className="d-block d-lg-none mb-3">
            {tickets.map((t) => (
              <div
                key={t.id}
                className="card card-zen p-3 mb-2"
                onClick={() => onSelectTicket?.(t.id)}
                style={{ cursor: onSelectTicket ? "pointer" : "default" }}
              >
                {/* Stacked vertically: Ticket No., status badge, Summary, Category, Created Date */}
                <div className="font-monospace fw-bold text-success small mb-1">
                  {t.ticketNo}
                </div>
                <div className="mb-2">
                  {renderStatusBadge(t.currentStatus)}
                </div>
                <div className="fw-semibold text-dark mb-1">
                  {t.summary}
                </div>
                <div className="text-muted small mb-1">
                  {t.categoryName}
                </div>
                <div className="text-muted small">
                  {new Date(t.createdAt).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>

          {/* Pagination Controls (BR-12, UI-14, Section 10.3: shows page numbers with Previous/Next) */}
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 pt-2">
            <div className="text-muted small">
              Showing page {pagination.currentPage} of {pagination.totalPages} ({pagination.totalItems} total tickets)
            </div>

            <div className="d-flex align-items-center gap-2">
              <label htmlFor="limit-select" className="text-muted small mb-0">
                Per page:
              </label>
              <select
                id="limit-select"
                className="form-select form-select-sm"
                style={{ width: "auto" }}
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
              >
                <option value={5}>5</option>
                <option value={8}>8</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
              </select>

              <div className="btn-group btn-group-sm" role="navigation" aria-label="Pagination Navigation">
                <button
                  className="btn btn-secondary-zen"
                  disabled={pagination.currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  aria-label="Previous page"
                >
                  Previous
                </button>
                {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((pageNum) => (
                  <button
                    key={pageNum}
                    type="button"
                    className={`btn ${pageNum === pagination.currentPage ? "btn-primary-zen" : "btn-secondary-zen"}`}
                    onClick={() => setCurrentPage(pageNum)}
                    aria-label={`Page ${pageNum}`}
                    aria-current={pageNum === pagination.currentPage ? "page" : undefined}
                  >
                    {pageNum}
                  </button>
                ))}
                <button
                  className="btn btn-secondary-zen"
                  disabled={pagination.currentPage >= pagination.totalPages}
                  onClick={() => setCurrentPage((p) => p + 1)}
                  aria-label="Next page"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
