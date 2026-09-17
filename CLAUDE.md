# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## อ่าน AGENTS.md ก่อน

**[AGENTS.md](AGENTS.md) คือแหล่งความจริงเดียวของโปรเจกต์นี้** — กติกา, สแต็ก, โครงสร้างโค้ด,
invariants, คำสั่ง และกับดักเฉพาะโดเมน อยู่ที่นั่นทั้งหมด ไฟล์นี้ไม่เขียนซ้ำ
**ถ้าจะแก้กติกา ให้แก้ที่ `AGENTS.md` ไม่ใช่ที่นี่**

จากนั้นอ่าน **[docs/STATUS.md](docs/STATUS.md)** เพื่อรู้ว่างานไปถึงไหนแล้วและติดอะไรอยู่

## สรุปสั้นที่สุด

โปรเจกต์ **PetCare Cloud** — ระบบคลินิกสัตว์เลี้ยงแบบ multi-tenant SaaS
(เวชระเบียน, ยา, ฝากเลี้ยง, อาบน้ำตัดขน, POS, ใบกำกับภาษีไทย, พอร์ทัลลูกค้า)

**สถานะ: เฟส 0 รากฐานเริ่มแล้ว** มี `package.json` / `src/` / docker compose
คำสั่งที่ทดสอบแล้วอยู่ที่ AGENTS.md §5 — อย่าอ้างคำสั่งที่ยังไม่เคยรัน
Repo: https://github.com/yutinfo/petcare-clinic.git

คำสั่งที่รันได้จริงตอนนี้มีแค่ `prisma validate` / `prisma format` (ดู AGENTS.md §5)

## สิ่งที่ต้องระวังเป็นพิเศษในโปรเจกต์นี้

1. **อย่ารายงานว่าเทสผ่านโดยไม่ได้รันจริง** — โดเมนนี้เป็นเรื่องเงินและยา
   ความผิดพลาดที่รายงานว่าสำเร็จอันตรายกว่าความผิดพลาดที่รายงานตามจริง
2. **อย่าตัดสินเรื่องการจัดประเภท VAT เอง** — ดู AGENTS.md §8
3. **เขียนภาษาไทยในเอกสารและข้อความที่ผู้ใช้เห็น** ชื่อโค้ดเป็นอังกฤษ
4. **ฟิลด์ใหม่ในสคีมาต้องมี `@map("snake_case")`** ไม่งั้น RLS/trigger พังเงียบ ๆ
5. **อัปเดต `docs/STATUS.md` ก่อนจบงานทุกครั้ง** — เป็นวิธีเดียวที่เซสชันถัดไปจะรู้เรื่อง

## หมายเหตุเฉพาะ Claude Code

- มี `.env.example` แต่ยังไม่มี `.env` — สร้างจาก template เมื่อถึงเฟส 0
- สคริปต์ช่วยที่ทดสอบแล้วว่าใช้ได้:
  ```bash
  DATABASE_URL="postgresql://u:p@localhost:5432/petcare" \
    npx prisma@6 validate --schema prisma/schema.prisma
  ```
  บน PowerShell ให้ตั้ง `$env:DATABASE_URL = "..."` แยกบรรทัดก่อน
