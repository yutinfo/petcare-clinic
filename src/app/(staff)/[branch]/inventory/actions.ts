"use server";

import { fail } from "@/lib/action-result";
import { receiveStock } from "@/modules/inventory";
import { getStaffContext } from "@/server/staff-context";

export async function receiveAction(
  branch: string,
  input: { productId: string; qty: string; lotNo: string; expiryDate?: string },
) {
  try {
    const ctx = await getStaffContext(branch);
    const result = await receiveStock(ctx, input);
    return { ok: true as const, ...result };
  } catch (err) {
    return fail(err);
  }
}
