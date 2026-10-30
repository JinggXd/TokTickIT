# Prompt เริ่มงาน Lab 4 สำหรับ Gemini

คัดลอกข้อความในกรอบนี้ส่งให้ Gemini ที่เปิด repository `D:/toktickit`:

```text
เริ่มเตรียม TokTickIT Lab 4 โดยอ่าน D:/toktickit/docs/lab-04/GEMINI-PIPELINE.md ให้ครบ แล้วทำ F1 / L4-P00–L4-P02 ตามลำดับ

อ่าน AGENTS.md, source PDF C:/Users/User/Downloads/SE+Lab+4.pdf ทุกหน้า, Lab 3 contracts ทั้งสี่ไฟล์ และ local instructions ที่เกี่ยวข้องก่อน รักษางานที่มีอยู่ใน working tree และแยกผลเก่าออกจากสิ่งที่ตรวจจริง

งานรอบนี้คือสำรวจ baseline, จัดทำ Lab 4 specification.md/api-spec.md/ui-spec.md/tests.md, decisions.md, PHASES.md และ implementation-log.md ให้พร้อมสำหรับ implementation รวมทั้งตรวจความปลอดภัยของ test environment แบบไม่ทำลายข้อมูล

ตรวจช่องว่าง D01–D09 ใน pipeline และเสนอทางเลือกพร้อมข้อแนะนำ โดยเฉพาะ action assignment/lifecycle, resolution gate, append-only behavior, Requester visibility และ Admin permissions อย่า silently invent business rules; ถ้าต้องรอคำตอบ ให้ทำส่วนที่ไม่ขึ้นกับคำตอบต่อ และติดป้าย TBD ให้ชัด

เตรียม minimal patch สำหรับปรับขอบเขต AGENTS.md/.antigravityrules ให้รองรับ Lab 4 โดยยังไม่เขียนทับกฎเดิมจนกว่าขอบเขตการแก้ที่จำเป็นจะได้รับอนุมัติ ไม่สร้างฟีเจอร์ ไม่ apply migration ไม่ติดตั้ง dependency และไม่ commit/push/open PR/merge ในรอบนี้

สร้างรายการ Issue drafts ตาม work packages พร้อม AC/tests/dependencies ในเอกสารได้ แต่ยังไม่สร้างบน GitHub

ก่อนจบ ตรวจความสอดคล้องระหว่าง PDF/contract/test plan/rubric และรายงาน F1 status, decisions ที่ต้องการคำตอบ, proposed files/patch, checks ที่ทำจริง และ blockers ห้ามรายงาน product AC หรือ suites ว่าผ่านจากการตรวจเอกสารอย่างเดียว
```

## Prompt ทำ implementation ต่อหลัง F1 พร้อม

ใช้หลังอ่าน contract/decisions และยืนยันขอบเขต implementation แล้ว แทนที่วงเล็บด้วยค่าจริง:

```text
ทำ TokTickIT Lab 4 ต่อ ตาม D:/toktickit/docs/lab-04/GEMINI-PIPELINE.md
ขอบเขตรอบนี้: [phase/package และ Issue ที่ต้องการ]
Decisions/legacy patches ที่อนุมัติ: [ระบุ IDs และขอบเขตที่ตกลงจริง]

อนุญาตให้ implement และทดสอบ package นี้ รวมแก้ไฟล์ integration เดิมเท่าที่จำเป็นภายในขอบเขตที่ระบุ เริ่มจากตรวจ HEAD/dirty files/สถานะ dependencies และอ่าน Lab 4 contracts ทั้งสี่ไฟล์ ห้ามข้าม blocking decisions หรือแก้งานคนอื่น

ใช้ test-first → expected Red → smallest implementation → Green → relevant regression พร้อมหลักฐานจริง Database suites ต้องมี verified disposable DB และ isolated uploads ถ้า setup ไม่ปลอดภัยให้รายงาน blocker และทำงานที่ไม่แตะข้อมูลต่อ

จัดทำ feature branch, commit/push และ feature PR เข้า lab4-staging สำหรับ package นี้ได้เมื่อพร้อม โดยรักษางานที่ยังไม่ commit ของผู้อื่นและตรวจ remote/base ให้ถูก ผูก Issue ผ่าน Development panel และเตรียม review packet ถ้าไม่มี Issue ให้สร้างเฉพาะ package ที่อนุญาตนี้ก่อน coding

ห้าม author/agent self-merge; reviewer ต้อง approve และ merge ห้ามส่งข้อความหาคนอื่น ห้ามเพิ่ม dependency นอก stack หรือทำ destructive operations โดยไม่มีอนุมัติที่จำเป็น

จบด้วย phase/package status, changed files, AC/test IDs, actual test evidence, not-run checks, PR/review state และ next ready package ไม่ขยายไป package อื่นโดยปริยาย
```
