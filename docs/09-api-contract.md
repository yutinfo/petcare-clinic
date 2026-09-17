# 09 — สัญญา API

## 1. แบ่งเป็นสามชั้น

| ชั้น | ใช้โดย | รูปแบบ | เหตุผล |
| --- | --- | --- | --- |
| **Server Actions** | แอปพนักงาน (RSC) | ฟังก์ชัน TS + zod | ไม่ต้องเขียน API ซ้ำ, type-safe ต้นจนปลาย |
| **REST `/api/v1`** | พอร์ทัลลูกค้า, แอปมือถือ, ระบบภายนอก | JSON + OpenAPI 3.1 | ต้องมีสัญญาชัดเจนสำหรับผู้บริโภคนอกโค้ดเบส |
| **Webhooks** | payment gateway, e-Tax, SMS provider | JSON + ลายเซ็น HMAC | รับเหตุการณ์จากภายนอก |

ทั้งสามชั้นเรียก use-case ตัวเดียวกันใน `modules/` — ตรรกะธุรกิจไม่ถูกเขียนซ้ำ

## 2. หลักการร่วม

- **Base URL:** `https://{clinic}.petcare.app/api/v1`
- **Auth:** session cookie (พอร์ทัล) หรือ `Authorization: Bearer <api-key>` (ระบบภายนอก)
- **tenant** มาจาก subdomain เสมอ ไม่รับจาก body หรือ header ที่ผู้เรียกกำหนดเอง
- **`X-Branch-Id`** ระบุสาขาสำหรับคำขอที่ผูกสาขา
- **Idempotency:** ทุก `POST` ที่สร้างเงินหรือสต็อกรับ `Idempotency-Key` และเก็บผลลัพธ์
  24 ชั่วโมง — เครือข่ายมือถือหลุดแล้วกดซ้ำต้องไม่เกิดบิลสองใบ
- **วันที่-เวลา:** ISO 8601 พร้อม offset เสมอ (`2026-09-17T14:30:00+07:00`)
- **เงิน:** ส่งเป็น `*Satang` จำนวนเต็ม ไม่ใช่ทศนิยม
- **Pagination:** cursor-based — `?limit=50&cursor=<opaque>` คืน `nextCursor`
- **Versioning:** ขึ้นเวอร์ชันที่ path เมื่อมี breaking change; ฟิลด์ใหม่ที่ไม่บังคับเพิ่มได้เสมอ

## 3. รูปแบบ error

```jsonc
// HTTP 422
{
  "error": {
    "code": "INSUFFICIENT_STOCK",
    "message": "สต็อกไม่พอสำหรับ Amoxicillin 250mg (ต้องการ 14 เม็ด คงเหลือ 8 เม็ด)",
    "messageEn": "Insufficient stock",
    "details": { "productId": "…", "requiredBase": "14", "availableBase": "8" },
    "traceId": "01J8X…"
  }
}
```

| HTTP | เมื่อไร | ตัวอย่าง `code` |
| --- | --- | --- |
| 400 | รูปแบบคำขอผิด | `VALIDATION_ERROR` |
| 401 | ยังไม่ล็อกอิน / token หมดอายุ | `UNAUTHENTICATED` |
| 403 | ล็อกอินแล้วแต่ไม่มีสิทธิ์ | `FORBIDDEN`, `TENANT_MISMATCH` |
| 404 | ไม่พบ (รวมกรณีที่ RLS กรองออก — ไม่บอกว่ามีอยู่จริง) | `NOT_FOUND` |
| 409 | ชนกับสถานะปัจจุบัน | `BOOKING_CONFLICT`, `INVOICE_ALREADY_ISSUED`, `STALE_VERSION` |
| 422 | ถูกต้องตามรูปแบบแต่ผิดกติกาธุรกิจ | `INSUFFICIENT_STOCK`, `VACCINE_NOT_VERIFIED` |
| 429 | เกิน rate limit | `RATE_LIMITED` |
| 500 | ข้อผิดพลาดระบบ | `INTERNAL_ERROR` |

**ข้อความ error ต้องเป็นภาษาไทยที่พนักงานหน้างานอ่านแล้วรู้ว่าต้องทำอะไรต่อ**
ไม่ใช่ข้อความเทคนิค — `traceId` มีไว้ให้ทีมพัฒนาตามต่อ

## 4. Endpoint หลัก

### 4.1 ทะเบียนเจ้าของและสัตว์

```
GET    /owners?q=0812345678&limit=20        ค้นแบบรวม (เบอร์/ชื่อ/รหัส)
POST   /owners                              สร้างเจ้าของ
GET    /owners/{id}                         พร้อมสัตว์ทุกตัว
PATCH  /owners/{id}
POST   /owners/{id}/merge                   รวมระเบียนซ้ำ (ต้องมีสิทธิ์ patient:merge)

GET    /pets/{id}                           รวม alerts, น้ำหนักล่าสุด, วัคซีน
POST   /pets
PATCH  /pets/{id}
POST   /pets/{id}/weights
POST   /pets/{id}/alerts
POST   /pets/{id}/transfer-owner
GET    /pets/{id}/medical-history?from=&to= ไทม์ไลน์เคส/ยา/วัคซีน
GET    /pets/{id}/vaccination-certificate   PDF
```

### 4.2 นัดหมายและการจอง

```
GET    /availability?serviceItemId=&date=&petId=
POST   /bookings                            รองรับ Idempotency-Key
GET    /bookings?status=REQUESTED&from=&to=
POST   /bookings/{id}/confirm
POST   /bookings/{id}/cancel                { reason }
POST   /bookings/{id}/check-in              → สร้าง Encounter / Stay / GroomingJob
POST   /bookings/{id}/no-show
```

<details>
<summary><b>ตัวอย่าง: จองอาบน้ำจากพอร์ทัล</b></summary>

```http
POST /api/v1/bookings HTTP/1.1
Host: clinicA.petcare.app
Content-Type: application/json
Idempotency-Key: 0d3f1c2a-...

{
  "type": "GROOMING",
  "branchId": "01J8...",
  "petId": "01J8...",
  "startAt": "2026-09-20T10:00:00+07:00",
  "items": [{ "serviceItemId": "01J8...", "qty": 1 }],
  "requestedNote": "ตัดทรงเทดดี้แบร์ ไม่ตัดหนวด"
}
```

```jsonc
// 201 Created
{
  "id": "01J8...",
  "code": "BK-2569-004821",
  "status": "REQUESTED",          // คลินิกนี้ตั้งให้ต้องอนุมัติ
  "startAt": "2026-09-20T10:00:00+07:00",
  "endAt":   "2026-09-20T12:00:00+07:00",
  "depositRequiredSatang": 0,
  "resources": [{ "resourceId": "01J8...", "type": "GROOMER" }]
}
```

```jsonc
// 409 Conflict — ถูกจองตัดหน้าไป
{
  "error": {
    "code": "BOOKING_CONFLICT",
    "message": "ช่วงเวลานี้เพิ่งถูกจองไปแล้ว กรุณาเลือกเวลาอื่น",
    "details": { "alternativeSlots": ["2026-09-20T13:00:00+07:00", "..."] }
  }
}
```
</details>

### 4.3 เคสและเวชระเบียน

```
POST   /encounters                          เช็คอิน (walk-in หรือจาก booking)
GET    /encounters?status=WAITING&branchId= คิววันนี้
GET    /encounters/{id}
POST   /encounters/{id}/vitals
POST   /encounters/{id}/soap-notes
POST   /soap-notes/{id}/sign
POST   /soap-notes/{id}/addenda             { content, reason }
POST   /encounters/{id}/orders
PATCH  /orders/{id}                         เปลี่ยนสถานะ → COMPLETED จึงตั้งค่าใช้จ่าย
POST   /orders/{id}/lab-results
POST   /encounters/{id}/prescriptions
POST   /encounters/{id}/close
POST   /encounters/{id}/admit               รับเป็นผู้ป่วยใน → สร้าง Stay
GET    /encounters/{id}/summary             สรุปการรักษาสำหรับเจ้าของ (PDF)
```

### 4.4 เภสัชกรรม

```
GET    /prescriptions?status=ACTIVE&branchId=      คิวจ่ายยา
POST   /prescriptions/{id}/dispense                รองรับ Idempotency-Key
POST   /prescriptions/{id}/cancel
GET    /prescriptions/{id}/label                   ข้อมูลฉลากยา (พิมพ์ที่ไคลเอนต์)
GET    /med-admins?stayId=&date=                   ตาราง MAR
POST   /med-admins/{id}/administer                 { actualDose, route, note }
POST   /med-admins/{id}/hold                       { status: REFUSED|HELD, reason }
```

<details>
<summary><b>ตัวอย่าง: จ่ายยา (ตัดสต็อก + ตั้งค่าใช้จ่าย ในทรานแซกชันเดียว)</b></summary>

```http
POST /api/v1/prescriptions/01J8.../dispense
Idempotency-Key: 8b1e...

{ "qtyBase": "14", "note": "จ่ายครบตามใบสั่ง" }
```

```jsonc
// 201 Created
{
  "dispenseId": "01J8...",
  "lots": [
    { "lotNo": "AMX-2409", "expiryDate": "2027-03-31", "qtyBase": "8" },
    { "lotNo": "AMX-2501", "expiryDate": "2027-09-30", "qtyBase": "6" }
  ],
  "chargeItemId": "01J8...",
  "amountSatang": 16800,
  "label": {
    "petName": "ข้าวปุ้น",
    "drugName": "Amoxicillin 250 mg",
    "instructionTh": "กินครั้งละ 1 เม็ด วันละ 2 ครั้ง เช้า-เย็น หลังอาหาร ติดต่อกัน 7 วัน",
    "warningTh": "กินยาให้ครบแม้อาการดีขึ้นแล้ว",
    "earliestExpiry": "2027-03-31"
  }
}
```
</details>

### 4.5 ฝากเลี้ยงและกรูมมิ่ง

```
GET    /kennels/availability?branchId=&from=&to=&speciesCode=&size=
GET    /kennels/board?branchId=&date=              ผังกรง
POST   /stays                                      จอง/เช็คอิน
POST   /stays/{id}/check-in
POST   /stays/{id}/check-out                       คืนสรุปค่าใช้จ่ายทั้งหมด
POST   /stays/{id}/care-logs
POST   /stays/{id}/move-kennel                     { toResourceId, reason }
GET    /stays/{id}/timeline                        สำหรับพอร์ทัลเจ้าของ

GET    /grooming-jobs?branchId=&date=&groomerId=
PATCH  /grooming-jobs/{id}/status                  { status }
POST   /grooming-jobs/{id}/photos                  presigned upload
POST   /grooming-jobs/{id}/findings                { skinFindings, foundParasites, referToVet }
```

### 4.6 คลังสินค้า

```
GET    /products?q=&type=&lowStock=true
GET    /products/{id}/stock?branchId=              คงเหลือแยกล็อต
GET    /products/{id}/movements?from=&to=          ledger
POST   /goods-receipts                             รับของ (บังคับล็อต+วันหมดอายุสำหรับยา)
POST   /stock-adjustments                          { productId, lotId, qtyBase, reason }
POST   /stock-counts                               เปิดรอบนับ
POST   /stock-counts/{id}/lines
POST   /stock-counts/{id}/post                     อนุมัติ → ลงรายการปรับ
GET    /reports/expiring-lots?days=90
GET    /reports/controlled-drug-register?from=&to=
```

### 4.7 การเงิน

```
GET    /charge-items?ownerId=&status=OPEN          รายการค้างวางบิล
POST   /charge-items                               ตั้งค่าใช้จ่ายด้วยมือ
POST   /charge-items/{id}/void                     { reason }

POST   /pos-sales                                  เปิดบิลขายหน้าร้าน
POST   /pos-sales/{id}/lines                       สแกนสินค้า
POST   /pos-sales/{id}/hold
POST   /invoices                                   { ownerId, chargeItemIds[], docType, buyer }
POST   /invoices/{id}/issue                        จองเลขที่ + ตรึงเอกสาร
POST   /invoices/{id}/payments                     รองรับ Idempotency-Key
POST   /invoices/{id}/void                         { reason } — ต้องมีสิทธิ์
POST   /invoices/{id}/credit-notes                 ใบลดหนี้
GET    /invoices/{id}/pdf?copy=original|duplicate
POST   /cashier-shifts/open
POST   /cashier-shifts/{id}/close                  { countedCashSatang, note }
```

<details>
<summary><b>ตัวอย่าง: ออกใบกำกับภาษีเต็มรูปจากหลายต้นทาง (US-12)</b></summary>

```http
POST /api/v1/invoices
Idempotency-Key: c41f...

{
  "ownerId": "01J8...",
  "docType": "FULL_TAX_INVOICE",
  "chargeItemIds": ["01J8a...", "01J8b...", "01J8c...", "01J8d..."],
  "buyer": {
    "name": "บริษัท ลูกค้า จำกัด",
    "taxId": "0105xxxxxxxxx",
    "branchCode": "00000",
    "address": "456 ถ.พระราม 4 แขวง... เขต... กรุงเทพฯ 10500"
  },
  "applyDeposits": true
}
```

```jsonc
// 201 Created — ยังเป็น DRAFT ยังไม่มีเลขที่
{
  "id": "01J8...",
  "status": "DRAFT",
  "number": null,
  "totals": {
    "subtotalSatang": 267103,
    "discountSatang": 0,
    "vatBaseSatang": 267103,
    "vatSatang": 18697,
    "grandTotalSatang": 285800,
    "appliedDepositSatang": 50000,
    "balanceSatang": 235800
  },
  "lines": [ /* snapshot จาก ChargeItem */ ]
}
```

จากนั้น `POST /invoices/{id}/issue` จึงจองเลขที่ `INV-BKK-2569-000123` และตรึงเอกสาร
</details>

### 4.8 พอร์ทัลลูกค้า

```
POST   /portal/auth/request-otp              { phone }
POST   /portal/auth/verify-otp               { phone, code }
POST   /portal/auth/logout
GET    /portal/me                            โปรไฟล์ + สัตว์ทุกตัว
PATCH  /portal/me                            แก้ข้อมูลติดต่อเท่านั้น
GET    /portal/pets/{id}                     ข้อมูลที่เปิดเผยได้
GET    /portal/pets/{id}/vaccinations
GET    /portal/bookings
POST   /portal/bookings
POST   /portal/bookings/{id}/cancel
GET    /portal/stays/{id}/timeline
GET    /portal/invoices
GET    /portal/invoices/{id}/pdf
GET    /portal/consents
PATCH  /portal/consents/{type}               { granted: boolean }
POST   /portal/data-export-request            คำขอสำเนาข้อมูลตาม PDPA
```

**ทุก endpoint ใน `/portal/*` บังคับตรวจซ้ำว่าทรัพยากรเป็นของผู้เรียกจริง**
ไม่พึ่ง RLS อย่างเดียว เพราะ RLS กรองแค่ระดับ tenant ไม่ใช่ระดับเจ้าของ

### 4.9 Webhooks ขาเข้า

```
POST   /webhooks/payment/{provider}          ตรวจ HMAC + timestamp (กัน replay)
POST   /webhooks/etax/{provider}
POST   /webhooks/sms/{provider}              delivery receipt
```

ทุก webhook ต้อง: ตอบ 200 ภายใน 5 วินาที, ประมวลผลจริงแบบ async ผ่านคิว,
และ idempotent ตาม event id ของผู้ให้บริการ

## 5. ตัวอย่างสัญญาแบบ Server Action

```ts
// app/(staff)/[branch]/encounters/actions.ts
'use server';

const CloseEncounterInput = z.object({
  encounterId: z.string().uuid(),
  dischargeNote: z.string().max(4000).optional(),
  followUpDate: z.coerce.date().optional(),
  force: z.boolean().default(false),   // ปิดทั้งที่ยังมี order ค้าง
});

export async function closeEncounter(raw: unknown) {
  const ctx = await requireStaffContext();
  const input = CloseEncounterInput.parse(raw);

  const result = await closeEncounterUseCase(ctx, input);   // ตรรกะอยู่ใน modules/

  revalidatePath(`/${ctx.branchSlug}/encounters/${input.encounterId}`);
  revalidatePath(`/${ctx.branchSlug}/reception`);
  return result;
}
```

Server Action คือชั้นบาง ๆ ที่ทำ 4 อย่าง: ตรวจสิทธิ์, validate, เรียก use-case,
สั่ง revalidate — ไม่มีตรรกะธุรกิจอยู่ในนี้เลย

## 6. OpenAPI และการทดสอบสัญญา

- เขียน zod schema ครั้งเดียว แล้วสร้าง OpenAPI ด้วย `zod-to-openapi`
- เผยแพร่ที่ `/api/v1/openapi.json` และหน้า docs ที่ `/api/docs`
- CI มี contract test ที่ยิงทุก endpoint ตาม spec แล้วตรวจว่า response ตรง schema
- Breaking change ต้องขึ้นเวอร์ชันใหม่ + ประกาศล่วงหน้า 90 วันสำหรับผู้ใช้ API ภายนอก
