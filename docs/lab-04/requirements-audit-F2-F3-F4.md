# Requirements Audit — F2, F3, F4

ตรวจวันที่ 2026-10-02 (Asia/Bangkok) จากโจทย์ [SE-Lab-4.pdf](SE-Lab-4.pdf), contract ทั้งสี่ไฟล์, source, test assertions, raw logs และ GitHub API ขณะ HEAD เป็น `94f85c8dd631b04d9fe8f35d9610b616f61fbe99` บน `codex/lab4-f4-verification`.

**ข้อสรุป (อัปเดต 2026-10-17): ปิดประเด็นโค้ด/UI/Accessibility ใน F4 (`AUD-01`, `AUD-02`, `AUD-08`) เรียบร้อยแล้ว; เหลือเฉพาะขั้นตอน Peer Review/Merge (`AUD-03`) และ Release/Submission ใน F5 (`AUD-05`, `AUD-06`)** ฟังก์ชันหลักของ F2/F3 และงาน recovery/performance/safe-error/accessibility/contrast ของ F4 มีหลักฐานผ่านครบ

## 1. Findings และงานที่เหลือ

| ID | ประเภท | ผลตรวจ / requirement | สถานะ / งานที่ต้องทำ |
|---|---|---|---|
| AUD-01 | P2 — code defect (Resolved) | เดิม `server/src/routes/actions.ts` ส่ง `err.message` ใน HTTP 500 สำหรับ list/create/edit/complete/cancel | **แก้ไขและยืนยันแล้ว (2026-10-17):** เพิ่ม `sendInternalError` คืนค่า generic `{ "error": "INTERNAL_ERROR", "message": "Unable to process actions request." }`, อัปเดต `api-spec.md`, และผ่านเทสต์ `API-L4-34` (10/10 กรณี, รวม 52/52 ใน `actions-taken.api.test.ts`) |
| AUD-02 | Coverage gap — AC-30/31, FR-19 (Resolved) | เดิมขาดหลักฐานเฉพาะ Edit modal ครบสาม viewport, focus restoration และการวัด WCAG AA contrast | **แก้ไขและยืนยันแล้ว (2026-10-17):** เพิ่ม focus restoration ใน `ActionsTakenSection.tsx`, เพิ่มเทสต์ `A11Y-L4-03` และ `STYLE-L4-03`, เก็บภาพ `modal-edit.png` ครบ Desktop/Tablet/Mobile (รวม 36 captures ใน `visual-checklist.md`) |
| AUD-03 | F4 workflow gate | GitHub PR #53 OPEN/DRAFT, รอผูก Issue และรีวิว | เชื่อม Issue #52 ผ่าน Development panel, ให้ peer review revision ล่าสุดและ reviewer merge; ไม่มีการ self-merge |
| AUD-04 | Documentation status | PR #47 ได้ approval และ reviewer merge จริงแล้ว แต่ F1-CLOSEOUT/PHASES/decisions ยังมีข้อความ historical | บันทึกข้อเท็จจริง remote ใน closeout และ pipeline; คง decision acceptance ที่ยังไม่บันทึกแยกไว้ ไม่เปลี่ยน Proposed เป็น Accepted โดยเดา |
| AUD-05 | F5 release/submission gate | `main` ยัง `baad45e09272d665bc0cf765236c456edcf0eff7`; `lab4-staging` อยู่ merge F3 `1ee7786cda440c03f830ca2a271d45ce9eb45864`. ยังไม่มี final Lab 4 PDF/ผล test จาก final main/หลักฐาน Kanban ทุก Issue Done | หลัง F4 review/merge จัด release PR ให้ reviewer merge แล้วตรวจ final main; จัด PDF เดียว Answer Part 1–9 พร้อมลิงก์และหลักฐานตาม §14 |
| AUD-06 | Submission evidence | `reviewer.md` และ canonical `ai-use.md` เพิ่มแล้ว; My Reflection ยังต้องให้ผู้จัดทำเขียนสรุปขั้นสุดท้าย | Peer comments/responses ของ F4 และ human-finalized reflection ยังต้องเติมจากการทำงานจริงใน F5 |
| AUD-07 | Layout variance — handout §12 | Minimum tree ใช้ `StaffDashboard.test.tsx`, `RequesterDashboard.test.tsx` และ screenshot folders `staff-dashboard/`, `requester-dashboard/`, `actions-taken/`. Repo รวม role tests ใน `Dashboard.test.tsx`/`DashboardRouting.test.tsx` และเก็บ captures ตาม phase/viewport | Coverage อยู่ในไฟล์จริง; บันทึก mapping นี้ในรายงานส่งงาน |
| AUD-08 | P2 — contrast defect (Resolved) | เดิม `client/src/components/ActionsTakenSection.tsx:672` ใช้ Bootstrap `btn-outline-warning` ให้ Pending Task ที่ยังไม่เลือก (contrast 1.63:1 บนพื้นขาว) | **แก้ไขและยืนยันแล้ว (2026-10-17):** เพิ่ม `.btn-action-pending` (`#92400E` บนพื้นขาว/warning-bg, contrast ≥ 6.57:1 > 4.5:1) ใน `zen-green.css` พร้อม focus outline 3px และยืนยันผ่าน `STYLE-L4-03` ทั้งใน unit test และ Chromium E2E |

ข้อผิดพลาด traceability ใน `tests.md` แก้ในรอบนี้: UI-L4-05/06/07 ไม่ใช่หลักฐานโดยตรงของ AC-26/27/28; AC-26 อยู่ UI-L4-11, AC-27 อยู่ UI-L4-14, AC-28 อยู่ UI-L4-18. เพิ่ม matrix แบบหนึ่งแถวต่อ AC ด้านล่าง

## 2. Password requirement และฐานข้อมูลที่ใช้อยู่

ตรวจ development DB ที่ `server/.env` ชี้ไป โดยใช้ transaction `READ ONLY` ไม่แก้บัญชี/session/credentials. [ผลแบบ aggregate](../../artifacts/lab-04/requirements-audit-20261002/database-state.json) เวลา `2026-10-02T16:22:04.391Z`:

- Database `toktickit`: 11 users, 10 active; **mustChangePassword=true ทั้ง 11**, false 0.
- ตรวจ default initial password กับ stored hashes ใน memory: 11 matches; active initial-password bypass **0**. ไม่มี hashes, URL credentials หรือข้อมูล session ใน artifact.
- `server/prisma/seed.ts` สร้างบัญชีใหม่ด้วย true; `adminUsers.ts` create/reset ใช้ true; `sessionAuth.ts` บังคับเปลี่ยนรหัสก่อนใช้ protected APIs; `App.tsx` ส่งไปหน้าบังคับเปลี่ยนรหัส.
- Lab 3 AC-02/AC-17/AC-47 เป็น regression baseline ของ Lab 4 FR-20/AC-33. ข้อความก่อนหน้าที่บอกว่า false **ไม่ตรงสถานะ DB ณ เวลาตรวจนี้**.
- false หลังผู้ใช้เปลี่ยนรหัสสำเร็จเป็นพฤติกรรมถูกต้อง; ไม่ควรเปลี่ยนบัญชีที่เปลี่ยนรหัสแล้วกลับเป็น true โดยเหมารวม. Seed รักษาบัญชีเดิม จึงไม่ใช้การรัน seed ซ้ำเป็นหลักฐานว่า reset flag แล้ว

ตรวจ DB อ่านอย่างเดียวนี้ไม่ใช่การรัน destructive tests บน development DB. หลักฐาน product tests ด้านล่างมาจาก disposable DB แยก

## 3. Acceptance Criteria — ครบทั้ง 35 รายการ

คำว่า **Covered** หมายถึง source + assertions สอดคล้องและมีผลผ่านที่ checkpoint ด้านล่าง ไม่ใช่การรับรองว่าไม่มี defect อื่นนอก assertions. **Partial** คือยังขาดหลักฐานครบข้อความ AC.

| AC | ข้อกำหนด | Planned/actual test IDs | ไฟล์ test จริง | ผล |
|---|---|---|---|---|
| AC-01 | Create completed; session creator/performer | API-L4-01, E2E-L4-01 | `server/tests/lab-04/actions-taken.api.test.ts`; `e2e/lab-04/actions-taken-flow.spec.ts` | Covered |
| AC-02 | Pending action; separate assignee, null performer | API-L4-02 | `server/tests/lab-04/actions-taken.api.test.ts` | Covered |
| AC-03 | Reject inactive/non-staff assignee | API-L4-03 | `server/tests/lab-04/actions-taken.api.test.ts` | Covered |
| AC-04 | Follow-up requires note | API-L4-04, API-L4-22e/22i | `server/tests/lab-04/actions-taken.api.test.ts` | Covered |
| AC-05 | Completed action requires result | API-L4-05, API-L4-07b | `server/tests/lab-04/actions-taken.api.test.ts` | Covered |
| AC-06 | Future datetime beyond now+5m rejected | API-L4-06, UNIT-L4-01 | `server/tests/lab-04/actions-taken.api.test.ts`; `action-validation.unit.test.ts` | Covered |
| AC-07 | Complete pending; caller performer; parent version | API-L4-07 | `server/tests/lab-04/actions-taken.api.test.ts` | Covered |
| AC-08 | Cancel pending; parent version | API-L4-08 | `server/tests/lab-04/actions-taken.api.test.ts` | Covered |
| AC-09 | Cannot revert completed action | API-L4-09 | `server/tests/lab-04/actions-taken.api.test.ts` | Covered |
| AC-10 | All mutations blocked on terminal ticket | API-L4-10a/10b | `server/tests/lab-04/actions-taken.api.test.ts` | Covered |
| AC-11 | Owned ticket returns all actions in stable order | API-L4-11 | `server/tests/lab-04/actions-taken.api.test.ts` | Covered |
| AC-12 | Requester mutations forbidden | API-L4-12 | `server/tests/lab-04/actions-taken.api.test.ts` | Covered |
| AC-13 | Foreign ticket actions strict 403 | API-L4-13 | `server/tests/lab-04/actions-taken.api.test.ts` | Covered |
| AC-14 | Zero-action resolution rejected | API-L4-18, E2E-L4-02 | `server/tests/lab-04/ticket-workflow.api.test.ts`; `e2e/lab-04/ticket-resolution.spec.ts` | Covered |
| AC-15 | Pending-only resolution rejected | API-L4-19 | `server/tests/lab-04/ticket-workflow.api.test.ts` | Covered |
| AC-16 | Completed≥1, pending=0 allows resolution | API-L4-20, E2E-L4-02 | `server/tests/lab-04/ticket-workflow.api.test.ts`; `e2e/lab-04/ticket-resolution.spec.ts` | Covered |
| AC-17 | Stale ticket version returns 409 | API-L4-21 | `server/tests/lab-04/ticket-workflow.api.test.ts` | Covered |
| AC-18 | Requester metrics owned only | API-L4-27/28/32/33b | `server/tests/lab-04/requester-dashboard.api.test.ts` | Covered |
| AC-19 | Staff operational metrics/feed | API-L4-29/33a | `server/tests/lab-04/staff-dashboard.api.test.ts` | Covered |
| AC-20 | Admin metrics + users | API-L4-30 | `server/tests/lab-04/staff-dashboard.api.test.ts` | Covered |
| AC-21 | Dashboard authentication/RBAC | API-L4-31 | `server/tests/lab-04/staff-dashboard.api.test.ts` | Covered |
| AC-22 | Requester exact drill-down filters | UI-L4-01/19, E2E-L4-03 | `client/tests/lab-04/Dashboard.test.tsx`; `DashboardRouting.test.tsx`; `e2e/lab-04/dashboards.spec.ts` | Covered |
| AC-23 | Staff unassigned drill-down | UI-L4-02/19, E2E-L4-03 | same Dashboard/component/browser files as AC-22 | Covered |
| AC-24 | Staff my-assigned drill-down | UI-L4-03/19, E2E-L4-03 | same Dashboard/component/browser files as AC-22 | Covered |
| AC-25 | Action chronological display and badges | UI-L4-04, E2E-L4-01 | `client/tests/lab-04/ActionsTaken.test.tsx`; `e2e/lab-04/actions-taken-flow.spec.ts` | Covered |
| AC-26 | Requester all actions read-only | UI-L4-11 | `client/tests/lab-04/ActionsTaken.test.tsx` | Covered |
| AC-27 | Submission disables fields/buttons | UI-L4-14 | `client/tests/lab-04/ActionsTaken.test.tsx` | Covered |
| AC-28 | Network retry preserves fields/key | UI-L4-18, API-L4-24a/24f | `client/tests/lab-04/ActionsTaken.test.tsx`; `server/tests/lab-04/actions-taken.api.test.ts` | Covered |
| AC-29 | Account switch refreshes metrics | UI-L4-08, E2E-L4-03 | `client/tests/lab-04/Dashboard.test.tsx`; `e2e/lab-04/dashboards.spec.ts` | Covered |
| AC-30 | Desktop/tablet/mobile layout | RESP-L4-01, E2E-L4-01/02/03 | `e2e/lab-04/` plus 36 captures in visual checklist (including `modal-edit.png` across 3 viewports) | Covered |
| AC-31 | Every interactive focus; all modals trap focus | UI-L4-05b, A11Y-L4-01/02/03, STYLE-L4-03 | `client/tests/lab-04/ActionsTaken.test.tsx`; `ZenGreenTokens.test.tsx`; `AppShellAccessibility.test.tsx`; `e2e/lab-04/actions-taken-flow.spec.ts`; `dashboards.spec.ts` | Covered |
| AC-32 | Labs 1–2 regression | REG-L4-01 | Full server/client/browser suites incl. `server/tests/lab-02/`, `client/tests/lab-02/` | Covered |
| AC-33 | Lab 3 auth/password/RBAC/comments/notes/admin | REG-L4-02 | Full server/client/browser suites incl. `server/tests/lab-03/`, `client/tests/lab-03/` | Covered; current dev password check also recorded |
| AC-34 | Seed twice preserves credentials/counts | MIG-L4-01 | `server/tests/lab-04/migration-preservation.test.ts` | Covered |
| AC-35 | Migration preserves legacy entities | MIG-L4-01 | `server/tests/lab-04/migration-preservation.test.ts` | Covered |

## 4. Source และหลักฐานข้าม requirement

| Contract / handout section | Implementation / evidence | Assessment |
|---|---|---|
| §4.1–4.4; FR-01–08; BR-01–11 | `server/prisma/schema.prisma`, `server/src/routes/actions.ts`, `client/src/components/ActionsTakenSection.tsx`; API action lifecycle/RBAC/validation/order/500-sanitization tests (`API-L4-34`) | Covered (AUD-01 resolved) |
| §4.5; FR-09–12; BR-12–14 | `server/src/routes/staff.ts`, `server/src/utils/workflow.ts`; workflow tests include all 17 permitted and 47 rejected pairs, legacy/no-action gate, stale version and races | Covered; requester advisory preserves Lab 3 semantics |
| §4.6/§6.2; FR-13–17; BR-17–18 | `server/src/routes/dashboard.ts`, `server/src/utils/dashboardFilters.ts`, `client/src/pages/Dashboard.tsx`; independent count/DB parity, shared drill-down filters, fixed 7-day boundary, role/zero-state tests | Covered; My Actions count is summary + five-item feed per explicit F3 contract, not a complete all-actions page |
| §5; migration/seed/recovery design | Migration preservation/seed twice + native dump/restore; indexes and actor/owner separation documented in specification §7/decisions, recovery proof in F4-REVIEW.md | Covered in disposable environment; dump snapshot includes active and soft-removed Attachment references/sizes, not only existing disk files |
| §7; FR-18–19 | ZenGreenTokens tests (`STYLE-L4-01/02/03`) + [visual checklist](visual-checklist.md), three viewports (36 captures), native home link and Log/Edit/Complete/Cancel modal checks (`A11Y-L4-01/02/03`) | Covered (AUD-02 & AUD-08 resolved) |
| §8; retry/concurrency/safe feedback | Immutable request hash, scoped `(createdById,ticketId,clientRequestId)`, replay before terminal check, strict JSON versions, local datetime, field/key-preserving retry, assignee error/retry, success feedback, generic 500 error sanitization (`API-L4-34`) | Covered (AUD-01 resolved) |
| §9–10; specification/test DD/35 ACs | Four contract files, historical spec PR #47 predates F2 merge; matrix corrected in this audit | Traceability repaired; all 35 ACs covered |
| §11; Issues/branches/review | PR #47/#49/#51 merged by `yuminnini`; F4 PR #53 targets lab4-staging; [reviewer record](reviewer.md) | F4 link/review/merge and F5 release still pending |
| §12; repository increment | Canonical `ai-use.md`, `reviewer.md` added; role test/screenshot actual path mapping above | AUD-07 names/layout variance disclosed |
| §13–14; DoD/final submission | Phase evidence exists; main/release/PDF/Kanban/human reflection pending | Overall DoD awaits F5 |

## 5. Verification checkpoint และ limits

หลังปิด `AUD-01`, `AUD-02`, และ `AUD-08` ได้รันชุดทดสอบที่ได้รับผลกระทบจริงบน disposable PostgreSQL 18 (`toktickit_test_f4_audit` บน `127.0.0.1:55434`) และ isolated upload directory:
- `server/tests/lab-04/actions-taken.api.test.ts`: **52/52 passed** (รวม `API-L4-34` ทั้ง 10 กรณีสำหรับ `GET`/`POST`/`PATCH`/`complete`/`cancel` เมื่อเกิด unexpected Error และ error ที่มี `status: 500`)
- Full client suite (`npm --prefix client test`): **117/117 passed** (21 files; เพิ่ม `A11Y-L4-03` และ `STYLE-L4-03`)
- Playwright `e2e/lab-04/actions-taken-flow.spec.ts`: **3/3 viewports passed** (Desktop 1280×800, Tablet 768×1024, Mobile 375×812; รวม `A11Y-L4-03`, `STYLE-L4-03` contrast ≥ 4.5:1, และการถ่ายภาพ `modal-edit.png` ครบ 3 viewports รวมเป็น 36 ภาพใน `artifacts/lab-04/screenshots/f4-20261002/`)
- Builds (`npm --prefix server run build` และ `npm --prefix client run build`): **exit 0**

Recovery: **10 tables / 162 rows / 10 files**, ตรวจ 2 Attachment references ก่อน/หลัง restore, 685ms. Performance: **p95 Staff 54.63ms, Requester 14.59ms**, 500 tickets/1,000 actions, 5 warmups + 50 samples/role, threshold 200ms. Raw logs/JSON และ source manifest อยู่ใน evidence directory ที่ลิงก์ไว้.

## 6. Answer Part 1–9 readiness

| Part | หลักฐานพร้อม | ยังต้องทำก่อนส่ง |
|---|---|---|
| 1 Git engineering workflow | Commit/PR links, actual reviewer identity, staged branch history | F4 peer review/link/merge, release main, final Kanban Done, complete reviewer comments/responses |
| 2 Spec DD | Specification 11 sections + history PR #47 before feature merges | Reconcile stale decision acceptance record |
| 3 Test DD | 35-AC matrix (35/35 Covered), real test paths, latest feature-branch logs | Run final tests from final main in F5 |
| 4 AI Use | Canonical ai-use.md with 9 selected prompts + per-phase records | Human finalize My Reflection; historical model version not independently verified |
| 5 Staff Dashboard | Backend metrics/DB parity, role feeds/drill-down, states/viewports | Final-main captures/evidence in F5 |
| 6 Actions Taken | Lifecycle/assignment/permissions/validation/500-sanitization + Edit/Log/Complete/Cancel modal tests & 36 screenshots | Final integrated main demonstration in F5 |
| 7 Ticket Workflow | Matrix, resolution gate, concurrency, stable order and role visibility | Final integrated main demonstration in F5 |
| 8 Requester + regressions | Owned metrics/read-only actions, authentication/attachments/comments/notes/admin full regressions | Final-main regression output and final representative demonstration in F5 |
| 9 UI/responsive/accessibility | UI spec, 36 inspected screenshots/checklist, Edit modal focus trap & `.btn-action-pending` WCAG AA contrast verified | Final-main PDF assembly in F5 |

เอกสาร audit นี้ไม่ใช่ final submission PDF. ดูผลงานแยกเฟสที่ [what-i-have-done-F2.md](what-i-have-done-F2.md), [what-i-have-done-F3.md](what-i-have-done-F3.md), [what-i-have-done-F4.md](what-i-have-done-F4.md).
