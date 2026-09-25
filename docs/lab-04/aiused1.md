# AI Use and Reflection — Major Phase F1: Setup, Contracts, Decisions & Test Traceability (aiused1.md)

**Sprint:** TokTickIT Lab 4 (Actions Taken, Workflow Resolution Gate, Dashboards & Final Regression)  
**Major Phase:** F1 — เตรียมแผน, สัญญาทางวิศวกรรม, ข้อตกลงสถาปัตยกรรม และระบบทดสอบ (L4-P00, L4-P01, L4-P02)  
**LLM / AI Coding Agent:** Antigravity AI Coding Agent (Gemini 3.8 Flash High)  
**IDE:** Antigravity IDE (VS Code–based agentic environment)  
**Date:** 2026-09-26  

---

## 1. Selected Key Prompts (ตารางบันทึกการใช้งาน AI ในช่วง Major Phase F1)

| # | ข้อความ Prompt (สรุปใจความสำคัญ) | สิ่งที่ AI ดำเนินการและผลลัพธ์ที่ได้ | ข้อคิดและการสะท้อนผล (Reflection) |
|---|---|---|---|
| 1 | *เริ่มต้น Phase F1 ตรวจสอบ Baseline และสภาพแวดล้อมโดยไม่แก้โค้ดจริง* | AI ทำการตรวจสอบ Git Working tree, รันเทสต์คุ้มครองความปลอดภัย Test Environment Guard (`testEnvironment.ts`) ผ่านครบ 24/24 tests, ตรวจสถานะ Docker container `toktickit-db`, รัน TypeScript builds และ Client tests (82/82 pass) แล้วบันทึกไว้ใน [`baseline.md`](baseline.md) | การตรวจสอบสภาพแวดล้อมแบบ Read-Only ตั้งแต่เริ่มต้นช่วยการันตีความปลอดภัยของข้อมูลจริง และยืนยันว่าระบบเดิมของ Lab 1–3 ไม่เกิด Regression ก่อนเริ่มงานใหม่ |
| 2 | *จัดทำร่างสัญญาทางวิศวกรรม Lab 4 ให้ครบถ้วนตามโจทย์ §9 ทั้ง 4 ฉบับ พร้อม decisions.md* | AI ร่าง `specification.md` (11 หัวข้อ, FR-01–18, BR-01–20, AC-01–35, Prisma Schema), `api-spec.md` (Error envelopes, Endpoints, Dashboards), `ui-spec.md` (Zen Green tokens, Badges, Modals), และ `decisions.md` (D01–D10) | Spec-Driven Development ช่วยให้ทีมเห็นโครงสร้าง API, กฎเกณฑ์ทางธุรกิจ และขอบเขตงานทุกมิติก่อนเริ่มเขียนโค้ด ลดความผิดพลาดและข้อขัดแย้งในอนาคต |
| 3 | *ตรวจสอบและแก้ไขข้อตรวจพบ F1 Review Round 1 (R01–R10)* | AI ปรับปรุง Error envelope ให้เป็น Flat structure, คืน Stale message baseline, รองรับ Responsive 3 viewports, ปรับ Action status badges, และขยายตาราง Test Traceability | การมีกระบวนการ Peer Review ตั้งแต่ขั้นร่างสัญญาช่วยดักจับจุดขัดแย้งระหว่างระบบใหม่กับระบบเดิมได้อย่างรวดเร็ว |
| 4 | *แก้ไขข้อตรวจพบ F1 Review Round 2: ป้องกัน Network Retry ซ้ำ, Row lock order, Parity บน Dashboard, และ Error constants* | AI ยกเลิก In-memory Map; ย้าย `clientRequestId` ลงในตาราง DB, กำหนดลำดับการล็อกแถว Parent Ticket ด้วย `SELECT ... FOR UPDATE`, จับคู่ 1:1 ระหว่าง Card $\leftrightarrow$ API Query $\leftrightarrow$ Drill-down URL, และตัด prefix `ERR_` ทั้งหมดทิ้ง | การวิเคราะห์กลไก Concurrency ร่วมกับ AI ช่วยออกแบบ Transaction serialization ที่ปิดช่องโหว่ Race Conditions ได้อย่างรัดกุม |
| 5 | *กำหนด Idempotency Scope `(createdById, ticketId, clientRequestId)` ให้ตรงกันทุกเอกสาร พร้อมเพิ่ม canonical payload hash* | AI ซิงค์ unique constraint เป็น `@@unique([createdById, ticketId, clientRequestId])`, เพิ่ม `requestPayloadHash String?` (SHA-256 ของ 8 ฟิลด์ payload) เพื่อป้องกัน 409 หลัง action ถูกแก้ไข, ปรับลำดับให้ตรวจ replay ก่อน terminal check, และขยายชุดทดสอบ `API-L4-24a` ถึง `API-L4-24h` | การตั้ง Scope ที่ครอบคลุม `createdById` จาก session ช่วยแยก Namespace ระหว่างผู้ใช้ได้อย่างปลอดภัย และการใช้ Payload Hash ช่วยให้การ Retry คำขอยังคงได้รับ 200 Replay เสมอแม้ตั๋วถูกปิดไปแล้ว |
| 6 | *ทำเหมือนเดิม: สร้าง branch, สร้าง issue, link issue, เปิด pr ตาม workflow มาตรฐานของแล็บ* | AI สร้างสาขา `lab4-staging` จาก `main` (`baad45e`) push ขึ้น origin, สร้าง feature branch `docs/lab4-contract` commit เอกสาร F1, สร้าง GitHub [Issue #46](https://github.com/JinggXd/TokTickIT/issues/46), และเปิด [Pull Request #47](https://github.com/JinggXd/TokTickIT/pull/47) สู่ `lab4-staging` พร้อมบันทึกลง log | การปฏิบัติตาม Git & GitHub Pipeline มาตรฐานของทีมช่วยรักษาประวัติการทำงานที่โปร่งใส ตรวจสอบย้อนกลับได้ และพร้อมสำหรับการส่งงาน |
| 7 | *ขอรีวิวหน่อย และเขียน what_i_have_done1 กับ ai_used1* | AI ดำเนินการตรวจสอบ Invariants และเงื่อนไขสัญญาของทุกเอกสาร, จัดทำ Review Report สรุปสถานะ, และจัดทำเอกสารสรุปผลงาน `what_i_have_done1.md` กับ `ai_used1.md` ตามระเบียบการส่งงาน | การจัดทำเอกสารสรุปผลงานและการสะท้อนผลการใช้ AI อย่างเป็นระบบ ช่วยให้ทีมและผู้ประเมินสามารถตรวจสอบความถูกต้องของผลงานได้ทันที |

---

## 2. My Reflection (การสะท้อนผลการใช้งาน AI)

ในการทำงาน Major Phase F1 (L4-P00–L4-P02) ได้ประยุกต์ใช้ AI Coding Agent ภายใต้ระเบียบวินัยทางวิศวกรรมซอฟต์แวร์อย่างเคร่งครัด สรุปประเด็นสะท้อนผลได้ 4 มิติสำคัญ:

1. **การควบคุมขอบเขตและไม่เขียนโค้ดล่วงหน้า (Strict Scope Control & No Premature Implementation):**
   - AI ได้รับการควบคุมอย่างเข้มงวดไม่ให้เริ่มเขียนโค้ดฟีเจอร์ใน `server/` หรือ `client/` และไม่รัน Prisma migration ใดๆ ใน Phase F1 จนกว่าเอกสารสัญญาและการออกแบบการทดสอบจะได้รับการตรวจรับอย่างเป็นทางการ ช่วยให้กระบวนการพัฒนาเป็นไปตามลำดับขั้นตอนและไม่มีโค้ดหลุดรอด
2. **การวิเคราะห์ Concurrency และ Distributed Idempotency Invariants:**
   - การออกแบบระบบบันทึกการปฏิบัติงาน (Actions Taken) มีความท้าทายสูงเรื่อง Network Retry และ Race Conditions ระหว่างการปิดตั๋ว (Resolution) กับการสร้าง Action การใช้ AI ช่วยค้นหา Edge Cases นำไปสู่การออกแบบ **Immutable Payload Hash (`requestPayloadHash`)** และการจัดลำดับการตรวจ Replay ก่อน Terminal check ซึ่งแก้ไขปัญหา Spurious 409 Conflict ได้อย่างชาญฉลาด
3. **การรักษาความสอดคล้องระดับข้ามเอกสาร (Cross-Document Consistency & Single Source of Truth):**
   - สัญญาทางวิศวกรรมประกอบด้วยไฟล์หลายฉบับที่เกี่ยวข้องกัน (`specification.md`, `api-spec.md`, `ui-spec.md`, `decisions.md`, `tests.md`, `PHASES.md`, `issue-drafts.md`) การสั่งการให้ AI ทำการ Audit และ Synchronize รหัสข้อผิดพลาด โทนสี และสโคป Idempotency ช่วยลดความคลาดเคลื่อนของข้อมูลระหว่างแต่ละเอกสารได้อย่างมีประสิทธิภาพ
4. **ความโปร่งใสและการยึดมั่นในหลักฐานจริง (Evidence Integrity & Peer Review):**
   - เมื่อได้รับ Feedback จาก Peer Review AI ยอมรับข้อบกพร่องทางเอกสารและดำเนินการปรับปรุงแก้ไขตรงตามหลักการ ไม่พยายามปกปิดหรือด่วนสรุปสถานะ "Approved / Done" แทนผู้ใช้ โดยคงสถานะ D01–D10 เป็น `Proposed (TBD)` และรายงานผลการตรวจรับบนหลักฐานจริงเสมอ
