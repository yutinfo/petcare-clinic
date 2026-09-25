import type { Prisma } from "@prisma/client";
import { BusinessError, assertSatang } from "@/modules/shared";
import { writeAuditLog } from "@/server/audit";
import type { AppContext } from "@/server/context";

export type ShiftView = {
  id: string;
  status: string;
  openedAt: string;
  closedAt: string | null;
  openingFloatSatang: number;
  cashReceivedSatang: number;
  expectedCashSatang: number;
  countedCashSatang: number | null;
  varianceSatang: number | null;
  closingNote: string | null;
};

async function cashReceivedOnShift(tx: Prisma.TransactionClient, shiftId: string) {
  const [received, refunded] = await Promise.all([
    tx.payment.aggregate({
      where: { shiftId, method: "CASH", status: "SUCCEEDED" },
      _sum: { amountSatang: true },
    }),
    tx.payment.aggregate({
      where: { shiftId, method: "CASH", status: "REFUNDED" },
      _sum: { amountSatang: true },
    }),
  ]);
  return (received._sum.amountSatang ?? 0) - (refunded._sum.amountSatang ?? 0);
}

export async function findOpenCashierShift(ctx: AppContext) {
  ctx.can("cash:open_shift");
  if (!ctx.branchId) throw new BusinessError("ต้องระบุสาขา");
  if (!ctx.actor.membershipId) throw new BusinessError("บัญชีนี้ยังไม่ได้ผูกเป็นพนักงาน");
  return ctx.tx(async (tx) => {
    const row = await tx.cashierShift.findFirst({
      where: { branchId: ctx.branchId!, cashierId: ctx.actor.membershipId!, status: "OPEN" },
    });
    if (!row) return null;
    const cashReceivedSatang = await cashReceivedOnShift(tx, row.id);
    return {
      id: row.id,
      status: row.status,
      openedAt: row.openedAt.toISOString(),
      closedAt: row.closedAt?.toISOString() ?? null,
      openingFloatSatang: row.openingFloatSatang,
      cashReceivedSatang,
      expectedCashSatang: row.openingFloatSatang + cashReceivedSatang,
      countedCashSatang: row.countedCashSatang,
      varianceSatang: row.varianceSatang,
      closingNote: row.closingNote,
    } satisfies ShiftView;
  });
}

export async function openCashierShift(ctx: AppContext, input: { openingFloatSatang: number }) {
  ctx.can("cash:open_shift");
  if (!ctx.branchId) throw new BusinessError("ต้องระบุสาขา");
  if (!ctx.actor.membershipId) throw new BusinessError("บัญชีนี้ยังไม่ได้ผูกเป็นพนักงาน");
  const openingFloatSatang = assertSatang(input.openingFloatSatang, "openingFloatSatang");
  if (openingFloatSatang < 0) throw new BusinessError("เงินทอนตั้งต้นต้องไม่ติดลบ");

  return ctx.tx(async (tx) => {
    const existing = await tx.cashierShift.findFirst({
      where: { branchId: ctx.branchId!, cashierId: ctx.actor.membershipId!, status: "OPEN" },
    });
    if (existing) throw new BusinessError("มีกะที่เปิดอยู่แล้ว — ปิดกะก่อนเปิดใหม่");

    const shift = await tx.cashierShift.create({
      data: {
        tenantId: ctx.tenantId,
        branchId: ctx.branchId!,
        cashierId: ctx.actor.membershipId!,
        openingFloatSatang,
        status: "OPEN",
      },
    });
    await writeAuditLog(tx, ctx, {
      action: "shift.opened",
      entityType: "CashierShift",
      entityId: shift.id,
      after: { openingFloatSatang },
    });
    ctx.emit("shift.opened", { shiftId: shift.id });
    return { id: shift.id, openingFloatSatang };
  });
}

export async function closeCashierShift(
  ctx: AppContext,
  input: { countedCashSatang: number; closingNote?: string },
) {
  ctx.can("cash:close_shift");
  if (!ctx.branchId) throw new BusinessError("ต้องระบุสาขา");
  if (!ctx.actor.membershipId) throw new BusinessError("บัญชีนี้ยังไม่ได้ผูกเป็นพนักงาน");
  const countedCashSatang = assertSatang(input.countedCashSatang, "countedCashSatang");
  if (countedCashSatang < 0) throw new BusinessError("ยอดนับได้ต้องไม่ติดลบ");

  return ctx.tx(async (tx) => {
    const shift = await tx.cashierShift.findFirst({
      where: { branchId: ctx.branchId!, cashierId: ctx.actor.membershipId!, status: "OPEN" },
    });
    if (!shift) throw new BusinessError("ไม่มีกะที่เปิดอยู่");

    const cashReceivedSatang = await cashReceivedOnShift(tx, shift.id);
    const expectedCashSatang = shift.openingFloatSatang + cashReceivedSatang;
    const varianceSatang = countedCashSatang - expectedCashSatang;
    const note = input.closingNote?.trim() || null;

    if (varianceSatang !== 0) {
      if (!note) throw new BusinessError("ผลต่างเงินสดต้องระบุเหตุผล");
      const canApprove =
        ctx.actor.kind === "system" || ctx.actor.permissions.has("cash:approve_variance");
      if (!canApprove) {
        throw new BusinessError("ผลต่างเงินสดต้องให้ผู้จัดการอนุมัติ");
      }
    }

    await tx.cashierShift.update({
      where: { id: shift.id },
      data: {
        status: "CLOSED",
        closedAt: new Date(),
        closedById: ctx.actor.membershipId,
        expectedCashSatang,
        countedCashSatang,
        varianceSatang,
        closingNote: note,
      },
    });
    await writeAuditLog(tx, ctx, {
      action: "shift.closed",
      entityType: "CashierShift",
      entityId: shift.id,
      after: { expectedCashSatang, countedCashSatang, varianceSatang },
      reason: note ?? undefined,
    });
    ctx.emit("shift.closed", { shiftId: shift.id, varianceSatang });
    return { id: shift.id, expectedCashSatang, countedCashSatang, varianceSatang };
  });
}
