"use server";

import { fail } from "@/lib/action-result";
import { closeCashierShift, openCashierShift } from "@/modules/billing";
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
