import { Prisma } from "@prisma/client";
import { bangkokBusinessDate, BusinessError, formatThaiDateTime, toBuddhistYear } from "@/modules/shared";
import type { AppContext } from "@/server/context";

const MOVEMENT_TH: Record<string, string> = {
  RECEIPT: "รับเข้า",
  DISPENSE: "จ่ายให้สัตว์",
  SALE: "ขาย",
  RETURN_IN: "คืน",
  RETURN_OUT: "คืนผู้ขาย",
  ADJUST_IN: "ปรับปรุง",
  ADJUST_OUT: "ปรับปรุง",
  TRANSFER_IN: "โอนเข้า",
  TRANSFER_OUT: "โอนออก",
  WASTE: "ทำลาย",
  COUNT_ADJUST: "ปรับปรุง",
  INTERNAL_USE: "ใช้ในคลินิก",
};

const TH_MONTHS = [
  "มกราคม",
  "กุมภาพันธ์",
  "มีนาคม",
  "เมษายน",
  "พฤษภาคม",
  "มิถุนายน",
  "กรกฎาคม",
  "สิงหาคม",
  "กันยายน",
  "ตุลาคม",
  "พฤศจิกายน",
  "ธันวาคม",
];

export function qty4(value: Prisma.Decimal | string | number): string {
  return new Prisma.Decimal(value).toFixed(4);
}

export function monthBounds(yearMonth: string): { start: Date; end: Date; year: number; month: number } {
  const match = yearMonth.match(/^(\d{4})-(\d{2})$/);
  if (!match) throw new BusinessError("เดือนไม่ถูกต้อง ใช้รูปแบบ YYYY-MM");
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) throw new BusinessError("เดือนไม่ถูกต้อง");
  const start = new Date(`${match[1]}-${match[2]}-01T00:00:00+07:00`);
  const endMonth = month === 12 ? 1 : month + 1;
  const endYear = month === 12 ? year + 1 : year;
  const end = new Date(`${endYear}-${String(endMonth).padStart(2, "0")}-01T00:00:00+07:00`);
  return { start, end, year, month };
}

export async function listControlledProducts(ctx: AppContext) {
  ctx.can("pharmacy:controlled_drug");
  return ctx.tx(async (tx) => {
    const rows = await tx.product.findMany({
      where: { isControlled: true, deletedAt: null, isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, code: true, name: true, genericName: true, strength: true, baseUnit: true, controlledClass: true },
    });
    return rows;
  });
}

export async function getControlledRegister(ctx: AppContext, input: { productId: string; yearMonth: string }) {
  ctx.can("pharmacy:controlled_drug");
  if (!ctx.branchId) throw new BusinessError("ต้องระบุสาขา");
  const { start, end, month } = monthBounds(input.yearMonth);

  return ctx.tx(async (tx) => {
    const product = await tx.product.findFirst({ where: { id: input.productId } });
    if (!product) throw new BusinessError("ไม่พบยา");
    if (!product.isControlled) throw new BusinessError("รายการนี้ไม่ใช่ยาควบคุม");
    ctx.can("pharmacy:controlled_drug", { branchId: ctx.branchId });

    const branch = await tx.branch.findFirst({ where: { id: ctx.branchId! } });
    if (!branch) throw new BusinessError("ไม่พบสาขา");
    const tenant = await tx.tenant.findFirst({ where: { id: ctx.tenantId } });

    const brought = await tx.controlledDrugEntry.findFirst({
      where: {
        branchId: ctx.branchId!,
        productId: product.id,
        occurredAt: { lt: start },
      },
      orderBy: { occurredAt: "desc" },
    });
    const broughtForward = brought ? new Prisma.Decimal(brought.balanceAfterBase) : new Prisma.Decimal(0);

    const entries = await tx.controlledDrugEntry.findMany({
      where: {
        branchId: ctx.branchId!,
        productId: product.id,
        occurredAt: { gte: start, lt: end },
      },
      orderBy: { occurredAt: "asc" },
    });

    const movementIds = entries.map((e) => e.movementId);
    const movements = movementIds.length
      ? await tx.stockMovement.findMany({
          where: { id: { in: movementIds } },
          include: {
            lot: true,
            dispense: { include: { prescription: { include: { pet: { include: { owner: true } } } } } },
          },
      })
      : [];
    const byMovement = new Map(movements.map((m) => [m.id, m]));

    const personIds = [
      ...new Set(
        entries.flatMap((e) => [e.performedById, e.prescriberId, e.witnessId]).filter((id): id is string => Boolean(id)),
      ),
    ];
    const memberships = personIds.length
      ? await tx.membership.findMany({
          where: { OR: [{ id: { in: personIds } }, { userId: { in: personIds } }] },
          include: { user: true },
        })
      : [];
    const personName = (id: string | null) => {
      if (!id) return "";
      const row = memberships.find((m) => m.id === id || m.userId === id);
      if (!row) return "";
      const license = row.licenseNo ? ` (${row.licenseNo})` : "";
      return `${row.user.displayName}${license}`;
    };

    let inbound = new Prisma.Decimal(0);
    let outbound = new Prisma.Decimal(0);
    const lines = entries.map((e, i) => {
      const qty = new Prisma.Decimal(e.qtyBase);
      if (qty.gte(0)) inbound = inbound.plus(qty);
      else outbound = outbound.plus(qty.abs());
      const mv = byMovement.get(e.movementId);
      const rx = mv?.dispense?.prescription;
      const pet = rx?.pet;
      const ownerName = pet ? [pet.owner.firstName, pet.owner.lastName].filter(Boolean).join(" ") : "";
      const petLabel = pet ? `${pet.name} (${pet.code})${ownerName ? ` · ${ownerName}` : ""}` : "";
      const prescriber = personName(e.prescriberId ?? rx?.prescriberId ?? null);
      return {
        lineNo: i + 1,
        occurredAt: e.occurredAt.toISOString(),
        occurredAtTh: formatThaiDateTime(e.occurredAt),
        type: mv?.type ?? "",
        typeTh: MOVEMENT_TH[mv?.type ?? ""] ?? mv?.type ?? "",
        ref: [mv?.refType, mv?.refId?.slice(0, 8)].filter(Boolean).join(" "),
        lotNo: mv?.lot?.lotNo ?? "",
        expiryDate: mv?.lot?.expiryDate ? mv.lot.expiryDate.toISOString().slice(0, 10) : "",
        petLabel,
        prescriber,
        inbound: qty.gte(0) ? qty4(qty) : "",
        outbound: qty.lt(0) ? qty4(qty.abs()) : "",
        balanceAfter: qty4(e.balanceAfterBase),
        performedBy: personName(e.performedById),
        witness: personName(e.witnessId),
        note: e.note ?? mv?.reason ?? "",
      };
    });

    const lastBalance = entries.length
      ? new Prisma.Decimal(entries[entries.length - 1]!.balanceAfterBase)
      : broughtForward;
    const computed = broughtForward.plus(inbound).minus(outbound);
    const mismatch = !computed.eq(lastBalance);
    const monthEnd = new Date(end.getTime() - 1);
    const isDraft = bangkokBusinessDate() <= bangkokBusinessDate(monthEnd);

    return {
      clinicName: tenant?.displayName ?? "",
      branchName: branch.name,
      branchCode: branch.code,
      product: {
        id: product.id,
        code: product.code,
        name: product.name,
        genericName: product.genericName,
        strength: product.strength,
        dosageForm: product.dosageForm,
        baseUnit: product.baseUnit,
        controlledClass: product.controlledClass,
      },
      yearMonth: input.yearMonth,
      monthLabel: `${TH_MONTHS[month - 1]} ${toBuddhistYear(start)}`,
      broughtForward: qty4(broughtForward),
      inbound: qty4(inbound),
      outbound: qty4(outbound),
      computedBalance: qty4(computed),
      lastBalance: qty4(lastBalance),
      mismatch,
      isDraft,
      lines,
      fileBase: `controlled-register_${product.code}_${input.yearMonth}_${branch.code}`,
    };
  });
}

export function controlledRegisterCsv(data: Awaited<ReturnType<typeof getControlledRegister>>): string {
  const header = [
    "ลำดับ",
    "วันเวลา",
    "ประเภทรายการ",
    "เอกสารอ้างอิง",
    "ล็อต",
    "วันหมดอายุ",
    "สัตว์ (เจ้าของ)",
    "ผู้สั่งใช้",
    "รับเข้า",
    "จ่ายออก",
    "คงเหลือ",
    "ผู้ทำรายการ",
    "พยาน",
    "หมายเหตุ",
  ];
  const rows = data.lines.map((l) => [
    String(l.lineNo),
    l.occurredAtTh,
    l.typeTh,
    l.ref,
    l.lotNo,
    l.expiryDate,
    l.petLabel,
    l.prescriber,
    l.inbound,
    l.outbound,
    l.balanceAfter,
    l.performedBy,
    l.witness,
    l.note,
  ]);
  const summary = [
    [],
    ["ยกมา", data.broughtForward, "รับเข้า", data.inbound, "จ่ายออก", data.outbound, "คงเหลือตามบัญชี", data.lastBalance],
  ];
  if (data.mismatch) {
    summary.push(["⚠ ยอดคำนวณได้", data.computedBalance, "ไม่ตรงกับคงเหลือแถวสุดท้าย", data.lastBalance]);
  }
  const all = [header, ...rows, ...summary];
  return all
    .map((cols) => cols.map((c) => `"${String(c).replaceAll('"', '""')}"`).join(","))
    .join("\r\n");
}
