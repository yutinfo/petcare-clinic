import type { Prisma, BookingType } from "@prisma/client";
import { BusinessError, generateCode, parseBangkokDateTimeLocal } from "@/modules/shared";
import type { AppContext } from "@/server/context";

async function ownerOf(tx: Prisma.TransactionClient, userId: string) {
  const owner = await tx.owner.findFirst({
    where: { userId, deletedAt: null },
  });
  if (!owner) throw new BusinessError("ไม่พบทะเบียนเจ้าของสัตว์");
  return owner;
}

export async function listPortalHome(ctx: AppContext) {
  if (ctx.actor.kind !== "owner") throw new BusinessError("สำหรับเจ้าของสัตว์เท่านั้น");
  return ctx.tx(async (tx) => {
    const owner = await ownerOf(tx, ctx.actor.userId);
    const pets = await tx.pet.findMany({
      where: { ownerId: owner.id, deletedAt: null },
      include: { species: true, vaccinations: { orderBy: { administeredAt: "desc" }, take: 3 } },
    });
    const bookings = await tx.booking.findMany({
      where: {
        ownerId: owner.id,
        status: { in: ["REQUESTED", "CONFIRMED"] },
        startAt: { gte: new Date() },
      },
      include: { pet: true },
      orderBy: { startAt: "asc" },
      take: 10,
    });
    const invoices = await tx.invoice.findMany({
      where: { ownerId: owner.id, status: { not: "VOID" } },
      orderBy: { createdAt: "desc" },
      take: 8,
    });
    const stays = await tx.stay.findMany({
      where: { ownerId: owner.id, status: "CHECKED_IN" },
      include: { pet: true, careLogs: { orderBy: { occurredAt: "desc" }, take: 5 } },
    });
    return {
      ownerName: [owner.firstName, owner.lastName].filter(Boolean).join(" "),
      pets: pets.map((p) => ({
        id: p.id,
        name: p.name,
        speciesNameTh: p.species.nameTh,
        currentWeightKg: p.currentWeightKg?.toString() ?? null,
        nextVaccine: p.vaccinations[0]?.nextDueAt?.toISOString() ?? null,
      })),
      bookings: bookings.map((b) => ({
        id: b.id,
        code: b.code,
        type: b.type,
        status: b.status,
        startAt: b.startAt.toISOString(),
        petName: b.pet?.name ?? null,
      })),
      invoices: invoices.map((i) => ({
        id: i.id,
        number: i.number,
        status: i.status,
        grandTotalSatang: i.grandTotalSatang,
        issuedAt: i.issuedAt?.toISOString() ?? i.createdAt.toISOString(),
      })),
      stays: stays.map((s) => ({
        id: s.id,
        petName: s.pet.name,
        expectedOutAt: s.expectedOutAt.toISOString(),
        logs: s.careLogs.map((l) => ({
          type: l.type,
          detail: l.detail,
          occurredAt: l.occurredAt.toISOString(),
        })),
      })),
    };
  });
}

export async function requestPortalBooking(
  ctx: AppContext,
  input: { petId: string; type: BookingType; startAt: string; note?: string },
) {
  if (ctx.actor.kind !== "owner") throw new BusinessError("สำหรับเจ้าของสัตว์เท่านั้น");
  let startAt: Date;
  try {
    startAt = parseBangkokDateTimeLocal(input.startAt);
  } catch {
    throw new BusinessError("เวลาไม่ถูกต้อง");
  }
  if (startAt.getTime() < Date.now()) throw new BusinessError("จองย้อนหลังไม่ได้");

  return ctx.tx(async (tx) => {
    const owner = await ownerOf(tx, ctx.actor.userId);
    const pet = await tx.pet.findFirst({ where: { id: input.petId, ownerId: owner.id } });
    if (!pet) throw new BusinessError("ไม่พบสัตว์ในบัญชีนี้");
    const branchId = ctx.branchId;
    if (!branchId) throw new BusinessError("ไม่พบสาขา");

    const booking = await tx.booking.create({
      data: {
        tenantId: ctx.tenantId,
        branchId,
        code: generateCode("BK"),
        type: input.type,
        status: "REQUESTED",
        source: "PORTAL",
        ownerId: owner.id,
        petId: pet.id,
        startAt,
        endAt: new Date(startAt.getTime() + 30 * 60_000),
        requestedNote: input.note?.trim() || null,
      },
    });
    ctx.emit("booking.requested", { bookingId: booking.id, source: "PORTAL" });
    return { id: booking.id, code: booking.code };
  });
}
