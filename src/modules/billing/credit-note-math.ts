/** เหตุผลบนใบลดหนี้ — ตรงกับคอมเมนต์ในสคีมา CreditNote.reasonCode */
export const CREDIT_REASON_CODES = [
  "PRICE_ERROR",
  "SERVICE_NOT_RENDERED",
  "RETURN",
  "DISCOUNT_AFTER",
] as const;

export type CreditReasonCode = (typeof CREDIT_REASON_CODES)[number];

export type CreditQuoteInput = {
  grandTotalSatang: number;
  invoiceVatSatang: number;
  alreadyCreditedSatang: number;
  alreadyCreditedVatSatang: number;
  paidSatang: number;
  balanceSatang: number;
  correctAmountSatang: number;
  /** true = ส่วนที่ลดเกินยอดค้างคืนเป็นเงินสด */
  allowRefund?: boolean;
};

export type CreditQuote =
  | {
      ok: true;
      currentNetSatang: number;
      differenceSatang: number;
      vatSatang: number;
      newBalanceSatang: number;
      refundSatang: number;
      newPaidSatang: number;
    }
  | { ok: false; message: string };

/** จำนวนทศนิยมไม่เกิน 4 ตำแหน่ง เป็นจำนวนเต็มคูณ 10,000 */
export function qtyToScaled(qty: string): number {
  const raw = qty.trim();
  if (!/^\d+(\.\d{1,4})?$/.test(raw)) {
    throw new Error("จำนวนคืนไม่ถูกต้อง");
  }
  const [whole = "0", frac = ""] = raw.split(".");
  return Number(whole) * 10_000 + Number((frac + "0000").slice(0, 4));
}

/** ยอดลดของบรรทัด ใบสุดท้ายที่คืนครบจำนวนได้ส่วนที่เหลือเพื่อให้รวมตรงกับยอดบรรทัด */
export function lineReturnAmountSatang(input: {
  lineAmountSatang: number;
  lineQty: string;
  returnQty: string;
  alreadyReturnedQty: string;
  alreadyCreditedSatang: number;
}): number {
  const lineScaled = qtyToScaled(input.lineQty);
  const returnScaled = qtyToScaled(input.returnQty);
  const alreadyScaled = qtyToScaled(input.alreadyReturnedQty);
  if (lineScaled <= 0 || returnScaled <= 0) throw new Error("จำนวนคืนต้องมากกว่าศูนย์");
  if (alreadyScaled + returnScaled > lineScaled) throw new Error("คืนได้ไม่เกินจำนวนในบิล");
  if (alreadyScaled + returnScaled === lineScaled) {
    return input.lineAmountSatang - input.alreadyCreditedSatang;
  }
  return Math.round((input.lineAmountSatang * returnScaled) / lineScaled);
}

/**
 * ยอดที่ถูกต้องคือยอดสุทธิของบิลหลังใบนี้
 * ไม่ขอคืนเงินแล้วลดได้ไม่เกินยอดค้าง ขอคืนเงินแล้วส่วนที่จ่ายไปแล้วคืนเป็นเงินสด
 * VAT ปันตามสัดส่วนของยอดรวมใบกำกับ เมื่อลดจนมูลค่าเอกสารหมด ภาษีที่ลดรวมเท่ากับภาษีบนบิล
 */
export function quoteCreditNote(input: CreditQuoteInput): CreditQuote {
  if (input.balanceSatang <= 0 && input.paidSatang <= 0) {
    return { ok: false, message: "บิลนี้ไม่มียอดค้างให้ลดแล้ว" };
  }
  if (input.balanceSatang <= 0 && !input.allowRefund) {
    return { ok: false, message: "บิลนี้ชำระครบแล้ว ยังคืนเงินจากหน้านี้ไม่ได้" };
  }
  if (!Number.isInteger(input.correctAmountSatang) || input.correctAmountSatang < 0) {
    return { ok: false, message: "ยอดที่ถูกต้องต้องเป็นจำนวนเงินที่ไม่ติดลบ" };
  }

  const currentNetSatang = input.grandTotalSatang - input.alreadyCreditedSatang;
  if (input.correctAmountSatang >= currentNetSatang) {
    return {
      ok: false,
      message: "ยอดที่ถูกต้องต้องน้อยกว่ายอดสุทธิปัจจุบัน — ถ้ายอดต่ำไปต้องออกใบเพิ่มหนี้",
    };
  }

  const differenceSatang = currentNetSatang - input.correctAmountSatang;
  if (differenceSatang > input.balanceSatang && !input.allowRefund) {
    return { ok: false, message: "ลดได้ไม่เกินยอดค้างชำระ ยังคืนเงินจากหน้านี้ไม่ได้" };
  }
  const appliedToBalance = Math.min(differenceSatang, Math.max(input.balanceSatang, 0));
  const refundSatang = differenceSatang - appliedToBalance;
  const newBalanceSatang = Math.max(input.balanceSatang, 0) - appliedToBalance;
  const newPaidSatang = input.paidSatang - refundSatang;

  const remainingVat = Math.max(0, input.invoiceVatSatang - input.alreadyCreditedVatSatang);
  let vatSatang = 0;
  if (input.invoiceVatSatang > 0 && input.grandTotalSatang > 0) {
    vatSatang =
      differenceSatang === currentNetSatang
        ? remainingVat
        : Math.min(
            remainingVat,
            Math.max(0, Math.round((differenceSatang * input.invoiceVatSatang) / input.grandTotalSatang)),
          );
  }

  return {
    ok: true,
    currentNetSatang,
    differenceSatang,
    vatSatang,
    newBalanceSatang,
    refundSatang,
    newPaidSatang,
  };
}
