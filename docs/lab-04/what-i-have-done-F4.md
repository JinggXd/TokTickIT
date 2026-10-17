# What I Have Done — F4: Regression, Recovery, Performance & Accessibility Verification

**Lab 4 / L4-P11–L4-P12** — updated 2026-10-17. **Verified technical, accessibility & visual gates; awaiting peer review/integration.**

## งานที่ทำ

- เพิ่ม native `pg_dump`/`pg_restore` verification เข้า database ใหม่แบบ disposable; ตรวจ tables/rows/schema/constraints/indexes/enums/sequences และ upload bytes/hash, ไม่ reset/drop DB เดิม.
- ปิด recovery false-positive ที่ตรวจเฉพาะไฟล์บน disk: query Attachment references/file sizes ทั้ง active และ soft-removed ใน snapshot เดียวกับ dump; reject เมื่อไฟล์ขาด/ขนาดผิด ก่อนและหลัง restore. Guard local disposable target, isolated directory, symlinks และ concurrent source changes.
- เขียน regressions ก่อนแก้: missing active file, missing removed file และ wrong size ล้มตามเหตุผลที่คาด; หลังแก้ recovery + safety 6/6 ผ่าน รวมการป้องกัน restored file หาย.
- วัด Staff/Requester dashboard latency บน 500 tickets/1,000 actions; 5 warmups + 50 samples/role, p95 threshold <200ms และเก็บ samples จริง.
- แก้ไข `AUD-01` (`API-L4-34`): ปรับ `sendInternalError()` ใน `server/src/routes/actions.ts` ให้ sanitize ข้อผิดพลาดที่ไม่คาดคิดหรือ `status >= 500` เป็น `{ error: "INTERNAL_ERROR", message: "Unable to process actions request." }` โดยไม่รั่วไหลข้อความ error ดิบจาก database/runtime พร้อมเพิ่ม fault-injection tests ครบทั้ง 5 endpoints (10 เคสใน `actions-taken.api.test.ts` ผ่าน 52/52).
- แก้ไข `AUD-08` (`STYLE-L4-03`): เพิ่มคลาส `.btn-action-pending` ใน `client/src/styles/zen-green.css` (`#92400E` บนพื้น `#FFFFFF`, hover/active `#FEF3C7`, focus ring `#16A34A` 3px) สำหรับปุ่ม `Pending Task` ที่ยังไม่ถูกเลือก ให้ผ่านเกณฑ์ WCAG 2.1 AA (วัดจริงได้ **8.26:1** ≥ 4.5:1) พร้อมเพิ่มชุดทดสอบใน `ZenGreenTokens.test.tsx` และ Playwright.
- แก้ไข `AUD-02` (`A11Y-L4-03`): เพิ่มการคืนโฟกัส (focus restoration) กลับไปยังปุ่มที่เปิด modal เมื่อปิด modal ใน `ActionsTakenSection.tsx`, เพิ่มการทดสอบ Edit Pending Action modal (`Tab`/`Shift+Tab` focus trap, `Escape` dismissal, focus return) ทั้งใน `ActionsTaken.test.tsx` และ `e2e/lab-04/actions-taken-flow.spec.ts` พร้อมถ่ายภาพ `modal-edit.png` ครบ 3 viewports (รวมทั้งหมด **36 captures**).

## หลักฐานที่รันจริง

| Check | Result |
|---|---|
| Full server (with `API-L4-34`) | 363/363, 34 files (`actions-taken.api.test.ts` 52/52 on disposable PG18 `toktickit_test_f4_audit`); no failed/skipped |
| Full client (with `A11Y-L4-03`, `STYLE-L4-03`) | 117/117, 21 files; no failed/skipped |
| Full Playwright (with `A11Y-L4-03`, `STYLE-L4-03`) | 132/132 across Desktop/Tablet/Mobile (`actions-taken-flow.spec.ts` 3/3 viewports); no failed/skipped |
| Builds | Server/client exit 0 |
| Recovery | 10 tables, 162 rows, 10 files, all 2 Attachment references/sizes matched; 685ms |
| Dashboard p95 | Staff 54.63ms; Requester 14.59ms (<200ms) |
| Visual inspection | 36 captures across Desktop/Tablet/Mobile; [checklist](visual-checklist.md) |

Recovery source: `server/scripts/verify-recovery.mjs`; tests: `database-recovery.test.ts`, `recovery-safety.unit.test.ts`, `performance-smoke.test.ts` ใน `server/tests/lab-04/`. Browser evidence: `e2e/lab-04/actions-taken-flow.spec.ts`, `dashboards.spec.ts`, `ticket-resolution.spec.ts`. AC-01 ถึง AC-35 มีหลักฐานครบทั้ง 35 ข้อ.

## สถานะส่งต่อ

[Issue #52](https://github.com/JinggXd/TokTickIT/issues/52) / [Draft PR #53](https://github.com/JinggXd/TokTickIT/pull/53) → `lab4-staging`. ประเด็นด้านโค้ด/การทดสอบ/ภาพหน้าจอของ F4 (`AUD-01`, `AUD-02`, `AUD-08`) ปิดครบทั้งหมดแล้ว เหลือขั้นตอนฝั่งผู้ใช้งาน/ผู้ตรวจ: ผูก Issue #52 ในแผง Development ของ PR #53, เปลี่ยนสถานะ PR เป็น Ready for review, ให้เพื่อนร่วมทีม (`yuminnini`) รีวิวและกด Merge เข้า `lab4-staging`, จากนั้นจึงดำเนินเฟส F5 (เปิด Release PR เข้า `main`, รันชุดทดสอบสุดท้ายบน `main`, เติม My Reflection และจัดทำไฟล์ PDF ส่งงาน). ดูรายละเอียดใน [Requirement audit](requirements-audit-F2-F3-F4.md) และ [AI Use — F4](ai-use-F4.md).
