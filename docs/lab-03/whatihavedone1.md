# What I Have Done — Major Phase F1: Baseline, Specification & Test Harness (whatihavedone1.md)

**Sprint:** TokTickIT Lab 3 (Full Ticketing & IT Lifecycle System)  
**Major Phase:** F1 — เตรียมแผนและระบบทดสอบ (Sub-packages: P00, P01, P02)  
**Branch:** `feature/f1-prep-and-test-harness`  
**Base Branch:** `lab3-staging`  
**Date:** 2026-09-17  

---

## 1. ภาพรวมงานที่ทำใน Major Phase F1 (Overview)

Major Phase F1 เป็นเฟสเริ่มต้นที่สำคัญที่สุดของ Lab 3 เพื่อวางรากฐานทางวิศวกรรมซอฟต์แวร์ตามหลักการ **Spec-Driven Development (Spec DD)** และ **Test-Driven Development (TDD)** โดยแบ่งงานออกเป็น 3 ส่วนหลัก (P00–P02):
1. **P00 (Baseline Assessment & Pre-flight Inspection):** ตรวจสอบสถานะเดิมของระบบ Lab 2 แบบ Read-Only โดยไม่แก้ไขไฟล์โค้ดจริง บันทึกจำนวนข้อมูลในฐานข้อมูล ไฟล์แนบ และผลการรันเทสเดิม
2. **P01 (Engineering Contracts Specification):** จัดทำสัญญาข้อกำหนดฉบับสมบูรณ์ 4 ฉบับ (`specification.md`, `api-spec.md`, `ui-spec.md`, และ `tests.md`) พร้อมเอกสารข้อเสนอการปรับเปลี่ยนระบบเดิม Legacy Change Proposals (LCP-01 ถึง LCP-05) และปรับแผนเป็น 5 เฟสใหญ่ใน `PHASES.md`
3. **P02 (Test Plan & Test Isolation Harness):** จัดทำตาราง Traceability Matrix จับคู่ 56 Acceptance Criteria (AC-01 ถึง AC-56) กับ 107 Test Cases และพัฒนาระบบ Test Isolation Harness พร้อม Fail-closed Safety Guard เพื่อแยก Database และโฟลเดอร์ uploads ของการทดสอบออกจากข้อมูล Development/Production 100%

---

## 2. ลำดับขั้นตอนการทำงานอย่างละเอียด (Step-by-Step Actions)

### 2.1 การจัดการ Git Branch และการจัดโครงสร้าง 5 เฟสใหญ่
- สร้างและปรับชื่อ Feature branch ให้เป็นตัวแทนของเฟสใหญ่: `feature/f1-prep-and-test-harness` โดยมี Base branch มุ่งสู่ `lab3-staging`
- ปรับปรุง [docs/lab-03/PHASES.md](file:///d:/toktickit/docs/lab-03/PHASES.md) เพื่อรวมแผนงาน 15 ชุดงานเดิม (P00–P14) เข้าเป็น 5 เฟสใหญ่ (F1–F5) โดยยังคงรักษา Work Package IDs, Dependencies, และ Acceptance Criteria เดิมไว้อย่างครบถ้วน

### 2.2 P00 — การตรวจประเมินสถานะระบบเดิม (Baseline Assessment)
- ตรวจสอบความสะอาดของ Working Tree และตรวจบันทึก Git Commit SHA
- ตรวจสอบฐานข้อมูลเดิม `toktickit` บน PostgreSQL: พบ Requesters 5 คน, Tickets 35 ใบ, Attachments 1 ไฟล์, Categories 6 รายการ, Related Systems 9 รายการ
- ตรวจสอบโฟลเดอร์ `server/uploads` เดิม มีไฟล์แนบจริง 120 ไฟล์ ซึ่งต้องได้รับการคุ้มครองไม่ให้ถูกลบหรือเขียนทับ
- รันการทดสอบ Baseline ของ Lab 2: Server suite ผ่าน 14 files / 104 tests, Client suite ผ่าน 8 files / 37 tests
- จัดทำเอกสารบันทึกสถานะเดิมใน [`docs/lab-03/baseline.md`](file:///d:/toktickit/docs/lab-03/baseline.md)

### 2.3 P01 — การร่างสัญญาข้อกำหนดและข้อเสนอการปรับเปลี่ยน (Specification & LCPs)
- พัฒนาข้อกำหนด 4 ฉบับใน `docs/lab-03/`:
  - [`specification.md`](file:///d:/toktickit/docs/lab-03/specification.md): ขอบเขตงาน, 3 บทบาท (Requester, Staff, Admin), Ticket Lifecycle State Machine, และ AC-01 ถึง AC-56
  - [`api-spec.md`](file:///d:/toktickit/docs/lab-03/api-spec.md): สัญญา API Endpoints ทุกเส้น, Session Authentication, Response DTOs และ Error Status Codes (400, 401, 403, 404, 409, 410)
  - [`ui-spec.md`](file:///d:/toktickit/docs/lab-03/ui-spec.md): หน้าจอ UI, Responsive Breakpoints (Desktop, Tablet, Mobile), Design Tokens และการจัดวาง Layout
  - [`tests.md`](file:///d:/toktickit/docs/lab-03/tests.md): ตารางความสัมพันธ์ระหว่าง Acceptance Criteria กับ Planned Tests
- ร่างข้อเสนอ [`legacy-change-proposals.md`](file:///d:/toktickit/docs/lab-03/legacy-change-proposals.md) (LCP-01 ถึง LCP-05) เพื่อขออนุมัติการแก้ไขโค้ดเดิมเท่าที่จำเป็น โดยเฉพาะ LCP-01 เรื่องระบบ Test Isolation

### 2.4 P02 — การพัฒนาระบบ Test Isolation Harness และ Safety Guards (LCP-01)
เพื่อป้องกันไม่ให้การรันเทสส่งผลกระทบต่อข้อมูลจริงในระบบ พัฒนาระบบคุ้มครองดังนี้:
1. **Fail-closed Test Environment Guard ([`server/src/config/testEnvironment.ts`](file:///d:/toktickit/server/src/config/testEnvironment.ts)):**
   - บังคับว่าการรันเทสต้องระบุ `DATABASE_URL_TEST` ที่ชี้ไปยังฐานข้อมูลชื่อ `toktickit_test` หรือ `toktickit_test_<suffix>` เท่านั้น หากชี้ไปที่ `toktickit` หรือฐานข้อมูลอื่น ระบบจะปฏิเสธและหยุดทำงานทันที (Throw `TestEnvironmentError`)
   - ป้องกัน Path Traversal (`..`, `/`, `\`) ใน Test Run ID และควบคุมให้โฟลเดอร์ uploads ของการทดสอบอยู่ภายใต้ `server/test-uploads/<run-id>` เท่านั้น
   - บังคับว่า `DATABASE_URL` ต้องมีค่าตรงกับ `DATABASE_URL_TEST` เพื่อป้องกันการ Bypass สภาพแวดล้อม
2. **Server Test Launcher ([`server/scripts/run-tests.mjs`](file:///d:/toktickit/server/scripts/run-tests.mjs)):**
   - สคริปต์กลางสำหรับรัน Vitest โดยสร้าง Run ID ประจำรอบ รันเทสบนสภาพแวดล้อมจำลอง และลบโฟลเดอร์ `server/test-uploads/<run-id>` ทิ้งโดยอัตโนมัติเมื่อเทสเสร็จสิ้น
3. **Dedicated Test Server Launcher ([`server/scripts/run-test-server.mjs`](file:///d:/toktickit/server/scripts/run-test-server.mjs)):**
   - รัน Express Server แยกสำหรับงาน E2E โดยเปิดพอร์ต 3001 พร้อมผูกกับ Test Database

### 2.5 การแก้ไขข้อตรวจพบของ P02 เพื่อให้สมบูรณ์ครบถ้วน (P02 Review Fixes)
ตามข้อเสนอแนะในการรีวิว P02 ได้ดำเนินการแก้ไขจุดบกพร่องดังนี้:
1. **Pre-import Guard Timing ([`server/tests/setup.ts`](file:///d:/toktickit/server/tests/setup.ts)):**
   - ย้ายการเรียก `requireTestEnvironment()` ออกมาที่ module level นอก `beforeAll` เพื่อให้ guard ตรวจสอบและหยุดการทำงานทันทีหากสภาพแวดล้อมไม่ปลอดภัย ก่อนที่ test file หรือ module ต่างๆ จะเริ่ม import หรือทำ I/O
2. **E2E Port Alignment ([`e2e/lab-02/requester-ticket-flow.spec.ts`](file:///d:/toktickit/e2e/lab-02/requester-ticket-flow.spec.ts)):**
   - เปลี่ยนการยิง API ในไฟล์ E2E จากเดิมที่ฮาร์ดโค้ด `http://localhost:3000` ทั้งหมดมาใช้ `API_BASE` (พอร์ต 3001 ตามที่ `playwright.config.ts` กำหนดไว้)
3. **E2E Prisma Client Isolation & Cleanup:**
   - เพิ่ม Guard ให้กับ `PrismaClient` ใน E2E ให้เชื่อมต่อเฉพาะ Test Database เมื่ออยู่ในโหมดทดสอบ
   - ปรับปรุงฟังก์ชัน `test.afterAll` ให้ค้นหาและลบไฟล์แนบที่สร้างขึ้นในโฟลเดอร์ `server/test-uploads` แทนการลบจากโฟลเดอร์หลัก และไม่กลืน (swallow) error ทิ้ง
4. **Screenshot Protection:**
   - กำหนดให้ E2E เมื่อรันภายใต้ Test Mode บันทึกภาพหน้าจอลงใน `artifacts/lab-03/screenshots/` เพื่อป้องกันการเขียนทับภาพหน้าจอหลักฐานเดิมของ Lab 2 ใน `artifacts/lab-02/screenshots/`
5. **การขยายการทดสอบ HARNESS-01 ([`server/tests/lab-03/test-environment.test.ts`](file:///d:/toktickit/server/tests/lab-03/test-environment.test.ts)):**
   - เพิ่มชุดการทดสอบแบบครอบคลุม 15 Test Cases: ตรวจจับ Path Traversal, อักขระอันตรายใน Run ID, โปรโตคอลที่ไม่ถูกต้อง, ฐานข้อมูลที่ไม่อยู่ใน Allowlist, การตรวจสอบ `TOKTICKIT_TEST_MODE`, และการแยกโฟลเดอร์ Uploads

---

### 2.6 การแก้ไขตามข้อตรวจพบ Peer Review
1. **[P1/P2 แก้ไขแล้ว] ป้องกัน API override ชี้ไป dev server และคุ้มครองภาพ Lab 2:**
   - เพิ่มฟังก์ชัน `validateApiEndpoint` และ `resolveApiBase` ใน `server/src/config/testEnvironment.ts` และนำเข้าใช้งานโดยตรงใน `e2e/lab-02/requester-ticket-flow.spec.ts` เพื่อปฏิเสธทันทีหาก API URL ชี้ไปยังพอร์ต 3000 ของเซิร์ฟเวอร์ Development (ครอบคลุมทั้ง localhost, 127.0.0.1, 0.0.0.0, [::1]) และในโหมดทดสอบจะละเว้น `VITE_API_URL` ที่ชี้ไปยัง dev server โดยอัตโนมัติ
   - ใน `playwright.config.ts` ได้ซิงค์ `TOKTICKIT_TEST_RUN_ID`, `TOKTICKIT_TEST_MODE`, `DATABASE_URL`, `DATABASE_URL_TEST`, `SCREENSHOT_DIR`, `API_URL` (3001) และ `VITE_API_URL` (3001) ให้กับ worker process
   - ใน `e2e/lab-02/requester-ticket-flow.spec.ts` กำหนด `SCREENSHOT_BASE` ให้ fallback ไปที่ `artifacts/lab-03/screenshots/<runId>` เท่านั้น ป้องกันการเลือกพาธของ Lab 2 อย่างเด็ดขาด
2. **[P1/P2 แก้ไขแล้ว] Cleanup ปลอดภัยและจำกัด Containment เฉพาะโฟลเดอร์รอบทดสอบ (`runSpecificDir`):**
   - worker ได้รับ `runId` ตรงกับเซิร์ฟเวอร์
   - ตัด `server/uploads` และ `uploads` ออกจากรายการค้นหาในโหมดทดสอบทั้งหมด
   - ปรับการค้นหาและตรวจสอบ containment ด้วย `assertContained` ให้จำกัดเฉพาะโฟลเดอร์รอบทดสอบ `runSpecificDir` (`server/test-uploads/<runId>`) ไม่ค้นหากว้างใน `testUploadsRoot` เพื่อป้องกันการลบไฟล์ข้ามรอบ
   - ลบการกลืน error เพื่อให้ข้อผิดพลาดในการ cleanup แสดงผลและทำให้เทสล้มอย่างชัดเจน
3. **[P2 แก้ไขแล้ว] ใช้งาน Helper ชุดเดียวกันระหว่าง Tests และ E2E:**
   - ปรับปรุง `e2e/lab-02/requester-ticket-flow.spec.ts` ให้ import และเรียกใช้งาน `resolveApiBase` และ `assertContained` โดยตรงจาก `server/src/config/testEnvironment.js` ลบฟังก์ชันซ้ำซ้อนเดิมทั้งหมด เพื่อให้ test suite และ E2E ใช้ logic และ guard เดียวกัน 100%
4. **[P2 แก้ไขแล้ว] พิสูจน์ Worker Propagation และ Playwright Guard ที่รันไทม์จริง:**
   - ขยาย `server/tests/lab-03/test-environment.test.ts`
   - รันคำสั่ง Playwright CLI จริง (`npx playwright test --list`) ผ่าน subprocess เพื่อพิสูจน์การ fail-closed เมื่อไม่มี `DATABASE_URL_TEST` หรือชี้ไปยัง development database (`toktickit`) และการผ่านเมื่อชี้ไปยัง allowlisted test database
   - ตรวจสอบ config Playwright ด้านความปลอดภัย (`reuseExistingServer: false`, `workers: 1`, พอร์ต 3001)
5. **[P2 แก้ไขแล้ว] ตรวจสอบ Environment จาก Playwright จริงโดยไม่พึ่งพา Build Artifacts และจำลอง Unlink ล้มเหลวใน Cleanup จริง:**
   - สร้าง `e2e/lab-03/worker-env.spec.ts` และปรับให้ `server/tests/lab-03/test-environment.test.ts` รัน Playwright CLI จริง (`npx playwright test e2e/lab-03/worker-env.spec.ts --project=desktop`) เพื่อยืนยัน environment propagation จาก `playwright.config.ts` สู่ worker process จริง โดยนำเข้าจาก TypeScript sources ไม่พึ่งพา `./server/dist/` build artifacts
   - สกัดฟังก์ชัน cleanup ส่วนกลาง `cleanupAttachmentFiles` ไว้ใน `server/src/config/testEnvironment.ts` และนำไปใช้งานทั้งใน `e2e/lab-02/requester-ticket-flow.spec.ts` (`test.afterAll`) และ integration tests
   - เพิ่มการทดสอบจำลอง Physical Unlink Failure (จำลอง `unlinkFn` throw error เช่น `EPERM`) เพื่อพิสูจน์ว่า cleanup failures จะ throw และไม่ถูกกลืนเงียบ ทำให้รันการทดสอบล้มเหลวอย่างชัดเจนตามข้อกำหนด HARNESS-01 ครบถ้วน
6. **[P1 แก้ไขแล้ว] จำกัดการข้าม webServer ให้เฉพาะ probe โดยตัดตัวกรอง regex และใช้ exact path resolution:**
   - ใน `playwright.config.ts` ปรับปรุงฟังก์ชัน `isProbeFile` ให้ตรวจสอบเส้นทางไฟล์ที่แน่นอน (`path.resolve(fileArg) === path.resolve("e2e/lab-03/worker-env.spec.ts")`) แทนการใช้ regex หลวม (`/worker-env|probe/i`) ซึ่งเดิมอาจทำให้ไฟล์ non-probe ที่มีคำว่า probe ในชื่อหรือโฟลเดอร์หลุดรอด
   - ตัดการเซ็ตและแพร่กระจายตัวแปร `PLAYWRIGHT_IS_PROBE` ใน `process.env` ออกเพื่อป้องกัน state ตกค้าง และเพิ่มการ `trim()` ตัวแปร `PLAYWRIGHT_SKIP_WEBSERVER`
   - หากมีการตั้งค่าดังกล่าวเพื่อพยายามข้าม webServer ในการรันชุดทดสอบทั่วไปหรือ non-probe tests (รวมถึงไฟล์ที่มีคำว่า probe ในชื่อ) ระบบจะ Fail-closed โยน Exception ปฏิเสธการทำงานทันที
   - เพิ่มเคสทดสอบใน `server/tests/lab-03/test-environment.test.ts` (รวมเป็น **24 tests**) ยืนยันการปฏิเสธดังกล่าวอย่างรัดกุมครบถ้วน

---

## 3. ผลลัพธ์และสถานะปัจจุบัน (Current State)

1. **ผลการทดสอบ HARNESS-01:**
   - รันผ่านครบทั้ง **24 Tests** ใน `server/tests/lab-03/test-environment.test.ts` (ใช้เวลา ~7.84s รวมการรัน Playwright CLI subprocesses)
   - ยืนยันว่าระบบ Fail-closed Guard, Worker Propagation จาก Playwright จริงโดยไม่พึ่งพา build artifacts, WebServer Skip Guard ที่จำกัดเฉพาะ probe, API Port Validation, และ Shared Containment Cleanup พร้อมการจำลอง Physical Unlink Failure ทำงานถูกต้องครบถ้วน
2. **TypeScript Compilation & Build:**
   - `server`: รัน `npm --prefix server run build` (`tsc`) สำเร็จ ปราศจาก Type Error
   - `client`: รัน `npm --prefix client run build` (`tsc && vite build`) สำเร็จใน 0.78s
3. **Client Tests:**
   - รันผ่านครบ **37 Tests** (8 suites) ปราศจากข้อผิดพลาดใน 8.90s
4. **สถานะการตรวจรับงาน:**
   - ปรับสถานะ F1 และ HARNESS-01 เป็น **`In progress — P02 review fixes applied`**
   - การรัน Full Server DB Suite และ Playwright E2E Integration ทั้งหมดจะดำเนินการเมื่อมีการยืนยัน disposable PostgreSQL service บนเครื่องต่อไป (ไม่สรุปงานเสร็จล่วงหน้า)

