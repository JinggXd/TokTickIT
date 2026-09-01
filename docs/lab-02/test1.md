# Test Results — Phase 1: Data Layer (test1.md)

**Sprint:** TokTickIT Lab 2 (Requester Ticketing MVP)  
**Branch:** `feature/5-lab2-data-layer`  
**Date:** 2026-08-30 (Updated: 2026-09-01)  
**Overall Status:** ✅ **ALL PASSED (100%)**

---

## 1. ผลการทดสอบ Unit Tests (Vitest — Server)

### คำสั่งที่ใช้:
```bash
npm --prefix server run test
```

### ผลลัพธ์ (Terminal Output):
```text
> toktickit-server@1.0.0 test
> vitest run


 RUN  v2.1.9 D:/toktickit/server

 ✓ tests/lab-02/pagination.unit.test.ts (1 test) 3ms
 ✓ tests/lab-02/ticket-number.unit.test.ts (2 tests) 4ms
 ✓ tests/lab-02/validation.unit.test.ts (1 test) 3ms
 ✓ tests/lab-02/safe-filename.unit.test.ts (2 tests) 4ms
 ✓ tests/lab-01/health.test.ts (1 test) 15ms
 ✓ tests/lab-01/categories.test.ts (1 test) 39ms

 Test Files  6 passed (6)
      Tests  8 passed (8)
   Start at  18:35:27
   Duration  592ms (transform 182ms, setup 0ms, collect 671ms, tests 67ms, environment 1ms, prepare 707ms)
```

---

## 2. ตารางสรุปผลการทดสอบรายเคส (Unit Test Matrix)

| Test ID | Business Rule / AC | ขอบเขตการทดสอบ (Scope) | ผลลัพธ์ที่คาดหวัง | ผลการทดสอบ |
|---|---|---|---|:---:|
| **UNIT-01** | BR-01 | สร้างหมายเลขตั๋ว `generateTicketNumber` | คืนค่ารูปแบบ `TKT-YYYY-XXXXXX` และเพิ่มขึ้นทีละ 1 ปัดศูนย์ 6 หลัก | ✅ **PASS** |
| **UNIT-02** | BR-01 | กลไก Retry เมื่อชนกัน (Collision) | Retry สูงสุด 3 ครั้ง หากยังซ้ำให้ throw `TicketNumberGenerationError` | ✅ **PASS** |
| **UNIT-03** | BR-09 | Trim และตรวจสอบความยาวข้อมูลตั๋ว | ตัดช่องว่างหน้าหลัง, Summary (5–100), Description (10–2000), Priority | ✅ **PASS** |
| **UNIT-04** | BR-19 | Sanitize ชื่อไฟล์และสกัด Path Traversal | Reject `/`, `\`, `..` และแปลงอักขระพิเศษเป็น `_` จำกัดความยาวไม่เกิน 100 ตัว | ✅ **PASS** |
| **UNIT-05** | BR-19 | MIME/extension mismatch detector | ตรวจจับความไม่ตรงกันระหว่างนามสกุลไฟล์กับ Magic Bytes (เช่น .jpg แต่เนื้อในเป็น PDF) | ✅ **PASS** |
| **UNIT-06** | BR-12 | Clamp การแบ่งหน้า (Pagination) | ปรับเลขหน้าที่เกินช่วงเป็น 1 หรือหน้าสุดท้าย และตรวจสอบ Limit `[5, 8, 10, 20]` | ✅ **PASS** |

---

## 3. ผลการทดสอบ Database Migration

### คำสั่งที่ใช้:
```bash
npx prisma migrate dev --name lab2_data_layer
```

### ผลลัพธ์:
```text
Environment variables loaded from .env
Prisma schema loaded from prisma\schema.prisma
Datasource "db": PostgreSQL database "toktickit", schema "public" at "localhost:5433"

Applying migration `20260830151320_lab2_data_layer`

The following migration(s) have been created and applied from new schema changes:

migrations/
  └─ 20260830151320_lab2_data_layer/
    └─ migration.sql

Your database is now in sync with your schema.
✔ Generated Prisma Client (v5.22.0)
```

---

## 4. ผลการทดสอบ Seed Data (Idempotent Verification)

### คำสั่งที่ใช้ (รัน 2 ครั้งติดต่อกัน):
```bash
npm --prefix server run prisma:seed
npm --prefix server run prisma:seed
```

### ผลลัพธ์รอบที่ 1:
```text
> toktickit-server@1.0.0 prisma:seed
> tsx prisma/seed.ts

Seeded 4 categories.
Seeded 7 related systems.
Seeded 5 Development Requesters.
Lab 2 seed complete.
```

### ผลลัพธ์รอบที่ 2 (พิสูจน์ว่าไม่มีแถวซ้ำและไม่มี Error):
```text
> toktickit-server@1.0.0 prisma:seed
> tsx prisma/seed.ts

Seeded 4 categories.
Seeded 7 related systems.
Seeded 5 Development Requesters.
Lab 2 seed complete.
```

---

## 5. ผลการทดสอบ Client Test Suite

### คำสั่งที่ใช้:
```bash
npm --prefix client run test
```

### ผลลัพธ์:
```text
> toktickit-client@1.0.0 test
> vitest run

 RUN  v2.1.9 D:/toktickit/client

 ✓ tests/lab-01/App.test.tsx (3 tests) 34ms

 Test Files  1 passed (1)
      Tests  3 passed (3)
```
