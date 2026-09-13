# TokTickIT — User Interface Specification (Lab 3)

**Document Version:** 1.1.0
**Status:** REVISED DRAFT — Contract corrections; implementation gates remain open
**Design System:** Zen Green Theme Tokens (Established in Lab 1 & 2)
**Standard Compliance:** CPE 334 Lab 3 UI Standards (§7, §8.6, §8.7)

---

## 1. Design System & Design Tokens (Zen Green)

TokTickIT reuses the Zen Green design tokens established in Lab 1 and Lab 2. No arbitrary colors, unvetted utility frameworks, or divergent themes are permitted.

### 1.1 Existing Palette and Component Rules

Reuse `client/src/styles/zen-green.css` and Lab 2 ui-spec.md §1–3 without replacing the
palette, typography, spacing, read-only fields, buttons or focus behavior.

| Token | Value | Use |
|---|---|---|
| `--zg-primary` | `#006B3C` | Header and primary actions |
| `--zg-secondary` | `#0B7A46` | Hover, links, focus accents |
| `--zg-pale-green` | `#EAF6EF` | Subtle selected backgrounds |
| `--zg-canvas` | `#F5F7F6` | Page background |
| `--zg-surface` | `#FFFFFF` | Cards and editable fields |
| `--zg-border` | `#D1DCD6` | Borders |
| `--zg-text-primary` | `#1A2E26` | Body text |
| `--zg-text-muted` | `#5A6E65` | Metadata |
| `--zg-readonly-bg` | `#F0F4F2` | Read-only fields |
| `--zg-error` / `--zg-error-bg` | `#DC2626` / `#FEE2E2` | Error feedback |
| `--zg-warning` / `--zg-warning-bg` | `#D97706` / `#FEF3C7` | Warning borders/icons/backgrounds |
| `--zg-success` / `--zg-success-bg` | `#15803D` / `#DCFCE7` | Success feedback |
| `--zg-shadow` | `0 1px 3px rgba(0,0,0,0.05)` | Card shadow |

### 1.2 Badge Reuse and Lab 3 Extensions

The existing NEW/IN_PROGRESS/RESOLVED and priority color pairs come from MyTickets.tsx and
RequesterTicketDetail.tsx. New statuses and roles reuse these established colors; text and
icons distinguish states. Extract/reuse presentation through an approved component patch.

| State / entity | Text | Background | Label |
|---|---|---|---|
| NEW | `#0369A1` | `#E0F2FE` | New |
| OPEN | `#0369A1` | `#E0F2FE` | Open |
| IN_PROGRESS | `#92400E` | `#FEF3C7` | In Progress |
| WAITING_FOR_REQUESTER | `#92400E` | `#FEF3C7` | Waiting for Requester |
| RESOLVED | `#15803D` | `#DCFCE7` | Resolved |
| CLOSED | `#475569` | `#F1F5F9` | Closed |
| REOPENED | `#B91C1C` | `#FEE2E2` | Reopened |
| CANCELLED | `#475569` | `#F1F5F9` | Cancelled |
| HIGH | `#B91C1C` | `#FEE2E2` | High |
| MEDIUM | `#B45309` | `#FEF3C7` | Medium |
| LOW | `#475569` | `#F1F5F9` | Low |
| REQUESTER | `#0369A1` | `#E0F2FE` | Requester |
| IT_STAFF | `#15803D` | `#DCFCE7` | IT Staff |
| ADMINISTRATOR | `#475569` | `#F1F5F9` | Administrator |

Use existing dark warning text `#92400E` on warning backgrounds; warning accent alone is
not body text. Each status/priority badge includes a label and icon, never color alone.

---

## 2. Viewport Breakpoints & Responsive Behavior

| Device Tier | Viewport Width Range | Layout Rules |
|---|---|---|
| **Desktop** | $\ge 992\text{px}$ (Test @ $1280\text{px}$) | Multi-column layouts, tabular queues with individual sortable columns, full horizontal nav bar |
| **Tablet** | $768\text{px} - 991\text{px}$ (Test @ $768\text{px}$) | Condensed tables or card lists, collapsible navbar hamburger, wrapped filter rows |
| **Mobile** | $< 768\text{px}$ (Test @ $375\text{px}$) | Single-column stacked card list, floating filter toggles, full-width buttons ($\ge 44\text{px}$ touch targets), no horizontal page scroll |

---

## 3. Screen Specifications

### 3.1 Screen 1: Login Screen (`/login`)
- **Route:** `/login`
- **Access:** Public. A forced-change session redirects to Change Password; otherwise redirect to the permitted role landing page.
- **Layout:** Centered card (`max-width: 440px`) on `--zg-canvas` background.
- **Components & Controls:**
  - Header: TokTickIT leaf logo, application title, and subtitle "Sign in to your account".
  - Email input: `type="email"`, auto-focus, placeholder `name@example.com`, label `Email address`.
  - Password input: `type="password"`, with accessible Show/Hide toggle button (`aria-label="Toggle password visibility"`).
  - Submit Button: Full-width button with text `Sign In`.
  - Feedback Banners:
    - *Submitting*: Button disabled with spinning indicator and text `Signing in...`.
    - *Error*: Red alert banner `Invalid email or password` or `Too many failed attempts. Please try again later.`

---

### 3.2 Screen 2: Change Password Screen (`/change-password`)
- **Route:** `/change-password`
- **Access:** Authenticated session.
- **Mandatory Guard:** Cannot navigate to other pages if `mustChangePassword === true`.
- **Layout:** Centered card (`max-width: 520px`).
- **Components & Controls:**
  - Alert banner: `You are required to set a new password before proceeding.`
  - Policy helper text: `Password must be between 12 and 128 characters.`
  - Current Password input.
  - New Password input.
  - Confirm New Password input.
  - Save Button: `Update Password`.
  - Inline error text below each field if requirements are unmet.

---

### 3.3 Screen 3: IT Staff Ticket Queue (`/staff/queue`)
- **Route:** `/staff/queue`
- **Access:** `IT_STAFF` role only.
- **Layout:**
  - **Top Bar:** Page headline `IT Staff Ticket Queue`, total ticket count from unfilteredTotal.
  - **Search & Filter Panel (`card-zen`):**
    - Search input: Placeholders `Search by ticket number or summary...`. Debounced at 300ms.
    - Category filter dropdown.
    - Requested Priority filter dropdown.
    - IT Priority filter dropdown.
    - Status filter dropdown (All 8 statuses).
    - Owner filter: Options `All Tickets`, `My Assigned Tickets`, `Unassigned Tickets`, or an active Staff/Admin from the eligible-owner list.
    - `Reset Filters` button: Clears all active filters and resets search.
  - **Desktop Queue Table:**
    - Group columns: `Ticket No / Updated`, `Summary / Category`, `Req. Priority`, `IT Priority`, `Status`, `Owner`, `Action`. Grouping avoids a wide mega-grid while retaining triage information.
    - Clickable headers for sorting: `itPriority`, `updatedAt`, `currentStatus`, `ticketNo`.
    - Action: `View / Manage` button navigating to Ticket Detail.
  - **Tablet & Mobile Card List:**
    - Stacked cards with clear label-value pairs.
    - Status and Priority badges prominent at top-right of each card.
    - Large touch-friendly `Manage Ticket` button.
  - **Pagination Controls:**
    - Page size select: `10`, `20`, `50` per page.
    - `Previous` and `Next` buttons with disabled boundaries.
    - Direct page number buttons.
    - Summary text: `Showing 1 to 10 of 35 tickets`.

---

### 3.4 Screen 4: Staff Ticket Detail & Operations (`/staff/tickets/:id`)
- **Route:** `/staff/tickets/:id`
- **Access:** `IT_STAFF` role only.
- **Layout (Two Columns on Desktop, Single Column on Mobile):**
  - **Left Column: Ticket Information & Thread:**
    - Headline: Ticket Number and creation date.
    - Summary & Description blocks.
    - Requester information block: Name, email, department.
    - Classification: Category, Related System, and Requested Priority (marked with `Read-Only` pill).
    - Communication Thread Tabs:
      - **Tab 1: Public Comments:** Displays comments visible to Requester. New comment form with submit button.
      - **Tab 2: Internal Notes (Confidential):** Yellow-tinted background with confidential lock icon. Form for internal collaboration.
  - **Right Column: Operational Controls (`card-zen`):**
    - **Owner Panel:**
      - If Unassigned: Display `Unassigned` badge and prominent `Claim Ticket` button.
      - If Assigned: Display owner name and `Reassign` dropdown button. Confirm old/new owner before save; submit expectedVersion. No manual Unassign control.
    - **IT Priority Panel:**
      - Dropdown (`HIGH`, `MEDIUM`, `LOW`) with immediate save and toast confirmation.
    - **Status Workflow Panel:**
      - Current status badge.
      - Dropdown displaying **only permitted next transitions** per BR-14.
      - Confirmation dialog triggered before transitioning to `RESOLVED`, `CLOSED`, `CANCELLED`, or `REOPENED`. Only CANCELLED is terminal in the transition matrix.
    - **Attachments:** Existing active/removed metadata; download only for active files. Staff/Admin have no upload/remove controls.
  - **Appears Resolved Alert Banner:**
      - If requester flagged problem appears resolved: Yellow alert `Requester indicated problem appears resolved on [Timestamp]. Please verify and complete formal resolution.`

---

### 3.5 Screen 5: Administrator User Management (`/admin/users`)
- **Route:** `/admin/users`
- **Access:** `ADMINISTRATOR` role only.
- **Layout:**
  - **Header:** Title `User Management`, Search bar (`Search by name or email...`), and `+ Add User` button.
  - **User Table:**
    - Columns: `Name`, `Email`, `Role` (Badge), `Status` (`Active` / `Inactive`), `Actions`.
    - Actions: `Edit` button and `Reset Password` button.
  - **Add User Modal:**
    - Name, Email, Role radio/select (`REQUESTER`, `IT_STAFF`, `ADMINISTRATOR`), Active toggle, Temporary Password input.
    - `Create User` button with busy indicator.
  - **Edit User Modal:**
    - Name, Email, Role selector, Active toggle.
    - Self-deactivation disabled with tooltip: `You cannot deactivate your own account.`
    - Last-admin protection: If sole active admin, Role demotion and Active toggle disabled with warning.
  - **Role Filter:** Optional single role select, implemented in this contract; no mandatory pagination or multi-filter toolbar.
  - **Reset Initial Password Modal:**
    - Input: `New Temporary Password`.
    - Warning: `This will invalidate all current active sessions for this user and require a password change upon their next sign-in.`

---

### 3.6 Authenticated AppShell Regression & Navigation
- **Zen Green Navigation Bar:**
  - Brand: `TokTickIT` logo and title.
  - Role-Specific Links:
    - `REQUESTER`: `My Tickets`, `Create Ticket`
    - `IT_STAFF`: `Ticket Queue`
    - `ADMINISTRATOR`: `User Management`
  - Right User Profile Menu:
    - User Name and Role Pill (e.g. `Alex IT (IT Staff)`).
    - Dropdown: `Change Password`, `Sign Out`.
  - **Decommissioned:** The Lab 2 `Development Requester` selector dropdown and `Change Requester` button are completely removed.

---

## 4. Required Component States Matrix

Each screen supports the meaningful feedback below; forbidden/not-found/conflict are specified separately, not collapsed into a single failure state:

| Screen | Loading | Empty State | No Results State | Validation Error | Submitting / Busy | Success Feedback | Failure Feedback |
|---|---|---|---|---|---|---|---|
| **Login** | N/A | N/A | N/A | Inline red error text below email/password | Spinner in submit button; form disabled | Instant redirect to home | Red alert banner with retry |
| **Change Password** | N/A | N/A | N/A | Inline red errors for mismatch/length | Button disabled `Updating...` | Green success alert + redirect | Red alert banner |
| **Staff Queue** | Table skeleton rows | "Queue is empty. No tickets exist." | "No tickets match your filters. [Reset Filters]" | N/A | Debounce indicator | Instant table update | Red banner `Unable to load tickets. [Retry]` |
| **Staff Detail** | Skeleton card | N/A | "Ticket not found (404)" | Inline field errors | Button spinners `Saving...` | Toast / green badge update | Safe load/save error banner with retry; retain drafts |
| **User Admin** | Table skeleton | "No users found" | "No users match your search." | Form validation errors | Button spinners | Modal dismiss + table refresh | Alert banner in modal |
| **Comments / Notes** | Skeleton bubbles | "No comments yet. Start the conversation." | N/A | Character count / empty warning | Button disabled `Posting...` | Appended comment | Error banner `Failed to post` |

---

## 5. Accessibility (A11y) Standards

1. **Semantic Structure:** Exactly one `<h1>` per page, semantic `<main>`, `<nav>`, `<header>`, `<section>`, and `<form>` tags.
2. **Form Controls:** Every input has a corresponding `<label for="...">`. Error messages are associated via `aria-describedby`.
3. **Interactive Targets:** Touch targets meet or exceed $44 \times 44\text{px}$ on tablet and mobile viewports.
4. **Keyboard Navigation:** Full keyboard operability; visible focus using the existing secondary-green style; verify keyboard focus in the browser against Lab 2 §2.1.
5. **Color Contrast:** All text meets WCAG AA contrast ratio ($\ge 4.5:1$ against background).

## 6. Explicit Screen Modes, Permissions and Error Feedback

| Screen | Modes | Forbidden / not-found / conflict behavior |
|---|---|---|
| Login | Credential form, submitting | Generic invalid/inactive/unknown-account response; explanatory contact-admin hint without identifying account existence. Rate-limit and network failures retain email and allow retry. |
| Change Password | Mandatory initial change; voluntary own change | /me loading gate; expired session redirects to login. Forced change cannot bypass via deep link, refresh or back. Show mandatory banner only when flag is true. |
| Staff Queue | Browse/filter | 403 shows Access denied without rows; failed query displays retry, keeps filters. Empty uses unfilteredTotal=0; no-results uses filters with total=0. |
| Staff Detail | Read ticket; edit operational fields; append communication | 403 Access denied; 404 Ticket not found; 409 refresh prompt with no silent overwrite. Retain drafts after 400/network/500; announce successful save only after API success. |
| Admin Users | List; create; basic edit; initial-password reset | 403 no user data; missing edited account 404 closes stale edit with explanation; duplicate email 409 stays inline; self/last-admin 400 is readable; safe load and mutation failures are distinct. |
| Admin Ticket Detail | Read only at /admin/tickets/:id | Reuse detail composition without Staff controls or post forms; allow both thread reads and active downloads. Apply 403/404/load-failure feedback. |
| Requester Detail | Read own ticket; append public comment; indicate resolution; manage own attachments | Preserve Lab 2 403/404/410 and double-remove 409 feedback. Never render/cache note content, tabs or counts. |

Requester Detail keeps all Lab 2 fields and attachment controls. Add a public-comment thread
and independent draft with 1–2000-character helper, submitting/validation/success/failure states.
Show Problem Appears Resolved only for OPEN/IN_PROGRESS/WAITING_FOR_REQUESTER/REOPENED;
confirm intent, then display the server timestamp on success. Duplicate invocation is a no-op.
No formal Resolve/Close control. Staff reads the indication and performs formal transitions.

On initial /me load show a shell loading state before protected content. On logout or identity
change clear only the application's auth/cache and identified legacy requester key, cancel or
ignore old in-flight responses, and remove the previous user's data before rendering the next.
Logout failure is shown and does not claim the server session was invalidated. Self-demotion or
self-reset redirects to login after session revocation. Deactivation/role changes show the actual
unassigned-ticket count returned by the backend; do not fabricate a pre-save count.

## 7. Browser Verification and Visual Evidence

Use Playwright against the running application at 1280x800, 768x1024 and 375x667, plus
767/768 and 991/992 breakpoint boundaries. jsdom tests cover structure/semantics only;
computed geometry, clipping, overflow, focus and touch targets require a real browser.

Capture Login, Change Password, Staff Queue, Staff Detail, User Management, updated Requester
Detail/shell and Admin read-only Detail in each viewport under run-specific subdirectories of
`artifacts/lab-03/screenshots/`. Keep Lab 2 screenshots untouched. Record source SHA, run ID,
viewport and scenario in a visual checklist with actual review results, never prefilled Pass.

Checklist: existing colors/typography/spacing, role navigation, all badge labels, editable versus
read-only fields, validation placement, focus, keyboard/modal focus return, >=44px touch targets,
long names/emails/comments/filenames, clipping, overlap and page horizontal overflow. Test busy,
empty/no-results, 403, 404, 409 and safe API failure states where meaningful. Card layouts preserve
labels and actions on narrow screens; Requester pages retain their Lab 2 responsive rules.
