# Lab 2 Zen Green UI Specification

Companion to `docs/lab-02/specification.md`. Structured to mirror the labsheet's Appendix C
checklist section-for-section, so nothing on that checklist is left undocumented. Stack assumption
(per the project's Lab 1 foundation): **React + TypeScript + Vite + Bootstrap**. Zen Green is
implemented as CSS custom properties layered over Bootstrap, not a full Bootstrap theme replacement
— see Section 2.3.

---

## 1. Design Tokens

### 1.1 Color Tokens & Intended Use

| Token | Hex | Use |
|---|---|---|
| `--zg-primary` | `#006B3C` | App header background, primary action buttons, brand accents |
| `--zg-secondary` | `#0B7A46` | Active tab indicator, links, focus accents, button hover |
| `--zg-pale-green` | `#EAF6EF` | Selected/active table header background, subtle success emphasis |
| `--zg-canvas` | `#F5F7F6` | Page background |
| `--zg-surface` | `#FFFFFF` | Card/surface background |
| `--zg-border` | `#D1DCD6` | Card and input borders |
| `--zg-shadow` | `0 1px 3px rgba(0,0,0,0.05)` | Card elevation |
| `--zg-text-primary` | `#1A2E26` | Body text (dark charcoal-green, not pure black) |
| `--zg-text-muted` | `#5A6E65` | Sub-headers, metadata, helper text |
| `--zg-readonly-bg` | `#F0F4F2` | Read-only field background |
| `--zg-error` | `#DC2626` (bg `#FEE2E2`) | Error text/border/messages |
| `--zg-warning` | `#D97706` (bg `#FEF3C7`) | Non-decorative warning badges/callouts |
| `--zg-success` | `#15803D` (bg `#DCFCE7`) | Confirmation banners, Ticket Number highlight |

### 1.2 Typography & Spacing

- Font family: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial,
  sans-serif`.
- Scale: `h1` 24px/700/1.2, `h2` 20px/700/1.3, `h3` 16px/600/1.4, body 14px/400/1.5, helper/table
  text 12–13px, micro/badge text 11px/700/uppercase.
- Spacing scale: `xs 4px · sm 8px · md 12px · base 16px · lg 24px · xl 32px · 2xl 48px`.

### 1.3 Implementation Note for Bootstrap

Define the tokens above as CSS custom properties in a single `zen-green.css` (or `.scss` if the
project uses Sass) imported once at the app root, then apply them as overrides to Bootstrap's own
variables/classes rather than hand-rolling new components:

```css
:root {
  --zg-primary: #006B3C;
  --zg-secondary: #0B7A46;
  /* ...remaining tokens */
}
.btn-primary { background-color: var(--zg-primary); border-color: var(--zg-primary); }
.btn-primary:hover { background-color: var(--zg-secondary); border-color: var(--zg-secondary); }
.navbar { background-color: var(--zg-primary) !important; }
.form-control[readonly] { background-color: var(--zg-readonly-bg); }
```

This keeps Bootstrap's accessibility and responsive behavior (grid, form controls, focus rings)
intact while giving the app the Zen Green identity.

---

## 2. Form Control States

### 2.1 Editable / Read-only / Invalid / Disabled / Focused

| State | Visual |
|---|---|
| Editable | White background, `1px solid var(--zg-border)`, `6px` radius, height `38–40px` |
| Read-only | `var(--zg-readonly-bg)` background, same border, `cursor: default`, no focus ring on click |
| Invalid | `1px solid var(--zg-error)`, red message directly below (Section 2.2) |
| Disabled | Background `#E2E8F0`, text `#94A3B8`, `cursor: not-allowed`, no border emphasis |
| Focused | `2px solid var(--zg-secondary)` ring with `1px` outline-offset — must be visible for keyboard `Tab` navigation, not just mouse click |

Multiline `Description` textarea: minimum height `100px`, vertical resize only (layout must not
break if the Requester resizes it).

### 2.2 Required-Field Marker & Validation Message Placement

- A required field's label is followed immediately by a red asterisk:
  `Summary <span style="color: var(--zg-error)">*</span>`.
- The asterisk is a **hint**, not the validation mechanism — a field can have an asterisk and
  still need its own red message the moment it fails validation.
- Validation message: 12px, `var(--zg-error)`, appears **directly under the specific control it
  refers to**. A single generic "something went wrong" banner at the top of the form is not
  sufficient on its own (though a summary banner may additionally appear after a failed API
  submission per Section 5).

---

## 3. Buttons

### 3.1 Hierarchy

| Kind | Background | Text | Border | Hover |
|---|---|---|---|---|
| Primary | `var(--zg-primary)` | white | none | `var(--zg-secondary)` |
| Secondary | white | `var(--zg-text-primary)` | `1px solid var(--zg-border)` | `#F8FAFC` |
| Tertiary / Link | transparent | `var(--zg-secondary)` | none | underline |
| Destructive | `#FEE2E2` | `var(--zg-error)` | none | `#FCA5A5` |
| Disabled | `#E2E8F0` | `#94A3B8` | none | n/a, `not-allowed` cursor |

### 3.2 Busy / Loading State

The Submit button, on press: switches to a spinner + `"Submitting…"` label, becomes `disabled`,
and stays that way until the request resolves (BR-10). This is the entire mechanism behind
AC-06 — it must be implemented as a real disabled attribute, not just a CSS style that leaves the
click handler live underneath.

---

## 4. Attachment Selection UI

### 4.1 Selection & Preview

The attachment control on both Create Ticket and Ticket Detail shows, per selected file: filename,
size, a small type icon, and a remove-before-upload (×) affordance. An attachment counter is
always visible: `(X/5 Active)`.

### 4.2 Error Presentation

| Rejection reason | Message shown next to the offending file |
|---|---|
| File > 5 MB | "File exceeds the 5 MB size limit." |
| Disallowed extension | "Only JPG, JPEG, PNG, WEBP, and PDF files are allowed." |
| Would exceed 5 active attachments | "This ticket already has 5 active attachments." |

Client-side rejections (size, extension) happen the instant the file is picked, before any upload
request is sent (AC-05). The 5-active-file rejection can only be checked authoritatively by the
server at submit time, but the client should also pre-count locally to disable the file picker
once 5 are already staged/active.

---

## 5. Screen-State Matrix

Every screen below must implement all of these; "nothing renders" is never an acceptable state.

| State | Trigger | What's shown |
|---|---|---|
| Initial | First render, nothing typed yet | Empty form / loading spinner for reference data |
| Loading | Reference data or ticket data being fetched | Skeleton or spinner, no flash of empty content |
| Validation | Submit pressed with invalid fields | Field-level red messages, no request sent |
| Submitting | Request in flight | Busy button (Section 3.2), form otherwise read-only |
| Success | `201`/`200` received | Success banner in `var(--zg-success)` styling; for Create Ticket, the Ticket Number is the headline of this state |
| Failure | `4xx`/`5xx`/network error | Failure banner in `var(--zg-error)` styling with a safe, non-technical message; form values untouched (BR-11) |

---

## 6. Responsive Layout Rules

| Viewport | Behavior |
|---|---|
| Desktop `≥ 992px` | Multi-column layout, content centered, max width `1200px` |
| Tablet `768–991px` | Two-column form layout; compact table with horizontal overflow support only inside the table container, not the page |
| Mobile `< 768px` | Single-column stacked fields; My Tickets becomes a card list; buttons full-width; **zero** page-level horizontal scroll |
| All sizes | No clipped labels, no overlapping messages, no hidden buttons, no unreadable attachment filenames (truncate with `…` + a `title` tooltip instead of clipping silently) |

---

## 7. Accessibility

### 7.1 Labels & Keyboard Focus

- Every input has a `<label>` associated via `htmlFor`/`id` — never a placeholder used as the only
  label.
- Every icon-only control (e.g. an attachment remove `×`) has an `aria-label` and a visible
  tooltip on hover/focus.
- Tab order follows visual order; focus indicator (Section 2.1) is never suppressed with
  `outline: none` without a replacement ring.

### 7.2 Non-Color Indicators

Status and priority badges always pair color with an icon and text — never color alone (AC-20):

| Status | Background | Text | Icon |
|---|---|---|---|
| `NEW` | `#E0F2FE` | `#0369A1` | 🔵 |
| `IN_PROGRESS` | `#FEF3C7` | `#92400E` | 🟡 |
| `RESOLVED` | `#DCFCE7` | `#15803D` | 🟢 |

| Priority | Background | Text |
|---|---|---|
| `LOW` | `#F1F5F9` | `#475569` |
| `MEDIUM` | `#FEF3C7` | `#B45309` |
| `HIGH` | `#FEE2E2` | `#B91C1C` |

> Implementation note: prefer a small icon font (e.g. Bootstrap Icons `bi-circle-fill`,
> `bi-arrow-repeat`, `bi-check-circle-fill`) sized to match the badge text over raw emoji, for
> consistent rendering across operating systems — the emoji above are the *spec's* shorthand for
> "which icon", not a literal implementation instruction.

---

## 8. Visual Inspection Checklist & Screenshot Paths

Run this checklist against real screenshots, not memory, at each of the three breakpoints:

- [ ] Zen Green color tokens applied consistently (no default Bootstrap blue leaking through)
- [ ] Editable vs. read-only fields are visually distinguishable at a glance
- [ ] Every validation message sits directly under its field
- [ ] Button hierarchy matches Section 3.1 exactly (no destructive-styled primary actions, etc.)
- [ ] No clipped text, no overlapping elements, no unintended horizontal scroll at any breakpoint
- [ ] Status/priority badges are readable without color (grayscale screenshot test optional but
      recommended)
- [ ] Focus ring visible when tabbing through Create Ticket with a keyboard only

Screenshot paths (must exist and be referenced from `docs/lab-02/tests.md`):
```
artifacts/lab-02/screenshots/create-ticket/{desktop,tablet,mobile}.png
artifacts/lab-02/screenshots/my-tickets/{desktop,tablet,mobile}.png
artifacts/lab-02/screenshots/ticket-detail/{desktop,tablet,mobile}.png
```

---

## 9. Application Shell & Navigation

- Header height `60px`, background `var(--zg-primary)`, brand icon + "TokTickIT" title on the
  left.
- Nav items: **My Tickets**, **Create Ticket**. The active item shows a pill background in
  `var(--zg-secondary)`.
- Top-right **Profile** area shows the current Requester's name and department plus a
  **Change** action that returns to the Requester Selection screen (FR-03).
- Mobile: nav collapses into a horizontally scrollable bar with touch-friendly (≥ 44px) targets —
  this is the one place a horizontal scroll is acceptable, since it's contained and expected.

---

## 10. Screen Specifications

### 10.1 Development Requester Selection Screen

Required elements: TokTickIT title; one short sentence stating this is a Lab 2 testing mechanism,
not login (BR-03); a dropdown of active Requesters (FR-01); a **Continue** button; loading state
while requesters load; an empty state ("No active Development Requesters are available — contact
your instructor") if the list comes back empty; a safe failure state if `GET
/api/requesters/active` errors; keyboard-accessible controls; Zen Green styling throughout.

Suggested copy: *"Select a Development Requester to test requester-specific ticket behavior. This
is not a login screen. Authentication and role-based access will be introduced in Lab 3."*

After Continue: the shell (Section 9) shows the selected Requester's name; requester-specific data
loads fresh (BR-14).

### 10.2 Create Ticket Screen

Layout: read-only section at top (Ticket Number placeholder "will be assigned on save", Requester
name — AC-03); two-column grid for Category / Related System / Requested Priority; full-width
Summary (single-line) and Description (multiline textarea); Attachment control below the main
fields (Section 4); primary (Submit) and secondary (Cancel) actions bottom-right.

Field-by-field control mapping:

| Field | Control | Editable? |
|---|---|---|
| Ticket Number | Text, placeholder | Read-only (system-generated) |
| Requester | Text | Read-only (from context) |
| Category | Select | Editable, required |
| Related System | Select | Editable, required |
| Requested Priority | Select (`LOW/MEDIUM/HIGH`) | Editable, required |
| Summary | Text input | Editable, required, 5–100 chars |
| Description | Textarea | Editable, required, 10–2000 chars |
| Attachments | File picker + list | Editable, optional, up to 5 |

### 10.3 My Tickets Screen

**Desktop (≥ 992px):** table with columns `Ticket No. · Created Date · Summary · Category ·
Requested Priority · IT Priority · Current Status · Ticket Owner`.

**Mobile (< 768px):** each ticket becomes a card showing Ticket No., status badge, Summary,
Category, and Created Date stacked vertically — same information, no table scroll.

**Search & Filter Bar:** search input (Ticket No./Summary) + Category / Requested Priority / IT
Priority / Status dropdowns + **Clear Filters** button, laid out as a responsive grid that
collapses to one column on mobile.

**Sort & Pagination:** clickable column headers (desktop) toggle sort field/direction; pagination
control shows page numbers with **Previous**/**Next**, respects the page sizes in BR-12.

**Empty State:** 📄 icon + "No tickets submitted yet" + **Create First Ticket** button.
**No-Results State:** 🔍 icon + "No tickets match your filters" + **Clear Filters** button.
These two must be visually distinct (different icon, different copy, different action) so a
grader can tell at a glance which one is on screen (BR-13).

### 10.4 Requester Ticket Detail Screen

Full read-only header block for all ticket fields (same field set as Create Ticket, all rendered
read-only — AC-09), with a prominent `← Back to My Tickets` link above it.

Separate **Attachment Management** card below the header, clearly visually distinct from the
ticket-info block:

| Attachment state | Presentation |
|---|---|
| Active | Filename, size, **Download** button, **Remove** button |
| Uploading (new file being added) | Filename with a small progress/spinner indicator, no actions yet |
| Invalid (rejected client-side) | Not added to the list at all — shown only as a transient inline error (Section 4.2) |
| Removed | Filename with strikethrough, red removal-reason text below it, **Download** button absent, replaced by a muted "Unavailable" label |
| Unavailable (server says `410` on a stale link) | Same visual treatment as Removed — the UI never shows a broken/dead Download button |

Attachment limit indicator: `(X/5 Active)`, always visible at the top of the card.

---

## 11. Screenshot Path Summary

(Restated for convenience — see Section 8 for the full checklist these accompany.)
```
artifacts/lab-02/screenshots/create-ticket/desktop.png
artifacts/lab-02/screenshots/create-ticket/tablet.png
artifacts/lab-02/screenshots/create-ticket/mobile.png
artifacts/lab-02/screenshots/my-tickets/desktop.png
artifacts/lab-02/screenshots/my-tickets/tablet.png
artifacts/lab-02/screenshots/my-tickets/mobile.png
artifacts/lab-02/screenshots/ticket-detail/desktop.png
artifacts/lab-02/screenshots/ticket-detail/tablet.png
artifacts/lab-02/screenshots/ticket-detail/mobile.png
```
