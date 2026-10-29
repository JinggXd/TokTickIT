# F4 visual and keyboard inspection — 2026-10-17

36 selected captures were opened and inspected at Desktop 1280×800, Tablet 768×1024 and Mobile 375×667 CSS viewports. Mobile device scale is 2.75; PNG pixel width is not the CSS viewport width. Archive: [screenshots](../../artifacts/lab-04/screenshots/f4-20261002/); exact source/checkpoint/hash mapping: [manifest](../../artifacts/lab-04/f4-evidence-20261002/screenshots-manifest.json).

| Evidence (in each desktop/tablet/mobile directory) | Inspected result |
|---|---|
| dashboard-requester.png | Four metrics and recent ticket list readable; Desktop row, Tablet two columns, Mobile single column. Wrapped navigation usable. |
| dashboard-staff.png, dashboard-admin.png | Metrics, status/priority strips and work feeds readable; Admin user summary readable; long identifiers wrap. |
| staff-actions.png | Completed description/result, date, performer, assignee, follow-up and Edit control visible; Tablet table wraps, Mobile uses cards. |
| requester-actions.png | Completed and cancelled actions readable; no mutation controls. Mobile entire page from scroll top prevents sticky-header occlusion. |
| modal-log-top.png, modal-log-bottom.png | Labels, local date, pending status (`.btn-action-pending` `#92400E`), assignee and follow-up fields readable. Mobile modal scrolls vertically; top and bottom captures cover its controls. |
| modal-edit.png | Edit Action Details header, description, assignee, follow-up and attachment notes fields readable across all three viewports; initial focus and keyboard focus trap verified. |
| modal-complete.png | Result field, confirmation controls and focused button visible at every viewport. |
| modal-cancel.png | Confirmation prompt and focused confirm button readable at every viewport. |
| resolution-blocked.png, resolution-succeeded.png | Resolution gate guidance and successful state visible and readable at every viewport. |

Browser assertions verify document scrollWidth ≤ innerWidth, Log/Edit/Complete/Cancel Tab and Shift+Tab wrapping, initial modal focus, Edit/Cancel Escape dismissal and focus restoration to the opener button (`A11Y-L4-03`), confirmed cancellation, and live computed contrast ≥ 4.5:1 for the Pending Task toggle across normal, hover, focus, and selected states (`STYLE-L4-03`). Inherited F3 checks verify the native home link, role navigation, Enter activation and visible 3px outline. Component/style tests (`ZenGreenTokens.test.tsx`, `ActionsTaken.test.tsx`) verify WCAG 2.2 AA relative luminance contrast ratios (≥ 4.5:1) across Zen Green tokens and status badges, labels, validation and in-flight Escape/close guards.

Selected captures: nine dashboards, six role action views, fifteen modal views (including `modal-edit.png` across Desktop/Tablet/Mobile) and six resolution views. Mobile action views are full-page captures; Desktop/Tablet action views are complete panel captures. No screenshot masks or product styling overrides were used.

The technical, visual, keyboard, and WCAG AA contrast checks for F4 (`AC-30`, `AC-31`, `FR-18`, `FR-19`) are complete and verified. Peer review and explicit Development-panel Issue #52 linking remain required before reviewer merge. Final submission PDF and release verification belong to F5.
