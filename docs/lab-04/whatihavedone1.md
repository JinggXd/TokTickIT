# What I Have Done — Major Phase F1: Baseline, Specification, Decisions & Test Traceability (whatihavedone1.md)

**Sprint:** TokTickIT Lab 4 (Actions Taken, Workflow Resolution Gate, Dashboards & Final Regression)  
**Major Phase:** F1 — เตรียมแผน, สัญญาทางวิศวกรรม, ข้อตกลงสถาปัตยกรรม และระบบทดสอบ (Sub-packages: L4-P00, L4-P01, L4-P02)  
**Branch:** `docs/lab4-contract`  
**Base Branch:** `lab4-staging` (สร้างจาก `main` ที่ commit `baad45e`)  
**Commit SHA:** `623b68b`  
**GitHub Issue:** [Issue #46: Lab 4 P00–P02: establish engineering contracts, decision gates, and test traceability](https://github.com/JinggXd/TokTickIT/issues/46)  
**Pull Request:** [PR #47: docs(lab4): establish contracts and align test/pipeline gates (P00-P02)](https://github.com/JinggXd/TokTickIT/pull/47)  
**Date:** 2026-09-26  

---

## 1. ภาพรวมงานที่ทำใน Major Phase F1 (Overview)

Major Phase F1 เป็นเฟสตั้งต้นที่สำคัญที่สุดของ Sprint 4 เพื่อวางรากฐานทางวิศวกรรมซอฟต์แวร์ตามหลักการ **Spec-Driven Development (Spec DD)** และ **Test-Driven Development (TDD)** โดยแบ่งงานออกเป็น 3 ส่วนหลัก (L4-P00–L4-P02):

1. **L4-P00 (Baseline Assessment & Pre-flight Inspection):** ตรวจสอบสถานะระบบเดิมจาก Lab 3 บน commit `baad45e` แบบ Read-Only โดยไม่แก้ไขโค้ดจริง ไม่รัน migration ตรวจสอบความพร้อมของ Docker container และรันการตรวจสอบ Test Environment Safety Guard (`testEnvironment.ts`) ผ่านครบ 24/24 tests พร้อมรัน TypeScript builds และ client test suite เดิม (82/82 pass)
2. **L4-P01 (Sprint 4 Engineering Contracts & Decision Gates):** จัดทำสัญญาข้อกำหนดฉบับสมบูรณ์ 4 ฉบับ (`specification.md`, `api-spec.md`, `ui-spec.md`, `tests.md`) และเอกสารตัดสินใจสถาปัตยกรรม [`decisions.md`](decisions.md) ครอบคลุม D01 ถึง D10 (คงสถานะ `Proposed (TBD)`) พร้อมร่างข้อเสนอ Patch ความปลอดภัยสำหรับ `AGENTS.md` และ `.antigravityrules` ใน `proposed-agents-patch.md`
3. **L4-P02 (Test DD Plan & Traceability Matrix):** จัดทำแผนผังความครอบคลุมการทดสอบ (Traceability Matrix) ใน `tests.md` แมป 35 Acceptance Criteria (AC-01 ถึง AC-35) สู่ 38 Planned Test Cases ครอบคลุม Unit, Concurrency Races, Persistent Idempotency Replay, 8-Status Transitions (17 permitted, 47 forbidden), Count-to-drilldown parity, และ Performance smoke criteria

---

## 2. ลำดับขั้นตอนการทำงานอย่างละเอียด (Step-by-Step Actions)

### 2.1 L4-P00 — การตรวจประเมินสถานะระบบเดิม (Baseline Assessment & Audit)
- ตรวจสอบ Git Working Tree บน `main` (`baad45e09272d665bc0cf765236c456edcf0eff7` หลัง Merge Release PR #45 ของ Lab 3)
- ตรวจสอบความปลอดภัยของระบบทดสอบ: รันเทสต์ `tests/lab-03/test-environment.test.ts` เพื่อพิสูจน์การทำงานของ Fail-closed Guard: **ผ่านครบ 24 / 24 tests** ในเวลา 9.09s (Exit Code 0)
- ตรวจสอบ Docker Container: `toktickit-db` (PostgreSQL 16, ports `5433->5432`, status Exited) มั่นใจว่าฐานข้อมูลจริงจะไม่ถูกแตะต้องใน Phase F1
- รัน Baseline Builds:
  - Server TypeScript Build (`npm --prefix server run build`): สำเร็จ 0 errors
  - Client Vite Build (`npm --prefix client run build`): สำเร็จ 0 errors
- รัน Regression Suite เดิมของ Client (`npm run test:client`): **ผ่านครบ 82 / 82 tests** (15 test files, 0 failures, 0 skips)
- บันทึกผลการตรวจรับทั้งหมดลงใน [`docs/lab-04/baseline.md`](baseline.md) และ [`docs/lab-04/implementation-log.md`](implementation-log.md)

### 2.2 L4-P01 — การร่างสัญญาข้อกำหนดและข้อตกลงสถาปัตยกรรม (Contracts & Decisions)
จัดทำเอกสารสัญญาฉบับสมบูรณ์ใน `docs/lab-04/` จำนวน 4 ฉบับ:
1. **[`specification.md`](specification.md) (v1.2.0):**
   - โครงสร้างสมบูรณ์ 11 หัวข้อตามโจทย์ข้อ §9
   - กำหนด Functional Requirements (FR-01 ถึง FR-18) และ Business Rules (BR-01 ถึง BR-20)
   - นิยาม Prisma Schema สำหรับโมเดล `ActionTaken` พร้อมฟิลด์ `version`, `clientRequestId`, `requestPayloadHash`, และ constraint `@@unique([createdById, ticketId, clientRequestId])`
   - กำหนดเกณฑ์ Acceptance Criteria ครบ 35 ข้อ (AC-01 ถึง AC-35)
2. **[`api-spec.md`](api-spec.md) (v1.2.0):**
   - คืนค่า Flat error envelope มาตรฐานตรงตาม baseline
   - กำหนด Error constants ชื่อเดียวต่อสถานะ: `INVALID_ASSIGNEE` (422), `RESOLUTION_GATE_FAILED` (422), `CONFLICT` (409), `BAD_REQUEST` (400)
   - คืนข้อความ Stale Conflict ตรง baseline: `"The ticket was modified by another user. Please refresh and try again."`
   - กำหนด Foreign Ticket 403 exact baseline: `{ "error": "Access denied: You do not own this ticket" }`
   - ระบุ Endpoints ของ Actions Taken ครบวงจร (`GET list`, `POST create`, `PATCH edit/assign`, `POST complete`, `POST cancel`; soft-cancel เท่านั้น ไม่มี DELETE endpoint)
   - ระบุ Dashboard APIs (`GET /api/dashboard/requester`, `staff`, `admin`) และ Filter deltas (`recent=7d`, `statusGroup=open/active`)
3. **[`ui-spec.md`](ui-spec.md) (v1.2.0):**
   - คืนค่า Zen Green Theme Tokens ตรง baseline: Primary `#006B3C`, Secondary `#0B7A46`, Canvas `#F5F7F6`, Warning `#D97706`, Success `#15803D`
   - ระบุ Action Status Badges: Pending `#FEF3C7`/`#92400E`, Completed `#DCFCE7`/`#15803D`, Cancelled `#F3F4F6`/`#4B5563`
   - กำหนด Modal UI (Log, Complete, Cancel, Edit Action) พร้อม Focus trap และจำกัดเวลาไม่เกิน `now + 5m`
   - ระบุ Responsive Layouts รองรับ 3 Viewports: Desktop (1280px), Tablet (768px), Mobile (375px)
4. **[`decisions.md`](decisions.md) (v1.2.0):**
   - บันทึกการตัดสินใจสถาปัตยกรรม D01 ถึง D10 (สถานะ `Proposed (TBD)`)
   - D02: Resolution Gate (`COMPLETED >= 1`, `PENDING === 0`), Follow-up เป็น informational collaboration note, ลำดับการล็อกแถว Parent Ticket ด้วย `FOR UPDATE`
   - D03: Append-only scope สำหรับ Comment/Note, สิทธิ์การแก้ Completed action เฉพาะผู้บันทึกเดิม/Admin
   - D05: 1:1 Parity ระหว่าง Card Metric $\leftrightarrow$ API Query $\leftrightarrow$ DB SQL $\leftrightarrow$ Drill-down URL
   - D09: Persistent Idempotency สโคป `(createdById, ticketId, clientRequestId)` พร้อม `requestPayloadHash` ตรวจ Replay ก่อน Terminal check
5. **[`proposed-agents-patch.md`](proposed-agents-patch.md):**
   - ร่าง Patch สำหรับ `AGENTS.md` และ `.antigravityrules` ตรวจสอบด้วย `git apply --check` ผ่าน 100% (exit code 0) โดยคงไว้ในรูปข้อเสนอและยังไม่ apply จริงใน F1

### 2.3 L4-P02 — การจัดทำแผนการทดสอบและการแมปย้อนกลับ (Test DD Plan & Traceability)
- จัดทำ [`tests.md`](tests.md) (v1.2.0) แมป Acceptance Criteria AC-01 ถึง AC-35 สู่ 38 Planned Test Cases:
  - **Unit Tests:** `UNIT-L4-01` (Clock-skew tolerance 5m), `UNIT-L4-02` (UUIDv4 validation)
  - **Style Tests:** `STYLE-L4-01` (Zen Green CSS tokens), `STYLE-L4-02` (Action status badge styles)
  - **Concurrency & Races:** `API-L4-23a` (Resolution commits first), `API-L4-23b` (Action commits first), `API-L4-23c` (Close/Cancel race)
  - **Idempotency Replay Suite:** ครบ 8 กรณี (`API-L4-24a` ถึง `API-L4-24h`): replay เดิมได้ 200, payload ต่างได้ 409, ต่าง user ได้ 201, ข้าม ticket ได้ 201, concurrent retry พร้อมกัน, replay บน resolved/closed ticket, replay หลัง action mutation
  - **8-Status Lifecycle Matrix:** `API-L4-25a` (17 permitted pairs) และ `API-L4-25b` (47 forbidden pairs)
  - **Dashboard & Parity:** `API-L4-28` (Fixed-clock 7-day boundary), `API-L4-33a/b` (Count-to-drilldown parity)
  - **UI & States:** `UI-L4-01` ถึง `UI-L4-12` (Form preservation, Banner alerts, Accessible 404)
  - **Performance Smoke:** `PERF-L4-01` (500 tickets, 1,000 actions, 5 warm-ups, 50 samples, p95 < 200ms)
- จัดทำ [`issue-drafts.md`](issue-drafts.md) ร่าง Issues 1–14 สำหรับรองรับการทำงานใน Phase F2–F5

---

### 2.4 การแก้ไขตามข้อตรวจพบ Peer Review (Resolution of Round 1 & Round 2 Findings)

ตามผลการรีวิวใน [`F1-REVIEW.md`](F1-REVIEW.md) และ [`F1-REVIEW-ROUND2.md`](F1-REVIEW-ROUND2.md) ได้แก้ไขข้อบกพร่องทางเอกสารครบถ้วนทั้ง 10 ประเด็น:
1. **R01 (Error Compatibility):** ตัด prefix `ERR_` ทั้งหมดทิ้ง ใช้ Flat error envelope และคง Stale message เดิม
2. **R02 (Retry Identity & Concurrency):** ยกเลิก In-memory Map; กำหนด `clientRequestId` บน DB สโคป `(createdById, ticketId, clientRequestId)`, บันทึก `requestPayloadHash`, ตรวจ replay ก่อน terminal check, กำหนด lock order ด้วย `SELECT ... FOR UPDATE`
3. **R03 (Permissions & Nested Resources):** Requester เห็นเฉพาะตั๋วตนเอง (ตั๋วอื่นได้ 403 exact baseline), แก้ไข completed action ได้เฉพาะผู้บันทึกเดิม/Admin
4. **R04 (Requester Visibility):** Requester เห็น Action Taken ครบทั้ง 3 สถานะ (`PENDING`, `COMPLETED`, `CANCELLED`) แบบ Read-only ไม่รั่วไหล Internal Notes
5. **R05 (Dashboard Parity):** แมป Card $\leftrightarrow$ API $\leftrightarrow$ SQL $\leftrightarrow$ Drill-down 1-to-1, เพิ่ม query params `recent=7d` และ `statusGroup=open/active` บน list APIs
6. **R06 (8-Status Workflow):** ตรวจสอบ 17 permitted และ 47 forbidden transitions
7. **R07 (Zen Green Palette):** คืนค่า Design tokens และ Badge tokens ตรงตามระบบเดิม
8. **R08 (Test Coverage):** ขยายการทดสอบครบทุก boundary, style, unit, และ negative status pairs
9. **R09 (Data Semantics):** Follow-up เป็น informational note ไม่ตั้ง double-gating, append-only scope ชัดเจน
10. **R10 (Proposed Patches):** Patch ได้รับการตรวจด้วย `git apply --check` ผ่าน exit code 0

---

### 2.5 การจัดการ Git Workflow, GitHub Issue และ Pull Request

1. **สร้าง Staging Branch:**
   - แตกสาขา `lab4-staging` จาก `main` (`baad45e`) และ push สู่ GitHub remote `origin`:
     ```powershell
     git branch lab4-staging baad45e09272d665bc0cf765236c456edcf0eff7
     git push origin lab4-staging
     ```
2. **สร้าง Feature/Docs Branch:**
   - แตกสาขา `docs/lab4-contract` จาก `lab4-staging`
   - Stage เฉพาะเอกสารสัญญา 14 ไฟล์ใน `docs/lab-04/` (ไม่แตะต้องไฟล์ที่ค้างอยู่นอกโฟลเดอร์)
   - Commit: `cb6996b` (`docs(lab4): establish contracts, decision gates, and test traceability (P00-P02)`)
   - Push สู่ remote: `git push origin docs/lab4-contract`
3. **สร้าง GitHub Issue:**
   - สร้าง [GitHub Issue #46](https://github.com/JinggXd/TokTickIT/issues/46)
   - หัวข้อ: `Lab 4 P00–P02: establish engineering contracts, decision gates, and test traceability`
   - ป้ายกำกับ: `documentation`
4. **เปิด Pull Request:**
   - เปิด [GitHub Pull Request #47](https://github.com/JinggXd/TokTickIT/pull/47)
   - Base: `lab4-staging` $\leftarrow$ Head: `docs/lab4-contract`
   - อัปเดตประวัติการสร้าง Issue และ PR ลงใน Section 9 ของ [`implementation-log.md`](implementation-log.md) (Commit `623b68b`)

---

## 3. ผลลัพธ์และสถานะปัจจุบัน (Current State & Readiness)

1. **ความพร้อมด้านสัญญา (Contracts Ready):** เอกสารสัญญาและข้อตกลงสถาปัตยกรรมมีความสอดคล้องกัน 100% ไม่มีข้อขัดแย้งเชิงธุรกิจ
2. **ความปลอดภัยของระบบ (Safety Invariants Maintained):**
   - ไม่มีการแก้ไข Product code ใน `server/` หรือ `client/`
   - ไม่มีการรัน Database migration หรือแตะต้องข้อมูลจริง
   - D01–D10 คงสถานะ `Proposed (TBD)` รอการตรวจรับร่วมกับทีม
3. **รอการตรวจรับ (Awaiting Peer Review):**
   - เชื่อมโยง Issue #46 ในหน้า Development panel ของ PR #47 บน GitHub
   - Peer Reviewer ตรวจรับ (Approve) และเป็นผู้กด Merge PR #47 เข้าสู่ `lab4-staging` เพื่อเปิดทางสู่ Phase F2 ต่อไป
