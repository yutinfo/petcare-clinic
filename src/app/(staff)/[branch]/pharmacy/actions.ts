"use server";

import { fail } from "@/lib/action-result";
import { dispensePrescription } from "@/modules/pharmacy";
import { getStaffContext } from "@/server/staff-context";

export async function dispenseAction(branch: string, prescriptionId: string) {
  try {
    const ctx = await getStaffContext(branch);
    const result = await dispensePrescription(ctx, { prescriptionId });
    return { ok: true as const, ...result };
  } catch (err) {
    return fail(err);
  }
}
