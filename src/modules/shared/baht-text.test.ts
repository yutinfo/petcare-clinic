import { describe, expect, it } from "vitest";
import { bahtText } from "./baht-text";

describe("bahtText", () => {
  it("แปลงตามตัวอย่างใบกำกับภาษี", () => {
    expect(bahtText(285800)).toBe("สองพันแปดร้อยห้าสิบแปดบาทถ้วน");
    expect(bahtText(1250)).toBe("สิบสองบาทห้าสิบสตางค์");
  });

  it("อ่านหลักหน่วยและสิบแบบไทย", () => {
    expect(bahtText(0)).toBe("ศูนย์บาทถ้วน");
    expect(bahtText(100)).toBe("หนึ่งบาทถ้วน");
    expect(bahtText(101)).toBe("หนึ่งบาทหนึ่งสตางค์");
    expect(bahtText(1100)).toBe("สิบเอ็ดบาทถ้วน");
    expect(bahtText(2100)).toBe("ยี่สิบเอ็ดบาทถ้วน");
    expect(bahtText(100000000)).toBe("หนึ่งล้านบาทถ้วน");
  });
});
