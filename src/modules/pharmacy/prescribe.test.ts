import { describe, expect, it } from "vitest";
import { prescribeInputSchema } from "./prescribe";

describe("ตรวจใบสั่งยาก่อนบันทึก", () => {
  const base = {
    encounterId: "11111111-1111-4111-8111-111111111111",
    productId: "22222222-2222-4222-8222-222222222222",
    route: "PO",
    frequencyCode: "BID",
    durationDays: 7,
  };

  it("ปฏิเสธจำนวนต่อครั้งติดลบ", () => {
    const parsed = prescribeInputSchema.safeParse({ ...base, doseAmount: "-2" });
    expect(parsed.success).toBe(false);
  });

  it("ปฏิเสธจำนวนวันเป็นศูนย์", () => {
    const parsed = prescribeInputSchema.safeParse({ ...base, durationDays: 0, mgPerKg: "20" });
    expect(parsed.success).toBe(false);
  });

  it("รับใบสั่งที่กรอกครบ", () => {
    const parsed = prescribeInputSchema.safeParse({ ...base, mgPerKg: "20" });
    expect(parsed.success).toBe(true);
  });
});
