# TokTickIT — REST API Specification (Lab 3)

**Document Version:** 1.0.0  
**Status:** DRAFT CONTRACT — Frozen for Review  
**Standard Compliance:** CPE 334 Lab 3 API Standards (§6, §10)  
**Security Model:** Stateful HttpOnly Session Cookie (`toktickit_session`), Server-side Session Invalidation, CSRF Origin/Token Validation, Role-Based Access Control (RBAC).

---

## 1. Global Conventions & Error Shapes

### 1.1 HTTP Status Code Conventions
- `200 OK`: Request succeeded; returns data payload.
- `201 Created`: Resource successfully created.
- `204 No Content`: Action succeeded with no body returned (e.g. Logout, Password Reset).
- `400 Bad Request`: Input validation failed, malformed JSON, or illegal status transition.
- `401 Unauthorized`: Missing, invalid, expired, or revoked session cookie; incorrect credentials.
- `403 Forbidden`: Authenticated user lacks required role, mandatory password change required (`PASSWORD_CHANGE_REQUIRED`), or unauthorized resource access.
- `404 Not Found`: Target resource does not exist or belongs to another user (ownership protection).
- `405 Method Not Allowed`: Method not supported (e.g., PUT/PATCH/DELETE on append-only comments).
- `409 Conflict`: Concurrency conflict (stale version), duplicate unique email, or double-claim.
- `429 Too Many Requests`: Rate limit exceeded (e.g., >5 failed login attempts in 15 minutes).
- `500 Internal Server Error`: Generic safe server error without stack trace or internal leaks.

### 1.2 Standard Error Response Envelopes

#### Validation Error (`400 Bad Request`)
```json
{
  "error": "Validation failed",
  "details": {
    "summary": "Summary must be between 5 and 100 characters",
    "requestedPriority": "Priority must be LOW, MEDIUM, or HIGH"
  }
}
```

#### Authentication Failure (`401 Unauthorized`)
```json
{
  "error": "Invalid email or password"
}
```

#### Mandatory Password Change Required (`403 Forbidden`)
```json
{
  "error": "PASSWORD_CHANGE_REQUIRED",
  "message": "You must change your password before accessing this resource."
}
```

#### Role Forbidden (`403 Forbidden`)
```json
{
  "error": "Access denied",
  "message": "You do not have permission to perform this action."
}
```

#### Concurrency Conflict (`409 Conflict`)
```json
{
  "error": "CONFLICT",
  "message": "The ticket was modified by another user. Please refresh and try again.",
  "currentVersion": 4
}
```

#### Rate Limit Exceeded (`429 Too Many Requests`)
*Includes HTTP Header:* `Retry-After: 900`
```json
{
  "error": "TOO_MANY_ATTEMPTS",
  "message": "Too many failed login attempts. Please try again in 15 minutes."
}
```

---

## 2. Authentication & Account Lifecycle Endpoints

### 2.1 `POST /api/auth/login`
- **Access:** Public
- **Rate Limit:** 5 failed attempts per normalized email / IP per 15 minutes.
- **Request Body:**
```json
{
  "email": "sarah.j@example.com",
  "password": "InitialPassword123!"
}
```
- **Response Headers:**
  `Set-Cookie: toktickit_session=s%3A7f8a9...; Path=/; HttpOnly; SameSite=Lax`
- **Response `200 OK` (Standard Active Session):**
```json
{
  "user": {
    "id": 2,
    "name": "Sarah Johnson",
    "email": "sarah.j@example.com",
    "role": "REQUESTER",
    "department": "Finance",
    "mustChangePassword": false
  }
}
```
- **Response `200 OK` (Mandatory Password Change Required):**
```json
{
  "user": {
    "id": 2,
    "name": "Sarah Johnson",
    "email": "sarah.j@example.com",
    "role": "REQUESTER",
    "department": "Finance",
    "mustChangePassword": true
  }
}
```

---

### 2.2 `GET /api/auth/me`
- **Access:** Any active session (including those with `mustChangePassword === true`).
- **Response `200 OK`:**
```json
{
  "user": {
    "id": 1,
    "name": "Jennifer Anderson",
    "email": "jennifer.a@example.com",
    "role": "REQUESTER",
    "department": "Marketing",
    "mustChangePassword": false
  }
}
```
- **Response `401 Unauthorized`:**
```json
{
  "error": "Authentication required"
}
```

---

### 2.3 `POST /api/auth/change-password`
- **Access:** Any active session.
- **Request Body:**
```json
{
  "currentPassword": "InitialPassword123!",
  "newPassword": "MyNewSecurePassword2026#",
  "confirmPassword": "MyNewSecurePassword2026#"
}
```
- **Validation Rules:**
  - `newPassword` length: 12–128 characters.
  - `newPassword === confirmPassword`.
  - `newPassword !== currentPassword`.
  - `currentPassword` matches current hash in database.
- **Response `200 OK`:**
```json
{
  "message": "Password changed successfully",
  "user": {
    "id": 1,
    "name": "Jennifer Anderson",
    "email": "jennifer.a@example.com",
    "role": "REQUESTER",
    "department": "Marketing",
    "mustChangePassword": false
  }
}
```

---

### 2.4 `POST /api/auth/logout`
- **Access:** Any active session.
- **Action:** Server deletes session from PostgreSQL and clears cookie.
- **Response `204 No Content`**
- **Response Headers:**
  `Set-Cookie: toktickit_session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT`

---

### 2.5 `GET /api/auth/csrf`
- **Access:** Any active session.
- **Response `200 OK`:**
```json
{
  "csrfToken": "b4a8e6f1c2d3e4f5a6b7c8d9e0f1a2b3"
}
```

---

## 3. Requester Ticket Endpoints (Regression & Scoping)

All requester operations derive user identity exclusively from the authenticated session (`req.user.id`). Legacy header `X-Requester-Id` is strictly ignored and rejected.

### 3.1 `GET /api/tickets`
- **Access:** `REQUESTER` role only. Scoped to `requesterId === req.user.id`.
- **Query Parameters:**
  - `search` (string, optional)
  - `category` (int, optional)
  - `priority` (`LOW` | `MEDIUM` | `HIGH`, optional)
  - `itPriority` (`LOW` | `MEDIUM` | `HIGH`, optional)
  - `status` (`NEW` | `OPEN` | `IN_PROGRESS` | `WAITING_FOR_REQUESTER` | `RESOLVED` | `CLOSED` | `REOPENED` | `CANCELLED`, optional)
  - `sortBy` (`ticketNo` | `createdAt` | `requestedPriority` | `itPriority` | `currentStatus`, default `createdAt`)
  - `sortOrder` (`asc` | `desc`, default `desc`)
  - `page` (int, default `1`)
  - `pageSize` (`10` | `20` | `50`, default `10`)
- **Response `200 OK`:**
```json
{
  "tickets": [
    {
      "id": 101,
      "ticketNo": "TKT-2026-000101",
      "summary": "Cannot connect to VPN from home",
      "requestedPriority": "HIGH",
      "itPriority": "HIGH",
      "currentStatus": "IN_PROGRESS",
      "ticketOwnerId": 12,
      "category": { "id": 1, "name": "Network" },
      "relatedSystem": { "id": 3, "name": "VPN" },
      "createdAt": "2026-09-08T08:30:00.000Z",
      "updatedAt": "2026-09-09T10:15:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 10,
    "total": 1,
    "totalPages": 1
  }
}
```

---

### 3.2 `POST /api/tickets`
- **Access:** `REQUESTER` role only.
- **Request Body:**
```json
{
  "summary": "Printer on 3rd floor marketing is jammed",
  "description": "Red error light flashing on printer HP-302. Tried power cycling but paper remains stuck.",
  "categoryId": 2,
  "relatedSystemId": 6,
  "requestedPriority": "MEDIUM"
}
```
- **Response `201 Created`:**
```json
{
  "id": 102,
  "ticketNo": "TKT-2026-000102",
  "summary": "Printer on 3rd floor marketing is jammed",
  "description": "Red error light flashing on printer HP-302. Tried power cycling but paper remains stuck.",
  "requestedPriority": "MEDIUM",
  "itPriority": "MEDIUM",
  "currentStatus": "NEW",
  "requesterId": 1,
  "ticketOwnerId": null,
  "categoryId": 2,
  "relatedSystemId": 6,
  "version": 1,
  "createdAt": "2026-09-10T14:55:00.000Z",
  "updatedAt": "2026-09-10T14:55:00.000Z"
}
```

---

### 3.3 `POST /api/tickets/:id/appears-resolved`
- **Access:** `REQUESTER` role only. Ticket must be owned by authenticated user.
- **Permitted Statuses:** `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `REOPENED`.
- **Response `200 OK`:**
```json
{
  "id": 101,
  "ticketNo": "TKT-2026-000101",
  "currentStatus": "IN_PROGRESS",
  "appearsResolvedAt": "2026-09-10T15:05:00.000Z",
  "appearsResolvedById": 1,
  "message": "Problem noted as appears resolved. IT Staff will verify and complete formal resolution."
}
```

---

## 4. Communication Endpoints (Public Comments & Internal Notes)

### 4.1 `GET /api/tickets/:id/public-comments`
- **Access:**
  - `REQUESTER`: Only on own tickets.
  - `IT_STAFF`, `ADMINISTRATOR`: On all tickets.
- **Response `200 OK`:**
```json
{
  "comments": [
    {
      "id": 1,
      "ticketId": 101,
      "author": {
        "id": 1,
        "name": "Jennifer Anderson",
        "role": "REQUESTER"
      },
      "body": "I have uploaded the requested screenshot showing the error code.",
      "createdAt": "2026-09-09T11:00:00.000Z"
    },
    {
      "id": 2,
      "ticketId": 101,
      "author": {
        "id": 12,
        "name": "Alex IT",
        "role": "IT_STAFF"
      },
      "body": "Thank you! We have updated the network routing table. Please test again.",
      "createdAt": "2026-09-09T14:20:00.000Z"
    }
  ]
}
```

---

### 4.2 `POST /api/tickets/:id/public-comments`
- **Access:** `REQUESTER` (on own tickets) and `IT_STAFF`.
- **Request Body:**
```json
{
  "body": "VPN is now connecting properly. Thank you for the quick resolution!"
}
```
- **Validation:** Length 1–2,000 characters after trimming.
- **Response `201 Created`:**
```json
{
  "id": 3,
  "ticketId": 101,
  "author": {
    "id": 1,
    "name": "Jennifer Anderson",
    "role": "REQUESTER"
  },
  "body": "VPN is now connecting properly. Thank you for the quick resolution!",
  "createdAt": "2026-09-10T15:10:00.000Z"
}
```

---

### 4.3 `GET /api/tickets/:id/internal-notes`
- **Access:** `IT_STAFF` and `ADMINISTRATOR` only.
- **Requester Attempt:** Returns `403 Forbidden` immediately before querying database.
- **Response `200 OK`:**
```json
{
  "notes": [
    {
      "id": 1,
      "ticketId": 101,
      "author": {
        "id": 12,
        "name": "Alex IT",
        "role": "IT_STAFF"
      },
      "body": "Root cause was DHCP pool exhaustion on Gateway 4. Cleared stale leases.",
      "createdAt": "2026-09-09T14:15:00.000Z"
    }
  ]
}
```

---

### 4.4 `POST /api/tickets/:id/internal-notes`
- **Access:** `IT_STAFF` only.
- **Request Body:**
```json
{
  "body": "Scheduled gateway firmware upgrade for this Saturday 02:00."
}
```
- **Response `201 Created`:**
```json
{
  "id": 2,
  "ticketId": 101,
  "author": {
    "id": 12,
    "name": "Alex IT",
    "role": "IT_STAFF"
  },
  "body": "Scheduled gateway firmware upgrade for this Saturday 02:00.",
  "createdAt": "2026-09-10T15:12:00.000Z"
}
```

---

## 5. IT Staff Queue & Operational Endpoints

### 5.1 `GET /api/staff/tickets`
- **Access:** `IT_STAFF` role only.
- **Query Parameters:**
  - `search` (string, ticketNo or summary)
  - `category` (int)
  - `requestedPriority` (`LOW` | `MEDIUM` | `HIGH`)
  - `itPriority` (`LOW` | `MEDIUM` | `HIGH`)
  - `status` (Status enum)
  - `owner` (`all` | `me` | `unassigned` | user ID)
  - `sortBy` (`itPriority` | `createdAt` | `updatedAt` | `currentStatus` | `ticketNo`, default `updatedAt`)
  - `sortOrder` (`asc` | `desc`, default `desc`)
  - `page` (int, default `1`)
  - `pageSize` (`10` | `20` | `50`, default `10`)
- **Response `200 OK`:**
```json
{
  "tickets": [
    {
      "id": 101,
      "ticketNo": "TKT-2026-000101",
      "summary": "Cannot connect to VPN from home",
      "requester": {
        "id": 1,
        "name": "Jennifer Anderson",
        "email": "jennifer.a@example.com"
      },
      "category": { "id": 1, "name": "Network" },
      "relatedSystem": { "id": 3, "name": "VPN" },
      "requestedPriority": "HIGH",
      "itPriority": "HIGH",
      "currentStatus": "IN_PROGRESS",
      "ticketOwner": {
        "id": 12,
        "name": "Alex IT",
        "role": "IT_STAFF"
      },
      "version": 3,
      "createdAt": "2026-09-08T08:30:00.000Z",
      "updatedAt": "2026-09-09T14:20:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 10,
    "total": 35,
    "totalPages": 4
  }
}
```

---

### 5.2 `POST /api/staff/tickets/:id/claim`
- **Access:** `IT_STAFF` only.
- **Precondition:** `ticketOwnerId === null`.
- **Request Body:**
```json
{
  "expectedVersion": 1
}
```
- **Response `200 OK`:**
```json
{
  "id": 102,
  "ticketNo": "TKT-2026-000102",
  "ticketOwner": {
    "id": 12,
    "name": "Alex IT",
    "role": "IT_STAFF"
  },
  "version": 2
}
```
- **Error `409 Conflict` (Already Claimed):**
```json
{
  "error": "ALREADY_ASSIGNED",
  "message": "Ticket has already been claimed by another team member.",
  "currentOwner": { "id": 14, "name": "David Support" }
}
```

---

### 5.3 `PATCH /api/staff/tickets/:id/owner`
- **Access:** `IT_STAFF` only.
- **Request Body:**
```json
{
  "ownerId": 14,
  "expectedVersion": 2
}
```
- **Validation:** `ownerId` must correspond to an active user with role `IT_STAFF` or `ADMINISTRATOR`.
- **Response `200 OK`:**
```json
{
  "id": 102,
  "ticketNo": "TKT-2026-000102",
  "ticketOwner": {
    "id": 14,
    "name": "David Support",
    "role": "IT_STAFF"
  },
  "version": 3
}
```

---

### 5.4 `PATCH /api/staff/tickets/:id/it-priority`
- **Access:** `IT_STAFF` only.
- **Request Body:**
```json
{
  "itPriority": "HIGH",
  "expectedVersion": 3
}
```
- **Response `200 OK`:**
```json
{
  "id": 102,
  "ticketNo": "TKT-2026-000102",
  "requestedPriority": "MEDIUM",
  "itPriority": "HIGH",
  "version": 4
}
```

---

### 5.5 `PATCH /api/staff/tickets/:id/status`
- **Access:** `IT_STAFF` only.
- **Request Body:**
```json
{
  "status": "RESOLVED",
  "expectedVersion": 4
}
```
- **Transition Validation:** Must conform to BR-14 and BR-15.
- **Response `200 OK`:**
```json
{
  "id": 102,
  "ticketNo": "TKT-2026-000102",
  "currentStatus": "RESOLVED",
  "version": 5
}
```
- **Error `400 Bad Request` (Illegal Transition):**
```json
{
  "error": "ILLEGAL_STATUS_TRANSITION",
  "message": "Cannot transition status from 'NEW' directly to 'RESOLVED'."
}
```

---

## 6. Administrator User Management Endpoints

### 6.1 `GET /api/admin/users`
- **Access:** `ADMINISTRATOR` role only.
- **Query Parameters:** `search` (name or email), `role` (`REQUESTER` | `IT_STAFF` | `ADMINISTRATOR`)
- **Response `200 OK`:**
```json
{
  "users": [
    {
      "id": 1,
      "name": "Jennifer Anderson",
      "email": "jennifer.a@example.com",
      "department": "Marketing",
      "role": "REQUESTER",
      "isActive": true,
      "mustChangePassword": false,
      "createdAt": "2026-08-30T10:00:00.000Z"
    },
    {
      "id": 12,
      "name": "Alex IT",
      "email": "alex.it@example.com",
      "department": "Information Technology",
      "role": "IT_STAFF",
      "isActive": true,
      "mustChangePassword": false,
      "createdAt": "2026-08-30T10:00:00.000Z"
    },
    {
      "id": 20,
      "name": "System Admin",
      "email": "admin@example.com",
      "department": "Administration",
      "role": "ADMINISTRATOR",
      "isActive": true,
      "mustChangePassword": false,
      "createdAt": "2026-08-30T10:00:00.000Z"
    }
  ]
}
```

---

### 6.2 `POST /api/admin/users`
- **Access:** `ADMINISTRATOR` only.
- **Request Body:**
```json
{
  "name": "Marcus Vance",
  "email": "marcus.v@example.com",
  "department": "Security",
  "role": "IT_STAFF",
  "isActive": true,
  "initialPassword": "TempPassword2026!"
}
```
- **Response `201 Created`:**
```json
{
  "id": 21,
  "name": "Marcus Vance",
  "email": "marcus.v@example.com",
  "department": "Security",
  "role": "IT_STAFF",
  "isActive": true,
  "mustChangePassword": true,
  "createdAt": "2026-09-10T15:20:00.000Z"
}
```
- **Error `409 Conflict` (Duplicate Email):**
```json
{
  "error": "DUPLICATE_EMAIL",
  "message": "An account with this email address already exists."
}
```

---

### 6.3 `PATCH /api/admin/users/:id`
- **Access:** `ADMINISTRATOR` only.
- **Request Body:**
```json
{
  "name": "Marcus Vance Updated",
  "email": "marcus.v@example.com",
  "department": "Infosec",
  "role": "IT_STAFF",
  "isActive": false
}
```
- **Safety Invariant Validations:**
  - Self-deactivation: Cannot deactivate `id === req.user.id`.
  - Last admin: Cannot deactivate or demote if user is sole active `ADMINISTRATOR`.
- **Response `200 OK`:**
```json
{
  "id": 21,
  "name": "Marcus Vance Updated",
  "email": "marcus.v@example.com",
  "role": "IT_STAFF",
  "isActive": false,
  "unassignedTicketsCount": 4
}
```

---

### 6.4 `POST /api/admin/users/:id/initial-password`
- **Access:** `ADMINISTRATOR` only.
- **Request Body:**
```json
{
  "initialPassword": "NewTempSecret2026#"
}
```
- **Action:** Hashes secret, sets `mustChangePassword = true`, and revokes all active sessions for that user immediately.
- **Response `204 No Content`**
