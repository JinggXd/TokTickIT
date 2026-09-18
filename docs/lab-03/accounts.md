# TokTickIT — Seed Accounts & Credentials (Lab 3)

เอกสารสรุปรายชื่อบัญชีผู้ใช้และรหัสผ่านเริ่มต้นสำหรับทดสอบระบบใน **Lab 3 (Authentication & RBAC)**

---

## 1. รหัสผ่านเริ่มต้น (Default Initial Password)

- **รหัสผ่านชั่วคราวเริ่มต้น (Initial Password):** `InitialPassword123!`
- **ข้อกำหนดรหัสผ่านใหม่ (Password Policy):** 
  - ความยาวอย่างน้อย **12 ตัวอักษร** และไม่เกิน **128 ตัวอักษร** (Unicode Code Points)
  - ต้องไม่ซ้ำกับรหัสผ่านเดิม (New password must be different from current password)
  - รหัสผ่านใหม่และยืนยันรหัสผ่านต้องตรงกัน
  - *ตัวอย่างรหัสผ่านใหม่ที่แนะนำ:* `NewSecurePassword2026!` หรือ `TokTickSecure2026!`

---

## 2. รายชื่อบัญชีผู้ใช้ตามสิทธิ์ (Role Accounts)

### 👑 Administrator (ผู้ดูแลระบบ)
เมื่อล็อกอินและเปลี่ยนรหัสผ่านแล้ว ระบบจะนำทางไปยังหน้า **`/admin/users` (Administrator Portal)**

| Name | Email | Initial Password | สถานะ | บังคับเปลี่ยนรหัสผ่าน |
|---|---|---|:---:|:---:|
| **Admin User** | `admin@example.com` | `InitialPassword123!` | ✅ Active | ใช่ (`mustChangePassword: true`) |

---

### 🛠️ IT Staff (เจ้าหน้าที่เทคนิค)
เมื่อล็อกอินและเปลี่ยนรหัสผ่านแล้ว ระบบจะนำทางไปยังหน้า **`/staff/queue` (IT Staff Portal)**

| Name | Email | Initial Password | สถานะ | บังคับเปลี่ยนรหัสผ่าน | หมายเหตุ |
|---|---|---|:---:|:---:|---|
| **Staff Alex** | `staff1@example.com` | `InitialPassword123!` | ✅ Active | ใช่ (`mustChangePassword: true`) | เจ้าหน้าที่หลัก |
| **Staff Brian** | `staff2@example.com` | `InitialPassword123!` | ✅ Active | ใช่ (`mustChangePassword: true`) | Infrastructure |
| **Staff Chloe** | `staff3@example.com` | `InitialPassword123!` | ✅ Active | ใช่ (`mustChangePassword: true`) | Applications |
| **Staff Inactive** | `staff.inactive@example.com` | `InitialPassword123!` | ❌ Inactive | ใช่ | บัญชีถูกปิดใช้งาน (ล็อกอินจะแสดงผล 401 Invalid email or password) |

---

### 👤 Requesters (ผู้ใช้งานทั่วไป / บัญชีเดิมจาก Lab 2)
เมื่อล็อกอินและเปลี่ยนรหัสผ่านแล้ว ระบบจะนำทางไปยังหน้า **`/my-tickets` (My Tickets)**

| Name | Email | Initial Password | สถานะ | บังคับเปลี่ยนรหัสผ่าน | หมายเหตุ |
|---|---|---|:---:|:---:|---|
| **Jennifer Anderson** | `jennifer.a@example.com` | `InitialPassword123!` | ✅ Active | ใช่ (`mustChangePassword: true`) | Marketing |
| **Sarah Johnson** | `sarah.j@example.com` | `InitialPassword123!` | ✅ Active | ใช่ (`mustChangePassword: true`) | Finance |
| **David Lee** | `david.l@example.com` | `InitialPassword123!` | ✅ Active | ใช่ (`mustChangePassword: true`) | Academic Affairs |
| **Emily Chen** | `emily.c@example.com` | `InitialPassword123!` | ✅ Active | ใช่ (`mustChangePassword: true`) | Sales |
| **Robert Wilson** | `robert.w@example.com` | `InitialPassword123!` | ❌ Inactive | ใช่ | บัญชีถูกปิดใช้งาน (ล็อกอินจะแสดงผล 401 Invalid email or password) |

---

## 3. ขั้นตอนการทดสอบเข้าสู่ระบบ (Login & First-Time Setup Flow)

1. เข้าหน้าเว็บไซต์: `http://localhost:5173/login`
2. กรอก **Email** และ **Password** ด้วย `InitialPassword123!`
3. ระบบจะตรวจสอบพบสถานะ `mustChangePassword: true` และเปลี่ยนเส้นทางไปยังหน้า **`/change-password`** พร้อมแสดงแถบเตือนสีเหลือง:
   > *"You are required to set a new password before proceeding."*
4. กรอกข้อมูล:
   - **Current Password:** `InitialPassword123!`
   - **New Password:** `NewSecurePassword2026!` (อย่างน้อย 12 ตัวอักษร)
   - **Confirm Password:** `NewSecurePassword2026!`
5. กดปุ่ม **Update Password**
6. ระบบจะแสดงแถบสีเขียว *"Password changed successfully! Redirecting..."* และหน่วงเวลา 1 วินาที จากนั้นจะนำทางเข้าสู่หน้าจอตามบทบาท (Role) ของบัญชีนั้นๆ โดยอัตโนมัติ
7. เมื่อต้องการออกจากระบบ กดปุ่ม **Sign Out** ที่มุมขวาบนของแถบ Navbar
