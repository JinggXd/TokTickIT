# What I Have Done — Major Phase F2: Actions Taken, Workflow State Machine & Resolution Gate (whatihavedone2.md)

**Sprint:** TokTickIT Lab 4 (Actions Taken, Workflow Resolution Gate, Dashboards & Final Regression)  
**Major Phase:** F2 — การพัฒนาระบบบันทึกการปฏิบัติงาน, กลไก Resolution Gate และสถานะตั๋วบริบูรณ์ (Sub-packages: L4-P03, L4-P04, L4-P05, L4-P06)  
**Branch:** `feature/actions-and-workflow-phase2-lab4`  
**Base Branch:** `lab4-staging` (รองรับการ Merge จาก `docs/lab4-contract` ผ่าน PR #47 ที่ commit `82c0821`)  
**GitHub Issue:** [Issue #48: Phase F2 (P03–P06): Actions Taken, Workflow State Machine & Resolution Gate](https://github.com/JinggXd/TokTickIT/issues/48)  
**Pull Request:** [PR (Phase F2): feat(f2): implement Actions Taken, workflow state machine & resolution gate (P03-P06)](https://github.com/JinggXd/TokTickIT/pulls)  
**Date:** 2026-09-26  

---

## 1. ภาพรวมงานที่ทำใน Major Phase F2 (Overview)

Major Phase F2 เป็นเฟสพัฒนาแกนหลัก (Core Implementation) ของ Lab 4 เพื่อสร้างระบบบันทึกการปฏิบัติงานของเจ้าหน้าที่ (Actions Taken), ควบคุมความปลอดภัยของวงจรสถานะตั๋ว (Workflow State Machine) พร้อมเงื่อนไขการแก้ไขปัญหา (Resolution Gate), และการปกป้องการทำงานพร้อมกัน (Concurrency & Idempotency) โดยแบ่งออกเป็น 4 Work Packages หลัก (L4-P03–L4-P06):

1. **L4-P03 (Database Migration, ActionTaken Model & Additive Schema):**
   - ออกแบบและสร้างโมเดล `ActionTaken` ใน Prisma Schema รองรับฟิลด์บันทึกงานครบถ้วน พร้อมสถานะ `ActionStatus` (`PENDING`, `COMPLETED`, `CANCELLED`)
   - กำหนด Persistent Idempotency constraint `@@unique([createdById, ticketId, clientRequestId])` และฟิลด์ `requestPayloadHash` เพื่อความปลอดภัยในการ Retry ข้ามผู้ใช้และข้ามตั๋ว
   - สร้าง Migration `20260925000000_lab4_actions_taken` แบบ Additive ที่ไม่ทำให้ข้อมูลเดิมสูญหาย (Zero Data Loss) พร้อมชุดทดสอบ Migration บน Isolated Schema จริง
2. **L4-P04 (Actions Taken REST API, Authorization & Concurrency):**
   - พัฒนา REST Endpoints ครบวงจร: `GET list`, `POST create`, `PATCH edit/assign`, `POST complete`, `POST cancel` ภายใต้ `/api/tickets/:id/actions` (Soft-cancel เท่านั้น ไม่มี DELETE)
   - บังคับใช้การระบุตัวตนจาก Server Session (`createdById`, `performedById`)
   - การล็อกแถว Parent Ticket ด้วย `SELECT ... FOR UPDATE` ป้องกัน Race Conditions ระหว่างการปิดตั๋วกับการเพิ่ม Action
   - ป้องกัน Concurrency ด้วย `version` (409 `CONFLICT`) และรองรับ Network Replay แบบ Persistent (200 OK Replay vs 201 Created)
   - ป้องกันความลับ: Requester อ่านได้เฉพาะตั๋วตนเอง (ตั๋วคนอื่นได้ 403 exact baseline) และไม่รั่วไหลข้อมูล Internal Notes
   - ตรวจสอบความถูกต้องของ Input ทุกช่องอย่างเคร่งครัด รวมถึง `result` ต้องเป็น string 1–1000 ตัวอักษร (ตอบ 400 `VALIDATION_FAILED` แทนที่จะเกิด TypeError 500)
3. **L4-P05 (Actions Taken UI in Ticket Detail):**
   - พัฒนาคอมโพเนนต์ `ActionsTakenSection` แสดงรายการและปุ่มควบคุมงานตามบทบาทผู้ใช้
   - จัดทำ Accessible Modals: Log Action, Complete Action, Cancel Action, Edit Action พร้อม Focus Trap
   - ใช้โทนสี Zen Green Theme Tokens (`--zg-primary`, `--zg-secondary`, `--zg-canvas`, `--zg-warning`, `--zg-success`) และ Action Status Badges
   - ป้องกันการปิด Modal และล็อกคอนโทรลทุกช่องระหว่างส่งคำขอ (Submitting): ปิดกั้นปุ่ม Escape, ปุ่ม X (`.btn-close`), ปุ่ม Cancel, และปิดช่องกรอกข้อมูลทั้งหมด ป้องกันปัญหา Key desynchronization หรือส่งซ้ำ
   - จัดการเขตเวลาในบราวเซอร์ด้วย Local Timezone (`formatLocalDatetime`) ป้องกัน UTC Skew 7 ชั่วโมง
4. **L4-P06 (Ticket Status Workflow & Resolution Gate):**
   - บังคับใช้กฎเกณฑ์ 17 Permitted Status Transitions และปฏิเสธ 47 Forbidden Transitions
   - พัฒนากลไก **Resolution Gate (BR-12 / AC-14–16):** การเปลี่ยนสถานะเป็น `RESOLVED` ต้องมีอย่างน้อย 1 Completed Action Taken และไม่มี Pending Action ค้างอยู่ หากไม่ครบจะตอบกลับด้วย 422 `RESOLUTION_GATE_FAILED`
   - ปรับปรุงการทดสอบ E2E Workflow (`staff-ticket-flow.spec.ts`) ให้บันทึก Action ก่อน Resolve และแยกการ Assert Success/Error Alert ชัดเจน

---

## 2. ลำดับขั้นตอนการทำงานและรายละเอียดการแก้ปัญหา (Detailed Implementation & Fixes)

### 2.1 [L4-P03] ฐานข้อมูล, โมเดล และการทดสอบ Migration รักษาข้อมูลเดิม
- ปรับปรุง [`server/prisma/schema.prisma`](file:///d:/toktickit/server/prisma/schema.prisma):
  - เพิ่ม enum `ActionStatus` (`PENDING`, `COMPLETED`, `CANCELLED`)
  - เพิ่มโมเดล `ActionTaken` มีความสัมพันธ์กับ `Ticket`, `User` (createdById, performedById, assigneeId)
  - กำหนด Optimistic Locking `version Int @default(1)`
  - กำหนด Idempotency: `clientRequestId String?`, `requestPayloadHash String?`, `@@unique([createdById, ticketId, clientRequestId])`
- สร้าง Forward Migration SQL และพัฒนา [`server/tests/lab-04/migration-preservation.test.ts`](file:///d:/toktickit/server/tests/lab-04/migration-preservation.test.ts) ให้รัน SQL DDL บน Isolated Schema จริง เพื่อพิสูจน์ว่า:
  - ข้อมูลตั๋ว, ผู้ใช้, ไฟล์แนบ (ทั้งแบบปกติและแบบ soft-removed), คอมเมนต์, โน้ต และเซสชันเดิมถูกรักษาไว้ครบ 100%
  - ตาราง `ActionTaken` สามารถ Insert และผูก Foreign Key ได้ถูกต้อง และปฏิเสธ Foreign Key ที่ชี้ไปยังข้อมูลที่ไม่มีอยู่จริง

### 2.2 [L4-P04] REST API และ Concurrency Serialization
- พัฒนาเส้นทาง API ใน [`server/src/routes/actions.ts`](file:///d:/toktickit/server/src/routes/actions.ts):
  - `GET /api/tickets/:id/actions`: เรียงตาม `actionDateTime ASC, id ASC`; Requester ดูได้เฉพาะตั๋วตนเอง; ตั๋วอื่นได้ 403 `{ "error": "Access denied: You do not own this ticket" }`
  - `POST /api/tickets/:id/actions`: ตรวจจับ Replay ผ่าน `(createdById, ticketId, clientRequestId)` และเปรียบเทียบกับ `requestPayloadHash`; ส่งค่าเดิม 200 OK (`X-Idempotent-Replay: true`) ก่อนตรวจ terminal status; ล็อกแถว Parent Ticket ด้วย `SELECT ... FOR UPDATE`
  - `PATCH /api/tickets/:id/actions/:actionId`: แก้ไขได้เฉพาะเมื่อตั๋วไม่ terminal; ตรวจสอบ `expectedVersion`; กำหนดให้เฉพาะผู้ปฏิบัติงานเดิมหรือ Admin แก้ไข Completed Action ได้
  - `POST /api/tickets/:id/actions/:actionId/complete`: บังคับกรอก `result` ตรวจสอบชนิดข้อมูล `typeof req.body.result === "string"` อย่างเข้มงวดเพื่อป้องกัน 500 ตอบกลับ 400 `VALIDATION_FAILED` หากชนิดไม่ถูกต้อง; อัปเดต `performedById` เป็นผู้เรียกปัจจุบัน; เพิ่ม ticket version
  - `POST /api/tickets/:id/actions/:actionId/cancel`: ปรับสถานะเป็น `CANCELLED` พร้อมบันทึกเหตุผล; เพิ่ม ticket version
  - ลำดับความสำคัญของ Error Precedence: ตรวจสอบ nested action 404 ก่อน parent ticket closed 400 (`API-L4-14b`)
- พัฒนาชุดทดสอบใน [`server/tests/lab-04/actions-taken.api.test.ts`](file:///d:/toktickit/server/tests/lab-04/actions-taken.api.test.ts) ครอบคลุม 34 Test Cases (API-L4-01 ถึง API-L4-17, API-L4-22, API-L4-24a ถึง 24h, API-L4-07b)

### 2.3 [L4-P05] ส่วนต่อประสานผู้ใช้ (Actions Taken UI) และการป้องกันข้อผิดพลาด
- พัฒนาคอมโพเนนต์ [`client/src/components/ActionsTakenSection.tsx`](file:///d:/toktickit/client/src/components/ActionsTakenSection.tsx):
  - แสดงผลรายการ Action พร้อมสถานะ, วันเวลา, รายละเอียด, ผู้รับผิดชอบ, บันทึกติดตาม และไฟล์แนบ
  - รองรับ 4 Modals: Log New Action, Complete Action, Cancel Action, Edit Action Details
  - **การล็อกสถานะ Submitting (Issue Fix):**
    - ใช้ `isSubmittingRef` เพื่อตรวจสอบสถานะการส่งคำขอแบบ synchronous ใน Event Listener
    - ป้องกันปุ่ม Escape ใน `handleKeyDown` ไม่ให้ปิด modal หากกำลังบันทึก
    - ป้องกันฟังก์ชัน `closeModal` ไม่ให้ทำงานระหว่างส่งคำขอ (เว้นแต่จะสำเร็จและสั่ง force close)
    - เพิ่ม `disabled={isSubmitting}` บนปุ่มปิดหัว modal (`.btn-close`), ปุ่มยกเลิก (`Cancel`), และช่องกรอกข้อมูลทั้งหมด
  - **การขยายสิทธิ์ Admin โหลดรายชื่อผู้รับงาน:** ปรับปรุง [`client/src/pages/StaffTicketDetail.tsx`](file:///d:/toktickit/client/src/pages/StaffTicketDetail.tsx) ให้ Admin โหลดรายชื่อผู้รับงานสำหรับมอบหมายงานใน Action ได้ถูกต้อง
  - พัฒนาชุดทดสอบ [`client/tests/lab-04/ActionsTaken.test.tsx`](file:///d:/toktickit/client/tests/lab-04/ActionsTaken.test.tsx) 12 ข้อ ทดสอบ Focus Trap, Local Timezone, Read-only view, Role scoping, และ `UI-L4-14` (Modal submitting lock)

### 2.4 [L4-P06] กลไก Resolution Gate และ E2E Workflow
- พัฒนากลไกใน [`server/src/routes/staff.ts`](file:///d:/toktickit/server/src/routes/staff.ts):
  - ในการเปลี่ยนสถานะสู่ `RESOLVED`: ตรวจสอบจำนวน Completed Action (`completedCount >= 1`) และ Pending Action (`pendingCount === 0`) ภายใต้ row-level lock หากไม่ผ่านจะปฏิเสธด้วย 422 `RESOLUTION_GATE_FAILED`
  - รองรับ Optimistic Concurrency บนสถานะตั๋วด้วย `expectedVersion` (ตอบ 409 `CONFLICT`)
- พัฒนาชุดทดสอบ [`server/tests/lab-04/ticket-workflow.api.test.ts`](file:///d:/toktickit/server/tests/lab-04/ticket-workflow.api.test.ts):
  - ทดสอบ Resolution Gate ทั้ง 3 กรณี (0 actions, มีเฉพาะ pending, มี completed)
  - ทดสอบ Concurrent Resolution Race ระหว่าง Action Create กับ Status Transition ภายใต้ Row Lock (`API-L4-23b`)
- ปรับปรุงการทดสอบ E2E ใน [`e2e/lab-03/staff-ticket-flow.spec.ts`](file:///d:/toktickit/e2e/lab-03/staff-ticket-flow.spec.ts):
  - เพิ่มขั้นตอนการบันทึก Completed Action Taken ก่อนดำเนินการ Resolve ตั๋ว
  - ปรับปรุงการตรวจสอบผลการเปลี่ยนสถานะให้แยกชัดเจนระหว่าง Success (`.alert-success`) และ Error (`.alert-danger`)

---

## 3. สรุปผลการทดสอบ (Verification & Test Evidence)

ทุกส่วนผ่านการตรวจสอบ 100% ตามมาตรฐานของโปรเจกต์:

1. **Server Build (`tsc`):** ผ่านสมบูรณ์ (0 errors, Exit code 0)
2. **Client Build (`tsc && vite build`):** ผ่านสมบูรณ์ (0 errors, Exit code 0)
3. **Client Tests (`vitest run`):** **ผ่านครบ 96 / 96 tests** จาก 17 ไฟล์ (รวม `ActionsTaken.test.tsx` 12/12 tests และ `ZenGreenTokens.test.tsx` 2/2 tests)
4. **Server Tests (Database & API):** **323 / 323 tests ผ่านทั้งหมด** (รวมชุดทดสอบ Lab 4 ทั้ง 60 tests)
5. **E2E Tests:** แก้ไขสาเหตุที่ทำให้ Flow หยุดชะงักเรียบร้อยแล้ว รองรับกฎ Resolution Gate อย่างสมบูรณ์

---

## 4. สถานะ Git, Branch และ PR

- **Feature Branch:** `feature/actions-and-workflow-phase2-lab4`
- **Target Branch:** `lab4-staging`
- **GitHub Issue:** [Issue #48: Phase F2 (P03–P06): Actions Taken, Workflow State Machine & Resolution Gate](https://github.com/JinggXd/TokTickIT/issues/48)
- **สถานะ:** โค้ดทั้งหมดได้รับการตรวจสอบและสร้าง Pull Request สู่ `lab4-staging` พร้อมเชื่อมโยงกับ Issue #48 ผ่าน Development panel เรียบร้อยแล้ว รอการตรวจรับจาก Peer Reviewer เพื่อ Merge เข้าสู่ `lab4-staging` ตามระเบียบข้อตกลงของทีม
