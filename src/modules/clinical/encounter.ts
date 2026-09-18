import { BusinessError } from "@/modules/shared";
import type { AppContext } from "@/server/context";

const OPEN_STATUSES = ["WAITING", "IN_PROGRESS", "PENDING_RESULT", "READY_TO_BILL"] as const;

export async function getEncounterWorkspace(ctx: AppContext, encounterId: string) {
  ctx.can("patient:read");
  return ctx.tx(async (tx) => {
    const enc = await tx.encounter.findFirst({
      where: { id: encounterId },
      include: {
        pet: {
          include: {
            species: true,
            breed: true,
            alerts: true,
            weights: { orderBy: { measuredAt: "desc" }, take: 8 },
          },
        },
        owner: { include: { phones: true } },
        vitals: { orderBy: { recordedAt: "desc" }, take: 8 },
        soapNotes: { orderBy: { createdAt: "desc" }, include: { addenda: true } },
        orders: { include: { serviceItem: true }, orderBy: { orderedAt: "asc" } },
        prescriptions: { include: { product: true, dispenses: true }, orderBy: { prescribedAt: "asc" } },
        chargeItems: { orderBy: { occurredAt: "asc" } },
      },
    });
    if (!enc) throw new BusinessError("ไม่พบเคส");
    ctx.can("patient:read", { branchId: enc.branchId });
    const clinical =
      ctx.actor.kind === "system" || ctx.actor.permissions.has("clinical:read");

    const prior = clinical
      ? await tx.soapNote.findMany({
      where: {
        encounter: { petId: enc.petId, id: { not: enc.id } },
        signedAt: { not: null },
      },
      orderBy: { signedAt: "desc" },
      take: 3,
      include: { encounter: { select: { number: true, arrivedAt: true } } },
    })
      : [];

    const products = clinical
      ? await tx.product.findMany({
      where: { type: { in: ["DRUG", "VACCINE"] }, isActive: true, deletedAt: null },
      orderBy: { name: "asc" },
      take: 80,
    })
      : [];
    const services = clinical
      ? await tx.serviceItem.findMany({
          where: { isActive: true, category: { in: ["LAB", "IMAGING", "PROCEDURE", "CONSULT"] } },
          orderBy: { sortOrder: "asc" },
        })
      : [];

    return {
      id: enc.id,
      number: enc.number,
      type: enc.type,
      status: enc.status,
      chiefComplaint: enc.chiefComplaint,
      arrivedAt: enc.arrivedAt.toISOString(),
      startedAt: enc.startedAt?.toISOString() ?? null,
      pet: {
        id: enc.pet.id,
        code: enc.pet.code,
        name: enc.pet.name,
        speciesNameTh: enc.pet.species.nameTh,
        breedNameTh: enc.pet.breed?.nameTh ?? null,
        sex: enc.pet.sex,
        currentWeightKg: enc.pet.currentWeightKg?.toString() ?? null,
        alerts: enc.pet.alerts.map((a) => ({ type: a.type, severity: a.severity, label: a.label })),
        weights: enc.pet.weights.map((w) => ({
          measuredAt: w.measuredAt.toISOString(),
          weightKg: w.weightKg.toString(),
        })),
      },
      owner: {
        id: enc.owner.id,
        code: enc.owner.code,
        name: [enc.owner.firstName, enc.owner.lastName].filter(Boolean).join(" "),
        phone: enc.owner.phones.find((p) => p.isPrimary)?.digits ?? enc.owner.phones[0]?.digits ?? null,
      },
      vitals: clinical
        ? enc.vitals.map((v) => ({
        id: v.id,
        recordedAt: v.recordedAt.toISOString(),
        temperatureC: v.temperatureC?.toString() ?? null,
        heartRateBpm: v.heartRateBpm,
        respRateBpm: v.respRateBpm,
        weightKg: v.weightKg?.toString() ?? null,
        bcs: v.bcs,
        painScore: v.painScore,
        note: v.note,
      }))
        : [],
      soapNotes: clinical
        ? enc.soapNotes.map((s) => ({
        id: s.id,
        subjective: s.subjective,
        objective: s.objective,
        assessment: s.assessment,
        plan: s.plan,
        signedAt: s.signedAt?.toISOString() ?? null,
        updatedAt: s.updatedAt.toISOString(),
        addenda: s.addenda.map((a) => ({
          id: a.id,
          content: a.content,
          reason: a.reason,
          createdAt: a.createdAt.toISOString(),
        })),
      }))
        : [],
      priorSoap: prior.map((s) => ({
        encounterNumber: s.encounter.number,
        arrivedAt: s.encounter.arrivedAt.toISOString(),
        assessment: s.assessment,
        plan: s.plan,
      })),
      orders: clinical
        ? enc.orders.map((o) => ({
        id: o.id,
        type: o.type,
        description: o.description,
        status: o.status,
        serviceItemId: o.serviceItemId,
      }))
        : [],
      prescriptions: clinical
        ? enc.prescriptions.map((rx) => ({
        id: rx.id,
        productName: rx.product.name,
        instructionTh: rx.instructionTh,
        totalQtyBase: rx.totalQtyBase.toString(),
        doseUnit: rx.doseUnit,
        status: rx.status,
      }))
        : [],
      charges: enc.chargeItems.map((c) => ({
        id: c.id,
        description: c.description,
        qty: c.qty.toString(),
        amountSatang: c.amountSatang,
        status: c.status,
      })),
      catalog: {
        products: products.map((p) => ({
          id: p.id,
          name: p.name,
          strength: p.strength,
          baseUnit: p.baseUnit,
          genericName: p.genericName,
        })),
        services: services.map((s) => ({
          id: s.id,
          name: s.name,
          category: s.category,
          priceSatang: s.priceSatang,
        })),
      },
    };
  });
}

export async function listWhiteboard(ctx: AppContext) {
  ctx.can("patient:read");
  if (!ctx.branchId) throw new BusinessError("ต้องระบุสาขา");
  return ctx.tx(async (tx) => {
    const rows = await tx.encounter.findMany({
      where: {
        branchId: ctx.branchId!,
        status: { in: [...OPEN_STATUSES] },
      },
      include: {
        pet: { include: { species: true, alerts: true } },
        owner: true,
      },
      orderBy: { arrivedAt: "asc" },
      take: 120,
    });
    return rows.map((enc) => ({
      id: enc.id,
      number: enc.number,
      status: enc.status,
      type: enc.type,
      arrivedAt: enc.arrivedAt.toISOString(),
      chiefComplaint: enc.chiefComplaint,
      petName: enc.pet.name,
      petCode: enc.pet.code,
      speciesNameTh: enc.pet.species.nameTh,
      ownerName: [enc.owner.firstName, enc.owner.lastName].filter(Boolean).join(" "),
      alerts: enc.pet.alerts.map((a) => ({ type: a.type, severity: a.severity, label: a.label })),
    }));
  });
}

export async function setEncounterStatus(
  ctx: AppContext,
  encounterId: string,
  status: "IN_PROGRESS" | "PENDING_RESULT" | "READY_TO_BILL" | "CANCELLED",
) {
  ctx.can("clinical:write");
  return ctx.tx(async (tx) => {
    const enc = await tx.encounter.findFirst({ where: { id: encounterId } });
    if (!enc) throw new BusinessError("ไม่พบเคส");
    ctx.can("clinical:write", { branchId: enc.branchId });
    const data: { status: typeof status; startedAt?: Date; endedAt?: Date } = { status };
    if (status === "IN_PROGRESS" && !enc.startedAt) data.startedAt = new Date();
    if (status === "READY_TO_BILL") data.endedAt = new Date();
    await tx.encounter.update({ where: { id: enc.id }, data });
    ctx.emit("encounter.status_changed", { encounterId: enc.id, status });
    return { id: enc.id, status };
  });
}
