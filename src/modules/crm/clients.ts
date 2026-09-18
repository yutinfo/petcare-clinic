import { BusinessError } from "@/modules/shared";
import type { AppContext } from "@/server/context";

export async function getOwnerProfile(ctx: AppContext, ownerId: string) {
  ctx.can("patient:read");
  return ctx.tx(async (tx) => {
    const owner = await tx.owner.findFirst({
      where: { id: ownerId },
      include: {
        phones: true,
        pets: {
          where: { deletedAt: null },
          include: { species: true, alerts: true },
          orderBy: { name: "asc" },
        },
        invoices: { orderBy: { createdAt: "desc" }, take: 8 },
      },
    });
    if (!owner) throw new BusinessError("ไม่พบลูกค้า");
    return {
      id: owner.id,
      code: owner.code,
      name: [owner.firstName, owner.lastName].filter(Boolean).join(" "),
      phone: owner.phones.find((p) => p.isPrimary)?.digits ?? owner.phones[0]?.digits ?? null,
      email: owner.email,
      address: [owner.addressLine, owner.district, owner.province].filter(Boolean).join(" ") || null,
      taxId: owner.taxId,
      pets: owner.pets.map((p) => ({
        id: p.id,
        code: p.code,
        name: p.name,
        speciesNameTh: p.species.nameTh,
        currentWeightKg: p.currentWeightKg?.toString() ?? null,
        alerts: p.alerts.map((a) => ({ type: a.type, severity: a.severity, label: a.label })),
      })),
      invoices: owner.invoices.map((i) => ({
        id: i.id,
        number: i.number,
        status: i.status,
        grandTotalSatang: i.grandTotalSatang,
        issuedAt: i.issuedAt?.toISOString() ?? i.createdAt.toISOString(),
      })),
    };
  });
}

export async function getPetProfile(ctx: AppContext, petId: string) {
  ctx.can("patient:read");
  return ctx.tx(async (tx) => {
    const pet = await tx.pet.findFirst({
      where: { id: petId },
      include: {
        species: true,
        breed: true,
        owner: { include: { phones: true } },
        alerts: true,
        weights: { orderBy: { measuredAt: "desc" }, take: 12 },
        encounters: { orderBy: { arrivedAt: "desc" }, take: 12 },
        vaccinations: { orderBy: { administeredAt: "desc" }, take: 8, include: { product: true } },
      },
    });
    if (!pet) throw new BusinessError("ไม่พบสัตว์");
    return {
      id: pet.id,
      code: pet.code,
      name: pet.name,
      speciesNameTh: pet.species.nameTh,
      breedNameTh: pet.breed?.nameTh ?? null,
      sex: pet.sex,
      isNeutered: pet.isNeutered,
      currentWeightKg: pet.currentWeightKg?.toString() ?? null,
      owner: {
        id: pet.owner.id,
        name: [pet.owner.firstName, pet.owner.lastName].filter(Boolean).join(" "),
        phone: pet.owner.phones.find((p) => p.isPrimary)?.digits ?? null,
      },
      alerts: pet.alerts.map((a) => ({ type: a.type, severity: a.severity, label: a.label })),
      weights: pet.weights.map((w) => ({
        measuredAt: w.measuredAt.toISOString(),
        weightKg: w.weightKg.toString(),
      })),
      encounters: pet.encounters.map((e) => ({
        id: e.id,
        number: e.number,
        status: e.status,
        type: e.type,
        arrivedAt: e.arrivedAt.toISOString(),
        chiefComplaint: e.chiefComplaint,
      })),
      vaccinations: pet.vaccinations.map((v) => ({
        id: v.id,
        name: v.product?.name ?? v.vaccineName,
        administeredAt: v.administeredAt.toISOString(),
        nextDueAt: v.nextDueAt?.toISOString() ?? null,
      })),
    };
  });
}
