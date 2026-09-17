# PetCare Cloud — ระบบบริหารจัดการคลินิกสัตว์เลี้ยง

ระบบ SaaS สำหรับคลินิก/โรงพยาบาลสัตว์ ครอบคลุมตั้งแต่รับสัตว์เลี้ยงเข้าคลินิก เวชระเบียน
การสั่งยา/จ่ายยา การฝากเลี้ยง อาบน้ำตัดขน ไปจนถึงการขายสินค้าหน้าร้านและออกใบกำกับภาษี

| หัวข้อ | ค่าที่เลือก |
| --- | --- |
| Stack | Next.js 15 (App Router) + TypeScript + Prisma + PostgreSQL 16 |
| รูปแบบ | Multi-tenant SaaS (หลายคลินิก, แต่ละคลินิกมีได้หลายสาขา) |
| ภาษี | รองรับใบกำกับภาษีเต็มรูป/อย่างย่อ/ใบเสร็จรับเงิน ตามระเบียบไทย |
| ช่องทางลูกค้า | พอร์ทัลเจ้าของสัตว์ + จองออนไลน์ |
| เขตเวลา / ภาษา | Asia/Bangkok, ไทยเป็นหลัก (i18n th/en, แสดงปี พ.ศ. ได้) |

> 🤖 **กำลังใช้ AI ช่วยพัฒนา?** เริ่มที่ [AGENTS.md](AGENTS.md) (กติกาและบริบททั้งหมด)
> แล้วต่อด้วย [docs/STATUS.md](docs/STATUS.md) (งานไปถึงไหนแล้ว) — ไฟล์เดียวกันนี้ใช้ได้
> กับ AI ทุกตัว ส่วน `CLAUDE.md` / `GEMINI.md` / `.cursor/` / `.github/` เป็นแค่ตัวชี้มา

## สารบัญเอกสารออกแบบ

| ไฟล์ | เนื้อหา |
| --- | --- |
| [docs/00-scope-and-personas.md](docs/00-scope-and-personas.md) | ขอบเขต, ผู้ใช้งาน, ศัพท์เฉพาะ, ข้อกำหนดไม่ใช่ฟังก์ชัน |
| [docs/01-architecture.md](docs/01-architecture.md) | สถาปัตยกรรม, multi-tenancy, โครงสร้างโค้ด, deployment |
| [docs/02-data-model.md](docs/02-data-model.md) | ER diagram, ตารางหลัก, กติกาการออกแบบข้อมูล |
| [docs/03-clinical-workflows.md](docs/03-clinical-workflows.md) | รับเคส → ตรวจ → SOAP → สั่งยา → จ่ายยา → ปิดเคส |
| [docs/04-boarding-and-grooming.md](docs/04-boarding-and-grooming.md) | จองห้องฝาก, นอนโรงพยาบาล, อาบน้ำตัดขน |
| [docs/05-inventory-and-pharmacy.md](docs/05-inventory-and-pharmacy.md) | สต็อก, ล็อต/วันหมดอายุ, หน่วยนับ, ยาควบคุม, จัดซื้อ |
| [docs/06-billing-pos-and-tax.md](docs/06-billing-pos-and-tax.md) | ค่าใช้จ่าย, POS, ชำระเงิน, ใบกำกับภาษี, ปิดกะเงินสด |
| [docs/07-portal-and-notifications.md](docs/07-portal-and-notifications.md) | พอร์ทัลเจ้าของสัตว์, จองออนไลน์, ระบบแจ้งเตือน |
| [docs/08-security-and-pdpa.md](docs/08-security-and-pdpa.md) | สิทธิ์การใช้งาน (RBAC), audit, PDPA, การเก็บรักษาข้อมูล |
| [docs/09-api-contract.md](docs/09-api-contract.md) | รูปแบบ API, ตัวอย่าง endpoint, error model |
| [docs/10-roadmap.md](docs/10-roadmap.md) | แผนพัฒนาเป็นเฟส, definition of done, ความเสี่ยง |
| [prisma/schema.prisma](prisma/schema.prisma) | สคีมาฐานข้อมูลฉบับร่าง — ผ่าน `prisma validate` แล้ว |
| [prisma/migrations/manual/001_rls_and_constraints.sql](prisma/migrations/manual/001_rls_and_constraints.sql) | RLS, ข้อจำกัดกันจองซ้อน, trigger สต็อก/เอกสารการเงิน — สิ่งที่ Prisma เขียนไม่ได้ |
| [.env.example](.env.example) | ตัวแปรสภาพแวดล้อมที่ระบบต้องใช้ |

## หลักคิดหลัก 6 ข้อ

1. **ทุกอย่างที่คิดเงินได้ ไหลมารวมที่ `ChargeItem` เดียว** — ไม่ว่าจะเกิดจากการตรวจ ห้องฝาก
   อาบน้ำ หรือขายของหน้าร้าน ทำให้บิลเดียวจบและรายงานรายได้ไม่แตก
2. **แยก "สั่งยา / จ่ายยา / ให้ยา" ออกจากกัน** — Prescription, Dispense, Administration
   คือคนละเหตุการณ์ ระบบส่วนใหญ่ยุบรวมแล้วมาเจอปัญหาตอนทำ MAR กับตัดสต็อก
3. **สต็อกเป็นบัญชีเดินสะพัด (append-only ledger)** — ไม่ update ยอดคงเหลือตรง ๆ
   ทำให้ตรวจย้อนหลังได้และแก้ปัญหา race condition
4. **เอกสารการเงินที่ออกแล้วห้ามแก้** — แก้ด้วยใบลดหนี้/ยกเลิก ไม่ใช่ UPDATE
5. **เวชระเบียนไม่ลบ** — แก้ไขด้วย addendum + เก็บเวอร์ชัน เพราะเป็นหลักฐานทางวิชาชีพ
6. **Tenant isolation บังคับที่ชั้นฐานข้อมูล** ด้วย PostgreSQL Row-Level Security
   ไม่ฝากความปลอดภัยไว้กับการที่โปรแกรมเมอร์จำใส่ `where tenantId` ทุกครั้ง
