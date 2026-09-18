import { Prisma, type ChargeItemType, type ChargeSourceType, type TaxCode } from "@prisma/client";
import {
  assertSatang,
  BusinessError,
  qtyTimesUnitSatang,
  subtractSatang,
} from "@/modules/shared";
import type { AppContext } from "@/server/context";

export type ChargeDraft = {
  ownerId: string;
  petId?: string | null;
  sourceType: ChargeSourceType;
  encounterId?: string | null;
  stayId?: string | null;
  groomingJobId?: string | null;
  posSaleId?: string | null;
  bookingId?: string | null;
  itemType: ChargeItemType;
  serviceItemId?: string | null;
  productId?: string | null;
  productUnitId?: string | null;
  description: string;
  qty: string | number;
  unitName?: string | null;
  unitPriceSatang: number;
  discountSatang?: number;
  taxCode: TaxCode;
  vatRatePercent?: string | number;
  performedById?: string | null;
};

export async function insertChargeItem(
  tx: Prisma.TransactionClient,
  tenantId: string,
  branchId: string,
  actorId: string | null,
  input: ChargeDraft,
) {
  const qty = new Prisma.Decimal(input.qty);
  if (qty.lte(0)) throw new BusinessError("จำนวนต้องมากกว่าศูนย์");
  const discount = input.discountSatang ?? 0;
  assertSatang(input.unitPriceSatang, "unitPriceSatang");
  assertSatang(discount, "discountSatang");
  const gross = qtyTimesUnitSatang(qty.toString(), input.unitPriceSatang);
  const amountSatang = subtractSatang(gross, discount);
  if (amountSatang < 0) throw new BusinessError("ยอดรายการติดลบ");

  const vatRate =
    input.taxCode === "VAT7" ? String(input.vatRatePercent ?? "7") : "0";

  return tx.chargeItem.create({
    data: {
      tenantId,
      branchId,
      ownerId: input.ownerId,
      petId: input.petId ?? null,
      sourceType: input.sourceType,
      encounterId: input.encounterId ?? null,
      stayId: input.stayId ?? null,
      groomingJobId: input.groomingJobId ?? null,
      posSaleId: input.posSaleId ?? null,
      bookingId: input.bookingId ?? null,
      itemType: input.itemType,
      serviceItemId: input.serviceItemId ?? null,
      productId: input.productId ?? null,
      productUnitId: input.productUnitId ?? null,
      description: input.description,
      qty,
      unitName: input.unitName ?? null,
      unitPriceSatang: input.unitPriceSatang,
      discountSatang: discount,
      taxCode: input.taxCode,
      vatRatePercent: vatRate,
      amountSatang,
      performedById: input.performedById ?? actorId,
      createdById: actorId,
      status: "OPEN",
    },
  });
}

export async function addManualCharge(ctx: AppContext, input: ChargeDraft) {
  ctx.can("billing:charge");
  if (!ctx.branchId) throw new BusinessError("ต้องระบุสาขา");
  return ctx.tx((tx) =>
    insertChargeItem(tx, ctx.tenantId, ctx.branchId!, ctx.actor.membershipId, input),
  );
}

export async function listOpenCharges(ctx: AppContext, ownerId?: string) {
  ctx.can("billing:read");
  if (!ctx.branchId) throw new BusinessError("ต้องระบุสาขา");
  return ctx.tx(async (tx) => {
    const rows = await tx.chargeItem.findMany({
      where: {
        branchId: ctx.branchId!,
        status: "OPEN",
        ...(ownerId ? { ownerId } : {}),
      },
      include: {
        owner: true,
        pet: true,
      },
      orderBy: { occurredAt: "asc" },
      take: 200,
    });
    return rows.map(toChargeView);
  });
}

export async function listEncounterCharges(ctx: AppContext, encounterId: string) {
  ctx.can("billing:read");
  return ctx.tx(async (tx) => {
    const rows = await tx.chargeItem.findMany({
      where: { encounterId, status: { in: ["OPEN", "INVOICED"] } },
      orderBy: { occurredAt: "asc" },
    });
    return rows.map(toChargeView);
  });
}

export function toChargeView(row: {
  id: string;
  description: string;
  qty: Prisma.Decimal;
  unitName: string | null;
  unitPriceSatang: number;
  discountSatang: number;
  amountSatang: number;
  taxCode: TaxCode;
  status: string;
  ownerId: string;
  petId: string | null;
  encounterId: string | null;
  sourceType: ChargeSourceType;
  pet?: { name: string } | null;
  owner?: { firstName: string; lastName: string | null } | null;
}) {
  return {
    id: row.id,
    description: row.description,
    qty: row.qty.toString(),
    unitName: row.unitName,
    unitPriceSatang: row.unitPriceSatang,
    discountSatang: row.discountSatang,
    amountSatang: row.amountSatang,
    taxCode: row.taxCode,
    status: row.status,
    ownerId: row.ownerId,
    petId: row.petId,
    encounterId: row.encounterId,
    sourceType: row.sourceType,
    petName: row.pet?.name ?? null,
    ownerName: row.owner
      ? [row.owner.firstName, row.owner.lastName].filter(Boolean).join(" ")
      : null,
  };
}

export type ChargeView = ReturnType<typeof toChargeView>;
