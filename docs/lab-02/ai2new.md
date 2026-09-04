# Phase 2 AI Use and Reflection - Audited Draft

**Sprint:** TokTickIT Lab 2<br>
**Original Phase 2 work:** 2026-09-01<br>
**Audit/update:** 2026-09-04<br>
**Intended coding agent for subsequent phases:** Gemini 3.8 (student-selected)<br>
**AI used for the current contract audit:** OpenAI Codex

---

## 1. Selected Key Prompts and Outcomes

The entries below preserve the useful interactions recorded in `ai2.md` and add the real prompt
used for the current labsheet/pipeline audit. They should be reviewed by the student before being
consolidated into the final required `docs/lab-02/ai-use.md`.

| # | Prompt or request | Engineering outcome |
|---:|---|---|
| 1 | Continue Phase 2 after reviewing the contract and surface ambiguities first | Separated middleware tests MW-03/04/05 from the Phase 3 endpoint tests API-03/04/05 |
| 2 | Audit all four contract documents and their traceability | Recorded the AC-05, responsive-phase, E2E timing, and missing API-test gaps in `ambiguity-log.md` |
| 3 | Implement the TDD Red phase for Requester context | Added middleware and active-Requester endpoint tests and retained the expected initial failures |
| 4 | Implement the backend Green phase | Added exact header validation and the active Requester API |
| 5 | Implement the selector, route guard, shell, and UI tests | Added the Requester context UI foundation and its loading/empty/failure tests |
| 6 | “pipelineตรงไหม...ถ้าไม่ตรงช่วยร่างให้ดีที่สุด...ตั้งชื่อ new...” | Compared the repository with the labsheet workflow, reran tests/builds, identified mixed branch scope, and created audited `new.md` drafts without replacing the original evidence files |

## 2. What the Audit Changed in the Engineering Approach

The audit showed that passing tests alone is not sufficient evidence of a correct Lab 2 workflow.
The Phase 2 implementation is healthy, but its report previously overstated completion and the
working tree now mixes a Phase 1 fix with Phase 2 corrections. The updated pipeline therefore adds
explicit gates for Issue scope, Development-panel linking, peer review, reviewer merge, final
Playwright evidence, and the one release PR from `lab2-staging` to `main`.

## 3. My Reflection - Student Review Required

Suggested draft for the student to revise in their own voice:

> AI helped me compare the implementation, tests, documentation, and Git history against the Lab 2
> requirements. The most useful result was finding that a technically passing working tree could
> still violate the one-Issue/one-branch workflow or overstate completion before E2E and peer
> review. I learned to verify AI claims using test output, Git evidence, and the traceability
> matrix instead of accepting “done” at face value.

This reflection must be reviewed and personalized by the student. The final submission should not
claim human review, approval, screenshots, or prompts that did not actually occur.

## 4. Phase 9 Consolidation Note

The labsheet requires one final `docs/lab-02/ai-use.md` containing the LLM/tool name, 6-10 selected
real prompts, and a brief student reflection. `ai1.md`, `ai2.md`, and this audited draft are source
logs; they do not replace that exact final filename.

When Gemini 3.8 performs later phases, record Gemini 3.8 in the corresponding `aiN.md` and preserve
the actual prompts used. Do not retroactively relabel work performed by another tool or model.
