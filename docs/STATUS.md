# STATUS — สถานะงานปัจจุบันและคิวงานถัดไป

> **ไฟล์นี้คือบันทึกส่งต่องาน** สำหรับคน และสำหรับ AI agent ทุกตัว
> **ทุกคน/ทุก agent ที่ทำงานเสร็จหนึ่งชิ้น ต้องอัปเดตไฟล์นี้ก่อนจบงาน**
> อ่านคู่กับ [AGENTS.md](../AGENTS.md) ซึ่งเป็นกติกาที่ไม่เปลี่ยนบ่อย
> ส่วนไฟล์นี้คือสิ่งที่เปลี่ยนทุกวัน

**อัปเดตล่าสุด:** 2026-09-18 (ปิด CQ-01–CQ-07)
**เฟสปัจจุบัน:** เฟส 1 MVP ใช้งานได้ในคลินิกตัวอย่าง + เฟส 2 แกนฝากเลี้ยง/กรูมมิ่ง/ภาษีออกบิล
**สถานะ:** 🟢 ปิด DEF-01–10 และ CQ-01–07 · Q5 LINE ยังไม่ทำ · Q6 VAT สินค้ายังรอผู้ทำบัญชี

**AI ตัวถัดไปเริ่มยังไง:** `git pull` → คัดลอก `.env.example` เป็น `.env` → `docker compose up -d` → `npx prisma migrate deploy` → `npx prisma db seed` → `npm run dev` → เปิด http://localhost:3000
บัญชีทดลอง (รหัส `demo1234` ทั้งหมด):
- `nune@demo.local` เจ้าหน้าที่ต้อนรับ — รับสัตว์ / คิว / POS
- `ek@demo.local` สัตวแพทย์ — SOAP ลงนาม / สั่งยา
- `jo@demo.local` คลังยา — จ่ายยา FEFO / รับของเข้า
- พอร์ทัลเจ้าของ: เบอร์ `0812345678` แล้วกดขอ OTP

---

## 1. ทำเสร็จแล้ว

### 2026-09-18 — ปิด CQ-01–CQ-07

ตรวจด้วย `npm run typecheck` + `npm run lint` + `npm test` (32) + `npm run test:int` (21, Docker)

| CQ | แก้ที่ | สถานะการตรวจสอบ |
| --- | --- | --- |
| CQ-01 zod + จำนวนยาต้องเป็นบวก | `prescribeInputSchema`, `prescribe.ts`, `prescribeAction`, `pos.ts` | ✅ unit schema ปฏิเสธ `-2` และวัน 0; int ไม่สร้าง Prescription |
| CQ-02 outbox ต่อทรานแซกชัน | `src/server/context.ts` AsyncLocalStorage | ✅ int: rollback แล้ว tx ถัดไปไม่มี event ค้าง |
| CQ-03 เรียก writeAuditLog | SOAP ลงนาม, สั่งยา, จ่ายยา, ออกบิล | ✅ int: `soap.signed` และ `invoice.issued` มีแถว AuditLog |
| CQ-04 fixture พนักงาน + app_user | `staffContext(h.app, seed)` | ✅ เทส SOAP/บิล/ยา/ฝาก/เช็คอิน/เคสใช้ h.app |
| CQ-05 assert VAT จริง | `invoice.int.test.ts` คาด 2,290 | ✅ int ผ่าน — ถ้าสูตรผิดเทสแดง |
| CQ-06 lint relative ข้ามโมดูล | `eslint.config.mjs` + `lint-boundary.test.ts` | ✅ unit บล็อก `../clinical/soap` ให้อนุญาต `./dose` |
| CQ-07 เทสไม่ผูกนาฬิกาตายตัว | stay/dispense ใช้วันธุรกิจไทยเลื่อนจากวันนี้ | ✅ stay.int.test 3 เคสผ่าน |

### 2026-09-18 — รีวิวคุณภาพโค้ด (ไม่แก้โค้ดธุรกิจ)

- ตรวจ Server Actions/use-case, transaction/outbox, audit, fixture/assertion ของเทส และกฎ import; จุดแข็งที่เห็นคือแยกโมดูลธุรกิจ, ใช้ Decimal/สตางค์ และมีเทส PostgreSQL จริง แต่ยังมีช่องว่างตาม CQ ใน §2
- `npm run typecheck` / `npm run lint` → exit 0 หลังเพิ่มสคริปต์; `npm test` → 26 passed; `npm run test:int` → **18 passed / 1 failed** จากเทสฝากเลี้ยงที่ผูกกับเวลาจริง (CQ-07) ไม่ได้แก้/skip เทสเพื่อให้ผ่าน
- `npx tsx scripts/review-code-quality.ts` → exit 0: ยืนยัน CQ-01–03 ด้วย `app_user` + actor พนักงานใน testcontainer และ CQ-06 ด้วย ESLint API; เป็นสคริปต์แสดงหลักฐาน ไม่ใช่ regression test ที่รับรองพฤติกรรมผิด
- แก้เฉพาะ STATUS และเพิ่มสคริปต์ข้างต้น; ไม่รัน build/UI/e2e รอบนี้เพราะไม่ได้แก้แอป และไม่อ้างว่าตรวจทุกเส้นทางแล้ว

### 2026-09-18 — ทะเบียนยาควบคุมตามคำตอบ Q3

ตรวจด้วย `npm run typecheck` + `npm run lint` + `npm test` + `npm run test:int` (เทสทะเบียนยาควบคุม)

| สิ่งที่ทำ | ไฟล์ | สถานะการตรวจสอบ |
| --- | --- | --- |
| คิวรีทะเบียน 1 ยา × 1 สาขา × 1 เดือน อ่าน `balanceAfterBase` ตรง ๆ | `src/modules/inventory/controlled-register.ts` | ✅ int: ยกมา ส.ค. 90 กันยายนจ่าย 5 คงเหลือ 85 ไม่ mismatch |
| หน้าพิมพ์ + CSV ไม่มีปุ่มแก้ | `inventory/controlled/` | เขียนแล้ว — ตรวจ typecheck; พิมพ์จริงยังไม่ได้คลิก |
| seed ตั้ง PRED5 เป็นยาควบคุม | `prisma/seed-demo.ts` | เขียนแล้ว ต้อง `npx prisma db seed` ใหม่ถึงจะเห็นในคลินิกตัวอย่าง |
| Q5 LINE ยังไม่ทำ ตามผู้ใช้ | STATUS §3 | บันทึกแล้ว ไม่แตะโมดูลแจ้งเตือน |

### 2026-09-18 — ปิด DEF-01–DEF-10

ตรวจด้วย `npm run typecheck` + `npm run lint` + `npm test` (25) + `npm run test:int` (17, Docker) และ `npx prisma migrate deploy` กับ Postgres ท้องถิ่น (migration `20260918140000_protect_signed_and_issued`)

| Defect | แก้ที่ | สถานะการตรวจสอบ |
| --- | --- | --- |
| DEF-01 ไม่จ่ายล็อตหมดอายุ | `src/modules/inventory/fefo.ts` | ✅ int: ล็อต `2000-01-01` จ่ายไม่ได้ ไม่มี ChargeItem/Dispense |
| DEF-02 SOAP ต้องมี `clinical:read` | `src/modules/clinical/encounter.ts` | ✅ int: receptionist `patient:read` ได้ `soapNotes=[]` |
| DEF-03 ห้ามล้าง `signed_at` | migration `protect_signed_soap` | ✅ int: UPDATE `signedAt=null` ถูก trigger บล็อก; addendum ได้ |
| DEF-04 ออกบิลพร้อมกัน | `invoice.ts` `SELECT … FOR UPDATE` + claim `status=OPEN` | ✅ int: `Promise.allSettled` สองครั้งได้บิลเดียว |
| DEF-05 ย้อนบิลเป็น DRAFT | migration `protect_issued_invoice` | ✅ int: UPDATE status DRAFT หลังออกถูกบล็อก |
| DEF-06 คืนค้าง `[เข้า, ออก)` | `checkOutStay` บันทึกวันออกก่อนคิดเงิน | ✅ int: ค้าง 1 คืนคิด 50,000 ไม่คิดวันออก |
| DEF-07 กันข้ามสาขา | `ctx.can(..., { branchId })` หลังโหลด resource | ✅ int: สาขา OTHER อ่านเคส BKK → ForbiddenError |
| DEF-08 OTP production ไม่บอกว่าส่งแล้ว | `issueOwnerOtp` คืนข้อผิดพลาดถ้าเป็น production | ✅ unit: `NODE_ENV=production` → ไม่ ok / ไม่มี devOtp |
| DEF-09 ไม่มี fallback ราคา/VAT7 | `stays.ts` ต้องมี BOARD-NIGHT | ✅ int: ลบรายการบริการแล้วเช็คอินไม่ได้ |
| DEF-10 จำกัด OTP/ล็อกอิน | `rate-limit.ts` (เทสใช้หน่วยความจำ, มี Redis เมื่อ `REDIS_URL`) | ✅ unit: OTP 4 ครั้งที่ 4 ถูกบล็อก; staff 6 ครั้งที่ 6 ถูกบล็อก |

ยังไม่ได้ส่ง SMS จริง และยังไม่ได้ยิง brute force ข้ามหลายโปรเซส — เกณฑ์ปิดข้อ 08 คือห้ามบอกว่าส่งสำเร็จเมื่อยังไม่มีช่องทางส่ง

### 2026-09-18 — ตรวจงานโดยไม่แก้โค้ดธุรกิจ

- อ่าน STATUS/สถาปัตยกรรม/ความปลอดภัย และเทียบเส้นทาง billing, pharmacy, clinical, boarding, scheduling, portal กับเอกสารโดเมน; ตรวจ migrations และสิทธิ์ฐานข้อมูลด้วย
- เปิด defect ใน §2 พร้อมจุดแก้ วิธีทำซ้ำ และเกณฑ์ปิดงาน; ทั้งหมด **OPEN / ยังไม่แก้ / ยังไม่มอบหมาย**
- เพิ่ม `scripts/review-defects.ts` สำหรับทำซ้ำ DEF-01–DEF-07: `npx tsx scripts/review-defects.ts` ใช้ PostgreSQL 16 ใน testcontainer แยกและปิดทิ้งเมื่อจบ; seed ใช้ migrator แต่การทดสอบใช้ `app_user` ไม่แตะข้อมูลคลินิกจริง
- ผลรันชุดเดิม: `npm run typecheck` และ `npm run lint` → exit 0; `npm test` → 22 passed; `npm run test:int` → 11 passed (9 files) **ไม่ครอบคลุม defect ที่พบในรอบนี้**
- `npm run build` → exit 0, สร้าง production build และ static pages 9/9; ไม่ใช่หลักฐานว่า workflow ทั้งหมดถูกต้อง
- `npm run db:check-rls` → exit 1 เพราะสคริปต์ไม่โหลด `.env`; รัน `node --env-file=.env --import tsx scripts/check-rls-coverage.ts` → exit 0, `v_rls_coverage_gaps` ว่าง
- ขอบเขตที่ยังไม่ได้ตรวจ: การคลิก UI/e2e ทั้งวงจร, SMS จริง, deployment จริง และทุกเงื่อนไข concurrency; ไม่ได้อ้างว่าระบบปราศจาก defect อื่น
- มีไฟล์แก้ไข/ไฟล์ใหม่ค้างอยู่ก่อนเริ่มตรวจจำนวนมาก; รอบนี้เพิ่มเฉพาะสคริปต์ทำซ้ำและบันทึกนี้ ไม่ commit/push และไม่แก้งานเดิม

### 2026-09-18 — UI รอบต่อ: เวลาไทย / ยืนยันก่อนทำรายการสำคัญ / คิวเดินได้

ตรวจด้วย `npm run typecheck` + `npm run lint` + `npm test` (22) และ HTTP หลังล็อกอิน `nune@demo.local`

| สิ่งที่ทำ | ไฟล์ | สถานะการตรวจสอบ |
| --- | --- | --- |
| datetime-local ถือเป็นเวลาไทย ไม่ตามโซนเครื่องเซิร์ฟเวอร์ | `src/modules/shared/date.ts` + นัด/ฝาก/พอร์ทัล | ✅ unit 4 เคสใหม่; ตารางวันนี้ใช้ `bangkokBusinessDate` |
| ช่องนัด/ฝาก/พอร์ทัลมีเวลาตั้งต้น, กด Enter ในช่องค้นไม่ส่งฟอร์ม | `live.tsx`, `owner-pet-picker.tsx` | ✅ หน้า appointments/boarding มีป้ายวันและเวลา |
| เวลารอคิวเดินทุก 30 วินาที + ปุ่มรีเฟรชกระดานคิว | `WaitMinutes`, หน้าหลัก/คิว/รับสัตว์/เคส | ✅ HTTP หน้าคิวมี «รีเฟรชคิว» |
| ยืนยันก่อนลงนาม SOAP / ชำระเงิน / ยกเลิกนัด / เช็คเอาท์ / ส่งมอบกรูมมิ่ง | encounter, POS, นัด, ฝาก, กรูมมิ่ง | เขียนแล้ว — confirm เป็น `window.confirm` ต้องคลิกในเบราว์เซอร์ |
| เปิดเคสต้องกรอกน้ำหนัก (เติมค่าล่าสุดให้ถ้ามี) | `reception-desk.tsx` | ✅ หน้า reception มีคำว่าน้ำหนัก |
| 404 ภาษาไทย, พิมพ์ฉลากยาไม่ดึงคิวทั้งหน้า | `src/app/not-found.tsx`, `error.tsx`, pharmacy | ✅ `/bkk/missing-nope` → 404 «ลิงก์นี้ไม่มีในระบบ» |

### 2026-09-18 — UI โรงพยาบาลให้ครบแผนก (ภาษาไทย / ขั้นตอนชัด)

ตรวจด้วย `npm run typecheck` + `npm run lint` + `npm test` (18) และ HTTP จริงหลังล็อกอิน `nune@demo.local` / `jo@demo.local` / `ek@demo.local`

| สิ่งที่ทำ | ไฟล์ | สถานะการตรวจสอบ |
| --- | --- | --- |
| แถบนำทางมีหน้าปัจจุบัน, เมนูมือถือครบ, นาฬิกาไทย | `src/components/staff/staff-shell.tsx`, `layout.tsx` | ✅ HTTP 200 ทุกหน้าแผนกหลังล็อกอิน |
| ป้ายสถานะเป็นภาษาไทยทั้งระบบ (คิว/นัด/ยา/กรูมมิ่ง/บิล) | `src/components/staff/labels.ts`, `ui.tsx` | ✅ หน้า encounter ไม่โชว์ WAITING ให้คนอ่าน |
| ค้นแล้วเลือกคน/สัตว์จากรายการ ไม่เดาผลแรก | `owner-pet-picker.tsx` + นัด/ฝาก/กรูมมิ่ง/POS | ✅ หน้า POS มีคำว่าเลือกลูกค้าก่อนคิดเงิน |
| หน้าหลักมีคิวรอจริง + งานถัดไป | `src/app/(staff)/[branch]/page.tsx` | ✅ HTTP 200 «สวัสดีตอนเช้า คุณนุ่น ต้อนรับ» |
| SOAP ฟิลด์ไทย, สัญญาณชีพ, ประวัติที่ลงนาม, โปรไฟล์สัตว์/เจ้าของ | `encounters/.../workspace.tsx`, `clients/[ownerId]`, `pets/[petId]` | ✅ เปิดเคสจริง + โปรไฟล์แพร/ข้าวปุ้น 200 |
| พอร์ทัลเจ้าของ: จองมีป้ายกำกับ, นัด/บิล/บันทึกดูแลเป็นไทย | `src/app/portal/` | ✅ หน้า login พอร์ทัล 200 |

ยังไม่ได้คลิกเดินทั้งวงจรในเบราว์เซอร์จริง (ไม่มี Playwright ในเครื่องนี้) — ตรวจจาก HTML ที่เซิร์ฟเวอร์เรนเดอร์หลังล็อกอิน

### 2026-09-18 — เฟส 1 วงจรคลินิก + UI โรงพยาบาลสัตว์สีสัน

ตรวจด้วย `npm run typecheck` + `npm run lint` + `npm test` (18) + `npm run test:int` (11, Docker) และ HTTP จริงหลังล็อกอิน `nune@demo.local`

| สิ่งที่ทำ | ไฟล์ | สถานะการตรวจสอบ |
| --- | --- | --- |
| ระบบสี cream/teal/coral + แถบนำทางพนักงาน | `src/app/globals.css`, `src/app/(staff)/[branch]/layout.tsx` | ✅ หน้า login/dashboard 200 หลังล็อกอิน |
| SOAP ร่าง/ลงนาม/addendum + vital + คำสั่ง lab | `src/modules/clinical/` | ✅ int test ลงนามแล้วแก้ไม่ได้ |
| สั่งยาตามน้ำหนัก + จ่ายยา FEFO + ChargeItem ใน tx เดียว | `src/modules/pharmacy/` | ✅ int test US-07 ตัดล็อตหมดอายุก่อน, unit dose 14 เม็ด |
| VAT ระดับบิล + ออกบิลจองเลขตอนออก + ห้ามแก้หลัง ISSUED | `src/modules/tax/compute-invoice-totals.ts`, `src/modules/billing/` | ✅ unit 3 + int ออก INV แล้ว trigger บล็อกแก้ยอด |
| POS รวมรายการค้าง + ตัดสต็อกตอนปิดบิล | `src/app/(staff)/[branch]/pos/` | ✅ HTTP 200, สินค้าหน้าร้านโชว์ (ยา RX ถูกซ่อน) |
| คลังรับเข้าล็อต + ผังกรง + ค่าห้อง idempotent | `inventory/`, `boarding/` | ✅ int รันคิดค่าห้องซ้ำยอดไม่เพิ่ม; หน้ากรง 200 |
| กรูมมิ่งคิว + พอร์ทัลจอง/ดูสัตว์/ใบเสร็จ | `grooming/`, `src/app/portal/` | ✅ หน้า 200; จองพอร์ทัลเป็น REQUESTED |
| seed แค็ตตาล็อก ยา อาหาร กรง 6 ใบ TaxProfile ~80 ลูกค้า | `prisma/seed-demo.ts` | ✅ `prisma db seed` ผ่าน |
| รีวิว TL: นุ่นโดน 500 ที่ห้องยา/คลัง/POS | หน้า Forbidden + `searchProducts` รับ `billing:read` + เคสใช้ `patient:read` | ✅ pharmacy/inventory 200 (ข้อความไม่มีสิทธิ์), POS 200 |
| กติกาห้าม AI Slop เป็น AGENTS.md §11 + เช็กลิสต์ §11.5 ผูกเข้า Definition of Done §9 | `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, `.cursor/rules/petcare.mdc`, `.github/copilot-instructions.md` | เอกสารล้วน ไม่แตะโค้ด — ยังไม่มี lint rule บังคับ (ตรวจด้วยคนตอนรีวิว) |
| บันทึกคำตอบ Q2/Q3/Q4 + เปิด Q6 (VAT สินค้า) | `docs/06-billing-pos-and-tax.md` §6.2, `docs/05-inventory-and-pharmacy.md` §6.1, `docs/11-data-import.md` (ใหม่), `AGENTS.md` §4 | เอกสารล้วน ไม่แตะโค้ด — ยังไม่ได้ทำรายงานยาควบคุมและเครื่องมือนำเข้า |
| ออกแบบคอนโซลผู้ดูแล 22 หน้าจอ (ADM-01…17, PLT-01…05) + เมทริกซ์สิทธิ์ + ช่องว่างสคีมา G1-G5 | `docs/12-admin-console.md` (ใหม่), `docs/01-architecture.md` §4, `AGENTS.md` §4 | เอกสารออกแบบล้วน ยังไม่มีโค้ด — ทุกฟิลด์ที่อ้างถึงตรวจกับ `prisma/schema.prisma` แล้ว |
| ผังเส้นทางทั้งระบบ (sitemap) ครอบคลุม staff / portal / platform / API + ตารางเส้นทาง settings → ADM | `docs/01-architecture.md` §4.1 | เอกสารล้วน — เส้นทางที่มีอยู่จริงตรวจกับ `src/app/` แล้ว ที่เหลือเป็นเป้าหมายการออกแบบ |
| ออกแบบรองรับสองภาษา ไทย/อังกฤษ 100% — คลังข้อความ, error เป็น code+params, ข้อมูล/เอกสารสองภาษา, เกณฑ์ทดสอบ | `docs/13-i18n.md` (ใหม่), `AGENTS.md` (กติกาภาษา + แผนที่เอกสาร), `docs/12` ADM-18, `docs/01` §4.1 | เอกสารออกแบบล้วน — ยังไม่เลือกไลบรารี (Q8) และยังไม่แตะโค้ด |
| หน้าแรก `/` เป็นหน้าเว็บจริง — ทางเข้าพนักงาน (`/login`) และเจ้าของสัตว์ (`/portal/login`) + ชื่อคลินิกจาก subdomain | `src/app/page.tsx`, `src/server/public-tenant.ts` (ใหม่) | ✅ `typecheck` + `lint` + `npm test` (26 ผ่าน) + HTTP 200 จริงที่ `/` มีลิงก์ทั้งสองทางและชื่อคลินิกจากฐานข้อมูล · **หนี้:** ข้อความยังฝังในไฟล์ รอ i18n ระยะ A (docs/13) · เส้นทาง redirect ของผู้ที่ล็อกอินแล้วไม่ได้แก้และไม่ได้ทดสอบซ้ำในรอบนี้ |

### 2026-09-17 — ออกแบบระบบทั้งชุด

| สิ่งที่ทำ | ไฟล์ | สถานะการตรวจสอบ |
| --- | --- | --- |
| เอกสารออกแบบ 11 ไฟล์ | `README.md`, `docs/00` … `docs/10` | เขียนเสร็จ ยังไม่มีคนรีวิว |
| สคีมาฐานข้อมูล 80+ ตาราง | `prisma/schema.prisma` | ✅ ผ่าน `prisma validate` และ `prisma format` แล้ว (Prisma 6.19.3) |
| SQL สำหรับ RLS / trigger / constraint | `prisma/migrations/manual/001_rls_and_constraints.sql` | ⚠️ **ยังไม่เคยรันกับ PostgreSQL จริง** |
| ตัวแปรสภาพแวดล้อม | `.env.example` | เขียนเสร็จ |
| ไฟล์บริบทสำหรับ AI | `AGENTS.md`, `CLAUDE.md`, `.cursor/`, `.github/` | เขียนเสร็จ |
| **แก้ชื่อคอลัมน์ให้เป็น snake_case** — ใส่ `@map` 729 ฟิลด์ | `prisma/schema.prisma` | ✅ แก้แล้ว + `prisma validate` ผ่าน |

### 2026-09-17 — สร้าง GitHub repo

| สิ่งที่ทำ | ไฟล์ | สถานะการตรวจสอบ |
| --- | --- | --- |
| `git init` + remote `origin` | https://github.com/yutinfo/petcare-clinic.git | ✅ เชื่อมแล้ว |
| `.gitignore` สำหรับ Next.js / env / เทส | `.gitignore` | เขียนเสร็จ |

### 2026-09-17 — เฟส 0 รากฐาน

ผู้ใช้สั่งให้ทำตามเอกสาร (ไม่รอเลือก A/B) → เดินเส้นทาง A ตาม roadmap

| สิ่งที่ทำ | ไฟล์ | สถานะการตรวจสอบ |
| --- | --- | --- |
| โครง Next.js 15 + TS strict + Tailwind 4 + ปุ่ม shadcn | `package.json`, `src/app/`, `src/components/ui/button.tsx` | ✅ `npm run build` ผ่าน (Next 15.5.25) |
| ESLint ห้าม `modules/` import `next/*` และ `@/app` | `eslint.config.mjs` | ✅ `npm run lint` ผ่าน |
| docker-compose (postgres 16, redis, minio จาก quay.io, mailhog) | `docker-compose.yml` | ✅ `docker compose up -d` แล้ว postgres healthy |
| migration สคีมา + RLS/trigger | `prisma/migrations/20260917120000_init`, `...20001_rls_and_constraints` | ✅ `prisma migrate deploy` กับ Postgres 16 จริง และกับ testcontainers |
| `AppContext` + `set_config('app.tenant_id')` + emit → OutboxEvent | `src/server/context.ts` | ✅ เทส outbox ผ่าน |
| เทส RLS "อ่านข้าม tenant ไม่ได้" + WITH CHECK + `v_rls_coverage_gaps` ว่าง | `src/server/db/rls.int.test.ts` | ✅ `npm run test:int` ผ่าน (5 tests) |
| Auth.js v5: staff (รหัสผ่าน+TOTP) / owner (OTP เบอร์โทร) | `src/server/auth/` | เขียนแล้ว ยังไม่มีเทสล็อกอินจริง / ยังไม่มีหน้า login |
| seed permission + บทบาทสำเร็จรูป 9 แบบพนักงาน + PET_OWNER | `prisma/seed.ts`, `src/modules/identity/permissions.ts` | ✅ `npx prisma db seed` ผ่าน (ใช้ `MIGRATE_DATABASE_URL`) |
| AuditLog helper + Outbox worker (BullMQ) | `src/server/audit.ts`, `src/server/jobs/` | drainOutbox เทสผ่าน; โปรเซส `npm run worker` ยังไม่ได้รันค้าง |
| money / bahtText / วันที่ พ.ศ. / DocumentSequence | `src/modules/shared/`, `src/modules/tax/` | ✅ unit 9 tests + int sequence ผ่าน |
| CI | `.github/workflows/ci.yml` | เขียนแล้ว ยังไม่เห็นผลรันบน GitHub |

### 2026-09-17 — หน้า login + เคาน์เตอร์เช็คอิน

| สิ่งที่ทำ | ไฟล์ | สถานะการตรวจสอบ |
| --- | --- | --- |
| หน้า login พนักงาน + OTP เจ้าของสัตว์ | `src/app/login/`, `src/app/portal/` | ✅ ล็อกอิน `nune@demo.local` แล้วได้ cookie จริง |
| middleware กันหน้า staff ถ้ายังไม่ล็อกอิน + slug จาก host/localhost | `src/middleware.ts`, `src/server/tenancy.ts` | ✅ `/bkk/reception` ไม่มีเซสชัน → 307 `/login` |
| seed คลินิก `demo` สาขา BKK + นุ่น/หมอเอก + แพร/ข้าวปุ้น | `prisma/seed-demo.ts` | ✅ `prisma db seed` ผ่าน |
| ค้นหาช่องเดียว (ชื่อ/เบอร์/รหัส) | `src/modules/crm/search-clients.ts` | ✅ int test ผ่าน |
| สร้างลูกค้าใหม่ 4 ช่อง | `src/modules/crm/create-owner-pet.ts` + ฟอร์มในหน้าเคาน์เตอร์ | เขียนแล้ว ตรวจผ่านหน้า UI ว่าฟอร์มโชว์ |
| เช็คอิน → Encounter + น้ำหนัก + คิววันนี้ | `src/modules/clinical/check-in.ts`, `src/app/(staff)/[branch]/reception/` | ✅ int test + เปิดเคสจริงได้ `VN-BKK-2569-000001` หน้า encounter แสดงน้ำหนัก/แพ้ยา |

> **บันทึกการแก้จุดบกพร่อง (2026-09-17):** สคีมาฉบับแรกไม่ได้ใส่ `@map` ทำให้ Prisma
> สร้างคอลัมน์เป็น camelCase (`"tenantId"`) ขณะที่ SQL ทุกไฟล์อ้างเป็น snake_case
> (`tenant_id`) — RLS policy และ trigger ทั้งหมดจะรันไม่ผ่าน แก้แล้วด้วย
> `prisma-case-format --map-field-case=snake` โดย**คงชื่อตารางเป็น PascalCase**
> เพื่อให้ตรงกับ SQL ที่เขียนไว้ (กติกาการตั้งชื่ออยู่ใน [AGENTS.md §6](../AGENTS.md))

**ข้อตกลงที่ผู้ใช้เลือกไว้แล้ว:** Next.js + PostgreSQL · multi-tenant SaaS หลายคลินิก ·
ใบเสร็จ/ภาษีตามระเบียบไทย · พอร์ทัลลูกค้าจองออนไลน์
(ยังไม่เลือก: การแจ้งเตือนผ่าน LINE — ออกแบบเป็น adapter รอไว้แล้วแต่ยังไม่ทำ)

---

## 2. คิวงานถัดไป (เรียงตามลำดับที่ควรทำ)

### รีวิวคุณภาพโค้ด 2026-09-18 — CQ-01–CQ-07 ปิดแล้ว 2026-09-18

ทุกรายการยังไม่แก้/ยังไม่มอบหมาย; P1 = กระทบความถูกต้องหรือหลักฐานย้อนหลัง ควรแก้ก่อนใช้งานจริง, P2 = ปรับเครื่องมือตรวจและการดูแลโค้ด ไม่ใช่ข้อเสนอ refactor ทั้งระบบ

#### CQ-01 · P1 · Validation/Pharmacy — TypeScript type แทน runtime validation ไม่ได้ · ✅ ปิด

- หลักฐาน: `src/app/(staff)/[branch]/encounters/[id]/actions.ts:72` ส่ง input เข้า `prescribe` ตรง ๆ ไม่มี zod; `src/modules/pharmacy/prescribe.ts:60` สาขากรอก doseAmount ไม่ตรวจค่าบวก/จำนวนวัน เหมือนสาขาคำนวณ mg/kg; การค้น `zod`, `safeParse`, `z.object` ใน src ไม่พบ schema
- ทำซ้ำ: `npx tsx scripts/review-code-quality.ts` → doseAmount `-2`, durationDays `7`, BID สร้างใบสั่งยา totalQtyBase `-28` และข้อความ “กินครั้งละ -2 เม็ด” สำเร็จ ไม่ได้ทดสอบการให้ยาจริง
- ปรับปรุง: ใช้ zod schema ร่วมที่ขอบ client/server ตาม AGENTS §6 และ docs/09; enforce กฎจำนวนยาใน use-case ทุกเส้นทาง เพิ่มเทสค่าติดลบ/ศูนย์/รูปแบบผิดที่ต้องไม่สร้าง Prescription/Outbox; สำรวจ vitals/stock/POS actions ที่รับข้อมูลตรงด้วย

#### CQ-02 · P1 · Transaction — event buffer มีอายุเท่ากับ context แทน transaction · ✅ ปิด

- หลักฐาน: `src/server/context.ts:36,46,51–60` เก็บ pending นอก callback และล้างเฉพาะเส้นทางสำเร็จ
- ทำซ้ำ: ใน context เดิม สร้าง owner + emit แล้ว throw ให้ rollback จากนั้นเรียก tx อ่านข้อมูล → ผล `ownerRows=0` แต่ `eventRows=1`; event ของงานล้มถูก flush โดย tx ถัดไปจริง
- ปรับปรุง: ผูก buffer/emit กับ transaction ที่เป็นเจ้าของ ไม่ใช้ array ร่วมระหว่าง concurrent tx; เทส rollback แล้ว reuse context และ concurrent tx ที่สำเร็จ/ล้มแยกกัน โดย event ต้อง commit/rollback พร้อมข้อมูลของตัวเอง

#### CQ-03 · P1 · Audit — helper มีอยู่แต่ไม่มี use-case เรียก · ✅ ปิด

- หลักฐาน: `src/server/audit.ts:13` ประกาศ writeAuditLog; `rg -n 'writeAuditLog|auditLog\.' src` พบเฉพาะตัว helper (และ probe ของรอบนี้) ไม่พบการเรียกใน use-case; migrations มี trigger ห้ามแก้ AuditLog แต่ไม่ได้สร้าง log ให้ธุรกรรม
- ทำซ้ำ: script สร้าง/ลงนาม SOAP ผ่าน actor พนักงาน → signed สำเร็จ แต่ auditRows `0`; OutboxEvent ไม่ได้บันทึกผู้กระทำ/before/after แทน audit ตาม docs/08 §3
- ปรับปรุง: เชื่อม audit กับ use-case สำคัญที่มีอยู่แล้ว เช่น SOAP/ยา/ออกบิล ใน tx เดียวกัน ระบุ actor/entity/action ตามเอกสาร; เทส log ของงานสำเร็จและไม่เหลือ log เมื่องาน rollback ไม่เพิ่มเพียง helper ใหม่ที่ไม่มีคนเรียก

#### CQ-04 · P2 · Integration tests — fixture ข้ามทั้ง RLS และสิทธิ์พนักงาน · ✅ ปิด

- หลักฐาน: `src/test/clinic-fixture.ts:76–80` สร้าง ctx ด้วย db ที่รับมาและ SYSTEM_ACTOR; billing/pharmacy/boarding เรียก seedMiniClinic(h.migrator) แล้วใช้ f.ctx ทดสอบ use-case ขณะที่ system ข้าม ability checks; แม้เทส encounter ใช้ actor staff ก็ยังส่ง h.migrator
- ผลกระทบ: เทสเหล่านี้พิสูจน์ business/trigger ได้ แต่ไม่พิสูจน์ว่าบทบาทจริงทำรายการได้หรือ RLS ป้องกันเส้นทางนั้น มีชุด RLS แยกอยู่แล้วจึงไม่ใช่การกล่าวว่าไม่มีเทส RLS
- ปรับปรุง: ใช้ migrator เฉพาะ seed และใช้ h.app + actor/permissions จริงเรียก use-case; เพิ่มกรณีไม่มีสิทธิ์/ต่าง tenant สำหรับ workflow สำคัญ โดยไม่ทำซ้ำทุก permutation ที่ไม่มีความเสี่ยง

#### CQ-05 · P2 · Test assertion — assertion VAT ผ่านได้เมื่อ VAT ผิด · ✅ ปิด

- หลักฐาน: `src/modules/billing/invoice.int.test.ts:26` ใช้ `vat + (35000 - vat) === 35000` ซึ่งยังเป็นจริงเมื่อ vat เป็น 0 หรือค่า integer อื่น ไม่ได้พิสูจน์สูตร VAT ตามชื่อเทส
- ปรับปรุง: assert ค่าคาดหวังที่คำนวณอิสระ (fixture นี้ VAT รวมในราคา 35,000 สตางค์ อัตรา 7% → VAT 2,290) และผลรวม InvoiceLine.vatSatang เท่ากับยอด VAT บิล; ทดสอบว่าเปลี่ยนผลคำนวณผิดแล้วเทสแดง ไม่ลบเทสเดิมเพื่อกลบปัญหา

#### CQ-06 · P2 · Architecture/lint — relative import หลบกฎ public API ได้ · ✅ ปิด

- หลักฐาน: `eslint.config.mjs:38` จับเฉพาะรูปแบบ `@/modules/*/*`; script เรียก ESLint.lintText ในบริบท src/modules/billing: import `@/modules/clinical/soap` ได้ no-restricted-imports แต่ `../clinical/soap` ได้ errors `[]`
- ผลกระทบ: กฎที่ AGENTS §6 กำหนดว่าเข้าผ่าน index เท่านั้นยังบังคับได้ไม่ครบ; เป็นช่องว่างเครื่องมือตรวจ ไม่ได้ยืนยันว่ามี relative import ผิดในโค้ดปัจจุบัน
- ปรับปรุง: ตรวจ resolved path ทั้ง alias/relative โดยยังอนุญาต import ภายในโมดูลเดียวกัน; เพิ่มเคสทดสอบกฎ lint สำหรับทั้งสองรูปแบบและ public API ที่ถูกต้อง

#### CQ-07 · P2 · Tests/CI — วันเวลาตายตัวทำให้เทสแดงเอง · ✅ ปิด

- หลักฐาน: `src/modules/boarding/stay.int.test.ts:25–37` เรียก checkInStay ซึ่งใช้ new Date() แต่ expectedOutAt ตายตัว `2026-09-18T10:00:00+07:00` แล้วจึงพยายามแก้ checkInAt ย้อนหลังภายหลัง
- ผลรันจริง: `npm run test:int` วันที่ 18 ก.ย. หลัง 10:00 → เคส “คิดค่ารายวันแบบ idempotent — รันซ้ำยอดเท่าเดิม” ล้มตอนสร้าง stay ด้วย `range lower bound must be less than or equal to range upper bound`; 18 passed / 1 failed, CI เรียกชุดเดียวกัน
- ปรับปรุง: ควบคุมนาฬิกาหรือ seed ช่วงเวลาให้สอดคล้องก่อนเรียก use-case; ยังคง assert ว่าคิดซ้ำไม่เพิ่มยอด สำรวจ `dispense.int.test.ts:21` ที่ใช้ล็อต `2026-10-01` เป็นล็อตใช้ได้ด้วย เพราะจะหมดอายุจริงตามเวลา ห้ามเลื่อนวันไปไกล ๆ อย่างเดียวแล้วถือว่าแก้ถาวร

### Defect จากการตรวจ 2026-09-18 — ปิดแล้ว 2026-09-18

P1 = ควรแก้ก่อนใช้งานจริง
DEF-01–07 เดิมยืนยันด้วย `npx tsx scripts/review-defects.ts`; ปิดด้วยเทส regression ที่แดงได้ถ้าถอยพฤติกรรม

#### DEF-01 · P1 · Pharmacy/Inventory — จ่ายล็อตหมดอายุได้ · ✅ ปิด

- จุดแก้: `src/modules/inventory/fefo.ts:26` กรองเพียง `isQuarantined: false` แล้วเรียง expiry แต่ไม่ตัดล็อตหมดอายุ; ขัด `docs/05` §3
- ทำซ้ำ/ผลจริง: seed ล็อต `EXPIRED` หมดอายุ `2000-01-01` จำนวน 100 แล้วสั่ง/จ่าย 14 → คืนล็อตนี้ 14 หน่วยและสร้างค่าใช้จ่ายสำเร็จ
- เกณฑ์ปิด: ไม่จ่าย/ขายล็อตหมดอายุ; เทสขอบวันหมดอายุตามวันธุรกิจไทย และกรณีมีแต่ของหมดอายุต้อง rollback ทั้งสต็อก/Dispense/ChargeItem

#### DEF-02 · P1 · Clinical/RBAC — สิทธิ์อ่านทะเบียนอ่าน SOAP ได้ · ✅ ปิด

- จุดแก้: `src/modules/clinical/encounter.ts:7` ตรวจ `patient:read` แต่คืน `soapNotes`, addenda และ `priorSoap`; ขัด `docs/08` §2.2 ที่ห้าม receptionist อ่านเวชระเบียน
- ทำซ้ำ/ผลจริง: actor พนักงานมีเพียง `patient:read` เรียก `getEncounterWorkspace` → ได้ assessment `ข้อมูลตรวจเฉพาะแพทย์`
- เกณฑ์ปิด: จำกัดข้อมูล clinical ที่ server ตาม `clinical:read`; หน้าทะเบียน/คิวของ receptionist ยังทำงานได้ แต่ response ต้องไม่มี SOAP/ประวัติที่ไม่มีสิทธิ์ ไม่ใช่แค่ซ่อนใน UI

#### DEF-03 · P1 · Clinical/DB — ล้างวันลงนามแล้วแก้ SOAP ได้ · ✅ ปิด

- จุดแก้: `prisma/migrations/20260917120001_rls_and_constraints/migration.sql:201` ตรวจเฉพาะข้อความ 4 ช่อง ไม่ป้องกันการเปลี่ยน `signed_at`/ตัวผู้ลงนาม และไม่มี trigger ห้าม DELETE บน SoapNote
- ทำซ้ำ/ผลจริง: ลงนาม → ใช้ `app_user` UPDATE `signedAt=null` → `saveSoapDraft` แก้ assessment สำเร็จ; นี่เป็นช่องโหว่ด่าน DB ไม่ได้ยืนยันว่ามีปุ่มล้างลายเซ็นใน UI
- เกณฑ์ปิด: migration ใหม่บังคับ invariant §3 ข้อ 5 รวมการล้าง/เปลี่ยนลายเซ็นและลบ; พิสูจน์ด้วย app_user ว่าแก้ไม่ได้ แต่เพิ่ม addendum ได้

#### DEF-04 · P1 · Billing — ออกบิล/รับเงินซ้ำเมื่อเรียกพร้อมกัน · ✅ ปิด

- จุดแก้: `src/modules/billing/invoice.ts:21` อ่าน OPEN โดยไม่ล็อก; `:115` update ไม่ตรวจสถานะเดิม/จำนวนแถวที่ claim ได้; transaction ใน `src/server/context.ts` ไม่ได้กำหนด serializable
- ทำซ้ำ/ผลจริง: `Promise.allSettled` เรียก `issueInvoiceFromCharges` สอง context สำหรับ chargeIds เดียวกันพร้อม `CASH` → ได้ INV สองเลขและรับเงินทั้งคู่ (รอบแรก 51,800 สตางค์ต่อใบ)
- เกณฑ์ปิด: charge ชุดเดียวสร้าง invoice/payment/การตัดสต็อกได้ครั้งเดียวเมื่อ concurrent/retry; อีกคำขอต้องคืนผลเดิมหรือปฏิเสธอย่างชัดเจน; ตรวจ rollback และเลขเอกสารด้วย

#### DEF-05 · P1 · Billing/DB — ย้อนบิลออกแล้วเป็น DRAFT แล้วแก้ยอดได้ · ✅ ปิด

- จุดแก้: migration SQL เดียวกัน `:165` ปล่อยให้แก้ status และยกเว้นทุกการแก้เมื่อ OLD.status เป็น DRAFT; whitelist ฟิลด์ยังไม่ครอบคลุม snapshot ผู้ขาย/ที่อยู่
- ทำซ้ำ/ผลจริง: `app_user` เปลี่ยนบิล PAID → DRAFT → UPDATE `grandTotalSatang=1` สำเร็จ ทั้งที่มีบรรทัดบิลและเงินรับเดิม; ไม่ได้อ้างว่ามี UI ทำรายการนี้
- เกณฑ์ปิด: migration ใหม่ห้ามย้อนกลับ DRAFT/แก้ snapshot หลังออก; เทสฟิลด์คุ้มครองทั้งหมดและ transition ที่อนุญาตสำหรับรับเงิน/ยกเลิก

#### DEF-06 · P1 · Boarding/Billing — เช็คเอาท์คิดเพิ่มหนึ่งคืน · ✅ ปิด

- จุดแก้: `src/modules/boarding/stays.ts:135` คิดเงินก่อนบันทึก checkOutAt; `:179` จึงรวมวันออกเป็นคืนที่คิดเงินด้วย; ขัด `docs/04` §5.3
- ทำซ้ำ/ผลจริง: เข้าวันที่ 17 ก.ย. ออกเช้า 18 ก.ย. → สร้างค่าห้องวันที่ 17 และ 18 รวม 100,000 สตางค์ แทนหนึ่งคืน 50,000 (ยังไม่ถึงเวลาเช็คเอาท์มาตรฐาน)
- เกณฑ์ปิด: คืนค้างนับ [วันเข้า, วันออก) ส่วนค่าปรับใช้กติกาที่ตั้งไว้; เทสเข้า 17 ออก 20 = 3 คืน และ job ก่อน/หลัง checkout ไม่คิดซ้ำ

#### DEF-07 · P1 · Clinical/RBAC — อ่านเคสข้ามสาขาที่ไม่มีสิทธิ์ได้ · ✅ ปิด

- จุดแก้: `src/modules/clinical/encounter.ts:9` ค้นด้วย id อย่างเดียว และ `ctx.can` ไม่ส่ง resource.branchId; RLS จำกัด tenant ไม่ได้จำกัด branch
- ทำซ้ำ/ผลจริง: context พนักงานได้รับเฉพาะสาขา OTHER พร้อม patient/clinical:read ส่ง encounterId สาขา BKK ใน tenant เดียวกัน → ได้ข้อมูลเคส BKK
- เกณฑ์ปิด: ตรวจสิทธิ์สาขาของ resource ที่โหลดจริง; เพิ่มเทสอนุญาต/ปฏิเสธข้ามสาขา และสำรวจ use-case ที่รับ id ตรง เช่น getInvoice/cancelBooking/dispensePrescription ด้วย (ยังไม่ได้ยืนยันทุกเส้นทาง)

#### DEF-08 · P1 · Auth/Portal — ขอ OTP ใน production สำเร็จแต่ไม่ส่งรหัส · ✅ ปิด

- จุดแก้: `src/app/portal/login/actions.ts:14` และ `src/app/api/auth/otp/route.ts:19` เรียก storeOwnerOtp แล้วคืน ok; มีเพียง devOtp/console ใน non-production ไม่มี SMS provider หรือ enqueue ส่งรหัส
- ทำซ้ำที่ผู้แก้ต้องยืนยัน: production + เบอร์ ACTIVE → ขอ OTP ได้ ok แต่ไม่มีเส้นทางส่งรหัสให้เจ้าของ ทำให้ล็อกอินตามขั้นตอนไม่ได้; รอบนี้ยืนยันจากโค้ด ไม่ได้ส่ง SMS จริง
- เกณฑ์ปิด: เชื่อมช่องทางส่ง OTP และทดสอบการส่งสำเร็จ/ล้มเหลว; ถ้ายังไม่ตั้งค่าต้องไม่แจ้งว่าส่งสำเร็จ และไม่เผยรหัสใน production response/log

#### DEF-09 · P1 · Boarding — คิดราคาและภาษีต่อได้แม้ไม่พบรายการบริการ · ✅ ปิด

- จุดแก้: `src/modules/boarding/stays.ts:117,191,208` fallback ราคา 50,000 และ taxCode VAT7 เมื่อหา service ไม่พบ; ขัด AGENTS §11.1 เรื่องค่าธุรกิจต้องมาจาก DB/ผู้ใช้ ประเด็นนี้คือการข้าม configuration ที่หาย ไม่ใช่การตัดสินว่าบริการต้องเสียภาษีประเภทใด
- เงื่อนไขจากโค้ด: กรงไม่มี dailyRateService และไม่มี BOARD-NIGHT → เช็คอิน/คิดค่าห้องได้ด้วยค่าที่ผู้ใช้ไม่ได้กำหนด
- เกณฑ์ปิด: ขาดรายการบริการ/ราคาที่ตั้งไว้ต้องปฏิเสธพร้อมข้อความให้ตั้งค่า; ทดสอบไม่เกิด charge จาก fallback และใช้ taxCode จาก configuration ที่ได้รับอนุมัติ

#### DEF-10 · P1 · Auth — ไม่มีการจำกัดการขอ/ลอง OTP และล็อกอิน · ✅ ปิด

- จุดแก้: `src/server/auth/otp.ts:44` การตรวจผิดไม่เพิ่ม attempt counter/lockout; request action/route และ staff authorize ใน `src/server/auth/config.ts:87` ไม่มี rate limiter; ขัด `docs/08` §4
- หลักฐานจากโค้ด: OTP ผิดคืน false โดยคงรหัสเดิมจน TTL, ขอใหม่ทับรหัสได้เรื่อย ๆ; ไม่ได้ยิง brute force ในรอบตรวจนี้
- เกณฑ์ปิด: ทดสอบเพดานขอ OTP 3 ครั้ง/15 นาที/เบอร์และ staff login 5 ครั้ง/15 นาที/บัญชีตามเอกสาร พร้อมจำกัด verify OTP; ต้องบังคับร่วมกันทุก endpoint และทุก instance

### 🔜 งานถัดไปทันที

1. [ ] Playwright e2e เส้นทาง walk-in 60 วินาที (แพ็กเกจยังไม่ติดตั้ง)
2. [ ] ปิดกะเงินสด + ใบลดหนี้ (เฟส 2 ที่ยังไม่ทำ)
3. [ ] รายงานผู้บริหาร / SSE whiteboard จริง (ตอนนี้รีเฟรชหน้า)
4. [ ] Seed ลูกค้าครบ 500 (ตอนนี้ ~80)
5. [ ] จับเวลา walk-in กับเจ้าหน้าที่จริง
6. [ ] เข้ารหัส `mfaSecret`, รัน worker ค้างกับ Redis
7. [ ] เฟส 3-4 ที่ยังไม่ทำ: LINE, e-Tax, หลายสาขา, onboarding SaaS
8. [x] รายงานทะเบียนยาควบคุม PDF/CSV ตาม [docs/05 §6.1](05-inventory-and-pharmacy.md) — พิมพ์ HTML/CSV แล้ว (ยังต้องให้เภสัชกรยืนยันก่อนยื่นจริง)
9. [ ] เครื่องมือนำเข้าข้อมูล ตาม [docs/11-data-import.md](11-data-import.md) — **ต้องขออนุมัติเพิ่ม `external_ref` + ตาราง `ImportBatch` ก่อน**
10. [ ] คอนโซลผู้ดูแล ระยะ A ตาม [docs/12 §7](12-admin-console.md) — แค็ตตาล็อก + `taxCode` + `TaxProfile` + ผู้ใช้ (ต้องเพิ่ม G3 ก่อน)
11. [ ] i18n ระยะ A ตาม [docs/13 §12](13-i18n.md) — วางคลังข้อความ + ตัวสลับภาษา **ควรทำก่อนเริ่มคอนโซลผู้ดูแล** ไม่งั้นต้องกลับมารื้อข้อความ 17 หน้า (รอ Q8)

**เฟส 0 ที่ยังไม่จบ (ให้ AI ตัวถัดไปต่อจากตรงนี้ได้)**
1. [x] `package.json` + Next.js 15 + TypeScript strict + Tailwind + shadcn/ui (ปุ่มอย่างเดียว ยังไม่มีชุดคอมโพเนนต์ครบ)
2. [x] ESLint บังคับขอบเขตโมดูล (`no-restricted-imports` ใน `src/modules/**`)
3. [x] `docker-compose.yml`
4. [x] `prisma migrate deploy` รวม RLS — **พิสูจน์กับ PostgreSQL 16 จริงแล้ว**
5. [x] `AppContext` + `withTenant` (ไม่ได้ห่อทุก query เป็น transaction ตามตัวอย่างใน docs/01 เพราะช้า — ใช้ `ctx.tx` เป็นทางหลัก)
6. [x] เทส RLS ด้วย testcontainers
7. [x] Auth.js สองเส้นทาง + หน้า login — ล็อกอินพนักงานตรวจด้วย HTTP จริงแล้ว
8. [x] `AuditLog` helper + `drainOutbox` — ⚠️ ยังไม่ได้รัน worker ค้างกับ Redis
9. [x] ยูทิลิตี้เงิน/วันที่/`bahtText`/`DocumentSequence`
10. [x] CI workflow — ⚠️ ยังไม่เห็นผลรันบน GitHub
11. [x] หน้า login พนักงาน + ขอ OTP เจ้าของสัตว์
12. [x] middleware — localhost ใช้ `DEV_TENANT_SLUG=demo`; subdomain ใช้ slug จริง
13. [ ] Playwright (`test:e2e` ยังไม่มีแพ็กเกจ)
14. [x] seed คลินิกตัวอย่าง (นุ่น, หมอเอก, แพร/ข้าวปุ้น + เจ้าของอีก 20 คน)

**เส้นทาง B — prototype หน้าเช็คอิน**
1. [x] Next.js + Prisma + Postgres ในเครื่อง
2. [ ] Seed ข้อมูลปลอม 500/800 — ตอนนี้มีตัวอย่าง ~20 รายเพื่อให้หน้าใช้งานได้ (ยังไม่ถึง 500)
3. [x] หน้าค้นหาช่องเดียว
4. [x] ฟอร์มสร้างลูกค้าใหม่ 4 ช่อง
5. [x] เช็คอิน → Encounter + น้ำหนัก
6. [ ] **จับเวลากับเจ้าหน้าที่จริง: เปิดเคส walk-in ต้องเสร็จใน 60 วินาที**

> รากฐานพร้อมแล้ว งานที่มีคุณค่าต่อคลินิกคือหน้าเช็คอิน
> (ดู [docs/10-roadmap.md §10](10-roadmap.md))

### ⏳ หลังจากนั้น

ตามลำดับเฟสใน [docs/10-roadmap.md](10-roadmap.md) — เฟส 1 (MVP) → เฟส 2 (ฝากเลี้ยง+
กรูมมิ่ง+ภาษีเต็มรูป) → เฟส 3 (พอร์ทัล+แจ้งเตือน) → เฟส 4 (หลายสาขา+SaaS)

---

## 3. คำถามที่รอคำตอบจากมนุษย์

| # | คำถาม | รอใคร | บล็อกอะไร | สถานะ |
| --- | --- | --- | --- | --- |
| Q1 | เริ่มเส้นทาง A หรือ B? | ผู้ใช้ | งานถัดไปทั้งหมด | ✅ ตอบแล้ว: ทำตามเอกสาร = เฟส 0 (A) ก่อน แล้วค่อยหน้าเช็คอิน (B) |
| Q2 | บริการสัตวแพทย์เสีย VAT หรือไม่ แต่ละรายการควรตั้ง `taxCode` เป็นอะไร | ผู้ทำบัญชีของคลินิก | seed แค็ตตาล็อกบริการ, เทสการออกใบกำกับภาษี | ✅ ตอบแล้ว 2026-09-18 (ผู้ใช้): **เสีย VAT** → `ServiceItem` ทุกหมวดตั้งต้น `VAT7` ดู [docs/06 §6.2](06-billing-pos-and-tax.md) — ส่วนสินค้ายังค้างที่ Q6 |
| Q3 | แบบฟอร์มรายงานทะเบียนยาควบคุมปัจจุบันหน้าตาอย่างไร | เภสัชกร | รายงานยาควบคุม (เฟส 2) | ✅ ตอบแล้ว 2026-09-18 (ผู้ใช้): ให้ออกแบบเองแบบเรียบง่าย → รูปแบบอยู่ [docs/05 §6.1](05-inventory-and-pharmacy.md) ยังต้องให้เภสัชกรยืนยันก่อนใช้ยื่นจริง |
| Q4 | คลินิกนำร่องคือที่ไหน มีข้อมูลเดิมให้นำเข้าไหม | ผู้ใช้ | เครื่องมือนำเข้าข้อมูล | ✅ ตอบแล้ว 2026-09-18 (ผู้ใช้): **ไม่มีข้อมูลเดิม** แต่ยังต้องการเครื่องมือนำเข้า → ข้อกำหนดอยู่ [docs/11-data-import.md](11-data-import.md) |
| Q5 | ต้องการแจ้งเตือนผ่าน LINE ด้วยไหม (ตอนถามครั้งแรกไม่ได้เลือก) | ผู้ใช้ | โมดูลแจ้งเตือน (เฟส 3) | 🟡 ยังไม่ทำ — ผู้ใช้ยืนยัน 2026-09-18 ว่ายังไม่เชื่อม LINE |
| Q6 | สินค้าที่ขาย (ยาสำหรับสัตว์ / อาหารสัตว์) เข้าข่ายยกเว้น VAT ตามประมวลรัษฎากร ม.81(1) หรือไม่ | ผู้ทำบัญชีของคลินิก | ตั้ง `taxCode` ของ `Product` ตอน onboarding, เทสใบกำกับที่มีทั้งบรรทัด VAT และยกเว้นปนกัน | 🔴 รอตอบ — ระหว่างนี้ใช้ `VAT7` ชั่วคราว ห้าม AI ตัดสินเอง ([AGENTS.md §8](../AGENTS.md)) |
| Q7 | ต้องการราคาต่อสาขา (`PriceOverride`) ไหม — [docs/05 §7](05-inventory-and-pharmacy.md) อ้างถึงแต่ยังไม่มีในสคีมา | ผู้ใช้ | หน้าแค็ตตาล็อก ADM-06/ADM-07 และความตรงกันของเอกสารกับโค้ด | 🟡 รอตอบ |
| Q8 | ใช้ `next-intl` หรือเขียนคลังข้อความเอง — เพิ่ม dependency ในสแต็ก ([docs/13 §3.4](13-i18n.md)) | ผู้ใช้ | งาน i18n ระยะ A ทั้งหมด | 🔴 รอตอบ — แนะนำ `next-intl` |
| Q9 | ใบกำกับภาษีเต็มรูปใส่ภาษาอังกฤษคู่ได้แค่ไหน ส่วนใดต้องไทยล้วน | ผู้ทำบัญชีของคลินิก | เอกสารพิมพ์สองภาษา (i18n ระยะ C) | 🟡 รอตอบ |

**เมื่อได้คำตอบข้อไหน ให้อัปเดตสถานะที่นี่ทันที และบันทึกคำตอบลงหัวข้อ 5 (บันทึกการตัดสินใจ)**

---

## 4. ความเสี่ยงที่ยังเปิดอยู่

| ความเสี่ยง | สถานะ |
| --- | --- |
| SQL RLS/trigger ยังไม่เคยรันกับ PostgreSQL จริง | ✅ ปิดแล้ว — `migrate deploy` + testcontainers ผ่าน |
| สคีมายังไม่มีสัตวแพทย์จริงรีวิว | 🟡 ฟิลด์ในเวชระเบียนอาจขาดหรือเกิน |
| Auth session เป็น JWT ไม่ได้เก็บใน DB | 🟡 สคีมายังไม่มีตาราง Session ตามที่ docs/01 ระบุ — อย่าเพิ่มตารางโดยไม่ถาม |
| `mfaSecret` ยังไม่เข้ารหัสที่ชั้นแอป | 🟡 มี `FIELD_ENCRYPTION_KEY` ใน env แล้วยังไม่ได้ใช้ |
| Prisma client extension ห่อทุก query เป็น transaction | 🟡 ไม่ได้ทำตามตัวอย่างใน docs/01 — ใช้ `ctx.tx` แทน เพราะห่อทุก query จะช้า |

---

## 5. บันทึกการตัดสินใจ (Decision log)

บันทึกเฉพาะการตัดสินใจที่**เปลี่ยนทิศทางงาน** พร้อมเหตุผล — ไม่ใช่ทุกอย่างที่ทำ

| วันที่ | การตัดสินใจ | เหตุผล | ใครตัดสิน |
| --- | --- | --- | --- |
| 2026-09-17 | ใช้ Next.js + PostgreSQL | ผู้ใช้เลือกจากตัวเลือก 4 แบบ | ผู้ใช้ |
| 2026-09-17 | ทำเป็น multi-tenant SaaS ไม่ใช่ระบบคลินิกเดียว | ผู้ใช้เลือก — ตั้งใจขายเป็นบริการให้หลายคลินิก | ผู้ใช้ |
| 2026-09-17 | Shared DB + RLS (ไม่ใช่ DB/schema แยกต่อ tenant) | ต้นทุนต่ำ, migrate ครั้งเดียว, ปลอดภัยพอเมื่อบังคับที่ชั้น DB | AI (เสนอ) |
| 2026-09-17 | `ChargeItem` เป็นจุดรวมเงินจากทุกโมดูล | ต้องออกบิลใบเดียวจากหลายบริการได้ (US-12) | AI (เสนอ) |
| 2026-09-17 | แยก Prescription / Dispense / MedAdmin | รองรับจ่ายไม่ครบ, คืนยา, MAR ผู้ป่วยใน | AI (เสนอ) |
| 2026-09-17 | สต็อกเป็น append-only ledger + trigger ห้ามติดลบ | กัน race condition และตรวจย้อนหลังได้ | AI (เสนอ) |
| 2026-09-17 | `taxCode` ตั้งได้รายรายการ ไม่ฝังสมมติฐาน VAT ในโค้ด | เรื่องภาษีต้องให้ผู้ทำบัญชีตัดสิน ไม่ใช่ผู้พัฒนา | AI (เสนอ) |
| 2026-09-17 | `AGENTS.md` เป็นไฟล์บริบทหลัก ไฟล์เฉพาะเครื่องมือชี้มาที่เดียว | ผู้ใช้ต้องการเปลี่ยน AI ตัวไหนก็ทำงานต่อได้ | ผู้ใช้ |
| 2026-09-17 | GitHub repo ชื่อ `petcare-clinic` (`yutinfo/petcare-clinic`) | ผู้ใช้สร้าง remote นี้ | ผู้ใช้ |
| 2026-09-17 | เริ่มเฟส 0 (เส้นทาง A) ก่อน prototype หน้าเช็คอิน | ผู้ใช้สั่งให้ทำตามเอกสาร และจะมี AI หลายตัวช่วยกัน | ผู้ใช้ |
| 2026-09-17 | ย้าย SQL RLS จาก `prisma/migrations/manual/` เป็น migration ที่สอง | Prisma ถือทุกโฟลเดอร์ใต้ `migrations/` เป็น migration ทำให้ `migrate deploy` พัง | AI |
| 2026-09-17 | รูป MinIO ใช้ `quay.io/minio/minio` | `minio/minio` บน Docker Hub ถูกปฏิเสธตอน pull | AI |
| 2026-09-17 | localhost ใช้ `DEV_TENANT_SLUG=demo` แทน subdomain | เครื่องพัฒนาไม่มี `demo.petcare.app` | AI |
| 2026-09-18 | เพิ่ม §11 ห้ามผลิต AI Slop พร้อมเช็กลิสต์ก่อนส่งงาน | ผู้ใช้สั่ง — ต้องการกติกาที่ใช้จริงได้ ไม่ใช่คำแนะนำลอย ๆ | ผู้ใช้ |
| 2026-09-18 | บริการสัตวแพทย์เสีย VAT — `ServiceItem` ทุกหมวดตั้งต้น `VAT7` | ผู้ใช้ตอบ Q2 | ผู้ใช้ |
| 2026-09-18 | ทะเบียนยาควบคุมใช้แบบภายในเรียบง่าย 1 ยา × 1 สาขา × 1 เดือน | ผู้ใช้ตอบ Q3 ว่าให้ออกแบบเอง เน้นเรียบง่าย (ยังต้องให้เภสัชกรยืนยันก่อนยื่นจริง) | ผู้ใช้ (AI ออกแบบ) |
| 2026-09-18 | ไม่มีข้อมูลเดิมให้ย้ายระบบ — เครื่องมือนำเข้าทำเพื่อ onboarding คลินิกใหม่ | ผู้ใช้ตอบ Q4 | ผู้ใช้ |
| 2026-09-18 | คอนโซลผู้ดูแลอยู่ใต้ `(staff)/[branch]/settings/` ไม่แยก route group ใหม่ | เซสชันพนักงานผูกสาขาอยู่แล้ว แยกกลุ่มใหม่ต้องทำ tenancy ซ้ำโดยไม่ได้ประโยชน์ — ชดเชยด้วยป้าย "มีผลทุกสาขา/เฉพาะสาขานี้" | AI (เสนอ) |
| 2026-09-18 | ยังไม่เชื่อมแจ้งเตือน LINE | ผู้ใช้ยืนยันว่า Q5 ยังไม่ทำ | ผู้ใช้ |

---

## 6. วิธีอัปเดตไฟล์นี้

เมื่อทำงานเสร็จหนึ่งชิ้น:

1. เพิ่มแถวในหัวข้อ **1. ทำเสร็จแล้ว** ระบุวันที่ ไฟล์ที่แตะ และ**สถานะการตรวจสอบจริง**
   (เขียนเสร็จ ≠ ทดสอบแล้ว — ให้แยกให้ชัด)
2. ติ๊ก checkbox ในหัวข้อ **2. คิวงาน** และเพิ่มงานใหม่ที่ค้นพบระหว่างทาง
3. ถ้าเจอคำถามที่ต้องให้มนุษย์ตอบ → เพิ่มในหัวข้อ **3**
4. ถ้าตัดสินใจอะไรที่เปลี่ยนทิศทาง → เพิ่มในหัวข้อ **5** พร้อมเหตุผล
5. อัปเดต **อัปเดตล่าสุด / เฟสปัจจุบัน / สถานะ** ที่หัวไฟล์

**อย่าลบประวัติเก่า** — ย้ายลงล่างหรือย่อได้ แต่บันทึกการตัดสินใจต้องอยู่ครบ
เพราะคนที่มาทีหลังจะถามเสมอว่า "ทำไมถึงทำแบบนี้"
