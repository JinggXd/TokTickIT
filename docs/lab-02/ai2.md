# Phase 2 — AI Usage & Prompt Engineering Log (ai2.md)

**Sprint:** TokTickIT Lab 2 (Requester Ticketing MVP)  
**Phase:** Phase 2 — Requester Context (API + Selector Screen)  
**Date:** 2026-09-01  

---

## 1. Selected Key Prompts & Engineering Interaction

| # | Prompt / Context | Target Area | AI Engineering Action & Rationale |
|---|---|---|---|
| 1 | *"ไปต่อเลย"* + Contract Ambiguity Surfacing | Spec DD / Contract Architecture | Analyzed the conflict between `SKILL.md` (testing middleware in Phase 2) and `tests.md` (pinning `API-03/04/05` to Phase 3 `create-ticket.api.test.ts`). Formulated the Two-Stage Resolution. |
| 2 | Contract Ambiguity & Findings Review | Full Contract Audit (Phases 2–9) | Verified 5 critical findings: Ambiguity 1 (`MW-03..05`), Finding A (`AC-05` scope), Finding B (`RESP-01` phase placement), Finding C (`E2E` notation), and Finding D (5 missing test IDs in Error Scenario Matrix: `API-21..25`). Formally logged in `docs/lab-02/ambiguity-log.md`. |
| 3 | TDD Red Phase Implementation | `server/tests/lab-02/` | Created `requester-middleware.api.test.ts` with throwaway `/test` route and `requesters.api.test.ts`. Confirmed tests failed with `200 != 401` and `404 != 200` (Red Phase per Hard Rule #3). |
| 4 | Backend Green Phase Implementation | Express Middleware & API | Created `requireRequester.ts` with header format checks and Prisma DB query for active requesters. Implemented `GET /api/requesters/active` returning sorted active requesters. Verified all server tests turned Green. |
| 5 | Frontend Green Phase & UI Component Tests | React Context, RouteGuard, RequesterSelection, AppShell | Created `zen-green.css` tokens, `RequesterContext.tsx`, `RouteGuard.tsx` (`UI-10`), `RequesterSelection.tsx` (handling all states from `ui-spec.md` Section 10.1), and `AppShell.tsx`. Verified all client tests passed. |

---

## 2. Engineering Reflection on Phase 2

1. **Strict Spec-Driven & Contract-First Discipline:**  
   Identifying the contradiction in `API-03/04/05` before writing code prevented polluting Phase 2 with Phase 3 endpoints while keeping tests clean, isolated, and traceable.
2. **Defensive Server-Side Security:**  
   The `requireRequester` middleware enforces `400` vs `401` differentiation and active user checks entirely on the backend, satisfying the Hard Rule that frontend UI state alone is never treated as security.
3. **Zen Green UI Component Reusability:**  
   Establishing tokens in `zen-green.css` and the `AppShell` layout ensures subsequent screens (Create Ticket in Phase 3, My Tickets in Phase 4) maintain visual consistency with minimal duplication.
