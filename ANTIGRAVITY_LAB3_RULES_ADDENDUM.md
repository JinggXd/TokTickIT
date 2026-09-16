# Antigravity — Lab 3 Preservation and Evidence Rules

กฎเสริมสำหรับต่อท้าย `pipeline3` ให้ coding agent อ่านก่อนทำงานทุกครั้ง
กฎนี้ไม่ใช่หลักฐานว่า Antigravity โหลดไฟล์นี้อัตโนมัติ เจ้าของงานต้องแนบหรืออ้างไฟล์นี้ในคำสั่งเริ่มงาน

## 1. รักษางานเดิม ไม่แก้โดยพลการ

- เริ่มด้วยการอ่าน repository instructions, ใบ Lab 3, pipeline และ contract ปัจจุบัน ตรวจ branch, HEAD และ `git status` โดยไม่เปลี่ยนแปลงอะไร
- บันทึก baseline ว่าไฟล์ใดมีอยู่แล้วและไฟล์ใดมีงานค้างของผู้ใช้ ห้ามถือว่า untracked files เป็นไฟล์ที่ลบทิ้งได้
- ห้ามแก้ ลบ ย้าย เปลี่ยนชื่อ จัด format หรือเขียนทับไฟล์เดิมโดยไม่ได้รับอนุมัติ รวม code, tests, docs, configs, lockfiles, screenshots และ migrations
- ห้าม rewrite แอปหรือคัดลอก business logic เดิมเป็นแอปใหม่เพื่อหลบข้อห้าม ให้ reuse ส่วนเดิม
- เพิ่มไฟล์ใหม่ที่ไม่ชนชื่อและอยู่ในขอบเขตงานได้ แต่การเชื่อมกับไฟล์เดิมยังต้องได้รับอนุมัติ
- Lab 3 จำเป็นต้องเปลี่ยน identity, schema, routing และ app shell จึงห้ามสัญญาว่าจะทำครบโดยไม่แตะไฟล์เดิมเลย หากจำเป็น ให้เสนอ minimal patch ก่อน
- ข้อเสนอ patch ต้องระบุ path, symbol/ส่วนที่แก้, diff หรือ before/after, requirement, ผลกระทบต่อ Lab 2, regression tests และวิธีกู้คืนที่ไม่ทำลายข้อมูล
- คำว่า “ทำ Lab 3 ต่อ” ไม่ถือว่าอนุมัติแก้ทุกไฟล์ การอนุมัติต้องครอบคลุม patch/ขอบเขตนั้นอย่างชัดเจน หากมีงานเพิ่มนอกขอบเขต ให้เสนอใหม่
- หากกฎ Lab 2 เดิมขัดกับ Lab 3 เช่นห้าม authentication หรือกำหนด staging คนละ branch ให้รายงานข้อขัดกันและเสนอปรับขอบเขตกฎก่อน ห้ามข้ามกฎเงียบ ๆ

## 2. รักษาข้อมูลและพฤติกรรมเดิม

- ห้ามแก้ migration ที่ใช้แล้ว ใช้ forward migration ใหม่ที่ตรวจบนสำเนาฐานข้อมูลก่อนเท่านั้น
- ห้าม reset database, DROP/TRUNCATE, destructive reseed, `db push --accept-data-loss`, `git reset --hard`, `git clean -fd` หรือ force-push โดยไม่ได้รับอนุมัติแยกสำหรับการกระทำนั้น
- รักษา Ticket/Attachment IDs, requester mapping, metadata และไฟล์จริง ตรวจความต่อเนื่องก่อน/หลัง migration
- ห้าม backfill ทับข้อมูลที่มีอยู่และถูกต้อง เติมเฉพาะข้อมูลที่ขาดตาม approved migration plan
- รักษาชื่อ field, API error shape/status และ business rules เดิม เว้นส่วนที่ Lab 3 ต้องเปลี่ยนและ contract อนุมัติแล้ว
- ห้ามติดตั้งหรืออัปเกรด dependency เหมารวม เสนอ package, เหตุผล และ manifest/lockfile changes ก่อน

## 3. ห้ามปลอมผลเทสต์หรือหลักฐาน

- ห้ามแต่งคำสั่งที่ไม่ได้รัน, output, test counts, exit codes, timestamps, commit SHA, screenshots, PR URLs, reviewer comments, approvals หรือผล merge
- ห้ามคัดผลจาก log เก่า/ZIP/branch อื่นมาอ้างว่าเป็นผลของ checkout ปัจจุบัน ถ้าอ้างผลเก่า ให้ระบุว่าเป็น historical evidence พร้อมที่มา
- “มีโค้ด”, “build ผ่าน”, “unit test ผ่าน”, “E2E ผ่าน” และ “ตรวจ UI จริงแล้ว” เป็นคนละข้อสรุป ห้ามใช้ข้อหนึ่งแทนอีกข้อ
- ห้ามรายงาน test ผ่านจน process จบและได้ผลจริง หาก tool timeout, browser เปิดไม่ได้, DB ต่อไม่ได้ หรือ output ไม่ครบ ให้รายงาน Blocked/Not run/In progress ตามจริง
- ห้ามเปลี่ยน output ที่ fail เป็น pass, ตัดส่วน failure ออกเพื่อให้ดูผ่าน หรือเขียนว่า 100% เมื่อมี test ที่ไม่ได้รัน
- ห้ามสร้างภาพ mockup หรือใช้ภาพจากใบงานแทนภาพแอปจริงเพื่ออ้าง completion
- ห้ามสร้าง reviewer approval หรือ My Reflection ที่อ้างประสบการณ์ของผู้เรียนโดยไม่มีข้อมูลจริง

## 4. เทสต์ต้องพิสูจน์ requirement จริง

- ระบุ requirement/AC, planned test ID, actual test path และ expected result ก่อน implementation
- ทำ TDD ตามแผน: เขียน test → รันและยืนยัน Red จากเหตุที่คาดหมาย → implement → รัน Green ห้ามสร้าง Red ปลอม หากโค้ดมีอยู่แล้วให้ระบุว่าเพิ่ม regression coverage
- ห้ามลด/ลบ assertion, เพิ่ม `.skip`, `.todo`, `.only`, กลืน error, ใส่ unconditional pass หรือเปลี่ยน expected result เพื่อหลบ bug
- ถ้า test ผิด ให้เสนอเหตุผลอิง contract และแก้ test อย่างตรวจสอบได้ ไม่แก้ production ให้ตรง mock ที่ขัดกับ API spec
- ห้ามใช้ mock แทน backend จริงใน happy-path E2E หรือ ownership/security evidence; อนุญาต controlled failure mock เมื่อ scenario ตั้งใจทดสอบ failure และบันทึกไว้ชัดเจน
- รอข้อมูลโหลดเสร็จและยืนยัน identity/context ก่อนตรวจ negative assertion เช่น “ไม่พบ Ticket ของคนอื่น” ห้ามให้ test ผ่านเพียงเพราะยัง loading
- การมองเห็น element ไม่ได้พิสูจน์ว่าไม่ถูกตัดข้อความ ต้องตรวจ layout/overflow และดูภาพจริงตาม visual checklist

## 5. ความปลอดภัยของ test และ cleanup

- ตรวจ setup/teardown ก่อนรัน ใช้ disposable test database และ test upload directory ที่แยกจากข้อมูลผู้ใช้ พร้อม guard ก่อนเริ่ม
- ห้ามรัน suite ที่มี cleanup เสี่ยงลบข้อมูลจริง ให้รายงาน blocker และเสนอ patch ก่อน
- cleanup ได้เฉพาะ IDs และไฟล์ที่สร้างโดย test run นั้น โดยติดตามตั้งแต่สร้างสำเร็จและรองรับการ fail กลางทาง
- ห้าม cleanup ด้วย prefix/ข้อความกว้าง เช่น `summary startsWith E2E-`, ชื่อ fixture ที่ใช้ซ้ำ หรือการล้างทั้งตาราง/โฟลเดอร์
- ก่อนลบไฟล์ ตรวจ resolved absolute path ว่าอยู่ใน test directory ที่อนุญาต ห้ามลบตาม path จากข้อมูลโดยไม่ตรวจ
- ห้ามกลืน cleanup failure เป็น warning แล้วรายงาน suite สะอาด/ผ่านครบ ต้องแสดง failure และข้อมูลตกค้างที่ทราบโดยไม่เปิดเผย secrets
- Test ที่เขียน screenshot ทับไฟล์เดิมถือว่าแก้หลักฐานเดิม ต้องได้รับอนุมัติ หรือเขียนลง run-specific directory ใหม่

## 6. หลักฐานที่ต้องบันทึกหลังทำงาน

ทุกครั้งที่รายงานผล ให้ระบุ:

1. branch, HEAD และ dirty/untracked state ที่เกี่ยวข้อง — หากยังไม่ commit ต้องระบุว่าทดสอบ working tree ไม่ใช่ HEAD ล้วน
2. ไฟล์ที่เพิ่ม/แก้จริง พร้อม requirement และ approval ของ legacy patch
3. คำสั่งที่รันจริง, เวลา, exit code, จำนวน passed/failed/skipped และที่เก็บ raw output
4. AC/Test IDs ที่ยืนยันแล้ว พร้อมรายการ Fail/Blocked/Not run และเหตุผล
5. สิ่งที่ยังขาด รวม regression, visual inspection, peer review และ final-main evidence

รัน full server/client/Playwright suites และ builds ตาม approved plan เมื่อปลอดภัย หากรันไม่ได้ให้บอกตรง ๆ ห้ามอ้างว่าเสร็จครบ
ห้าม commit, push หรือ merge โดยอาศัยกฎนี้เป็นการอนุมัติ ต้องมีคำสั่งของผู้ใช้หรือ workflow authority ที่ชัดเจน และเคารพข้อตกลงให้ peer reviewer เป็นผู้ merge

## คำสั่งเริ่มงานที่ใช้แนบกับ pipeline

> อ่าน pipeline3 และกฎเสริมนี้ก่อน เริ่มจาก read-only baseline ห้ามแก้ไฟล์เดิมโดยไม่ได้รับอนุมัติ concrete patch รักษาข้อมูลและพฤติกรรม Lab 2 ยกเว้นการเปลี่ยนที่ Lab 3 บังคับและอนุมัติแล้ว ห้ามปลอมผลเทสต์หรือหลักฐาน แยกสิ่งที่พบในโค้ดออกจากสิ่งที่ทดสอบจริง ถ้าเทสต์เสี่ยงลบข้อมูลให้หยุดก่อนรัน รายงานผลจริงพร้อมคำสั่งและข้อจำกัดทุกครั้ง
