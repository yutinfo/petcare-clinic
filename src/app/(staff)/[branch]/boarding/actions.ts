"use server";

import { fail } from "@/lib/action-result";
import { addCareLog, billStayNights, checkInStay, checkOutStay } from "@/modules/boarding";
import { getStaffContext } from "@/server/staff-context";

export async function boardCheckInAction(
  branch: string,
  input: { petId: string; kennelResourceId: string; expectedOutAt: string; vaccineVerified?: boolean },
) {
  try {
    const ctx = await getStaffContext(branch);
    const stay = await checkInStay(ctx, input);
    return { ok: true as const, ...stay };
  } catch (err) {
    return fail(err);
  }
}

export async function boardCheckOutAction(branch: string, stayId: string) {
  try {
    const ctx = await getStaffContext(branch);
    await checkOutStay(ctx, stayId);
    return { ok: true as const };
  } catch (err) {
    return fail(err);
  }
}

export async function careLogAction(branch: string, stayId: string, type: "FEED" | "WATER" | "WALK" | "OBSERVATION") {
  try {
    const ctx = await getStaffContext(branch);
    await addCareLog(ctx, { stayId, type });
    return { ok: true as const };
  } catch (err) {
    return fail(err);
  }
}

export async function billNightsAction(branch: string, stayId: string) {
  try {
    const ctx = await getStaffContext(branch);
    const result = await billStayNights(ctx, stayId);
    return { ok: true as const, ...result };
  } catch (err) {
    return fail(err);
  }
}
