"use server";

import { fail } from "@/lib/action-result";
import { closeCashierShift, issueCreditNote, openCashierShift } from "@/modules/billing";
import type { CreditReasonCode } from "@/modules/billing/credit-note-math";
import { BusinessError, bahtStringToSatang } from "@/modules/shared";
import { getStaffContext } from "@/server/staff-context";

function parseBaht(raw: string, label: string) {
  try {
    const satang = bahtStringToSatang(raw);
    if (satang < 0) throw new BusinessError(`${label} ต้องไม่ติดลบ`);
    return satang;
  } catch (err) {
    if (err instanceof BusinessError) throw err;
    throw new BusinessError(`${label} ไม่ถูกต้อง`);
  }
}

export async function openShiftAction(branch: string, openingFloatBaht: string) {
  try {
    const ctx = await getStaffContext(branch);
    const openingFloatSatang = parseBaht(openingFloatBaht, "เงินทอนตั้งต้น");
    const opened = await openCashierShift(ctx, { openingFloatSatang });
    return { ok: true as const, ...opened };
  } catch (err) {
    return fail(err);
  }
}

export async function issueCreditNoteAction(
  branch: string,
  input: {
    invoiceId: string;
    reasonCode: CreditReasonCode;
    reason: string;
    correctAmountBaht: string;
    refundCash: boolean;
    lines: { invoiceLineId: string; qty: string }[];
  },
) {
  try {
    const ctx = await getStaffContext(branch);
    const correctAmountSatang =
      input.lines.length > 0 ? 0 : parseBaht(input.correctAmountBaht, "ยอดที่ถูกต้อง");
    const note = await issueCreditNote(ctx, {
      invoiceId: input.invoiceId,
      reasonCode: input.reasonCode,
      reason: input.reason,
      correctAmountSatang,
      refundCash: input.refundCash,
      lines: input.lines,
    });
    return { ok: true as const, id: note.id, number: note.number };
  } catch (err) {
    return fail(err);
  }
}

export async function closeShiftAction(branch: string, countedCashBaht: string, closingNote: string) {
  try {
    const ctx = await getStaffContext(branch);
    const countedCashSatang = parseBaht(countedCashBaht, "ยอดนับได้");
    const closed = await closeCashierShift(ctx, { countedCashSatang, closingNote });
    return { ok: true as const, ...closed };
  } catch (err) {
    return fail(err);
  }
}
