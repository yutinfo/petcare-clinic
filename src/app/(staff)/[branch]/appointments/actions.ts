"use server";

import { fail } from "@/lib/action-result";
import { cancelBooking, createStaffBooking } from "@/modules/scheduling";
import type { BookingType } from "@prisma/client";
import { getStaffContext } from "@/server/staff-context";

export async function createBookingAction(
  branch: string,
  input: { ownerId: string; petId?: string; type: BookingType; startAt: string; note?: string },
) {
  try {
    const ctx = await getStaffContext(branch);
    const created = await createStaffBooking(ctx, input);
    return { ok: true as const, ...created };
  } catch (err) {
    return fail(err);
  }
}

export async function cancelBookingAction(branch: string, bookingId: string) {
  try {
    const ctx = await getStaffContext(branch);
    await cancelBooking(ctx, bookingId, "ยกเลิกจากหน้าปฏิทิน");
    return { ok: true as const };
  } catch (err) {
    return fail(err);
  }
}
