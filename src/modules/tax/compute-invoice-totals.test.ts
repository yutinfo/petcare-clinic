import { describe, expect, it } from "vitest";
import { computeInvoiceTotals } from "./compute-invoice-totals";

describe("VAT ระดับบิล", () => {
  it("ถอด VAT จากยอดรวมครั้งเดียวต่อกลุ่ม แล้วปันส่วนเศษลงบรรทัดสุดท้าย", () => {
    const totals = computeInvoiceTotals(
      [
        { amountSatang: 30000, taxCode: "VAT7" },
        { amountSatang: 16800, taxCode: "VAT7" },
        { amountSatang: 89000, taxCode: "VAT7" },
      ],
      { isVatRegistered: true, vatRatePercent: 7, pricesIncludeVat: true },
    );
    expect(totals.grandTotalSatang).toBe(135800);
    expect(totals.vatBaseSatang + totals.vatSatang).toBe(135800);
    expect(totals.lineVatSatang.reduce((a, b) => a + b, 0)).toBe(totals.vatSatang);
  });

  it("คลินิกไม่จด VAT ไม่มีบรรทัดภาษี", () => {
    const totals = computeInvoiceTotals(
      [{ amountSatang: 35000, taxCode: "VAT7" }],
      { isVatRegistered: false, vatRatePercent: 7, pricesIncludeVat: true },
    );
    expect(totals.vatSatang).toBe(0);
    expect(totals.grandTotalSatang).toBe(35000);
    expect(totals.lineVatSatang).toEqual([0]);
  });

  it("รายการยกเว้นไม่เข้าฐาน VAT", () => {
    const totals = computeInvoiceTotals(
      [
        { amountSatang: 10700, taxCode: "VAT7" },
        { amountSatang: 50000, taxCode: "EXEMPT" },
      ],
      { isVatRegistered: true, vatRatePercent: 7, pricesIncludeVat: true },
    );
    expect(totals.vatBaseSatang).toBe(10000);
    expect(totals.vatSatang).toBe(700);
    expect(totals.exemptSatang).toBe(50000);
    expect(totals.grandTotalSatang).toBe(60700);
    expect(totals.lineVatSatang).toEqual([700, 0]);
  });
});
