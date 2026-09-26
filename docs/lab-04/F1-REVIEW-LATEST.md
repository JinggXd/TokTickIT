# F1 full review — 2026-09-26

ผล: **Changes requested — พบ 3 จุดที่ควรแก้ก่อน freeze contract**
ขอบเขต: เอกสาร F1 ล่าสุดและ baseline code ที่เกี่ยวข้อง ไม่ใช่ implementation review หรือ human peer approval

ประเด็น idempotency ที่ตรวจเฉพาะจุดในรอบก่อนปิดได้แล้วในระดับเอกสาร: scope `(createdById, ticketId, clientRequestId)` ตรงกัน, immutable request hash, replay ก่อน terminal-state check และ planned tests แยก caller/retry ครบตามข้อทักท้วงเดิม การตรวจทั้งชุดครั้งนี้พบรายละเอียดต่อไปนี้เพิ่ม

## Findings

### F1-01 [P2] Datetime picker ใช้ UTC string เป็น local maximum

อ้างอิง: `ui-spec.md:138`, `decisions.md:159`

`new Date(Date.now() + 5 * 60 * 1000).toISOString().slice(0, 16)` คืนค่า UTC ที่ถูกตัด timezone ออก แต่ datetime-local input ตีความเป็นเวลาท้องถิ่น เช่น เวลาไทย 14:00 จะได้ max ประมาณ 07:05 ทำให้กรอกเวลาปัจจุบันไม่ได้ ในเขตเวลาติดลบอาจเปิดให้กรอกเวลาอนาคตเกินเกณฑ์

แก้: format max จาก local date/time components สำหรับ input; แปลงค่าที่ส่งเป็น ISO UTC อย่างชัดเจนและให้ backend ใช้ clock ของ server เพิ่ม component test สำหรับ Asia/Bangkok และ timezone ติดลบ รวม now และ now+5m boundary

### F1-02 [P2] Admin assignment UI ยังไม่มี contract สำหรับโหลดรายชื่อ assignee

อ้างอิง: `ui-spec.md:142`, `api-spec.md` §4.1; baseline `server/src/routes/staff.ts:265–271`, `client/src/api.ts:523`

UI กำหนด dropdown active Staff/Admin และอนุญาต Admin assign actions แต่ existing safe lookup `/api/staff/ticket-owners` จำกัด IT_STAFF ส่วน Lab 4 ระบุ read-access delta เฉพาะ `/api/staff/tickets` ยังไม่มี lookup source ที่ตกลงสำหรับ action form ของ Admin หาก reuse helper เดิมจะได้ 403

แก้: ระบุว่าจะขยาย safe lookup เดิมเป็น Staff/Admin หรือใช้ endpoint อื่นที่มี DTO/role/filter ชัดเจน ห้ามให้ coding agent เดาเอง; กำหนดเฉพาะ fields ที่ต้องใช้และ revalidate active/role ใน mutation เพิ่ม tests ที่เปิด dropdown และ assign ได้จริงทั้ง Staff/Admin โดยไม่ขยายสิทธิ์ Staff mutations อื่น

### F1-03 [P2] Action mutation API ระบุ transaction แต่ request/response contract ยังไม่ครบ

อ้างอิง: `api-spec.md:208–257` (§2.3–2.5)

Update/complete/cancel ปิดท้ายเพียง Return 200 OK โดยไม่มี exact response DTO และไม่มี request schema ที่แจกแจง required/type/nullable/unknown fields ครบ ตัวอย่างเช่น expectedVersion หายควรเป็น input 400 หรือ stale 409, PATCH followUpRequired=true แต่ไม่มี note, complete result เป็น whitespace, PATCH assignee ที่ inactive ยังต้องอาศัยผู้อ่านรวมกฎจากที่อื่นเอง

ผลกระทบ: backend/frontend สามารถสร้าง contracts คนละแบบและเขียน tests ผ่านของตัวเอง แต่ต่อกันไม่ได้ โดยเฉพาะ action.version กับ parent Ticket.version ที่เพิ่มทุก mutation

แก้: เพิ่ม schema หรือ explicit reference ไป shared DTO/validation ที่มีอยู่จริง ระบุ allowed patch fields, positive-integer expectedVersion, conditional validation หลัง merge PATCH, forbidden fields, result validation, error precedence และ success DTO (รวม version ที่ client ต้องใช้ หรือกำหนด refetch) เพิ่ม negative tests สำหรับ missing/invalid version, partial follow-up update, empty result และ response shape

## สิ่งที่ตรวจผ่านในรอบนี้

- specification มี AC definitions 35 ข้อ และ tests.md อ้างครบ 35/35: เป็น traceability check ไม่ใช่ product tests ผ่าน
- proposed AGENTS.md patch และ .antigravityrules patch: extract UTF-8 แล้ว `git apply --check` exit 0 ทั้งสองชุด ไม่ได้ apply
- original findings ด้าน caller-scoped idempotency/replay invariants, Requester action visibility, palette และ workflow inheritance ได้รับการแก้ในเอกสารแล้ว ไม่ต้องรื้อส่วนเหล่านั้นเพราะ findings ใหม่นี้
- test plan เพิ่ม unit/style/negative status pairs/date boundary/recovery/performance cases แล้ว

## Decisions และ readiness แยกจาก defects

- D01–D10 ยัง Proposed (TBD): ไม่มีการนับว่าอนุมัติจากการขอ review ครั้งนี้
- PHASES.md ระบุ F1 In Progress ตรงกับสถานะปัจจุบัน
- baseline/log รายงาน harness 24/24, client 82/82 และ builds ผ่าน เป็นผลที่ agent ก่อนหน้าบันทึกไว้ reviewer ไม่ได้รันซ้ำรอบนี้
- DB/server/E2E suites ยัง not-run/blocked ตาม environment; ก่อน database work ใน F2 ต้องยืนยัน disposable target และ upload isolation จริง
- รอบนี้ไม่แก้ product code, ไม่ apply migration/patch และไม่อ้างว่า product AC ใดผ่าน

## ส่งต่อ Gemini

แก้ F1-01–F1-03 เฉพาะ contract/test-plan ที่ได้รับผล Sync decisions/specification/api/ui/tests/phase log ให้ตรงกัน แสดงไฟล์/section ที่แก้และ checks จริง คง Proposed สำหรับ decisions ที่ยังไม่มีข้อสรุปจากผู้ใช้ ไม่เริ่ม F2 และไม่เปลี่ยนสถานะเป็น Verified จากการแก้เอกสารเพียงอย่างเดียว
