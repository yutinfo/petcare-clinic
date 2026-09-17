import { describe, expect, it } from "vitest";
import {
  addSatang,
  bahtStringToSatang,
  formatSatangTh,
  satangToBahtString,
  subtractSatang,
} from "./money";

describe("money (สตางค์)", () => {
  it("แปลงสตริงบาทเป็นสตางค์โดยไม่ใช้ float", () => {
    expect(bahtStringToSatang("12.50")).toBe(1250);
    expect(bahtStringToSatang("12")).toBe(1200);
    expect(bahtStringToSatang("0.07")).toBe(7);
    expect(bahtStringToSatang("-1.25")).toBe(-125);
  });

  it("บวก-ลบเป็นจำนวนเต็ม", () => {
    expect(addSatang(100, 7, 3)).toBe(110);
    expect(subtractSatang(100, 7)).toBe(93);
  });

  it("จัดรูปแบบเป็นบาทสองตำแหน่ง", () => {
    expect(satangToBahtString(1250)).toBe("12.50");
    expect(formatSatangTh(285800)).toBe("2,858.00");
  });

  it("ปฏิเสธทศนิยมที่เป็น float", () => {
    expect(() => addSatang(1.5)).toThrow(/สตางค์/);
  });
});
