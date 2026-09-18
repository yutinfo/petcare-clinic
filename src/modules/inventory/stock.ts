import { Prisma } from "@prisma/client";
import { BusinessError, buddhistYearPeriod, thNormalize } from "@/modules/shared";
import { formatDocumentNumber, nextDocumentNumber } from "@/modules/tax";
import type { AppContext } from "@/server/context";

export async function listStockOnHand(ctx: AppContext) {
  ctx.can("inventory:read");
  if (!ctx.branchId) throw new BusinessError("ต้องระบุสาขา");
  return ctx.tx(async (tx) => {
    const rows = await tx.stockOnHand.findMany({
      where: { branchId: ctx.branchId! },
      include: { product: true, lot: true },
      orderBy: [{ product: { name: "asc" } }, { lot: { expiryDate: "asc" } }],
    });
    return rows.map((r) => ({
      productId: r.productId,
      productCode: r.product.code,
      productName: r.product.name,
      baseUnit: r.product.baseUnit,
      lotId: r.lotId,
      lotNo: r.lot.lotNo,
      expiryDate: r.lot.expiryDate?.toISOString().slice(0, 10) ?? null,
      qtyBase: r.qtyBase.toString(),
      priceSatang: r.product.defaultPriceSatang,
      type: r.product.type,
      requiresPrescription: r.product.requiresPrescription,
    }));
  });
}

export async function searchProducts(ctx: AppContext, query: string) {
  if (!ctx.actor.permissions.has("inventory:read") && !ctx.actor.permissions.has("billing:read")) {
    ctx.can("inventory:read");
  }
  const q = query.trim();
  return ctx.tx(async (tx) => {
    const rows = await tx.product.findMany({
      where: {
        isActive: true,
        deletedAt: null,
        ...(q.length >= 1
          ? {
              OR: [
                { name: { contains: q, mode: "insensitive" } },
                { code: { contains: q, mode: "insensitive" } },
                { barcode: q },
                { genericName: { contains: q, mode: "insensitive" } },
                { searchKey: { contains: thNormalize(q) } },
              ],
            }
          : {}),
      },
      orderBy: { name: "asc" },
      take: 40,
    });
    const ids = rows.map((p) => p.id);
    const onHand =
      ctx.branchId && ids.length
        ? await tx.stockOnHand.groupBy({
            by: ["productId"],
            where: { branchId: ctx.branchId, productId: { in: ids } },
            _sum: { qtyBase: true },
          })
        : [];
    const qtyMap = new Map(onHand.map((h) => [h.productId, h._sum.qtyBase?.toString() ?? "0"]));
    return rows.map((p) => ({
      id: p.id,
      code: p.code,
      name: p.name,
      genericName: p.genericName,
      type: p.type,
      strength: p.strength,
      baseUnit: p.baseUnit,
      defaultPriceSatang: p.defaultPriceSatang,
      taxCode: p.taxCode,
      requiresPrescription: p.requiresPrescription,
      isControlled: p.isControlled,
      qtyOnHand: qtyMap.get(p.id) ?? "0",
    }));
  });
}

export async function listCatalogServices(ctx: AppContext) {
  ctx.can("billing:read");
  return ctx.tx(async (tx) => {
    const rows = await tx.serviceItem.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
    return rows.map((s) => ({
      id: s.id,
      code: s.code,
      name: s.name,
      category: s.category,
      priceSatang: s.priceSatang,
      taxCode: s.taxCode,
      durationMinutes: s.durationMinutes,
    }));
  });
}

export async function receiveStock(
  ctx: AppContext,
  input: {
    productId: string;
    qty: string;
    lotNo: string;
    expiryDate?: string;
    unitCostSatang?: number;
  },
) {
  ctx.can("inventory:receive");
  if (!ctx.branchId) throw new BusinessError("ต้องระบุสาขา");
  const qty = new Prisma.Decimal(input.qty);
  if (qty.lte(0)) throw new BusinessError("จำนวนรับเข้าต้องมากกว่าศูนย์");

  return ctx.tx(async (tx) => {
    const product = await tx.product.findFirst({ where: { id: input.productId } });
    if (!product) throw new BusinessError("ไม่พบสินค้า");
    const branch = await tx.branch.findFirst({ where: { id: ctx.branchId! } });
    if (!branch) throw new BusinessError("ไม่พบสาขา");

    const lot =
      (await tx.stockLot.findFirst({
        where: {
          tenantId: ctx.tenantId,
          branchId: branch.id,
          productId: product.id,
          lotNo: input.lotNo.trim(),
        },
      })) ??
      (await tx.stockLot.create({
        data: {
          tenantId: ctx.tenantId,
          branchId: branch.id,
          productId: product.id,
          lotNo: input.lotNo.trim(),
          expiryDate: input.expiryDate ? new Date(input.expiryDate) : null,
          unitCostSatang: input.unitCostSatang ?? product.costSatang ?? 0,
        },
      }));

    const period = buddhistYearPeriod();
    const seq = await nextDocumentNumber(tx, ctx.tenantId, branch.id, "GR", period);
    const receipt = await tx.goodsReceipt.create({
      data: {
        tenantId: ctx.tenantId,
        branchId: branch.id,
        number: formatDocumentNumber("GR", branch.code, period, seq),
        supplierId: await ensureWalkInSupplier(tx, ctx.tenantId),
        receivedById: ctx.actor.membershipId ?? ctx.actor.userId,
        lines: {
          create: {
            tenantId: ctx.tenantId,
            productId: product.id,
            unitName: product.baseUnit,
            qty,
            qtyBase: qty,
            lotNo: lot.lotNo,
            expiryDate: lot.expiryDate,
            unitCostSatang: lot.unitCostSatang,
            lotId: lot.id,
          },
        },
      },
    });

    await tx.stockMovement.create({
      data: {
        tenantId: ctx.tenantId,
        branchId: branch.id,
        productId: product.id,
        lotId: lot.id,
        type: "RECEIPT",
        qtyBase: qty,
        unitCostSatang: lot.unitCostSatang,
        refType: "GOODS_RECEIPT",
        refId: receipt.id,
        performedById: ctx.actor.membershipId ?? ctx.actor.userId,
      },
    });

    ctx.emit("inventory.received", { productId: product.id, lotId: lot.id, qtyBase: qty.toString() });
    return { receiptId: receipt.id, lotId: lot.id, number: receipt.number };
  });
}

async function ensureWalkInSupplier(tx: Prisma.TransactionClient, tenantId: string) {
  const existing = await tx.supplier.findFirst({ where: { tenantId, code: "WALKIN" } });
  if (existing) return existing.id;
  const created = await tx.supplier.create({
    data: { tenantId, code: "WALKIN", name: "รับเข้าทั่วไป" },
  });
  return created.id;
}

export async function ensureProduct(
  tx: Prisma.TransactionClient,
  tenantId: string,
  data: {
    code: string;
    name: string;
    type: "DRUG" | "VACCINE" | "CONSUMABLE" | "FOOD" | "RETAIL" | "SUPPLEMENT";
    baseUnit: string;
    defaultPriceSatang: number;
    taxCode?: "VAT7" | "VAT0" | "EXEMPT" | "NONVAT";
    genericName?: string;
    strength?: string;
    requiresPrescription?: boolean;
    isControlled?: boolean;
    barcode?: string;
    costSatang?: number;
  },
) {
  const found = await tx.product.findFirst({ where: { tenantId, code: data.code } });
  if (found) return found;
  return tx.product.create({
    data: {
      tenantId,
      code: data.code,
      name: data.name,
      genericName: data.genericName ?? null,
      searchKey: thNormalize(`${data.name}${data.genericName ?? ""}${data.code}`),
      type: data.type,
      strength: data.strength ?? null,
      baseUnit: data.baseUnit,
      defaultPriceSatang: data.defaultPriceSatang,
      costSatang: data.costSatang ?? null,
      taxCode: data.taxCode ?? "VAT7",
      requiresPrescription: data.requiresPrescription ?? false,
      isControlled: data.isControlled ?? false,
      barcode: data.barcode ?? null,
    },
  });
}

