# F3 — งานแก้จากรีวิว F2

วันที่: 2026-10-02

ผู้ใช้กำหนดให้นำงานทั้ง 6 จุดมาทำรวมกับ F3 หลัง PR #49 merge เข้า `lab4-staging` ที่ `8bbd1aa9c975183279c43fe64d47330f9bd94293` งานนี้เป็นส่วนของ integration ใน L4-P10 และต้องเสร็จก่อนปิด F3 โดยคง dependencies ของ L4-P07–L4-P10 เดิม

## รายการงานและเกณฑ์ตรวจรับ

| งาน | สถานะเมื่อส่งต่อ | เกณฑ์ตรวจรับ / เทสต์ |
|---|---|---|
| 1. ล้าง Attachment notes ตอน Complete | แก้ใน working tree แล้ว ยังไม่รวมใน staging | ส่ง `null` เมื่อผู้ใช้ลบข้อความ; response และ DB เป็น null (`UI-L4-06b`, `API-L4-22l`) |
| 2. ตรวจชนิด version และ follow-up | แก้ใน working tree แล้ว ยังไม่รวมใน staging | JSON version ต้องเป็น positive integer number, follow-up ต้องเป็น boolean; invalid request ตอบ 400 โดยไม่แก้ข้อมูล; If-Match ยังใช้ได้ (`API-L4-22j–22l`) |
| 3. Error/Retry ของรายชื่อผู้รับงาน | แก้ใน working tree แล้ว ยังไม่รวมใน staging | แสดง error, ปิด assignment ระหว่างโหลดไม่สำเร็จ, Retry สำเร็จแล้วคืนตัวเลือก (`UI-L4-16`) |
| 4. Success banner ของ Action | แก้ใน working tree แล้ว ยังไม่รวมใน staging | Create/Complete แสดงข้อความสำเร็จหลัง reload (`UI-L4-17`) |
| 5. ตรวจชนิดและรูปแบบ actionDateTime | ยังต้องแก้ | Boolean, number, array, object และข้อความที่ไม่ใช่ ISO datetime ถูกปฏิเสธด้วย 400; คง default เมื่อไม่ส่ง, local timezone, วันที่ย้อนหลัง และขอบเขต now + 5m (`UNIT-L4-01b`, `API-L4-22m`) |
| 6. UUIDv4 fallback ของฟอร์ม | ยังต้องแก้ | เมื่อไม่มี crypto.randomUUID ต้องสร้าง UUIDv4 ที่ backend รับได้; key ใหม่ต่อการเปิด modal และใช้ key เดิมเมื่อ retry (`UI-L4-18`) |

## ลำดับทำงาน

1. เริ่มงาน F3 จาก staging ที่รวม F2 แล้ว และรักษา local changes ทั้งหมด ห้าม reset/clean งานเดิม
2. นำการแก้ 4 จุดที่มีอยู่ พร้อม client/server tests และ nullable API typing เข้า branch/PR ของ F3 ตรวจ diff ก่อนนำไปใช้
3. เขียนเทสต์สำหรับวันที่และ UUID fallback ให้ fail ด้วยเหตุผลที่คาดไว้ก่อนแก้โค้ด แล้วทำให้ผ่านโดยไม่เพิ่ม dependency
4. ทำ Dashboard API/UI ตาม L4-P07–L4-P09 ต่อ และตรวจ integration ใน L4-P10
5. ก่อนปิด F3 รัน server/client/build และ Playwright ครบ 3 viewports บนฐานข้อมูล disposable พร้อม isolated uploads บันทึก SHA และผลใหม่ของชุดที่รวมจริง

ผลเดิม 327 server / 103 client / 114 Playwright เป็นหลักฐานของการแก้ 4 จุดใน working tree ไม่ใช่ผลของ staging ที่ merge และไม่ครอบคลุม 2 จุดใหม่ ห้ามใช้ปิด F3 โดยไม่ตรวจชุดที่รวมครบแล้ว

ติดตามงานนี้ใน Issue/PR ของ F3 ที่ target `lab4-staging`; ให้ reviewer เป็นผู้อนุมัติและ merge

## ผลที่รวมใน F3 — 2026-10-02

ครบทั้ง **6/6 จุด** บน `codex/lab4-f3-dashboard` / Issue #50 รวมอยู่ใน commit `0d8b574` แล้ว ส่วน Dashboard และ integration ต่อเนื่องถึง source checkpoint `88cb104`.

- วันที่: ปฏิเสธชนิดที่ไม่ใช่ string, รูปแบบที่ไม่ใช่ ISO datetime พร้อม timezone และวันที่ปฏิทินที่ไม่มีจริง; คง default และขอบเขต now + 5m (`UNIT-L4-01b`, `API-L4-22m`).
- UUID fallback: ใช้ `crypto.getRandomValues` ตั้ง version/variant bits เป็น UUIDv4; retry ใช้ key/payload เดิม และเปิด modal ใหม่ได้ key ใหม่ (`UI-L4-18`).
- เทสต์ของอีกสี่จุดผ่านอีกครั้งในชุดที่รวมจริง: `API-L4-22j–22l`, `UI-L4-06b`, `UI-L4-16`, `UI-L4-17`.
- ผลรวม: Server **345/345**, Client **112/112**, Playwright **129/129** ครบ Desktop/Tablet/Mobile; build ผ่านทั้งสองฝั่ง ไม่มี failed/skipped tests ในรอบสุดท้าย.

หลักฐานใหม่: `artifacts/lab-04/f3-evidence-20261002/verification.md`. สถานะคือ Verified (automated); ยังไม่ใช่ peer-approved/merged. ตารางข้างต้นเก็บสถานะ ณ วันส่งต่องานเพื่อแยกผลเก่าจากผลรอบนี้.
