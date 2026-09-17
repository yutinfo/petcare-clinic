import { describe, expect, it } from "vitest";
import { formatThaiDate, toBuddhistYear } from "./date";

describe("วันที่ พ.ศ.", () => {
  it("แปลงปี ค.ศ. เป็น พ.ศ. ตามเวลาไทย", () => {
    const date = new Date("2026-09-17T10:00:00+07:00");
    expect(toBuddhistYear(date)).toBe(2569);
    expect(formatThaiDate(date)).toBe("17/09/2569");
  });
});
