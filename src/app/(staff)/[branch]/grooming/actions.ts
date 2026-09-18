"use server";

import { fail } from "@/lib/action-result";
import { setGroomingStatus, startGroomingJob } from "@/modules/grooming";
import { getStaffContext } from "@/server/staff-context";
import type { GroomingStatus } from "@prisma/client";

export async function startGroomAction(branch: string, petId: string, styleNote?: string) {
  try {
    const ctx = await getStaffContext(branch);
    const job = await startGroomingJob(ctx, { petId, styleNote });
    return { ok: true as const, ...job };
  } catch (err) {
    return fail(err);
  }
}

export async function setGroomStatusAction(branch: string, jobId: string, status: GroomingStatus) {
  try {
    const ctx = await getStaffContext(branch);
    await setGroomingStatus(ctx, jobId, status);
    return { ok: true as const };
  } catch (err) {
    return fail(err);
  }
}
