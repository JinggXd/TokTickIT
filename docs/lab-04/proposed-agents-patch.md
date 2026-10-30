# Proposed Minimal Scope Patch for AGENTS.md and .antigravityrules (D08)

**Date:** 2026-09-25  
**Document Version:** 1.1.0 (Verified with `git apply --check`)  
**Status:** PROPOSED (Pending Explicit User Approval before applying)  
**Purpose:** Extend `AGENTS.md` and `.antigravityrules` to support Lab 4 contract authority, staging branch `lab4-staging`, and work package flow without overwriting or invalidating Lab 2/3 rules and regression baselines.

---

## 1. Verified Patch for `AGENTS.md`

### Verification Status:
Tested against current `AGENTS.md` commit `baad45e` with `git apply --check`: **PASS (Exit Code 0)**.

### Patch Content:
```diff
diff --git a/AGENTS.md b/AGENTS.md
index a616886..0d54a2b 100644
--- a/AGENTS.md
+++ b/AGENTS.md
@@ -1,6 +1,20 @@
-# TokTickIT — Agent Rules (Lab 2 and Lab 3)
+# TokTickIT — Agent Rules (Lab 2, Lab 3, and Lab 4)
 
 ## Identity & Contract
 
+Select the contract by the requested lab. For Lab 4 use all four files in
+`docs/lab-04/`: `specification.md`, `api-spec.md`, `ui-spec.md`, and `tests.md`.
+Use `docs/lab-04/GEMINI-PIPELINE.md` and `docs/lab-04/PHASES.md` for Lab 4 phase order.
+Report Lab 4 progress using five major phases: F1 (L4-P00–L4-P02), F2 (L4-P03–L4-P06),
+F3 (L4-P07–L4-P10), F4 (L4-P11–L4-P12), F5 (L4-P13–L4-P14). L4-P00–L4-P14 remain work-package IDs
+with their original dependencies and acceptance gates. Split Issues/branches/PRs by
+reviewable work package; peer review occurs throughout, not only in F5.
+Lab 4 extends the Lab 3 baseline; the Lab 3 exclusion of Actions Taken and Dashboards
+applies only to Lab 3 work. Lab 4 exclusions in its own specification still apply.
+
+For Lab 4, feature PRs target `lab4-staging`; for Lab 3 they target `lab3-staging`;
+for Lab 2 they target `lab2-staging`. Only the reviewed release PR goes from the selected
+staging branch to `main`. All staging branches require the explicit Development-panel Issue link.
+
 Select the contract by the requested lab. For Lab 3 use all four files in
 `docs/lab-03/`: `specification.md`, `api-spec.md`, `ui-spec.md`, and `tests.md`.
```

---

## 2. Verified Patch for `.antigravityrules`

### Verification Status:
Tested against current `.antigravityrules` commit `baad45e` with `git apply --check`: **PASS (Exit Code 0)**.

### Design Rationale:
Instead of relabeling the entire file (which would create confusing contradictions with the Lab 3 instructions embedded below), this patch prepends an explicit **Lab 4 Execution Authority** dispatch note at the top of `.antigravityrules`. It directs the agent to `docs/lab-04/GEMINI-PIPELINE.md`, `docs/lab-04/PHASES.md`, and the four Lab 4 contract files, while preserving all historical Lab 3 rules intact as the regression baseline.

### Patch Content:
```diff
diff --git a/.antigravityrules b/.antigravityrules
index 7253579..ca3910c 100644
--- a/.antigravityrules
+++ b/.antigravityrules
@@ -1,5 +1,11 @@
-# TokTickIT Lab 3 — Detailed coding-agent rules and execution pipeline
+# TokTickIT — Detailed coding-agent rules and execution pipeline (Labs 2, 3, and 4)
 
+## Lab 4 Execution Authority
+สำหรับ Lab 4 ให้ปฏิบัติตามคำสั่งและข้อกำหนดใน docs/lab-04/GEMINI-PIPELINE.md, docs/lab-04/PHASES.md
+และเอกสาร contract ทั้งสี่ฉบับใน docs/lab-04/ (specification.md, api-spec.md, ui-spec.md, tests.md)
+โดยตรง กฎและประวัติการพัฒนาของ Lab 3 ด้านล่างนี้ให้คงไว้เพื่อเป็น regression baseline และหลักฐานการพัฒนา
+
+# TokTickIT Lab 3 — Historical rules and execution pipeline
 ผู้รับคำสั่ง: coding agent ที่ผู้ใช้เรียกว่า “Gemini 3.8 Flash”
 วันที่จัดทำ: 2026-09-10; แก้ไข contract consistency: 2026-09-13 (v1.1.0); รวมแผน 5 เฟสใหญ่: 2026-09-16
 แหล่งหลัก: Lab_3_sheet.pdf, 18 หน้า, CPE 334, Sprint 3, คะแนนรวม 60
```

---

## 3. Approval Requirement
Per `AGENTS.md` and `GEMINI-PIPELINE.md`:
> *"เตรียม minimal patch สำหรับปรับขอบเขต AGENTS.md/.antigravityrules ให้รองรับ Lab 4 โดยยังไม่เขียนทับกฎเดิมจนกว่าขอบเขตการแก้ที่จำเป็นจะได้รับอนุมัติ"*

This patch will **not** be applied to `AGENTS.md` or `.antigravityrules` until the user explicitly approves this proposal.
