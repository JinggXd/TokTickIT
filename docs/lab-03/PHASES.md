# Lab 3 — แผน 5 เฟสใหญ่

อัปเดตแผน: 2026-09-16 ตามคำขอให้รวมงานเป็น 5 เฟสใหญ่ (F1–F5)
เก็บ P00–P14 เดิมเป็นรหัสงานย่อยสำหรับอ้างอิง requirement, dependencies, Issue, PR และประวัติผลทดสอบ
การรวมเฟสไม่ลด scope/AC/test/หลักฐาน และไม่เปลี่ยนลำดับ dependency ของงานย่อย
เอกสารนี้เป็นแผน ไม่ใช่รายงานว่าทำเสร็จแล้ว ทุกงานเริ่มต้นเป็น Planned จนมีหลักฐานจริง
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

## แผน 5 เฟสใหญ่และเกณฑ์จบงาน

| เฟสใหญ่ | งานย่อยเดิม | ต้องทำอะไร | ผลลัพธ์ก่อนจบเฟส |
|---|---|---|---|
| F1 — เตรียมแผนและระบบทดสอบ | P00–P02 | ตรวจ baseline Lab 2; จัด specification/API/UI/test plan; แยก DB/uploads/server/worker; แก้และตรวจ isolation/cleanup | Contract และ test mapping ครบ; HARNESS-01 ครบทุกกรณี; baseline suites ที่จำเป็นรันบน environment แยกได้; งานผ่าน review |
| F2 — ฐานข้อมูลและระบบเข้าสู่ระบบ | P03–P06 | Additive migration/seed; users/roles; login/logout/session/password lifecycle; server authorization; auth UI และเมนูตาม role | Migration fresh/populated DB และ seed idempotency ผ่าน; ข้อมูลเดิมอยู่ครบ; auth/role/forced-change/security tests ผ่าน พร้อม review |
| F3 — ระบบ Requester และ Staff | P07–P10 | Requester regression; Staff Queue; claim/reassign/priority/status; Public Comments/Internal Notes/appears-resolved | Ticket workflow ผ่าน API/UI/integration ตาม AC; ownership และ note visibility ถูกต้อง; Lab 2 regression ผ่าน พร้อม review |
| F4 — ระบบ Admin และทดสอบรวม | P11–P12 | User management/reset/activation/role safety; full E2E/security/migration/regression/responsive; screenshots และ visual checklist | ฟีเจอร์และ AC ครบ; suites ที่กำหนดผ่านจริง ไม่มี skip; ตรวจภาพ desktop/tablet/mobile และเก็บหลักฐาน พร้อม review |
| F5 — รวมงานและส่งงาน | P13–P14 | ตรวจหลักฐาน peer review; release lab3-staging → main; ทดสอบ final main; PDF Answer Part 1–9 | Reviewer approval/merge จริง; final-main SHA และผลทดสอบตรงกัน; เอกสารและลิงก์ส่งงานครบ |

ทำ F1 → F2 → F3 → F4 → F5 ตามภาพรวม และรักษา dependencies งานย่อยใน `.antigravityrules`
ให้รายงานสถานะทั้งสองระดับ เช่น **F1 / P02 — In progress** เพื่อไม่สับสนกับ P01 เดิม

## Issue / branch / PR ระหว่างทุกเฟส

5 เฟสใหญ่ไม่ใช่ข้อกำหนดให้มีเพียง 5 Issues หรือ 5 PRs ให้แบ่งตามชุดงานที่ตรวจได้
ตัวอย่าง F2 แยก migration, authentication backend, authorization และ auth UI ได้ตาม P03–P06

1. เปิดหรือใช้ Issue ที่มีอยู่ ระบุเฟสใหญ่/งานย่อย, requirement/AC, planned tests และ dependencies; อย่าสร้างซ้ำ
2. ทำทีละ Issue บน branch ของชุดงานนั้น พร้อม Spec DD → Test DD → TDD และบันทึกผลจริง
3. เมื่อพร้อม review ให้ผู้ทำงานเปิด PR เข้า `lab3-staging` ระบุ scope/tests/known gaps
4. ผูก Issue ใน Development panel และตรวจลิงก์ก่อนย้ายการ์ดเป็น PR Review; ข้อความ `Closes #N` อย่างเดียวไม่พอสำหรับ staging
5. เพื่อนที่ไม่ใช่ผู้เปิด PR รีวิว; ผู้ทำงานแก้/ตอบ feedback; reviewer ตรวจซ้ำ approve และเป็นผู้ merge
6. ทำ review ต่อชุดงานตลอด F1–F4; F5 รวบรวมหลักฐานและทำ release PR `lab3-staging` → `main` ที่ต้องผ่าน review เช่นกัน

## รายการงานย่อยเดิม (คงรหัส P00–P14)

| งานย่อย | งาน | ผลลัพธ์ที่ต้องยืนยัน |
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

## กติกาทุกเฟสและงานย่อย

1. เริ่ม P00 ก่อน ไม่เริ่มสร้างระบบทั้งชุดทันที
2. ถ้าจำเป็นต้องแก้ไฟล์เดิม ให้เสนอ minimal patch พร้อม requirement/ผลกระทบ/regression tests และรออนุมัติ
3. หาก repository instructions ของ Lab 2 ขัดกับ Lab 3 ให้เสนอการปรับขอบเขตที่ชัดเจนก่อน ไม่ข้ามกฎเงียบ ๆ
4. บันทึกไฟล์ที่เปลี่ยน คำสั่งที่รัน ผลจริง และสิ่งที่ยังขาดใน implementation-log.md
5. ไม่ปลอมผลเทสต์ ไม่ลด assertion/skip เพื่อให้ผ่าน และไม่ใช้ผลเก่าเป็นผล checkout ปัจจุบัน
6. แยก Planned/In progress/Implemented-unverified/Verified/Blocked; การผ่าน test ไม่ใช่หลักฐานว่า peer reviewer merge แล้ว
7. เอกสารนี้ไม่ถือเป็นการอนุมัติ implementation, destructive operations, commit/push หรือ merge

## Decisions ที่คลี่คลายแล้ว (2026-09-13, contract v1.1.0)

- รักษา foreign Requester resource 403, removed download 410 และ double-remove 409
- คงชื่อ ticketNo, ticketOwnerId, itPriority รวม Requester query/DTO/pagination ของ Lab 2
- เพิ่มสถานะให้ครบ 8 ค่าโดยไม่ทับ valid priority/status/data เดิม
- reuse --zg-* palette และ badge pairs จริง; ไม่เพิ่ม Department management
- Admin อ่าน Public Comments/Internal Notes ได้ แต่ไม่มี Staff mutation permission
- AGENTS.md แยก Lab 2/Lab 3 และ staging branch ตาม scope แล้ว
- ใช้ AC-01–AC-56 จาก specification.md; tests.md เป็นแหล่งเดียวของ test traceability

## สถานะปัจจุบัน — 2026-09-20

| เฟสใหญ่ | สถานะ | หลักฐานและงานค้าง |
|---|---|---|
| F1 / P00–P02 | Merged to lab3-staging | Baseline/contract/test plan ครบ; PR #37 ได้รับการตรวจรับและ merge เข้า `lab3-staging` โดย reviewer เรียบร้อย (commit `97a8403`); ปิด Issue #36; HARNESS-01 (24/24) ผ่าน |
| F2 / P03–P06 | Merged to lab3-staging | Database migration, Seed 24 fixtures, Argon2id password hash, Session RBAC, Auth UI (Login, Change Password, Session ticket flow); PR #39 ได้รับการตรวจรับและ merge เข้า `lab3-staging` (commit `a4a921d`); ปิด Issue #38; Server 171/171 ผ่าน, Client 48/48 ผ่าน, E2E 15/15 ผ่าน |
| F3 / P07–P10 | Merged to lab3-staging | Branch `feature/f3-requester-and-staff`; Issue #40, PR #41 ได้รับการตรวจรับและ merge เข้า `lab3-staging` โดย reviewer (commit `37164aa`); ปิด Issue #40; ครอบคลุม P07–P10 (Requester regression, Staff Queue, operations, communications & confidentiality) |
| F4 / P11–P12 | Merged to lab3-staging | Branch `feature/f4-admin-and-verification`; Issue #42, PR #43 ได้รับการตรวจรับและ merge เข้า `lab3-staging` โดย reviewer (commit `df9ad81`); ปิด Issue #42; ครอบคลุม P11–P12 (User Administration, safety invariants, full E2E verification) |
| F5 / P13–P14 | Verified / Completed | Release PR #45 (`lab3-staging` → `main`) ได้รับการ Approve และ Merge เข้า `main` โดย reviewer `yuminnini` เรียบร้อย (commit `baad45e09272d665bc0cf765236c456edcf0eff7`); ปิด Issue #44; รัน full verification บน final main SHA: Server 263/263 ผ่าน, Client 82/82 ผ่าน, Playwright E2E 108/108 ผ่าน, Builds 0 error; จัดทำเอกสารและ PDF รายงานส่งงานฉบับสมบูรณ์ (Answer Part 1–9) เรียบร้อย |


### รายละเอียดการแก้ไขตามข้อตรวจพบ Peer Review (2026-09-17):
1. **[P1/P2 แก้ไขแล้ว] ป้องกัน API override ชี้ไป dev server และคุ้มครองภาพ Lab 2:** เพิ่ม `validateApiEndpoint` และ `resolveApiBase` ใน `testEnvironment.ts` ปฏิเสธพอร์ต 3000 ทันที; `playwright.config.ts` ซิงค์ `TOKTICKIT_TEST_RUN_ID`, `SCREENSHOT_DIR`, `API_URL` (3001) และ `VITE_API_URL` (3001) ให้กับ worker; และ `requester-ticket-flow.spec.ts` กำหนด fallback ภาพไปยัง `artifacts/lab-03/screenshots/<runId>` เท่านั้น
2. **[P1/P2 แก้ไขแล้ว] Cleanup ปลอดภัยและมี Containment จำกัดเฉพาะรอบทดสอบ:** worker ได้รับ `runId` ตรงกับเซิร์ฟเวอร์, ตัด `server/uploads` เดิมออกในโหมดทดสอบ, และตรวจสอบ `assertContained` จำกัดเฉพาะโฟลเดอร์ของรอบนั้น (`runSpecificDir`) เท่านั้น พร้อมส่งต่อ error ไม่กลืนเงียบ
3. **[P2 แก้ไขแล้ว] ใช้งาน Helper ชุดเดียวกันระหว่าง Tests และ E2E:** `requester-ticket-flow.spec.ts` นำเข้าและเรียกใช้งาน `resolveApiBase` และ `assertContained` โดยตรงจาก `server/src/config/testEnvironment.js` เป็นแหล่งความจริงเดียว (Single Source of Truth) ไม่มีการนิยามฟังก์ชันซ้ำซ้อน
4. **[P2 แก้ไขแล้ว] พิสูจน์ Worker Propagation และ Playwright Guard ที่รันไทม์จริง:** ขยาย `server/tests/lab-03/test-environment.test.ts` โดยรันคำสั่ง Playwright CLI จริง (`npx playwright test --list`) พิสูจน์การ fail-closed เมื่อขาดหรือระบุ DB ผิด; คงสถานะ `HARNESS-01` เป็น `In progress` จนกว่าจะรัน full suites บน disposable database จริง
5. **[P2 แก้ไขแล้ว] ตรวจสอบ Environment จาก Playwright จริงโดยไม่พึ่งพา Build Artifacts และจำลอง Unlink ล้มเหลวใน Cleanup จริง:**
   - แก้ไขการทดสอบ worker propagation ใน `server/tests/lab-03/test-environment.test.ts` ให้เรียกใช้งาน Playwright CLI จริง (`npx playwright test e2e/lab-03/worker-env.spec.ts --project=desktop`) เพื่อพิสูจน์ worker environment propagation จาก `playwright.config.ts` โดยตรง โดยนำเข้าจาก TypeScript sources ไม่พึ่งพาไฟล์บิลด์ `./server/dist/`
   - สกัดฟังก์ชัน `cleanupAttachmentFiles` ไว้ใน `server/src/config/testEnvironment.ts` และนำไปใช้งานทั้งใน `e2e/lab-02/requester-ticket-flow.spec.ts` (`test.afterAll`) และ integration tests
   - เพิ่มการทดสอบจำลอง Physical Unlink Failure (จำลอง `unlinkFn` throw error เช่น `EPERM`) เพื่อพิสูจน์ว่า cleanup failures จะ throw และไม่ถูกกลืนเงียบ ทำให้รันการทดสอบล้มเหลวอย่างชัดเจนตามข้อกำหนด HARNESS-01 ครบถ้วน
6. **[P1 แก้ไขแล้ว] จำกัดการข้าม webServer ให้เฉพาะ probe โดยไม่ใช้ regex หลวม และตัด state ตกค้าง:**
   - ใน `playwright.config.ts` ปรับปรุงฟังก์ชัน `isProbeFile` ให้ตรวจสอบชื่อและเส้นทางไฟล์ที่แน่นอนเจาะจงเฉพาะ `e2e/lab-03/worker-env.spec.ts` แทนการใช้ regex หลวม (`/worker-env|probe/i`) ซึ่งเดิมอาจทำให้ไฟล์อื่นที่มีคำว่า probe ในชื่อหรือโฟลเดอร์หลุดรอดได้
   - ตัดการเซ็ตและแพร่กระจายตัวแปร `PLAYWRIGHT_IS_PROBE` ลงใน `process.env` ออกทั้งหมด เพื่อป้องกัน state ตกค้างข้ามการรัน
   - หากมีการตั้งค่า `PLAYWRIGHT_SKIP_WEBSERVER=true` แต่ไม่ได้ระบุรันเฉพาะ probe (เช่น รันทั้ง suite หรือรัน `requester-ticket-flow.spec.ts` หรือไฟล์ non-probe ที่มีคำว่า probe) ระบบจะ Fail-closed โดยโยน Exception ปฏิเสธการรันทันที
   - เพิ่มการทดสอบใน `server/tests/lab-03/test-environment.test.ts` (รวมเป็น **24 tests**) พิสูจน์ว่าการพยายามข้าม webServer ใน non-probe (รวมถึงชื่อที่มี probe) หรือ all-tests run จะล้มเหลวอย่างชัดเจน ขณะที่การรัน probe ข้าม webServer สำเร็จ
7. **[P1 แก้ไขแล้ว] แก้ไข Frontend Session Identity, Seed Fixtures และ Migration Data Preservation (2026-09-17):**
   - **P06:** ปรับปรุง `MyTickets.tsx` และ `CreateTicket.tsx` ให้นำเข้าและใช้ `effectiveRequester` จาก `useAuth()` (session user) โดยคง fallback ไปยัง `currentRequester` สำหรับ legacy tests ส่งผลให้ผู้ใช้ที่เข้าสู่ระบบผ่านเบราว์เซอร์ใหม่สามารถโหลดและสร้าง ticket ได้อย่างสมบูรณ์
   - **P03:** ปรับปรุง `seed.ts` ให้ hash password และตั้งค่า `mustChangePassword: true` ให้กับผู้ใช้ทุกรายในฐานข้อมูลที่มี `passwordHash == null` (ไม่จำกัดเฉพาะ default accounts) และเพิ่ม seed ticket fixtures จำนวน 24 รายการ ครอบคลุมทั้ง 8 สถานะ, 3 ระดับความสำคัญ, ทั้ง assigned และ unassigned ownership พร้อมตัวอย่าง `PublicComment` และ `InternalNote` โดยทำงานแบบ idempotent 100%
   - **P03:** ขยาย `migration-regression.test.ts` เพื่อทดสอบ data preservation บน populated DB (เปรียบเทียบข้อมูลก่อน-หลัง, ความต่อเนื่องของ sequence ID) และยืนยัน AC-18 / MIG-06 fixtures ครบถ้วน
