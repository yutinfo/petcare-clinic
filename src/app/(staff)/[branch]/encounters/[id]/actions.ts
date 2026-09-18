"use server";

import { redirect } from "next/navigation";
import {
  addSoapAddendum,
  completeClinicalOrder,
  placeClinicalOrder,
  recordVitals,
  saveSoapDraft,
  setEncounterStatus,
  signSoap,
} from "@/modules/clinical";
import { prescribe, prescribeInputSchema } from "@/modules/pharmacy";
import { issueInvoiceFromCharges } from "@/modules/billing";
import { fail, isRedirectError } from "@/lib/action-result";
import { getStaffContext } from "@/server/staff-context";

export async function saveSoapAction(
  branch: string,
  input: {
    encounterId: string;
    soapNoteId?: string;
    subjective?: string;
    objective?: string;
    assessment?: string;
    plan?: string;
  },
) {
  try {
    const ctx = await getStaffContext(branch);
    const saved = await saveSoapDraft(ctx, input);
    return { ok: true as const, ...saved };
  } catch (err) {
    return fail(err);
  }
}

export async function signSoapAction(branch: string, soapNoteId: string) {
  try {
    const ctx = await getStaffContext(branch);
    const signed = await signSoap(ctx, soapNoteId);
    return { ok: true as const, ...signed };
  } catch (err) {
    return fail(err);
  }
}

export async function addendumAction(
  branch: string,
  input: { soapNoteId: string; content: string; reason: string },
) {
  try {
    const ctx = await getStaffContext(branch);
    await addSoapAddendum(ctx, input);
    return { ok: true as const };
  } catch (err) {
    return fail(err);
  }
}

export async function vitalsAction(
  branch: string,
  input: Parameters<typeof recordVitals>[1],
) {
  try {
    const ctx = await getStaffContext(branch);
    await recordVitals(ctx, input);
    return { ok: true as const };
  } catch (err) {
    return fail(err);
  }
}

export async function prescribeAction(
  branch: string,
  input: Parameters<typeof prescribe>[1],
) {
  try {
    const parsed = prescribeInputSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false as const, message: parsed.error.issues[0]?.message ?? "ข้อมูลใบสั่งยาไม่ถูกต้อง" };
    }
    const ctx = await getStaffContext(branch);
    const rx = await prescribe(ctx, parsed.data);
    return { ok: true as const, ...rx };
  } catch (err) {
    return fail(err);
  }
}

export async function orderAction(branch: string, encounterId: string, serviceItemId: string) {
  try {
    const ctx = await getStaffContext(branch);
    await placeClinicalOrder(ctx, { encounterId, serviceItemId });
    return { ok: true as const };
  } catch (err) {
    return fail(err);
  }
}

export async function completeOrderAction(branch: string, orderId: string) {
  try {
    const ctx = await getStaffContext(branch);
    await completeClinicalOrder(ctx, orderId);
    return { ok: true as const };
  } catch (err) {
    return fail(err);
  }
}

export async function statusAction(
  branch: string,
  encounterId: string,
  status: "IN_PROGRESS" | "PENDING_RESULT" | "READY_TO_BILL" | "CANCELLED",
) {
  try {
    const ctx = await getStaffContext(branch);
    await setEncounterStatus(ctx, encounterId, status);
    return { ok: true as const };
  } catch (err) {
    return fail(err);
  }
}

export async function billEncounterAction(branch: string, chargeIds: string[]) {
  try {
    const ctx = await getStaffContext(branch);
    const invoice = await issueInvoiceFromCharges(ctx, {
      chargeIds,
      method: "CASH",
    });
    redirect(`/${branch}/pos?invoice=${invoice.id}`);
  } catch (err) {
    if (isRedirectError(err)) throw err;
    return fail(err);
  }
}
