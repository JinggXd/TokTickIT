# What I Have Done — Phase 1: Data Layer

**Sprint:** TokTickIT Lab 2 (Requester Ticketing MVP)  
**Phase:** Phase 1 — Data Layer  
**Branch:** `feature/5-lab2-data-layer`  
**Base Branch:** `lab2-staging`  
**Date:** 2026-08-30 (Updated: 2026-09-01)  

---

## 1. ภาพรวมงานที่ทำใน Phase 1 (Overview)
สร้างโครงสร้างฐานข้อมูล (Database Schema), การทำ Migration, การสร้างข้อมูลตั้งต้น (Seed Data) และฟังก์ชันคำนวณ/ตรวจสอบความถูกต้อง (Utility Helper Functions) ตามแนวทาง **Test-Driven Development (TDD: Red → Green → Refactor)** ตามที่ระบุในสัญญา `docs/lab-02/specification.md`, `api-spec.md`, `ui-spec.md`, และ `tests.md`

---

## 2. ลำดับขั้นตอนการทำงานอย่างละเอียด (Step-by-Step Actions)

### 2.1 แตก Branch สำหรับการพัฒนา
- ดึงโค้ดล่าสุดจาก `lab2-staging`
- สร้าง Feature branch: `feature/5-lab2-data-layer`

### 2.2 TDD Step 1 — เขียน Unit Tests ให้ล้มก่อน (Red Phase)
เขียนไฟล์ทดสอบ 4 ไฟล์ใน `server/tests/lab-02/`:
1. `ticket-number.unit.test.ts`:
   - `UNIT-01` (BR-01): ตรวจสอบการสร้าง Ticket Number รูปแบบ `TKT-YYYY-XXXXXX` และ Zero-padded 6 หลัก
   - `UNIT-02` (BR-01): จำลอง Unique constraint collision แล้วตรวจว่า Retry สูงสุด 3 ครั้ง หากไม่สำเร็จให้โยน `TicketNumberGenerationError`
2. `validation.unit.test.ts`:
   - `UNIT-03` (BR-09): ตรวจสอบฟังก์ชัน Trim และเช็คความยาว Summary (5–100 ตัวอักษร) และ Description (10–2000 ตัวอักษร)
3. `safe-filename.unit.test.ts`:
   - `UNIT-04` (BR-19): ตรวจสอบการตัด Path traversal (`/`, `\`, `..`), การแทนที่อักขระพิเศษด้วย `_` และการตัดความยาว Base name ไม่เกิน 100 ตัวอักษร
   - `UNIT-05` (BR-19): ตรวจสอบการตรวจจับ Magic Bytes / MIME mismatch (เช่น ไฟล์ชื่อ .jpg แต่ magic bytes จริงเป็น PDF)
4. `pagination.unit.test.ts`:
   - `UNIT-06` (BR-12): ตรวจสอบการ Clamp เลขหน้า (เช่น หน้า 0 ปรับเป็น 1, หน้า 999 ปรับเป็นหน้าสุดท้าย) และตรวจ Limit `[5, 8, 10, 20]`

*ผลการรันใน Red Phase:* รันคำสั่ง `npm --prefix server run test` ล้ม 4 Suites ตามคาดเนื่องจากยังไม่มีฟังก์ชันจริง

---

### 2.3 ปรับปรุง Prisma Schema & รัน Migration
แก้ไข [`server/prisma/schema.prisma`](file:///d:/toktickit/server/prisma/schema.prisma):
- เพิ่ม Enums: `Priority` (`LOW`, `MEDIUM`, `HIGH`) และ `TicketStatus` (`NEW`, `IN_PROGRESS`, `RESOLVED`)
- ขยายโมเดล `Category` เดิม โดยเพิ่ม `isActive Boolean @default(true)` และความสัมพันธ์ `tickets Ticket[]`
- เพิ่มโมเดล:
  - `RequesterUser` (ผู้ใช้งานทดสอบ)
  - `RelatedSystem` (ระบบที่เกี่ยวข้อง 7 ระบบ)
  - `Ticket` (ตั๋วแจ้งซ่อม พร้อม Composite Index `@@index([requesterId, createdAt])`)
  - `Attachment` (ไฟล์แนบ พร้อม Index `@@index([ticketId])`)
- รันคำสั่ง Migration:
  ```bash
  npx prisma migrate dev --name lab2_data_layer
  ```
  สร้างไฟล์ migration `20260830151320_lab2_data_layer` เข้า PostgreSQL สำเร็จ

---

### 2.4 TDD Step 2 — พัฒนา Utility Functions ให้เทสผ่าน (Green Phase)
สร้างฟังก์ชัน Utility ใน `server/src/utils/`:
1. `ticketNumber.ts`: ฟังก์ชัน `generateTicketNumber()` สร้างเลขตั๋วอัตโนมัติตามปีและลำดับล่าสุด พร้อม Retry 3 ครั้ง
2. `validation.ts`: ฟังก์ชัน `validateTicketInput()` ตัดช่องว่างหน้าหลังและตรวจสอบความถูกต้องของข้อมูลตั๋ว
3. `safeFilename.ts`: ฟังก์ชัน `sanitizeFileName()` และ `validateAttachmentType()` จัดการความปลอดภัยของไฟล์แนบ
4. `pagination.ts`: ฟังก์ชัน `clampPagination()` จัดการการแบ่งหน้าและคำนวณ skip/take

*ผลการรันใน Green Phase:* รันคำสั่ง `npm --prefix server run test` ผ่านครบทั้ง 6 Suites (8 Tests) 100%

---

### 2.5 ปรับปรุงและทดสอบ Seed Data (Idempotent Seed)
แก้ไข [`server/prisma/seed.ts`](file:///d:/toktickit/server/prisma/seed.ts) โดยใช้คำสั่ง `upsert` ทั้งหมด:
- 4 หมวดหมู่ (Categories): `Account and Access`, `Hardware`, `Software`, `Network`
- 7 ระบบที่เกี่ยวข้อง (Related Systems): `Email`, `Campus Wi-Fi`, `VPN`, `LEB2 App`, `Grade Submission App`, `Printer`, `Corporate Laptop`
- 5 ผู้ใช้งานทดสอบ (Requesters): Jennifer Anderson, Sarah Johnson, David Lee, Emily Chen (4 active) และ Robert Wilson (1 inactive)
- รันคำสั่ง Seed 2 รอบติดต่อกัน:
  ```bash
  npm --prefix server run prisma:seed
  ```
  ยืนยันว่าไม่มี Error และไม่มีข้อมูลซ้ำซ้อน

---

### 2.6 บันทึกและส่งโค้ดขึ้น GitHub (Commit & Push)
- Staged ไฟล์ที่เกี่ยวข้องทั้งหมด
- Commit ข้อความ: `feat: implement Lab 2 Data Layer with Prisma models, migrations, utils, and unit tests`
- Push ขึ้น branch `feature/5-lab2-data-layer` บน GitHub เรียบร้อย

---

### 2.7 การปรับจูนขอบเขตการทดสอบให้ตรงตามสัญญา (Spec DD Alignment)
- ตรวจสอบย้อนกลับ (Cross-check) กับ `docs/lab-02/tests.md` Section 3 & 10
- ปรับ Scope และ Assertion ของ `UNIT-05` ใน `safe-filename.unit.test.ts` ให้ผูกกับ **`BR-19`** (Safe filename policy / MIME mismatch detector) ให้ตรงตามสัญญา 100% โดยแยกการตรวจจับ Extension Whitelist (BR-07) ไว้สำหรับ `API-14` และ `UI-09` (รวมถึง `API-13, API-15` ตาม Section 10 ใน `tests.md`) ใน Phase 3 และ Phase 5
- บันทึกการเปลี่ยนแปลงอย่างละเอียดใน [`docs/lab-02/filechange1.md`](file:///d:/toktickit/docs/lab-02/filechange1.md)

---

## 3. ผลลัพธ์และสถานะปัจจุบัน (Current State)
1. ผ่านการทดสอบ Unit Tests ครบถ้วน 100% (6 Suites / 8 Tests: `UNIT-01` ถึง `UNIT-06` + Lab 1 tests) ผ่านคำสั่ง `npm --prefix server run test`
2. โครงสร้าง Database Schema, Migration และ Idempotent Seed Data ใน PostgreSQL พร้อมใช้งานสมบูรณ์
3. ปรับจูน Assertion และเอกสารสรุปผลทั้งหมดตรงตามข้อกำหนดของสัญญา `docs/lab-02/tests.md` ครบถ้วน
4. พร้อมสำหรับการเปิด Pull Request ของ Feature Branch `feature/5-lab2-data-layer` เข้าสู่ `lab2-staging` บน GitHub


