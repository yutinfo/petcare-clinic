import { bangkokBusinessDate, BusinessError, generateCode, parseBangkokDateTimeLocal } from "@/modules/shared";
import type { AppContext } from "@/server/context";
import type { BookingType } from "@prisma/client";

export async function listBookingsForDay(ctx: AppContext, dayIso?: string) {
  ctx.can("scheduling:read");
  if (!ctx.branchId) throw new BusinessError("ต้องระบุสาขา");
  const day = dayIso ?? bangkokBusinessDate();
  const start = new Date(`${day}T00:00:00+07:00`);
  const end = new Date(`${day}T23:59:59.999+07:00`);
  return ctx.tx(async (tx) => {
    const rows = await tx.booking.findMany({
      where: {
        branchId: ctx.branchId!,
        startAt: { gte: start, lte: end },
        status: { notIn: ["CANCELLED"] },
      },
      include: { owner: true, pet: { include: { species: true } } },
      orderBy: { startAt: "asc" },
    });
    return rows.map((b) => ({
      id: b.id,
      code: b.code,
      type: b.type,
      status: b.status,
      startAt: b.startAt.toISOString(),
      endAt: b.endAt.toISOString(),
      requestedNote: b.requestedNote,
      ownerName: [b.owner.firstName, b.owner.lastName].filter(Boolean).join(" "),
      ownerId: b.ownerId,
      petId: b.petId,
      petName: b.pet?.name ?? null,
      speciesNameTh: b.pet?.species.nameTh ?? null,
    }));
  });
}

export async function createStaffBooking(
  ctx: AppContext,
  input: {
    ownerId: string;
    petId?: string;
    type: BookingType;
    startAt: string;
    durationMinutes?: number;
    note?: string;
  },
) {
  ctx.can("scheduling:write");
  if (!ctx.branchId) throw new BusinessError("ต้องระบุสาขา");
  let startAt: Date;
  try {
    startAt = parseBangkokDateTimeLocal(input.startAt);
  } catch {
    throw new BusinessError("เวลาเริ่มไม่ถูกต้อง");
  }
  const minutes = input.durationMinutes ?? 30;
  const endAt = new Date(startAt.getTime() + minutes * 60_000);

  return ctx.tx(async (tx) => {
    const owner = await tx.owner.findFirst({ where: { id: input.ownerId } });
    if (!owner) throw new BusinessError("ไม่พบเจ้าของ");
    if (input.petId) {
      const pet = await tx.pet.findFirst({ where: { id: input.petId, ownerId: owner.id } });
      if (!pet) throw new BusinessError("สัตว์ไม่อยู่ในทะเบียนเจ้าของนี้");
    }
    const booking = await tx.booking.create({
      data: {
        tenantId: ctx.tenantId,
        branchId: ctx.branchId!,
        code: generateCode("BK"),
        type: input.type,
        status: "CONFIRMED",
        source: "STAFF",
        ownerId: owner.id,
        petId: input.petId ?? null,
        startAt,
        endAt,
        requestedNote: input.note?.trim() || null,
        createdById: ctx.actor.membershipId,
        confirmedAt: new Date(),
        confirmedById: ctx.actor.membershipId,
      },
    });
    ctx.emit("booking.created", { bookingId: booking.id });
    return { id: booking.id, code: booking.code };
  });
}

export async function cancelBooking(ctx: AppContext, bookingId: string, reason: string) {
  ctx.can("scheduling:write");
  return ctx.tx(async (tx) => {
    const booking = await tx.booking.findFirst({ where: { id: bookingId } });
    if (!booking) throw new BusinessError("ไม่พบนัด");
    ctx.can("scheduling:write", { branchId: booking.branchId });
    if (booking.status === "CHECKED_IN" || booking.status === "COMPLETED") {
      throw new BusinessError("นัดนี้ดำเนินการไปแล้ว ยกเลิกไม่ได้");
    }
    await tx.booking.update({
      where: { id: booking.id },
      data: {
        status: "CANCELLED",
        cancelledAt: new Date(),
        cancelledById: ctx.actor.membershipId,
        cancelReason: reason.trim() || "ยกเลิกโดยเจ้าหน้าที่",
      },
    });
    return { id: booking.id };
  });
}
