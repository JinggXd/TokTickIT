import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  fetchCategories,
  fetchStaffTickets,
  fetchTicketOwners,
  Category,
  StaffTicketItem,
  TicketOwner,
} from "../api.js";
import { StatusBadge, PriorityBadge } from "../components/Badges.js";

interface StaffTicketQueueProps {
  onSelectTicket?: (ticketId: number) => void;
}

export const StaffTicketQueue: React.FC<StaffTicketQueueProps> = ({ onSelectTicket }) => {
  // Reference data
  const [categories, setCategories] = useState<Category[]>([]);
  const [ticketOwners, setTicketOwners] = useState<TicketOwner[]>([]);

  // Filter & Query state
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [selectedReqPriority, setSelectedReqPriority] = useState("ALL");
  const [selectedItPriority, setSelectedItPriority] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [selectedOwner, setSelectedOwner] = useState("ALL");
  const [sortBy, setSortBy] = useState("updatedAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Data & State
  const [tickets, setTickets] = useState<StaffTicketItem[]>([]);
  const [unfilteredTotal, setUnfilteredTotal] = useState(0);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 10,
    total: 0,
    totalPages: 1,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const activeRequestIdRef = useRef(0);

  // Load reference categories and owners
  useEffect(() => {
    let isMounted = true;
    Promise.all([
      fetchCategories().catch(() => [] as Category[]),
      fetchTicketOwners().catch(() => [] as TicketOwner[]),
    ]).then(([cats, owners]) => {
      if (isMounted) {
        setCategories(cats);
        setTicketOwners(owners);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // Debounce search input (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchTerm(searchInput);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Load tickets
  const loadTickets = useCallback(async () => {
    const requestId = ++activeRequestIdRef.current;
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetchStaffTickets({
        search: searchTerm || undefined,
        categoryId: selectedCategory !== "ALL" ? selectedCategory : undefined,
        requestedPriority: selectedReqPriority !== "ALL" ? selectedReqPriority : undefined,
        itPriority: selectedItPriority !== "ALL" ? selectedItPriority : undefined,
        status: selectedStatus !== "ALL" ? selectedStatus : undefined,
        owner: selectedOwner !== "ALL" ? selectedOwner : undefined,
        sortBy,
        sortOrder,
        page: currentPage,
        pageSize,
      });

      if (requestId !== activeRequestIdRef.current) return;

      setTickets(res.tickets || []);
      setUnfilteredTotal(res.unfilteredTotal || 0);
      setPagination(res.pagination);
    } catch (err: any) {
      if (requestId !== activeRequestIdRef.current) return;
      setTickets([]);
      setError(err.message || "Unable to load tickets. Please try again.");
    } finally {
      if (requestId === activeRequestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [
    searchTerm,
    selectedCategory,
    selectedReqPriority,
    selectedItPriority,
    selectedStatus,
    selectedOwner,
    sortBy,
    sortOrder,
    currentPage,
    pageSize,
  ]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setSearchInput("");
    setSearchTerm("");
    setSelectedCategory("ALL");
    setSelectedReqPriority("ALL");
    setSelectedItPriority("ALL");
    setSelectedStatus("ALL");
    setSelectedOwner("ALL");
    setCurrentPage(1);
  };

  const hasActiveFilters = Boolean(
    searchTerm.trim() !== "" ||
      selectedCategory !== "ALL" ||
      selectedReqPriority !== "ALL" ||
      selectedItPriority !== "ALL" ||
      selectedStatus !== "ALL" ||
      selectedOwner !== "ALL",
  );

  return (
    <div className="container py-4" data-testid="staff-ticket-queue-page">
      {/* Page Header */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-3">
        <div>
          <h1 className="h3 fw-bold text-dark mb-1">IT Staff Ticket Queue</h1>
          <p className="text-muted mb-0">Triage, manage, and assign support tickets across all departments.</p>
        </div>
      </div>

      {/* Filter Toolbar Card */}
      <div className="card shadow-sm border-0 mb-4" style={{ backgroundColor: "#F8FAF8" }}>
        <div className="card-body p-3">
          <div className="row g-2 align-items-end">
            {/* Search Box */}
            <div className="col-12 col-md-4">
              <label htmlFor="queue-search-input" className="form-label small fw-semibold text-muted mb-1">
                Search
              </label>
              <div className="input-group">
                <input
                  id="queue-search-input"
                  data-testid="queue-search-input"
                  type="text"
                  className="form-control"
                  placeholder="Search by Ticket # or summary..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                />
                {searchInput && (
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    data-testid="queue-clear-search-btn"
                    onClick={() => setSearchInput("")}
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Category Filter */}
            <div className="col-6 col-md-2">
              <label htmlFor="queue-category-filter" className="form-label small fw-semibold text-muted mb-1">
                Category
              </label>
              <select
                id="queue-category-filter"
                data-testid="queue-category-filter"
                className="form-select form-select-sm"
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

            {/* IT Priority Filter */}
            <div className="col-6 col-md-2">
              <label htmlFor="queue-it-priority-filter" className="form-label small fw-semibold text-muted mb-1">
                IT Priority
              </label>
              <select
                id="queue-it-priority-filter"
                data-testid="queue-it-priority-filter"
                className="form-select form-select-sm"
                value={selectedItPriority}
                onChange={(e) => {
                  setSelectedItPriority(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="ALL">All IT Priorities</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
            </div>

            {/* Status Filter */}
            <div className="col-6 col-md-2">
              <label htmlFor="queue-status-filter" className="form-label small fw-semibold text-muted mb-1">
                Status
              </label>
              <select
                id="queue-status-filter"
                data-testid="queue-status-filter"
                className="form-select form-select-sm"
                value={selectedStatus}
                onChange={(e) => {
                  setSelectedStatus(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="ALL">All Statuses</option>
                <option value="NEW">New</option>
                <option value="OPEN">Open</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="WAITING_FOR_REQUESTER">Waiting for Requester</option>
                <option value="RESOLVED">Resolved</option>
                <option value="CLOSED">Closed</option>
                <option value="REOPENED">Reopened</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>

            {/* Owner Filter */}
            <div className="col-6 col-md-2">
              <label htmlFor="queue-owner-filter" className="form-label small fw-semibold text-muted mb-1">
                Owner
              </label>
              <select
                id="queue-owner-filter"
                data-testid="queue-owner-filter"
                className="form-select form-select-sm"
                value={selectedOwner}
                onChange={(e) => {
                  setSelectedOwner(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="ALL">All Owners</option>
                <option value="me">My Tickets</option>
                <option value="unassigned">Unassigned</option>
                {ticketOwners.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Clear Filters Button */}
            {hasActiveFilters && (
              <div className="col-12 text-end mt-2">
                <button
                  type="button"
                  data-testid="queue-clear-filters-btn"
                  className="btn btn-sm btn-outline-secondary"
                  onClick={handleClearFilters}
                >
                  Clear Filters
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* States: Loading, Error, Empty, No-Results, Table */}
      {isLoading && (
        <div className="card shadow-sm p-5 text-center" data-testid="staff-queue-loading">
          <div className="spinner-border text-success mx-auto mb-3" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="text-muted mb-0">Loading queue tickets...</p>
        </div>
      )}

      {!isLoading && error && (
        <div className="alert alert-danger shadow-sm d-flex justify-content-between align-items-center" data-testid="staff-queue-error">
          <div>
            <strong className="d-block">Error loading queue:</strong>
            <span>{error}</span>
          </div>
          <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => loadTickets()}>
            Retry
          </button>
        </div>
      )}

      {!isLoading && !error && tickets.length === 0 && (
        <>
          {hasActiveFilters ? (
            <div className="card shadow-sm p-5 text-center" data-testid="staff-queue-no-results">
              <div className="display-6 text-muted mb-2">🔍</div>
              <h5 className="fw-bold">No tickets match your filters</h5>
              <p className="text-muted mb-3">Try adjusting or clearing your search term or filter criteria.</p>
              <div>
                <button type="button" className="btn btn-outline-secondary" onClick={handleClearFilters}>
                  Clear All Filters
                </button>
              </div>
            </div>
          ) : (
            <div className="card shadow-sm p-5 text-center" data-testid="staff-queue-empty">
              <div className="display-6 text-muted mb-2">📥</div>
              <h5 className="fw-bold">No tickets in the queue</h5>
              <p className="text-muted mb-0">There are currently no tickets submitted to the system.</p>
            </div>
          )}
        </>
      )}

      {!isLoading && !error && tickets.length > 0 && (
        <div className="card shadow-sm border-0">
          {/* Desktop/Tablet Table */}
          <div className="table-responsive d-none d-md-block">
            <table className="table table-hover align-middle mb-0" data-testid="staff-queue-table">
              <thead className="table-light">
                <tr>
                  <th scope="col" style={{ cursor: "pointer" }} onClick={() => handleSort("ticketNo")}>
                    Ticket No. {sortBy === "ticketNo" && (sortOrder === "asc" ? "▲" : "▼")}
                  </th>
                  <th scope="col" style={{ cursor: "pointer" }} onClick={() => handleSort("createdAt")}>
                    Created {sortBy === "createdAt" && (sortOrder === "asc" ? "▲" : "▼")}
                  </th>
                  <th scope="col">Summary</th>
                  <th scope="col">Requester</th>
                  <th scope="col">Category</th>
                  <th scope="col">Requested Priority</th>
                  <th scope="col" style={{ cursor: "pointer" }} onClick={() => handleSort("itPriority")}>
                    IT Priority {sortBy === "itPriority" && (sortOrder === "asc" ? "▲" : "▼")}
                  </th>
                  <th scope="col" style={{ cursor: "pointer" }} onClick={() => handleSort("currentStatus")}>
                    Status {sortBy === "currentStatus" && (sortOrder === "asc" ? "▲" : "▼")}
                  </th>
                  <th scope="col">Owner</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((t) => (
                  <tr
                    key={t.id}
                    style={{ cursor: "pointer" }}
                    onClick={() => onSelectTicket && onSelectTicket(t.id)}
                    data-testid={`queue-row-${t.id}`}
                  >
                    <td>
                      <span className="fw-bold text-success font-monospace">{t.ticketNo}</span>
                    </td>
                    <td className="small text-muted">{new Date(t.createdAt).toLocaleDateString()}</td>
                    <td className="fw-medium text-dark">{t.summary}</td>
                    <td className="small">{t.requester.name}</td>
                    <td className="small text-muted">{t.category.name}</td>
                    <td>
                      <PriorityBadge priority={t.requestedPriority} />
                    </td>
                    <td>
                      <PriorityBadge priority={t.itPriority} />
                    </td>
                    <td>
                      <StatusBadge status={t.currentStatus} />
                    </td>
                    <td className="small">
                      {t.ticketOwner ? (
                        <span className="fw-medium text-dark">{t.ticketOwner.name}</span>
                      ) : (
                        <span className="badge bg-light text-secondary border">Unassigned</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List */}
          <div className="d-md-none p-2" data-testid="staff-queue-mobile-cards">
            {tickets.map((t) => (
              <div
                key={t.id}
                className="card mb-2 p-3 shadow-sm"
                style={{ cursor: "pointer" }}
                onClick={() => onSelectTicket && onSelectTicket(t.id)}
                data-testid={`queue-mobile-card-${t.id}`}
              >
                <div className="d-flex justify-content-between align-items-start mb-2">
                  <span className="fw-bold text-success font-monospace">{t.ticketNo}</span>
                  <StatusBadge status={t.currentStatus} />
                </div>
                <h6 className="fw-bold mb-1 text-dark">{t.summary}</h6>
                <div className="small text-muted mb-2">
                  <span>👤 {t.requester.name}</span> • <span>📁 {t.category.name}</span>
                </div>
                <div className="d-flex justify-content-between align-items-center pt-2 border-top">
                  <div className="d-flex gap-1">
                    <span className="small text-muted me-1">IT Priority:</span>
                    <PriorityBadge priority={t.itPriority} />
                  </div>
                  <div className="small">
                    {t.ticketOwner ? (
                      <span className="fw-medium text-dark">{t.ticketOwner.name}</span>
                    ) : (
                      <span className="badge bg-light text-secondary border">Unassigned</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination Footer */}
          <div className="card-footer bg-white border-0 d-flex flex-wrap justify-content-between align-items-center py-3">
            <div className="d-flex align-items-center gap-2 mb-2 mb-md-0">
              <span className="small text-muted">Showing page</span>
              <span className="small fw-bold">{pagination.page}</span>
              <span className="small text-muted">of {pagination.totalPages} ({pagination.total} total)</span>
              <span className="ms-3 small text-muted">Per page:</span>
              <select
                className="form-select form-select-sm"
                style={{ width: "auto" }}
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>

            <div className="btn-group btn-group-sm">
              <button
                type="button"
                className="btn btn-outline-secondary"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </button>
              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                .filter((p) => Math.abs(p - currentPage) <= 2 || p === 1 || p === pagination.totalPages)
                .map((p, idx, arr) => (
                  <React.Fragment key={p}>
                    {idx > 0 && arr[idx - 1] !== p - 1 && (
                      <button type="button" className="btn btn-outline-secondary" disabled>
                        ...
                      </button>
                    )}
                    <button
                      type="button"
                      className={`btn ${p === currentPage ? "btn-success" : "btn-outline-secondary"}`}
                      onClick={() => setCurrentPage(p)}
                    >
                      {p}
                    </button>
                  </React.Fragment>
                ))}
              <button
                type="button"
                className="btn btn-outline-secondary"
                disabled={currentPage >= pagination.totalPages}
                onClick={() => setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
