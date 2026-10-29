# AI Use with Reflection — Lab 4 (F2 / F3 / F4)

Canonical file สำหรับ handout §12 และ §14 Answer Part 4. Updated 2026-10-02; phase records: [AI Use — F2](ai-use-F2.md), [AI Use — F3](ai-use-F3.md), [AI Use — F4](ai-use-F4.md).

## LLM / agents used

- **Gemini via Antigravity:** initial F2 implementation ตาม [historical ai_used2.md](ai_used2.md). เอกสารเก่าระบุชื่อ model version แต่ไม่มี runtime evidence ให้ยืนยัน จึงไม่รับรองรุ่นนั้นในฉบับ audit.
- **Codex:** requirements/code review, F2 follow-ups folded into F3, dashboard/integration corrections, F4 verification/recovery fixes และรอบตรวจเอกสารนี้. ไม่เดาหมายเลขรุ่น.
- Specification role: อ่าน PDF/four contracts, หา ambiguity, รักษา FR/BR/AC/API/UI traceability. Coding/review role: ตรวจ source/tests, แก้ defects และสร้าง reproducible evidence. Reviewer merge/acceptance เป็นงานมนุษย์

## Nine selected prompts

| # | Prompt จาก user conversation | Phase | AI contribution / verification |
|---|---|---|---|
| 1 | “ตรวจf2ด้วย” | F2 | Review Actions/workflow contracts กับ source/test assertions |
| 2 | “test databaseที่ยืนยันคืออะไร” | F2 | Disposable DB/isolated upload safety และ evidence boundary |
| 3 | “งั้นแก้เลย” | F2 | Local review corrections; later carried into F3, not claimed included in original merge |
| 4 | “เอาไปทํารวมกับF3” | F3 | Six F2 follow-ups integrated with dedicated negative/retry regressions |
| 5 | “ทําF3เลย” | F3 | Role dashboards, server metrics, shared filters and routing |
| 6 | “ขอรีิวF3หน่อย” | F3 | Count/query parity, privacy and keyboard review; native link correction with tests |
| 7 | “ทําต่อF4” | F4 | Regression/recovery/performance/visual verification |
| 8 | “รีวิวf4หน่อย” แล้ว “แก้เลย” | F4 | Missing attachment reference false-positive reproduced; regressions red then green |
| 9 | “เช็คหน่อยว่าตรงทุกrequirementไหมละก้ใส่ai use กับwhat i have done ไปด้วยของเฟส2 3 4 ใส่ชื่อเฟสข้างหลังด้วย” | F2–F4 audit | Current DB flags/GitHub verified read-only; 35-AC matrix/doc correction; remaining defects and gates disclosed |

ผลตรวจอ้าง [requirement audit](requirements-audit-F2-F3-F4.md), [reviewer record](reviewer.md) และ [latest raw verification](../../artifacts/lab-04/f4-pr53-review-fix-20261002/verification.md). Full suites ในหลักฐานรันที่ source `bde66e9`; เอกสารใหม่ไม่ได้สร้างผล test ใหม่

## My Reflection — AI-assisted draft, awaiting human finalization

ข้อความต่อไปนี้เป็นร่างจากหลักฐานในสนทนา ผู้จัดทำต้องแก้ให้ตรงกับประสบการณ์ของตนเองก่อนใช้เป็น reflection ส่วนบุคคลในการส่งงาน.

การแยก specification agent กับ coding agent ช่วยรักษารายละเอียดที่พลาดง่าย เช่น caller identity, local datetime, immutable request hash และ role/ownership rules. จุดที่ต้องตรวจซ้ำคือคำกล่าวว่า “ผ่านแล้ว”: test logs ต้องตรง source revision, scope ของ assertions และ branch ที่ merge. F2 corrections ที่ยังอยู่ในเครื่องจึงต้องส่งต่อและตรวจรวมใน F3ใหม่; approval กับ merge ก็เป็นคนละสถานะ.

ใน F4 พบว่า backup/restore ที่เทียบเฉพาะไฟล์ซึ่งมีอยู่สามารถให้ผลผ่านแม้ Attachment reference สูญหาย. Negative tests ที่ fail ก่อน fix ทำให้หลักฐานหนักแน่นกว่า positive test เพียงอย่างเดียว. AI มีประโยชน์ในการไล่ source/contracts และสร้างหลักฐาน แต่ผล tests ผ่านไม่ครอบคลุมทุก safe failure หรือ full accessibility. รอบ audit นี้จึงยังระบุ raw 500 messages, Edit/contrast evidence และ release/PDF gates ที่ค้าง โดยไม่อ้างว่าจบทุก requirement. Human review, final reflection และการตัดสินใจส่งงานยังต้องอาศัยผู้จัดทำ/ทีม
