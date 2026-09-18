import { insertChargeItem } from "@/modules/billing";
import { BusinessError } from "@/modules/shared";
import type { AppContext } from "@/server/context";
import type { OrderType } from "@prisma/client";

export async function placeClinicalOrder(
  ctx: AppContext,
  input: { encounterId: string; serviceItemId: string; type?: OrderType },
) {
  ctx.can("clinical:write");
  if (!ctx.actor.membershipId) throw new BusinessError("บัญชีนี้ยังไม่ได้ผูกเป็นพนักงาน");

  return ctx.tx(async (tx) => {
    const enc = await tx.encounter.findFirst({ where: { id: input.encounterId } });
    if (!enc) throw new BusinessError("ไม่พบเคส");
    ctx.can("clinical:write", { branchId: enc.branchId });
    const service = await tx.serviceItem.findFirst({
      where: { id: input.serviceItemId, isActive: true },
    });
    if (!service) throw new BusinessError("ไม่พบบริการ");

    const type: OrderType =
      input.type ??
      (service.category === "LAB"
        ? "LAB"
        : service.category === "IMAGING"
          ? "IMAGING"
          : service.category === "PROCEDURE" || service.category === "SURGERY"
            ? "PROCEDURE"
            : "NURSING");

    const order = await tx.clinicalOrder.create({
      data: {
        tenantId: ctx.tenantId,
        encounterId: enc.id,
        type,
        serviceItemId: service.id,
        description: service.name,
        orderedById: ctx.actor.membershipId!,
      },
    });
    ctx.emit("order.placed", { orderId: order.id, encounterId: enc.id });
    return { id: order.id };
  });
}

export async function completeClinicalOrder(ctx: AppContext, orderId: string, resultSummary?: string) {
  ctx.can("clinical:write");
  if (!ctx.branchId) throw new BusinessError("ต้องระบุสาขา");

  return ctx.tx(async (tx) => {
    const order = await tx.clinicalOrder.findFirst({
      where: { id: orderId },
      include: { serviceItem: true, encounter: true },
    });
    if (!order) throw new BusinessError("ไม่พบคำสั่ง");
    ctx.can("clinical:write", { branchId: order.encounter.branchId });
    if (order.status === "COMPLETED") throw new BusinessError("ทำรายการนี้ไปแล้ว");
    if (order.status === "CANCELLED") throw new BusinessError("คำสั่งถูกยกเลิก");

    await tx.clinicalOrder.update({
      where: { id: order.id },
      data: {
        status: "COMPLETED",
        performedAt: new Date(),
        performedById: ctx.actor.membershipId,
        resultSummary: resultSummary?.trim() || null,
      },
    });

    if (order.serviceItem) {
      await insertChargeItem(tx, ctx.tenantId, ctx.branchId!, ctx.actor.membershipId, {
        ownerId: order.encounter.ownerId,
        petId: order.encounter.petId,
        sourceType: "ENCOUNTER",
        encounterId: order.encounterId,
        itemType: "SERVICE",
        serviceItemId: order.serviceItem.id,
        description: order.serviceItem.name,
        qty: "1",
        unitName: "ครั้ง",
        unitPriceSatang: order.serviceItem.priceSatang,
        taxCode: order.serviceItem.taxCode,
      });
    }

    ctx.emit("order.completed", { orderId: order.id });
    return { id: order.id };
  });
}
