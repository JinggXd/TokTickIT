# Phase 2 — Requester Context (API + Selector Screen)

**Branch:** `feature/6-lab2-requester-context`  
**Date:** 2026-09-01  
**Sprint:** TokTickIT Lab 2 (Requester Ticketing MVP)  
**Status:** ✅ Completed (All Backend & Frontend Tests Passing)  

---

## 1. Overview & Objectives

In Phase 2, we established the **Development Requester Context** foundation that simulates multi-user login and ownership across the entire application (FR-01, FR-02, FR-03, AC-02, AC-18, BR-03, BR-05, BR-06, BR-14):

1. **Backend Layer:**
   - Implemented `requireRequester` shared Express middleware to validate `X-Requester-Id` header (rejects missing header with `401`, malformed with `400`, inactive/unknown with `401`, attaches `req.requester` for valid active users).
   - Implemented `GET /api/requesters/active` endpoint returning only active Requesters sorted by `id ASC`.
2. **Frontend Layer:**
   - Established the **Zen Green Design System** tokens (`--zg-primary`, `--zg-secondary`, etc.) in `zen-green.css`.
   - Created `RequesterContext` managing active requester state with `localStorage` persistence.
   - Built `RouteGuard` component (`UI-10`) intercepting unauthenticated navigation and rendering Requester Selection.
   - Built `RequesterSelection` screen with required testing-only warning banner, dropdown of active requesters, loading, empty, and failure states.
   - Built `AppShell` with Zen Green navigation header, Requester profile badge, and "Change" action.

---

## 2. Work Accomplished Step-by-Step

### 2.1 Contract & Ambiguity Resolution (AGENTS.md Rule #1)
- Resolved the contradiction between `SKILL.md` (Phase 2 middleware test) and `tests.md` (Phase 3 create ticket file pin) by creating `server/tests/lab-02/requester-middleware.api.test.ts` for unit-level `MW-03/04/05` and scheduling endpoint integration check in Phase 3.
- Documented all 5 findings (Ambiguity 1, Findings A, B, C, D) in `docs/lab-02/ambiguity-log.md`.
- Updated `tests.md` and `SKILL.md` accordingly.

### 2.2 Backend Middleware & API (TDD Red $\rightarrow$ Green)
- **Failing Tests Written (Red):** `requester-middleware.api.test.ts` (`MW-03, MW-04, MW-05`) and `requesters.api.test.ts`. Confirmed tests failed with `200 != 401` and `404 != 200`.
- **Implementation (Green):**
  - Created [`server/src/middleware/requireRequester.ts`](file:///d:/toktickit/server/src/middleware/requireRequester.ts) with regex format check and Prisma DB lookup.
  - Implemented `GET /api/requesters/active` in [`server/src/app.ts`](file:///d:/toktickit/server/src/app.ts).
- **Result:** All 8 server test files (13 tests) passed 100%.

### 2.3 Frontend Design System & Components (TDD Red $\rightarrow$ Green)
- **Zen Green Tokens:** Created [`client/src/styles/zen-green.css`](file:///d:/toktickit/client/src/styles/zen-green.css) implementing `ui-spec.md` Section 1.1 tokens.
- **Context & Types:** Created [`client/src/types.ts`](file:///d:/toktickit/client/src/types.ts) and [`client/src/context/RequesterContext.tsx`](file:///d:/toktickit/client/src/context/RequesterContext.tsx).
- **RouteGuard & Tests:** Created [`client/src/components/RouteGuard.tsx`](file:///d:/toktickit/client/src/components/RouteGuard.tsx) and wrote [`client/tests/lab-02/RouteGuard.test.tsx`](file:///d:/toktickit/client/tests/lab-02/RouteGuard.test.tsx) proving `UI-10` / `AC-02`.
- **Requester Selection Screen:** Created [`client/src/pages/RequesterSelection.tsx`](file:///d:/toktickit/client/src/pages/RequesterSelection.tsx) and wrote [`client/tests/lab-02/RequesterSelection.test.tsx`](file:///d:/toktickit/client/tests/lab-02/RequesterSelection.test.tsx) covering loading, error, empty, and selection submission.
- **AppShell:** Created [`client/src/components/AppShell.tsx`](file:///d:/toktickit/client/src/components/AppShell.tsx) with brand, navigation, Requester name/department badge, and "Change" action.
- **Root Wiring:** Updated [`client/src/App.tsx`](file:///d:/toktickit/client/src/App.tsx) and [`client/src/main.tsx`](file:///d:/toktickit/client/src/main.tsx).
- **Result:** All 3 client test files (9 tests) passed 100%.

---

## 3. Test Traceability Matrix for Phase 2

| Test ID | Level | Scope / Description | File | Result |
|---|---|---|---|:---:|
| **`MW-03`** | API / Unit | Missing `X-Requester-Id` header $\rightarrow$ `401 Unauthorized` | `server/tests/lab-02/requester-middleware.api.test.ts` | ✅ **PASS** |
| **`MW-04`** | API / Unit | Malformed `X-Requester-Id` header $\rightarrow$ `400 Bad Request` | `server/tests/lab-02/requester-middleware.api.test.ts` | ✅ **PASS** |
| **`MW-05`** | API / Unit | Inactive Requester ID (`5`, Robert Wilson) $\rightarrow$ `401 Unauthorized` | `server/tests/lab-02/requester-middleware.api.test.ts` | ✅ **PASS** |
| **`API (Requesters)`** | API | `GET /api/requesters/active` returns 4 active requesters sorted by ID | `server/tests/lab-02/requesters.api.test.ts` | ✅ **PASS** |
| **`UI-10`** | UI | Unauthenticated route navigation redirects to Requester Selection | `client/tests/lab-02/RouteGuard.test.tsx` | ✅ **PASS** |
| **`UI (Selection)`** | UI | Requester Selection lifecycle (loading, empty, error, submit) | `client/tests/lab-02/RequesterSelection.test.tsx` | ✅ **PASS** |

---

## 4. Current State & Ready for PR
- **Server:** 8/8 test suites passing (13/13 tests).
- **Client:** 3/3 test suites passing (9/9 tests).
- **Git Branch:** `feature/6-lab2-requester-context` is ready for review.
