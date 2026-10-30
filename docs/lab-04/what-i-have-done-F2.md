# What I Have Done — F2: Actions Taken & Ticket Workflow

**Lab 4 / L4-P03–L4-P06** — updated 2026-10-02. รายงานงานของเฟสพร้อมหลักฐาน; AI ช่วยเรียบเรียง ไม่ใช้เป็นหลักฐานแทน source/tests.

## งานที่ทำ

- เพิ่ม `ActionTaken` model/migration: creator, performer, assignee แยกจาก Ticket Owner, event datetime, description, result, follow-up, attachment notes, status, versions และ immutable request hash. Seed มี 0/1/many actions และรักษา legacy records/credentials เมื่อรันซ้ำ.
- เพิ่ม list/create/edit/complete/cancel API; server session attribution, assignee active/role validation, Requester ownership/read-only, confidentiality, completed performer/Admin edit rules, terminal parent locking และ stable chronological order.
- เพิ่ม Action UI ใน Ticket Detail: desktop/tablet table และ mobile cards; forms Log/Edit/Complete/Cancel, local datetime→UTC API, validation, loading/empty/error/success, submitting guards และ Requester ไม่มี mutation controls.
- บังคับ resolution gate: completed ≥1 และ pending=0; workflow 8 statuses, stale-version 409 และ parent row locking ป้องกัน concurrent action/status changes. Requester advisory ไม่เปลี่ยนสถานะเอง.

## Review follow-ups ที่รวมภายหลังใน F3

F2 PR #49 ที่ merge **ไม่ได้รวม correction ทั้งหกจุด** ในเครื่องตอนแรก. F3 PR #51 รวมครบแล้ว: clear attachmentNotes เป็น null, strict JSON version/follow-up boolean, assignee error/retry, success banner หลัง reload, strict ISO datetime และ valid UUIDv4 fallback พร้อม key-preserving retry. [Carry-over evidence](F3-CARRYOVER.md) แยกประวัติและผลรวมไว้

## Code / tests / GitHub

- Source: `server/prisma/schema.prisma`, `server/prisma/seed.ts`, `server/src/routes/actions.ts`, `server/src/routes/staff.ts`, `client/src/components/ActionsTakenSection.tsx`.
- Test IDs: API-L4-01–26, API-L4-30b, UI-L4-04–18, E2E-L4-01/02, MIG-L4-01 ตาม [tests.md](tests.md). Product AC scope: AC-01–17, AC-25–28, migration AC-34/35; AC-31 ตรวจได้บางส่วน.
- [PR #49](https://github.com/JinggXd/TokTickIT/pull/49) approved/merged โดย `yuminnini`, 2026-10-02T09:01:12Z. [Reviewer evidence](reviewer.md).
- Latest integrated verification (รวม F3/F4 ที่ source `bde66e9`, **ไม่ใช่ผลของ original F2 commit**): server 353/353, client 115/115, Playwright 132/132; builds passed. [Raw evidence](../../artifacts/lab-04/f4-pr53-review-fix-20261002/verification.md).

## ข้อที่ยังเหลือ

Actions unexpected 500 ส่ง raw `err.message` (AUD-01); Edit-specific keyboard/visual evidence ยังไม่ครบ (AUD-02). ไม่อ้าง F2 สอดคล้องทุก requirement เพราะ suite ผ่าน. [Requirement audit](requirements-audit-F2-F3-F4.md) และ [AI Use — F2](ai-use-F2.md).
