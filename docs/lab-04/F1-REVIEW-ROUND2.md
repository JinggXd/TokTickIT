# F1 re-review — 2026-09-25

ผล: **Changes requested — ยังไม่ผ่าน F1 gate**
ตรวจเอกสาร revision 1.1.0 หลัง Gemini รายงานแก้ R01–R10 ไม่ถือเป็น human peer approval หรือการอนุมัติ decisions

## สถานะ findings เดิม

| Finding | ผลรอบสอง |
|---|---|
| R01 error compatibility | Partial — flat envelope/foreign 403 แก้แล้ว แต่ error constants ยังขัดกัน |
| R02 concurrency/retry | Partial — เพิ่ม action version แล้ว แต่ transaction และ retry contract ยังไม่ครบ |
| R03 permissions/terminal/nested resource | Closed at document level — API ระบุ matrix และ guards แล้ว |
| R04 Requester visibility | Closed at document level — รวมทั้งสามสถานะแล้ว |
| R05 dashboard parity | Partial — cards ตรงขึ้น แต่ filters และ definitions ยังไม่ตรงกัน |
| R06 workflow/Admin delta | Closed at document level — inherit Lab 3 matrix/owner/reopening และ Staff-only transition แล้ว |
| R07 palette | Closed for original palette finding — CSS token block กลับมาตรง baseline แล้ว |
| R08 test coverage | Partial — เพิ่มกรณีสำคัญ แต่ยังไม่ครอบคลุม boundary/negative pairs/unit/style |
| R09 data/audit/recovery | Partial — actor semantics และ recovery proposal เพิ่มแล้ว แต่ audit/follow-up ยังไม่ปิด |
| R10 proposed patches | Closed for patch validity — reviewer รัน git apply --check ทั้งสองชุด exit 0; ไม่ได้ apply |

Closed หมายถึงข้อบกพร่องเอกสารเฉพาะข้อนั้น ไม่ใช่ product test ผ่านหรือ permission ให้ implement

## สิ่งที่ต้องแก้ต่อ

### 1. [P1] R02: ระบุ retry protocol ที่รักษา identity และ atomicity

ที่มา: decisions.md D09 บรรทัด 180–181; api-spec.md §2.2

Map `{clientRequestId: actionId}` ใน memory 60 วินาทีไม่ระบุ caller/ticket scope, payload matching, การ reserve key แบบ atomic หรือ behavior เมื่อ process restart/TTL หมด การเรียกพร้อมกันอาจสร้างซ้ำ และการใช้ key เดียวกันต่าง caller/ticket ยังไม่รู้ว่าจะคืน resource ใด

ให้กำหนดแน่นอน: key อยู่ header หรือ body (กรณีส่งทั้งคู่), UUID validation, caller+ticket scoping, mismatched payload, concurrent duplicate, retention/restart semantics และ replay status เดียวที่เลือกไว้ ไม่ใช้ “200 หรือ 201” โดยไม่กำหนดเงื่อนไข รวมทั้งให้ UI reuse key เดิมเมื่อ retry จริง

ส่วน concurrency ให้ระบุว่า **ทุก action mutation ต้อง lock parent Ticket ก่อนอ่านสถานะ/เปลี่ยน action ภายใน transaction เดียวกัน** ไม่ใช่เฉพาะ resolution lock แล้วไป increment parent ทีหลัง; บอก lock order และผลลัพธ์ทั้งสองลำดับการแข่งขัน รวมกรณี resolution commit ก่อน pending action create เพราะ RESOLVED ยังไม่อยู่ใน mutation lock statuses ปัจจุบัน

เพิ่ม tests สำหรับ simultaneous retry, same key ต่าง caller/ticket/payload, response-loss replay, parent close/cancel races และ resolution race ทั้งสอง commit orders

### 2. [P1] R05: drill-down ยังคืนคนละชุดกับ count

ที่มา: decisions.md:121 และ api-spec.md §4; ui-spec.md §3

- Recently Resolved count จำกัด 7 วัน แต่ URL ยังเป็น `/my-tickets?status=RESOLVED` ไม่มี recent filter เช่น Ticket resolved ที่ updatedAt เมื่อ 30 วันก่อนจะอยู่ใน list แต่ไม่อยู่ใน count
- Unassigned count ตัด RESOLVED/CLOSED/CANCELLED แต่ URL มีเพียง owner=unassigned; My Assigned count ตัด CLOSED/CANCELLED แต่ URL มีเพียง owner=me ต้องระบุ status-set filters ให้ตรงกันด้วย
- ยังไม่มี API delta ของ list/queue endpoints รองรับ `recent=7d` และ lowercase `status=open` ซึ่ง baseline status allowlist ไม่รับค่าดังกล่าว ต้องกำหนด UI-to-API mapping ไม่เพียงเพิ่ม URL ในเอกสาร
- D05 myRecentActions ใช้ performer **หรือ assignee** แต่ UI/spec ยังบอก performed by current user
- Admin Dashboard reuse Staff links ไป `/staff/tickets/:id`/Staff Queue ต้องระบุ mapping ไป existing Admin read routes หรือ explicit permission delta เพราะ baseline Staff endpoints เป็น IT_STAFF-only

แก้ dictionary และ API/UI contracts ให้มี exact shared filters, pagination total, route mapping และ tests ที่พิสูจน์ว่าคลิกแล้วข้อมูลตรง metric ทุก role

### 3. [P1] R09: follow-up rule ขัดตัวเองและ audit history ยังไม่มีที่เก็บ

ที่มา: decisions.md:67,85; specification.md §2/7/11

D02 กล่าวว่า followUpRequired ต้องมี subsequent action หรือ confirmation acknowledgment แต่ท้ายประโยคกลับตรวจเพียง completed>=1/pending=0 ตัวอย่าง completed action เดียว followUpRequired=true ยัง resolve ผ่าน API ตามปัจจุบัน จึงไม่ได้ enforce สิ่งที่ D02 อ้าง

เลือก business rule เดียวให้ชัด: follow-up เป็น informational หรือเป็น resolution prerequisite ถ้าเป็น prerequisite ต้องมีข้อมูลและ operation ที่พิสูจน์ว่าปิด follow-up แล้วพร้อม test; ไม่ต้องเพิ่ม workflow ใหม่หากไม่ใช่สิ่งที่ผู้ใช้เลือก

D03 ยังอ้าง Ticket status append-only audit sequence แต่ data contract มีเฉพาะ ActionTaken และ relation ไม่มี history storage/read/ordering contract ให้เลือกว่าจะเพิ่ม audit scope ที่ตกลงจริง หรือจำกัด append-only requirement ไปยัง records เดิมที่มีอยู่ตามข้อสรุปที่ได้รับ

### 4. [P2] R01: API, specification และ AC ยังใช้ error constants ต่างกัน

ที่มา: specification.md FR-03/FR-09/FR-12/BR-04/BR-12/AC-03/AC-14 เทียบ api-spec.md §1.3

API/test plan ใช้ `INVALID_ASSIGNEE`, `RESOLUTION_GATE_FAILED`, `CONFLICT` แต่ specification/AC ยังมี `ERR_INVALID_ASSIGNEE`, `ERR_RESOLUTION_GATE_FAILED`, `ERR_STALE_VERSION / CONFLICT` ต้องเหลือชื่อเดียวต่อ error

คำว่า preserving exact baseline ยังไม่ตรง stale message จริงใน server/src/routes/staff.ts (`The ticket was modified by another user. Please refresh and try again.`) ให้ inherit existing endpoint envelopes/messages ตาม baseline และกำหนด new endpoint errors แยกชัดเจน

### 5. [P2] R08: tests เพิ่มขึ้นแต่ยังไม่ครบ acceptance gate

ที่มา: tests.md:74,77 และตาราง §2

- API-L4-25 ตรวจ 17 allowed pairs เท่านั้น ยังไม่มี explicit 47 rejected pairs รวม role checks และ owner/reopening invariants
- API-L4-28 ใช้ 6 วันกับ 8 วัน ไม่พิสูจน์ boundary `>= now-7days`; ต้อง fixed clock และค่าก่อน/ตรง/หลัง boundary
- API-L4-33 ระบุ staff queue parity อย่างเดียว ยังไม่ครอบคลุม Requester recent metrics
- ไม่มี explicit planned unit/style tests ตาม handout §10; badge assertion ใน component row ไม่แทน color-token/style coverage โดยอัตโนมัติ
- PERF มี dataset/200ms แล้ว แต่ยังไม่ระบุ warm-up, sample count/statistic, environment และ run command เพื่อให้ผลทำซ้ำได้
- UI ยังไม่มี success/not-found state ที่ชัด และใช้ Date/Time max now ขณะที่ API ยอม now+5m; ทำให้ validation criteria ตรงกันหรืออธิบายความต่างที่ตั้งใจ

## Gate/status ที่ยังไม่เปลี่ยน

- D01–D10 ยังเป็น Proposed (TBD) ทั้งหมด การแก้เอกสารไม่ใช่การอนุมัติ business choices
- PHASES.md ยังเป็น revision เก่า: D01–D09, P04 CRUD และ unassigned query/context บางจุดไม่สะท้อนเอกสารล่าสุด ควร sync หลังปิด findings ไม่รายงานว่า sync ทุกไฟล์แล้ว
- Disposable DB/harness verification ยังไม่มีหลักฐานใหม่ในรอบนี้ จึงยังปิด P02 safety gate ไม่ได้; ไม่จำเป็นต้องรัน full DB product suites เพื่อพิสูจน์เอกสาร แต่ห้ามอ้าง safe target verified จาก regex อย่างเดียว

## Verification ที่ reviewer ทำจริง

- อ่าน revision ใหม่ของ contracts/decisions/log และตรวจเทียบ baseline ที่เกี่ยวข้อง
- AC definitions ยังคง 35 ข้อ; ไม่ใช่ product acceptance results
- Extract diff blocks ด้วย UTF-8 แล้วรัน `git apply --check`: AGENTS.md exit 0, .antigravityrules exit 0 ไม่มี mutation
- ไม่รัน product tests, migration หรือ apply patches; ไม่มีการแก้ contract/code ใน review นี้

ส่งต่อ Gemini: ปิดรายการ 1–5 ข้างต้นพร้อม sync PHASES/Issue drafts/log โดยอ้างไฟล์/section และหลักฐานตรวจจริง ไม่ต้องรื้อรายการ Closed ใหม่ และอย่าเริ่ม F2 ขณะ blocking decisions/contract gaps ยังไม่จบ
