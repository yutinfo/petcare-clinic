"use server";

import { redirect } from "next/navigation";
import { checkInPet } from "@/modules/clinical";
import { createOwnerAndPet, searchClients } from "@/modules/crm";
import { BusinessError, ForbiddenError, UnauthenticatedError } from "@/modules/shared";
import { getStaffContext } from "@/server/staff-context";

function fail(err: unknown): { ok: false; message: string } {
  if (
    err instanceof BusinessError ||
    err instanceof ForbiddenError ||
    err instanceof UnauthenticatedError
  ) {
    return { ok: false, message: err.message };
  }
  console.error(err);
  return { ok: false, message: "ทำรายการไม่สำเร็จ" };
}

export async function searchAction(branch: string, query: string) {
  try {
    const ctx = await getStaffContext(branch);
    const hits = await searchClients(ctx, query);
    return { ok: true as const, hits };
  } catch (err) {
    return fail(err);
  }
}

export async function createCustomerAction(
  branch: string,
  input: {
    ownerFirstName: string;
    phone: string;
    petName: string;
    speciesId: string;
  },
) {
  try {
    const ctx = await getStaffContext(branch);
    const created = await createOwnerAndPet(ctx, input);
    return { ok: true as const, created };
  } catch (err) {
    return fail(err);
  }
}

export async function checkInAction(
  branch: string,
  input: {
    petId: string;
    weightKg?: string;
    chiefComplaint?: string;
    type?: "OPD" | "EMERGENCY" | "VACCINE" | "RECHECK";
  },
) {
  try {
    const ctx = await getStaffContext(branch);
    const result = await checkInPet(ctx, input);
    redirect(`/${branch}/encounters/${result.encounterId}`);
  } catch (err) {
    if (isRedirectError(err)) throw err;
    return fail(err);
  }
}

function isRedirectError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "digest" in err &&
    String((err as { digest: string }).digest).startsWith("NEXT_REDIRECT")
  );
}


