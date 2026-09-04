# Lab 2 Engineering Workflow Pipeline - Audited Draft

**Course:** CPE 334 Introduction to Software Engineering in the Age of AI Agents<br>
**Project:** TokTickIT - Requester Ticketing MVP<br>
**Audited against:** `Lab_02_labsheet.pdf` Sections 10, 10.1, 13, and 14<br>
**Audit date:** 2026-09-04<br>
**Workflow/contract update version:** `1.1.0`<br>
**Current branch:** `feature/6-lab2-requester-context`

---

## 1. Audit Conclusion

The intended Lab 2 workflow is correct:

```text
main
  -> create/update lab2-staging
  -> create one feature branch for one GitHub Issue
  -> write the planned test and confirm Red
  -> implement the smallest change and confirm Green
  -> run all currently available verification
  -> push feature branch
  -> peer-reviewed PR into lab2-staging
  -> reviewer merges after approval
  -> integration test on lab2-staging
  -> one release PR from lab2-staging into main
```

The repository history proves that the main branch flow has started correctly, but the current
working tree is not yet ready to move to `PR Review` because it contains uncommitted corrections
and changes from more than one issue scope.

## 2. Required Kanban Pipeline

Use exactly the statuses stated in the labsheet:

| Status | Entry condition | Exit condition |
|---|---|---|
| Backlog | Issue exists but is not yet specified | Scope, dependencies, ACs, and planned tests are identified |
| Specified | Contract and planned test coverage are clear | Feature branch is created from current `lab2-staging` |
| Started | Test-first implementation is active | Code and currently required tests are ready for review |
| PR Review | PR targets `lab2-staging`, is linked to its Issue, and awaits peer review | Reviewer approves or requests changes |
| Fixing | Review or audit found required corrections | Corrections are pushed and review is requested again |
| Done | Reviewer approved and merged the PR; required evidence is retained | No later movement is required unless a regression reopens the Issue |

Do not move an Issue to `Done` merely because the author finished coding. The PR must be reviewed,
approved, and merged into `lab2-staging` first.

## 3. Required Branch and PR Rules

1. Create each feature branch from the latest `lab2-staging`.
2. Keep one GitHub Issue and one coherent feature scope per branch.
3. Do not develop directly on `main` or `lab2-staging`.
4. Open feature PRs into `lab2-staging`, never directly into `main`.
5. Link the Issue from the PR's **Development** panel. Because `lab2-staging` is not the default
   branch, `Resolves #N` alone is not sufficient evidence of the required link.
6. Confirm the PR sidebar states that merging may close the linked Issue before moving the card to
   `PR Review`.
7. The author responds to review comments; the peer reviewer performs the merge after approval.
8. After all feature PRs are integrated and the full suite passes on `lab2-staging`, open exactly
   one release PR from `lab2-staging` to `main`.

## 4. TDD Gate for Every Issue

Each implementation issue must pass these gates in order:

1. Read the four current contract files: `specification.md`, `api-spec.md`, `ui-spec.md`, and
   `tests.md`.
2. Record ambiguities against a named section before changing behavior.
3. Add the planned test for the current issue.
4. Run it and retain evidence that it failed for the expected reason (Red).
5. Implement only the current issue's smallest required behavior.
6. Run the focused test and relevant regression suite until Green.
7. Confirm no required test is skipped, disabled, commented out, or unrelated to its AC.
8. Update the traceability and evidence documents with real paths and real results.
9. Run the full verification available at that phase before requesting review.

## 5. Recommended Issue Decomposition and Dependency Order

| Order | Suggested issue scope | Depends on |
|---:|---|---|
| 0 | Engineering contract and planned tests | Lab 1 complete |
| 1 | Data layer, migration, seed, and unit helpers | Phase 0 approval |
| 2 | Development Requester context, selector, guard, and shell | Phase 1 |
| 3 | Create Ticket API and UI | Phase 2 |
| 4 | My Tickets API and responsive list UI | Phase 3 |
| 5 | Ticket Detail and attachment lifecycle | Phases 3-4 |
| 6 | Ownership hardening pass | Phase 5 |
| 7 | Responsive checks, visual inspection, and screenshots | Phases 2-5 complete |
| 8 | End-to-end happy and failure paths | Phase 7 |
| 9 | Reviewer/AI-use docs, final evidence, integration, and release PR | Phases 0-8 |

This keeps the good phase ordering already documented in
`.agents/skills/lab2-toktickit-build/SKILL.md` and adds explicit review/evidence gates required by
the labsheet.

## 6. Repository Status at This Audit

| Area | Evidence | Correct status |
|---|---|---|
| Contract setup | PR #14 merge appears in Git history | Integrated into `lab2-staging` |
| Phase 1 data layer | PR #16 merge appears on `origin/lab2-staging` | Integrated remotely |
| Local `lab2-staging` | Local branch is behind `origin/lab2-staging` | Update before creating the next branch |
| Phase 2 requester context | Commit `71425f1` exists locally and on its remote feature branch | Implemented but under correction |
| Current audit corrections | Modified working-tree files are not committed | `Fixing`, not `PR Review` or `Done` |
| Phases 3-6 | Required API/UI/test files are not present | Backlog/Specified |
| Playwright Phases 7-8 | No root package/config, Playwright binary, or `e2e/` directory exists | Not yet implemented |
| Phase 9 docs | Required final `docs/lab-02/reviewer.md` and `docs/lab-02/ai-use.md` are absent | Must be completed with real human evidence |

## 7. Current Pipeline Deviation to Resolve

The current working tree mixes these scopes:

- Phase 2 corrections: requester middleware response, requester tests, API base URL use, selector
  tests, and client TypeScript build configuration.
- Phase 1 correction: ticket-number collision retry and its unit tests.
- Cross-cutting contract/README clarification: Ticket Date traceability and setup instructions.

This is broader than one Issue/one branch. Before opening the Phase 2 PR, split the Phase 1
ticket-number hardening into its own GitHub Issue and feature branch based on the latest
`lab2-staging`, or obtain reviewer agreement that it belongs in the current Issue and document that
decision. No history rewrite, branch move, or merge was performed during this audit.

## 8. Verification Gate Before Phase 2 PR

Current working-tree verification on 2026-09-04:

| Command/check | Result |
|---|---|
| `npm --prefix server run test` | PASS - 8 files, 15 tests |
| `npm --prefix client run test` | PASS - 3 files, 9 tests |
| `npm --prefix server run build` | PASS |
| `npm --prefix client run build` | PASS |
| skipped/disabled-test scan | None found |
| `npx playwright test` | Not available yet; Playwright is a Phase 7-8 deliverable |
| Version 1.1.0 regression tests | Planned but not yet implemented; must not be reported as passing |

These results prove the currently implemented scope only. They do not prove completion of Lab 2,
the unimplemented Phase 3-8 acceptance criteria, visual screenshots, peer review, or final release.

## 9. Final Release and Submission Gate

Before the release PR from `lab2-staging` to `main`:

- all Issues are in `Done` with peer-reviewed PR evidence;
- all Acceptance Criteria map to real passing tests;
- server, client, and Playwright commands pass on the final integrated branch with zero skips;
- nine required desktop/tablet/mobile screenshots are readable;
- `reviewer.md` contains real reviewer identity, PR links, comments, responses, and approvals;
- `ai-use.md` names the LLM/tool, contains 6-10 real selected prompts, and includes the student's
  own brief reflection;
- README, `.gitignore`, and repository structure evidence are current; and
- the submission PDF uses `Answer Part 1` through `Answer Part 9` in that exact order.
