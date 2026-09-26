# F1 Review — Changes requested

วันที่ตรวจ: 2026-09-25
Reviewer: Codex (technical review เท่านั้น ไม่ใช่ human peer approval)
HEAD ที่ตรวจ: `baad45e09272d665bc0cf765236c456edcf0eff7`

## ผลตัดสิน

**F1 ยังไม่ผ่าน acceptance gate และยังไม่ควรเริ่ม F2**
เอกสารระบุ Proposed/In Progress ถูกต้องแล้ว แต่ยังมี contradictions และรายละเอียดที่ coding agent ต้องเดา
D01–D09 ยังเป็น Proposed (TBD); การตรวจครั้งนี้ไม่ถือเป็นการอนุมัติ business decisions เหล่านั้น

อ่านเอกสาร F1 ทั้งสี่ contract, baseline, decisions, phase/log, Issue drafts และ proposed patches เทียบ pipeline, เนื้อหา PDF ที่ตรวจไว้ และ baseline code/contract ที่เกี่ยวข้อง
ไม่แก้ contract หรือ product code ระหว่าง review

## Findings ตามความสำคัญ

### R01 [P1] Global error envelope เปลี่ยน baseline contract

- ที่มา: `api-spec.md:21–32`, `specification.md:281`, `tests.md:41`
- Lab 4 กำหนดทุก error เป็น `{error:{code,message,details:[]}}` แต่ Lab 3 ใช้ `{error:string, message?, details?:object}` และ staff stale error ใช้ `CONFLICT`; endpoint status เดิมถูกระบุใน Lab 4 ด้วย จึงไม่ใช่เพียงรูปแบบของ endpoint ใหม่
- AC-13/test API-L4-13 ยังอนุญาต foreign Ticket เป็น “403 หรือ 404” ทั้งที่ AGENTS.md และ baseline บังคับ 403
- ผลกระทบ: implementation ที่ทำตามเอกสารนี้อาจทำ client/error tests เดิมเสีย และ tests ยอมรับ ownership behavior ที่ผิด contract
- แก้: รักษา existing envelopes/statuses ให้ชัด; ตัดตัวเลือก 404 สำหรับ foreign resource; ระบุ error shapes ของ endpoint ใหม่และ compatibility boundary โดยไม่เปลี่ยนของเดิมโดยปริยาย

### R02 [P1] Concurrency/retry promises ยัง implement จาก contract ไม่ได้

- ที่มา: `decisions.md` D09, `api-spec.md` §2.2–2.5, `specification.md` §7.1/7.4
- D09 สัญญาว่า concurrent action edit จะได้ 409 แต่ ActionTaken ไม่มี version และ action mutation requests/DTOs ไม่มี expectedVersion หรือ alternative precondition
- ไม่มีข้อกำหนดว่า action create/edit/complete/cancel จะ serialize กับ resolution gate อย่างไร; Ticket.version อย่างเดียวไม่พิสูจน์ว่าการอ่าน actions และ resolve ปลอด race
- การ disable ปุ่มป้องกัน network retry หลัง server commit แต่ response หายไม่ได้
- แก้: เลือกและระบุ exact concurrency/precondition protocol, parent transaction invariant, version increments และ backend duplicate-request policy; เพิ่ม tests ที่ส่ง requests ชนกันและ retry หลัง response loss

### R03 [P1] Action authorization และ terminal locking ไม่ตรงกัน

- ที่มา: `specification.md` FR-05/BR-10, `decisions.md` D03, `api-spec.md:145–205`
- D03 จำกัด completed edits เป็น description/notes โดย original performer หรือ Admin แต่ PATCH อนุญาต Staff/Admin ทั้งหมดและตรวจเพียง action ไม่เป็น CANCELLED รวมถึงเปิด assignment updates
- Complete/cancel contract ไม่ระบุ parent CLOSED/CANCELLED lock ที่ BR-10 และ AC-10 บังคับ
- ไม่มี explicit nested-resource rule ว่า actionId ต้องอยู่ภายใต้ ticketId ที่ URL ระบุ
- แก้: สร้าง field/state/actor permission matrix และ exact validation/error precedence สำหรับทุก action endpoint รวม parent-child mismatch; เพิ่ม negative tests สำหรับ completed edits และ terminal transitions

### R04 [P1] Requester UI ซ่อน action ที่โจทย์กำหนดให้เห็น

- ที่มา: `ui-spec.md:133`, specification FR-07/AC-11, PDF §8.3
- UI ระบุแสดงเฉพาะ completed actions ขณะที่ specification และโจทย์ระบุทุก Actions Taken ของ owned Ticket
- แก้: ให้ list รวม PENDING/COMPLETED/CANCELLED ตาม visibility contract และ test fixtures ครบทุกสถานะ โดยไม่เปิดเผย Internal Notes

### R05 [P1] Dashboard cards, metrics และ drill-down ไม่ตรงกัน

- ที่มา: `ui-spec.md` §3.1–3.2, `specification.md` §5.3/6.2, `decisions.md` D05, `api-spec.md` §4
- Requester UI ใช้ All Closed/Past แทน Recently Updated แต่ API ไม่มี closed count
- Recently Updated link ไม่มี date filter; Recently Resolved link มีเพียง status ไม่มี 7-day filter จึงไม่สามารถรับประกัน count เท่ากับ matching total ตาม BR-17
- Staff UI มี “+N from yesterday” แต่ไม่มี calculation/response field; ความหมาย active และ recent/urgent selection รวม tie-break ordering ยังไม่ครบ
- Routes/query parameters ที่เสนอเป็นงาน integration ใหม่; current MyTickets/StaffTicketQueue ไม่ใช่หลักฐานว่ารับ URL filters เหล่านี้อยู่แล้ว
- แก้: ใช้ metric dictionary เดียวเชื่อม query → response field → card → exact drill-down filters; ระบุ pagination total, timezone/boundaries, zero states, sorting และ list limits พร้อม backend/UI URL integration tests

### R06 [P1] มีการเปลี่ยน Ticket workflow/Admin permissions เกิน decision delta ที่ระบุ

- ที่มา: `specification.md:112–123`, `api-spec.md:212`, `decisions.md` D07
- Lab 4 ทำ CLOSED เป็น terminal แต่ Lab 3 API §5.8 ระบุ CANCELLED เท่านั้นที่ terminal และมี CLOSED reopening behavior
- API status transition อนุญาต Admin แต่ D07 ระบุการขยายสิทธิ์เฉพาะ Actions Taken; baseline staff mutations ใช้ IT_STAFF
- Resolution matrix ไม่กล่าวชัดว่าคง eligible-owner validation และ clearing appearsResolved on reopening จาก baseline หรือไม่
- แก้: เพิ่ม explicit workflow/role delta decisions และ regression migration ของ tests ที่ได้รับผล; สิ่งที่ไม่ได้เปลี่ยนให้ inherit ชัดเจน ห้ามใช้คำว่า zero regression กลบการเปลี่ยน behavior ที่ตั้งใจ

### R07 [P2] Zen Green tokens ไม่ตรงของเดิม

- ที่มา: `ui-spec.md:12–31` เทียบ `client/src/styles/zen-green.css:3–18`
- ตัวอย่าง: `--zg-secondary` เดิม #0B7A46 ถูกระบุเป็น #757575; warning เดิม #D97706 เป็น #E65100; success เดิม #15803D เป็น #2E7D32; canvas/text token names และค่าบางรายการไม่ตรง
- ผลกระทบ: agent อาจเปลี่ยน palette เดิมหรือสร้าง token ที่ไม่มีอยู่ ทั้งที่ FR-18 กำหนด preserve
- แก้: ใช้ token/badge pairs จริงจาก baseline; mapping action statuses ให้ใช้ palette ที่ตกลงไว้ และเพิ่ม style checks

### R08 [P1] AC mapping ครบเลข แต่ coverage ไม่ครบ scope

- ที่มา: `tests.md` §2 ทั้งตาราง และ `specification.md` §9
- ตรวจได้ว่า 35/35 AC มี references จริง แต่ตัวอย่าง API-L4-10 ทดสอบแค่ create ทั้งที่ AC-10 รวม edit/transition; API-L4-03 ไม่ครอบคลุม reassignment; tests สำหรับ completed edit permissions, cross-ticket action IDs และ private field leakage ยังไม่มี
- ไม่มี planned tests ที่ชัดสำหรับ network retry, concurrent action edit/resolution race, ทุก status pair/role, dashboard date boundaries/zero states/count-to-drilldown parity, migration recovery, unit/style/performance smoke
- TicketWorkflow.test.tsx อยู่ใน directory tree แต่ไม่มี test row; performance smoke ไม่มี dataset/threshold/command; states success/forbidden/not-found ไม่ได้ออกแบบครบใน UI §4
- แก้: ทำ coverage จาก FR/BR/rubric ไป AC/test assertions ไม่ใช่แค่ AC IDs; ระบุ actual target paths, fixtures, expected outputs และ performance criteria ก่อนเริ่ม implementation

### R09 [P2] Data/audit contract ยังขาดรายละเอียดที่ schema ต้องใช้

- ที่มา: `specification.md` §7.1–7.5, `decisions.md` D01–D03
- มี promise เรื่อง append-only Ticket history แต่ไม่มี model/field/storage/read contract รองรับ; baseline schema ไม่มี Ticket history model
- กรณี A สร้าง pending ให้ B แล้ว B complete ยังไม่ชัดว่า performer คง A หรือเปลี่ยนเป็น B และเก็บ creator ที่ใด ซึ่งกระทบ dashboard current-user metrics
- Migration มีเพียง forward/ไม่ลบ/รักษา IDs; ไม่มี concrete recovery และ test procedure ตามโจทย์ §5.2
- เนื้อหา stakeholder ระบุ no pending follow-ups แต่ gate ตรวจเฉพาะ PENDING actions: COMPLETED+followUpRequired=true ยังผ่าน ต้องตัดสิน semantics ให้ตรงกัน
- แก้: สรุป actor semantics, audit scope, follow-up gate และ recovery strategy ก่อน freeze schema; หลีกเลี่ยงเพิ่ม audit feature เกินที่ตกลงเพียงเพื่อเติมช่องว่าง

### R10 [P2] Proposed agent patches ใช้กับไฟล์ปัจจุบันไม่ได้ และ scope ยังขัดกัน

- ที่มา: `proposed-agents-patch.md` ทั้งสอง diff
- ตรวจ `git apply --check` แบบไม่ apply แล้วทั้ง AGENTS.md และ .antigravityrules ล้มเหลวว่า patch does not apply
- การเปลี่ยนหัว .antigravityrules เป็น Lab 4 แต่คงเนื้อหาห้าม Actions Taken/dashboard และ pipeline Lab 3 ด้านล่างไว้ ทำให้ scope ไม่ชัดแม้แก้ patch ให้ apply ได้
- แก้: สร้าง diff จาก current files จริง; เพิ่ม Lab 4 dispatch/scope ที่ชัดเจนแทน relabel ทั้งไฟล์; ตรวจ apply --check ผ่านและอ่านผลรวมเพื่อยืนยัน Lab 2/3 history ยังถูกต้อง ก่อนเสนออนุมัติ

## F1 evidence และสถานะที่ควรรายงาน

- L4-P00: มี baseline inventory และ HEAD ตรง checkout ที่ตรวจ; build/client results เป็นผลที่ Gemini บันทึกไว้ ไม่ใช่ผลรันทวนโดย reviewer รอบนี้
- L4-P01: Changes requested ตาม R01–R07/R09/R10; D01–D09 ยัง Proposed
- L4-P02: Changes requested ตาม R08; verified disposable DB/harness execution ยังไม่มีหลักฐาน F1 ที่ทำให้ gate ผ่าน เอกสารระบุ DB/E2E Blocked ไว้ถูกแล้ว
- ไม่ควรใช้ชื่อ DB allowlist เพียงอย่างเดียวเป็นการยืนยัน disposable target; ก่อนรันต้องตรวจ actual environment/isolated uploads ตาม pipeline
- Issue drafts แยก package แล้ว แต่ต้องเพิ่ม planned test IDs/evidence gates ให้แต่ละ Issue และระบุ peer review/Issue Development link ในทุก feature package ไม่เลื่อนไปทำครั้งเดียวใน F5

## สิ่งที่ตรวจจริงรอบนี้

1. อ่านและตรวจ consistency ของเอกสาร F1 กับ baseline code/contract ที่เกี่ยวข้อง
2. ยืนยัน HEAD และ dirty files; ไม่เปลี่ยนงานเดิมของผู้ใช้
3. ตรวจ AC definitions 35 ข้อ และ test references ครบ 35 ข้อ (เป็น structural check ไม่ใช่ product test)
4. ตรวจ proposed patches ด้วย git apply --check: ทั้งสองชุดไม่ผ่าน; ไม่ apply
5. ไม่รัน server/client/Playwright suites หรือ migrations ในรอบ documentation review นี้ ไม่อ้าง product AC ผ่าน

## คำสั่งแก้ไขส่งต่อ Gemini

แก้ F1 ตาม R01–R10 ในไฟล์นี้ก่อนเริ่ม F2 ให้ sync specification/api/ui/tests/decisions/PHASES/Issue drafts ทุกจุดที่ได้รับผล แยกข้อแก้ contract inconsistency ที่ทำได้ทันทีออกจาก business decisions ที่ต้องถามผู้ใช้ เสนอทางเลือกพร้อมผลกระทบเป็นชุด ไม่อ้างว่า Proposed ได้รับอนุมัติแล้ว ไม่แก้ product code ไม่ apply migration หรือ agent-rule patches ในรอบแก้เอกสารนี้ หลังแก้ให้รายงานแต่ละ R ว่าแก้ที่ไฟล์/section ใด พร้อม checks จริงและสิ่งที่ยังรอข้อสรุป
