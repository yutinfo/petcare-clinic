import { Prisma } from "@prisma/client";
import { BusinessError } from "@/modules/shared";
import type { AppContext } from "@/server/context";

export async function recordVitals(
  ctx: AppContext,
  input: {
    encounterId: string;
    temperatureC?: string;
    heartRateBpm?: string;
    respRateBpm?: string;
    weightKg?: string;
    bcs?: string;
    painScore?: string;
    note?: string;
  },
) {
  ctx.can("clinical:write");
  return ctx.tx(async (tx) => {
    const enc = await tx.encounter.findFirst({ where: { id: input.encounterId } });
    if (!enc) throw new BusinessError("ไม่พบเคส");
    ctx.can("clinical:write", { branchId: enc.branchId });

    const vital = await tx.vitalSign.create({
      data: {
        tenantId: ctx.tenantId,
        encounterId: enc.id,
        temperatureC: input.temperatureC ? new Prisma.Decimal(input.temperatureC) : null,
        heartRateBpm: input.heartRateBpm ? Number(input.heartRateBpm) : null,
        respRateBpm: input.respRateBpm ? Number(input.respRateBpm) : null,
        weightKg: input.weightKg ? new Prisma.Decimal(input.weightKg) : null,
        bcs: input.bcs ? Number(input.bcs) : null,
        painScore: input.painScore ? Number(input.painScore) : null,
        note: input.note?.trim() || null,
        recordedById: ctx.actor.membershipId,
      },
    });

    if (input.weightKg) {
      const weight = new Prisma.Decimal(input.weightKg);
      await tx.petWeight.create({
        data: {
          tenantId: ctx.tenantId,
          petId: enc.petId,
          encounterId: enc.id,
          measuredAt: new Date(),
          weightKg: weight,
          recordedById: ctx.actor.membershipId,
        },
      });
      await tx.pet.update({
        where: { id: enc.petId },
        data: { currentWeightKg: weight, currentWeightAt: new Date() },
      });
    }

    return { id: vital.id };
  });
}
