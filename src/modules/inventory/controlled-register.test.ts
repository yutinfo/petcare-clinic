import { describe, expect, it } from "vitest";
import { monthBounds, qty4 } from "./controlled-register";

describe("เดือนของทะเบียนยาควบคุม", () => {
  it("ตัดช่วงเดือนตามเวลาไทย", () => {
    const { start, end } = monthBounds("2026-09");
    expect(start.toISOString()).toBe(new Date("2026-09-01T00:00:00+07:00").toISOString());
    expect(end.toISOString()).toBe(new Date("2026-10-01T00:00:00+07:00").toISOString());
    expect(qty4("10")).toBe("10.0000");
  });
});
