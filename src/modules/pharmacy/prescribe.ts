import { Prisma } from "@prisma/client";
import { z } from "zod";
import { BusinessError } from "@/modules/shared";
import { writeAuditLog } from "@/server/audit";
import type { AppContext } from "@/server/context";
import { buildInstructionTh, calculateDose, frequencyTimesPerDay, parseStrengthMg } from "./dose";

export const prescribeInputSchema = z.object({
  encounterId: z.string().min(8, "ไม่พบเคส"),
  productId: z.string().min(8, "ไม่พบยา"),
  mgPerKg: z
    .string()
    .regex(/^\d+(\.\d+)?$/, "ขนาด มก./กก. ไม่ถูกต้อง")
    .optional(),
  route: z.string().min(1, "ระบุช่องทางยา"),
  frequencyCode: z.string().min(1, "ระบุความถี่"),
  durationDays: z.coerce.number().int("จำนวนวันต้องเป็นจำนวนเต็ม").min(1, "จำนวนวันต้องมากกว่าศูนย์").max(365),
  doseAmount: z
    .string()
    .regex(/^\d+(\.\d{1,4})?$/, "จำนวนต่อครั้งไม่ถูกต้อง")
    .optional(),
  withFood: z.boolean().optional(),
  instructionTh: z.string().optional(),
  warningTh: z.string().optional(),
});

export type PrescribeInput = z.infer<typeof prescribeInputSchema>;

export async function prescribe(ctx: AppContext, raw: PrescribeInput) {
  const parsed = prescribeInputSchema.safeParse(raw);
  if (!parsed.success) {
    throw new BusinessError(parsed.error.issues[0]?.message ?? "ข้อมูลใบสั่งยาไม่ถูกต้อง");
  }
  const input = parsed.data;
  ctx.can("pharmacy:prescribe");
  if (!ctx.branchId) throw new BusinessError("ต้องระบุสาขา");
  if (!ctx.actor.membershipId) throw new BusinessError("บัญชีนี้ยังไม่ได้ผูกเป็นพนักงาน");

  return ctx.tx(async (tx) => {
    const encounter = await tx.encounter.findFirst({
      where: { id: input.encounterId },
      include: {
        pet: { include: { alerts: true, weights: { orderBy: { measuredAt: "desc" }, take: 1 } } },
      },
    });
    if (!encounter) throw new BusinessError("ไม่พบเคส");
    ctx.can("pharmacy:prescribe", { branchId: encounter.branchId });
    if (["CLOSED", "CANCELLED"].includes(encounter.status)) {
      throw new BusinessError("เคสนี้ปิดแล้ว สั่งยาไม่ได้");
    }

    const product = await tx.product.findFirst({ where: { id: input.productId, isActive: true } });
    if (!product) throw new BusinessError("ไม่พบยา");

    const weight = encounter.pet.weights[0]?.weightKg ?? encounter.pet.currentWeightKg;
    if (!weight) throw new BusinessError("ยังไม่มีน้ำหนัก ณ วันเปิดเคส — กลับไปชั่งที่เคาน์เตอร์");

    const timesPerDay = frequencyTimesPerDay(input.frequencyCode);
    const strengthMg = parseStrengthMg(product.strength);
    const mgPerKg = input.mgPerKg ? Number(input.mgPerKg) : null;

    let doseAmount: Prisma.Decimal;
    let totalQtyBase: Prisma.Decimal;
    if (mgPerKg && strengthMg) {
      const calc = calculateDose({
        mgPerKg,
        weightKg: Number(weight),
        strengthMg,
        timesPerDay,
        durationDays: input.durationDays,
        round: "WHOLE",
      });
      doseAmount = new Prisma.Decimal(calc.unitsPerDose);
      totalQtyBase = new Prisma.Decimal(calc.totalQtyBase);
    } else if (input.doseAmount) {
      doseAmount = new Prisma.Decimal(input.doseAmount);
      if (doseAmount.lte(0)) throw new BusinessError("จำนวนยาต่อครั้งต้องมากกว่าศูนย์");
      totalQtyBase = doseAmount.mul(timesPerDay).mul(input.durationDays);
      if (totalQtyBase.lte(0)) throw new BusinessError("จำนวนยาทั้งหมดต้องมากกว่าศูนย์");
    } else {
      throw new BusinessError("กรอกขนาดยา (มก./กก.) หรือจำนวนต่อครั้ง");
    }

    const instructionTh =
      input.instructionTh?.trim() ||
      buildInstructionTh({
        doseAmount: Number(doseAmount),
        doseUnit: product.baseUnit,
        route: input.route,
        frequencyCode: input.frequencyCode,
        durationDays: input.durationDays,
        withFood: input.withFood,
      });

    const allergyHits = encounter.pet.alerts.filter(
      (a) =>
        (a.type === "ALLERGY" || a.type === "DRUG_REACTION") &&
        (a.severity === "HIGH" || a.severity === "CRITICAL") &&
        productNameMatchesAlert(product.name, product.genericName, a.label),
    );

    const rx = await tx.prescription.create({
      data: {
        tenantId: ctx.tenantId,
        branchId: ctx.branchId!,
        encounterId: encounter.id,
        petId: encounter.petId,
        productId: product.id,
        doseAmount,
        doseUnit: product.baseUnit,
        weightKgAtOrder: weight,
        mgPerKg: mgPerKg ? new Prisma.Decimal(mgPerKg) : null,
        route: input.route,
        frequencyCode: input.frequencyCode,
        timesPerDay,
        durationDays: input.durationDays,
        totalQtyBase,
        instructionTh,
        warningTh: input.warningTh ?? (allergyHits.length ? `เตือนแพ้ยา: ${allergyHits.map((a) => a.label).join(", ")}` : null),
        withFood: input.withFood ?? null,
        status: "ACTIVE",
        prescriberId: ctx.actor.membershipId!,
      },
    });

    ctx.emit("prescription.created", { prescriptionId: rx.id, encounterId: encounter.id });
    await writeAuditLog(tx, ctx, {
      action: "prescription.created",
      entityType: "Prescription",
      entityId: rx.id,
      after: { productId: product.id, totalQtyBase: totalQtyBase.toString() },
    });

    return {
      id: rx.id,
      totalQtyBase: totalQtyBase.toString(),
      doseAmount: doseAmount.toString(),
      instructionTh,
      weightKgAtOrder: weight.toString(),
      allergyWarnings: allergyHits.map((a) => a.label),
    };
  });
}

function productNameMatchesAlert(name: string, generic: string | null, label: string): boolean {
  const hay = `${name} ${generic ?? ""}`.toLowerCase();
  const needle = label.toLowerCase();
  const tokens = needle.split(/[^a-z0-9ก-๙]+/).filter((t) => t.length >= 4);
  return tokens.some((t) => hay.includes(t)) || hay.includes(needle);
}

export async function listPendingPrescriptions(ctx: AppContext) {
  ctx.can("pharmacy:dispense");
  if (!ctx.branchId) throw new BusinessError("ต้องระบุสาขา");
  return ctx.tx(async (tx) => {
    const rows = await tx.prescription.findMany({
      where: {
        branchId: ctx.branchId!,
        status: { in: ["ACTIVE", "PARTIALLY_DISPENSED"] },
      },
      include: {
        product: true,
        pet: { include: { species: true, alerts: true, owner: true } },
        encounter: true,
        dispenses: true,
      },
      orderBy: { prescribedAt: "asc" },
      take: 80,
    });
    return rows.map((rx) => {
      const dispensed = rx.dispenses.reduce((s, d) => s.plus(d.qtyBase), new Prisma.Decimal(0));
      const remaining = rx.totalQtyBase.minus(dispensed);
      return {
        id: rx.id,
        encounterId: rx.encounterId,
        encounterNumber: rx.encounter?.number ?? null,
        petName: rx.pet.name,
        petCode: rx.pet.code,
        speciesNameTh: rx.pet.species.nameTh,
        ownerName: [rx.pet.owner.firstName, rx.pet.owner.lastName].filter(Boolean).join(" "),
        productName: rx.product.name,
        productId: rx.product.id,
        instructionTh: rx.instructionTh,
        warningTh: rx.warningTh,
        totalQtyBase: rx.totalQtyBase.toString(),
        remainingQty: remaining.toString(),
        doseUnit: rx.doseUnit,
        status: rx.status,
        alerts: rx.pet.alerts.map((a) => ({ type: a.type, severity: a.severity, label: a.label })),
      };
    });
  });
}
