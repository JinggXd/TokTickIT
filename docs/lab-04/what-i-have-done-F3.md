# What I Have Done — F3: Dashboards & Cross-Feature Integration

**Lab 4 / L4-P07–L4-P10** — updated 2026-10-02. รายงานงานของเฟสที่มี source และ evidence อ้างอิง.

## งานที่ทำ

- เพิ่ม Requester/Staff/Admin dashboard APIs; aggregate ฝั่ง server ภายใน RepeatableRead transaction, จำกัด ownership ตาม session, metrics ครบและคืน zero states. Recent window 7 วันและ ordering กำหนดชัดเจน.
- เพิ่ม role dashboards, current-user action count/feed, recent/urgent tickets และ Admin user counts. ไม่ส่ง internal notes/full collections ไป frontend.
- เพิ่ม shared `recent=7d`/`statusGroup=open|active` list filters, card drill-down URLs, count/list parity, detail routes, Clear Filters, Back/reload และ account-switch refresh.
- รวม F2 corrections ครบหกข้อ พร้อม API/component regressions ดู [F3-CARRYOVER.md](F3-CARRYOVER.md).
- Review correction เปลี่ยน brand/home เป็น native link เพื่อ keyboard Enter, role destination และ visible focus; Admin อ่าน Queue ได้ แต่ status mutation ยังจำกัด IT_STAFF ตาม Lab 3/D07.

## Code / tests / GitHub

- Source: `server/src/routes/dashboard.ts`, `server/src/utils/dashboardFilters.ts`, `server/src/app.ts`, `client/src/pages/Dashboard.tsx` และ shared app/navigation routes.
- Tests: `server/tests/lab-04/requester-dashboard.api.test.ts`, `staff-dashboard.api.test.ts`; `client/tests/lab-04/Dashboard.test.tsx`, `DashboardRouting.test.tsx`, `AppShellAccessibility.test.tsx`; `e2e/lab-04/dashboards.spec.ts`.
- Test IDs API-L4-27–33, UI-L4-01–03/08/19, E2E-L4-03, A11Y-L4-02; AC-18–24/29, recorded responsive coverage AC-30 และบางส่วน AC-31.
- [Issue #50](https://github.com/JinggXd/TokTickIT/issues/50) / [PR #51](https://github.com/JinggXd/TokTickIT/pull/51), reviewer merge 2026-10-02T13:38:33Z, merge SHA `1ee7786cda440c03f830ca2a271d45ce9eb45864`.
- F3 keyboard correction evidence: [verification](../../artifacts/lab-04/f3-pr51-review-fix-20261002/verification.md). Later integrated F4 source `bde66e9`: server 353/353, client 115/115, Playwright 132/132, builds pass; [latest evidence](../../artifacts/lab-04/f4-pr53-review-fix-20261002/verification.md).

## Limits

My Actions lifetime count เป็น summary ข้าง feed 5 รายการ ไม่ใช่หน้า all-actions และไม่ได้อ้างว่าจำนวนใน feed เท่ากับ lifetime total. Full WCAG AA contrast ยังไม่มีหลักฐาน. GitHub approval ของ PR #51 อ้าง commit ก่อน final keyboard correction; reviewer เป็นผู้ merge final head แต่ audit ไม่สร้าง approval event ใหม่ให้ revision นั้น. [Reviewer record](reviewer.md), [audit](requirements-audit-F2-F3-F4.md), [AI Use — F3](ai-use-F3.md).
