import { describe, expect, it } from "vitest";
import { buildInstructionTh, calculateDose } from "./dose";

describe("คำนวณขนาดยา", () => {
  it("US-07 Amoxicillin 20 mg/kg สุนัข 12.4 กก. เม็ด 250 mg BID × 7 วัน = 14 เม็ด", () => {
    const result = calculateDose({
      mgPerKg: 20,
      weightKg: 12.4,
      strengthMg: 250,
      timesPerDay: 2,
      durationDays: 7,
      round: "WHOLE",
    });
    expect(result.mgPerDose).toBe(248);
    expect(result.unitsPerDoseRaw).toBeCloseTo(0.992, 3);
    expect(result.unitsPerDose).toBe(1);
    expect(result.totalQtyBase).toBe(14);
  });

  it("สร้างฉลากยาภาษาไทยจากความถี่และช่องทาง", () => {
    expect(
      buildInstructionTh({
        doseAmount: 1,
        doseUnit: "เม็ด",
        route: "PO",
        frequencyCode: "BID",
        durationDays: 7,
        withFood: true,
      }),
    ).toBe("กินครั้งละ 1 เม็ด วันละ 2 ครั้ง เช้า-เย็น หลังอาหาร ติดต่อกัน 7 วัน");
  });
});
