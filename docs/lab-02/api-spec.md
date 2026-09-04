# Lab 2 REST API Specification

**Contract version:** `1.1.1` (updated 2026-09-04 — adds strict validation for Phase 4 query parameters)

Companion to `docs/lab-02/specification.md`. Every decision here traces back to a Business Rule
(BR-xx) or Acceptance Criterion (AC-xx) in that document.

---

## 1. Base URL & Conventions

- All paths are relative to `/api`.
- All request and response bodies are `application/json` unless the endpoint is a file
  upload (`multipart/form-data`) or a file download (binary stream).
- All timestamps are ISO-8601 UTC strings, e.g. `2026-08-29T10:00:00.000Z`.
- All IDs in paths are positive integers. A non-numeric ID in a path segment (e.g.
  `GET /api/tickets/abc`) returns `400 Bad Request` before any ownership check runs.

## 2. Authentication & Testing Header

Every endpoint that operates on Requester-owned data requires:

```
X-Requester-Id: <integer>
```

This is **not authentication** (BR-03). It is read on every request and validated per BR-06:

| Header value | Result |
|---|---|
| Missing entirely | `401 Unauthorized` |
| Present but not a positive integer (e.g. `abc`, `-1`, `1.5`) | `400 Bad Request` |
| A positive integer that does not match any `RequesterUser.id` | `401 Unauthorized` |
| A positive integer matching a Requester with `isActive = false` | `401 Unauthorized` |
| A positive integer matching an active Requester | Passes — this Requester is now "current" for the request |

Endpoints that do **not** require the header: `GET /api/requesters/active`,
`GET /api/categories`, `GET /api/related-systems` (public reference data).

## 3. Standard Error Response Contract

Every error response in this API uses one of exactly two shapes.

**Validation errors** (always `400`) carry field-level detail:
```json
{
  "error": "Validation failed",
  "details": {
    "summary": "Summary must be between 5 and 100 characters",
    "description": "Description is required"
  }
}
```

**Every other error** (`401`, `403`, `404`, `410`, `500`) is a flat message, never a `details` key:
```json
{
  "error": "Access denied: You do not own this ticket"
}
```

The frontend must never assume `details` exists — check the status code first.

## 4. Consolidated HTTP Status Codes

| Status | Meaning | Where it appears in this API |
|---|---|---|
| `200 OK` | Successful read or successful state-changing action that isn't a creation | List/detail retrieval, download, soft-remove |
| `201 Created` | New resource created | Create ticket, upload attachment |
| `400 Bad Request` | Malformed input | Missing/invalid fields, malformed ID or header, disallowed file type/size |
| `401 Unauthorized` | No usable Requester context | Missing/unknown/inactive `X-Requester-Id` |
| `403 Forbidden` | Authenticated-for-testing but not the owner | Cross-Requester access to a ticket or its attachments |
| `404 Not Found` | Resource genuinely does not exist | Ticket ID or Attachment ID not in the database at all |
| `410 Gone` | Resource existed but was soft-removed | Downloading a removed attachment |
| `500 Internal Server Error` | Unexpected server-side failure | DB connection loss, filesystem error, ticket-number collision exhausted retries |

## 5. File Storage & Safe Filename Policy

- **Storage location:** `server/uploads/` — outside the public web root. Files are never served by
  a static file middleware; they are only reachable through the authenticated download endpoint.
- **On-disk filename generation:** `<timestamp>-<random>-<sanitized-original-name>`, e.g.
  `1735459200000-a91f3c-invoice_screenshot.png`.
- **Sanitization algorithm** (applied to the original filename before it is used in the generated
  name):
  1. Strip any path component — reject `/`, `\`, and any `..` sequence outright rather than
     stripping and continuing, to close path-traversal attempts.
  2. Replace any character outside `[A-Za-z0-9._-]` with `_`.
  3. Collapse repeated `_` into one.
  4. Truncate the sanitized base name to 100 characters, preserving the file extension.
  5. Verify the file extension is one of `.jpg .jpeg .png .webp .pdf` **and** that it matches the
     detected MIME type family (e.g. reject a `.jpg` file whose actual bytes are a PDF, and vice
     versa) — this defeats a renamed-extension upload attempt.
- **Display metadata:** the database's `fileName` column always holds the Requester's original,
  human-readable name (post-sanitization is not applied here — only to the on-disk name) and is
  what appears in the UI and in the `Content-Disposition` header on download.

## 6. Endpoints

### 6.1 `GET /api/requesters/active`
Returns only Development Requesters with `isActive = true` (BR-05), ordered by `id asc` for a
deterministic selector. No header required.

**200 OK**
```json
[
  { "id": 1, "name": "Jennifer Anderson", "email": "jennifer.a@example.com", "department": "Marketing" },
  { "id": 2, "name": "Sarah Johnson", "email": "sarah.j@example.com", "department": "Finance" }
]
```
If there are zero active Requesters, returns `200 OK` with `[]` — this is not an error; the
frontend renders the "no active Requesters" empty state (Section 8.1 of the labsheet), not a
failure banner.

**500 Internal Server Error** (DB unreachable)
```json
{ "error": "Unable to load Development Requesters. Please try again." }
```

---

### 6.2 `GET /api/categories`
Returns active Categories. No header required.

**200 OK**
```json
[
  { "id": 1, "name": "Account and Access" },
  { "id": 2, "name": "Hardware" },
  { "id": 3, "name": "Software" },
  { "id": 4, "name": "Network" }
]
```

---

### 6.3 `GET /api/related-systems`
Returns active Related Systems. No header required.

**200 OK**
```json
[
  { "id": 1, "name": "Corporate Laptop" },
  { "id": 2, "name": "Email" },
  { "id": 3, "name": "Campus Wi-Fi" }
]
```

---

### 6.4 `POST /api/tickets`
Creates a ticket for the current Requester. Requires `X-Requester-Id`.

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

**401 Unauthorized** (BR-06):
```json
{ "error": "Requester context is missing or invalid" }
```

**500 Internal Server Error** — after 3 failed ticket-number generation retries (BR-01):
```json
{ "error": "Unable to create ticket. Please try again." }
```

---

### 6.5 `GET /api/tickets` — List My Tickets

Requires `X-Requester-Id`. Always scoped to the current Requester (BR-04, FR-06) — there is no
way to request another Requester's tickets through this endpoint; the header alone determines
scope.

**Query Parameters**

| Param | Type | Default | Notes |
|---|---|---|---|
| `search` | string | — | matches `ticketNo` OR `summary`, case-insensitive, partial |
| `categoryId` | integer \| `ALL` | `ALL` | invalid integer or non-ALL value → `400` |
| `requestedPriority` | `LOW\|MEDIUM\|HIGH\|ALL` | `ALL` | unsupported value → `400` |
| `itPriority` | `LOW\|MEDIUM\|HIGH\|ALL` | `ALL` | unsupported value → `400` |
| `status` | `NEW\|IN_PROGRESS\|RESOLVED\|ALL` | `ALL` | unsupported value → `400` |
| `sortBy` | `createdAt\|updatedAt\|ticketNo\|requestedPriority\|itPriority\|currentStatus` | `createdAt` | unsupported value → `400` |
| `sortOrder` | `asc\|desc` | `desc` | unsupported value → `400` |
| `page` | integer | `1` | out-of-range is clamped (BR-12), not rejected |
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

**400 Bad Request** — unsupported query parameters (`sortBy`, `sortOrder`, `limit`, `categoryId`, `requestedPriority`, `itPriority`, `status`):
```json
{ "error": "Validation failed", "details": { "limit": "limit must be one of 5, 8, 10, 20" } }
```

**401 Unauthorized** — per BR-06.

---

### 6.6 `GET /api/tickets/:id` — Ticket Detail

Requires `X-Requester-Id`. Returns the full ticket including its attachment list.

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

**401 Unauthorized** — per BR-06.

---

### 6.7 `POST /api/tickets/:id/attachments` — Upload Attachment

Requires `X-Requester-Id`. `Content-Type: multipart/form-data`, field name `file`. Enforces
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

### 6.8 `GET /api/attachments/:id/download`

Requires `X-Requester-Id`. Streams the file with a `Content-Disposition: attachment;
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

### 6.9 `DELETE /api/attachments/:id` — Soft-remove Attachment

Requires `X-Requester-Id`. `Content-Type: application/json`.

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

## 7. Error Scenario Matrix (Quick Reference)

| Endpoint | Scenario | Status | Trigger |
|---|---|---|---|
| Any Requester-scoped endpoint | Header missing | `401` | No `X-Requester-Id` sent |
| Any Requester-scoped endpoint | Header not a positive integer | `400` | e.g. `X-Requester-Id: abc` |
| Any Requester-scoped endpoint | Header points to unknown id | `401` | Deleted/never-existed Requester |
| Any Requester-scoped endpoint | Header points to inactive Requester | `401` | `isActive = false` |
| `POST /api/tickets` | Empty/short/long Summary or Description | `400` | BR-09 |
| `POST /api/tickets` | Invalid/inactive `categoryId` or `relatedSystemId` | `400` | Reference check |
| `POST /api/tickets` | Ticket-number retries exhausted | `500` | BR-01 |
| `GET /api/tickets` | Unsupported `sortBy`/`limit` | `400` | Query validation |
| `GET /api/tickets` | `page` out of range | `200` (clamped) | BR-12 — **not** an error |
| `GET /api/tickets/:id` | Ticket owned by another Requester | `403` | BR-04 |
| `GET /api/tickets/:id` | Ticket ID does not exist | `404` | — |
| `POST /api/tickets/:id/attachments` | File > 5 MB | `400` | BR-07 |
| `POST /api/tickets/:id/attachments` | Disallowed type / spoofed extension | `400` | BR-07, Section 5 |
| `POST /api/tickets/:id/attachments` | 5 active attachments already exist | `400` | BR-07 |
| `POST /api/tickets/:id/attachments` | Ticket owned by another Requester | `403` | BR-04 |
| `POST /api/tickets/:id/attachments` | Ticket ID does not exist | `404` | Missing-resource behavior |
| `POST /api/tickets/:id/attachments` | Disk write failure | `500` | BR-18 — ticket is unaffected |
| `GET /api/attachments/:id/download` | Attachment soft-removed | `410` | BR-08 |
| `GET /api/attachments/:id/download` | Attachment's ticket owned by another Requester | `403` | BR-04 |
| `GET /api/attachments/:id/download` | Attachment ID does not exist | `404` | Missing-resource behavior |
| `DELETE /api/attachments/:id` | Missing/short reason | `400` | Section 6.9 |
| `DELETE /api/attachments/:id` | Already removed | `409` | Idempotency guard |
| `DELETE /api/attachments/:id` | Attachment owned by another Requester | `403` | BR-04 |
| `DELETE /api/attachments/:id` | Attachment ID does not exist | `404` | Missing-resource behavior |

## 8. Example End-to-End Walkthrough (for the coding agent / reviewer)

1. `GET /api/requesters/active` → pick Requester `1`.
2. `GET /api/categories`, `GET /api/related-systems` → populate the Create Ticket dropdowns.
3. `POST /api/tickets` with `X-Requester-Id: 1` → `201`, note `id: 101`, `ticketNo:
   "TKT-2026-000101"`.
4. `POST /api/tickets/101/attachments` with `X-Requester-Id: 1`, a valid PDF → `201`.
5. `GET /api/tickets?search=battery` with `X-Requester-Id: 1` → `200`, ticket `101` appears.
6. `GET /api/tickets/101` with `X-Requester-Id: 2` (a **different** Requester) → `403` — this is
   the single most important negative test in the whole sprint (BR-04, AC-08).
7. `DELETE /api/attachments/5001` with `X-Requester-Id: 1`, reason `"wrong file"` → `200`.
8. `GET /api/attachments/5001/download` with `X-Requester-Id: 1` → `410`.
