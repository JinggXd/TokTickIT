# TokTickIT — REST API Specification (Lab 3)

**Document Version:** 1.1.0
**Status:** REVISED DRAFT — Contract corrections; implementation gates remain open
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
- `404 Not Found`: Target resource genuinely does not exist; foreign Requester resources remain 403.
- `405 Method Not Allowed`: Method not supported (e.g., PUT/PATCH/DELETE on append-only comments).
- `409 Conflict`: Concurrency conflict (stale version), duplicate unique email, or double-claim.
- `410 Gone`: Attachment was soft-removed; no file bytes are served.
- `413 Content Too Large`: JSON exceeds the 16 KiB limit; multipart file validation remains 400.
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
*Includes HTTP Header:* `Retry-After: <remaining-window-seconds>` (900 at a full-window example).
```json
{
  "error": "TOO_MANY_ATTEMPTS",
  "message": "Too many failed login attempts. Please try again later."
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
  `Set-Cookie: toktickit_session=<opaque-base64url-token>; Path=/; HttpOnly; SameSite=Lax; Max-Age=28800`
- **Response `200 OK` (Standard Active Session):**
```json
{
  "user": {
    "id": 2,
    "name": "Sarah Johnson",
    "email": "sarah.j@example.com",
    "role": "REQUESTER",
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

### 2.6 Session, CSRF and Password Decisions

- Session: 32 random bytes encoded as base64url in `toktickit_session`; persist SHA-256(token)
  as Session.id, never the raw cookie. Save userId, sessionVersion, csrfToken, createdAt and
  expiresAt. Absolute expiry is 8 hours; compare server time on every request. Role/activation
  changes and resets revoke sessions; check current active user/sessionVersion per request.
- Login always creates a new session. Password change atomically changes the hash, clears the
  forced-change flag, revokes other sessions, rotates this cookie and CSRF token, and returns
  the new safe user. Old cookie replay is 401. Failure leaves the existing password intact.
- Cookie flags: HttpOnly, SameSite=Lax, Path=/, Max-Age=28800, no Domain; Secure over HTTPS.
  Secure may be false only for local HTTP development. Logout clears the same scoped cookie,
  revokes the server session and returns 204. Missing/already revoked session logout also
  returns 204 after trusted-Origin validation; all other business access is 401.
- Local UI origin is http://localhost:5173. Browser API calls use relative /api and
  credentials: include. CORS permits only the configured exact UI origin with credentials;
  no wildcard. Auth/user/private responses use Cache-Control: no-store.
- POST login requires trusted exact Origin but no session CSRF token. All authenticated
  POST/PATCH/PUT/DELETE requests (including multipart upload, password change and logout)
  require trusted Origin AND `X-CSRF-Token` equal to the session-bound token returned by
  GET /api/auth/csrf. Missing/untrusted Origin or invalid token is 403
  `{"error":"CSRF_INVALID","message":"Refresh the page and try again."}`. Safe GETs require
  normal auth/role checks; /csrf also validates Origin when present. No CSRF token in URLs.
- Forced-change sessions may access only me/logout/change-password/csrf. Login success must
  route mustChangePassword users to change-password before any intended route restoration.
- Password length is 12–128 Unicode code points; preserve spaces and Unicode without trimming
  or normalization. Confirmation must match and the new password must differ from the current
  password. Wrong current password is 400 field error, not a successful credential update.
  Use Argon2id with memoryCost=19456 KiB, timeCost=2, parallelism=1, a fresh random salt
  of at least 16 bytes and 32-byte hash output. This uses the
  [OWASP minimum profile](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html).
  The package/version and manifest/lockfile diff still require dependency approval before P04;
  this document does not install it. Profile performance without weakening these settings.
- Login rate limit: track independent normalized-email and client-IP buckets. Allow up to five
  failed attempts per bucket in a 15-minute window; later attempts are 429 until window expiry.
  Retry-After is remaining whole seconds rounded up (1–900), not always 900. Use controlled
  time in tests. Do not permanently lock accounts. Invalid credentials/unknown/inactive user
  receive the same 401 body; no hash/credential data in responses or logs.
- Malformed JSON, missing/non-string inputs or excessive field length: 400 field validation.
  Invalid email syntax or wrong/unknown/inactive credentials with otherwise well-typed input:
  generic 401. All password operations use the length policy. JSON body limit 16 KiB;
  oversized JSON returns 413 `{"error":"Request body too large"}` before expensive hashing.
  Attachment requests retain Lab 2 multipart limits and 400 file validation.

## 3. Requester Ticket and Attachment Endpoints (Lab 2 Compatibility)

This section incorporates Lab 2 api-spec.md §6.4–6.9 with the identity change and explicit
Lab 3 additions below. BR references within inherited rules refer to the Lab 2 contract.
All original validation messages, business fields, filename rules (§5 of Lab 2 api-spec.md),
attachment limits and independent ticket/upload transactions remain binding.

- Ignore `X-Requester-Id` (even malformed) and client `requesterId` in body/query; derive
  ownership only from the session. Without a session, a header never grants access (401).
- Requester routes require REQUESTER, except the shared download permission stated in §3.5.
  Reference routes `GET /api/categories` and `GET /api/related-systems` keep Lab 2 array DTOs,
  now require any completed-password active session. Retire `/api/requesters/active` (404).
- Missing/expired/revoked sessions return 401 `{"error":"Authentication required"}`.
  Forced-change and role denials use §1.2. Foreign resources retain the exact Lab 2 403 body.
- Existing list query names and `data`/`pagination` envelope are unchanged. Add only the five
  new statuses to the allowlist; no `category`, `priority`, or `pageSize` aliases are introduced.
- List/detail owner names and workflow/IT Priority values now reflect current database values.
  Detail adds only `version`, `appearsResolvedAt`, and `appearsResolvedById`. Comment/note
  bodies remain separate endpoints. Requester DTOs contain no note fields or counts.
- Legacy POST /api/tickets ignores supplied operational/system fields as in Lab 2 and derives
  defaults on the server. A Requester calling Staff mutation endpoints gets 403. No generic
  PATCH /api/tickets/:id mutation is introduced.

### 3.1 `POST /api/tickets`
Creates a ticket for the current Requester. Requires an active REQUESTER session with completed password change.

**Request Body**
```json
{
  "summary": "Laptop battery drains quickly",
  "description": "My laptop battery drains in less than an hour after the update.",
  "categoryId": 2,
  "relatedSystemId": 1,
  "requestedPriority": "MEDIUM"
}
```

| Field | Type | Rule |
|---|---|---|
| `summary` | string | required, trimmed length 5–100 (BR-09) |
| `description` | string | required, trimmed length 10–2000 (BR-09) |
| `categoryId` | integer | required, must reference an active Category |
| `relatedSystemId` | integer | required, must reference an active Related System |
| `requestedPriority` | `"LOW" \| "MEDIUM" \| "HIGH"` | required |

**201 Created**
```json
{
  "id": 101,
  "ticketNo": "TKT-2026-000101",
  "summary": "Laptop battery drains quickly",
  "description": "My laptop battery drains in less than an hour after the update.",
  "requestedPriority": "MEDIUM",
  "itPriority": "MEDIUM",
  "currentStatus": "NEW",
  "requesterId": 1,
  "createdAt": "2026-08-29T10:00:00.000Z"
}
```

**400 Bad Request** — validation failure (one entry per invalid field, all collected in one
response, not one-at-a-time):
```json
{
  "error": "Validation failed",
  "details": {
    "summary": "Summary must be between 5 and 100 characters",
    "categoryId": "Category is required",
    "requestedPriority": "Requested priority must be LOW, MEDIUM, or HIGH"
  }
}
```

**400 Bad Request** — reference not found or inactive:
```json
{ "error": "Validation failed", "details": { "categoryId": "Category does not exist or is inactive" } }
```

**401 Unauthorized** (session authentication):
```json
{ "error": "Authentication required" }
```

**500 Internal Server Error** — after 3 failed ticket-number generation retries (BR-01):
```json
{ "error": "Unable to create ticket. Please try again." }
```

---

### 3.2 `GET /api/tickets` — List My Tickets

Requires an active REQUESTER session with completed password change. Always scoped to the current Requester (BR-04, FR-06) — there is no
way to request another Requester's tickets through this endpoint; session identity alone determines
scope.

**Query Parameters**

| Param | Type | Default | Notes |
|---|---|---|---|
| `search` | string | — | matches `ticketNo` OR `summary`, case-insensitive, partial |
| `categoryId` | integer \| `ALL` | `ALL` | invalid integer or non-ALL value → `400` |
| `requestedPriority` | `LOW\|MEDIUM\|HIGH\|ALL` | `ALL` | unsupported value → `400` |
| `itPriority` | `LOW\|MEDIUM\|HIGH\|ALL` | `ALL` | unsupported value → `400` |
| `status` | all eight Lab 3 statuses or `ALL` | `ALL` | unsupported value → `400` |
| `sortBy` | `createdAt\|updatedAt\|ticketNo\|requestedPriority\|itPriority\|currentStatus` | `createdAt` | unsupported value → `400` |
| `sortOrder` | `asc\|desc` | `desc` | unsupported value → `400` |
| `page` | integer | `1` | non-integer value → `400`; out-of-range integer is clamped (BR-12), not rejected |
| `limit` | `5\|8\|10\|20` | `8` | unsupported value → `400` |

**200 OK**
```json
{
  "data": [
    {
      "id": 101,
      "ticketNo": "TKT-2026-000101",
      "summary": "Laptop battery drains quickly",
      "categoryName": "Hardware",
      "relatedSystemName": "Corporate Laptop",
      "requestedPriority": "MEDIUM",
      "itPriority": "MEDIUM",
      "currentStatus": "NEW",
      "ticketOwnerName": "Unassigned",
      "createdAt": "2026-08-29T10:00:00.000Z",
      "updatedAt": "2026-08-29T10:00:00.000Z"
    }
  ],
  "pagination": { "currentPage": 1, "pageSize": 8, "totalItems": 1, "totalPages": 1 }
}
```
Zero matching rows still returns `200 OK` with `"data": []` — never an error. The frontend, not
the API, decides whether that means Empty State or No-Results State (BR-13), based on whether any
search/filter param was supplied.

**400 Bad Request** — unsupported query parameters (`sortBy`, `sortOrder`, `limit`, `page`, `categoryId`, `requestedPriority`, `itPriority`, `status`):
```json
{ "error": "Validation failed", "details": { "limit": "limit must be one of 5, 8, 10, 20" } }
```

**401 Unauthorized** — missing/expired/revoked session per §2; forced password change is 403.

---

### 3.3 `GET /api/tickets/:id` — Ticket Detail

Requires an active REQUESTER session with completed password change. Returns the full ticket including its attachment list.

**200 OK**
```json
{
  "id": 101,
  "ticketNo": "TKT-2026-000101",
  "summary": "Laptop battery drains quickly",
  "description": "My laptop battery drains in less than an hour after the update.",
  "categoryName": "Hardware",
  "relatedSystemName": "Corporate Laptop",
  "requestedPriority": "MEDIUM",
  "itPriority": "MEDIUM",
  "currentStatus": "NEW",
  "ticketOwnerName": "Unassigned",
  "requesterId": 1,
  "createdAt": "2026-08-29T10:00:00.000Z",
  "updatedAt": "2026-08-29T10:00:00.000Z",
  "version": 1,
  "appearsResolvedAt": null,
  "appearsResolvedById": null,
  "attachments": [
    {
      "id": 5001,
      "fileName": "battery_report.pdf",
      "fileSize": 214532,
      "mimeType": "application/pdf",
      "removedAt": null,
      "removalReason": null,
      "createdAt": "2026-08-29T10:01:00.000Z"
    },
    {
      "id": 5002,
      "fileName": "screenshot.png",
      "fileSize": 88210,
      "mimeType": "image/png",
      "removedAt": "2026-08-29T11:00:00.000Z",
      "removalReason": "Uploaded the wrong screenshot",
      "createdAt": "2026-08-29T10:05:00.000Z"
    }
  ]
}
```

**403 Forbidden** (BR-04, AC-08) — the ticket exists but belongs to a different Requester:
```json
{ "error": "Access denied: You do not own this ticket" }
```

**404 Not Found** — the ticket ID does not exist at all:
```json
{ "error": "Ticket not found" }
```

**401 Unauthorized** — missing/expired/revoked session per §2; forced password change is 403.

---

### 3.4 `POST /api/tickets/:id/attachments` — Upload Attachment

Requires an active REQUESTER session with completed password change. `Content-Type: multipart/form-data`, field name `file`. Enforces
ownership (only the ticket's owner may add an attachment) and the 5-active-file limit (BR-07).

**201 Created**
```json
{
  "id": 5003,
  "ticketId": 101,
  "fileName": "second_report.pdf",
  "fileSize": 190211,
  "mimeType": "application/pdf",
  "removedAt": null,
  "removalReason": null,
  "createdAt": "2026-08-29T12:00:00.000Z"
}
```

**400 Bad Request** — oversized file:
```json
{ "error": "Validation failed", "details": { "file": "File exceeds the 5 MB size limit" } }
```

**400 Bad Request** — disallowed extension or MIME/extension mismatch:
```json
{ "error": "Validation failed", "details": { "file": "Only JPG, JPEG, PNG, WEBP, and PDF files are allowed" } }
```

**400 Bad Request** — active-attachment limit reached:
```json
{ "error": "Validation failed", "details": { "file": "This ticket already has 5 active attachments" } }
```

**403 Forbidden** — ticket exists but belongs to another Requester.

**404 Not Found** — ticket ID does not exist.

**500 Internal Server Error** — disk write failure (BR-18: the ticket itself is unaffected):
```json
{ "error": "Unable to save the attachment. Please try again." }
```

---

### 3.5 `GET /api/attachments/:id/download`

Requires an active session with completed password change. REQUESTER may download own files; IT_STAFF and ADMINISTRATOR may download any ticket's active files. Streams the file with a `Content-Disposition: attachment;
filename="<original fileName>"` header.

**200 OK** (AC-21) — binary stream of the active file with the documented MIME type and original
download filename.

**403 Forbidden** — the attachment's ticket belongs to another Requester:
```json
{ "error": "Access denied: You do not own this attachment" }
```

**404 Not Found** — attachment ID does not exist:
```json
{ "error": "Attachment not found" }
```

**410 Gone** (BR-08, AC-17) — attachment exists but was soft-removed:
```json
{ "error": "This attachment has been removed and cannot be downloaded" }
```

---

### 3.6 `DELETE /api/attachments/:id` — Soft-remove Attachment

Requires an active REQUESTER session with completed password change. `Content-Type: application/json`.

**Request Body**
```json
{ "removalReason": "Uploaded incorrect log file" }
```
| Field | Type | Rule |
|---|---|---|
| `removalReason` | string | required, trimmed, 3–200 characters |

**200 OK**
```json
{ "id": 5002, "removedAt": "2026-08-29T11:00:00.000Z", "removalReason": "Uploaded incorrect log file" }
```

**400 Bad Request** — missing/too-short reason:
```json
{ "error": "Validation failed", "details": { "removalReason": "A removal reason is required (3–200 characters)" } }
```

**403 Forbidden** — attachment belongs to another Requester's ticket.

**404 Not Found** — attachment ID does not exist.

**409 Conflict** — attachment was already removed (idempotency guard so a double-click on Remove
doesn't silently overwrite the original reason):
```json
{ "error": "This attachment has already been removed" }
```

---

### 3.7 `POST /api/tickets/:id/appears-resolved`
- **Access:** `REQUESTER` role only. Ticket must be owned by authenticated user.
- **Permitted Statuses:** `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `REOPENED`.
- **Request:** Empty JSON object. Legacy requesterId is ignored; reject forged actor/time/status fields with 400 field validation.
- **Rules:** Check ownership and permitted status first. First invocation sets both fields from the server; repeated invocation in a permitted status returns the original indicator without changing timestamp/status. The write is atomic with concurrent Staff status changes and increments version once on first success.
- **Errors:** Foreign ticket 403 inherited ticket error; missing ticket 404; disallowed status 400 `{"error":"APPEARS_RESOLVED_NOT_ALLOWED","message":"This ticket cannot be marked as appears resolved in its current status."}`.
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
- **Validation:** Length 1–2,000 Unicode code points after trimming; preserve line breaks and render as plain text. Reject non-string, empty or oversized body and forged author/time fields with 400. Server supplies author and creation time.
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
- **Access:** `IT_STAFF` only. Same content validation and author/time rules as §4.2.
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

### 4.5 Shared Communication Rules

Order each list by createdAt asc, id asc. Public-comment ownership denial is the flat Lab 2
403 ticket error; missing ticket is 404. Notes deny Requesters before any resource lookup,
including absent ticket IDs. Admin may read both threads but cannot post either.
Allowed body keys are only `body`; reject forged authorId/createdAt/visibility with 400.
Validation uses `{"error":"Validation failed","details":{"body":"Body must be between 1 and 2000 characters"}}`.
Store trimmed plain text; escape on rendering, never evaluate HTML or silently strip the user's text.
For authenticated permitted roles, PUT/PATCH/DELETE on either thread collection or its
`/:entryId` path returns 405 `{"error":"Method not allowed"}` with `Allow: GET, POST`
for collections; individual entry paths have no supported operations and return 405 with
an empty `Allow` header (no supported methods). There are no entry read/edit/delete capabilities in this increment.
Role/ownership guards run before the method rejection and no entry content is returned.

---

## 5. IT Staff Queue & Operational Endpoints

### 5.1 `GET /api/staff/tickets`
- **Access:** `IT_STAFF` role only.
- **Query Parameters:**
  - `search` (string, ticketNo or summary)
  - `categoryId` (positive integer)
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
  "unfilteredTotal": 35,
  "pagination": {
    "page": 1,
    "pageSize": 10,
    "total": 35,
    "totalPages": 4
  }
}
```

---

Queue rules: search is trimmed, case-insensitive partial match of ticketNo OR summary.
All filters combine with AND; omitted filters mean all. Owner is all/me/unassigned or a
positive active Staff/Admin ID; `me` uses the session. No filter uses client role/identity.
Default ordering is updatedAt desc, id desc. Other sorts append id desc as a tie-breaker.
Priority asc is LOW, MEDIUM, HIGH; desc reverses it. Status asc follows NEW, OPEN,
IN_PROGRESS, WAITING_FOR_REQUESTER, RESOLVED, CLOSED, REOPENED, CANCELLED; desc reverses it.
Page must be a positive integer; invalid/repeated/unknown query keys or enum values return
400 with a field in `details` (`Invalid query parameter`). pageSize is 10/20/50 only.
Page beyond the last returns an empty tickets array with the requested page unchanged;
totalPages is ceil(total/pageSize), or 0 when total is 0. Counts and rows use one consistent
snapshot. unfilteredTotal counts all tickets visible to Staff before filters. This is deliberately
a separate queue contract; Requester pagination still clamps as in Lab 2.

### 5.2 `POST /api/staff/tickets/:id/claim`
- **Access:** `IT_STAFF` only.
- **Precondition:** `ticketOwnerId === null`. Any assigned ticket, including one owned by the caller, returns the already-assigned 409. Validate expectedVersion before this check; stale version uses the global CONFLICT envelope.
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
- **Validation:** `ownerId` must be a positive integer corresponding to an active `IT_STAFF` or `ADMINISTRATOR`. Null/manual unassign is excluded. Inactive, unknown or Requester owners return 400 with `details.ownerId: "Owner must be an active IT Staff or Administrator"`. Reassign may also assign an unassigned ticket.
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

### 5.6 `GET /api/staff/tickets/:id` and `GET /api/admin/tickets/:id`

Staff path: IT_STAFF only. Admin path: ADMINISTRATOR only, read-only.
Both return the same explicit safe detail DTO with 200; missing ticket is 404
`{"error":"Ticket not found"}`. Requester or wrong route-role access is 403.

```json
{
  "id": 101,
  "ticketNo": "TKT-2026-000101",
  "summary": "VPN disconnects",
  "description": "The VPN disconnects when opening the internal portal.",
  "requester": {"id": 1, "name": "Jennifer Anderson", "email": "jennifer.a@example.com", "department": "Marketing"},
  "category": {"id": 1, "name": "Network"},
  "relatedSystem": {"id": 3, "name": "VPN"},
  "requestedPriority": "MEDIUM",
  "itPriority": "HIGH",
  "currentStatus": "IN_PROGRESS",
  "ticketOwner": {"id": 12, "name": "Alex IT", "role": "IT_STAFF"},
  "version": 3,
  "appearsResolvedAt": null,
  "appearsResolvedById": null,
  "createdAt": "2026-09-08T08:30:00.000Z",
  "updatedAt": "2026-09-09T14:20:00.000Z",
  "attachments": [{"id": 5001, "fileName": "report.pdf", "fileSize": 214532, "mimeType": "application/pdf", "removedAt": null, "removalReason": null, "createdAt": "2026-09-08T08:31:00.000Z"}]
}
```

Owner is null when unassigned; department is read-only legacy metadata. Attachments are the
same safe metadata as §3.3, including removed entries. Use §3.5 to download active files;
Staff/Admin get no upload/remove permission. Comments and notes are loaded separately.

### 5.7 `GET /api/staff/ticket-owners`

IT_STAFF only. No query parameters. Return only active Staff/Admin, sorted name asc, id asc.
200 returns a JSON array (empty array if none):

```json
[{"id":12,"name":"Alex IT","role":"IT_STAFF"},{"id":20,"name":"System Admin","role":"ADMINISTRATOR"}]
```

No emails, credentials, or account-management data. Revalidate eligibility in the mutation
transaction even if the account became inactive after this list was fetched.

### 5.8 Mutation and Workflow Validation

All Staff mutations require a positive integer expectedVersion and return 400 field validation
if it is missing/invalid. Version comparison and update are atomic; increment version once and
set updatedAt on success. Stale values return the global 409 CONFLICT body before applying
business changes. Unknown mutation fields return 400 `details.<field>: "Field is not permitted"`.
Missing ticket returns 404. Invalid priority returns 400 `details.itPriority`.
Validate all 64 status pairs using BR-14: 17 allowed, 47 rejected. Only CANCELLED is terminal.
Transitions to OPEN, IN_PROGRESS, WAITING_FOR_REQUESTER or RESOLVED require an active eligible
owner (400 `{"error":"ELIGIBLE_OWNER_REQUIRED","message":"Assign an active IT Staff or Administrator before this transition."}`).
Reopening clears appearsResolvedAt and appearsResolvedById in the same versioned update.
No Actions Taken prerequisite. UI confirms RESOLVED/CLOSED/CANCELLED/REOPENED intent; API
still performs transition and ownership validation regardless of UI behavior.

---

## 6. Administrator User Management Endpoints

### 6.1 `GET /api/admin/users`
- **Access:** `ADMINISTRATOR` role only.
- **Query Parameters:** `search` (trimmed, case-insensitive partial name OR email), `role` (`REQUESTER` | `IT_STAFF` | `ADMINISTRATOR`, optional single filter). Combine with AND, sort name asc then id asc; no pagination. Unknown/repeated parameters or invalid role return 400 field validation.
- **Response `200 OK`:**
```json
{
  "users": [
    {
      "id": 1,
      "name": "Jennifer Anderson",
      "email": "jennifer.a@example.com",
      "role": "REQUESTER",
      "isActive": true,
      "mustChangePassword": false,
      "createdAt": "2026-08-30T10:00:00.000Z"
    },
    {
      "id": 12,
      "name": "Alex IT",
      "email": "alex.it@example.com",
      "role": "IT_STAFF",
      "isActive": true,
      "mustChangePassword": false,
      "createdAt": "2026-08-30T10:00:00.000Z"
    },
    {
      "id": 20,
      "name": "System Admin",
      "email": "admin@example.com",
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

### 6.5 Administration Validation and Atomic Safety

Create requires name (trimmed 1–100 Unicode code points), email (trimmed/lowercase, valid
address, max 254 characters), one permitted role, boolean isActive and initialPassword
(policy §2.6). Edit is nonempty partial update of name/email/role/isActive only, with the
same validation. Reject all other keys including department, passwordHash, mustChangePassword
and role arrays with 400 `details.<field>: "Field is not permitted"` or field validation.
Reset accepts only initialPassword. Missing user is 404 `{"error":"User not found"}`.
Successful edit returns the example §6.3 fields with unassignedTicketsCount (0 if unaffected).

Duplicate canonical email on create or edit, including concurrent writes, returns the exact
409 DUPLICATE_EMAIL body in §6.2. Keeping one's existing email is valid.
Self-deactivation returns 400 `{"error":"SELF_DEACTIVATION","message":"You cannot deactivate your own account."}`.
Last-active-admin deactivation/demotion returns 400 `{"error":"LAST_ACTIVE_ADMIN","message":"At least one active Administrator must remain."}`.
Use a transaction with a shared admin-invariant lock/serializable retry; count-then-update
outside a protected transaction is insufficient. Concurrent demotions must preserve ≥1 active Admin.
Self-demotion is allowed only if another active Admin remains; revoke that caller's sessions.
Any role/activation change revokes sessions. Losing owner eligibility unassigns tickets,
increments each affected ticket version and returns the affected count atomically, preserving
requester/author relations and formal statuses. Concurrent assignment must serialize with this check.
Reset (including self-reset) revokes all target sessions, sets mustChangePassword and never
echoes the password. No delete/bulk/import/export or department-edit endpoint is introduced.

## 7. Shared Error Precedence and Safe Failures

For protected routes, validate session, forced-password state, role, CSRF (mutations), then
input/IDs, resource existence and Requester ownership, followed by version/business rules.
Private-note role denial precedes resource lookup; foreign attachment ownership precedes
removed-state inspection. All :id parameters are positive integers; malformed/zero/negative
IDs return 400 `{"error":"Validation failed","details":{"id":"ID must be a positive integer"}}`.
New endpoint validation uses the §1.2 details envelope. Unexpected errors on new endpoints
return 500 `{"error":"Unable to complete request. Please try again."}`; inherited Requester
endpoints retain their documented Lab 2 flat failure messages. Never include stack/SQL/secrets.
After guards, unknown routes return 404 `{"error":"Not found"}`. The explicit append-only
405 rules in §4.5 apply to communication routes. DTOs use explicit field selection.
