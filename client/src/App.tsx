import React, { useCallback, useEffect, useState } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext.js";
import { RequesterProvider } from "./context/RequesterContext.js";
import { AppShell } from "./components/AppShell.js";
import { Login } from "./pages/Login.js";
import { ChangePassword } from "./pages/ChangePassword.js";
import { CreateTicket } from "./pages/CreateTicket.js";
import { MyTickets } from "./pages/MyTickets.js";
import { RequesterTicketDetail } from "./pages/RequesterTicketDetail.js";
import { StaffTicketQueue } from "./pages/StaffTicketQueue.js";
import { StaffTicketDetail } from "./pages/StaffTicketDetail.js";
import { UserManagement } from "./pages/UserManagement.js";

type TabType =
  | "login"
  | "change-password"
  | "my-tickets"
  | "create-ticket"
  | "ticket-detail"
  | "staff-queue"
  | "staff-ticket-detail"
  | "admin-ticket-detail"
  | "admin-users";

const TAB_PATHS: Record<TabType, string> = {
  login: "/login",
  "change-password": "/change-password",
  "my-tickets": "/my-tickets",
  "create-ticket": "/create-ticket",
  "ticket-detail": "/tickets",
  "staff-queue": "/staff/queue",
  "staff-ticket-detail": "/staff/tickets",
  "admin-ticket-detail": "/admin/tickets",
  "admin-users": "/admin/users",
};

function getRouteFromPath(pathname = window.location.pathname): { tab: TabType; ticketId: number | null } {
  if (pathname === "/login") return { tab: "login", ticketId: null };
  if (pathname === "/change-password") return { tab: "change-password", ticketId: null };
  if (pathname === "/create-ticket") return { tab: "create-ticket", ticketId: null };
  if (pathname === "/staff/queue") return { tab: "staff-queue", ticketId: null };
  if (pathname === "/admin/users") return { tab: "admin-users", ticketId: null };
  const adminMatch = pathname.match(/^\/admin\/tickets\/(\d+)$/);
  if (adminMatch) {
    return { tab: "admin-ticket-detail", ticketId: parseInt(adminMatch[1], 10) };
  }
  const staffMatch = pathname.match(/^\/staff\/tickets\/(\d+)$/);
  if (staffMatch) {
    return { tab: "staff-ticket-detail", ticketId: parseInt(staffMatch[1], 10) };
  }
  const match = pathname.match(/^\/tickets\/(\d+)$/);
  if (match) {
    return { tab: "ticket-detail", ticketId: parseInt(match[1], 10) };
  }
  return { tab: "my-tickets", ticketId: null };
}

function MainContent() {
  const { user, isLoading: authLoading } = useAuth();
  const [{ tab: activeTab, ticketId: selectedTicketId }, setRoute] = useState(() => getRouteFromPath());

  const navigate = useCallback((tab: TabType, replace = false, ticketId: number | null = null) => {
    let nextPath = TAB_PATHS[tab] || "/";
    if (tab === "ticket-detail" && ticketId) {
      nextPath = `/tickets/${ticketId}`;
    }
    if (tab === "staff-ticket-detail" && ticketId) {
      nextPath = `/staff/tickets/${ticketId}`;
    }
    if (tab === "admin-ticket-detail" && ticketId) {
      nextPath = `/admin/tickets/${ticketId}`;
    }
    if (window.location.pathname !== nextPath) {
      window.history[replace ? "replaceState" : "pushState"]({}, "", nextPath);
    }
    setRoute({ tab, ticketId });
  }, []);

  useEffect(() => {
    const handlePopState = () => setRoute(getRouteFromPath());
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // AC-13: In Lab 3, authentication is strictly session-based.
  // When user is unauthenticated or session is lost, effectiveUser is null.
  const effectiveUser = user;

  if (authLoading) {
    return (
      <div
        className="min-vh-100 d-flex flex-column align-items-center justify-content-center"
        style={{ backgroundColor: "var(--zg-canvas)" }}
        data-testid="app-loading"
      >
        <div className="spinner-border text-success mb-3" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="text-muted small">Loading TokTickIT...</p>
      </div>
    );
  }

  // Not logged in -> Show Login
  if (!effectiveUser) {
    return (
      <Login
        onSuccess={(role, mustChange) => {
          if (mustChange) {
            navigate("change-password", true);
          } else if (role === "REQUESTER") {
            navigate("my-tickets", true);
          } else if (role === "IT_STAFF") {
            navigate("staff-queue", true);
          } else if (role === "ADMINISTRATOR") {
            navigate("admin-users", true);
          } else {
            navigate("my-tickets", true);
          }
        }}
      />
    );
  }

  // Mandatory password change guard
  if (effectiveUser.mustChangePassword) {
    return (
      <ChangePassword
        onSuccess={() => {
          if (effectiveUser.role === "REQUESTER") {
            navigate("my-tickets", true);
          } else if (effectiveUser.role === "IT_STAFF") {
            navigate("staff-queue", true);
          } else if (effectiveUser.role === "ADMINISTRATOR") {
            navigate("admin-users", true);
          }
        }}
      />
    );
  }

  // Voluntary change password view
  if (activeTab === "change-password") {
    return (
      <AppShell currentTab="change-password" onTabChange={(t) => navigate(t as TabType)}>
        <ChangePassword
          onSuccess={() => {
            if (effectiveUser.role === "REQUESTER") navigate("my-tickets");
            else if (effectiveUser.role === "IT_STAFF") navigate("staff-queue");
            else navigate("admin-users");
          }}
          onCancel={() => {
            if (effectiveUser.role === "REQUESTER") navigate("my-tickets");
            else if (effectiveUser.role === "IT_STAFF") navigate("staff-queue");
            else navigate("admin-users");
          }}
        />
      </AppShell>
    );
  }

  return (
    <AppShell currentTab={activeTab} onTabChange={(t) => navigate(t as TabType)}>
      {/* Requester Views (AC-13: Authenticated Requester navigates directly without dev selector) */}
      {effectiveUser.role === "REQUESTER" && (
        <>
          {activeTab === "my-tickets" && (
            <MyTickets
              onNavigateToCreate={() => navigate("create-ticket")}
              onSelectTicket={(id) => navigate("ticket-detail", false, id)}
            />
          )}

          {activeTab === "create-ticket" && (
            <CreateTicket
              onSuccess={() => navigate("my-tickets")}
              onCancel={() => navigate("my-tickets")}
            />
          )}

          {activeTab === "ticket-detail" && selectedTicketId && (
            <RequesterTicketDetail
              ticketId={selectedTicketId}
              requesterId={effectiveUser.id}
              requesterName={effectiveUser.name}
              onBack={() => navigate("my-tickets")}
            />
          )}
        </>
      )}

      {/* IT Staff Views */}
      {effectiveUser.role === "IT_STAFF" && (
        <>
          {(activeTab === "staff-queue" || activeTab === "my-tickets") && (
            <StaffTicketQueue
              onSelectTicket={(id) => navigate("staff-ticket-detail", false, id)}
            />
          )}

          {activeTab === "staff-ticket-detail" && selectedTicketId && (
            <StaffTicketDetail
              ticketId={selectedTicketId}
              onBack={() => navigate("staff-queue")}
            />
          )}
        </>
      )}

      {/* Administrator Views (User Management in F4 + Read-only ticket detail) */}
      {effectiveUser.role === "ADMINISTRATOR" && (
        <>
          {(activeTab === "admin-ticket-detail" || activeTab === "staff-ticket-detail") && selectedTicketId ? (
            <StaffTicketDetail
              ticketId={selectedTicketId}
              onBack={() => navigate("admin-users")}
              readOnly={true}
            />
          ) : (
            <UserManagement />
          )}
        </>
      )}
    </AppShell>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <RequesterProvider>
        <MainContent />
      </RequesterProvider>
    </AuthProvider>
  );
}
