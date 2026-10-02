# F4 visual and keyboard inspection — 2026-10-02

33 selected captures were opened and inspected at Desktop 1280×800, Tablet 768×1024 and Mobile 375×667 CSS viewports. Mobile device scale is 2.75; PNG pixel width is not the CSS viewport width. Archive: [screenshots](../../artifacts/lab-04/screenshots/f4-20261002/); exact source/checkpoint/hash mapping: [manifest](../../artifacts/lab-04/f4-evidence-20261002/screenshots-manifest.json).

| Evidence (in each desktop/tablet/mobile directory) | Inspected result |
|---|---|
| dashboard-requester.png | Four metrics and recent ticket list readable; Desktop row, Tablet two columns, Mobile single column. Wrapped navigation usable. |
| dashboard-staff.png, dashboard-admin.png | Metrics, status/priority strips and work feeds readable; Admin user summary readable; long identifiers wrap. |
| staff-actions.png | Completed description/result, date, performer, assignee, follow-up and Edit control visible; Tablet table wraps, Mobile uses cards. |
| requester-actions.png | Completed and cancelled actions readable; no mutation controls. Mobile entire page from scroll top prevents sticky-header occlusion. |
| modal-log-top.png, modal-log-bottom.png | Labels, local date, pending status, assignee and follow-up fields readable. Mobile modal scrolls vertically; top and bottom captures cover its controls. |
| modal-complete.png | Result field, confirmation controls and focused button visible at every viewport. |
| modal-cancel.png | Confirmation prompt and focused confirm button readable at every viewport. |
| resolution-blocked.png, resolution-succeeded.png | Resolution gate guidance and successful state visible and readable at every viewport. |

Browser assertions verify document scrollWidth ≤ innerWidth, Log/Complete/Cancel Tab and Shift+Tab wrapping, initial modal focus, Cancel Escape dismissal and confirmed cancellation. Inherited F3 checks verify the native home link, role navigation, Enter activation and visible 3px outline. Component tests cover labels, validation and in-flight Escape/close guards. This checklist records these concrete checks; it does not represent a separate screen-reader or complete WCAG audit.

Selected captures: nine dashboards, six role action views, twelve modal views and six resolution views. Mobile action views are full-page captures; Desktop/Tablet action views are complete panel captures. No screenshot masks or product styling overrides were used. Superseded viewport-only or sticky-header-occluded captures are excluded. Final affected flow passed 3/3 after waiting for actual initial focus rather than racing the existing deferred focus effect.

The checks listed above are complete within their recorded scope. [Current requirement audit](requirements-audit-F2-F3-F4.md) leaves Edit-modal keyboard/visual coverage and full WCAG AA contrast measurements open; this is not complete AC-30/31/FR-19 certification. Peer review and explicit Development-panel Issue #52 linking remain required before reviewer merge. Final submission PDF and release verification belong to F5.
