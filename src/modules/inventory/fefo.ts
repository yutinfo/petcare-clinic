import { Prisma, type StockMovementType } from "@prisma/client";
import { bangkokBusinessDate, BusinessError } from "@/modules/shared";

function sellableOnHandWhere(input: { tenantId: string; branchId: string; productId: string }): Prisma.StockOnHandWhereInput {
  const todayStart = new Date(`${bangkokBusinessDate()}T00:00:00+07:00`);
  return {
    tenantId: input.tenantId,
    branchId: input.branchId,
    productId: input.productId,
    qtyBase: { gt: 0 },
    lot: {
      isQuarantined: false,
      OR: [{ expiryDate: null }, { expiryDate: { gte: todayStart } }],
    },
  };
}

export async function availableFefoQty(
  tx: Prisma.TransactionClient,
  input: { tenantId: string; branchId: string; productId: string },
) {
  const rows = await tx.stockOnHand.findMany({
    where: sellableOnHandWhere(input),
    select: { qtyBase: true },
  });
  return rows.reduce((sum, row) => sum.plus(row.qtyBase), new Prisma.Decimal(0));
}

export async function consumeFefo(
  tx: Prisma.TransactionClient,
  input: {
    tenantId: string;
    branchId: string;
    productId: string;
    qtyBase: Prisma.Decimal;
    type: StockMovementType;
    refType: string;
    refId: string;
    dispenseId?: string | null;
    performedById: string;
  },
) {
  if (input.qtyBase.lte(0)) throw new BusinessError("จำนวนตัดสต็อกต้องมากกว่าศูนย์");

  const lots = await tx.stockOnHand.findMany({
    where: sellableOnHandWhere(input),
    include: { lot: true },
    orderBy: [{ lot: { expiryDate: "asc" } }, { lot: { receivedAt: "asc" } }],
  });

  let remaining = input.qtyBase;
  const used: { lotId: string; lotNo: string; qty: Prisma.Decimal; expiryDate: Date | null }[] = [];

  for (const row of lots) {
    if (remaining.lte(0)) break;
    const take = remaining.lte(row.qtyBase) ? remaining : row.qtyBase;
    await tx.stockMovement.create({
      data: {
        tenantId: input.tenantId,
        branchId: input.branchId,
        productId: input.productId,
        lotId: row.lotId,
        type: input.type,
        qtyBase: take.neg(),
        refType: input.refType,
        refId: input.refId,
        dispenseId: input.dispenseId ?? null,
        performedById: input.performedById,
      },
    });
    used.push({
      lotId: row.lotId,
      lotNo: row.lot.lotNo,
      qty: take,
      expiryDate: row.lot.expiryDate,
    });
    remaining = remaining.minus(take);
  }

  if (remaining.gt(0)) {
    throw new BusinessError("สต็อกไม่พอ — ตรวจคลังหรือรับของเข้าก่อน");
  }
  return used;
}

/** คืนเข้าล็อตที่เคยตัดออกของบิลนี้ ไม่เกินจำนวนที่ขายหรือจ่ายไป */
export async function returnSoldLots(
  tx: Prisma.TransactionClient,
  input: {
    tenantId: string;
    branchId: string;
    productId: string;
    qtyBase: Prisma.Decimal;
    invoiceId: string;
    posSaleIds: string[];
    performedById: string;
  },
) {
  if (input.qtyBase.lte(0)) throw new BusinessError("จำนวนคืนต้องมากกว่าศูนย์");
  const refIds = [...new Set([input.invoiceId, ...input.posSaleIds])];
  const sold = await tx.stockMovement.findMany({
    where: {
      tenantId: input.tenantId,
      branchId: input.branchId,
      productId: input.productId,
      type: { in: ["SALE", "DISPENSE"] },
      refId: { in: refIds },
      qtyBase: { lt: 0 },
    },
  });
  const returned = await tx.stockMovement.findMany({
    where: {
      tenantId: input.tenantId,
      branchId: input.branchId,
      productId: input.productId,
      type: "RETURN_IN",
      refType: "INVOICE",
      refId: input.invoiceId,
    },
  });
  const returnable = new Map<string, Prisma.Decimal>();
  for (const row of sold) {
    if (!row.lotId) continue;
    returnable.set(row.lotId, (returnable.get(row.lotId) ?? new Prisma.Decimal(0)).plus(row.qtyBase.neg()));
  }
  for (const row of returned) {
    if (!row.lotId) continue;
    returnable.set(row.lotId, (returnable.get(row.lotId) ?? new Prisma.Decimal(0)).minus(row.qtyBase));
  }

  let remaining = input.qtyBase;
  for (const [lotId, available] of returnable) {
    if (remaining.lte(0)) break;
    if (available.lte(0)) continue;
    const take = remaining.lte(available) ? remaining : available;
    await tx.stockMovement.create({
      data: {
        tenantId: input.tenantId,
        branchId: input.branchId,
        productId: input.productId,
        lotId,
        type: "RETURN_IN",
        qtyBase: take,
        refType: "INVOICE",
        refId: input.invoiceId,
        performedById: input.performedById,
        reason: "คืนตามใบลดหนี้",
      },
    });
    remaining = remaining.minus(take);
  }
  if (remaining.gt(0)) throw new BusinessError("คืนได้ไม่เกินจำนวนที่ตัดสต็อกไป");
}
