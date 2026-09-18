"use server";

import { fail } from "@/lib/action-result";
import { requestPortalBooking } from "@/modules/crm";
import { getOwnerContext } from "@/server/owner-context";
import type { BookingType } from "@prisma/client";

export async function requestBookingAction(input: {
  petId: string;
  type: BookingType;
  startAt: string;
  note?: string;
}) {
  try {
    const ctx = await getOwnerContext();
    const created = await requestPortalBooking(ctx, input);
    return { ok: true as const, ...created };
  } catch (err) {
    return fail(err);
  }
}
