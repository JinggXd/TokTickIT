# File Change Log — Phase 1: Data Layer (filechange1.md)

**Sprint:** TokTickIT Lab 2 (Requester Ticketing MVP)  
**Phase:** Phase 1 — Data Layer  
**Branch:** `feature/5-data-layer`  
**Base Branch:** `lab2-staging`  
**Date:** 2026-09-01  
**Author:** AI Coding Agent & Human Reviewer  

---

## 1. ที่มาและสาเหตุการปรับปรุง (Rationale & Spec DD Alignment)

ตามหลักการ **Spec-Driven Development (Spec DD)** และ **Test-Driven Development (TDD)** ในสัญญาวิศวกรรมของ Lab 2 (`docs/lab-02/`):

1. **ข้อกำหนดในสัญญา [`docs/lab-02/tests.md`](file:///d:/toktickit/docs/lab-02/tests.md) (Section 3 & Section 10):**
   - **`UNIT-05`** ผูกกับ **`BR-19` (Safe filename policy)** เท่านั้น โดยมีขอบเขตการทดสอบ (Scope) เฉพาะ **"MIME/extension mismatch detector"** (ตรวจจับการปลอมแปลงนามสกุลเมื่อ Magic Bytes ในไฟล์ไม่ตรงกับ Extension เช่น ไฟล์ชื่อ `.jpg` แต่ไบต์ข้างในเป็น PDF)
   - การตรวจประเภทไฟล์ที่อนุญาต (Extension Whitelist: JPG, JPEG, PNG, WEBP, PDF vs Disallowed files เช่น `.exe`) เป็นข้อกำหนดของ **`BR-07` (Attachment constraints)** ซึ่งสัญญา Section 10 กำหนดให้ครอบคลุมผ่าน **`API-13, API-14, API-15, UI-09`** (และ UI-level file picker validation ใน `UI-04` สำหรับ `AC-05`) ซึ่งจะถูกทดสอบใน **Phase 3** และ **Phase 5**

2. **ปัญหาที่พบในโค้ดทดสอบและเอกสารเดิม:**
   - ใน [`safe-filename.unit.test.ts`](file:///d:/toktickit/server/tests/lab-02/safe-filename.unit.test.ts) ตัวเทส `UNIT-05` มีการ assert การปฏิเสธไฟล์ `.exe` (ซึ่งเป็นพฤติกรรมของ `BR-07`) ปะปนอยู่กับ `BR-19`
   - ใน [`docs/lab-02/test1.md`](file:///d:/toktickit/docs/lab-02/test1.md) และ [`docs/lab-02/whatihavedone1.md`](file:///d:/toktickit/docs/lab-02/whatihavedone1.md) มีการระบุ `BR-07` พ่วงเข้ามาใน `UNIT-05` และขยาย Scope ไปยัง Extension Whitelist
   - การปรับปรุงครั้งนี้แก้ไขทั้ง **Test Assertion ในโค้ดจริง** และ **ตาราง/คำอธิบายในเอกสาร** เพื่อจัดขอบเขต (Scope Alignment) ให้ตรงตามสัญญาแม่บท `tests.md` แบบ 100%

---

## 2. รายการไฟล์ที่ได้รับผลกระทบ (Summary of Changes)

| ลำดับ | ไฟล์ | ประเภท | รายละเอียดการแก้ไข |
|:---:|---|:---:|---|
| 1 | [`server/tests/lab-02/safe-filename.unit.test.ts`](file:///d:/toktickit/server/tests/lab-02/safe-filename.unit.test.ts) | **แก้ไข** | ปรับชื่อ Test case และตัด assertion ตรวจ `.exe` (BR-07) ออกจาก `UNIT-05` โดยโฟกัสเฉพาะ Magic Bytes / MIME mismatch detection (BR-19) อย่างแท้จริง |
| 2 | [`docs/lab-02/test1.md`](file:///d:/toktickit/docs/lab-02/test1.md) | **แก้ไข** | อัปเดต Header วันที่ `2026-08-30 (Updated: 2026-09-01)`, อัปเดตผลรันเทสเต็มแบบ Real output และปรับตารางแถว `UNIT-05` ให้ผูกกับ `BR-19` เพียงข้อเดียว |
| 3 | [`docs/lab-02/whatihavedone1.md`](file:///d:/toktickit/docs/lab-02/whatihavedone1.md) | **แก้ไข** | อัปเดต Header วันที่ `2026-08-30 (Updated: 2026-09-01)`, ปรับรายละเอียด `UNIT-05` ใน Section 2.2 และเพิ่ม Section 2.7 อธิบายการทำ Spec DD Alignment |
| 4 | [`docs/lab-02/filechange1.md`](file:///d:/toktickit/docs/lab-02/filechange1.md) | **สร้างใหม่** | จัดทำบันทึก Changelog อธิบายเหตุผล, Raw Git Diffs และผลการทดสอบเต็มอย่างครบถ้วน |

---

## 3. รายละเอียดการแก้ไขโค้ดและเอกสาร (Raw Git Diffs)

### 3.1 [`server/tests/lab-02/safe-filename.unit.test.ts`](file:///d:/toktickit/server/tests/lab-02/safe-filename.unit.test.ts)
```diff
diff --git a/server/tests/lab-02/safe-filename.unit.test.ts b/server/tests/lab-02/safe-filename.unit.test.ts
index 6aa7377..8831dee 100644
--- a/server/tests/lab-02/safe-filename.unit.test.ts
+++ b/server/tests/lab-02/safe-filename.unit.test.ts
@@ -20,26 +20,30 @@ describe("Safe Filename & MIME Sanitizer Unit Tests (BR-19, Section 5)", () => {
     expect(truncatedResult.sanitizedOriginalName.endsWith(".png")).toBe(true);
   });
 
-  it("UNIT-05: verifies allowed extensions and flags MIME / magic bytes mismatch", () => {
-    // Valid PNG file (PNG magic bytes: 89 50 4E 47)
+  it("UNIT-05: flags MIME / magic bytes mismatch detector (BR-19)", () => {
+    // 1. Valid files with matching magic bytes
     const validPngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
     const validPng = validateAttachmentType("image.png", "image/png", validPngBuffer);
     expect(validPng.isValid).toBe(true);
 
-    // Valid PDF file (%PDF magic bytes: 25 50 44 46)
     const validPdfBuffer = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d]);
     const validPdf = validateAttachmentType("document.pdf", "application/pdf", validPdfBuffer);
     expect(validPdf.isValid).toBe(true);
 
-    // Disallowed extension (e.g. .exe)
-    const exeResult = validateAttachmentType("program.exe", "application/x-msdownload");
-    expect(exeResult.isValid).toBe(false);
-    expect(exeResult.error).toBe("Only JPG, JPEG, PNG, WEBP, and PDF files are allowed");
+    const validJpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
+    const validJpeg = validateAttachmentType("photo.jpg", "image/jpeg", validJpegBuffer);
+    expect(validJpeg.isValid).toBe(true);
 
-    // Spoofed extension: named .jpg but magic bytes are PDF
-    const spoofedBuffer = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d]); // PDF magic bytes
-    const spoofedResult = validateAttachmentType("fake_photo.jpg", "image/jpeg", spoofedBuffer);
-    expect(spoofedResult.isValid).toBe(false);
-    expect(spoofedResult.error).toMatch(/mismatch/i);
+    // 2. Spoofed extension: named .jpg but magic bytes are PDF (%PDF)
+    const spoofedPdfBuffer = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d]);
+    const spoofedJpgResult = validateAttachmentType("fake_photo.jpg", "image/jpeg", spoofedPdfBuffer);
+    expect(spoofedJpgResult.isValid).toBe(false);
+    expect(spoofedJpgResult.error).toMatch(/mismatch/i);
+
+    // 3. Spoofed extension: named .png but magic bytes are JPEG (FF D8 FF)
+    const spoofedJpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
+    const spoofedPngResult = validateAttachmentType("fake_image.png", "image/png", spoofedJpegBuffer);
+    expect(spoofedPngResult.isValid).toBe(false);
+    expect(spoofedPngResult.error).toMatch(/mismatch/i);
   });
 });
```

### 3.2 [`docs/lab-02/test1.md`](file:///d:/toktickit/docs/lab-02/test1.md)
```diff
diff --git a/docs/lab-02/test1.md b/docs/lab-02/test1.md
index 5d66c3d..56b2e60 100644
--- a/docs/lab-02/test1.md
+++ b/docs/lab-02/test1.md
@@ -2,7 +2,7 @@
 
 **Sprint:** TokTickIT Lab 2 (Requester Ticketing MVP)  
 **Branch:** `feature/5-data-layer`  
-**Date:** 2026-08-30  
+**Date:** 2026-08-30 (Updated: 2026-09-01)  
 **Overall Status:** ✅ **ALL PASSED (100%)**
 
 ---
@@ -19,19 +19,20 @@ npm --prefix server run test
 > toktickit-server@1.0.0 test
 > vitest run
 
+
  RUN  v2.1.9 D:/toktickit/server
 
- ✓ tests/lab-02/ticket-number.unit.test.ts (2 tests) 5ms
- ✓ tests/lab-02/pagination.unit.test.ts (1 test) 4ms
- ✓ tests/lab-02/validation.unit.test.ts (1 test) 4ms
- ✓ tests/lab-02/safe-filename.unit.test.ts (2 tests) 5ms
- ✓ tests/lab-01/health.test.ts (1 test) 21ms
- ✓ tests/lab-01/categories.test.ts (1 test) 72ms
+ ✓ tests/lab-02/pagination.unit.test.ts (1 test) 3ms
+ ✓ tests/lab-02/ticket-number.unit.test.ts (2 tests) 4ms
+ ✓ tests/lab-02/validation.unit.test.ts (1 test) 3ms
+ ✓ tests/lab-02/safe-filename.unit.test.ts (2 tests) 4ms
+ ✓ tests/lab-01/health.test.ts (1 test) 15ms
+ ✓ tests/lab-01/categories.test.ts (1 test) 39ms
 
  Test Files  6 passed (6)
       Tests  8 passed (8)
-   Start at  22:14:33
-   Duration  789ms
+   Start at  18:35:27
+   Duration  592ms (transform 182ms, setup 0ms, collect 671ms, tests 67ms, environment 1ms, prepare 707ms)
 ```
 
 ---
@@ -44,7 +45,7 @@ npm --prefix server run test
 | **UNIT-02** | BR-01 | กลไก Retry เมื่อชนกัน (Collision) | Retry สูงสุด 3 ครั้ง หากยังซ้ำให้ throw `TicketNumberGenerationError` | ✅ **PASS** |
 | **UNIT-03** | BR-09 | Trim และตรวจสอบความยาวข้อมูลตั๋ว | ตัดช่องว่างหน้าหลัง, Summary (5–100), Description (10–2000), Priority | ✅ **PASS** |
 | **UNIT-04** | BR-19 | Sanitize ชื่อไฟล์และสกัด Path Traversal | Reject `/`, `\`, `..` และแปลงอักขระพิเศษเป็น `_` จำกัดความยาวไม่เกิน 100 ตัว | ✅ **PASS** |
-| **UNIT-05** | BR-19, BR-07 | ตรวจสอบประเภทไฟล์และ Magic Bytes | ตรวจนามสกุลที่อนุญาต และจับคู่ Extension กับ MIME/Bytes ป้องกันการปลอมแปลง | ✅ **PASS** |
+| **UNIT-05** | BR-19 | MIME/extension mismatch detector | ตรวจจับความไม่ตรงกันระหว่างนามสกุลไฟล์กับ Magic Bytes (เช่น .jpg แต่เนื้อในเป็น PDF) | ✅ **PASS** |
 | **UNIT-06** | BR-12 | Clamp การแบ่งหน้า (Pagination) | ปรับเลขหน้าที่เกินช่วงเป็น 1 หรือหน้าสุดท้าย และตรวจสอบ Limit `[5, 8, 10, 20]` | ✅ **PASS** |
 
 ---
```

### 3.3 [`docs/lab-02/whatihavedone1.md`](file:///d:/toktickit/docs/lab-02/whatihavedone1.md)
```diff
diff --git a/docs/lab-02/whatihavedone1.md b/docs/lab-02/whatihavedone1.md
index fdd5165..3a44128 100644
--- a/docs/lab-02/whatihavedone1.md
+++ b/docs/lab-02/whatihavedone1.md
@@ -4,7 +4,7 @@
 **Phase:** Phase 1 — Data Layer  
 **Branch:** `feature/5-data-layer`  
 **Base Branch:** `lab2-staging`  
-**Date:** 2026-08-30  
+**Date:** 2026-08-30 (Updated: 2026-09-01)  
 
 ---
 
@@ -28,7 +28,7 @@
    - `UNIT-03` (BR-09): ตรวจสอบฟังก์ชัน Trim และเช็คความยาว Summary (5–100 ตัวอักษร) และ Description (10–2000 ตัวอักษร)
 3. `safe-filename.unit.test.ts`:
    - `UNIT-04` (BR-19): ตรวจสอบการตัด Path traversal (`/`, `\`, `..`), การแทนที่อักขระพิเศษด้วย `_` และการตัดความยาว Base name ไม่เกิน 100 ตัวอักษร
-   - `UNIT-05` (BR-19): ตรวจสอบนามสกุลที่อนุญาต (`.jpg`, `.jpeg`, `.png`, `.webp`, `.pdf`) และตรวจจับ Magic Bytes / MIME mismatch
+   - `UNIT-05` (BR-19): ตรวจสอบการตรวจจับ Magic Bytes / MIME mismatch (เช่น ไฟล์ชื่อ .jpg แต่ magic bytes จริงเป็น PDF)
 4. `pagination.unit.test.ts`:
    - `UNIT-06` (BR-12): ตรวจสอบการ Clamp เลขหน้า (เช่น หน้า 0 ปรับเป็น 1, หน้า 999 ปรับเป็นหน้าสุดท้าย) และตรวจ Limit `[5, 8, 10, 20]`
 
@@ -81,3 +81,20 @@
 - Staged ไฟล์ที่เกี่ยวข้องทั้งหมด
 - Commit ข้อความ: `feat: implement Lab 2 Data Layer with Prisma models, migrations, utils, and unit tests`
 - Push ขึ้น branch `feature/5-data-layer` บน GitHub เรียบร้อย
+
+---
+
+### 2.7 การปรับจูนขอบเขตการทดสอบให้ตรงตามสัญญา (Spec DD Alignment)
+- ตรวจสอบย้อนกลับ (Cross-check) กับ `docs/lab-02/tests.md` Section 3 & 10
+- ปรับ Scope และ Assertion ของ `UNIT-05` ใน `safe-filename.unit.test.ts` ให้ผูกกับ **`BR-19`** (Safe filename policy / MIME mismatch detector) ให้ตรงตามสัญญา 100% โดยแยกการตรวจจับ Extension Whitelist (BR-07) ไว้สำหรับ `API-14` และ `UI-09` (รวมถึง `API-13, API-15` ตาม Section 10 ใน `tests.md`) ใน Phase 3 และ Phase 5
+- บันทึกการเปลี่ยนแปลงอย่างละเอียดใน [`docs/lab-02/filechange1.md`](file:///d:/toktickit/docs/lab-02/filechange1.md)
+
+---
+
+## 3. ผลลัพธ์และสถานะปัจจุบัน (Current State)
+1. ผ่านการทดสอบ Unit Tests ครบถ้วน 100% (6 Suites / 8 Tests: `UNIT-01` ถึง `UNIT-06` + Lab 1 tests) ผ่านคำสั่ง `npm --prefix server run test`
+2. โครงสร้าง Database Schema, Migration และ Idempotent Seed Data ใน PostgreSQL พร้อมใช้งานสมบูรณ์
+3. ปรับจูน Assertion และเอกสารสรุปผลทั้งหมดตรงตามข้อกำหนดของสัญญา `docs/lab-02/tests.md` ครบถ้วน
+4. พร้อมสำหรับการเปิด Pull Request ของ Feature Branch `feature/5-data-layer` เข้าสู่ `lab2-staging` บน GitHub
+
+```

---

## 4. สถานะของ Utility Function ([`safeFilename.ts`](file:///d:/toktickit/server/src/utils/safeFilename.ts))

- ฟังก์ชัน [`validateAttachmentType()`](file:///d:/toktickit/server/src/utils/safeFilename.ts) ยังคงตรรกะตรวจสอบทั้ง **Extension Whitelist** (`ALLOWED_EXTENSIONS`) และ **Magic Bytes Verification** ไว้อย่างสมบูรณ์
- ทำให้ใน Phase 1 ฟังก์ชันนี้ผ่านการทดสอบ `UNIT-05` (BR-19) อย่างครบถ้วน และพร้อมถูกนำไปใช้งานต่อใน Phase 3 (`CreateTicket` form attachment validation) และ Phase 5 สำหรับ `API-14` (BR-07) โดยไม่ต้องเขียนตรรกะซ้ำซ้อน

---

## 5. ผลการตรวจสอบความถูกต้องแบบครบทั้งระบบ (Full Suite Verification)

### คำสั่งที่ใช้:
```bash
npm --prefix server run test
```

### ผลลัพธ์จริง (Full Terminal Output):
```text
> toktickit-server@1.0.0 test
> vitest run


 RUN  v2.1.9 D:/toktickit/server

 ✓ tests/lab-02/pagination.unit.test.ts (1 test) 3ms
 ✓ tests/lab-02/ticket-number.unit.test.ts (2 tests) 4ms
 ✓ tests/lab-02/validation.unit.test.ts (1 test) 3ms
 ✓ tests/lab-02/safe-filename.unit.test.ts (2 tests) 4ms
 ✓ tests/lab-01/health.test.ts (1 test) 15ms
 ✓ tests/lab-01/categories.test.ts (1 test) 39ms

 Test Files  6 passed (6)
      Tests  8 passed (8)
   Start at  18:35:27
   Duration  592ms (transform 182ms, setup 0ms, collect 671ms, tests 67ms, environment 1ms, prepare 707ms)
```

### ความครอบคลุมตามตาราง Section 10 ใน `docs/lab-02/tests.md`:
- `BR-01` (ticket number format/uniqueness/retry): `UNIT-01`, `UNIT-02` ✅
- `BR-09` (trim + length validation): `UNIT-03` ✅
- `BR-12` (query/sort/pagination standard): `UNIT-06` ✅
- `BR-19` (safe filename policy): `UNIT-04`, `UNIT-05` ✅
