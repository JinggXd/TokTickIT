# AI Use — F4: Regression, Recovery, Performance & Accessibility Verification

**Lab 4 / L4-P11–L4-P12** — updated 2026-10-02.

**AI used:** Codex สำหรับ hardening tests, recovery script/corrections, performance/visual inspection และ requirement audit. ไม่ระบุรุ่นโมเดลที่ไม่ได้ยืนยัน

## Selected prompts

| # | User prompt | การใช้ AI / ผลที่ตรวจได้ |
|---|---|---|
| 1 | “ทําต่อF4” | Regression, native backup/restore, performance smoke และสาม viewport verification |
| 2 | “ทําต่อหน่อยให้จบ” | Complete full-suite/build evidence, selected visual captures และ review packet โดยไม่ข้าม gates |
| 3 | “รีวิวf4หน่อย” | ตรวจ recovery จริงและพบ false positive เมื่อ Attachment อ้างไฟล์ที่ไม่มี |
| 4 | “ควรแก้ไหม” | อธิบายว่าตรวจ disk files อย่างเดียวไม่พิสูจน์ restore attachment completeness |
| 5 | “แก้เลย” | เพิ่ม red regressions และ verify Attachment references/sizes ทั้ง active/removed ก่อนและหลัง restore |
| 6 | “เช็คหน่อยว่าตรงทุกrequirementไหมละก้ใส่ai use กับwhat i have done ไปด้วยของเฟส2 3 4 ใส่ชื่อเฟสข้างหลังด้วย” | Audit handout/contracts/source/logs/GitHub/dev DB แบบ read-only; เพิ่ม phase-suffixed docs/canonical records; ระบุ safe-error defect, incomplete accessibility และ pending release gates |

## Verification / accountability

Source correction `bde66e9`: 3 regressions failed ก่อน fix; recovery+safety 6/6 หลัง fix; full server353/client115/browser132 ผ่านและ builds exit0. [Raw evidence](../../artifacts/lab-04/f4-pr53-review-fix-20261002/verification.md), [ผลงาน F4](what-i-have-done-F4.md), [requirement audit](requirements-audit-F2-F3-F4.md). [PR #53](https://github.com/JinggXd/TokTickIT/pull/53) ยัง Draft/no peer approval ณ audit ไม่อ้างปิด F4 หรือ release แล้ว

## My Reflection — AI-assisted draft

ร่างนี้ต้องให้ผู้จัดทำปรับตามประสบการณ์ตนเองก่อน final submission.

Recovery certification ต้องตรวจข้อมูลที่ควรมี เช่น Attachment references ไม่ใช่ตรวจเฉพาะสิ่งที่บังเอิญอยู่บน disk. Negative fault injection ทำให้เห็นความผิดที่ positive round-trip ซ่อนไว้. Performance ต้องเก็บ dataset, sample count และ raw latency จึงตรวจคำว่าเร็วได้. Screenshot/keyboard checks มีขอบเขตชัด ไม่ใช่ full WCAG guarantee. Audit ที่พบช่องว่างแม้ suite ผ่าน ช่วยแยก technical evidence จาก peer approval และ final delivery; AI ช่วยสร้างและตรวจหลักฐาน แต่ไม่แทน reviewer หรือ reflection ของผู้จัดทำ
