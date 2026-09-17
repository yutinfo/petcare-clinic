import { describe, expect, it } from "vitest";
import { digitsOnly, generateCode, thNormalize } from "./codes";

describe("รหัสและค้นหา", () => {
  it("normalize ภาษาไทยตัดช่องว่าง", () => {
    expect(thNormalize("ข้าว ปุ้น")).toBe("ข้าวปุ้น");
    expect(thNormalize("O-PRAE1")).toBe("oprae1");
  });

  it("เก็บเบอร์เป็นตัวเลขล้วน", () => {
    expect(digitsOnly("081-234-5678")).toBe("0812345678");
  });

  it("ออกโค้ดอ่านออกเสียงได้", () => {
    expect(generateCode("O")).toMatch(/^O-[A-Z2-9]{5}$/);
  });
});
