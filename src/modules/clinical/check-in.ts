import { Prisma } from "@prisma/client";
import { insertChargeItem } from "@/modules/billing";
import { formatDocumentNumber, nextDocumentNumber } from "@/modules/tax";
import { buddhistYearPeriod, BusinessError } from "@/modules/shared";
import type { AppContext } from "@/server/context";

export type CheckInInput = {
  petId: string;
  weightKg?: string;
  chiefComplaint?: string;
  type?: "OPD" | "EMERGENCY" | "VACCINE" | "RECHECK";
};

export async function checkInPet(ctx: AppContext, input: CheckInInput) {
  ctx.can("scheduling:write");
  if (!ctx.branchId) throw new BusinessError("ต้องระบุสาขา");

  const weight = parseWeight(input.weightKg);

  return ctx.tx(async (tx) => {
    const pet = await tx.pet.findFirst({
      where: { id: input.petId, deletedAt: null },
      include: {
        owner: true,
        species: true,
        alerts: true,
      },
    });
    if (!pet) throw new BusinessError("ไม่พบสัตว์");

    const open = await tx.encounter.findFirst({
      where: {
        petId: pet.id,
        status: { in: ["WAITING", "IN_PROGRESS", "PENDING_RESULT"] },
      },
      orderBy: { arrivedAt: "desc" },
    });
    if (open) {
      return {
        reused: true as const,
        encounterId: open.id,
        number: open.number,
        petName: pet.name,
        ownerName: [pet.owner.firstName, pet.owner.lastName].filter(Boolean).join(" "),
        alerts: pet.alerts.map((a) => ({ type: a.type, severity: a.severity, label: a.label })),
      };
    }

    const branch = await tx.branch.findFirst({
      where: { id: ctx.branchId!, tenantId: ctx.tenantId },
    });
    if (!branch) throw new BusinessError("ไม่พบสาขา");

    const period = buddhistYearPeriod();
    const seq = await nextDocumentNumber(tx, ctx.tenantId, branch.id, "ENCOUNTER", period);
    const number = formatDocumentNumber("VN", branch.code, period, seq);

    const encounter = await tx.encounter.create({
      data: {
        tenantId: ctx.tenantId,
        branchId: branch.id,
        number,
        type: input.type ?? "OPD",
        status: "WAITING",
        petId: pet.id,
        ownerId: pet.ownerId,
        chiefComplaint: input.chiefComplaint?.trim() || null,
        createdById: ctx.actor.membershipId,
      },
    });

    if (weight) {
      await tx.petWeight.create({
        data: {
          tenantId: ctx.tenantId,
          petId: pet.id,
          encounterId: encounter.id,
          measuredAt: new Date(),
          weightKg: weight,
          recordedById: ctx.actor.membershipId,
        },
      });
      await tx.pet.update({
        where: { id: pet.id },
        data: { currentWeightKg: weight, currentWeightAt: new Date() },
      });
    }

    const consult = await tx.serviceItem.findFirst({
      where: { tenantId: ctx.tenantId, code: "CONSULT-OPD", isActive: true },
    });
    if (consult) {
      await insertChargeItem(tx, ctx.tenantId, branch.id, ctx.actor.membershipId, {
        ownerId: pet.ownerId,
        petId: pet.id,
        sourceType: "ENCOUNTER",
        encounterId: encounter.id,
        itemType: "SERVICE",
        serviceItemId: consult.id,
        description: consult.name,
        qty: "1",
        unitName: "ครั้ง",
        unitPriceSatang: consult.priceSatang,
        taxCode: consult.taxCode,
      });
    }

    ctx.emit("encounter.checked_in", {
      encounterId: encounter.id,
      petId: pet.id,
      number,
    });

    return {
      reused: false as const,
      encounterId: encounter.id,
      number: encounter.number,
      petName: pet.name,
      ownerName: [pet.owner.firstName, pet.owner.lastName].filter(Boolean).join(" "),
      alerts: pet.alerts.map((a) => ({ type: a.type, severity: a.severity, label: a.label })),
    };
  });
}

export async function listWaitingEncounters(ctx: AppContext) {
  ctx.can("patient:read");
  if (!ctx.branchId) throw new BusinessError("ต้องระบุสาขา");

  return ctx.tx(async (tx) => {
    const rows = await tx.encounter.findMany({
      where: {
        branchId: ctx.branchId!,
        status: { in: ["WAITING", "IN_PROGRESS"] },
      },
      include: {
        pet: { include: { species: true, alerts: true } },
        owner: true,
      },
      orderBy: { arrivedAt: "asc" },
      take: 50,
    });

    return rows.map((enc) => ({
      id: enc.id,
      number: enc.number,
      status: enc.status,
      arrivedAt: enc.arrivedAt.toISOString(),
      chiefComplaint: enc.chiefComplaint,
      petName: enc.pet.name,
      petCode: enc.pet.code,
      speciesNameTh: enc.pet.species.nameTh,
      ownerName: [enc.owner.firstName, enc.owner.lastName].filter(Boolean).join(" "),
      alerts: enc.pet.alerts.map((a) => ({
        type: a.type,
        severity: a.severity,
        label: a.label,
      })),
    }));
  });
}

function parseWeight(raw?: string): Prisma.Decimal | null {
  if (!raw || raw.trim() === "") return null;
  if (!/^\d+(\.\d{1,3})?$/.test(raw.trim())) {
    throw new BusinessError("น้ำหนักไม่ถูกต้อง");
  }
  const value = new Prisma.Decimal(raw.trim());
  if (value.lte(0) || value.gte(500)) throw new BusinessError("น้ำหนักไม่สมเหตุสมผล");
  return value;
}
