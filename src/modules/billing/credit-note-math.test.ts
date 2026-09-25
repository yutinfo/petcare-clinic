import { describe, expect, it } from "vitest";
import { quoteCreditNote } from "./credit-note-math";

const invoice = {
  grandTotalSatang: 35_000,
  invoiceVatSatang: 2_290,
  alreadyCreditedSatang: 0,
  alreadyCreditedVatSatang: 0,
  paidSatang: 0,
  balanceSatang: 35_000,
};

describe("quoteCreditNote", () => {
  it("ปัน VAT ตามส่วนที่ลด และใบสุดท้ายที่ล้างมูลค่าเอกสารทำให้ภาษีรวมตรงกับบิล", () => {
    const first = quoteCreditNote({ ...invoice, correctAmountSatang: 20_000 });
    expect(first).toMatchObject({
      ok: true,
      differenceSatang: 15_000,
      vatSatang: 981,
      newBalanceSatang: 20_000,
    });

    const second = quoteCreditNote({
      ...invoice,
      alreadyCreditedSatang: 15_000,
      alreadyCreditedVatSatang: 981,
      balanceSatang: 20_000,
      correctAmountSatang: 0,
    });
    expect(second).toMatchObject({
      ok: true,
      differenceSatang: 20_000,
      vatSatang: 1_309,
      newBalanceSatang: 0,
    });
    if (first.ok && second.ok) {
      expect(first.vatSatang + second.vatSatang).toBe(2_290);
    }
  });

  it("ลดจนหนี้หมดแต่ยังมีส่วนที่ชำระแล้ว ไม่ดึงภาษีของส่วนที่จ่ายแล้วมาทั้งก้อน", () => {
    const quote = quoteCreditNote({
      ...invoice,
      paidSatang: 10_000,
      balanceSatang: 25_000,
      correctAmountSatang: 10_000,
    });
    expect(quote).toMatchObject({
      ok: true,
      differenceSatang: 25_000,
      vatSatang: 1_636,
      newBalanceSatang: 0,
    });
  });

  it("บิลจ่ายครบ ยอดถูกต้องไม่ลดจริง และลดเกินยอดค้าง ต้องไม่ผ่าน", () => {
    expect(
      quoteCreditNote({ ...invoice, paidSatang: 35_000, balanceSatang: 0, correctAmountSatang: 0 }).ok,
    ).toBe(false);
    expect(quoteCreditNote({ ...invoice, correctAmountSatang: 35_000 }).ok).toBe(false);
    expect(
      quoteCreditNote({
        ...invoice,
        paidSatang: 10_000,
        balanceSatang: 25_000,
        correctAmountSatang: 0,
      }),
    ).toMatchObject({ ok: false });
  });

  it("ขอคืนเงินแล้วบิลที่จ่ายครบลดได้ และส่วนที่เกินยอดค้างเป็นเงินคืน", () => {
    const quote = quoteCreditNote({
      ...invoice,
      paidSatang: 35_000,
      balanceSatang: 0,
      correctAmountSatang: 20_000,
      allowRefund: true,
    });
    expect(quote).toMatchObject({
      ok: true,
      differenceSatang: 15_000,
      refundSatang: 15_000,
      newBalanceSatang: 0,
      newPaidSatang: 20_000,
      vatSatang: 981,
    });
  });

  it("บิลไม่จด VAT ไม่มีภาษีบนใบลดหนี้", () => {
    const quote = quoteCreditNote({
      ...invoice,
      invoiceVatSatang: 0,
      correctAmountSatang: 0,
    });
    expect(quote).toMatchObject({ ok: true, vatSatang: 0, differenceSatang: 35_000 });
  });
});
