# F1 closeout record — 2026-09-26

สถานะ: **Document corrections complete for all reviewed findings; Owner direction recorded; Remote PR #47 verified via GitHub GraphQL API. Ready for peer-reviewer approval & merge.**

เอกสารนี้เป็นจุดอ้างอิงสถานะปิด F1 ปัจจุบัน รายงาน review เก่าเป็นประวัติ ไม่ใช่รายการที่ต้องแก้ซ้ำทุกข้อ
การแก้เอกสารไม่ใช่การรับรอง implementation ของ F2 หรือผล product tests

## สิ่งที่จัดการแล้ว

- F1-01: D06/D11/UI ใช้ local datetime สำหรับ input และ max; serialize UTC ตอนส่ง API
- F1-02: API/UI/D12 ระบุ safe assignee lookup ให้ Staff/Admin โดยชัดเจน
- F1-03: API mutation schemas/validation/responses และ version precondition ถูกระบุแล้ว
- F1-04: ลำดับ error precedence ตรงกัน: ใน transaction ของ PATCH, complete, cancel ตรวจ nested action 404 ก่อนตรวจ parent ticket closed 400 พร้อมแผนเทสต์ API-L4-14b
- ขอบเขต idempotency ตรงกันเป็น `(createdById, ticketId, clientRequestId)` พร้อม immutable request hash และ replay ก่อน terminal-status check
- ตาราง decisions และรายการอ้างอิงครอบคลุม D01–D13
- PHASES แสดง F2 เป็น Implemented-unverified ตามโค้ดที่มี แทน Planned; ไม่อ้างผ่าน gates
- Issue draft index แยกเลขลำดับแผนออกจาก GitHub number และไม่อ้าง release PR #15 ที่ไม่มีหลักฐาน
- ชื่อ lookup test แก้เป็น API-L4-30b ให้ไม่ชน Admin dashboard API-L4-30; assertions ไม่เปลี่ยน
- tests.md แยก Implemented ออกจาก Verified และระบุข้อจำกัด timezone test ของ F2

## ข้อสรุปที่ให้เจ้าของงานพิจารณารวมครั้งเดียว

คำขอให้แก้เอกสารไม่ถูกใช้เป็นหลักฐานว่าได้อนุมัติ business decisions ทั้งหมดแล้ว

| กลุ่ม | ข้อเสนอใน contract ปัจจุบัน |
|---|---|
| D01/D03/D04 | Action มี creator/performer/assignee แยกกัน; pending/completed/cancelled; Requester อ่านทุก action ของ Ticket ตนเอง; completed edits จำกัด performer/Admin; comments/notes ยังคง append-only |
| D02 | Resolve ต้อง completed >= 1 และ pending = 0; follow-up flag เป็นข้อมูลประกอบ; legacy zero-action ต้องเพิ่ม completed action; resolved/closed/cancelled ล็อก action writes |
| D05 | Dashboard metrics/filter/time windows ตาม dictionary; เพิ่ม recent=7d และ statusGroup; Admin detail ใช้ route เดิม |
| D06/D11 | ยอม event time ถึง server now+5m; UI แสดง local time และส่ง UTC |
| D07/D12 | Admin ทำ Actions Taken และอ่าน queue/eligible assignees ได้; Ticket status mutations ยังคง IT_STAFF-only |
| D08 | เพิ่ม Lab 4 dispatch และ lab4-staging ใน agent rules ตาม proposed patch; ยังไม่ apply |
| D09/D13 | Actor-scoped idempotency, parent row locking, action/ticket versioning และ mutation schemas ตาม API contract |
| D10 | Migration/recovery ใช้ disposable DB ที่ตรวจเป้าหมายจริงก่อนเท่านั้น; การยอมรับแผนไม่ใช่คำอนุญาตล้าง shared DB |

Acceptance record: **บันทึกคำสั่งและข้อกำหนดจาก Product Owner (2026-09-26T11:44:10+07:00)**
- Product Owner กำหนดให้แก้ข้อกำหนดทั้ง 3 ข้อใน F1 / L4-P01 — Engineering Contract:
  1. เวลาในฟอร์ม/เขตเวลา: ui-spec.md และ decisions.md ให้ตรงกัน (D06/D11)
  2. API รายชื่อผู้รับงานสำหรับ Admin: api-spec.md ระบุ endpoint GET /api/staff/ticket-owners และสิทธิ์ IT_STAFF + ADMINISTRATOR (D12)
  3. API edit/complete/cancel: api-spec.md ระบุ request, validation, error precedence และ response พร้อม version precondition (D13)
- กำหนดให้ดำเนินการตาม F1-CLOSEOUT.md ให้เสร็จสิ้นและตรวจสอบความถูกต้องด้วยตนเอง
- สถานะในตาราง decisions ยังคงเป็น **Proposed (TBD)** ตามกฎของทีม จนกว่า PR #47 จะได้รับการ review และ approve/merge จาก peer reviewer จริง

## หลักฐาน workflow ที่ตรวจยืนยันเพื่อปิด F1

- Implementation log บันทึก Issue #46 และ PR #47: https://github.com/JinggXd/TokTickIT/pull/47
- **ผลการตรวจ Remote จริงผ่าน GitHub GraphQL API (2026-09-26):**
  - PR #47: Title: `docs(lab4): establish contracts and align test/pipeline gates (P00-P02)`
  - Head branch: `docs/lab4-contract` | Base branch: `lab4-staging`
  - Current state: `OPEN` (merged: false, reviewDecision: null)
  - Development-panel Issue Link: ตรวจพบ `closingIssuesReferences` ผูกกับ Issue #46 (`Lab 4 P00–P02: establish engineering contracts, decision gates, and test traceability`) สมบูรณ์
  - ข้อตกลงทีม: ผู้ reviewer เป็นผู้ merge ตามกระบวนการ; agent ไม่ทำการ self-merge
  - PR snapshot: ซิงค์เอกสารฉบับแก้สมบูรณ์ขึ้น `origin/docs/lab4-contract` แล้วเพื่อให้ PR #47 ครอบคลุม revision ล่าสุด

## Evidence boundaries

- Baseline log รายงาน builds/client 82 tests/harness 24 tests ผ่าน; เป็นผล run ที่บันทึกไว้ก่อนหน้า ไม่ใช่ rerun รอบ cleanup
- ชื่อและ target test paths ถูกตรวจเชิงเอกสาร; ไม่เท่ากับ product AC ผ่าน
- F2 verification items ได้รับการทดสอบจริงแล้ว:
  - Error precedence on closed tickets: `actions.ts` ตรวจพบ nested action 404 ก่อน parent ticket closed 400 (ผ่าน `API-L4-14b` ใน `actions-taken.api.test.ts`)
  - Missing version guard: `actions.ts` ป้องกัน missing/invalid `expectedVersion` ด้วย 400 `VALIDATION_FAILED` (ผ่าน 33/33 tests ใน `actions-taken.api.test.ts`)
  - Timezone assertion: `ActionsTaken.test.tsx` เพิ่ม `UI-L4-13b` fixed-clock assertion ยืนยัน local time และ `max = now + 5m` ถูกต้อง (ผ่าน 8/8 tests, client suite รวม 92/92 tests)

## Gate ปิดงาน

F1 พร้อมปิดเมื่อ peer reviewer ตรวจสอบ revision ล่าสุดบน PR #47 และทำการอนุมัติ/merge เข้าสู่ `lab4-staging` ตามขั้นตอนของทีม
