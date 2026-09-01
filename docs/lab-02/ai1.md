# AI Use and Reflection — Phase 1 & Setup (ai1.md)

**Sprint:** TokTickIT Lab 2 (Requester Ticketing MVP)  
**LLM / AI Coding Agent:** Antigravity AI Coding Agent (Gemini 2.5)  
**IDE:** Antigravity IDE (VS Code–based editor with Agentic capabilities)  
**Date:** 2026-08-30  

---

## 1. Selected Key Prompts (ตารางบันทึกการใช้งาน AI ในช่วง Setup & Phase 1)

| # | ข้อความ Prompt (สรุปใจความ) | สิ่งที่ AI ทำและผลลัพธ์ที่ได้ | ข้อคิดและการสะท้อนผล (Reflection) |
|---|---|---|---|
| 1 | *อ่าน Specification, Api spec, Ui spec, Tests, Agents, SKILL.md ทำตามนี้อย่างเข้มงวด ติดตั้ง skill ด้วย* | AI อ่านเอกสารสัญญาทั้งหมด ตรวจสอบความสอดคล้อง ตรวจสอบโมเดล `Category` เดิมจาก Lab 1 และติดตั้ง Skill ไว้ที่ `.agents/skills/lab2-toktickit-build/SKILL.md` | การให้ AI อ่านและวิเคราะห์สัญญาครบทุกฉบับก่อน ช่วยป้องกันการเดา Business Logic เอง และทำให้ทราบเงื่อนไขสำคัญล่วงหน้า เช่น การไม่ทำระบบ Auth จริง และการ enforce ownership ที่ backend |
| 2 | *Docs: Lab 2 spec & test plan เข้า repo docs/lab2-specs เอา 4 ไฟล์เข้า docs/lab-02/ ผ่าน PR เพื่อพิสูจน์ Spec-Driven Development* | AI สร้าง branch `lab2-staging`, แตก branch `docs/lab2-specs`, ย้ายเอกสารเข้า `docs/lab-02/`, ลบไฟล์ซ้ำที่ root, ทำ commit และ push ขึ้น GitHub เพื่อเปิด PR | ปฏิบัติตาม Git Workflow ของวิชาอย่างถูกต้อง ทำให้มี Git history ยืนยันว่าเอกสาร Spec เสร็จสมบูรณ์ก่อนเริ่มเขียนโค้ด (หลักฐาน Part 2: Spec DD) |
| 3 | *อธิบายทุกคำสั่งอย่างละเอียดว่าทำอะไรไปบ้าง มีความหมายว่าอะไร* | AI อธิบายคำสั่ง Git และการจัดการไฟล์ทีละคำสั่งอย่างละเอียด พร้อมเหตุผลเบื้องหลัง | ช่วยให้เข้าใจกลไกการทำงานของ Git Flow และเหตุผลที่ต้องใช้ branch staging แทน main |
| 4 | *จะทำอะไรถึงไหนบ้างบอกมาก่อน + อธิบาย code ที่จะทำ Phase 1 ร่างแผนก่อน execute* | AI จัดทำ Implementation Plan โดยละเอียด ระบุโครงสร้างไฟล์ Schema, ฟังก์ชัน Utility 4 ตัว และโครงสร้างการทดสอบ Unit Tests ก่อนเริ่มลงมือ | การวางแผนและเห็นภาพโค้ดทั้งหมดก่อนเริ่มทำ ช่วยให้ตรวจสอบความถูกต้องเทียบกับข้อกำหนดใน `tests.md` ได้ง่ายขึ้น |
| 5 | *ไปต่อเลย (อนุมัติให้ดำเนินการ Phase 1)* | AI เริ่มกระบวนการ TDD โดยเขียน Unit Tests (`UNIT-01` ถึง `UNIT-06`) ให้ล้มก่อน (Red) จากนั้นอัปเดต Prisma Schema, รัน Migration, พัฒนา Helper Functions จนเทสผ่าน 100% (Green) และเขียน Seed Data แบบ Idempotent | การทำตามกระบวนการ TDD อย่างเคร่งครัดช่วยให้มั่นใจได้ว่าโค้ดทุกบรรทัดตอบโจทย์ Acceptance Criteria และทำงานถูกต้องตั้งแต่แรก |
| 6 | *เขียนอธิบายที่ตัวเองทำเป็น .md ผลเทสอะไรบ้างเขียนเป็น .md ขอ aiused.md ด้วย* | AI สร้างไฟล์สรุปการทำงาน (`whatihavedone1.md`), สรุปผลการทดสอบ (`test1.md`), และบันทึกการใช้ AI (`ai1.md`) | ช่วยให้การบันทึกหลักฐานและเอกสารประกอบการส่งงาน (Lab Report) มีความสมบูรณ์ เป็นระบบ และตรวจสอบย้อนกลับได้ง่าย |

---

## 2. My Reflection (การสะท้อนผลการใช้งาน AI)
ในการทำงานช่วง Setup และ Phase 1 ได้นำ AI มาช่วยในการวิเคราะห์ข้อกำหนดจาก Engineering Contract ทั้ง 4 ฉบับอย่างละเอียด และกำหนดให้ AI ทำงานตามระเบียบวินัยทางวิศวกรรมซอฟต์แวร์อย่างเคร่งครัด (Spec-Driven Development และ Test-Driven Development):
1. **การควบคุมขอบเขต (Scope Control):** ป้องกันไม่ให้ AI เขียนโค้ดเกินขอบเขตที่กำหนด เช่น ห้ามสร้างระบบ Login จริง หรือห้ามแตะฟีเจอร์ของ IT Staff
2. **การทำ TDD ที่แท้จริง:** ให้ AI เขียนไฟล์ทดสอบ Unit Tests `UNIT-01` ถึง `UNIT-06` ก่อน และรันยืนยันว่าเกิด Red Phase จริงก่อนจะเริ่มเขียนฟังก์ชัน Utility เพื่อเปลี่ยนให้เป็น Green Phase
3. **ความถูกต้องของฐานข้อมูล:** ควบคุมให้การออกแบบ Schema มี Composite Index ตามที่กำหนด และเขียน Seed Script ด้วย `upsert` เพื่อการันตี Idempotency โดยได้ทดสอบรันซ้ำ 2 รอบเพื่อพิสูจน์ผลลัพธ์จริง
