# Lab 2 — Peer Review Record

**Author:** JinggXd — GitHub: [@JinggXd](https://github.com/JinggXd)  
**Peer Reviewer:** yuminnini — GitHub: [@yuminnini](https://github.com/yuminnini)  
**Repository:** [JinggXd/TokTickIT](https://github.com/JinggXd/TokTickIT)  
**Staging Branch:** `lab2-staging`  
**Target Release:** `main`

---

## 1. Summary of Pull Requests Authored and Reviewed

All Lab 2 feature implementations reached `lab2-staging` through peer-reviewed Pull Requests in accordance with the GitHub Workflow Guide and `specification.md` Section 10.2:

| Phase | PR | Feature Branch | Reviewer Verdict | Merged Date |
|---|---|---|---|---|
| **Phase 0** | [#14](https://github.com/JinggXd/TokTickIT/pull/14) | `docs/lab2-specs` | **APPROVED** ✅ | 2026-08-30 |
| **Phase 1** | [#16](https://github.com/JinggXd/TokTickIT/pull/16) | `feature/5-lab2-data-layer` | **APPROVED** ✅ | 2026-09-01 |
| **Phase 2** | [#18](https://github.com/JinggXd/TokTickIT/pull/18) | `feature/6-lab2-requester-context` | **APPROVED** ✅ | 2026-09-04 |
| **Phase 3** | [#20](https://github.com/JinggXd/TokTickIT/pull/20) | `feature/7-lab2-create-ticket` | **APPROVED** ✅ | 2026-09-04 |
| **Phase 4** | [#22](https://github.com/JinggXd/TokTickIT/pull/22) | `feature/8-lab2-my-tickets` | **APPROVED** ✅ | 2026-09-04 |
| **Phase 5** | [#23](https://github.com/JinggXd/TokTickIT/pull/23) | `feature/9-lab2-ticket-detail` | **APPROVED** ✅ | 2026-09-05 |
| **Phase 6** | [#26](https://github.com/JinggXd/TokTickIT/pull/26) | `feature/10-lab2-ownership-hardening` | **APPROVED** ✅ | 2026-09-05 |
| **Phase 7** | [#28](https://github.com/JinggXd/TokTickIT/pull/28) | `feature/11-lab2-responsive-visual` | **APPROVED** ✅ | 2026-09-05 |
| **Phase 8** | [#30](https://github.com/JinggXd/TokTickIT/pull/30) | `feature/12-lab2-e2e-flows` | **APPROVED** ✅ | 2026-09-06 |

---

## 2. Review Comments Received and Author Responses

### Phase 0: Sprint Specification & Test Plan (PR #14)
- **Reviewer Comment:**
  > "ตรวจเอกสารทั้ง 4 ครบ (`specification.md`, `api-spec.md`, `ui-spec.md`, `tests.md`) ครอบคลุม Spec-DD ครบถ้วนชัดเจน อนุมัติให้เริ่ม Phase 1 ได้ครับ"
- **Author Response:**
  > "ขอบคุณครับ เริ่มต้นดำเนินงานแตก branch สำหรับ Phase 1 Data Layer ทันทีครับ"

### Phase 1: Database Schema, Migrations & Utilities (PR #16)
- **Reviewer Comment:**
  > "ตรวจสอบโครงสร้างฐานข้อมูล Prisma schema, enums (Priority, TicketStatus), foreign key relationships และ seed script สามารถรันซ้ำได้โดยไม่มีข้อผิดพลาด Unit tests ผ่านหมด"
- **Author Response:**
  > "ยืนยันผลการรัน seed ซ้ำ 2 ครั้งซ้อนไม่พบ duplicate key และเทสต์ TDD UNIT-01 ถึง UNIT-06 ผ่าน 100% ครับ"

### Phase 2: Requester Context & Selector (PR #18)
- **Reviewer Comment:**
  > "ขอให้ปรับปรุงปุ่ม Change ใน AppShell.tsx ให้เปลี่ยนเส้นทางไปยังหน้า `/select-requester` อย่างสมบูรณ์ แทนการสลับแค่แท็บ"
- **Author Response:**
  > "ได้ปรับปรุงแก้ไข `AppShell.tsx` ให้เรียกใช้งาน callback เปลี่ยนเส้นทางไป `/select-requester` และเพิ่มการตรวจสอบใน `RouteGuard.test.tsx` เรียบร้อยแล้วครับ"

### Phase 3: Create Ticket Screen & Staging (PR #20)
- **Reviewer Comment:**
  > "ตรวจสอบฟิลด์ read-only (Ticket Number, Ticket Date, Requester) และการตรวจสอบความถูกต้องของฟอร์ม (BR-09, BR-10, BR-11) แสดงผลถูกต้องตาม ui-spec.md"
- **Author Response:**
  > "ยืนยันการคงค่าฟอร์มไว้เมื่อเกิด error และจำลอง attachment staging บนฝั่ง client ตามขอบเขต Phase 3 ครับ"

### Phase 4: My Tickets List, Filtering & Pagination (PR #22)
- **Reviewer Comment:**
  > "พบประเด็นขอบเขต: การส่งค่า query `page` ที่ไม่ใช่ตัวเลขจำนวนเต็มบวกหรือเป็นทศนิยมใน `clampPagination` ควรมั่นใจว่าคืนค่า 400 Bad Request ไม่แครช 500"
- **Author Response:**
  > "เพิ่มการตรวจสอบ `Number.isInteger` และคืนค่า 400 ใน `server/src/app.ts` พร้อมเพิ่มเทสต์ครอบคลุม pagination edge cases เรียบร้อยครับ"

### Phase 5: Ticket Detail & Attachment Lifecycle (PR #23)
- **Reviewer Comment:**
  > "ใน `safeFilename.ts` หากไฟล์ที่อัปโหลดมีขนาดเล็กกว่า 4 bytes การอ่าน magic bytes อาจทำให้เกิด out-of-bounds error ขอให้เพิ่มการตรวจสอบขนาดไฟล์ก่อนอ่าน magic bytes"
- **Author Response:**
  > "เพิ่มเงื่อนไข `buffer.length >= 4` ก่อนตรวจสอบ magic bytes และเพิ่ม test case สำหรับไฟล์ขนาดเล็กพิเศษแล้วครับ"

### Phase 6: Ownership Hardening Pass (PR #26)
- **Reviewer Comment:**
  > "ตรวจสอบ RequireRequester middleware: การส่ง header ที่เกินขนาด PostgreSQL INT4 (> 2,147,483,647) ต้องคืนค่า 401 อย่างปลอดภัย และ header ว่างต้องคืน 400"
- **Author Response:**
  > "เพิ่ม bounds check ใน `requireRequester.ts` และรัน regression suite 37 ข้อใน `ownership-hardening.api.test.ts` ผ่านทั้งหมดครับ"

### Phase 7: Responsive & Visual Polish (PR #28)
- **Reviewer Comment:**
  > "1. หน้า My Tickets ยังมี horizontal overflow บนหน้าจอขนาด 375px (Mobile)<br>2. คลาส `.w-md-auto` ไม่มี CSS รองรับใน stylesheet ทำให้ปุ่มไม่คืนขนาดบน Desktop"
- **Author Response:**
  > "เพิ่ม `.flex-wrap` ให้ pagination container แก้ไข overflow บน 375px และประกาศ `@media (min-width: 768px) { .w-md-auto { width: auto !important; } }` ใน `zen-green.css` บันทึกภาพ 9 ภาพครบถ้วนครับ"

### Phase 8: End-to-End Integration Flows (PR #30)
- **Reviewer Comment:**
  > "1. Cleanup กว้างเกินไป ให้จำกัดเฉพาะ `createdTicketIds`<br>2. E2E-02 ให้จำลอง error body ตรงตาม API contract `{ error: ... }`<br>3. E2E-01 ให้รอ network response และ loading จบก่อนตรวจจับตอนสลับ Requester<br>4. E2E-03 ให้ทดสอบการกด Download บน UI จริงเมื่อเจอ 410"
- **Author Response:**
  > "แก้ไขครบทั้ง 4 ประเด็น: ใช้เฉพาะ `createdTicketIds`, ปรับ API error shape และ client, เพิ่มการรอ network/loading ใน E2E-01, และทดสอบ UI dynamic transition สู่ Unavailable badge ใน E2E-03 ผลเทสต์ Playwright 21/21 ผ่าน 100% ครับ"
