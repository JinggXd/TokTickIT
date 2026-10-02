# Requirements Audit — F2, F3, F4

ตรวจวันที่ 2026-10-02 (Asia/Bangkok) จากโจทย์ [SE-Lab-4.pdf](SE-Lab-4.pdf), contract ทั้งสี่ไฟล์, source, test assertions, raw logs และ GitHub API ขณะ HEAD เป็น `94f85c8dd631b04d9fe8f35d9610b616f61fbe99` บน `codex/lab4-f4-verification`.

**ข้อสรุป: ยังไม่ตรงทุก requirement และยังปิด Lab 4 ทั้งหมดไม่ได้** ฟังก์ชันหลักของ F2/F3 และงาน recovery/performance ของ F4 มีหลักฐานผ่าน แต่พบ safe-error defect, ช่องว่างการยืนยัน accessibility และ release/submission gates ที่ยังค้าง ตารางนี้แยกข้อผิดพลาดจริงออกจากหลักฐานที่ยังไม่ครบ

## 1. Findings และงานที่เหลือ

| ID | ประเภท | ผลตรวจ / requirement | งานที่ต้องทำ |
|---|---|---|---|
| AUD-01 | P2 — code defect | `server/src/routes/actions.ts:126,436,710,868,1011` ส่ง `err.message` ใน HTTP 500 สำหรับ list/create/edit/complete/cancel. เมื่อ Prisma/DB throw ข้อความภายในจะถูกส่งให้ client; ขัด safe-failure requirement ของ handout §6/§8/§14 Parts 5–6. เทสต์ validation 400 ไม่ได้พิสูจน์ความปลอดภัยของ unexpected 500 | กำหนด generic public 500 response ใน API contract, เก็บ diagnostics ฝั่ง server, ทดสอบ fault injection ว่า response ไม่มีข้อความ DB/SQL/paths. รอบ audit นี้ระบุ finding; ยังไม่ได้แก้ source หรืออ้างเทสต์ใหม่ผ่าน |
| AUD-02 | Coverage gap — AC-31 / FR-19 | มีจริง: Log/Complete/Cancel focus trap, native dashboard home link, visible focus และ 33 captures. ยังไม่มีหลักฐานเฉพาะ Edit modal ครบสาม viewport และไม่มีการวัด WCAG AA contrast ทุก token/state. Shared modal effect และ token equality tests เป็นหลักฐานบางส่วน ไม่ใช่การยืนยันทั้งหมด | เพิ่ม Edit keyboard checks และบันทึก contrast measurements ของข้อความ/controls/focus states; จึงยังไม่รับรอง AC-31 / FR-19 เต็มขอบเขต |
| AUD-03 | F4 workflow gate | GitHub PR #53 OPEN/DRAFT, ไม่มี review; `closingIssuesReferences` เป็น `[]` ขณะตรวจ | เชื่อม Issue #52 ผ่าน Development panel, ให้ peer review revision ล่าสุดและ reviewer merge; ไม่มีการ self-merge |
| AUD-04 | Documentation status | PR #47 ได้ approval และ reviewer merge จริงแล้ว แต่ F1-CLOSEOUT/PHASES/decisions ยังมีข้อความ OPEN/In Progress/Proposed. D05 มีรายละเอียดปรับระหว่าง F3 จึงไม่เหมารวมว่า approval F1 ครอบคลุมเอกสารทุก revision | เพิ่มข้อเท็จจริง remote ใน closeout และ pipeline; คง decision acceptance ที่ยังไม่บันทึกแยกไว้ ไม่เปลี่ยน Proposed เป็น Accepted โดยเดา |
| AUD-05 | F5 release/submission gate | `main` ยัง `baad45e09272d665bc0cf765236c456edcf0eff7`; `lab4-staging` อยู่ merge F3 `1ee7786cda440c03f830ca2a271d45ce9eb45864`. ยังไม่มี final Lab 4 PDF/ผล test จาก final main/หลักฐาน Kanban ทุก Issue Done | หลัง F4 review/merge จัด release PR ให้ reviewer merge แล้วตรวจ final main; จัด PDF เดียว Answer Part 1–9 พร้อมลิงก์และหลักฐานตาม §14 |
| AUD-06 | Submission evidence | `reviewer.md` และ canonical `ai-use.md` เดิมไม่มี; AI model/version ในบันทึกเก่าไม่ยืนยันจาก runtime และ My Reflection ที่เขียนโดย AI ไม่ใช่คำสะท้อนจากผู้จัดทำที่ยืนยันแล้ว | รอบนี้เพิ่ม canonical AI/reviewer records และ six phase files. Peer comments/responses ของ F4 และ human-finalized reflection ยังต้องเติมจากการทำงานจริง |
| AUD-07 | Layout variance — handout §12 | Minimum tree ใช้ `StaffDashboard.test.tsx`, `RequesterDashboard.test.tsx` และ screenshot folders `staff-dashboard/`, `requester-dashboard/`, `actions-taken/`. Repo รวม role tests ใน `Dashboard.test.tsx`/`DashboardRouting.test.tsx` และเก็บ captures ตาม phase/viewport | Coverage อยู่ในไฟล์จริง แต่ชื่อ/โครงสร้างไม่ตรงตัวอย่าง minimum tree. บันทึก mapping นี้ในรายงาน; ถ้าประเมินชื่อไฟล์ตามตัวอักษรต้องจัด layout ก่อนส่ง ไม่สร้าง test สำเนาที่แค่รันซ้ำ |

ข้อผิดพลาด traceability ใน `tests.md` แก้ในรอบนี้: UI-L4-05/06/07 ไม่ใช่หลักฐานโดยตรงของ AC-26/27/28; AC-26 อยู่ UI-L4-11, AC-27 อยู่ UI-L4-14, AC-28 อยู่ UI-L4-18. เพิ่ม matrix แบบหนึ่งแถวต่อ AC ด้านล่างและแยก A11Y coverage ที่ยังไม่ครบ

AUD-01 reproduced จริงโดยเรียก compiled GET actions handler ใน process แยก แล้ว mock Prisma `ticket.findUnique` ให้ throw sentinel ที่ไม่มีข้อมูลจริง. Response เป็น 500 และส่ง sentinel กลับใน `message`; ไม่เชื่อมต่อ DB และไม่แก้ source. [Reproduction JSON](../../artifacts/lab-04/requirements-audit-20261002/safe-error-reproduction.json). อีกสี่ catch branches มี raw message รูปแบบเดียวกันจาก source inspection; ไม่อ้างว่ารันทดสอบทุก branch ใน reproduction นี้

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
| AC-30 | Desktop/tablet/mobile layout | RESP-L4-01, E2E-L4-01/02/03 | `e2e/lab-04/` plus 33 captures in visual checklist | Partial for all-screen claim — recorded screens covered, Edit-specific capture pending AUD-02 |
| AC-31 | Every interactive focus; all modals trap focus | UI-L4-05b, A11Y-L4-01/02 | `client/tests/lab-04/ActionsTaken.test.tsx`; `AppShellAccessibility.test.tsx`; `e2e/lab-04/actions-taken-flow.spec.ts`; `dashboards.spec.ts` | Partial — AUD-02 |
| AC-32 | Labs 1–2 regression | REG-L4-01 | Full server/client/browser suites incl. `server/tests/lab-02/`, `client/tests/lab-02/` | Covered |
| AC-33 | Lab 3 auth/password/RBAC/comments/notes/admin | REG-L4-02 | Full server/client/browser suites incl. `server/tests/lab-03/`, `client/tests/lab-03/` | Covered; current dev password check also recorded |
| AC-34 | Seed twice preserves credentials/counts | MIG-L4-01 | `server/tests/lab-04/migration-preservation.test.ts` | Covered |
| AC-35 | Migration preserves legacy entities | MIG-L4-01 | `server/tests/lab-04/migration-preservation.test.ts` | Covered |

## 4. Source และหลักฐานข้าม requirement

| Contract / handout section | Implementation / evidence | Assessment |
|---|---|---|
| §4.1–4.4; FR-01–08; BR-01–11 | `server/prisma/schema.prisma`, `server/src/routes/actions.ts`, `client/src/components/ActionsTakenSection.tsx`; API action lifecycle/RBAC/validation/order tests | Core behavior covered; unexpected 500 handling fails AUD-01 |
| §4.5; FR-09–12; BR-12–14 | `server/src/routes/staff.ts`, `server/src/utils/workflow.ts`; workflow tests include all 17 permitted and 47 rejected pairs, legacy/no-action gate, stale version and races | Covered; requester advisory preserves Lab 3 semantics |
| §4.6/§6.2; FR-13–17; BR-17–18 | `server/src/routes/dashboard.ts`, `server/src/utils/dashboardFilters.ts`, `client/src/pages/Dashboard.tsx`; independent count/DB parity, shared drill-down filters, fixed 7-day boundary, role/zero-state tests | Covered; My Actions count is summary + five-item feed per explicit F3 contract, not a complete all-actions page |
| §5; migration/seed/recovery design | Migration preservation/seed twice + native dump/restore; indexes and actor/owner separation documented in specification §7, decisions and recovery.md | Covered in disposable environment; dump snapshot includes active and soft-removed Attachment references/sizes, not only existing disk files |
| §7; FR-18–19 | ZenGreenTokens tests + [visual checklist](visual-checklist.md), three viewports, native home link and modal checks | Recorded states covered; full contrast/Edit evidence pending AUD-02 |
| §8; retry/concurrency/safe feedback | Immutable request hash, scoped `(createdById,ticketId,clientRequestId)`, replay before terminal check, strict JSON versions, local datetime, field/key-preserving retry, assignee error/retry, success feedback | Targeted tests pass; AUD-01 remains a real safe-failure issue |
| §9–10; specification/test DD/35 ACs | Four contract files, historical spec PR #47 predates F2 merge; matrix corrected in this audit | Traceability repaired; no claim that documentation edits themselves pass product ACs |
| §11; Issues/branches/review | PR #47/#49/#51 merged by `yuminnini`; F4 PR #53 targets lab4-staging; [reviewer record](reviewer.md) | F4 link/review/merge and F5 release still pending |
| §12; repository increment | Canonical `ai-use.md`, `reviewer.md` added; role test/screenshot actual path mapping above | AUD-07 names/layout variance disclosed |
| §13–14; DoD/final submission | Phase evidence exists; main/release/PDF/Kanban/human reflection pending | Overall DoD not complete |

## 5. Verification checkpoint และ limits

Reuse ผลที่รันจริงล่าสุดจาก [verification.md](../../artifacts/lab-04/f4-pr53-review-fix-20261002/verification.md) ที่ source `bde66e99e6bfeece12835a4beef85badcc0df6ba`: **server 353/353, client 115/115, Playwright 132/132**, builds server/client exit 0, ไม่มี failed/skipped ในรอบนั้น. Docs-only commits หลัง checkpoint ไม่ได้เปลี่ยน product source. รอบ audit นี้ไม่ได้รัน full suites ซ้ำและไม่ได้อ้างผลใหม่

Recovery: **10 tables / 162 rows / 10 files**, ตรวจ 2 Attachment references ก่อน/หลัง restore, 685ms. Performance: **p95 Staff 54.63ms, Requester 14.59ms**, 500 tickets/1,000 actions, 5 warmups + 50 samples/role, threshold 200ms. Raw logs/JSON และ source manifest อยู่ใน evidence directory ที่ลิงก์ไว้. Test DB `toktickit_test_f2_review_1790784843569` และ uploads/ports แยกจาก development

ผลชุดทดสอบผ่านไม่สามารถลบล้าง AUD-01 หรือรับรองสิ่งที่ยังไม่มี assertions ตาม AUD-02. Browser tests ใช้บัญชี fixture ที่ตั้ง password flag สำหรับแต่ละ scenario; ไม่ใช่หลักฐานว่าบัญชี development ทั้งหมดเคยทำ forced-change flow

## 6. Answer Part 1–9 readiness

| Part | หลักฐานพร้อม | ยังต้องทำก่อนส่ง |
|---|---|---|
| 1 Git engineering workflow | Commit/PR links, actual reviewer identity, staged branch history | F4 peer review/link/merge, release main, final Kanban Done, complete reviewer comments/responses |
| 2 Spec DD | Specification 11 sections + history PR #47 before feature merges | Reconcile stale decision acceptance record |
| 3 Test DD | 35-AC matrix, real test paths, latest feature-branch full logs | Close findings and run final tests from final main |
| 4 AI Use | Canonical ai-use.md with 9 selected prompts + per-phase records | Human finalize My Reflection; historical model version not independently verified |
| 5 Staff Dashboard | Backend metrics/DB parity, role feeds/drill-down, states/viewports | Final-main captures/evidence and complete AA contrast verification |
| 6 Actions Taken | Lifecycle/assignment/permissions/validation + screenshots/tests | Safe 500 handling, Edit modal keyboard/capture evidence |
| 7 Ticket Workflow | Matrix, resolution gate, concurrency, stable order and role visibility | Final integrated main demonstration |
| 8 Requester + regressions | Owned metrics/read-only actions, authentication/attachments/comments/notes/admin full regressions | Final-main regression output and final representative demonstration |
| 9 UI/responsive/accessibility | UI spec, 33 inspected screenshots/checklist | Edit/complete contrast coverage and final completed checklist |

เอกสาร audit นี้ไม่ใช่ final submission PDF. ดูผลงานแยกเฟสที่ [what-i-have-done-F2.md](what-i-have-done-F2.md), [what-i-have-done-F3.md](what-i-have-done-F3.md), [what-i-have-done-F4.md](what-i-have-done-F4.md).
