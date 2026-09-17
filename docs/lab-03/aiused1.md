# AI Use and Reflection — Major Phase F1: Setup, Contract & Test Harness (aiused1.md)

> [!NOTE]
> เอกสารฉบับนี้เป็นเนื้อหาเดียวกับ [`ai1.md`](ai1.md) จัดทำขึ้นเพื่อรองรับการอ้างอิงชื่อไฟล์ทั้งสองรูปแบบ (`ai1.md` และ `aiused1.md`)

**Sprint:** TokTickIT Lab 3 (Full Ticketing & IT Lifecycle System)  
**Major Phase:** F1 — เตรียมแผนและระบบทดสอบ (P00, P01, P02)  
**LLM / AI Coding Agent:** Antigravity AI Coding Agent (Gemini 3.8 Flash)  
**IDE:** Antigravity IDE (VS Code–based editor with Agentic capabilities)  
**Date:** 2026-09-17  

---

## 1. Selected Key Prompts (ตารางบันทึกการใช้งาน AI ในช่วง Major Phase F1)

| # | ข้อความ Prompt (สรุปใจความ) | สิ่งที่ AI ทำและผลลัพธ์ที่ได้ | ข้อคิดและการสะท้อนผล (Reflection) |
|---|---|---|---|
| 1 | *ตรวจ Baseline ของ Lab 2 โดยไม่แก้ไขโค้ดใดๆ และจัดทำรายงาน pre-flight inspection* | AI ดำเนินการตรวจสอบ working tree, git status, จำนวนแถวใน PostgreSQL และไฟล์แนบจริงใน `server/uploads` รวมทั้งรัน Baseline tests แล้วบันทึกไว้ใน [`baseline.md`](baseline.md) | การตรวจสอบสถานะเดิมแบบ Read-Only ช่วยป้องกัน Regression และทำให้มั่นใจว่าข้อมูลตั้งต้นของ Lab 2 ยังอยู่ครบถ้วนก่อนเริ่มงานขยายใน Lab 3 |
| 2 | *จัดทำสัญญาทางวิศวกรรม Lab 3 ครบทั้ง 4 ฉบับ และร่างข้อเสนอ Legacy Change Proposals (LCP) สำหรับส่วนที่ต้องแตะต้องของเดิม* | AI จัดทำ `specification.md`, `api-spec.md`, `ui-spec.md`, และ `tests.md` พร้อมเสนอ LCP-01 ถึง LCP-05 เพื่อขออนุมัติการแก้ไขระบบเดิมอย่างโปร่งใส | การยึดมั่นใน Spec-Driven Development ทำให้เห็นภาพรวมของทั้ง 3 Roles, State Machine, Status Codes และ Security Rules ก่อนเริ่มแตะโค้ด |
| 3 | *จัดกลุ่มแผนงานย่อย P00–P14 เดิม ให้เป็น 5 เฟสใหญ่ (F1–F5) โดยไม่ลดทอนขอบเขตหรือเกณฑ์ตรวจรับงาน* | AI ปรับปรุง [`PHASES.md`](PHASES.md), `.antigravityrules`, และกฎที่เกี่ยวข้อง ให้มีโครงสร้าง 5 เฟสใหญ่ F1–F5 พร้อมรักษา Work Package IDs (P00–P14) และ Dependencies ทั้งหมด | ช่วยให้การติดตามและรายงานความคืบหน้าง่ายและกระชับขึ้นตามมาตรฐานของโปรเจกต์ ขณะเดียวกันยังรักษาความรัดกุมของทุก Acceptance Criteria |
| 4 | *สร้างระบบ Test Isolation Harness และ Safety Guards (LCP-01) เพื่อป้องกันการแตะต้องฐานข้อมูลจริง* | AI พัฒนา `testEnvironment.ts` และ `run-tests.mjs` พร้อมเขียนเทสต์ `HARNESS-01` ตามแนวทาง TDD ให้ปฏิเสธ (Fail-closed) หากไม่มี `DATABASE_URL_TEST` ที่ชี้ไปยัง `toktickit_test` หรือมี Path Traversal | การสร้าง Environment Isolation ตั้งแต่แรกช่วยปกป้องข้อมูลจริงใน Development/Production ได้ 100% จากการรันเทสต์อัตโนมัติ |
| 5 | *แก้ไขข้อตรวจพบของ P02 ให้สมบูรณ์ (Pre-import guard, E2E Port 3000, Cleanup paths, Screenshot isolation) และขยายเทสต์ HARNESS-01* | AI ย้าย guard ออกจาก `beforeAll` ใน `setup.ts`, ปรับแก้ E2E ให้ใช้พอร์ต 3001 และแยก path ของ Screenshots ออกจาก Lab 2, พร้อมขยายเทสต์ `test-environment.test.ts` จนผ่านครบ 15 Tests | การรับฟังและแก้ไขตาม Peer Review Findings ช่วยให้ระบบทดสอบมีเสถียรภาพสูง และปิดช่องโหว่ความไม่ปลอดภัยของสภาพแวดล้อมได้จริง |
| 6 | *เปลี่ยนชื่อ Branch ให้สอดคล้องกับ F1 ใหญ่ ทำต่อให้ครบ F1 พร้อมขอแผนงาน และสร้าง aiused1 กับ whatihavedone1 ใน lab3 เหมือนของ lab2* | AI วาง Implementation Plan ขออนุมัติ, เปลี่ยนชื่อ branch เป็น `feature/f1-prep-and-test-harness`, รันเทสต์และบิลด์ผ่าน 100%, และสร้างเอกสารสรุป `whatihavedone1.md` กับ `ai1.md` / `aiused1.md` | การบันทึกและจัดการเอกสารอย่างเป็นระบบควบคู่กับการพัฒนาจริง ทำให้เอกสารหลักฐานของแล็บมีความสมบูรณ์ สอดคล้องกับมาตรฐานที่กำหนด |
| 7 | *Peer Review Feedback พบ 3 จุด: 1) ภาพ Lab 2 ยังเสี่ยงถูกทับเพราะ worker ไม่ได้รับ env, 2) Cleanup ยังไม่ปลอดภัยเพราะไม่มี containment และยังค้นใน uploads เดิม, 3) สถานะ Verified ยังเร็วไปเพราะยังไม่ได้รัน full integration บน disposable DB* | AI ปรับปรุง `playwright.config.ts` ให้ส่ง env สู่ worker, บังคับ fallback screenshot ลง `artifacts/lab-03/screenshots/<runId>`, ปรับ cleanup ให้ค้นเฉพาะ `server/test-uploads` พร้อมตรวจ `assertContainedWithin` และไม่กลืน error, ขยาย HARNESS-01 เป็น 19 tests, และปรับสถานะ F1 กลับเป็น `In progress` ตามความจริง | การทำงานร่วมกับ Peer Reviewer และการยึดมั่นในหลักฐานจริง (Evidence Integrity) ป้องกันการรายงานผลเท็จ (False Pass) และทำให้มั่นใจว่าระบบปลอดภัยในทุกมิติก่อนประกาศความพร้อม |
| 8 | *Peer Review Feedback รอบ 2: 1) Worker test ยังไม่ได้ตรวจ env จาก Playwright จริงและพึ่งพา build artifact ใน `test-environment.test.ts:332,339`, 2) Cleanup failure ยังตรวจเพียง path rejection ไม่ได้จำลอง unlink ล้มเหลวใน cleanup จริง* | AI สร้าง `e2e/lab-03/worker-env.spec.ts` รันด้วย Playwright CLI จริงเพื่อตรวจ env ใน worker โดยตรงไม่ผ่าน `./server/dist/`, สกัด `cleanupAttachmentFiles` ไว้ใน `testEnvironment.ts` ให้ E2E และ unit tests ใช้ร่วมกัน, และเพิ่มเคสจำลอง unlink ล้มเหลว (`unlinkFn` throw error) ใน `test-environment.test.ts` จนผ่านครบ 23 tests | ช่วยปิดช่องโหว่ความน่าเชื่อถือของ Test Harness ได้อย่างสมบูรณ์แบบ โดยระบบทดสอบพิสูจน์การทำงานจริงของ Playwright worker และการจัดการข้อผิดพลาดในการ cleanup ไฟล์จริง |
| 9 | *Peer Review Feedback รอบ 3: จำกัดการข้าม webServer ให้เฉพาะ probe [P1]* | AI แก้ไข `playwright.config.ts` ให้ตรวจจับ `isProbeExecution(process.argv)` บังคับให้การข้าม webServer (`PLAYWRIGHT_SKIP_WEBSERVER=true`) ทำได้เฉพาะเมื่อเจาะจงรัน probe test เท่านั้น หากนำไปใช้กับ test อื่นจะถูกปฏิเสธ (Fail-closed) ทันที พร้อมเขียนเทสต์คุ้มครองจนผ่านครบ 24 tests | ปิดช่องโหว่ความปลอดภัยระดับ P1 เพื่อไม่ให้มีการรัน E2E ปกติโดยหลุดรอดจากการเปิดเซิร์ฟเวอร์ทดสอบที่ถูกแยกขาด (Isolated WebServer) |
| 10 | *ตัวกรอง regex ยังทำให้ non-probe ข้าม webServer ได้ playwright.config.ts:65-71* | AI แก้ไข `isProbeFile` ใน `playwright.config.ts` ให้ใช้การ resolve path ที่แน่นอนเปรียบเทียบกับ `e2e/lab-03/worker-env.spec.ts` โดยตรง แทนการใช้ regex หลวม ตัด `PLAYWRIGHT_IS_PROBE` state mutation ออก และ trim ตัวแปรสภาพแวดล้อม พร้อมปรับเทสต์ยืนยัน fail-closed ครบ 24 tests | กำจัดช่องโหว่ False Match ของตัวกรอง regex โดยสิ้นเชิง ป้องกันไม่ให้การรันชุดทดสอบอื่นหรือไฟล์ที่มีชื่อคล้าย probe ข้าม isolated webServer ได้ในทุกกรณี |

---

## 2. My Reflection (การสะท้อนผลการใช้งาน AI)

ในการดำเนินการ Major Phase F1 (P00–P02) ได้ใช้ศักยภาพของ AI Coding Agent ร่วมกับระเบียบวินัยทางวิศวกรรมซอฟต์แวร์อย่างเคร่งครัด สรุปประเด็นสะท้อนผลได้ 4 มิติหลัก:

1. **การควบคุมขอบเขตและไม่เขียนโค้ดล่วงหน้า (Strict Scope Control & No Premature Code):**
   - AI ถูกกำกับไม่ให้ลงมือสร้างระบบ Login, ขยาย Database Schema หรือเขียนฟีเจอร์ของ Lab 3 จนกว่าขั้นตอน Specification (P01) และ Test Harness (P02) จะผ่านการตรวจรับ ทำให้ขอบเขตงานไม่บานปลายและเป็นไปตามลำดับของเฟสอย่างแท้จริง
2. **ความปลอดภัยของข้อมูลและการแยกสภาพแวดล้อมทดสอบ (Fail-Closed Environment Isolation):**
   - การให้ AI พัฒนาระบบ Guard แบบ Fail-closed เป็นตัวอย่างที่ดีของการป้องกันอุบัติเหตุข้อมูลสูญหาย (Accidental Data Loss Prevention) โดยระบบจะปฏิเสธการทำงานทันทีหากพบว่าชี้ไปยัง Database หลัก หรือมีความพยายามใช้ Path ที่หลุดออกจาก Sandbox หรือพยายาม bypass webServer ในการรันชุดทดสอบทั่วไป
3. **การทำ TDD กับระบบ Harness ทดสอบเอง (Meta-testing with HARNESS-01):**
   - ได้ให้ AI เขียน Unit Tests สำหรับตัว Guard ก่อน (`test-environment.test.ts`) และขยายขอบเขตการทดสอบให้ครอบคลุมทั้ง 24 กรณีทดสอบ (Path Traversal, Invalid Protocols, Name Whitelist, Runtime Mode mismatch, Playwright CLI fail-closed checks, Real Playwright worker env propagation, WebServer skip restriction for probe only, Shared containment cleanup helper, Simulated physical unlink failure, Dev-server reuse rejection)
4. **การยอมรับ Peer Review และความซื่อสัตย์ต่อหลักฐาน (Peer Review & Evidence Integrity):**
   - เมื่อ Peer Reviewer ตรวจพบว่าการรันบน worker ยังไม่ได้รับ environment หรือยังไม่ได้รันชุดทดสอบบน Disposable DB จริง AI ต้องปรับแก้ช่องโหว่เหล่านั้นอย่างถูกต้อง ไม่ดันทุรัง หรืออ้างสถานะ "Verified / Done" เกินจริง โดยคงสถานะเป็น `In progress` พร้อมแสดงหลักฐานจริงของการทดสอบ 24 tests ที่ผ่าน
