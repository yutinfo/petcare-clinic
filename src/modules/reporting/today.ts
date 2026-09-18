import { BusinessError } from "@/modules/shared";
import type { AppContext } from "@/server/context";

export async function getBranchDashboard(ctx: AppContext) {
  ctx.can("patient:read");
  if (!ctx.branchId) throw new BusinessError("ต้องระบุสาขา");
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  return ctx.tx(async (tx) => {
    const [waiting, inProgress, ready, boarding, grooming, revenue] = await Promise.all([
      tx.encounter.count({ where: { branchId: ctx.branchId!, status: "WAITING" } }),
      tx.encounter.count({ where: { branchId: ctx.branchId!, status: "IN_PROGRESS" } }),
      tx.encounter.count({ where: { branchId: ctx.branchId!, status: "READY_TO_BILL" } }),
      tx.stay.count({ where: { branchId: ctx.branchId!, status: "CHECKED_IN" } }),
      tx.groomingJob.count({
        where: { branchId: ctx.branchId!, status: { in: ["CHECKED_IN", "IN_PROGRESS", "DRYING", "READY_FOR_PICKUP"] } },
      }),
      tx.invoice.aggregate({
        where: {
          branchId: ctx.branchId!,
          status: { in: ["ISSUED", "PARTIALLY_PAID", "PAID"] },
          issuedAt: { gte: start },
        },
        _sum: { grandTotalSatang: true },
      }),
    ]);

    const kennels = await tx.resource.count({
      where: { branchId: ctx.branchId!, type: "KENNEL", isActive: true },
    });

    return {
      waiting,
      inProgress,
      readyToBill: ready,
      boarding,
      grooming,
      kennels,
      todayRevenueSatang: revenue._sum.grandTotalSatang ?? 0,
    };
  });
}
