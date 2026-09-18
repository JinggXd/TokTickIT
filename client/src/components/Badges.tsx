import React from "react";
import { TicketStatus, Priority, Role } from "../types.js";

interface BadgeProps {
  className?: string;
}

export const StatusBadge: React.FC<{ status: TicketStatus | string } & BadgeProps> = ({
  status,
  className = "",
}) => {
  switch (status) {
    case "NEW":
      return (
        <span
          className={`badge fw-medium px-2 py-1 ${className}`}
          style={{ backgroundColor: "#E0F2FE", color: "#0369A1" }}
        >
          🔵 New
        </span>
      );
    case "OPEN":
      return (
        <span
          className={`badge fw-medium px-2 py-1 ${className}`}
          style={{ backgroundColor: "#E0F2FE", color: "#0369A1" }}
        >
          🔵 Open
        </span>
      );
    case "IN_PROGRESS":
      return (
        <span
          className={`badge fw-medium px-2 py-1 ${className}`}
          style={{ backgroundColor: "#FEF3C7", color: "#92400E" }}
        >
          🟡 In Progress
        </span>
      );
    case "WAITING_FOR_REQUESTER":
      return (
        <span
          className={`badge fw-medium px-2 py-1 ${className}`}
          style={{ backgroundColor: "#FEF3C7", color: "#92400E" }}
        >
          🟡 Waiting for Requester
        </span>
      );
    case "RESOLVED":
      return (
        <span
          className={`badge fw-medium px-2 py-1 ${className}`}
          style={{ backgroundColor: "#DCFCE7", color: "#15803D" }}
        >
          🟢 Resolved
        </span>
      );
    case "CLOSED":
      return (
        <span
          className={`badge fw-medium px-2 py-1 ${className}`}
          style={{ backgroundColor: "#F1F5F9", color: "#475569" }}
        >
          ⚫ Closed
        </span>
      );
    case "REOPENED":
      return (
        <span
          className={`badge fw-medium px-2 py-1 ${className}`}
          style={{ backgroundColor: "#FEE2E2", color: "#B91C1C" }}
        >
          🔴 Reopened
        </span>
      );
    case "CANCELLED":
      return (
        <span
          className={`badge fw-medium px-2 py-1 ${className}`}
          style={{ backgroundColor: "#F1F5F9", color: "#475569" }}
        >
          ⚪ Cancelled
        </span>
      );
    default:
      return <span className={`badge bg-secondary px-2 py-1 ${className}`}>{status}</span>;
  }
};

export const PriorityBadge: React.FC<{ priority: Priority | string } & BadgeProps> = ({
  priority,
  className = "",
}) => {
  switch (priority) {
    case "HIGH":
      return (
        <span
          className={`badge fw-semibold px-2 py-1 ${className}`}
          style={{ backgroundColor: "#FEE2E2", color: "#B91C1C" }}
        >
          High
        </span>
      );
    case "MEDIUM":
      return (
        <span
          className={`badge fw-semibold px-2 py-1 ${className}`}
          style={{ backgroundColor: "#FEF3C7", color: "#B45309" }}
        >
          Medium
        </span>
      );
    case "LOW":
      return (
        <span
          className={`badge fw-semibold px-2 py-1 ${className}`}
          style={{ backgroundColor: "#F1F5F9", color: "#475569" }}
        >
          Low
        </span>
      );
    default:
      return <span className={`badge bg-light text-dark px-2 py-1 ${className}`}>{priority}</span>;
  }
};

export const RoleBadge: React.FC<{ role: Role | string } & BadgeProps> = ({
  role,
  className = "",
}) => {
  switch (role) {
    case "REQUESTER":
      return (
        <span
          className={`badge fw-medium px-2 py-1 ${className}`}
          style={{ backgroundColor: "#E0F2FE", color: "#0369A1" }}
        >
          Requester
        </span>
      );
    case "IT_STAFF":
      return (
        <span
          className={`badge fw-medium px-2 py-1 ${className}`}
          style={{ backgroundColor: "#DCFCE7", color: "#15803D" }}
        >
          IT Staff
        </span>
      );
    case "ADMINISTRATOR":
      return (
        <span
          className={`badge fw-medium px-2 py-1 ${className}`}
          style={{ backgroundColor: "#F1F5F9", color: "#475569" }}
        >
          Administrator
        </span>
      );
    default:
      return <span className={`badge bg-secondary px-2 py-1 ${className}`}>{role}</span>;
  }
};
