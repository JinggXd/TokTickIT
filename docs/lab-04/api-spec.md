# TokTickIT — REST API Specification (Lab 4)

**Document Version:** 1.2.0 (Revised following F1-Review Round 2 Findings)  
**Status:** PROPOSED API CONTRACT (Sprint 4 F1)  
**Standard Compliance:** CPE 334 Lab 4 Handout (`SE-Lab-4.pdf`, §6), Lab 3 Baseline, `GEMINI-PIPELINE.md`, `F1-REVIEW-ROUND2.md`

---

## 1. Global Conventions & Protocol

### 1.1 Base URL & Content Type
- **Base URL:** `/api`
- **Request Content-Type:** `application/json` (or `multipart/form-data` for legacy attachment uploads)
- **Response Content-Type:** `application/json; charset=utf-8`

### 1.2 Authentication & Identity
- Stateful session management via secure HttpOnly cookie `toktickit_session`.
- CSRF double-submit protection: all state-changing requests (`POST`, `PATCH`, `PUT`, `DELETE`) require `X-CSRF-Token` matching the session's token.
- Caller identity and role are derived strictly from the verified database session on the server.
- Legacy `X-Requester-Id` header and body fields attempting to spoof caller identity (`requesterId`, `performedById`, `authorId`) are strictly ignored.

### 1.3 Uniform Error Envelopes & Exact Baseline Alignment
To ensure 100% backward-compatibility with Labs 2 and 3, error responses use the standard flat error envelope:
```json
{
  "error": "BAD_REQUEST",
  "message": "Human-readable explanation of error",
  "details": {
    "field": "Specific field validation message"
  }
}
```

Standardized Error Constants across the application:
1. **Foreign Ticket Access:** `403 Forbidden` with exact baseline body:
   ```json
   { "error": "Access denied: You do not own this ticket" }
   ```
2. **Concurrency Conflict on Ticket:** `409 Conflict` with exact baseline body:
   ```json
   {
     "error": "CONFLICT",
     "message": "The ticket was modified by another user. Please refresh and try again.",
     "currentVersion": 4
   }
   ```
3. **Concurrency Conflict on Action Taken:** `409 Conflict`:
   ```json
   {
     "error": "CONFLICT",
     "message": "Action Taken was modified by another user. Please refresh and try again.",
     "currentVersion": 2
   }
   ```
4. **Idempotency Payload Mismatch:** `409 Conflict`:
   ```json
   {
     "error": "CONFLICT",
     "message": "Idempotency key reused with mismatched request payload."
   }
   ```
5. **Resolution Gate Violation:** `422 Unprocessable Entity`:
   ```json
   {
     "error": "RESOLUTION_GATE_FAILED",
     "message": "Ticket resolution requires at least one completed Action Taken and no pending actions."
   }
   ```
6. **Inactive or Invalid Assignee:** `422 Unprocessable Entity`:
   ```json
   {
     "error": "INVALID_ASSIGNEE",
     "message": "Assignee must be an active IT Staff or Administrator."
   }
   ```
7. **Action Mutation on Terminal/Resolved Ticket:** `400 Bad Request`:
   ```json
   {
     "error": "BAD_REQUEST",
     "message": "Cannot modify actions on a resolved, closed, or cancelled ticket."
   }
   ```
8. **Nested Resource Mismatch:** `404 Not Found`:
   ```json
   {
     "error": "NOT_FOUND",
     "message": "Action Taken not found under this ticket."
   }
   ```

### 1.4 Eligible Ticket Owners & Action Assignees
- **Method / Path:** `GET /api/staff/ticket-owners`
- **Authorization:** `IT_STAFF` and `ADMINISTRATOR` (Explicitly expanded from Lab 3 baseline to authorize Administrators, enabling both IT Staff and Administrators to populate owner assignment and action delegation dropdowns).
- **Behavior:** Queries active users with role `IT_STAFF` or `ADMINISTRATOR` (`WHERE role IN ('IT_STAFF', 'ADMINISTRATOR') AND isActive = true`) ordered by `name ASC, id ASC`.
- **Response Format (`200 OK`):**
  ```json
  [
    {
      "id": 12,
      "name": "Alex Staff",
      "role": "IT_STAFF"
    },
    {
      "id": 1,
      "name": "Admin Root",
      "role": "ADMINISTRATOR"
    }
  ]
  ```
- **Error Responses:**
  - `401 Unauthorized`: Session missing or expired.
  - `403 Forbidden`: Caller has role `REQUESTER` (`{ "error": "Access denied" }`).

---

## 2. Actions Taken Endpoints

### 2.1 List Actions Taken for Ticket
- **Method / Path:** `GET /api/tickets/:id/actions`
- **Authorization:**
  - `REQUESTER`: Permitted **only** if `ticket.requesterId === currentUser.id`. If foreign, return **`403 Forbidden`** with `{ "error": "Access denied: You do not own this ticket" }`. If non-existent, return `404 Not Found`.
  - `IT_STAFF` / `ADMINISTRATOR`: Permitted on any existing ticket.
- **Path Parameters:**
  - `id` (integer, required): Target Ticket ID.
- **Visibility:** Returns **all** Actions Taken (`PENDING`, `COMPLETED`, `CANCELLED`) associated with the ticket in chronological order (`actionDateTime ASC, id ASC`).
- **Success Response (200 OK):**
```json
{
  "ticketId": 142,
  "actions": [
    {
      "id": 1,
      "ticketId": 142,
      "actionDateTime": "2026-09-25T14:30:00.000Z",
      "actionDescription": "Checked switch port and replaced patch cord",
      "result": "Port link established, 1Gbps full duplex",
      "status": "COMPLETED",
      "version": 1,
      "createdById": 12,
      "performedBy": {
        "id": 12,
        "name": "Alex IT"
      },
      "assignee": null,
      "followUpRequired": false,
      "followUpNote": null,
      "attachmentNotes": "IMG_0012.JPG showing patch panel",
      "createdAt": "2026-09-25T14:35:10.000Z",
      "updatedAt": "2026-09-25T14:35:10.000Z"
    },
    {
      "id": 2,
      "ticketId": 142,
      "actionDateTime": "2026-09-25T15:00:00.000Z",
      "actionDescription": "Order replacement SFP module",
      "result": null,
      "status": "PENDING",
      "version": 1,
      "createdById": 12,
      "performedBy": null,
      "assignee": {
        "id": 15,
        "name": "Marcus IT"
      },
      "followUpRequired": true,
      "followUpNote": "Install module when shipment arrives on Monday",
      "attachmentNotes": null,
      "createdAt": "2026-09-25T15:02:00.000Z",
      "updatedAt": "2026-09-25T15:02:00.000Z"
    }
  ]
}
```

---

### 2.2 Create Action Taken & Idempotent Retry Protocol
- **Method / Path:** `POST /api/tickets/:id/actions`
- **Authorization:** `IT_STAFF`, `ADMINISTRATOR`. (Requesters return `403 Forbidden`).
- **Path Parameters:**
  - `id` (integer, required): Target Ticket ID.
- **Idempotency Key Handling & Canonical Payload Hash:**
  - Client sends `X-Client-Request-Id` in headers (primary) or `clientRequestId` in JSON body (fallback).
  - If both provided, values must match exactly; otherwise returns `400 Bad Request` (`{ "error": "VALIDATION_FAILED", "message": "Header and body clientRequestId must match." }`).
  - Key must be a valid UUIDv4 string (`/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i`). Invalid UUID returns `400 Bad Request` (`{ "error": "VALIDATION_FAILED", "message": "Invalid clientRequestId format; must be UUIDv4." }`).
  - **Scoping Definition:** Scoped to `(createdById, ticketId, clientRequestId)` via unique index `@@unique([createdById, ticketId, clientRequestId])`, where `createdById` is strictly derived by the server from the authenticated session (`req.user.id`).
    - *Same user + same ticket + same key + same payload:* Replay returns `200 OK` (`X-Idempotent-Replay: true`).
    - *Same scope (`createdById, ticketId, clientRequestId`) + different payload:* Rejected with `409 Conflict`.
    - *Different user + same ticket + same key:* Creates a separate Action Taken (`201 Created`) because each user possesses an isolated idempotency namespace.
  - **Canonical Request Payload Hash:** To ensure retries remain idempotent even if the created action is later updated or completed, the backend computes a SHA-256 hash across all 8 request fields:
    ```typescript
    const normalizedPayload = {
      actionDateTime: body.actionDateTime ? new Date(body.actionDateTime).toISOString() : null,
      actionDescription: (body.actionDescription || "").trim(),
      status: body.status || "COMPLETED",
      result: body.result ? body.result.trim() : null,
      assigneeId: body.assigneeId ?? null,
      followUpRequired: Boolean(body.followUpRequired),
      followUpNote: body.followUpRequired && body.followUpNote ? body.followUpNote.trim() : null,
      attachmentNotes: body.attachmentNotes ? body.attachmentNotes.trim() : null,
    };
    const requestPayloadHash = crypto.createHash("sha256").update(JSON.stringify(normalizedPayload)).digest("hex");
    ```
- **Atomic Transaction & Locking Order:**
  1. Begin database transaction.
  2. Lock parent `Ticket` row (`SELECT id, version, currentStatus FROM "Ticket" WHERE id = :ticketId FOR UPDATE`). If ticket does not exist, return `404 Not Found`.
  3. **Idempotency Check (Executed BEFORE Ticket Status Check):**
     - If `clientRequestId` is supplied, query for an existing record matching `(createdById: req.user.id, ticketId: parseInt(req.params.id), clientRequestId)`:
       - If found and `requestPayloadHash === existingAction.requestPayloadHash`:
         - Commit/end transaction and return **`200 OK`** with header `X-Idempotent-Replay: true` and the action data.
         - *Critical Rule:* This replay succeeds with `200 OK` **even if the parent ticket is now `RESOLVED`, `CLOSED`, or `CANCELLED`**, and **even if the action was subsequently edited, completed, or reassigned**, because it is an acknowledgment of an existing committed record, not a new mutation.
       - If found and `requestPayloadHash !== existingAction.requestPayloadHash`:
         - Abort transaction and return **`409 Conflict`** (`{ "error": "CONFLICT", "message": "Idempotency key reused with mismatched request payload." }`).
  4. **Parent Ticket Status Check (Executed ONLY for New Creations):**
     - If `ticket.currentStatus` is in (`RESOLVED`, `CLOSED`, `CANCELLED`), abort transaction and return **`400 Bad Request`** (`{ "error": "BAD_REQUEST", "message": "Cannot modify actions on a resolved, closed, or cancelled ticket." }`).
  5. Validate input fields:
     - `actionDateTime`: ISO string <= `now() + 5m`. Defaults to `now()`.
     - `actionDescription`: String, required, 1–1000 characters.
     - `status`: Optional enum `"COMPLETED"` (default) or `"PENDING"`.
     - `result`: String, 1–1000 characters. Mandatory if `status === "COMPLETED"`; optional if `"PENDING"`.
     - `assigneeId`: Optional integer. If supplied, user must exist, have role `IT_STAFF` or `ADMINISTRATOR`, and `isActive === true`. (Otherwise 422 `INVALID_ASSIGNEE`).
     - `followUpRequired`: Boolean, default `false`.
     - `followUpNote`: String, 1–1000 characters. Mandatory if `followUpRequired === true`.
     - `attachmentNotes`: String, optional, max 500 characters.
  6. Insert `ActionTaken` row (`version = 1`, `createdById = req.user.id`, `performedById = status === 'COMPLETED' ? req.user.id : null`, `clientRequestId`, `requestPayloadHash`).
  7. Increment parent `Ticket.version = Ticket.version + 1` and set `Ticket.updatedAt = NOW()`.
  8. Commit transaction. Return **`201 Created`**.

---

---

### 2.3 Update Action Taken / Assignment
- **Method / Path:** `PATCH /api/tickets/:id/actions/:actionId`
- **Authorization:** `IT_STAFF`, `ADMINISTRATOR` (Caller must have an active session with password changed).
- **Path Parameters:**
  - `id` (integer, required): Parent Ticket ID (`^[1-9]\d*$`).
  - `actionId` (integer, required): Action Taken ID (`^[1-9]\d*$`).
- **Request Headers:**
  - `Content-Type: application/json`
  - `If-Match`: (Optional string) Target `version` number. May be provided as header or inside request body as `expectedVersion`.
- **Request Body Schema:**
  | Field | Type | Required | Description & Validation Rules |
  |---|---|---|---|
  | `expectedVersion` | Integer | Required* | Target action version as a positive integer (`^[1-9]\d*$`). Missing or non-positive integer returns `400 Bad Request` (`VALIDATION_FAILED`). If version does not match current `action.version`, returns `409 Conflict` with `currentVersion`. *Can alternatively be supplied via `If-Match` header. |
  | `actionDescription` | String | Optional | Updated description (1–1000 characters). Whitespace-only or blank string returns 400 `VALIDATION_FAILED`. |
  | `assigneeId` | Integer \| null | Optional | Assigned staff/admin ID. **Allowed only when action is `PENDING`**. Must refer to an active user with role `IT_STAFF` or `ADMINISTRATOR` (else 422 `INVALID_ASSIGNEE`). If `null`, unassigns action. Attempting to set or change `assigneeId` on a `COMPLETED` action returns 400 `BAD_REQUEST`. Eligible users queryable via `GET /api/staff/ticket-owners`. |
  | `followUpRequired` | Boolean | Optional | Flag indicating follow-up work is required. |
  | `followUpNote` | String \| null | Optional | Detailed follow-up instructions. **Mandatory (1–1000 non-whitespace chars) whenever `followUpRequired === true`** (evaluated post-merge). Cleared to `null` if `followUpRequired === false`. If `followUpRequired` is true and note is empty/whitespace, returns 400 `VALIDATION_FAILED`. |
  | `attachmentNotes` | String \| null | Optional | Free-text notes or filename reference for diagnostic attachments (max 500 chars). |

- **Permission & State Transition Matrix:**
  | Current Action Status | Allowed Caller | Permitted Mutable Fields | Forbidden Modifications |
  |---|---|---|---|
  | `PENDING` | Any `IT_STAFF` or `ADMINISTRATOR` | `actionDescription`, `assigneeId`, `followUpRequired`, `followUpNote`, `attachmentNotes` | Cannot revert to other status; cannot edit if parent ticket is resolved/closed/cancelled (400). |
  | `COMPLETED` | Original performer (`performedById === req.user.id`) OR `ADMINISTRATOR` | `actionDescription`, `followUpRequired`, `followUpNote`, `attachmentNotes` | `assigneeId` cannot be changed (400); `result` cannot be modified via PATCH (400); status cannot be reverted (400). Other staff callers receive 403 `FORBIDDEN`. |
  | `CANCELLED` | None | None | All PATCH attempts return 400 `BAD_REQUEST` ("Cannot modify a cancelled action"). |

- **Validation & Error Precedence Order:**
  1. `401 Unauthorized`: Session missing or expired.
  2. `403 Forbidden`: Caller has role `REQUESTER`, or non-performer staff attempts to edit a completed action.
  3. `404 Not Found`: Parent `Ticket` does not exist, `actionId` does not exist, or `action.ticketId !== ticketId`.
  4. `400 Bad Request`:
     - Parent ticket is in `RESOLVED`, `CLOSED`, or `CANCELLED` status (`BAD_REQUEST`).
     - Action is in `CANCELLED` status (`BAD_REQUEST`).
     - `expectedVersion` is missing or not a positive integer (`VALIDATION_FAILED`).
     - Illegal field edit on completed action (e.g. attempting to change `assigneeId` or `result`) (`BAD_REQUEST`).
     - Validation failure: blank description, or `followUpRequired === true` with empty/whitespace `followUpNote` (`VALIDATION_FAILED`).
  5. `409 Conflict`: `expectedVersion !== action.version` (`CONFLICT`).
  6. `422 Unprocessable Entity`: `assigneeId` does not target an active `IT_STAFF` or `ADMINISTRATOR` (`INVALID_ASSIGNEE`).

- **Atomic Transaction & Locking Order:**
  1. Lock parent `Ticket` row (`SELECT ... FOR UPDATE`). If Ticket does not exist, return `404 Not Found`.
  2. Verify nested resource: `action.ticketId === parseInt(req.params.id)`. If action does not exist or does not belong to this ticket, return `404 Not Found` (`NOT_FOUND`).
  3. Validate parent status: If in (`RESOLVED`, `CLOSED`, `CANCELLED`), return `400 Bad Request` (`BAD_REQUEST`).
  4. Optimistic concurrency: Verify `expectedVersion === action.version`. If mismatch, return `409 Conflict` with `currentVersion: action.version`.
  5. Apply updates, increment `ActionTaken.version = ActionTaken.version + 1`.
  6. Increment parent `Ticket.version = Ticket.version + 1` and update `Ticket.updatedAt = NOW()`.
  7. Commit transaction. Return `200 OK`.

- **Success Response (`200 OK`):**
  ```json
  {
    "ticketId": 101,
    "action": {
      "id": 2,
      "ticketId": 101,
      "actionDateTime": "2026-09-25T15:00:00.000Z",
      "actionDescription": "Updated replacement part specifications",
      "result": null,
      "status": "PENDING",
      "version": 2,
      "createdById": 12,
      "performedBy": null,
      "assignee": {
        "id": 15,
        "name": "Marcus IT"
      },
      "followUpRequired": true,
      "followUpNote": "Verify module compatibility on delivery",
      "attachmentNotes": "spec_sheet.pdf",
      "createdAt": "2026-09-25T15:02:00.000Z",
      "updatedAt": "2026-09-25T15:10:00.000Z"
    }
  }
  ```

---

### 2.4 Complete Action Taken
- **Method / Path:** `POST /api/tickets/:id/actions/:actionId/complete`
- **Authorization:** `IT_STAFF`, `ADMINISTRATOR`.
- **Path Parameters:**
  - `id` (integer, required): Parent Ticket ID (`^[1-9]\d*$`).
  - `actionId` (integer, required): Action Taken ID (`^[1-9]\d*$`).
- **Request Body Schema:**
  | Field | Type | Required | Description & Validation Rules |
  |---|---|---|---|
  | `expectedVersion` | Integer | Required* | Target action version as a positive integer. Missing or non-positive returns 400 `VALIDATION_FAILED`. Mismatch returns 409 `CONFLICT`. *Can alternatively be supplied via `If-Match` header. |
  | `result` | String | **Required** | Detailed description of outcome/resolution work performed (1–1000 characters). Blank or whitespace-only returns 400 `VALIDATION_FAILED`. |
  | `attachmentNotes` | String \| null | Optional | Free-text notes or filename reference for diagnostic attachments (max 500 chars). |

- **Atomic Transaction & Locking Order:**
  1. Lock parent `Ticket` row (`SELECT ... FOR UPDATE`). If Ticket does not exist, return `404 Not Found`.
  2. Verify nested resource (`action.ticketId === parseInt(req.params.id)`). If action does not exist or does not belong to this ticket, return `404 Not Found` (`NOT_FOUND`).
  3. Validate parent status: If in (`RESOLVED`, `CLOSED`, `CANCELLED`), return `400 Bad Request` (`BAD_REQUEST`).
  4. Action status check: must currently be `PENDING` (return 400 `BAD_REQUEST` if already completed or cancelled).
  5. Check `expectedVersion === action.version` (return 409 `CONFLICT` on mismatch).
  6. Set `status = 'COMPLETED'`, `performedById = req.user.id`, `result = body.result.trim()`, `attachmentNotes = body.attachmentNotes`.
  7. Increment `ActionTaken.version = ActionTaken.version + 1`.
  8. Increment parent `Ticket.version = Ticket.version + 1` and update `Ticket.updatedAt = NOW()`.
  9. Commit transaction. Return `200 OK`.

- **Success Response (`200 OK`):**
  ```json
  {
    "ticketId": 101,
    "action": {
      "id": 2,
      "ticketId": 101,
      "actionDateTime": "2026-09-25T15:00:00.000Z",
      "actionDescription": "Order replacement SFP module",
      "result": "Module installed and tested successfully. Optical power levels nominal.",
      "status": "COMPLETED",
      "version": 2,
      "createdById": 12,
      "performedBy": {
        "id": 12,
        "name": "Alex IT"
      },
      "assignee": {
        "id": 15,
        "name": "Marcus IT"
      },
      "followUpRequired": true,
      "followUpNote": "Install module when shipment arrives on Monday",
      "attachmentNotes": "power_levels.txt",
      "createdAt": "2026-09-25T15:02:00.000Z",
      "updatedAt": "2026-09-25T16:45:00.000Z"
    }
  }
  ```

- **Error Responses:**
  - `400 Bad Request`: `VALIDATION_FAILED` (missing result, result > 1000 chars) or `BAD_REQUEST` (ticket terminal, action not pending).
  - `401 Unauthorized`: Session missing or expired.
  - `403 Forbidden`: `FORBIDDEN` (caller is `REQUESTER`).
  - `404 Not Found`: `NOT_FOUND` (Ticket or ActionTaken not found).
  - `409 Conflict`: `CONFLICT` (action version mismatch with `currentVersion`).

---

### 2.5 Cancel Action Taken
- **Method / Path:** `POST /api/tickets/:id/actions/:actionId/cancel`
- **Authorization:** `IT_STAFF`, `ADMINISTRATOR`.
- **Path Parameters:**
  - `id` (integer, required): Parent Ticket ID (`^[1-9]\d*$`).
  - `actionId` (integer, required): Action Taken ID (`^[1-9]\d*$`).
- **Request Body Schema:**
  | Field | Type | Required | Description & Validation Rules |
  |---|---|---|---|
  | `expectedVersion` | Integer | Required* | Target action version as a positive integer (`^[1-9]\d*$`). Missing or non-positive integer returns 400 `VALIDATION_FAILED`. Mismatch returns 409 `CONFLICT`. *Can alternatively be supplied via `If-Match` header. |
  | `reason` | String | Optional | Explanation for cancellation (recorded into `result`, max 500 characters). |

- **Atomic Transaction & Locking Order:**
  1. Lock parent `Ticket` row (`SELECT ... FOR UPDATE`). If Ticket does not exist, return `404 Not Found`.
  2. Verify nested resource (`action.ticketId === parseInt(req.params.id)`). If action does not exist or does not belong to this ticket, return `404 Not Found` (`NOT_FOUND`).
  3. Validate parent status: If in (`RESOLVED`, `CLOSED`, `CANCELLED`), return `400 Bad Request` (`BAD_REQUEST`).
  4. Action status check: must currently be `PENDING` (return 400 `BAD_REQUEST` if already completed or cancelled).
  5. Check `expectedVersion === action.version` (return 409 `CONFLICT` on mismatch).
  6. Set `status = 'CANCELLED'`. If `reason` is supplied, set `result = reason.trim()`.
  7. Increment `ActionTaken.version = ActionTaken.version + 1`.
  8. Increment parent `Ticket.version = Ticket.version + 1` and update `Ticket.updatedAt = NOW()`.
  9. Commit transaction. Return `200 OK`.

- **Success Response (`200 OK`):**
  ```json
  {
    "ticketId": 101,
    "action": {
      "id": 2,
      "ticketId": 101,
      "actionDateTime": "2026-09-25T15:00:00.000Z",
      "actionDescription": "Order replacement SFP module",
      "result": "Cancelled: Spare module found in local IT inventory",
      "status": "CANCELLED",
      "version": 2,
      "createdById": 12,
      "performedBy": null,
      "assignee": {
        "id": 15,
        "name": "Marcus IT"
      },
      "followUpRequired": true,
      "followUpNote": "Install module when shipment arrives on Monday",
      "attachmentNotes": null,
      "createdAt": "2026-09-25T15:02:00.000Z",
      "updatedAt": "2026-09-25T15:20:00.000Z"
    }
  }
  ```

- **Error Responses:**
  - `400 Bad Request`: `BAD_REQUEST` (ticket terminal, action not pending).
  - `401 Unauthorized`: Session missing or expired.
  - `403 Forbidden`: `FORBIDDEN` (caller is `REQUESTER`).
  - `404 Not Found`: `NOT_FOUND` (Ticket or ActionTaken not found).
  - `409 Conflict`: `CONFLICT` (action version mismatch with `currentVersion`).

---

## 3. Ticket Workflow & Resolution Gate Endpoint

### 3.1 Transition Ticket Status
- **Method / Path:** `PATCH /api/staff/tickets/:id/status`
- **Authorization:** `IT_STAFF` only (preserves Lab 3 baseline access).
- **Request Body:**
```json
{
  "status": "RESOLVED",
  "expectedVersion": 3
}
```
- **Transition Rules:**
  - 17 permitted transitions, 47 rejected transitions (preserving Lab 3 BR-14 matrix).
  - Only `CANCELLED` is terminal. `CLOSED -> REOPENED` is permitted.
  - Transitions to `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `RESOLVED` require an active eligible owner (400 `ELIGIBLE_OWNER_REQUIRED`).
  - Reopening clears `appearsResolvedAt` and `appearsResolvedById`.
- **Atomic Resolution Gate (when target status is `RESOLVED`):**
  1. Lock `Ticket` row (`SELECT ... FOR UPDATE`).
  2. Verify `expectedVersion === ticket.version` (409 `CONFLICT` on mismatch).
  3. Count actions:
     - `prisma.actionTaken.count({ where: { ticketId, status: 'COMPLETED' } }) >= 1`
     - `prisma.actionTaken.count({ where: { ticketId, status: 'PENDING' } }) === 0`
  4. If either condition fails, abort transaction and return `422 Unprocessable Entity`:
     ```json
     {
       "error": "RESOLUTION_GATE_FAILED",
       "message": "Ticket resolution requires at least one completed Action Taken and no pending actions."
     }
     ```
  5. Update `Ticket.currentStatus = 'RESOLVED'`, `Ticket.version = Ticket.version + 1`, `Ticket.updatedAt = NOW()`.
  6. Commit transaction. Return `200 OK`.

---

## 4. List Endpoints Query Deltas & Operational Dashboards

### 4.1 List Endpoints API Delta (Shared Filters for Drill-Downs)
To guarantee 1-to-1 parity between dashboard counts and drill-down pages:
- **`GET /api/tickets` (Requester My Tickets):**
  - Add optional query parameter `recent`: values `7d` (filters `updatedAt >= NOW() - INTERVAL '7 days'`).
  - Add optional query parameter `statusGroup`: values `open` (filters `currentStatus IN ('NEW', 'OPEN', 'IN_PROGRESS', 'WAITING_FOR_REQUESTER', 'REOPENED')`).
- **`GET /api/staff/tickets` (Staff Queue):**
  - Extend read access to `ADMINISTRATOR` role.
  - Add optional query parameter `statusGroup`:
    - `open`: filters active statuses (`NEW`, `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `REOPENED`).
    - `active`: excludes terminal statuses (filters `currentStatus NOT IN ('CLOSED', 'CANCELLED')`).

---

### 4.2 Requester Dashboard
- **Method / Path:** `GET /api/dashboard/requester`
- **Authorization:** `REQUESTER` only.
- **Success Response (200 OK):**
```json
{
  "metrics": {
    "totalOpenTickets": 4,
    "ticketsWaitingForRequester": 1,
    "recentlyUpdatedTicketsCount": 3,
    "recentlyResolvedTicketsCount": 2
  },
  "recentTickets": [
    {
      "id": 142,
      "ticketNo": "TKT-2026-000142",
      "summary": "Laptop battery drains quickly",
      "currentStatus": "IN_PROGRESS",
      "requestedPriority": "HIGH",
      "updatedAt": "2026-09-25T14:00:00.000Z"
    }
  ]
}
```
- **Metric Definitions & Exact Drill-down URLs:**
  1. `totalOpenTickets`: count where `currentStatus` in active group and `requesterId === currentUser.id`. Drill-down: `/my-tickets?statusGroup=open`.
  2. `ticketsWaitingForRequester`: count where `currentStatus === 'WAITING_FOR_REQUESTER'` and `requesterId === currentUser.id`. Drill-down: `/my-tickets?status=WAITING_FOR_REQUESTER`.
  3. `recentlyUpdatedTicketsCount`: count where `requesterId === currentUser.id` and `updatedAt >= NOW() - INTERVAL '7 days'`. Drill-down: `/my-tickets?recent=7d`.
  4. `recentlyResolvedTicketsCount`: count where `currentStatus === 'RESOLVED'` and `updatedAt >= NOW() - INTERVAL '7 days'` and `requesterId === currentUser.id`. Drill-down: `/my-tickets?status=RESOLVED&recent=7d`.

---

### 4.3 IT Staff Dashboard
- **Method / Path:** `GET /api/dashboard/staff`
- **Authorization:** `IT_STAFF`, `ADMINISTRATOR`.
- **Success Response (200 OK):**
```json
{
  "metrics": {
    "unassignedTickets": 7,
    "myAssignedTickets": 5,
    "openQueueTickets": 14,
    "ticketsWaitingForRequester": 2,
    "myActionsTakenCount": 18,
    "ticketsByStatus": {
      "NEW": 3,
      "OPEN": 4,
      "IN_PROGRESS": 6,
      "WAITING_FOR_REQUESTER": 2,
      "RESOLVED": 10,
      "CLOSED": 8,
      "REOPENED": 1,
      "CANCELLED": 1
    },
    "ticketsByPriority": {
      "HIGH": 5,
      "MEDIUM": 6,
      "LOW": 3
    }
  },
  "recentOrUrgentTickets": [
    {
      "id": 145,
      "ticketNo": "TKT-2026-000145",
      "summary": "VPN gateway connection error",
      "itPriority": "HIGH",
      "currentStatus": "OPEN",
      "ticketOwner": null,
      "updatedAt": "2026-09-25T14:15:00.000Z"
    }
  ],
  "myRecentActions": [
    {
      "id": 22,
      "ticketId": 142,
      "ticketNo": "TKT-2026-000142",
      "actionDescription": "Checked switch port",
      "status": "COMPLETED",
      "actionDateTime": "2026-09-25T13:45:00.000Z"
    }
  ]
}
```
- **Metric Definitions & Exact Drill-down URLs:**
  1. `unassignedTickets`: count where `ticketOwnerId === null` and `currentStatus` in active group. Drill-down: `/staff/queue?owner=unassigned&statusGroup=open`.
  2. `myAssignedTickets`: count where `ticketOwnerId === currentUser.id` and `currentStatus` not in (`CLOSED`, `CANCELLED`). Drill-down: `/staff/queue?owner=me&statusGroup=active`.
  3. `openQueueTickets`: count where `currentStatus` in active group. Drill-down: `/staff/queue?statusGroup=open`.
  4. `ticketsWaitingForRequester`: count where `currentStatus === 'WAITING_FOR_REQUESTER'`. Drill-down: `/staff/queue?status=WAITING_FOR_REQUESTER`.
  5. `myActionsTakenCount`: count where `performedById === currentUser.id` and `status === 'COMPLETED'`.
  6. `myRecentActions`: actions where `performedById === currentUser.id`, sorted `actionDateTime DESC, id DESC`, limit 5.
  7. `recentOrUrgentTickets`: top 5 active tickets prioritizing `itPriority === HIGH DESC`, then `updatedAt DESC`, then `id DESC`.

---

### 4.4 Administrator Dashboard
- **Method / Path:** `GET /api/dashboard/admin`
- **Authorization:** `ADMINISTRATOR` only.
- **Success Response (200 OK):**
```json
{
  "staffMetrics": { ... },
  "userMetrics": {
    "totalUsers": 25,
    "activeUsers": 23,
    "inactiveUsers": 2,
    "usersByRole": {
      "REQUESTER": 15,
      "IT_STAFF": 8,
      "ADMINISTRATOR": 2
    }
  },
  "recentOrUrgentTickets": [ ... ],
  "myRecentActions": [ ... ]
}
```
- **Navigation Rule:** On Administrator Dashboard, ticket rows link to `/admin/tickets/:id`.
