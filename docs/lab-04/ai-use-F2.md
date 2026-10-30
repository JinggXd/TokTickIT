# AI Use — F2: Actions Taken & Ticket Workflow

**Lab 4 / L4-P03–L4-P06** — updated 2026-10-02.

**AI used:** Gemini ผ่าน Antigravity ตาม [บันทึก F2 เดิม](ai_used2.md); บันทึกเดิมระบุ model version แต่รอบนี้ไม่มี runtime evidence ยืนยันรุ่นนั้น. Codex ใช้สำหรับ review, corrections, Git workflow และ evidence audit ต่อเนื่อง; ไม่เดาหมายเลขรุ่นโมเดล. เอกสารนี้เขียนโดย AI โดยอ้างคำสั่งผู้ใช้และหลักฐานจริง

## Selected prompts

คำสั่งด้านล่างมาจากประวัติการสนทนา ข้อความที่สะกดตามเดิมคงไว้. ผลลัพธ์เป็นสรุปรอบงาน ไม่ได้อ้างว่า prompt สั้นแต่ละอันสั่งรายละเอียด implementation ทั้งหมด

| # | User prompt | การใช้ AI / ผลที่ตรวจได้ |
|---|---|---|
| 1 | “ตรวจf2ด้วย” | Review Actions model/API/UI/workflow เทียบ contracts; แยก implemented ออกจาก verified |
| 2 | “รีวิวf2ให้หน่อย” | ตรวจ role/ownership, terminal locks, resolution gate, versions และ test evidence |
| 3 | “test databaseที่ยืนยันคืออะไร” | อธิบายและตรวจ disposable database/isolated uploads ก่อน DB suites; ไม่ใช้ dev DB เพื่อให้ tests ผ่าน |
| 4 | “แก้mergeconflictให้หน่อย” | จัดการ integration conflict และตรวจ regression; preserved changes, ไม่ force-push |
| 5 | “push update pr” | Update feature PR ที่ target lab4-staging; แยก peer approval/merge จาก agent work |
| 6 | “งั้นแก้เลย” | Review corrections พร้อม targeted tests; สี่ local fixes และสอง findings ส่งต่อ F3ตามคำสั่งผู้ใช้ |

## Verification / accountability

F2 [PR #49](https://github.com/JinggXd/TokTickIT/pull/49) merged โดย peer reviewer. หก follow-ups อยู่ F3 [PR #51](https://github.com/JinggXd/TokTickIT/pull/51); [carry-over](F3-CARRYOVER.md) และ [ผลงาน F2](what-i-have-done-F2.md). Latest integrated test evidence ที่ source bde66e9: 353 server /115 client /132 browser; ไม่ใช้ผลนี้อ้างว่า original F2 commit มี corrections ครบ

## My Reflection — AI-assisted draft

ร่างนี้สรุปจากสิ่งที่เกิดขึ้น ไม่ใช่คำยืนยันประสบการณ์ส่วนตัวของผู้จัดทำ; ผู้จัดทำต้องปรับให้ตรงกับตนเองก่อน final submission.

การใช้ AI ตรวจ HTTP runtime types พบปัญหาที่ TypeScript compilation อย่างเดียวไม่ป้องกัน. Version/boolean/date validation, ownership และ retry ต้องมี negative tests ที่พิสูจน์ API ไม่แก้ข้อมูลผิด. การแยกผลในเครื่องออกจาก commit ที่ merge ช่วยไม่ให้รับรองงานผิด revision. Code review ยังพบ raw 500 messages จึงไม่ควรตีความ suite ผ่านว่า requirements ทั้งหมดผ่าน. Specification agent ช่วยรักษา contract; coding agent ต้องใช้ tests และ human review ตรวจผลจริง
