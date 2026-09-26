# TokTickIT — UI & Design System Specification (Lab 4)

**Document Version:** 1.2.0 (Revised following F1-Review Round 2 Findings)  
**Status:** PROPOSED UI CONTRACT (Sprint 4 F1)  
**Standard Compliance:** CPE 334 Lab 4 Handout (`SE-Lab-4.pdf`, §7, §8), Zen Green Design Language, `GEMINI-PIPELINE.md`, `F1-REVIEW-ROUND2.md`

---

## 1. Design Language & Zen Green Tokens (Baseline Alignment)

Lab 4 strictly preserves the established **Zen Green** design tokens from `client/src/styles/zen-green.css` (Section 1.1 of Lab 3 `ui-spec.md`). No alternate or conflicting color palettes are introduced.

### 1.1 CSS Custom Properties
```css
:root {
  --zg-primary: #006B3C;        /* Deep Forest Green (Primary Brand & Navigation) */
  --zg-secondary: #0B7A46;      /* Medium Forest Green (Active Nav & Primary Hover) */
  --zg-pale-green: #EAF6EF;     /* Subtle Tint Background */
  --zg-canvas: #F5F7F6;         /* App Canvas Background */
  --zg-surface: #FFFFFF;        /* Card & Modal Surface */
  --zg-border: #D1DCD6;         /* Standard Border */
  --zg-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  --zg-text-primary: #1A2E26;   /* Main Body Text */
  --zg-text-muted: #5A6E65;     /* Subtext & Secondary Labels */
  --zg-readonly-bg: #F0F4F2;    /* Readonly Field Background */
  --zg-error: #DC2626;          /* Danger / Error Alert */
  --zg-error-bg: #FEE2E2;       /* Danger Tint */
  --zg-warning: #D97706;        /* Warning / In-Progress */
  --zg-warning-bg: #FEF3C7;     /* Warning Tint */
  --zg-success: #15803D;        /* Success / Resolved / Completed */
  --zg-success-bg: #DCFCE7;     /* Success Tint */
}
```

### 1.2 Action Status Badges
Consistent with `client/src/components/Badges.tsx`:
- **`PENDING`:** Style `backgroundColor: "#FEF3C7"`, `color: "#92400E"`, content `🟡 Pending`
- **`COMPLETED`:** Style `backgroundColor: "#DCFCE7"`, `color: "#15803D"`, content `🟢 Completed`
- **`CANCELLED`:** Style `backgroundColor: "#F3F4F6"`, `color: "#4B5563"`, content `⚪ Cancelled`

---

## 2. Global Navigation & Application Shell

### 2.1 Role-Based Navigation
- **Requester Shell:**
  - Active links: `Dashboard` (`/dashboard`), `My Tickets` (`/my-tickets`), `Create Ticket` (`/create-ticket`)
  - User identity pill: Authenticated user name + `[Requester]` badge + dropdown (`Change Password`, `Logout`)
- **IT Staff Shell:**
  - Active links: `Dashboard` (`/staff/dashboard`), `Ticket Queue` (`/staff/queue`)
  - User identity pill: Authenticated user name + `[IT Staff]` badge + dropdown
- **Administrator Shell:**
  - Active links: `Dashboard` (`/admin/dashboard`), `Ticket Queue` (`/staff/queue`), `User Management` (`/admin/users`)
  - User identity pill: Authenticated user name + `[Administrator]` badge + dropdown

---

## 3. Screen Specifications & Metric Parity

### 3.1 Requester Dashboard (`/dashboard`)
- **Header:** "Welcome, {Requester Name}!" with subtitle "Here's the latest on your requests".
- **4 Metric Cards (1-to-1 Mapping to Shared API Filters):**
  1. **Total Open Tickets:**
     - Value: `metrics.totalOpenTickets`
     - Drill-down: Click navigates to `/my-tickets?statusGroup=open`
  2. **Waiting for My Response:**
     - Value: `metrics.ticketsWaitingForRequester`
     - Drill-down: Click navigates to `/my-tickets?status=WAITING_FOR_REQUESTER`
  3. **Recently Updated (Last 7 Days):**
     - Value: `metrics.recentlyUpdatedTicketsCount`
     - Drill-down: Click navigates to `/my-tickets?recent=7d`
  4. **Recently Resolved (Last 7 Days):**
     - Value: `metrics.recentlyResolvedTicketsCount`
     - Drill-down: Click navigates to `/my-tickets?status=RESOLVED&recent=7d`
- **Recent Tickets List:**
  - Displays up to 5 tickets from `recentTickets` (Ticket No., Summary, Status badge, Priority badge, Updated time).
  - Clicking any row navigates directly to `/tickets/:id`.
- **Quick Actions:** Button `+ Create Ticket` navigating to `/create-ticket`.

---

### 3.2 IT Staff Dashboard (`/staff/dashboard`)
- **Header:** "Welcome back, {Staff Name}!" with subtitle "Here's what's happening in your queue today" + `Refresh` button.
- **5 Metric Cards (1-to-1 Mapping to Shared API Filters):**
  1. **Unassigned Tickets:**
     - Value: `metrics.unassignedTickets`
     - Drill-down: Click navigates to `/staff/queue?owner=unassigned&statusGroup=open`
  2. **My Assigned Tickets:**
     - Value: `metrics.myAssignedTickets`
     - Drill-down: Click navigates to `/staff/queue?owner=me&statusGroup=active`
  3. **Total Open Queue:**
     - Value: `metrics.openQueueTickets`
     - Drill-down: Click navigates to `/staff/queue?statusGroup=open`
  4. **Waiting for Requester:**
     - Value: `metrics.ticketsWaitingForRequester`
     - Drill-down: Click navigates to `/staff/queue?status=WAITING_FOR_REQUESTER`
  5. **My Actions Taken:**
     - Value: `metrics.myActionsTakenCount` (Actions with `status === 'COMPLETED'` performed by current user).
- **Status & Priority Summary Strip:**
  - Clean pill counts for all 8 ticket statuses and 3 priorities.
- **Two-Column Content Area:**
  - **Left Column (Recent & Urgent Tickets):**
    - Top 5 active tickets prioritizing `itPriority === HIGH` followed by `updatedAt DESC`.
    - Clicking a ticket navigates to `/staff/tickets/:id`.
    - "View all in Queue" link -> `/staff/queue`.
  - **Right Column (My Recent Actions Taken Feed):**
    - Feed of up to 5 actions performed by current user (`actionDateTime`, ticket number link, description, outcome).

---

### 3.3 Administrator Dashboard (`/admin/dashboard`)
- Inherits the complete IT Staff Dashboard layout and operational metrics.
- Plus an **Administration Overview Card**:
  - `User Directory Summary`: Total Users, Active Users, Inactive Users, and breakdown badges (`Requester`, `IT Staff`, `Admin`).
  - Button: `Manage Users` -> `/admin/users`.
- **Detail Navigation:** On Administrator Dashboard, ticket rows navigate to `/admin/tickets/:id` (preserving baseline Administrator route).

---

### 3.4 Actions Taken Area in Ticket Detail (`/staff/tickets/:id` & `/tickets/:id`)

#### A. Staff / Administrator View
- Placed in a prominent card below the Ticket Description.
- Header: **"Actions Taken"** with count badge and primary button **"+ Log Action"** (disabled if ticket is `RESOLVED`, `CLOSED`, or `CANCELLED`).
- **Table / List Structure:**
  - **Date / Time:** Formatted timestamp (e.g. `25 Sep 2026, 14:30`)
  - **Status:** Badge (`🟡 Pending`, `🟢 Completed`, `⚪ Cancelled`)
  - **Action Description:** Description text
  - **Result:** Result text (or "—" if pending)
  - **Performer / Assignee:** Performer name, Assignee name (if assigned)
  - **Follow-Up:** Follow-up required badge and note
  - **Attachment Notes:** Safe filename reference (e.g. `log.txt`)
  - **Actions Menu:**
    - If `PENDING`: "Complete Action" button, "Cancel Action" button, "Edit Action" button.
    - If `COMPLETED`: "Edit Details" button (enabled only for original performer or Administrator).
- **Modal Dialog: Log Action:**
  - **Timezone Specification (Critical):** HTML5 `<input type="datetime-local">` interprets values strictly in the user's local browser timezone. Implementations **must not** use raw UTC ISO strings (e.g. `toISOString().slice(0, 16)`), as UTC creates a 7-hour timezone skew in Thailand (UTC+7) that falsely sets `max` in the past and rejects current local timestamps.
    - Format helper: `formatLocalDatetime(date: Date)` produces `YYYY-MM-DDTHH:mm` using local year, month, date, hours, and minutes (`date.getFullYear()`, `date.getMonth() + 1`, `date.getDate()`, `date.getHours()`, `date.getMinutes()`).
    - Initial `value`: `formatLocalDatetime(new Date())`.
    - Upper bound `max`: `formatLocalDatetime(new Date(Date.now() + 5 * 60 * 1000))` (current local time + 5-minute skew tolerance).
    - API Transmission: Upon form submission, the local datetime string is serialized to UTC ISO-8601 (`new Date(actionDateTime).toISOString()`).
  - **Inputs:**
    - Date/Time: Required datetime picker with local formatting and 5-minute future tolerance.
    - Mode toggle: Segmented radio group (`Log Completed Work` vs `Assign Pending Task`).
    - Description: Required textarea (1–1000 chars).
    - Result: Textarea (1–1000 chars); required when mode is `Completed Work`, hidden/optional when `Assign Pending Task`.
    - Assignee Dropdown: Optional select; populated via `GET /api/staff/ticket-owners` (accessible to both IT Staff and Administrators). Displays active staff and administrator users.
    - Follow-up: Checkbox (`Follow-up Required`) conditionally revealing a required `Follow-up Note` textarea (1–1000 chars).
    - Attachment Notes: Optional input for diagnostic file references (max 500 chars).
  - Buttons: `Save Action` (disabled while submitting), `Cancel`.
  - Idempotent Key Generation: Modal generates a UUIDv4 on open and passes it as `X-Client-Request-Id` and `clientRequestId` body property. On network failure retry, the existing key is reused.

- **Modal Dialog: Complete Action:**
  - Header: "Complete Action Taken"
  - Inputs:
    - Result (required textarea, 1–1000 chars): Detailed description of outcome/resolution.
    - Attachment Notes (optional input, max 500 chars).
  - Version Tracking: Sends `expectedVersion: selectedAction.version` for optimistic locking.
  - Buttons: `Mark Completed` (disabled while submitting), `Cancel`.

- **Modal Dialog: Cancel Action:**
  - Header: "Cancel Action Taken"
  - Confirmation prompt: "Are you sure you want to cancel this pending action?"
  - Inputs: Reason for cancellation (optional textarea, max 500 chars).
  - Version Tracking: Sends `expectedVersion: selectedAction.version`.
  - Buttons: `Confirm Cancellation` (danger button, disabled while submitting), `Cancel`.

- **Modal Dialog: Edit Action Details:**
  - Header: "Edit Action Details"
  - Permitted Edits:
    - If `PENDING`: Description, Assignee (from `GET /api/staff/ticket-owners`), Follow-up flag/note, Attachment notes.
    - If `COMPLETED` (Original Performer or Admin only): Description, Follow-up flag/note, Attachment notes. (Assignee and Result disabled).
  - Version Tracking: Sends `expectedVersion: selectedAction.version`.
  - Buttons: `Save Changes` (disabled while submitting), `Cancel`.

#### B. Requester View (Owned Tickets)
- Rendered in `/tickets/:id`.
- Header: **"Actions Taken"** (Read-Only).
- Displays **all** Actions Taken (`PENDING`, `COMPLETED`, `CANCELLED`) in chronological order.
- Includes Date/Time, Status badge, Description, Result, Performer, Assignee, Follow-up notes, Attachment notes.
- **Zero Controls:** No buttons or menus for logging, completing, canceling, or editing actions.
- **Strict Isolation:** `InternalNotes` are never rendered or included in the DOM.

---

## 4. UI States & Robust Feedback

1. **Loading State:** Skeleton loaders for dashboard cards, tables, and modal contents.
2. **Success State:**
   - Action Creation/Completion: Green toast/banner appears: "Action Taken saved successfully."
   - Status Transition: Green confirmation alert: "Ticket status updated to {Status}."
3. **Empty State:** Distinct illustrated message when 0 actions exist: "No actions taken yet for this ticket. Click Log Action to record work."
4. **No Results State:** Displayed when dashboard filter drill-downs return 0 tickets, with a "Clear Filters" button.
5. **Not Found State (404):** Clean banner/page when a referenced ticket or action does not exist, with a link to return to Dashboard or Queue.
6. **Validation Feedback:** Red inline helper text beneath invalid form inputs; focus moves to the first invalid field.
7. **Submitting / Busy State:** Submit buttons show a spinner and all modal inputs are disabled to prevent duplicate submissions.
8. **Conflict Alert (409):** Banner alert: "The ticket was modified by another user. Please refresh and try again."
9. **Resolution Gate Failure Alert (422):** Displayed inside the status transition modal when attempting to resolve a ticket lacking completed actions: "Ticket resolution requires at least one completed Action Taken and no pending actions."
10. **Forbidden State (403):** Clean error card if a requester attempts to navigate to a ticket or actions belonging to someone else.
11. **Network Error State:** Banner with a "Retry" button preserving entered form data and reusing the original `clientRequestId`.

---

## 5. Responsive Breakpoints & Accessibility (a11y)

- **Desktop (`>= 992px`):** 4–5 column metric cards, 2-column dashboard layout, full tabular Actions Taken.
- **Tablet (`768px – 991px`):** 2-column metric cards, stacked column layout, responsive table.
- **Mobile (`< 768px`):** 1-column metric cards, card-based action list, full-width modal dialogs.
- **Accessibility:**
  - All interactive elements have visible focus rings (`rgba(0, 107, 60, 0.25)`).
  - Modals trap keyboard focus and dismiss on `Escape`.
  - Non-color cues: all status and priority badges combine an emoji symbol, explicit text, and distinct background colors.
