# AGENTS.md

**ไฟล์นี้คือแหล่งความจริงเดียวสำหรับ AI agent ทุกตัวที่เข้ามาทำงานในโปรเจกต์นี้**
(Claude Code, Cursor, Copilot, Codex, Gemini CLI, Windsurf หรือตัวอื่นใด)
ไฟล์เฉพาะเครื่องมือ — `CLAUDE.md`, `.cursor/rules/`, `.github/copilot-instructions.md` —
เป็นเพียงตัวชี้มาที่นี่ **อย่าเขียนกติกาซ้ำในไฟล์เหล่านั้น**

> 🇹🇭 โปรเจกต์นี้ใช้ภาษาไทยเป็นภาษาหลักในเอกสารและ UI — เขียนเอกสาร คอมเมนต์ที่อธิบาย
> เหตุผลเชิงธุรกิจ และข้อความที่ผู้ใช้เห็น เป็นภาษาไทย ส่วนชื่อตัวแปร/ฟังก์ชัน/ตาราง
> เป็นภาษาอังกฤษ

---

## 1. อ่าน 30 วินาทีแรก

**โปรเจกต์:** PetCare Cloud — ระบบบริหารจัดการคลินิกสัตว์เลี้ยงแบบ multi-tenant SaaS
ครอบคลุม: รับสัตว์เข้าคลินิก → เวชระเบียน → สั่ง/จ่ายยา → ฝากเลี้ยง → อาบน้ำตัดขน →
ขายของหน้าร้าน → ออกใบกำกับภาษีไทย → พอร์ทัลลูกค้าจองออนไลน์

**สถานะปัจจุบัน (2026-09-17): เฟส 0 รากฐานเริ่มแล้ว** — มีโครง Next.js + Prisma
+ docker compose + RLS ที่รันกับ PostgreSQL จริงแล้ว ยังไม่มีหน้างานคลินิก
Git remote: https://github.com/yutinfo/petcare-clinic.git

สิ่งที่มีอยู่จริง:

```
package.json / src/                       โครง Next.js 15 + โดเมน modules/server
docker-compose.yml                        postgres 16 + redis + minio + mailhog
prisma/schema.prisma                      80+ ตาราง
prisma/migrations/20260917120000_init     สคีมา
prisma/migrations/20260917120001_rls_*    RLS + trigger + constraint
docs/STATUS.md                            สถานะงานล่าสุด + คิวงานถัดไป  ← อ่านต่อจากไฟล์นี้
```

**ก่อนลงมือทำอะไร ให้อ่าน [docs/STATUS.md](docs/STATUS.md) เสมอ** เพื่อรู้ว่าคนก่อนหน้า
(คนหรือ AI) ทำถึงไหนแล้วและกำลังติดอะไรอยู่

---

## 2. สแต็กที่ตัดสินใจแล้ว — ห้ามเปลี่ยนโดยไม่ถาม

| ส่วน | ที่เลือก |
| --- | --- |
| Framework | Next.js 15 App Router + React 19 + TypeScript strict |
| ORM / DB | Prisma 6 + PostgreSQL 16 (RLS, `btree_gist`, `pg_trgm`, `pgcrypto`) |
| UI | Tailwind + shadcn/ui + TanStack Table |
| Validation | zod (schema เดียวใช้ทั้ง client และ server) |
| Auth | Auth.js v5 — พนักงานใช้รหัสผ่าน+TOTP, เจ้าของสัตว์ใช้ OTP เบอร์โทร |
| Queue | BullMQ + Redis |
| Files | S3-compatible (R2/MinIO) + presigned URL |
| Test | Vitest, Playwright, testcontainers (DB จริงสำหรับเทส RLS) |

ผู้ใช้เลือกสแต็กนี้เองแล้ว เหตุผลอยู่ใน [docs/01-architecture.md](docs/01-architecture.md)
ถ้าคิดว่าควรเปลี่ยน ให้**เสนอพร้อมเหตุผลแล้วรอคำตอบ** อย่าเปลี่ยนเอง

---

## 3. กติกาที่ห้ามละเมิด (Invariants)

กติกา 10 ข้อนี้คือแก่นของระบบ ถ้าเขียนโค้ดที่ละเมิดข้อใดข้อหนึ่ง **ระบบจะผิดในทางที่
ตรวจไม่เจอตอนเทส แต่ทำให้คลินิกเสียเงินหรือเสียใบอนุญาต** — ทุกครั้งที่จะแก้โค้ดในบริเวณนี้
ให้ตรวจสอบกับรายการนี้ก่อน

| # | กติกา | ถ้าละเมิดจะเกิดอะไร |
| --- | --- | --- |
| 1 | **เงินเก็บเป็น `Int` หน่วยสตางค์** ชื่อฟิลด์ลงท้าย `Satang` ห้าม `Float` ห้ามคำนวณเป็นบาททศนิยม | ยอดเพี้ยนหลักสตางค์สะสม ผู้สอบบัญชีทัก |
| 2 | **VAT คำนวณที่ระดับบิล ไม่ใช่ระดับบรรทัด** แล้วปันส่วนกลับลงบรรทัด | ผลรวม VAT รายบรรทัด ≠ VAT ยอดรวม |
| 3 | **`Invoice` ที่พ้น `DRAFT` แล้วห้ามแก้** — แก้ด้วยการยกเลิก+ออกใหม่ หรือใบลดหนี้เท่านั้น | ผิดกฎหมายภาษี เลขเอกสารขาดช่วง |
| 4 | **จองเลขที่เอกสารตอน "ออกบิล" เท่านั้น ไม่ใช่ตอนสร้างร่าง** และต้องอยู่ในทรานแซกชันเดียวกัน | เลขที่เอกสารว่าง (สรรพากรตรวจเจอ) |
| 5 | **`SoapNote` ที่ `signedAt` ไม่ null แล้วห้ามแก้** — ใช้ `SoapAddendum` | เวชระเบียนใช้เป็นหลักฐานไม่ได้ |
| 6 | **`StockMovement`, `AuditLog`, `InvoiceLine`, `ControlledDrugEntry` เป็น append-only** ห้าม UPDATE/DELETE | ตรวจสอบย้อนหลังไม่ได้ |
| 7 | **ปริมาณสต็อกเก็บเป็นหน่วยฐาน (`qtyBase`) เสมอ** แปลงหน่วยที่ขอบเท่านั้น | รับเข้า 10 กล่อง ระบบนึกว่า 10 เม็ด |
| 8 | **ตัดสต็อก + ตั้งค่าใช้จ่าย + ลงเวชระเบียน ต้องอยู่ในทรานแซกชันเดียว** | จ่ายยาแล้วลืมคิดเงิน / คิดเงินแล้วไม่ตัดสต็อก |
| 9 | **ทุกตารางที่มี `tenantId` ต้องมี RLS policy** — ตรวจด้วย view `v_rls_coverage_gaps` | ข้อมูลรั่วข้ามคลินิก |
| 10 | **งานตามเวลา (cron/job) ต้อง idempotent** — เช่น ค่าห้องใช้ `billedThroughDate` กันคิดซ้ำ | ลูกค้าโดนคิดเงินสองรอบ |

รายละเอียดและเหตุผลของแต่ละข้ออยู่ใน [docs/02-data-model.md §1](docs/02-data-model.md)
และ [docs/06-billing-pos-and-tax.md](docs/06-billing-pos-and-tax.md)

---

## 4. แผนที่เอกสาร — ความจริงเรื่องไหนอยู่ไฟล์ไหน

**อย่าเดาว่าระบบทำงานอย่างไร ให้เปิดไฟล์ที่ตรงกับเรื่องนั้น**

| ถ้ากำลังทำเรื่อง… | อ่านไฟล์นี้ |
| --- | --- |
| ขอบเขต, ผู้ใช้, user story, NFR, ศัพท์เฉพาะ | [docs/00-scope-and-personas.md](docs/00-scope-and-personas.md) |
| multi-tenancy, RLS, โครงสร้างโค้ด, deployment, domain events | [docs/01-architecture.md](docs/01-architecture.md) |
| ตาราง, ความสัมพันธ์, ทำไมออกแบบแบบนี้, ดัชนี | [docs/02-data-model.md](docs/02-data-model.md) |
| รับเคส, SOAP, สั่งยา/จ่ายยา, MAR, วัคซีน, ปิดเคส | [docs/03-clinical-workflows.md](docs/03-clinical-workflows.md) |
| ผังกรง, จองห้องฝาก, เช็คอิน-เอาท์, คิวกรูมมิ่ง | [docs/04-boarding-and-grooming.md](docs/04-boarding-and-grooming.md) |
| สต็อก, ล็อต/FEFO, หน่วยนับ, จัดซื้อ, ยาควบคุม | [docs/05-inventory-and-pharmacy.md](docs/05-inventory-and-pharmacy.md) |
| ChargeItem, POS, ชำระเงิน, **ใบกำกับภาษีไทย**, ปิดกะ | [docs/06-billing-pos-and-tax.md](docs/06-billing-pos-and-tax.md) |
| พอร์ทัลลูกค้า, จองออนไลน์, แจ้งเตือน | [docs/07-portal-and-notifications.md](docs/07-portal-and-notifications.md) |
| RBAC, audit, ความปลอดภัย, PDPA | [docs/08-security-and-pdpa.md](docs/08-security-and-pdpa.md) |
| รูปแบบ API, error model, endpoint | [docs/09-api-contract.md](docs/09-api-contract.md) |
| ลำดับเฟส, ความเสี่ยง, เกณฑ์ความสำเร็จ | [docs/10-roadmap.md](docs/10-roadmap.md) |

**ถ้าโค้ดกับเอกสารขัดกัน:** เอกสารคือความตั้งใจ โค้ดคือความจริง — ให้แจ้งผู้ใช้ว่าพบ
ความไม่ตรงกัน แล้วอัปเดตฝั่งที่ผิดให้ตรงกัน อย่าปล่อยไว้เงียบ ๆ

---

## 5. คำสั่งที่ใช้ได้จริง ณ ตอนนี้

ต้องมีไฟล์ `.env` (คัดลอกจาก `.env.example`) และ Docker สำหรับงานที่แตะฐานข้อมูล

```bash
docker compose up -d
npx prisma migrate deploy    # สคีมา + RLS/trigger
npx prisma db seed           # permission, บทบาทสำเร็จรูป, species/breed
npm run typecheck
npm run lint
npm test                     # unit (ไม่ต้องมี Docker)
npm run test:int             # integration + RLS กับ Postgres จริง (testcontainers)
npm run build
npm run db:check-rls         # v_rls_coverage_gaps ต้องว่าง
```

> บน Windows/PowerShell ใช้ `$env:DATABASE_URL="..."` แยกบรรทัดก่อน แล้วค่อยเรียก `npx`
> (PowerShell 5.1 ไม่รองรับ inline env prefix แบบ bash)
> โปรเจกต์นี้มี `.env` แล้ว Prisma โหลดให้เอง

| สคริปต์ | หน้าที่ | ตรวจแล้วว่าใช้ได้ |
| --- | --- | --- |
| `dev` | Next.js dev server | ยังไม่จับเวลาในเซสชันนี้ |
| `build` / `start` | build และรัน production | ✅ `build` ผ่าน |
| `typecheck` | `tsc --noEmit` | ✅ |
| `lint` | ESLint (รวม rule ห้าม modules import next/*) | ✅ |
| `test` | Vitest unit | ✅ |
| `test:int` | integration ที่ใช้ testcontainers (เทส RLS อยู่ในชุดนี้) | ✅ |
| `test:e2e` | Playwright | ❌ ยังไม่ติดตั้ง Playwright |
| `db:migrate` | `prisma migrate dev` | ใช้ `migrate deploy` แล้วผ่าน |
| `db:push:manual` | รัน `prisma/sql/*.sql` ถ้ามี | โฟลเดอร์ยังว่าง — RLS ย้ายไปเป็น migration แล้ว |
| `db:seed` | seed ข้อมูลอ้างอิง (species, breed, permission, role) | ✅ (ใช้ `MIGRATE_DATABASE_URL` เพราะ role ระบบมี `tenant_id` เป็น NULL) |
| `db:studio` | Prisma Studio | ยังไม่ได้เปิด |
| `db:check-rls` | ตรวจ `v_rls_coverage_gaps` | ✅ ว่าง |
| `worker` | BullMQ worker ดึง OutboxEvent | ยังไม่ได้รันค้างไว้ |

**รันเทสไฟล์เดียว:** `npx vitest run path/to/file.test.ts`
**รันเทสเดียว:** `npx vitest run -t "ชื่อเทส"`

**อย่าใส่ SQL เสริมไว้ใต้ `prisma/migrations/<ชื่อ>/` โดยไม่มี `migration.sql`** — Prisma จะถือทุกโฟลเดอร์เป็น migration

---

## 6. โครงสร้างโค้ดที่ตกลงไว้

รายละเอียดเต็มอยู่ใน [docs/01-architecture.md §4](docs/01-architecture.md) สรุปที่ต้องจำ:

```
src/app/       ← Next.js routes; (staff) / (portal) / (platform) / api/v1
src/modules/   ← ตรรกะธุรกิจ แยกตามโดเมน — ห้าม import อะไรจาก next/*
src/server/    ← db, auth, policy, jobs, context
src/components/ src/lib/
```

**กติกาการ import ที่ต้องบังคับด้วย ESLint `import/no-restricted-paths`:**
- `app/` → เรียก `modules/` ได้
- `modules/x/` → เรียก `modules/y/` ได้เฉพาะผ่าน `modules/y/index.ts`
- `modules/` → **ห้าม** import จาก `app/` หรือ `next/*` เด็ดขาด

**รูปแบบของ use-case ทุกตัว** — ทำตามนี้เสมอ:

```ts
export async function doSomething(ctx: AppContext, input: Input) {
  ctx.can('domain:action');              // 1. ตรวจสิทธิ์ก่อนเสมอ
  return ctx.tx(async (tx) => {          // 2. งานที่กระทบเงิน/สต็อก อยู่ในทรานแซกชันเดียว
    // 3. ตรรกะธุรกิจ
    ctx.emit('domain.event', { /* … */ }); // 4. เขียนลง OutboxEvent ในทรานแซกชันเดียวกัน
  });
}
```

Server Action เป็นชั้นบาง ๆ ที่ทำแค่ 4 อย่าง: ตรวจสิทธิ์ → validate ด้วย zod →
เรียก use-case → `revalidatePath` **ห้ามมีตรรกะธุรกิจใน Server Action หรือ route handler**

### การตั้งชื่อในฐานข้อมูล — สำคัญเวลาเขียน raw SQL

| ระดับ | รูปแบบ | ตัวอย่าง |
| --- | --- | --- |
| ชื่อตาราง | **PascalCase** (ต้องใส่ double quote ใน SQL) | `"StockMovement"`, `"ChargeItem"` |
| ชื่อคอลัมน์ | **snake_case** ผ่าน `@map` (ไม่ต้อง quote) | `tenant_id`, `qty_base`, `grand_total_satang` |
| ชื่อฟิลด์ใน Prisma / TypeScript | **camelCase** | `tenantId`, `qtyBase`, `grandTotalSatang` |

```sql
-- ถูก
SELECT qty_base FROM "StockOnHand" WHERE tenant_id = $1;
-- ผิด (Prisma ไม่ได้สร้างคอลัมน์ชื่อนี้)
SELECT "qtyBase" FROM "StockOnHand" WHERE "tenantId" = $1;
```

**เมื่อเพิ่มฟิลด์ใหม่ในสคีมา ต้องใส่ `@map("snake_case")` ด้วยเสมอ**
ถ้าลืม RLS policy และ trigger ที่อ้างชื่อ snake_case จะพังเงียบ ๆ
รันตรวจซ้ำได้ด้วย `npx prisma-case-format --file prisma/schema.prisma --map-field-case=snake --dry-run`

---

## 7. กับดักเฉพาะโดเมนนี้ที่ AI มักพลาด

| กับดัก | สิ่งที่ถูกต้อง |
| --- | --- |
| ยุบ "สั่งยา/จ่ายยา/ให้ยา" เป็นตารางเดียว | แยก `Prescription` / `Dispense` / `MedAdmin` — ดู [docs/02 §4.3](docs/02-data-model.md) |
| ใส่ราคาปัจจุบันของสินค้าลงบิลเก่า | `InvoiceLine` เป็น snapshot ตรึงราคา ณ วันออกบิล |
| ใช้ `Pet.currentWeightKg` คำนวณขนาดยา | ต้องใช้น้ำหนัก ณ วันที่สั่ง (`Prescription.weightKgAtOrder`) |
| เช็คกรงว่างด้วย `if` ในโค้ดอย่างเดียว | ต้องพึ่ง `EXCLUDE USING gist` ที่ DB เป็นด่านตัดสิน |
| `UPDATE` ยอดคงเหลือสต็อกตรง ๆ | เขียน `StockMovement` แล้วให้ trigger อัปเดต `StockOnHand` |
| ตัดสต็อกแบบ FIFO ตามวันรับเข้า | ต้องเป็น **FEFO** — หมดอายุก่อน ออกก่อน |
| สมมติว่าคลินิกจด VAT เสมอ | `TaxProfile.isVatRegistered` — คลินิกเล็กจำนวนมากไม่จด |
| ใช้ `to_tsvector` ค้นภาษาไทย | ภาษาไทยไม่มีช่องว่างระหว่างคำ ต้องใช้ `pg_trgm` + `search_key` |
| ลบข้อมูลลูกค้าจริงเมื่อขอลบตาม PDPA | ต้อง pseudonymize เพราะเอกสารภาษีต้องเก็บ 5 ปี |
| ผูก `tenantId` จาก request body | `tenantId` มาจาก subdomain + session เท่านั้น |

---

## 8. สิ่งที่ต้องให้มนุษย์ตัดสิน — ห้าม AI ตัดสินเอง

1. **การจัดประเภท VAT ของบริการสัตวแพทย์** — ระบบออกแบบให้ `taxCode` ตั้งได้รายรายการ
   โดยตั้งใจ **ห้ามฝังสมมติฐานลงในโค้ดหรือ seed ว่าบริการใดเสีย/ไม่เสีย VAT**
   ต้องให้ผู้ทำบัญชีของคลินิกเป็นผู้กำหนด (ดู [docs/06 §6.2](docs/06-billing-pos-and-tax.md))
2. **รูปแบบรายงานทะเบียนยาควบคุม** — ต้องให้เภสัชกรยืนยันว่าตรงกับแบบฟอร์มปัจจุบัน
3. **ข้อความคำยินยอม PDPA และนโยบายความเป็นส่วนตัว** — ต้องให้ที่ปรึกษากฎหมายตรวจ
4. **การเปลี่ยนสแต็กหรือเปลี่ยนโมเดลข้อมูลหลัก** — เสนอได้ แต่ต้องรอผู้ใช้ตอบ

เมื่อเจอเรื่องเหล่านี้: ทำส่วนที่ไม่ขึ้นกับคำตอบให้เสร็จก่อน แล้วระบุคำถามให้ชัด
พร้อมบันทึกลง [docs/STATUS.md](docs/STATUS.md) หัวข้อ "คำถามที่รอคำตอบ"

---

## 9. Definition of Done ของงานหนึ่งชิ้น

ก่อนบอกว่า "เสร็จแล้ว" ต้องผ่านทุกข้อ:

- [ ] `typecheck` และ `lint` ผ่าน (หรือ `prisma validate` ผ่าน ถ้าแก้สคีมา)
- [ ] เทสที่เกี่ยวข้องผ่าน **และรันจริงแล้ว** — ห้ามรายงานว่าผ่านโดยไม่ได้รัน
- [ ] ถ้าเพิ่มตารางที่มี `tenantId` → รันสคริปต์ RLS แล้วตรวจ `v_rls_coverage_gaps` ว่าว่าง
- [ ] ถ้าแตะเรื่องเงิน/สต็อก → มีเทสที่พิสูจน์ความเป็น idempotent และทรานแซกชันครบวง
- [ ] อัปเดตเอกสารใน `docs/` ที่เกี่ยวข้อง ถ้าพฤติกรรมเปลี่ยนจากที่ออกแบบไว้
- [ ] อัปเดต [docs/STATUS.md](docs/STATUS.md) — สิ่งที่ทำเสร็จ, สิ่งที่ค้าง, คำถามที่เกิดใหม่

ถ้ามีข้อไหนทำไม่ได้หรือข้ามไป **ให้บอกตรง ๆ ว่าข้ามข้อไหนและเพราะอะไร**
อย่ารายงานว่าเสร็จสมบูรณ์ทั้งที่ยังไม่ครบ

---

## 10. หน้าที่ของ agent ต่อไฟล์บริบทเหล่านี้

- **อัปเดต [docs/STATUS.md](docs/STATUS.md) ทุกครั้งที่จบงานหนึ่งชิ้น** — นี่คือวิธีเดียว
  ที่ agent ตัวถัดไป (หรือตัวเดิมในเซสชันใหม่) จะรู้ว่าเกิดอะไรขึ้นแล้วบ้าง
- **อัปเดตไฟล์นี้ (`AGENTS.md`) เมื่อกติกาเปลี่ยน** เช่น เพิ่มคำสั่งที่ใช้ได้จริง
  เพิ่ม invariant ใหม่ หรือค้นพบกับดักใหม่ที่ควรเตือนคนถัดไป
- **อย่าเขียนกติกาซ้ำในไฟล์เฉพาะเครื่องมือ** ให้ชี้มาที่นี่เสมอ
- เมื่อเริ่มมีโค้ดจริง ให้แทนที่หัวข้อ 5 (คำสั่ง) ด้วยคำสั่งที่ทดสอบแล้วว่ารันได้จริง
