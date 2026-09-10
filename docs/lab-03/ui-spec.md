# TokTickIT — User Interface Specification (Lab 3)

**Document Version:** 1.0.0  
**Status:** DRAFT CONTRACT — Frozen for Review  
**Design System:** Zen Green Theme Tokens (Established in Lab 1 & 2)  
**Standard Compliance:** CPE 334 Lab 3 UI Standards (§7, §8.6, §8.7)

---

## 1. Design System & Design Tokens (Zen Green)

TokTickIT reuses the Zen Green design tokens established in Lab 1 and Lab 2. No arbitrary colors, unvetted utility frameworks, or divergent themes are permitted.

### 1.1 Palette & Color Tokens
| Token | Hex Value | Semantic Usage |
|---|---|---|
| `--zen-primary` | `#2D6A4F` | Primary buttons, brand header, active tabs |
| `--zen-primary-hover` | `#1B4332` | Primary button hover/active states |
| `--zen-primary-light` | `#40916C` | Interactive accents, secondary highlights |
| `--zen-surface` | `#FFFFFF` | Card backgrounds, modal containers, inputs |
| `--zen-background` | `#F8F9FA` | Page body background |
| `--zen-pale` | `#D8F3DC` | Active selection, table header highlight, badge background |
| `--zen-border` | `#B7E4C7` | Input borders, card dividers, subtle outlines |
| `--zen-text-dark` | `#1A1D20` | Headings, primary labels, main text |
| `--zen-text-muted` | `#6C757D` | Secondary text, timestamps, input placeholders |

### 1.2 Status & Priority Badge Tokens
| State / Entity | Text / Badge Color | Background Color | Text |
|---|---|---|---|
| `NEW` | `#0D6EFD` (Blue) | `#E7F1FF` | "New" |
| `OPEN` | `#0DCAF0` (Cyan) | `#CFF4FC` | "Open" |
| `IN_PROGRESS` | `#6610F2` (Indigo) | `#E0CFFC` | "In Progress" |
| `WAITING_FOR_REQUESTER` | `#FD7E14` (Orange) | `#FFE5D0` | "Waiting for Requester" |
| `RESOLVED` | `#198754` (Green) | `#D1E7DD` | "Resolved" |
| `CLOSED` | `#6C757D` (Gray) | `#E2E3E5` | "Closed" |
| `REOPENED` | `#DC3545` (Red) | `#F8D7DA` | "Reopened" |
| `CANCELLED` | `#212529` (Dark) | `#CED4DA` | "Cancelled" |
| Priority: `HIGH` | `#DC3545` | `#F8D7DA` | "High" |
| Priority: `MEDIUM` | `#FD7E14` | `#FFE5D0` | "Medium" |
| Priority: `LOW` | `#198754` | `#D1E7DD` | "Low" |

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
- **Access:** Public (Redirects to role dashboard if already authenticated).
- **Layout:** Centered card (`max-width: 440px`) on light green tinted background.
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
  - **Top Bar:** Page headline `IT Staff Ticket Queue`, active ticket counts badge.
  - **Search & Filter Panel (`card-zen`):**
    - Search input: Placeholders `Search by ticket number or summary...`. Debounced at 300ms.
    - Category filter dropdown.
    - Requested Priority filter dropdown.
    - IT Priority filter dropdown.
    - Status filter dropdown (All 8 statuses).
    - Owner filter: Options `All Tickets`, `My Assigned Tickets`, `Unassigned Tickets`, or specific staff.
    - `Reset Filters` button: Clears all active filters and resets search.
  - **Desktop Queue Table:**
    - Columns: `Ticket No`, `Summary`, `Category`, `Req. Priority`, `IT Priority`, `Status`, `Owner`, `Updated`, `Action`.
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
      - If Assigned: Display owner name and `Reassign` dropdown button.
    - **IT Priority Panel:**
      - Dropdown (`HIGH`, `MEDIUM`, `LOW`) with immediate save and toast confirmation.
    - **Status Workflow Panel:**
      - Current status badge.
      - Dropdown displaying **only permitted next transitions** per BR-14.
      - Confirmation dialog triggered before transitioning to terminal (`RESOLVED`, `CLOSED`, `CANCELLED`) or `REOPENED` states.
    - **Appears Resolved Alert Banner:**
      - If requester flagged problem appears resolved: Yellow alert `Requester indicated problem appears resolved on [Timestamp]. Please verify and complete formal resolution.`

---

### 3.5 Screen 5: Administrator User Management (`/admin/users`)
- **Route:** `/admin/users`
- **Access:** `ADMINISTRATOR` role only.
- **Layout:**
  - **Header:** Title `User Management`, Search bar (`Search by name or email...`), and `+ Add User` button.
  - **User Table:**
    - Columns: `Name`, `Email`, `Department`, `Role` (Badge), `Status` (`Active` / `Inactive`), `Actions`.
    - Actions: `Edit` button and `Reset Password` button.
  - **Add User Modal:**
    - Name, Email, Department, Role radio/select (`REQUESTER`, `IT_STAFF`, `ADMINISTRATOR`), Active toggle, Temporary Password input.
    - `Create User` button with busy indicator.
  - **Edit User Modal:**
    - Name, Email, Department, Role selector, Active toggle.
    - Self-deactivation disabled with tooltip: `You cannot deactivate your own account.`
    - Last-admin protection: If sole active admin, Role demotion and Active toggle disabled with warning.
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

Every screen must explicitly support and test all 7 visual feedback states:

| Screen | Loading | Empty State | No Results State | Validation Error | Submitting / Busy | Success Feedback | Failure Feedback |
|---|---|---|---|---|---|---|---|
| **Login** | N/A | N/A | N/A | Inline red error text below email/password | Spinner in submit button; form disabled | Instant redirect to home | Red alert banner with retry |
| **Change Password** | N/A | N/A | N/A | Inline red errors for mismatch/length | Button disabled `Updating...` | Green success alert + redirect | Red alert banner |
| **Staff Queue** | Table skeleton rows | "Queue is empty. No tickets exist." | "No tickets match your filters. [Reset Filters]" | N/A | Debounce indicator | Instant table update | Red banner `Unable to load tickets. [Retry]` |
| **Staff Detail** | Skeleton card | N/A | "Ticket not found (404)" | Inline field errors | Button spinners `Saving...` | Toast / green badge update | Concurrency conflict modal (409) |
| **User Admin** | Table skeleton | "No users found" | "No users match your search." | Form validation errors | Button spinners | Modal dismiss + table refresh | Alert banner in modal |
| **Comments / Notes** | Skeleton bubbles | "No comments yet. Start the conversation." | N/A | Character count / empty warning | Button disabled `Posting...` | Appended comment | Error banner `Failed to post` |

---

## 5. Accessibility (A11y) Standards

1. **Semantic Structure:** Exactly one `<h1>` per page, semantic `<main>`, `<nav>`, `<header>`, `<section>`, and `<form>` tags.
2. **Form Controls:** Every input has a corresponding `<label for="...">`. Error messages are associated via `aria-describedby`.
3. **Interactive Targets:** Touch targets meet or exceed $44 \times 44\text{px}$ on tablet and mobile viewports.
4. **Keyboard Navigation:** Full keyboard operability; visible focus rings (`box-shadow: 0 0 0 0.25rem rgba(45, 106, 79, 0.25)`).
5. **Color Contrast:** All text meets WCAG AA contrast ratio ($\ge 4.5:1$ against background).
