# Phase 2 — File Changes Log (filechange2.md)

**Branch:** `feature/6-lab2-requester-context`<br>
**Date:** 2026-09-01<br>
**Sprint:** TokTickIT Lab 2 (Requester Ticketing MVP)

---

## 1. Summary of Changes

Phase 2 introduces the **Development Requester Context** foundation across backend and frontend:
1. **Contract & Ambiguity Log:** Added `docs/lab-02/ambiguity-log.md` resolving Ambiguity 1 and Findings A–D per `AGENTS.md` Rule #1. Updated `docs/lab-02/tests.md` and `SKILL.md`.
2. **Backend API & Middleware:**
   - `server/src/middleware/requireRequester.ts` [NEW]
   - `server/src/app.ts` [MODIFIED - added `GET /api/requesters/active`]
   - `server/tests/lab-02/requester-middleware.api.test.ts` [NEW - `MW-03`, `MW-04`, `MW-05`]
   - `server/tests/lab-02/requesters.api.test.ts` [NEW - active requesters list API]
3. **Frontend Components & Design System:**
   - `client/src/styles/zen-green.css` [NEW - Zen Green tokens & Bootstrap overrides]
   - `client/src/types.ts` [NEW - RequesterUser, Category, RelatedSystem, Priority, Ticket]
   - `client/src/context/RequesterContext.tsx` [NEW - React Context & persistence]
   - `client/src/components/RouteGuard.tsx` [NEW - `UI-10` route interceptor]
   - `client/src/pages/RequesterSelection.tsx` [NEW - selection UI per `ui-spec.md` Section 10.1]
   - `client/src/components/AppShell.tsx` [NEW - navigation bar & profile badge]
   - `client/src/App.tsx` [MODIFIED - root wiring]
   - `client/src/main.tsx` [MODIFIED - import zen-green.css]
   - `client/src/Lab1App.tsx` [NEW - preserved Lab 1 component]
   - `client/tests/lab-02/RouteGuard.test.tsx` [NEW - `UI-10` tests]
   - `client/tests/lab-02/RequesterSelection.test.tsx` [NEW - selection tests]
   - `client/tests/lab-01/App.test.tsx` [MODIFIED - tests Lab1App]

---

## 2. Key File Diffs & Descriptions

### 2.1 Backend: `server/src/middleware/requireRequester.ts` [NEW]
Enforces `X-Requester-Id` validation per `api-spec.md` Section 2:
- `401 Unauthorized` if missing, nonexistent, or inactive.
- `400 Bad Request` (no `details` key) if not a positive integer.
- Attaches `req.requester` on success.

### 2.2 Backend: `server/src/app.ts` [MODIFIED]
```diff
+// ---------------------------------------------------------------------------
+// Lab 2: Phase 2 — Active Development Requesters (api-spec.md Section 6.1, BR-05)
+// ---------------------------------------------------------------------------
+app.get("/api/requesters/active", async (_req: Request, res: Response) => {
+  try {
+    const requesters = await getPrisma().requesterUser.findMany({
+      where: { isActive: true },
+      orderBy: { id: "asc" },
+      select: {
+        id: true,
+        name: true,
+        email: true,
+        department: true,
+      },
+    });
+    res.status(200).json(requesters);
+  } catch (err) {
+    res.status(500).json({ error: "Unable to load Development Requesters. Please try again." });
+  }
+});
```

### 2.3 Frontend: `client/src/styles/zen-green.css` [NEW]
Defines CSS variables `--zg-primary` (`#006B3C`), `--zg-secondary` (`#0B7A46`), `--zg-pale-green` (`#EAF6EF`), `--zg-canvas` (`#F5F7F6`), etc., and custom classes `.navbar-zen`, `.btn-primary-zen`, `.card-zen`, `.form-control-zen`.

### 2.4 Frontend: `client/src/components/RouteGuard.tsx` [NEW]
Protects application routes by verifying that `currentRequester` is non-null. If null, renders `RequesterSelection`.

---

## 3. Verification Commands & Status

```bash
# Server Test Suite
npm --prefix server run test
# Output: 8 passed (8), 13 tests passed

# Client Test Suite
npm --prefix client run test
# Output: 3 passed (3), 9 tests passed
```
