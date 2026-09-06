# Lab 2 — AI Use and Reflection

**LLM / AI Agent Used:** Google Antigravity (Advanced Agentic Coding)  
**IDE / Platform:** Antigravity IDE  
**Project:** TokTickIT Lab 2 — Requester Ticketing MVP  
**Contract Reference:** `docs/lab-02/specification.md`, `api-spec.md`, `ui-spec.md`, `tests.md`

---

## 1. Selected Key Prompts (8 Prompts Across Phases 1–8)

| # | Phase & Context | Prompt (Summarised) | What I Did with the Result |
|---|---|---|---|
| 1 | **Phase 1 (Data Layer)** | "สร้าง database schema, migration และ seed data ตาม specification.md โดยเขียน unit test ให้ล้มก่อน (TDD Red) ตามกฎของ tests.md" | ตรวจสอบว่า Unit tests 4 ไฟล์ล้มตามคาด แล้วให้สร้าง schema ใน Prisma, รัน migration, seed ข้อมูล และตรวจผล Green |
| 2 | **Phase 2 (Requester Context)** | "ทำเฟส 2 ต่อเลย requester context และ selector screen โดยดึงข้อมูลเฉพาะ active requesters และทำ RouteGuard ป้องกันการเข้าถึงโดยไม่มี requester" | ตรวจสอบ endpoint `GET /api/requesters/active`, middleware `requireRequester`, และหน้าจอเลือก Requester พร้อม RouteGuard |
| 3 | **Phase 3 (Create Ticket)** | "ทำเฟส 3 ต่อเลย create ticket screen พร้อม read-only fields (ticket number, date, requester) และ attachment client staging ตาม ui-spec.md" | ตรวจสอบฟอร์มสร้างตั๋ว การตรวจสอบความถูกต้องตาม BR-09, การปิดปุ่มซ้ำซ้อนตาม BR-10, และการคงค่าข้อมูลเมื่อเกิดข้อผิดพลาดตาม BR-11 |
| 4 | **Phase 4 (My Tickets)** | "ทำเฟส 4 ต่อ my tickets search filter sort pagination ให้รองรับการค้นหา ticketNo/summary, กรอง category, priority, status และคำนวณหน้าแม่นยำ" | ตรวจสอบ query builder ใน server, ตรวจสอบการ clamp pagination เมื่อรับเลขหน้าเกินขอบเขต, และหน้าจอ My Tickets |
| 5 | **Phase 5 (Ticket Detail & Attachments)** | "ทำเฟส 5 ต่อ ticket detail และ attachment lifecycle upload download remove พร้อม modal ยืนยันเหตุผลการลบ และการบล็อกดาวน์โหลดไฟล์ที่ถูกลบ" | ตรวจสอบระบบตรวจสอบ magic bytes, การตั้งชื่อไฟล์ปลอดภัย (safe filename policy), และ dialog ใส่เหตุผลการ soft-remove |
| 6 | **Phase 6 (Ownership Hardening)** | "ทำเฟส 6 ต่อ ownership hardening pass ตรวจสอบ 403 เมื่อเข้าถึงตั๋วหรือไฟล์ของผู้อื่น และทดสอบ Error Scenario Matrix ครบทุกกรณี" | ตรวจสอบความปลอดภัยฝั่งเซิร์ฟเวอร์ (Server-side ownership validation) และรัน regression suite 37 ข้อใน `ownership-hardening.api.test.ts` |
| 7 | **Phase 7 (Responsive Polish)** | "My Tickets ยังล้นแนวนอนที่ 375px และ w-md-auto ไม่มี CSS รองรับ แก้ให้ตรง ui-spec.md และแคปรูป 9 รูปให้ครบทั้ง 3 breakpoints" | นำคำแนะนำของ Reviewer มาให้ AI แก้ไข pagination flex-wrap และเพิ่ม CSS class `.w-md-auto` แล้วรัน Playwright RESP-01 ถึง RESP-03 |
| 8 | **Phase 8 (End-to-End Integration)** | "แก้ 4 จุดสำคัญ: cleanup scope กว้างเกินไป, E2E-02 error ไม่ตรง API contract, E2E-01 ผ่านก่อนโหลด requester เสร็จ, และ E2E-03 ยังไม่ได้พิสูจน์ UI เมื่อดาวน์โหลดเจอ 410" | ปรับปรุงเทสต์ E2E ให้จำกัด cleanup เฉพาะ `createdTicketIds`, ปรับ error shape เป็น `{ error: string }`, เพิ่มการรอ loading state, และทดสอบ UI dynamic state transition |

---

## 2. Reflection on AI Pair Programming

### 2.1 What Made Prompts Better
การระบุข้อกำหนดที่เจาะจงลงไปถึง **ID ของกฎธุรกิจ (เช่น BR-01, BR-04, BR-11)**, **Acceptance Criteria (เช่น AC-13, AC-17, AC-19)**, ชื่อไฟล์ในสัญญา (`specification.md`, `api-spec.md`, `ui-spec.md`, `tests.md`), และขนาดหน้าจอที่เกิดปัญหา (เช่น Viewport 375px) ช่วยให้ AI ไม่ต้องคาดเดาเจตนา และส่งผลให้โค้ดที่สร้างขึ้นตรงตามสเปกตั้งแต่รอบแรกโดยไม่สร้างโค้ดส่วนเกินที่อยู่นอกเหนือขอบเขต (No scope creep)

### 2.2 Where the Human Developer Corrected or Rejected AI Output
บทบาทของผู้พัฒนาและ Peer Reviewer มีความสำคัญอย่างยิ่งในการควบคุมคุณภาพของโค้ดที่ AI สร้างขึ้น ตัวอย่างจุดสำคัญที่มนุษย์ต้องตรวจแก้และปฏิเสธผลลัพธ์ของ AI ได้แก่:
1. **การตรวจสอบขอบเขตข้อมูลอินพุต (Input Boundary & Defensive Checks):** AI มักมองข้ามกรณี edge case ขนาดเล็ก เช่น ไฟล์ที่มีขนาดน้อยกว่า 4 bytes ซึ่งทำให้การตัด buffer เพื่อตรวจ magic bytes เกิด runtime error หรือการส่ง query param `page` ที่เป็นทศนิยม ซึ่ง Reviewer ตรวจพบและสั่งให้เพิ่มการตรวจสอบอย่างรัดกุม
2. **การรักษาความบริสุทธิ์ของ API Contract:** ใน Phase 8 ตัว AI เผลอปรับ client ให้รองรับ `{ message: ... }` ตามที่ mock ขึ้นมาใน test เพื่อให้เทสต์ผ่านโดยง่าย ซึ่งขัดต่อสัญญาใน `api-spec.md` ที่กำหนดว่าต้องใช้ `{ error: ... }` มนุษย์จึงต้องสั่งแก้ให้ยึดตามสเปกและแก้ไข mock ให้ถูกต้อง
3. **การป้องกัน Race Condition ในการทดสอบ:** AI เขียนการตรวจสอบ UI โดยรอเพียง container `.card-zen` ซึ่งปรากฏอยู่แล้วระหว่างโหลด ทำให้การ assert อาจผ่านก่อนที่ข้อมูลใหม่จะมาถึงจริง มนุษย์จึงต้องสั่งให้รอ network response และรอให้ loading indicator หายไปก่อน
4. **ความปลอดภัยของฐานข้อมูลทดสอบ (Test DB Hygiene):** AI เคยเขียน cleanup โดยค้นหาด้วยข้อความ summary prefix แบบกว้าง ซึ่งอาจส่งผลกระทบต่อข้อมูล seed หรือข้อมูลของรอบอื่น มนุษย์จึงสั่งจำกัดให้ลบเฉพาะ IDs ที่ถูกสร้างขึ้นในรอบการทดสอบนั้นๆ (`createdTicketIds`)
