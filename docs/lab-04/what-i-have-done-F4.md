# What I Have Done — F4: Regression, Recovery, Performance & Accessibility Verification

**Lab 4 / L4-P11–L4-P12** — updated 2026-10-02. **Verified checks; awaiting peer review/integration; audit findings remain.**

## งานที่ทำ

- เพิ่ม native `pg_dump`/`pg_restore` verification เข้า database ใหม่แบบ disposable; ตรวจ tables/rows/schema/constraints/indexes/enums/sequences และ upload bytes/hash, ไม่ reset/drop DB เดิม.
- ปิด recovery false-positive ที่ตรวจเฉพาะไฟล์บน disk: query Attachment references/file sizes ทั้ง active และ soft-removed ใน snapshot เดียวกับ dump; reject เมื่อไฟล์ขาด/ขนาดผิด ก่อนและหลัง restore. Guard local disposable target, isolated directory, symlinks และ concurrent source changes.
- เขียน regressions ก่อนแก้: missing active file, missing removed file และ wrong size ล้มตามเหตุผลที่คาด; หลังแก้ recovery + safety 6/6 ผ่าน รวมการป้องกัน restored file หาย.
- วัด Staff/Requester dashboard latency บน 500 tickets/1,000 actions; 5 warmups + 50 samples/role, p95 threshold <200ms และเก็บ samples จริง.
- ตรวจ regression server/client/full browser และ builds; เก็บ 33 visual captures สาม viewports และตรวจ Log/Complete/Cancel keyboard behavior รวม Cancel Escape/confirm flow.
- รอบ audit นี้เพิ่ม AI Use/What I Have Done แยก F2/F3/F4, canonical ai-use/reviewer records, แก้ AC mapping ที่ผิด และตรวจ dev password flags/GitHub แบบ read-only.

## หลักฐานที่รันจริง

Source checkpoint `bde66e99e6bfeece12835a4beef85badcc0df6ba`; [latest verification/raw logs](../../artifacts/lab-04/f4-pr53-review-fix-20261002/verification.md):

| Check | Result |
|---|---|
| Full server | 353/353, 34 files; no failed/skipped |
| Full client | 115/115, 21 files; no failed/skipped |
| Full Playwright | 132/132 across Desktop/Tablet/Mobile; no failed/skipped |
| Builds | Server/client exit 0 |
| Recovery | 10 tables, 162 rows, 10 files, all 2 Attachment references/sizes matched; 685ms |
| Dashboard p95 | Staff 54.63ms; Requester 14.59ms (<200ms) |
| Visual inspection | 33 captures; [checklist](visual-checklist.md) |

Recovery source: `server/scripts/verify-recovery.mjs`; tests: `database-recovery.test.ts`, `recovery-safety.unit.test.ts`, `performance-smoke.test.ts` ใน `server/tests/lab-04/`. Browser evidence: `e2e/lab-04/actions-taken-flow.spec.ts`, `dashboards.spec.ts`, `ticket-resolution.spec.ts`. AC-32–35 มี regression/migration evidence; AC-30/31 มีหลักฐานตามขอบเขตที่ระบุ ไม่ใช่ full accessibility certification

## สถานะส่งต่อ

[Issue #52](https://github.com/JinggXd/TokTickIT/issues/52) / [Draft PR #53](https://github.com/JinggXd/TokTickIT/pull/53) → `lab4-staging`. ไม่มี peer approval และ closing Issue link ขณะตรวจ. F4 **ยังไม่ปิดทุก gate**: unexpected Actions 500 ต้อง sanitize, Edit keyboard/contrast ต้องเพิ่มหลักฐาน, reviewer review/link/merge ยังค้าง. F5 เป็น release to main, final-main tests และ PDF เดียว Answer Part 1–9 ซึ่งยังไม่ได้ทำ

ตรวจ dev DB `toktickit` อ่านอย่างเดียว: 11 accounts เป็น mustChangePassword=true, initial-password bypass=0; ไม่ได้แก้ credentials หรือรัน DB tests ใส่ development. รอบแก้เอกสารนี้ reuse full-suite logs ไม่ได้รัน suites ซ้ำ. [Requirement audit](requirements-audit-F2-F3-F4.md), [AI Use — F4](ai-use-F4.md).
