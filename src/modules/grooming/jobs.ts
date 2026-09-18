import { insertChargeItem } from "@/modules/billing";
import { BusinessError, generateCode } from "@/modules/shared";
import type { AppContext } from "@/server/context";
import type { GroomingStatus } from "@prisma/client";

export async function listGroomingQueue(ctx: AppContext) {
  ctx.can("grooming:read");
  if (!ctx.branchId) throw new BusinessError("ต้องระบุสาขา");
  return ctx.tx(async (tx) => {
    const rows = await tx.groomingJob.findMany({
      where: {
        branchId: ctx.branchId!,
        status: { notIn: ["COMPLETED", "CANCELLED", "NO_SHOW"] },
      },
      include: {
        pet: { include: { species: true, groomingPreference: true } },
        owner: true,
        groomer: true,
      },
      orderBy: { createdAt: "asc" },
    });
    return rows.map((j) => ({
      id: j.id,
      code: j.code,
      status: j.status,
      petName: j.pet.name,
      speciesNameTh: j.pet.species.nameTh,
      ownerName: [j.owner.firstName, j.owner.lastName].filter(Boolean).join(" "),
      groomerName: j.groomer.name,
      styleNote: j.styleNote ?? j.pet.groomingPreference?.preferredStyle ?? null,
      clipperBladeSize: j.clipperBladeSize ?? j.pet.groomingPreference?.bladeSize ?? null,
    }));
  });
}

export async function startGroomingJob(
  ctx: AppContext,
  input: { petId: string; styleNote?: string; clipperBladeSize?: string },
) {
  ctx.can("grooming:write");
  if (!ctx.branchId) throw new BusinessError("ต้องระบุสาขา");
  return ctx.tx(async (tx) => {
    const pet = await tx.pet.findFirst({
      where: { id: input.petId },
      include: { groomingPreference: true },
    });
    if (!pet) throw new BusinessError("ไม่พบสัตว์");
    const groomer =
      (await tx.resource.findFirst({
        where: { branchId: ctx.branchId!, type: "GROOMER", isActive: true },
        orderBy: { sortOrder: "asc" },
      })) ??
      (await tx.resource.create({
        data: {
          tenantId: ctx.tenantId,
          branchId: ctx.branchId!,
          type: "GROOMER",
          code: "GRM-1",
          name: "ช่างกรูมมิ่ง",
        },
      }));

    const job = await tx.groomingJob.create({
      data: {
        tenantId: ctx.tenantId,
        branchId: ctx.branchId!,
        code: generateCode("GM"),
        status: "IN_PROGRESS",
        petId: pet.id,
        ownerId: pet.ownerId,
        groomerResourceId: groomer.id,
        styleNote: input.styleNote ?? pet.groomingPreference?.preferredStyle ?? null,
        clipperBladeSize: input.clipperBladeSize ?? pet.groomingPreference?.bladeSize ?? null,
        checkInAt: new Date(),
        startedAt: new Date(),
      },
    });
    ctx.emit("grooming.started", { jobId: job.id });
    return { id: job.id, code: job.code };
  });
}

export async function setGroomingStatus(ctx: AppContext, jobId: string, status: GroomingStatus) {
  ctx.can("grooming:write");
  if (!ctx.branchId) throw new BusinessError("ต้องระบุสาขา");
  return ctx.tx(async (tx) => {
    const job = await tx.groomingJob.findFirst({ where: { id: jobId } });
    if (!job) throw new BusinessError("ไม่พบคิวกรูมมิ่ง");
    ctx.can("grooming:write", { branchId: job.branchId });
    const data: {
      status: GroomingStatus;
      finishedAt?: Date;
      pickedUpAt?: Date;
    } = { status };
    if (status === "READY_FOR_PICKUP" || status === "COMPLETED") data.finishedAt = new Date();
    if (status === "COMPLETED") data.pickedUpAt = new Date();

    if (status === "COMPLETED" && job.status !== "COMPLETED") {
      const service = await tx.serviceItem.findFirst({
        where: { tenantId: ctx.tenantId, code: "GROOM-BATH" },
      });
      if (service) {
        await insertChargeItem(tx, ctx.tenantId, ctx.branchId!, ctx.actor.membershipId, {
          ownerId: job.ownerId,
          petId: job.petId,
          sourceType: "GROOMING",
          groomingJobId: job.id,
          itemType: "SERVICE",
          serviceItemId: service.id,
          description: service.name,
          qty: "1",
          unitName: "ครั้ง",
          unitPriceSatang: service.priceSatang,
          taxCode: service.taxCode,
        });
      }
    }

    await tx.groomingJob.update({ where: { id: job.id }, data });
    ctx.emit("grooming.status_changed", { jobId: job.id, status });
    return { id: job.id, status };
  });
}
