"use server";

import { redirect } from "next/navigation";
import { addPosLine, checkoutOwner, issueInvoiceFromCharges } from "@/modules/billing";
import { fail, isRedirectError } from "@/lib/action-result";
import { getStaffContext } from "@/server/staff-context";

export async function addPosLineAction(
  branch: string,
  input: { ownerId: string; productId: string; qty: string; petId?: string },
) {
  try {
    const ctx = await getStaffContext(branch);
    const result = await addPosLine(ctx, input);
    return { ok: true as const, ...result };
  } catch (err) {
    return fail(err);
  }
}

export async function checkoutAction(branch: string, ownerId: string, method: "CASH" | "PROMPTPAY" | "CREDIT_CARD") {
  try {
    const ctx = await getStaffContext(branch);
    const invoice = await checkoutOwner(ctx, ownerId, method);
    redirect(`/${branch}/pos?invoice=${invoice.id}`);
  } catch (err) {
    if (isRedirectError(err)) throw err;
    return fail(err);
  }
}

export async function paySelectedAction(
  branch: string,
  chargeIds: string[],
  method: "CASH" | "PROMPTPAY" | "CREDIT_CARD",
) {
  try {
    const ctx = await getStaffContext(branch);
    const invoice = await issueInvoiceFromCharges(ctx, { chargeIds, method });
    redirect(`/${branch}/pos?invoice=${invoice.id}`);
  } catch (err) {
    if (isRedirectError(err)) throw err;
    return fail(err);
  }
}
