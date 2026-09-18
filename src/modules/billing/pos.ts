import { BusinessError, buddhistYearPeriod } from "@/modules/shared";
import { formatDocumentNumber, nextDocumentNumber } from "@/modules/tax";
import type { AppContext } from "@/server/context";
import { insertChargeItem } from "./charge";
import { issueInvoiceFromCharges } from "./invoice";

export async function addPosLine(
  ctx: AppContext,
  input: {
    ownerId: string;
    petId?: string | null;
    productId: string;
    qty: string;
    posSaleId?: string | null;
  },
) {
  ctx.can("billing:charge");
  if (!ctx.branchId) throw new BusinessError("ต้องระบุสาขา");

  return ctx.tx(async (tx) => {
    const product = await tx.product.findFirst({
      where: { id: input.productId, isActive: true, deletedAt: null },
    });
    if (!product) throw new BusinessError("ไม่พบสินค้า");
    if (product.requiresPrescription) {
      throw new BusinessError("สินค้านี้ต้องมีใบสั่งยา — จ่ายผ่านห้องยา");
    }

    let saleId = input.posSaleId ?? null;
    if (!saleId) {
      const period = buddhistYearPeriod();
      const branch = await tx.branch.findFirst({ where: { id: ctx.branchId! } });
      if (!branch) throw new BusinessError("ไม่พบสาขา");
      const seq = await nextDocumentNumber(tx, ctx.tenantId, branch.id, "POS", period);
      const sale = await tx.posSale.create({
        data: {
          tenantId: ctx.tenantId,
          branchId: branch.id,
          number: formatDocumentNumber("POS", branch.code, period, seq),
          ownerId: input.ownerId,
          cashierId: ctx.actor.membershipId ?? ctx.actor.userId,
          status: "OPEN",
        },
      });
      saleId = sale.id;
    }

    await insertChargeItem(tx, ctx.tenantId, ctx.branchId!, ctx.actor.membershipId, {
      ownerId: input.ownerId,
      petId: input.petId ?? null,
      sourceType: "POS",
      posSaleId: saleId,
      itemType: "PRODUCT",
      productId: product.id,
      description: product.name,
      qty: input.qty,
      unitName: product.baseUnit,
      unitPriceSatang: product.defaultPriceSatang,
      taxCode: product.taxCode,
    });

    return { posSaleId: saleId };
  });
}

export async function checkoutOwner(ctx: AppContext, ownerId: string, method: "CASH" | "PROMPTPAY" | "CREDIT_CARD") {
  ctx.can("billing:invoice");
  const open = await ctx.tx((tx) =>
    tx.chargeItem.findMany({
      where: { ownerId, branchId: ctx.branchId!, status: "OPEN" },
      select: { id: true, posSaleId: true },
    }),
  );
  if (open.length === 0) throw new BusinessError("ไม่มีรายการค้างชำระ");
  return issueInvoiceFromCharges(ctx, {
    chargeIds: open.map((c) => c.id),
    method,
  });
}
