import type { Prisma } from "@prisma/client";
import { insertChargeItem } from "@/modules/billing";
import { bangkokBusinessDate, BusinessError, generateCode, parseBangkokDateTimeLocal } from "@/modules/shared";
import type { AppContext } from "@/server/context";

function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00+07:00`);
  d.setDate(d.getDate() + days);
  return bangkokBusinessDate(d);
}

function datesInclusive(from: string, to: string): string[] {
  const out: string[] = [];
  let cur = from;
  while (cur <= to) {
    out.push(cur);
    cur = addDays(cur, 1);
  }
  return out;
}

export async function listKennelBoard(ctx: AppContext) {
  ctx.can("boarding:checkin");
  if (!ctx.branchId) throw new BusinessError("ต้องระบุสาขา");
  return ctx.tx(async (tx) => {
    const kennels = await tx.resource.findMany({
      where: { branchId: ctx.branchId!, type: "KENNEL", isActive: true },
      include: { kennelProfile: true },
      orderBy: { sortOrder: "asc" },
    });
    const stays = await tx.stay.findMany({
      where: { branchId: ctx.branchId!, status: { in: ["RESERVED", "CHECKED_IN"] } },
      include: { pet: { include: { species: true } }, owner: true },
    });
    const byKennel = new Map(stays.map((s) => [s.kennelResourceId, s]));
    return kennels.map((k) => {
      const stay = byKennel.get(k.id);
      return {
        id: k.id,
        code: k.code,
        name: k.name,
        size: k.kennelProfile?.size ?? null,
        zone: k.kennelProfile?.zone ?? null,
        colorHex: k.colorHex,
        stay: stay
          ? {
              id: stay.id,
              code: stay.code,
              status: stay.status,
              petName: stay.pet.name,
              speciesNameTh: stay.pet.species.nameTh,
              ownerName: [stay.owner.firstName, stay.owner.lastName].filter(Boolean).join(" "),
              expectedOutAt: stay.expectedOutAt.toISOString(),
              billedThroughDate: stay.billedThroughDate
                ? stay.billedThroughDate.toISOString().slice(0, 10)
                : null,
            }
          : null,
      };
    });
  });
}

export async function checkInStay(
  ctx: AppContext,
  input: {
    petId: string;
    kennelResourceId: string;
    expectedOutAt: string;
    feedingPlan?: string;
    vaccineVerified?: boolean;
  },
) {
  ctx.can("boarding:checkin");
  if (!ctx.branchId) throw new BusinessError("ต้องระบุสาขา");
  let expectedOutAt: Date;
  try {
    expectedOutAt = parseBangkokDateTimeLocal(input.expectedOutAt);
  } catch {
    throw new BusinessError("กำหนดรับกลับไม่ถูกต้อง");
  }

  return ctx.tx(async (tx) => {
    const pet = await tx.pet.findFirst({ where: { id: input.petId }, include: { owner: true } });
    if (!pet) throw new BusinessError("ไม่พบสัตว์");
    const kennel = await tx.resource.findFirst({
      where: { id: input.kennelResourceId, type: "KENNEL" },
      include: { kennelProfile: true },
    });
    if (!kennel) throw new BusinessError("ไม่พบกรง");
    ctx.can("boarding:checkin", { branchId: kennel.branchId });

    const occupied = await tx.stay.findFirst({
      where: { kennelResourceId: kennel.id, status: { in: ["RESERVED", "CHECKED_IN"] } },
    });
    if (occupied && !kennel.kennelProfile?.allowSharing) {
      throw new BusinessError("กรงนี้ไม่ว่าง");
    }

    const service = kennel.kennelProfile?.dailyRateServiceId
      ? await tx.serviceItem.findFirst({ where: { id: kennel.kennelProfile.dailyRateServiceId } })
      : await tx.serviceItem.findFirst({ where: { tenantId: ctx.tenantId, code: "BOARD-NIGHT" } });
    if (!service) {
      throw new BusinessError("ยังไม่ได้ตั้งค่าราคาค่าห้องฝากเลี้ยง กรุณาเพิ่มรายการ BOARD-NIGHT ในแค็ตตาล็อก");
    }

    const stay = await tx.stay.create({
      data: {
        tenantId: ctx.tenantId,
        branchId: ctx.branchId!,
        code: generateCode("ST"),
        type: "BOARDING",
        status: "CHECKED_IN",
        petId: pet.id,
        ownerId: pet.ownerId,
        kennelResourceId: kennel.id,
        checkInAt: new Date(),
        expectedOutAt,
        feedingPlan: input.feedingPlan ?? null,
        dailyRateServiceId: service.id,
        dailyRateSatang: service.priceSatang,
        vaccineVerifiedAt: input.vaccineVerified ? new Date() : null,
        vaccineVerifiedById: input.vaccineVerified ? ctx.actor.membershipId : null,
        checkInById: ctx.actor.membershipId,
      },
    });
    ctx.emit("stay.checked_in", { stayId: stay.id });
    return { id: stay.id, code: stay.code };
  });
}

export async function checkOutStay(ctx: AppContext, stayId: string) {
  ctx.can("boarding:checkout");
  if (!ctx.branchId) throw new BusinessError("ต้องระบุสาขา");
  return ctx.tx(async (tx) => {
    const stay = await tx.stay.findFirst({ where: { id: stayId } });
    if (!stay) throw new BusinessError("ไม่พบการเข้าพัก");
    ctx.can("boarding:checkout", { branchId: stay.branchId });
    if (stay.status !== "CHECKED_IN") throw new BusinessError("เช็คเอาท์ได้เฉพาะสัตว์ที่อยู่กรง");
    const checkOutAt = new Date();
    await tx.stay.update({
      where: { id: stay.id },
      data: { status: "CHECKED_OUT", checkOutAt, checkOutById: ctx.actor.membershipId },
    });
    await billStayNightsInTx(tx, ctx, stay.id, checkOutAt);
    ctx.emit("stay.checked_out", { stayId: stay.id });
    return { id: stay.id };
  });
}

export async function addCareLog(
  ctx: AppContext,
  input: { stayId: string; type: "FEED" | "WATER" | "WALK" | "OBSERVATION"; detail?: string },
) {
  ctx.can("boarding:care_log");
  return ctx.tx(async (tx) => {
    const stay = await tx.stay.findFirst({ where: { id: input.stayId } });
    if (!stay) throw new BusinessError("ไม่พบการเข้าพัก");
    ctx.can("boarding:care_log", { branchId: stay.branchId });
    const log = await tx.careLog.create({
      data: {
        tenantId: ctx.tenantId,
        stayId: stay.id,
        type: input.type,
        detail: input.detail?.trim() || null,
        staffId: ctx.actor.membershipId ?? ctx.actor.userId,
      },
    });
    return { id: log.id };
  });
}

async function billStayNightsInTx(
  tx: Prisma.TransactionClient,
  ctx: AppContext,
  stayId: string,
  asOf: Date,
) {
  const stay = await tx.stay.findFirst({ where: { id: stayId } });
  if (!stay) throw new BusinessError("ไม่พบการเข้าพัก");
  ctx.can("billing:charge", { branchId: stay.branchId });
  if (!stay.checkInAt) throw new BusinessError("ยังไม่ได้เช็คอิน");

  const checkInDate = bangkokBusinessDate(stay.checkInAt);
  const asOfDate = bangkokBusinessDate(asOf);
  const checkOutDate = stay.checkOutAt ? bangkokBusinessDate(stay.checkOutAt) : null;
  const lastBillable = checkOutDate ? addDays(checkOutDate, -1) : asOfDate;
  if (lastBillable < checkInDate) {
    return { billedDates: [] as string[], totalSatang: 0 };
  }

  const billedThrough = stay.billedThroughDate
    ? bangkokBusinessDate(stay.billedThroughDate)
    : addDays(checkInDate, -1);
  const from = addDays(billedThrough, 1);
  if (from > lastBillable) return { billedDates: [] as string[], totalSatang: 0 };

  const dates = datesInclusive(from, lastBillable);
  const service = stay.dailyRateServiceId
    ? await tx.serviceItem.findFirst({ where: { id: stay.dailyRateServiceId } })
    : await tx.serviceItem.findFirst({ where: { tenantId: ctx.tenantId, code: "BOARD-NIGHT" } });
  if (!service) {
    throw new BusinessError("ยังไม่ได้ตั้งค่าราคาค่าห้องฝากเลี้ยง กรุณาเพิ่มรายการ BOARD-NIGHT ในแค็ตตาล็อก");
  }
  const unitPriceSatang = stay.dailyRateSatang ?? service.priceSatang;

  for (const date of dates) {
    await insertChargeItem(tx, ctx.tenantId, ctx.branchId!, ctx.actor.membershipId, {
      ownerId: stay.ownerId,
      petId: stay.petId,
      sourceType: "STAY",
      stayId: stay.id,
      itemType: "SERVICE",
      serviceItemId: service.id,
      description: `ค่าห้องฝากเลี้ยง ${date}`,
      qty: "1",
      unitName: "คืน",
      unitPriceSatang,
      taxCode: service.taxCode,
    });
  }

  await tx.stay.update({
    where: { id: stay.id },
    data: { billedThroughDate: new Date(`${lastBillable}T00:00:00.000Z`) },
  });

  ctx.emit("stay.billed", { stayId: stay.id, nights: dates.length });
  return {
    billedDates: dates,
    totalSatang: dates.length * unitPriceSatang,
  };
}

/** คิดค่าห้องรายวันแบบ idempotent — รันซ้ำยอดต้องเท่าเดิม */
export async function billStayNights(ctx: AppContext, stayId: string, asOf = new Date()) {
  ctx.can("billing:charge");
  if (!ctx.branchId) throw new BusinessError("ต้องระบุสาขา");
  return ctx.tx((tx) => billStayNightsInTx(tx, ctx, stayId, asOf));
}
