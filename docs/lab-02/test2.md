# Phase 2 — Test Results Report (test2.md)

**Branch:** `feature/6-lab2-requester-context`  
**Date:** 2026-09-01  
**Sprint:** TokTickIT Lab 2 (Requester Ticketing MVP)  

---

## 1. Server Test Suite Output (`npm --prefix server run test`)

```text
> toktickit-server@1.0.0 test
> vitest run


 RUN  v2.1.9 D:/toktickit/server

 ✓ tests/lab-02/ticket-number.unit.test.ts (2 tests) 3ms
 ✓ tests/lab-02/pagination.unit.test.ts (1 test) 2ms
 ✓ tests/lab-02/validation.unit.test.ts (1 test) 3ms
 ✓ tests/lab-02/safe-filename.unit.test.ts (2 tests) 4ms
 ✓ tests/lab-01/health.test.ts (1 test) 18ms
 ✓ tests/lab-01/categories.test.ts (1 test) 75ms
 ✓ tests/lab-02/requesters.api.test.ts (1 test) 76ms
 ✓ tests/lab-02/requester-middleware.api.test.ts (4 tests) 80ms

 Test Files  8 passed (8)
      Tests  13 passed (13)
   Start at  21:05:06
   Duration  662ms (transform 191ms, setup 0ms, collect 1.22s, tests 261ms, environment 1ms, prepare 927ms)
```

---

## 2. Client Test Suite Output (`npm --prefix client run test`)

```text
> toktickit-client@1.0.0 test
> vitest run


 RUN  v2.1.9 D:/toktickit/client

 ✓ tests/lab-01/App.test.tsx (3 tests) 45ms
 ✓ tests/lab-02/RouteGuard.test.tsx (2 tests) 42ms
 ✓ tests/lab-02/RequesterSelection.test.tsx (4 tests) 221ms

 Test Files  3 passed (3)
      Tests  9 passed (9)
   Start at  21:04:55
   Duration  1.23s (transform 99ms, setup 220ms, collect 458ms, tests 307ms, environment 1.38s, prepare 328ms)
```

---

## 3. Test Cases Summary

| Suite / Area | Tests | Status |
|---|---|:---:|
| Unit Tests (Phase 1) | `UNIT-01`, `UNIT-02`, `UNIT-03`, `UNIT-04`, `UNIT-05`, `UNIT-06` | ✅ Passed (6/6) |
| Server API Tests (Phase 2) | `MW-03`, `MW-04`, `MW-05`, Valid Header 200, `GET /api/requesters/active` | ✅ Passed (5/5) |
| Client UI Tests (Phase 2) | `UI-10` (RouteGuard unselected redirect & selected render), RequesterSelection (loading, form selection, empty, error) | ✅ Passed (6/6) |
| Lab 1 Baseline Tests | Health check API, Categories DB API, Lab1App component | ✅ Passed (5/5) |
| **Total Automated Tests** | **22 Tests across 11 Test Suites** | ✅ **100% Passed (0 Failed, 0 Skipped)** |
