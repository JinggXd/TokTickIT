import React, { useCallback, useEffect, useState } from "react";
import { RequesterProvider, useRequester } from "./context/RequesterContext.js";
import { AppShell } from "./components/AppShell.js";
import { RequesterSelection } from "./pages/RequesterSelection.js";
import { CreateTicket } from "./pages/CreateTicket.js";
import { MyTickets } from "./pages/MyTickets.js";
import { RequesterTicketDetail } from "./pages/RequesterTicketDetail.js";
import { RouteGuard } from "./components/RouteGuard.js";

type TabType = "my-tickets" | "create-ticket" | "select-requester" | "ticket-detail";

const TAB_PATHS: Record<TabType, string> = {
  "my-tickets": "/my-tickets",
  "create-ticket": "/create-ticket",
  "select-requester": "/select-requester",
  "ticket-detail": "/tickets",
};

function getRouteFromPath(pathname = window.location.pathname): { tab: TabType; ticketId: number | null } {
  if (pathname === TAB_PATHS["create-ticket"]) return { tab: "create-ticket", ticketId: null };
  if (pathname === TAB_PATHS["select-requester"]) return { tab: "select-requester", ticketId: null };
  const match = pathname.match(/^\/tickets\/(\d+)$/);
  if (match) {
    return { tab: "ticket-detail", ticketId: parseInt(match[1], 10) };
  }
  return { tab: "my-tickets", ticketId: null };
}

function MainContent() {
  const { currentRequester, isLoading } = useRequester();
  const [{ tab: activeTab, ticketId: selectedTicketId }, setRoute] = useState(() => getRouteFromPath());

  const navigate = useCallback((tab: TabType, replace = false, ticketId: number | null = null) => {
    let nextPath = TAB_PATHS[tab];
    if (tab === "ticket-detail" && ticketId) {
      nextPath = `/tickets/${ticketId}`;
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

  useEffect(() => {
    if (!isLoading && !currentRequester && activeTab !== "select-requester") {
      navigate("select-requester", true);
    }
  }, [activeTab, currentRequester, isLoading, navigate]);

  const currentView = !isLoading && !currentRequester ? "select-requester" : activeTab;

  return (
    <AppShell
      currentTab={currentView === "ticket-detail" ? "my-tickets" : currentView}
      onTabChange={(t) => navigate(t)}
    >
      {currentView === "select-requester" && (
        <RequesterSelection onSuccess={() => navigate("my-tickets")} />
      )}

      {currentView === "my-tickets" && (
        <RouteGuard>
          <MyTickets
            onNavigateToCreate={() => navigate("create-ticket")}
            onSelectTicket={(id) => navigate("ticket-detail", false, id)}
          />
        </RouteGuard>
      )}

      {currentView === "create-ticket" && (
        <RouteGuard>
          <CreateTicket
            onSuccess={() => {
              // Option to stay on success screen or navigate
            }}
            onCancel={() => navigate("my-tickets")}
          />
        </RouteGuard>
      )}

      {currentView === "ticket-detail" && selectedTicketId && currentRequester && (
        <RouteGuard>
          <RequesterTicketDetail
            ticketId={selectedTicketId}
            requesterId={currentRequester.id}
            requesterName={currentRequester.name}
            onBack={() => navigate("my-tickets")}
          />
        </RouteGuard>
      )}
    </AppShell>
  );
}

export default function App() {
  return (
    <RequesterProvider>
      <MainContent />
    </RequesterProvider>
  );
}
