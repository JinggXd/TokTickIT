# TokTickIT Lab 4 — Pipeline สำหรับ Gemini

วันที่จัดทำ: 2026-09-25
แหล่งโจทย์: `C:/Users/User/Downloads/SE+Lab+4.pdf` (11 หน้า)
สถานะ: **แผนดำเนินงาน ยังไม่ใช่ engineering contract ที่ตัดสิน business rules ครบแล้ว**

## 0. วิธีใช้และขอบเขต

ไฟล์นี้ใช้เป็นคำสั่งที่ให้ Gemini อ่านโดยตรง ไม่ได้อ้างว่า editor โหลดไฟล์นี้อัตโนมัติ
ใช้ prompt ใน `GEMINI-START.md` เพื่อเริ่มงาน รายงานเป็นภาษาไทย ใช้ชื่อ code ตาม convention เดิม
บันทึกชื่อโมเดลที่ใช้งานจริงใน ai-use.md ไม่สมมติชื่อหรือเวอร์ชัน Gemini

แผนนี้แบ่ง Lab 4 เป็น **5 เฟสใหญ่ F1–F5 และ 15 work packages L4-P00–L4-P14**
รหัสเหล่านี้เป็นแผนเสนอสำหรับ Lab 4 ไม่ใช่รหัสบังคับของชีทหรือสถานะงาน Lab 3
หนึ่งเฟสมีหลาย Issues/PRs ได้ ห้ามรวมทั้ง sprint เป็น PR เดียว

การสร้าง pipeline นี้ไม่ใช่การสั่งให้เริ่ม implementation, เปิด Issue, push, merge หรือส่งงานแล้ว
เมื่อผู้ใช้ส่ง prompt เริ่มงานให้ Gemini จึงทำตามขอบเขตที่ prompt นั้นกำหนด

## 1. สิ่งที่ต้องอ่านก่อนลงมือ

1. อ่าน AGENTS.md และคำสั่งที่ใช้กับ directory เป้าหมาย
2. อ่าน PDF ทุกหน้า รวม rubric Section 14; ถ้าเปิด source ไม่ได้ ให้ระบุข้อจำกัดและขอไฟล์ก่อนสรุปข้อกำหนดที่ยังยืนยันไม่ได้
3. อ่าน `docs/lab-03/specification.md`, `api-spec.md`, `ui-spec.md`, `tests.md` เต็มฉบับ เพื่อรักษา baseline
4. ตรวจ Lab 2 contract ที่เกี่ยวกับ regression, README, package manifests, test configuration, Prisma schema/migrations และ app routes จริง
5. อ่าน `.antigravityrules` และ `docs/lab-03/PHASES.md` เพื่อเข้าใจบริบทเดิม แยกบันทึกผลเก่าออกจากสิ่งที่ตรวจยืนยันใน checkout ปัจจุบัน
6. หลังสร้าง Lab 4 contract แล้ว อ่านทั้งสี่ไฟล์เต็มฉบับก่อนเริ่มเฟสใหม่ และตรวจ sections/AC/tests ที่เกี่ยวข้องก่อนแต่ละ Issue

ลำดับอำนาจ: คำสั่งผู้ใช้และ agent rules ที่มีผล → Lab 4 contract ที่ตกลงแล้วและโจทย์ → pipeline นี้
เมื่อแหล่งข้อมูลขัดกัน ให้ระบุไฟล์/section พร้อมข้อเสนอแก้ไขก่อน implement ส่วนที่ขัดกัน
ข้อยกเว้น Lab 2/Lab 3 ไม่ควรถูกนำมาปิดกั้นฟีเจอร์ที่ Lab 4 ขอ แต่ต้องปรับขอบเขตเอกสารอย่างชัดเจน ไม่ข้ามกฎเงียบ ๆ

## 2. กติกาการทำงาน

- ใช้ stack เดิม: React/TypeScript/Vite/Bootstrap, Express/TypeScript/Prisma/PostgreSQL, Vitest/Supertest/RTL/Playwright
- รักษาการเปลี่ยนแปลงของผู้ใช้ ตรวจ dirty files ก่อนเริ่ม ห้าม reset/clean/stash/เขียนทับงานที่ไม่เกี่ยวข้อง
- แก้ integration เดิมเฉพาะที่จำเป็นตาม contract ห้ามสร้าง app ใหม่หรือคัดลอก business logic ทั้งชุดเพื่อหลบการแก้จุดเชื่อมต่อ
- เพิ่ม forward migration; ห้ามแก้ migration ที่ใช้งานแล้ว ห้ามล้างข้อมูลเดิมเพื่อให้ migration ผ่าน
- ไม่ติดตั้ง dependency ใหม่ที่อยู่นอก stack โดยไม่ขออนุมัติตาม AGENTS.md; ก่อนเสนอให้ตรวจของที่ repo มีอยู่แล้ว
- ขออนุมัติก่อน destructive/irreversible operations และห้าม merge ในนามผู้เขียน PR; reviewer เป็นผู้ approve และ merge
- ไม่ส่งข้อความหา reviewer หรือคนอื่นโดยไม่มีคำสั่งให้ส่ง เตรียม review packet ได้
- ไม่ลด assertion, skip, disable หรือเปลี่ยน test ให้หลบ acceptance criterion
- ใช้ session identity และ enforce ownership/role ที่ backend อย่าเชื่อ requester/performer identity จาก client
- คง payload และ regression เดิม รวม foreign-resource 403, missing-resource 404, removed-download 410, double-removal 409 ตาม baseline contract
- ห้ามเพิ่ม SLA automation, notification services, inventory/purchasing, billing/payroll, multi-level approvals/signatures, advanced BI, multi-tenancy หรือ production-scale cloud operations
- ไม่แต่งผลทดสอบ screenshot PR URL reviewer identity approval หรือ reflection ของมนุษย์
- ขอคำตอบเฉพาะ business decision หรือสิทธิ์ที่จำเป็นจริง ไม่ถามซ้ำเรื่องที่ผู้ใช้อนุมัติแล้ว ทำงานที่ไม่ติด blocker ต่อได้

## 3. Decision gate ก่อนเขียน feature

บันทึกใน `docs/lab-04/decisions.md`: ID, source/section, ambiguity, options, recommendation, impact, status และคำตอบจริง
สถานะเริ่มต้นทุกข้อด้านล่างเป็น **Proposed** ห้ามใช้ข้อเสนอเป็น business rule ที่อนุมัติแล้ว

| ID | จุดที่ต้องตัดสิน | แนวทางเสนอ ไม่ใช่ข้อกำหนดที่ยืนยันแล้ว |
|---|---|---|
| D01 | §4.1/8.3 ระบุ field ของ action แต่ §14 Part 6 ต้อง assign/transition/complete/cancel/inactive-assignee rejection | แยก assignee ออกจาก performer ที่ server บันทึกอัตโนมัติ; กำหนด action statuses, transitions และ permissions ให้ครบ |
| D02 | §4.5/9 กล่าวถึง resolution gate แต่ไม่มีเงื่อนไขครบ | ระบุสิ่งที่ต้องครบก่อน resolve, ผลของ pending follow-up และ legacy Tickets ที่ไม่มี actions โดยห้ามเดาเงื่อนไขเอง |
| D03 | §8.3 อนุญาต edit แต่ §14 Part 7 ต้อง append-only | ยืนยันว่า append-only ใช้กับสิ่งใด; เสนอ immutable workflow history และตรวจว่าต้องมี action revision history หรือไม่ พร้อมรักษา comments/notes เดิม |
| D04 | §4.3 จำกัด Requester visibility ตาม spec แต่ §8.3 ระบุเห็นทุก action | เสนอเห็น action ทั้งหมดของ Ticket ที่ตนเป็นเจ้าของแบบ read-only; ตัดสิน field visibility และไม่เปิดเผย Internal Notes |
| D05 | §4.6/6.2 ให้ตัวอย่าง metrics; §14 Part 5 ต้อง current-user Actions Taken | ตัดสินชุด metrics, ความหมาย open/recent/urgent/current-user, timezone, boundaries, list limits, ordering และ drill-down |
| D06 | Action date/time เทียบกับ create date/time ใน §4.1/8.3 | ตัดสิน event time กับ server-created timestamp, editable fields, future/backdated dates, text limits และ required result |
| D07 | §4.3 อนุญาต Administrator ทำ Staff behavior สำหรับ Actions Taken; baseline Lab 3 แยกสิทธิ์ Admin | ระบุ permission delta เฉพาะ Lab 4 อย่างชัดเจน ไม่ขยายสิทธิ์ notes/attachments/Staff mutations อื่นโดยปริยาย |
| D08 | AGENTS.md และ .antigravityrules เดิมเจาะจง Lab 2/3 | เตรียม minimal documentation patch ให้ Lab 4 ใช้ contract ใหม่และ lab4-staging โดยคงประวัติ/กฎเดิมของ Lab 2/3 |
| D09 | §5.1/6.1/8.5 ต้อง stale-update และ retry safety | ตรวจกลไก version เดิมก่อน เลือก transaction/concurrency/duplicate-request policy แล้วกำหนด exact API behavior |

ไม่ต้องหยุดงานทั้งเฟสเพราะคำถามเดียว: สำรวจ baseline, ร่าง contract ที่ติดป้าย TBD และจัด test mapping ต่อได้
ห้ามเริ่ม schema/API ที่ผูกกับ D01–D09 ที่ยังไม่ได้ข้อยุติ หรือรายงาน contract Ready ทั้งที่มี blocking TBD

## 4. Pipeline และ dependencies

| เฟส | Work packages | ผลลัพธ์ก่อนออกจากเฟส |
|---|---|---|
| F1 — Baseline, contract, tests | L4-P00–P02 | ข้อกำหนดสอดคล้องกัน, decisions ที่จำเป็นได้ข้อยุติ, AC ↔ tests ครบ, test environment ปลอดภัย |
| F2 — Actions Taken และ Ticket workflow | L4-P03–P06 | migration/API/UI/workflow ผ่าน tests และ review ราย package; ของเดิมไม่เสีย |
| F3 — Dashboards และ integration | L4-P07–P10 | metrics ถูก, drill-down ตรง, role isolation และ concurrent/retry behavior ผ่าน |
| F4 — Regression และ final polish | L4-P11–P12 | suites/visual/accessibility/performance-smoke ตาม contract ครบ มีหลักฐานจริง |
| F5 — Release และ submission | L4-P13–P14 | reviewer merge จริง, final-main verification, PDF เดียว Answer Part 1–9 |

### F1 / L4-P00 — ตรวจ baseline และขอบเขต repository

- ตรวจ branch, HEAD SHA, remote, dirty files, local instructions, existing Issue/PR ถ้ามีสิทธิ์เข้าถึง
- แยก current verified state / historical log / unverified code; ห้ามใช้ PHASES.md เดิมยืนยันว่า final main ปัจจุบันผ่าน
- สำรวจ schema, routes, permissions, UI tokens, test scripts และ test DB safeguards
- บันทึก `baseline.md` และ `implementation-log.md`; ระบุ suites ที่ยังรันไม่ได้พร้อมเหตุผล
- เตรียม patch D08 และตรวจว่า task นี้อนุญาตให้ apply หรือยัง ถ้าต้องขออนุมัติ ให้ส่ง patch ที่ตรวจได้ก่อน
- Gate: มี baseline และ change scope ที่ชัดเจน ไม่มีการแก้ product code

### F1 / L4-P01 — Engineering contract

- เขียน `specification.md`, `api-spec.md`, `ui-spec.md` โดยสรุปและกำหนดรายละเอียด ไม่คัดลอกชีททั้งฉบับ
- specification ต้องมี 11 sections ตาม §9 พร้อม FR/BR/AC, permissions, action model, final Ticket matrix, metric dictionary และ Product Definition of Done
- ระบุ database decisions อย่างน้อยสองข้อ, migration/backfill/recovery, legacy behavior และ seed strategy
- API ระบุ paths/methods/DTO/validation/status/error/conflict; UI ระบุ modes/states/role behavior/tokens/breakpoints/accessibility
- จัดการ decisions โดยรวมคำถามที่เกี่ยวเนื่องกัน ไม่ถามทีละบรรทัด
- Gate: blocking decisions ได้ข้อยุติ; contract ไม่ขัดกับ rubric หรือ baseline ที่ต้องรักษา

### F1 / L4-P02 — Test plan และ safety harness

- เขียน `tests.md` ให้ทุก AC มี test ID/type/input/expected result/actual target file/status
- ครอบคลุม unit, API/integration, component, UI style, responsive, authorization, workflow, migration/regression, performance-smoke, E2E
- ตรวจ disposable database จาก configuration และเป้าหมายจริง ไม่อาศัยแค่ชื่อมีคำว่า test; isolated uploads และ cleanup ต้องอยู่ใน directory ของ run นั้น
- ห้ามพิมพ์ secrets/connection strings ลง log; ห้ามใช้ shared DB เพื่อให้ gate ผ่าน
- รักษา fail-closed guards; ถ้า environment ไม่พร้อม ให้บันทึก Blocked และทำเอกสารหรือ checks ที่ไม่แตะ DB ต่อ
- Gate: tests traceability ครบ และ harness ที่จำเป็นตรวจสอบได้จริงก่อน database suites

### F2 / L4-P03 — Database, migration, seed

Depends: L4-P01, L4-P02

- เขียน preservation/migration/seed tests ก่อน แล้วพิสูจน์ Red ที่ตรงเหตุผล
- เพิ่ม models/relations/indexes/version fields เท่าที่ contract กำหนด ไม่สร้าง fields ตามข้อเสนอที่ยังไม่ตกลง
- ทดสอบ fresh DB และ populated legacy DB; ตรวจ records, FK, ownership และ attachments ที่ต้องคงอยู่
- ทดสอบ documented rollback หรือ recovery ใน sandbox; ห้าม reset shared DB
- Seed ซ้ำได้โดยไม่ล้างข้อมูล; ครอบคลุม major statuses/priorities, assigned/unassigned, zero/one/many actions, zero/non-zero metrics
- Gate: migration preservation, recovery และ seed idempotency ผ่านจริง

### F2 / L4-P04 — Actions Taken API

Depends: L4-P03

- ทำ list/read/create/update และ assignment/lifecycle operations ตาม contract ที่ตกลง
- Server กำหนด actor; validate assignee, action fields, conditional follow-up note และ accessible Ticket
- Test ทุก role, foreign Ticket, invalid input, inactive assignee, stale version, duplicate retry และ safe error
- Administrator permissions ต้องตรง delta ที่ระบุ ห้ามเผลอเปิด Staff capabilities อื่น
- Gate: positive/negative API tests และที่เกี่ยวข้องกับ audit/order ผ่าน

### F2 / L4-P05 — Actions Taken UI

Depends: L4-P04

- เพิ่ม area ใน Ticket Detail: list/table, create, view/edit, assign, transitions, complete/cancel ตาม contract
- Requester เห็น read-only ตาม ownership/field visibility; Staff/Admin เห็น controls ตาม permissions
- รักษาข้อมูล form เมื่อ recoverable failure; ป้องกัน repeated submissions; conflict ต้องมี recovery ที่ชัดเจน
- Test required feedback, conditional validation, keyboard/focus, responsive และ multiple actions ต่อ Ticket
- Gate: component tests และ action-flow E2E ผ่าน; ภาพจริงตรวจแล้ว

### F2 / L4-P06 — Final Ticket workflow

Depends: L4-P04; UI integration ใช้ L4-P05

- Implement final transition matrix/resolution gate ด้วย backend transaction/concurrency protection ตาม contract
- รักษา 8 statuses; Requester appears-resolved เป็น advisory ไม่เปลี่ยน Ticket เป็น Resolved เอง
- พิสูจน์ direct API bypass ทำไม่ได้; test allowed/forbidden transitions, legacy zero-action Tickets และ races ที่กระทบ gate
- UI แสดง transitions ที่ใช้ได้และ refresh summary; ตรวจ stable ordering/append-only ตามสิ่งที่ตกลงใน D03
- Gate: workflow API/component/E2E ผ่าน พร้อม regression ของ operations เดิม
- หาก API/UI diff ใหญ่ ให้แยก Issues/PRs ภายใต้ L4-P06 ไม่รวมเพื่อรักษาจำนวน package

### F3 / L4-P07 — Dashboard backend และ metric verification

Depends: L4-P03, L4-P04, L4-P06

- สร้าง concise dashboard responses จาก authoritative backend queries ไม่ส่งทั้ง collection ให้ client นับเอง
- ใช้ fixtures ที่รู้ expected counts และ boundary timestamps; เทียบ selected metrics กับ independent DB queries
- Test Requester ownership, Staff/Admin permission, zero results, stable sorting, limits, timezone/date boundaries
- ระบุ filter/query ที่ drill-down ใช้และพิสูจน์ว่าตรงกับ count
- Gate: requester-dashboard/staff-dashboard API tests และ metric evidence ผ่าน

### F3 / L4-P08 — Requester Dashboard

Depends: L4-P07

- สร้าง cards/recent/attention-required items ตาม metric dictionary พร้อม links ไป My Tickets/Detail
- ใช้เฉพาะข้อมูล authenticated owner; ทดสอบ account switching และ cache/state ไม่รั่ว
- ครบ loading/empty/error/forbidden และ responsive/keyboard states
- Gate: component + dashboard E2E ส่วน Requester ผ่าน

### F3 / L4-P09 — IT Staff/Administrator Dashboard

Depends: L4-P07

- สร้าง operational metrics, current-user Actions Taken และ recent/urgent Tickets ตาม contract
- Drill-down ไป Queue/Detail/filtered view ที่เหมาะสม; define Admin reuse ชัดเจน
- Current-user Actions Taken ต้องตรงนิยามที่ตกลง ไม่สับสน assignee กับ performer
- Gate: component + dashboard E2E ส่วน Staff/Admin และ metric query comparisons ผ่าน

### F3 / L4-P10 — Integration, role isolation และ safe failure

Depends: L4-P05, L4-P06, L4-P08, L4-P09

- ตรวจ action/status mutation แล้ว dashboard/detail/list update ถูกต้อง ไม่ค้างข้ามบัญชี
- ตรวจ auth/session/role/ownership/CSRF ตาม baseline; Requester ไม่เห็น private notes หรือ protected fields
- จำลอง stale changes, competing updates, repeated clicks/network retries, recoverable API failures และ not-found
- เก็บ input ที่ควรคงอยู่; error ไม่เปิดเผยข้อมูลภายใน
- Gate: cross-feature E2E/security/conflict tests ผ่าน ไม่มี placeholder controls

### F4 / L4-P11 — Full regression และ performance smoke

Depends: L4-P10

- รัน unit/server/client/Playwright ตาม scripts จริงของ repo ใน environment ที่พิสูจน์ว่าปลอดภัย
- ครอบคลุม Labs 1–3: authentication, Requester flows, attachments, Staff queue/operations, comments, notes, Admin management
- รันทดสอบ migration/regression และ performance-smoke ด้วย dataset/threshold/environment ที่ตกลงใน tests.md
- แยก Product defect / Environment blocker / Not run; ห้ามแทน E2E ด้วย build หรือ test --list
- Gate: ทุก planned check ที่จำเป็นผ่าน ไม่มี skipped/disabled tests; เก็บ run time, SHA, commands, results และ paths

### F4 / L4-P12 — Responsive, accessibility, visual และ README

Depends: L4-P11; แก้ defect แล้วรันทดสอบที่ได้รับผลกระทบอีกครั้ง

- ตรวจทุก major Lab 4 screen ใน desktop/tablet/mobile ตาม baseline breakpoints
- ตรวจ tokens, badges, editable/read-only fields, validation placement, keyboard/focus, modal semantics, non-color cues, clipping/overlap/overflow
- อ่านภาพที่ capture จริง ไม่ใช้การมีไฟล์ภาพเป็นหลักฐานว่า visual check ผ่าน
- อัปเดต setup/migration/seed/tests/demo README และ visual-checklist.md
- Gate: Product DoD ตรวจครบ พร้อม screenshots และสถานะข้อบกพร่องตามจริง

### F5 / L4-P13 — Peer review และ release

Depends: L4-P11, L4-P12 และ feature review gates ทั้งหมด

- Peer review ต้องเกิดทุก feature PR ตั้งแต่ F1 ไม่สะสมไว้จน F5
- Feature PR target `lab4-staging`; release PR เท่านั้นที่ target `main`
- ผูก Issue ผ่าน Development panel อย่างชัดเจนและตรวจข้อความว่า merge อาจปิด Issue ก่อนย้าย PR Review; อย่าเชื่อ Closes #N อย่างเดียวบน staging
- บันทึก reviewer identity, links, feedback, responses, approvals และ merge หลักฐานจริงใน reviewer.md
- เตรียม release PR ให้ reviewer; ห้าม author/agent self-merge
- หลัง reviewer merge ให้ตรวจ final main SHA และรัน required suites บน checkout นั้นด้วย disposable DB
- Gate: release merged จริง + final-main evidence ตรง SHA; ระหว่างรอให้ทำ submission draft ต่อโดยไม่อ้าง merged

### F5 / L4-P14 — Submission PDF

Depends: L4-P13 สำหรับผลลัพธ์ฉบับส่ง; ร่างโครง/รวบรวม evidence ได้ก่อน

- สร้าง PDF เดียวใช้หัวข้อ Answer Part 1 ถึง Answer Part 9 ตามลำดับ
- ใช้ working links, rendered Markdown, readable screenshots และ test output จริงจาก main
- ai-use.md ระบุ actual LLM และ 6–10 key prompts; ขอ reflection จากผู้ใช้หรือให้ผู้ใช้ตรวจร่าง ห้ามอ้างว่าเป็นประสบการณ์จริงของผู้ใช้เอง
- Render PDF แล้วตรวจทุกหน้า: ไม่ล้น/ตัด/ซ้อน, อ่านได้, links ถูก; ไม่ส่งไฟล์ขึ้นระบบภายนอกโดยไม่มีคำสั่งให้ส่ง
- Gate: PDF ครบ rubric และตรง final main; ยังไม่ถือว่า submitted จนมีหลักฐานส่งจริง

## 5. วงจรทำงานต่อ Issue

1. ตรวจสถานะจริงและเลือก ready package ที่ dependencies ผ่าน; ใช้ Issue เดิมถ้ามี ไม่สร้างซ้ำ
2. Issue ต้องมี phase/package, FR/BR/AC, scope/files, planned tests, dependencies และ acceptance gate
3. สร้าง feature branch ตาม convention `codex/lab4-<package>-<slug>` เว้นแต่ผู้ใช้/ทีมระบุอย่างอื่น โดยตรวจฐาน branch และ dirty work ก่อน
4. เขียน test ตาม tests.md และรัน Red; ถ้าผ่านอยู่แล้ว ให้ตรวจ existing behavior และความถูกต้องของ test ไม่ทำโค้ดเสียเพื่อสร้าง Red ปลอม
5. Implement ทีละส่วน → Green → refactor ที่จำเป็น → required regression/build/type/lint checks ตาม repo
6. ตรวจ diff ไม่แตะงานคนอื่น ไม่ใส่ secrets/generated clutter; อัปเดต tests.md/implementation-log.md ตามผลจริง
7. เปิด PR เมื่ออยู่ในขอบเขตที่ได้รับคำสั่ง พร้อม test evidence/limitations; ผูก Issue และเตรียม peer review packet
8. Reviewer approve/merge; update board ตามหลักฐานจริงแล้วจึงใช้ integrated state เป็นฐานของ dependent package

งานเอกสารล้วนตรวจ consistency และ diff โดยไม่สร้าง TDD Red/Green ปลอมหรืออ้าง product AC ผ่าน
การแก้ legacy files ใช้ scope approval ที่มีอยู่จริง; ถ้ากฎเฉพาะบังคับ approval ที่ยังไม่มี ให้เตรียม minimal patch และอ้างกฎนั้นโดยตรง

## 6. Deliverables และชื่อไฟล์ที่ต้องคง

ภายใน `docs/lab-04/`:
- บังคับตามชีท: specification.md, api-spec.md, ui-spec.md, tests.md, reviewer.md, ai-use.md
- Supporting plan/evidence: decisions.md, baseline.md, PHASES.md, implementation-log.md, visual-checklist.md, submission-checklist.md
- PHASES.md ต้องเริ่มจากสถานะจริง ห้าม copy Done/Passed ของ Lab 3 มาใช้กับ Lab 4

Server: `server/tests/lab-04/`
- actions-taken.api.test.ts
- ticket-workflow.api.test.ts
- requester-dashboard.api.test.ts
- staff-dashboard.api.test.ts

Client: เลือก directory lab-04 ให้ตรง test layout จริง และบันทึก actual paths ใน tests.md
- StaffDashboard.test.tsx
- RequesterDashboard.test.tsx
- ActionsTaken.test.tsx
- TicketWorkflow.test.tsx

E2E: `e2e/lab-04/`
- actions-taken-flow.spec.ts
- ticket-resolution.spec.ts
- dashboards.spec.ts

Screenshots: `artifacts/lab-04/screenshots/{staff-dashboard,requester-dashboard,actions-taken}/`
แยก run/viewport/state ภายในแต่ละโฟลเดอร์; เพิ่ม workflow evidence ตามความจำเป็น
เพิ่ม tests ด้าน migration/security/unit/performance ได้ตาม AC โดยไม่ลดรายการบังคับ

## 7. Submission coverage

| Answer Part | คะแนน | หลักฐานที่ต้องเตรียม |
|---|---:|---|
| 1 | 10 | feature → lab4-staging → main history, Done board, reviewer.md พร้อมตัวตน/PR/comments/responses/approvals, README/.gitignore/tree |
| 2 | 5 | linked/rendered specification, numbered requirements/rules/AC, migration/metrics/DoD และ evidence ว่ามีก่อน implementation PRs หลักเสร็จ |
| 3 | 10 | linked/rendered tests.md, traceability/actual paths/final status, complete passing suites จาก final main |
| 4 | 5 | rendered ai-use.md, actual LLM, 6–10 prompts, My Reflection |
| 5 | 5 | Staff dashboard metrics/current-user actions/recent-urgent Tickets/drill-down/states/responsive และ DB query comparisons |
| 6 | 10 | Actions list/create/assign/edit/transition/complete/cancel/validation/inactive-assignee rejection/roles/failures/responsive และหลาย actions ต่อ Ticket |
| 7 | 5 | Ticket transitions, stable ordering, agreed append-only behavior, role visibility |
| 8 | 5 | Requester-owned metrics/recent-attention items/drill-down/ownership และ representative Labs 1–3 regression |
| 9 | 5 | rendered ui-spec, desktop/tablet/mobile screenshots, completed visual/accessibility checklist |

## 8. สถานะและ handoff หลังทุก session

ใช้สถานะ Planned / In progress / Implemented-unverified / Verified / Awaiting review / Merged / Blocked
Verified ต้องมีผลตรวจจริง; Merged ต้องมีหลักฐาน merge; ถ้าถูก block ให้บันทึกเฉพาะขอบเขตนั้น

รายงานรูปแบบนี้:

```text
Phase/package:
Issue / branch / PR / base / HEAD SHA:
งานที่ทำและไฟล์ที่เปลี่ยน:
FR/BR/AC และ test IDs ที่ตรวจจริง:
Red: command + expected failure + actual result (หรือ documentation-only)
Green/regression: command + result + evidence path
Not run / blocked / skipped: รายการและเหตุผล
Decisions/approval ที่ยังต้องการ: อ้าง source/section + concrete proposal
Review/integration status:
Next ready package และ dependencies:
```

ก่อนจบต้องอัปเดต PHASES.md, tests.md และ implementation-log.md ให้ตรงความจริง
ถ้า context ขาด ให้เริ่มจาก HEAD/working tree/ไฟล์ handoff และตรวจ evidence ใหม่เท่าที่จำเป็น ไม่เริ่มทั้ง sprint ซ้ำ
