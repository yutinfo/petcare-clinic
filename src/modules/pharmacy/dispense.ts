import { Prisma } from "@prisma/client";
import { insertChargeItem } from "@/modules/billing";
import { consumeFefo } from "@/modules/inventory";
import { BusinessError } from "@/modules/shared";
import type { AppContext } from "@/server/context";

export async function dispensePrescription(
  ctx: AppContext,
  input: { prescriptionId: string; qtyBase?: string },
) {
  ctx.can("pharmacy:dispense");
  if (!ctx.branchId) throw new BusinessError("ต้องระบุสาขา");

  return ctx.tx(async (tx) => {
    const rx = await tx.prescription.findFirst({
      where: { id: input.prescriptionId },
      include: { product: true, pet: true, dispenses: true, encounter: true },
    });
    if (!rx) throw new BusinessError("ไม่พบใบสั่งยา");
    ctx.can("pharmacy:dispense", { branchId: rx.branchId });
    if (!["ACTIVE", "PARTIALLY_DISPENSED"].includes(rx.status)) {
      throw new BusinessError("ใบสั่งยานี้จ่ายไม่ได้แล้ว");
    }

    const already = rx.dispenses.reduce((s, d) => s.plus(d.qtyBase), new Prisma.Decimal(0));
    const remaining = rx.totalQtyBase.minus(already);
    const qty = input.qtyBase ? new Prisma.Decimal(input.qtyBase) : remaining;
    if (qty.lte(0)) throw new BusinessError("ไม่มีจำนวนเหลือให้จ่าย");
    if (qty.gt(remaining)) throw new BusinessError("จ่ายเกินจำนวนที่สั่ง");

    const dispense = await tx.dispense.create({
      data: {
        tenantId: ctx.tenantId,
        branchId: ctx.branchId!,
        prescriptionId: rx.id,
        productId: rx.productId,
        qtyBase: qty,
        dispensedById: ctx.actor.membershipId ?? ctx.actor.userId,
      },
    });

    const lots = await consumeFefo(tx, {
      tenantId: ctx.tenantId,
      branchId: ctx.branchId!,
      productId: rx.productId,
      qtyBase: qty,
      type: "DISPENSE",
      refType: "PRESCRIPTION",
      refId: rx.id,
      dispenseId: dispense.id,
      performedById: ctx.actor.membershipId ?? ctx.actor.userId,
    });

    await insertChargeItem(tx, ctx.tenantId, ctx.branchId!, ctx.actor.membershipId, {
      ownerId: rx.pet.ownerId,
      petId: rx.petId,
      sourceType: "ENCOUNTER",
      encounterId: rx.encounterId,
      itemType: "PRODUCT",
      productId: rx.productId,
      description: `${rx.product.name} ${rx.product.strength ?? ""}`.trim(),
      qty: qty.toString(),
      unitName: rx.product.baseUnit,
      unitPriceSatang: rx.product.defaultPriceSatang,
      taxCode: rx.product.taxCode,
    });

    const newDispensed = already.plus(qty);
    const status =
      newDispensed.gte(rx.totalQtyBase) ? "DISPENSED" : "PARTIALLY_DISPENSED";
    await tx.prescription.update({
      where: { id: rx.id },
      data: { status },
    });

    ctx.emit("prescription.dispensed", {
      prescriptionId: rx.id,
      dispenseId: dispense.id,
      qtyBase: qty.toString(),
    });

    return {
      dispenseId: dispense.id,
      status,
      lots: lots.map((l) => ({
        lotNo: l.lotNo,
        qty: l.qty.toString(),
        expiryDate: l.expiryDate?.toISOString().slice(0, 10) ?? null,
      })),
      instructionTh: rx.instructionTh,
      petName: rx.pet.name,
      productName: rx.product.name,
    };
  });
}
