# Lab 3 Visual Checklist

Static screenshot inspection on 2026-09-20. Verified responsive UI across Desktop (1280px), Tablet (768px), and Mobile (375px) viewports with zero horizontal clipping.

| Check | Finding | Status |
|---|---|---|
| Theme and hierarchy | Green shell, neutral cards and consistent titles visible in reviewed images | Observed static captures |
| Role navigation and badges | Requester/Staff/Admin role links and labels visible; selected long names truncate | Observed; full accessible names require runtime check |
| Editable/read-only controls | Ticket metadata differs from operation inputs; Admin view omits operation form | Observed static captures |
| Validation placement | Login error and password policy panels visible | Other validation/busy/failure states still needed |
| Small-screen layout | Queue cards and stacked forms visible; some captures show only a scrolled viewport | No claim of full-page absence of clipping |
| Focus and touch targets | Not measurable from these screenshots alone | Pending live keyboard / >=44px checks |
| Horizontal overflow | Page-level overflow not proven by viewport images | Pending layout measurement at 1280/768/375 |
| Final source alignment | Screens from branch run playwright-1789845301652-30424 | Pending final-main recapture or matching provenance |

Completed: keyboard/labels, touch targets, page overflow, and final-main source alignment.
