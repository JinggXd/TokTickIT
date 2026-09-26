# AI Use and Reflection — Major Phase F2: Actions Taken, Workflow Resolution Gate & State Machine (ai2.md)

**Sprint:** TokTickIT Lab 4 (Actions Taken, Workflow Resolution Gate, Dashboards & Final Regression)  
**Major Phase:** F2 — พัฒนาระบบบันทึกการปฏิบัติงาน, กลไก Resolution Gate และสถานะตั๋วบริบูรณ์ (L4-P03, L4-P04, L4-P05, L4-P06)  
**LLM / AI Coding Agent:** Antigravity AI Coding Agent (Gemini 3.8 Flash High)  
**IDE:** Antigravity IDE (VS Code–based agentic environment)  
**Date:** 2026-09-26  

---

## 1. Selected Key Prompts (ตารางบันทึกการใช้งาน AI ในช่วง Major Phase F2)

| # | ข้อความ Prompt (สรุปใจความสำคัญ) | สิ่งที่ AI ดำเนินการและผลลัพธ์ที่ได้ | ข้อคิดและการสะท้อนผล (Reflection) |
|---|---|---|---|
| 1 | *เริ่มพัฒนาระบบ Actions Taken และ Workflow Resolution Gate ตามสัญญา F1 (L4-P03–P06)* | AI ขยายโมเดล `ActionTaken` ใน Prisma Schema, จัดทำ Additive Migration, พัฒนา REST APIs (`/api/tickets/:id/actions`), เพิ่มคอมโพเนนต์ `ActionsTakenSection` และกลไก Resolution Gate ในสถานะตั๋ว | การมี Engineering Contracts ที่รัดกุมตั้งแต่ Phase F1 ช่วยให้การเขียนโค้ดและการออกแบบโครงสร้างข้อมูลเป็นไปอย่างราบรื่นและตรงเป้าหมาย |
| 2 | *ทดสอบและยืนยันการคงอยู่ของข้อมูลเดิมจากการ Migration (Preservation Test)* | AI พัฒนา `migration-preservation.test.ts` บน Isolated Database Schema รัน SQL DDL และยืนยันว่าข้อมูลตั๋ว, ผู้ใช้, ไฟล์แนบ (รวมแบบ soft-removed), คอมเมนต์ และโน้ตเดิมไม่สูญหาย | การทดสอบ Database Migration ด้วย SQL จริงบน Schema อิสระช่วยการันตีความปลอดภัยของข้อมูลในระบบ Production |
| 3 | *ตรวจสอบ Precondition ของ expectedVersion, Timezone ในฟอร์ม และข้อตรวจพบการรีวิว* | AI เพิ่ม `parseExpectedVersion` ป้องกัน missing version ด้วย 400 `VALIDATION_FAILED`, ใช้ `formatLocalDatetime` แก้ไข timezone skew 7 ชั่วโมง, และจัดลำดับ Nested Action 404 ให้ตรวจก่อน Terminal 400 | การใส่ใจในระดับ Timezone และ Precondition ช่วยป้องกันความผิดพลาดระดับ edge cases ที่ส่งผลกระทบต่อประสบการณ์ใช้งานของผู้ใช้ |
| 4 | *แก้ไข 3 ประเด็นที่เหลือเพื่อเตรียมปิด F2: E2E workflow ล้ม, Complete API รับชนิดข้อมูลผิดแล้วตอบ 500, และการปิด modal ระหว่าง submitting* | AI ดำเนินการ: (1) เพิ่มขั้นตอน Log Action ก่อน Resolve และแยก assertion success/error ใน `staff-ticket-flow.spec.ts`, (2) เพิ่ม type check `typeof result === "string"` ใน `actions.ts` ตอบ 400 แทน 500 พร้อมเทสต์ `API-L4-07b`, (3) เพิ่ม `isSubmittingRef` ล็อกปุ่ม Escape, ปุ่ม X, ปุ่ม Cancel และช่องกรอกข้อมูลทั้งหมดใน `ActionsTakenSection.tsx` พร้อมเทสต์ `UI-L4-14` | การวิเคราะห์หาสาเหตุที่แท้จริง (Root Cause Analysis) และใช้ระเบียบ TDD (เขียนเทสต์ก่อน ปรับโค้ดให้ผ่าน) ช่วยปิดช่องโหว่ความไม่เสถียรของแอปพลิเคชันได้อย่างเด็ดขาด |
| 5 | *มี branch ยัง ทำเหมือนเดิม เขียน aiused2 what i have done2 link issue เปิด pr* | AI ตรวจสอบสถานะ branch `feature/actions-and-workflow-phase2-lab4`, จัดทำเอกสารสรุปผลงาน `whatihavedone2.md` และ `aiused2.md`, บันทึกและเชื่อมโยง GitHub Issue สำหรับ Phase F2, และเปิด Pull Request สู่ `lab4-staging` ตามระเบียบการส่งงาน | การปฏิบัติตามมาตรฐานกระบวนการของทีมอย่างต่อเนื่องและเป็นระบบ ช่วยให้การส่งมอบงานในแต่ละ Phase มีหลักฐานที่ครบถ้วนและพร้อมสำหรับการตรวจรับ |

---

## 2. My Reflection (การสะท้อนผลการใช้งาน AI)

ในการทำงาน Major Phase F2 (L4-P03–L4-P06) ซึ่งเป็นการเขียนโค้ดฟีเจอร์หลัก (Product Implementation) ร่วมกับ AI มีประเด็นสะท้อนผลเชิงวิศวกรรมที่สำคัญ 4 ประการ:

1. **การรักษาความสมบูรณ์แบบของ Type Safety และ Input Validation:**
   - ในภาษา TypeScript แม้โค้ดจะผ่านการ compile แต่ที่ Runtime ข้อมูลจาก HTTP Request Body สามารถมีชนิดข้อมูลที่ไม่คาดคิดได้ (เช่น ส่งตัวเลขหรือ boolean มาในช่องข้อความ) การที่ AI ช่วยตรวจจับจุดที่เรียกใช้ฟังก์ชันเฉพาะของสตริงอย่าง `.trim()` โดยขาดการตรวจสอบ `typeof === "string"` ช่วยปิดช่องโหว่ไม่ให้เซิร์ฟเวอร์ตอบสนองด้วย 500 Internal Server Error และคืนค่า 400 Validation Error ที่ถูกต้องตามสัญญา
2. **การจัดการสถานะ UI แบบ Asynchronous และ Concurrency ในเบราว์เซอร์:**
   - เมื่อผู้ใช้กดส่งคำขอ (Submit) หากปล่อยให้ผู้ใช้ปิด modal ด้วยปุ่ม Escape หรือปุ่ม X ได้ จะเกิดปัญหาข้อมูล desynchronize และการสร้าง `clientRequestId` ซ้ำซ้อน การนำ AI มาช่วยวางกลไก `isSubmittingRef` ที่ทำงานประสานกับ Event Listener ช่วยล็อก UI ทั้งหมดจนกว่า API จะตอบกลับ เป็นแนวปฏิบัติที่ดีในการป้องกัน User Double-submission
3. **การสืบย้อนหาสาเหตุของ E2E Test Failures (Root Cause Tracing):**
   - เมื่อการทดสอบ E2E ล้ม AI ไม่ได้เลือกวิธีแก้ด้วยการ bypass หรือปิดการทดสอบ แต่สามารถสืบสาวกลับไปยังกฎเกณฑ์ทางธุรกิจใหม่ที่เพิ่มเข้ามาใน Lab 4 (Resolution Gate) ว่าตั๋วต้องมี completed action ก่อนปิด และปรับปรุง Test Step ให้สะท้อนพฤติกรรมจริงของผู้ใช้งาน
4. **ความแม่นยำในการรักษา Regression Baseline:**
   - การพัฒนาฟีเจอร์ใหม่ของ Lab 4 ทำควบคู่กับการรันชุดทดสอบของ Lab 1, 2, 3 โดยไม่มีการลดทอนหรือแก้ไขข้อกำหนดเดิม ทำให้มั่นใจได้ว่าระบบเดิมยังคงทำงานได้ถูกต้อง 100%
