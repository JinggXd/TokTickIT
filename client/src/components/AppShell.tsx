import React from "react";
import { useAuth } from "../context/AuthContext.js";
import { useRequester } from "../context/RequesterContext.js";
import type { Role } from "../types.js";

interface AppShellProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  children: React.ReactNode;
}

const ROLE_BADGES: Record<Role, { text: string; bg: string; label: string }> = {
  REQUESTER: { text: "#0369A1", bg: "#E0F2FE", label: "Requester" },
  IT_STAFF: { text: "#15803D", bg: "#DCFCE7", label: "IT Staff" },
  ADMINISTRATOR: { text: "#475569", bg: "#F1F5F9", label: "Administrator" },
};

export const AppShell: React.FC<AppShellProps> = ({
  currentTab,
  onTabChange,
  children,
}) => {
  const { user, logout } = useAuth();
  const { currentRequester, clearRequester } = useRequester();

  const roleInfo = user ? ROLE_BADGES[user.role] || ROLE_BADGES.REQUESTER : null;

  const handleSignOut = async () => {
    await logout();
    onTabChange("login");
  };

  const isRequesterNav = (user && user.role === "REQUESTER") || (!user && !!currentRequester);

  return (
    <div className="min-vh-100 d-flex flex-column" style={{ backgroundColor: "var(--zg-canvas)" }}>
      {/* Zen Green Navigation Header */}
      <header className="navbar navbar-zen px-3 px-md-4 py-2 sticky-top shadow-sm flex-column align-items-stretch" style={{ backgroundColor: "var(--zg-primary)" }}>
        <div className="container-fluid d-flex justify-content-between align-items-center p-0">
          {/* Brand Logo & Desktop Navigation */}
          <div className="d-flex align-items-center gap-3">
            <span
              className="navbar-brand d-flex align-items-center gap-2 mb-0 text-white cursor-pointer text-decoration-none"
              style={{ cursor: "pointer" }}
              onClick={() => {
                if (user?.role === "REQUESTER" || (!user && currentRequester)) onTabChange("my-tickets");
                else if (user?.role === "IT_STAFF") onTabChange("staff-queue");
                else if (user?.role === "ADMINISTRATOR") onTabChange("admin-users");
              }}
              data-testid="app-brand"
            >
              <span style={{ fontSize: "1.3rem" }}>🎫</span>
              <span className="fw-bold">TokTickIT</span>
            </span>

            {/* Desktop navigation links based on Role */}
            {(user || currentRequester) && (
              <nav className="d-none d-md-flex gap-2 ms-3">
                {isRequesterNav && (
                  <>
                    <button
                      className={`btn btn-sm text-white ${currentTab === "my-tickets" ? "active fw-bold bg-white bg-opacity-25" : ""}`}
                      onClick={() => onTabChange("my-tickets")}
                      data-testid="nav-my-tickets"
                    >
                      📋 My Tickets
                    </button>
                    <button
                      className={`btn btn-sm text-white ${currentTab === "create-ticket" ? "active fw-bold bg-white bg-opacity-25" : ""}`}
                      onClick={() => onTabChange("create-ticket")}
                      data-testid="nav-create-ticket"
                    >
                      ➕ Create Ticket
                    </button>
                  </>
                )}

                {user?.role === "IT_STAFF" && (
                  <button
                    className={`btn btn-sm text-white ${currentTab === "staff-queue" ? "active fw-bold bg-white bg-opacity-25" : ""}`}
                    onClick={() => onTabChange("staff-queue")}
                    data-testid="nav-staff-queue"
                  >
                    📥 Ticket Queue
                  </button>
                )}

                {user?.role === "ADMINISTRATOR" && (
                  <button
                    className={`btn btn-sm text-white ${currentTab === "admin-users" ? "active fw-bold bg-white bg-opacity-25" : ""}`}
                    onClick={() => onTabChange("admin-users")}
                    data-testid="nav-admin-users"
                  >
                    👥 User Management
                  </button>
                )}
              </nav>
            )}
          </div>

          {/* Right-side User Profile & Actions */}
          <div className="d-flex align-items-center gap-2">
            {user && roleInfo ? (
              <div className="d-flex align-items-center gap-2" data-testid="user-profile-badge">
                <div
                  className="d-flex align-items-center gap-2 px-2 py-1 rounded"
                  style={{
                    backgroundColor: "rgba(255, 255, 255, 0.15)",
                    color: "#FFFFFF",
                  }}
                >
                  <span>👤</span>
                  <span className="fw-semibold text-truncate" style={{ maxWidth: "150px" }} data-testid="user-profile-name">
                    {user.name}
                  </span>
                  <span
                    className="badge rounded-pill px-2 py-1"
                    style={{
                      backgroundColor: roleInfo.bg,
                      color: roleInfo.text,
                      fontSize: "0.75rem",
                    }}
                    data-testid="user-role-badge"
                  >
                    {roleInfo.label}
                  </span>
                </div>

                <button
                  type="button"
                  className="btn btn-sm btn-outline-light py-1 px-2"
                  style={{ fontSize: "0.8rem", borderRadius: "4px" }}
                  onClick={() => onTabChange("change-password")}
                  data-testid="nav-change-password-button"
                  title="Change Password"
                >
                  Password
                </button>

                <button
                  type="button"
                  className="btn btn-sm btn-light py-1 px-2 text-danger fw-semibold"
                  style={{ fontSize: "0.8rem", borderRadius: "4px" }}
                  onClick={handleSignOut}
                  data-testid="sign-out-button"
                  title="Sign out of your account"
                >
                  Sign Out
                </button>
              </div>
            ) : currentRequester ? (
              <div className="d-flex align-items-center gap-2" data-testid="user-profile-badge">
                <span className="text-white small d-flex align-items-center gap-1">
                  <span>👤</span>
                  <span>{currentRequester.name}</span>
                </span>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-light py-1 px-2"
                  onClick={() => {
                    clearRequester();
                    onTabChange("select-requester");
                  }}
                >
                  Change
                </button>
              </div>
            ) : null}
          </div>
        </div>

        {/* Mobile navigation bar */}
        {user && (
          <nav
            className="d-flex d-md-none overflow-x-auto text-nowrap gap-2 pt-2 pb-1 w-100"
            style={{ minHeight: "44px" }}
          >
            {user.role === "REQUESTER" && (
              <>
                <button
                  className={`btn btn-sm text-white ${currentTab === "my-tickets" ? "fw-bold bg-white bg-opacity-25" : ""}`}
                  onClick={() => onTabChange("my-tickets")}
                  data-testid="nav-my-tickets-mobile"
                  style={{ minHeight: "44px", padding: "10px 16px", display: "inline-flex", alignItems: "center" }}
                >
                  📋 My Tickets
                </button>
                <button
                  className={`btn btn-sm text-white ${currentTab === "create-ticket" ? "fw-bold bg-white bg-opacity-25" : ""}`}
                  onClick={() => onTabChange("create-ticket")}
                  data-testid="nav-create-ticket-mobile"
                  style={{ minHeight: "44px", padding: "10px 16px", display: "inline-flex", alignItems: "center" }}
                >
                  ➕ Create Ticket
                </button>
              </>
            )}

            {user.role === "IT_STAFF" && (
              <button
                className={`btn btn-sm text-white ${currentTab === "staff-queue" ? "fw-bold bg-white bg-opacity-25" : ""}`}
                onClick={() => onTabChange("staff-queue")}
                data-testid="nav-staff-queue-mobile"
                style={{ minHeight: "44px", padding: "10px 16px", display: "inline-flex", alignItems: "center" }}
              >
                📥 Ticket Queue
              </button>
            )}

            {user.role === "ADMINISTRATOR" && (
              <button
                className={`btn btn-sm text-white ${currentTab === "admin-users" ? "fw-bold bg-white bg-opacity-25" : ""}`}
                onClick={() => onTabChange("admin-users")}
                data-testid="nav-admin-users-mobile"
                style={{ minHeight: "44px", padding: "10px 16px", display: "inline-flex", alignItems: "center" }}
              >
                👥 User Management
              </button>
            )}
          </nav>
        )}
      </header>

      {/* Main Content Area */}
      <main className="flex-grow-1 py-4">{children}</main>

      {/* Footer */}
      <footer className="py-3 text-center text-muted small border-top" style={{ backgroundColor: "var(--zg-surface)" }}>
        TokTickIT • CPE 334 Lab 3
      </footer>
    </div>
  );
};
export default AppShell;
