## ✅ Issue 2 Complete — API Health Check

### Changes made

**`server/src/app.ts`**
- Replaced the `501` stub with a real implementation:
```ts
  app.get("/api/health", (_req: Request, res: Response) => {
    res.status(200).json({ status: "ok", service: "TokTickIT API" });
  });
```

**`client/src/api.ts`**
- Implemented `checkSystem()` to call the real `/api/health` endpoint and throw a descriptive error if the backend is unreachable:
```ts
  export async function checkSystem(): Promise<SystemStatus> {
    const healthRes = await fetch(`${API_URL}/api/health`);
    if (!healthRes.ok) {
      throw new Error("Unable to connect to TokTickIT API");
    }
    return { online: true, categories: [] }; // categories wired up in Issue 4
  }
```

**`client/src/App.tsx`**
- Implemented `handleCheck()` to call `checkSystem()`, with `try/catch` to switch between `success` and `error` UI states
- Added rendering for **Online** (green, success state) and **Offline** (red, error state with message)

### Acceptance criteria verification

| Criteria | Status | Evidence |
|---|---|---|
| `GET /api/health` returns HTTP 200 | ✅ | Manual check at `localhost:3000/api/health` |
| JSON body is `{ status: "ok", service: "TokTickIT API" }` | ✅ | Verified via Supertest + manual check |
| Supertest test verifies the endpoint | ✅ | `npx vitest run` → `health.test.ts` passes |
| React page shows backend status from a real API call | ✅ | Clicked "Check System" → shows "System Status: Online" |
| Useful error message when backend is unavailable | ✅ | Stopped server, clicked "Check System" → shows "System Status: Offline — Unable to connect to TokTickIT API" |

### Test output
```
✓ tests/lab-01/health.test.ts (1)
Test Files  1 passed | 1 skipped (2)
     Tests  1 passed | 1 todo (2)
```

Branch: `feature/2-health-check` → ready to open PR into `lab1-staging`