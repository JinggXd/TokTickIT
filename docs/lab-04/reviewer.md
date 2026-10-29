# Peer Review Record — Lab 4

Updated 2026-10-02. ข้อเท็จจริงจาก GitHub REST/GraphQL แบบ read-only; [snapshot](../../artifacts/lab-04/requirements-audit-20261002/github-state.json). ผู้พัฒนา/PR author: `JinggXd`; reviewer/merge actor ที่ยืนยันได้: `yuminnini`. Agent code review ไม่ใช่ peer approval event

## Verified review and merge events

| Phase | PR | Approval evidence | Merge evidence | Limits |
|---|---|---|---|---|
| F1 | [#47](https://github.com/JinggXd/TokTickIT/pull/47) | [yuminnini APPROVED](https://github.com/JinggXd/TokTickIT/pull/47#pullrequestreview-5324868804), 2026-09-26T06:11:36Z, head `9af7783` | yuminnini merged 2026-09-26T06:11:44Z into lab4-staging | Supersedes historical OPEN snapshot in closeout; later contract clarifications/decision acceptance need separate record |
| F2 | [#49](https://github.com/JinggXd/TokTickIT/pull/49) | [yuminnini APPROVED](https://github.com/JinggXd/TokTickIT/pull/49#pullrequestreview-5389621835), 2026-10-02T08:16:23Z, head `3e735a0` | yuminnini merged 2026-10-02T09:01:12Z into lab4-staging | Six follow-ups were subsequently included in F3 |
| F3 | [#51](https://github.com/JinggXd/TokTickIT/pull/51) | [yuminnini APPROVED](https://github.com/JinggXd/TokTickIT/pull/51#pullrequestreview-5390413896), 2026-10-02T09:46:58Z, commit `89d1313` | yuminnini merged final head `e775d1b` at 2026-10-02T13:38:33Z; staging merge `1ee7786` | Approval event predates final keyboard-fix head; do not describe it as a new approval of that exact revision |
| F4 | [#53](https://github.com/JinggXd/TokTickIT/pull/53) / [Issue #52](https://github.com/JinggXd/TokTickIT/issues/52) | None at snapshot time | OPEN, DRAFT, not merged | closingIssuesReferences=[], Development link not yet established; peer review pending |

Times above UTC; Asia/Bangkok is UTC+7. Links expose review identity/events directly and can be used in rendered final PDF

## Findings and responses with existing evidence

| Review item | Response / evidence | Status |
|---|---|---|
| F2 clear notes/types/assignee retry/success feedback + date/UUID findings | [F3-CARRYOVER.md](F3-CARRYOVER.md); F3 code/tests combine all six fixes | Fixed in merged F3 |
| F3 dashboard home keyboard accessibility | Native link, role-specific href, visible outline; [correction proof](../../artifacts/lab-04/f3-pr51-review-fix-20261002/verification.md) | Fixed; final head merged by reviewer |
| F4 recovery missing-file false positive | Attachment references/sizes verified before/after restore; red/green/full proof [here](../../artifacts/lab-04/f4-pr53-review-fix-20261002/verification.md) | Fixed on F4 feature branch; peer review pending |
| Current requirement audit | [AUD-01–07](requirements-audit-F2-F3-F4.md): safe errors, accessibility evidence, workflow/release/docs/layout | Open items explicitly recorded |

ตาราง response เป็นสรุป implementation evidence ไม่ได้อ้างว่าเป็นข้อความที่ peer reviewer เขียนทั้งหมด. ต้องแนบ actual peer comment links, developer response links และ final approval ของ F4 จาก GitHub เมื่อเกิดเหตุการณ์จริง สำหรับ Answer Part 1. ไม่สร้าง review/comment/approval แทนมนุษย์

## Release gates

F4 explicit Development-panel link → review latest head → reviewer merge into lab4-staging. จากนั้น F5 release PR → reviewer merge into main → final-main checks → Kanban Done → PDF เดียว Answer Part 1–9. ณ snapshot main ยังเป็น Lab 3 baseline `baad45e0`; ไม่อ้าง final Lab 4 delivery
