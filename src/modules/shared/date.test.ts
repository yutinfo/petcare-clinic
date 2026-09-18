import { describe, expect, it } from "vitest";
import {
  bangkokTomorrowAt,
  datetimeLocalValue,
  formatThaiDate,
  parseBangkokDateTimeLocal,
  toBuddhistYear,
} from "./date";

describe("วันที่ พ.ศ.", () => {
  it("แปลงปี ค.ศ. เป็น พ.ศ. ตามเวลาไทย", () => {
    const date = new Date("2026-09-17T10:00:00+07:00");
    expect(toBuddhistYear(date)).toBe(2569);
    expect(formatThaiDate(date)).toBe("17/09/2569");
  });

  it("datetime-local ที่ไม่มีโซนถือเป็นเวลาไทย", () => {
    const parsed = parseBangkokDateTimeLocal("2026-09-18T14:30");
    expect(parsed.toISOString()).toBe(new Date("2026-09-18T14:30:00+07:00").toISOString());
  });

  it("รับ ISO ที่มี offset อยู่แล้วได้", () => {
    const parsed = parseBangkokDateTimeLocal("2026-09-18T10:00:00+07:00");
    expect(parsed.toISOString()).toBe(new Date("2026-09-18T10:00:00+07:00").toISOString());
  });

  it("datetimeLocalValue เป็นรูปแบบ input ตามนาฬิกาไทย", () => {
    expect(datetimeLocalValue(new Date("2026-09-18T14:30:00+07:00"))).toBe("2026-09-18T14:30");
  });

  it("bangkokTomorrowAt เป็นพรุ่งนี้ Tชั่วโมง:นาที", () => {
    expect(bangkokTomorrowAt(18)).toMatch(/^\d{4}-\d{2}-\d{2}T18:00$/);
  });
});
