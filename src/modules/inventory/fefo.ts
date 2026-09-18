import { Prisma, type StockMovementType } from "@prisma/client";
import { bangkokBusinessDate, BusinessError } from "@/modules/shared";

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

  const todayStart = new Date(`${bangkokBusinessDate()}T00:00:00+07:00`);
  const lots = await tx.stockOnHand.findMany({
    where: {
      tenantId: input.tenantId,
      branchId: input.branchId,
      productId: input.productId,
      qtyBase: { gt: 0 },
      lot: {
        isQuarantined: false,
        OR: [{ expiryDate: null }, { expiryDate: { gte: todayStart } }],
      },
    },
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
