# Lab 3 — Phase Overview

เอกสารสรุปแผน ไม่ใช่รายงานว่าทำเสร็จแล้ว ทุก Phase เริ่มต้นเป็น Planned จนมีหลักฐานจริง
อ่านกฎและรายละเอียดทั้งหมดใน [`.antigravityrules`](../../.antigravityrules) ก่อนเริ่มงาน

## ตำแหน่งไฟล์

- `.antigravityrules` อยู่รากโปรเจกต์ เป็น pipeline และกฎเสริมสำหรับ coding agent
- `docs/lab-03/` เก็บเอกสาร Lab 3 แยกจาก `docs/lab-02/` ไม่ใช้ชื่อ `doc3`
- ใช้แอปเดิมใน `client/` และ `server/` ไม่สร้างแอป Lab 3 ซ้ำอีกชุด
- Tests ใหม่อยู่ใน `server/tests/lab-03/`, `client/tests/lab-03/` และ `e2e/lab-03/` ตาม convention จริง
- ภาพหลักฐานใหม่อยู่ใน `artifacts/lab-03/screenshots/` ห้ามเขียนทับภาพ Lab 2

ไฟล์ contract/evidence ที่ต้องจัดทำใน Phase ที่เกี่ยวข้อง:
`specification.md`, `api-spec.md`, `ui-spec.md`, `tests.md`, `reviewer.md`, `ai-use.md`
พร้อมเอกสารสนับสนุน เช่น `baseline.md`, `legacy-change-proposals.md` และ `implementation-log.md`
อย่าสร้างผล Pass หรือ reviewer approval ล่วงหน้าเพื่อเติมเอกสารให้ดูครบ

## แผน 15 Phase

| Phase | งาน | ผลลัพธ์ที่ต้องยืนยัน |
|---|---|---|
| P00 — Baseline | อ่าน repo และตรวจ Lab 2 โดยไม่แก้โค้ด | สถานะจริงของงานเดิม, branch/HEAD, ผลทดสอบที่ปลอดภัย และรายการเสนอแก้ legacy |
| P01 — Specification | กำหนด requirements, roles, workflow, API, UI และ migration | Contract ครบ ไม่ขัดกัน และอนุมัติขอบเขต patch ก่อน implement |
| P02 — Test Plan | จับคู่ทุก AC กับ planned tests และเตรียม test environment | tests.md พร้อม IDs/paths และ test DB/cleanup ที่ไม่กระทบข้อมูลผู้ใช้ |
| P03 — Data Migration | เพิ่ม users/credentials/roles/owner/statuses/comments/notes/seed | Migration ผ่านบน fresh และ populated test DB; ข้อมูล/ไฟล์เก่าอยู่ครบ; seed idempotent |
| P04 — Auth Backend | Login/logout/me/mandatory password change/session | ยืนยัน credentials, forced change, expiry และ logout invalidation จริง |
| P05 — Authorization | ใช้ session identity แทน development context และ enforce role/ownership | Direct API bypass ไม่ได้; ปลอม requesterId ไม่ได้; private notes ไม่รั่ว |
| P06 — Auth UI | Login, Change Password, role navigation และ Logout | ทุก role ไปหน้าที่ถูกต้อง; ไม่มี Change Requester; ไม่แสดงข้อมูลบัญชีเก่าหลังเปลี่ยนบัญชี |
| P07 — Requester Regression | เชื่อมฟังก์ชัน Lab 2 กับ authenticated identity | Create/list/detail/attachments และ ownership เดิมยังทำงาน รวมข้อมูลก่อน migration |
| P08 — Staff Queue | Queue search/filter/sort/pagination และ responsive UI | ใช้ API/DB จริง มี query behavior และ screen feedback ครบ |
| P09 — Staff Operations | Claim/reassign, IT Priority และ permitted status transitions | สิทธิ์/validation/confirmation ถูก; concurrent updates ไม่ทับกันเงียบ ๆ |
| P10 — Communication | Public Comments, Internal Notes, Problem Appears Resolved | Append-only, author/time จาก server, แยก visibility; Requester ไม่ formal resolve/close |
| P11 — User Administration | List/search/create/edit/role/activation/initial-password reset | Duplicate/self-deactivation/last-active-admin protection ผ่าน และ reset บังคับเปลี่ยนรหัสใหม่ |
| P12 — Integrated Verification | E2E/security/migration/regression/visual inspection | ผลจริงของ suites และภาพ desktop/tablet/mobile พร้อม checklist; ไม่อ้าง build แทน E2E |
| P13 — Review and Integration | Peer review, feature → lab3-staging → main | หลักฐาน review/approval/merge จริง และ rerun บน final main พร้อม SHA |
| P14 — Submission | จัดเอกสารและหลักฐานส่งงาน | PDF เดียว Answer Part 1–9 ครบ ลิงก์ใช้งานได้ ภาพอ่านได้ และตรง final main |

## กติกาทุก Phase

1. เริ่ม P00 ก่อน ไม่เริ่มสร้างระบบทั้งชุดทันที
2. ถ้าจำเป็นต้องแก้ไฟล์เดิม ให้เสนอ minimal patch พร้อม requirement/ผลกระทบ/regression tests และรออนุมัติ
3. หาก repository instructions ของ Lab 2 ขัดกับ Lab 3 ให้เสนอการปรับขอบเขตที่ชัดเจนก่อน ไม่ข้ามกฎเงียบ ๆ
4. บันทึกไฟล์ที่เปลี่ยน คำสั่งที่รัน ผลจริง และสิ่งที่ยังขาดใน implementation-log.md
5. ไม่ปลอมผลเทสต์ ไม่ลด assertion/skip เพื่อให้ผ่าน และไม่ใช้ผลเก่าเป็นผล checkout ปัจจุบัน
6. แยก Planned/In progress/Implemented-unverified/Verified/Blocked; การผ่าน test ไม่ใช่หลักฐานว่า peer reviewer merge แล้ว
7. เอกสารนี้ไม่ถือเป็นการอนุมัติ implementation, destructive operations, commit/push หรือ merge

## ประเด็นที่ต้องยืนยันใน P00/P01 ก่อนใช้ pipeline

- รักษา 403 ของ foreign Requester resources ตาม Lab 2 หรือขออนุมัติเปลี่ยน contract; pipeline มีตัวอย่าง 404 ที่ต้องคลี่คลาย
- ตรวจ enum จริงและเพิ่มสถานะให้ครบทั้ง 8 ค่า รวม OPEN และ CLOSED ที่ schema Lab 2 เดิมยังไม่มี
- เก็บ IT Priority เดิมที่ถูกต้อง; backfill เฉพาะข้อมูลที่ขาด ไม่ทับค่าทุกแถว
- ใช้ชื่อ field/path จริง เช่น ticketNo แทนการ rename ให้ตรงตัวอย่าง ticketNumber โดยพลการ
- เสนอ scope update ของ AGENTS.md ที่ยังเป็นกฎ Lab 2 และ branch flow เดิม โดยไม่แก้ก่อนอนุมัติ
