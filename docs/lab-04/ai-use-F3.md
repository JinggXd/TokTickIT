# AI Use — F3: Dashboards & Cross-Feature Integration

**Lab 4 / L4-P07–L4-P10** — updated 2026-10-02.

**AI used:** Codex สำหรับ implementation/review/corrections/integration และ evidence. Gemini มีบทบาทพัฒนาบางส่วนก่อนหน้าในบันทึก F2; ไม่อ้างว่า Gemini ทำ F3 หรือระบุรุ่นโดยไม่มีหลักฐาน

## Selected prompts

| # | User prompt | การใช้ AI / ผลที่ตรวจได้ |
|---|---|---|
| 1 | “เอาไปทํารวมกับF3” | รวมสี่ local corrections และสองวันที่/UUID findings ที่ค้าง F2; มี test IDs แยกและ source commit |
| 2 | “ทําF3เลย” | Dashboard APIs/UI ตาม role, shared filters และ cross-feature routing |
| 3 | “ขอรีวิวcodeให้เพื่อนหน่อย” | จัด review packet ที่มี scope, code paths, verification และ closure gates สำหรับ peer |
| 4 | “ขอรีิวF3หน่อย” | ตรวจ metric queries/count parity/privacy/navigation; พบและแก้ home-link keyboard gap |
| 5 | “แก้เลยๆ” | แก้ native home link/visible focus พร้อม role-specific component/browser tests |
| 6 | “ตอนแรกf3มันmegeไปแล้วไหม” | ตรวจ GitHub state จริง แยก approved/ready/draft/merged และ PR F4 ที่อ้างถึง PR F3 |

## Verification / accountability

[PR #51](https://github.com/JinggXd/TokTickIT/pull/51) reviewer merge ที่ `1ee7786`; [F3 correction evidence](../../artifacts/lab-04/f3-pr51-review-fix-20261002/verification.md). [ผลงาน F3](what-i-have-done-F3.md) และ [reviewer.md](reviewer.md) ระบุ approval commit กับ final merged head แยกกัน. My Actions metric เป็น summary + limited feed ตาม contract ที่ชี้แจงจริง

## My Reflection — AI-assisted draft

ร่างสำหรับผู้จัดทำปรับก่อนส่ง ไม่ใช่การสร้างคำสะท้อนส่วนตัวแทนมนุษย์.

Dashboard ที่ตัวเลขดูถูกต้องยังต้องเทียบ count กับ query/filtered list และทดสอบ owner scoping, time boundary และ account switching. Shared filter definitions ลดความต่างระหว่าง backend/dashboard/list. Native link ทำให้ keyboard/modified click ใช้งานได้ตามพฤติกรรมเว็บปกติ. Spec และ coding work ต้องตรวจร่วมกัน: rendering counts ไม่เพียงพอเมื่อ requirement มี privacy, drill-down และ accessibility. Human reviewer ยังคงเป็นผู้ตัดสินใจ merge
