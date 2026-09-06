# What I Have Done — Lab 2 Setup & Phase 0 (Contract & Docs)

**Branch:** `docs/lab2-specs`  
**Target:** `lab2-staging`  
**Date:** 2026-08-30  

---

## 1. วัตถุประสงค์ (Objective)
เตรียมสภาพแวดล้อม กฎเกณฑ์การพัฒนา (Agent Rules) สัญญาทางวิศวกรรม (Engineering Contract) และคู่มือกระบวนการพัฒนา (Skill) ของ Lab 2 ให้ครบถ้วนถูกต้องตามแนวคิด **Spec-Driven Development (Spec DD)** และ **Git Workflow Guide** ก่อนเริ่มเขียนโค้ดฟีเจอร์ใน Phase 1

---

## 2. รายการสิ่งที่ดำเนินการไปแล้ว (Summary of Actions & Commands)

### 2.1 ติดตั้ง Skill และจัดเตรียมโฟลเดอร์สำหรับเอกสารสัญญา
- **สร้างไฟล์:** `.agents/skills/lab2-toktickit-build/SKILL.md`
  - ติดตั้งคู่มือกระบวนการสร้างแบบ TDD Phase 0–9 ลงในระบบ Antigravity Workspace Skill
- **สร้างไดเรกทอรีและจัดระเบียบเอกสาร:**
  - สร้างไดเรกทอรี `docs/lab-02/`
  - ย้ายเอกสารสัญญาทั้ง 4 ฉบับเข้าสู่ `docs/lab-02/` อย่างเป็นทางการ:
    1. `docs/lab-02/specification.md` — ข้อกำหนด ขอบเขต Business Rules และ Acceptance Criteria
    2. `docs/lab-02/api-spec.md` — รายละเอียด REST API Endpoints, Status Codes และ Error Shapes
    3. `docs/lab-02/ui-spec.md` — ข้อกำหนดหน้าจอ Zen Green Theme Tokens และ Component States
    4. `docs/lab-02/tests.md` — แผนการทดสอบแบบ TDD (Unit, API, UI, Style, Responsive, E2E)
- **ลบไฟล์สำเนาซ้ำที่ Root:**
  - คำสั่ง: `Remove-Item specification.md, api-spec.md, ui-spec.md, tests.md, SKILL.md`
  - *เหตุผล:* ป้องกันความซ้ำซ้อนและจัดโครงสร้าง Repository ให้สะอาดเป็นระเบียบ

---

### 2.2 จัดการ Git Branches ตาม Workflow Guide
- **สร้างและ Push Branch `lab2-staging`:**
  - คำสั่ง:
    ```bash
    git checkout -b lab2-staging main
    git push -u origin lab2-staging
    ```
  - *เหตุผล:* สร้าง Integration Base Branch สำหรับ Lab 2 โดยไม่กระทบ `main` ตามกฎของแล็บ
- **สร้าง Branch สำหรับงาน Docs (`docs/lab2-specs`):**
  - คำสั่ง:
    ```bash
    git checkout -b docs/lab2-specs
    ```
  - *เหตุผล:* ทำงานแก้ไขเอกสารบน Branch ย่อยเฉพาะเรื่อง Docs ตามกฎข้อกำหนด Part 7 (`docs/<lab>-<topic>`)

---

### 2.3 บันทึกประวัติและ Push ขึ้น GitHub (Git Add, Commit, Push)
- **เพิ่มไฟล์เข้า Staging:**
  - คำสั่ง: `git add docs/lab-02/ AGENTS.md .agents/`
- **บันทึก Commit:**
  - คำสั่ง:
    ```bash
    git commit -m "docs: add Lab 2 specification, api-spec, ui-spec, tests, agent rules, and build skill"
    ```
- **Push ขึ้น Remote Repository:**
  - คำสั่ง:
    ```bash
    git push -u origin docs/lab2-specs
    ```

---

## 3. ผลลัพธ์และสถานะปัจจุบัน (Current State)
1. Branch `docs/lab2-specs` ถูก Push ขึ้นไปยัง GitHub เรียบร้อยแล้ว
2. มีหลักฐาน Git Commit ชัดเจนว่าเอกสาร Specification และ Test Plan ทั้งหมดถูกนำเข้าก่อนการเริ่มเขียนโค้ด (เป็นหลักฐานสำหรับประเมิน Part 2: Spec DD)
3. พร้อมสำหรับการเปิด Pull Request เข้าสู่ `lab2-staging` บน GitHub
