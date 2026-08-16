## Issue 1 — Project foundation (`feature/1-project-foundation`)

**ทำอะไรไปบ้าง:**
- Setup repo + branch ครบ (`main` → `lab1-staging` → `feature/*`)
- ตั้ง PostgreSQL ผ่าน Docker, เชื่อมต่อ Prisma สำเร็จ
- Client (React+Vite+Bootstrap) และ Server (Express+TS) รันได้ทั้งคู่
- เขียน README.md (setup instructions ครบ)

**Acceptance criteria verification:**

| Criteria | ผล | หลักฐาน |
|---|---|---|
| React+TS+Vite frontend starts | ✅ | รัน `npm run dev` เห็นหน้า Bootstrap จริง |
| Bootstrap installed/visible | ✅ | ปุ่ม/ฟอนต์สไตล์ Bootstrap ขึ้นจริง |
| Node+Express+TS backend starts | ✅ | รันที่ `localhost:3000` |
| PostgreSQL reachable + Prisma initialized | ✅ | `npx prisma db pull` ต่อสำเร็จ (error `P4001` DB ว่าง ไม่ใช่ `P1000` auth fail) |
| Vitest/Supertest configured | ✅ | คำสั่งเทสรันได้ทั้ง client/server |
| .gitignore + .env.example, ไม่ commit secrets | ✅ | เช็คแล้วไม่มี `.env` ใน git |
| README setup instructions | ✅ | เขียนครบแล้ว |

---

## Issue 2 — API health check (`feature/2-health-check`)

**ทำอะไรไปบ้าง:**
- `server/src/app.ts`: `/api/health` ตอบ 200 + `{status:"ok", service:"TokTickIT API"}`
- `client/src/api.ts`: `checkSystem()` เรียก API จริง
- `client/src/App.tsx`: แสดง Online/Offline จาก API call จริง

**Acceptance criteria verification:**

| Criteria | ผล | หลักฐาน |
|---|---|---|
| GET /api/health returns 200 | ✅ | Manual check ที่ `localhost:3000/api/health` |
| JSON body ถูกต้อง | ✅ | Supertest + manual check |
| Supertest verify endpoint | ✅ | `health.test.ts` PASS |
| React แสดงสถานะจาก API จริง | ✅ | กด Check System → "System Status: Online" |
| Error message เมื่อ backend ไม่พร้อม | ✅ | ปิด server → "System Status: Offline" |

**Test output:**
```
✓ tests/lab-01/health.test.ts (1)
Test Files  1 passed | 1 skipped (2)
```

---

## Issue 3 — Category model + seed (`feature/3-category-seed`)

**ทำอะไรไปบ้าง:**
- เพิ่ม Prisma model `Category` (id, name unique, createdAt)
- รัน migration สร้างตารางสำเร็จ
- เขียน seed ด้วย `upsert` (idempotent)

**Acceptance criteria verification:**

| Criteria | ผล | หลักฐาน |
|---|---|---|
| Prisma model ถูกต้อง | ✅ | ตรงตาม spec เป๊ะ |
| Migration สร้างตาราง | ✅ | "Your database is now in sync with your schema" |
| Seed ใส่ 4 หมวดถูกต้อง | ✅ | Query จริงเห็น Account and Access, Hardware, Software, Network |
| Seed idempotent | ✅ | รัน seed 2 รอบ ยังเจอแค่ 4 แถวเท่าเดิม |
| DB credentials ไม่ commit | ✅ | `.env` ไม่เคย commit |

---

## Issue 4 — Category list (`feature/4-category-list`)

**ทำอะไรไปบ้าง:**
- `server/src/app.ts`: เพิ่ม `GET /api/categories` (ดึงจาก Prisma เรียงตาม id)
- `client/src/api.ts`: `checkSystem()` ดึง categories ต่อจาก health check
- `client/src/App.tsx`: แสดง category list จริงบนหน้าเว็บ
- Implement เทสที่เคยเป็น `.todo` ครบทั้ง server และ client

**Acceptance criteria verification:**

| Criteria | ผล | หลักฐาน |
|---|---|---|
| GET /api/categories ดึงจาก Prisma | ✅ | endpoint คืนค่าจริงจาก DB |
| คืนค่าเรียงตาม id | ✅ | ตรงตาม `orderBy: {id:"asc"}` |
| Supertest verify | ✅ | `categories.test.ts` PASS |
| React แสดงจาก API จริง (ไม่ hard-code) | ✅ | list render จาก `categories.map()` |
| Loading/error state | ✅ | ทดสอบ manual ในเบราว์เซอร์ |
| Vitest verify UI behavior | ✅ | 2 เทส mock success/error ผ่านหมด |

**Test output:**
```
server:  ✓ categories.test.ts  ✓ health.test.ts   → 2 passed (2)
client:  ✓ heading  ✓ Online+categories  ✓ Offline error   → 3 passed (3)
```

---