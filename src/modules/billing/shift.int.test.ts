import { beforeAll, describe, expect, it } from "vitest";
import { checkInPet } from "@/modules/clinical";
import { createAppContext } from "@/server/context";
import { getPgHarness, type PgHarness } from "@/test/pg-harness";
import { seedMiniClinic, staffContext } from "@/test/clinic-fixture";
import { issueInvoiceFromCharges } from "./invoice";
import { closeCashierShift, findOpenCashierShift, openCashierShift } from "./shift";

let h: PgHarness;

beforeAll(async () => {
  h = await getPgHarness();
});

describe("กะเงินสด", () => {
  it("รับเงินสดไม่ได้ถ้ายังไม่เปิดกะ", async () => {
    const f = await seedMiniClinic(h.migrator);
    const ctx = staffContext(h.app, f);
    const checked = await checkInPet(ctx, { petId: f.pet.id, weightKg: "4" });
    const charges = await h.migrator.chargeItem.findMany({ where: { encounterId: checked.encounterId } });
    await expect(
      issueInvoiceFromCharges(ctx, { chargeIds: charges.map((c) => c.id), method: "CASH" }),
    ).rejects.toThrow(/เปิดกะเงินสด/);
  });

  it("เปิดกะซ้ำไม่ได้ และปิดกะคิดยอดที่ควรมีจากเงินทอนบวกเงินสดรับ", async () => {
    const f = await seedMiniClinic(h.migrator);
    const ctx = staffContext(h.app, f);
    const opened = await openCashierShift(ctx, { openingFloatSatang: 200_000 });
    await expect(openCashierShift(ctx, { openingFloatSatang: 0 })).rejects.toThrow(/เปิดอยู่แล้ว/);

    const checked = await checkInPet(ctx, { petId: f.pet.id, weightKg: "4" });
    const charges = await h.migrator.chargeItem.findMany({ where: { encounterId: checked.encounterId } });
    await issueInvoiceFromCharges(ctx, { chargeIds: charges.map((c) => c.id), method: "CASH" });

    const open = await findOpenCashierShift(ctx);
    expect(open?.id).toBe(opened.id);
    expect(open?.expectedCashSatang).toBe(235_000);

    const closed = await closeCashierShift(ctx, { countedCashSatang: 235_000 });
    expect(closed.expectedCashSatang).toBe(235_000);
    expect(closed.varianceSatang).toBe(0);
    expect(await findOpenCashierShift(ctx)).toBeNull();
    await expect(closeCashierShift(ctx, { countedCashSatang: 235_000 })).rejects.toThrow(/ไม่มีกะที่เปิดอยู่/);
  });

  it("ผลต่างเงินสดต้องมีเหตุผลและสิทธิ์อนุมัติ", async () => {
    const f = await seedMiniClinic(h.migrator);
    const ctx = staffContext(h.app, f);
    await openCashierShift(ctx, { openingFloatSatang: 0 });
    await expect(closeCashierShift(ctx, { countedCashSatang: 2000 })).rejects.toThrow(/เหตุผล/);

    const cashierOnly = createAppContext({
      db: h.app,
      tenantId: f.tenantId,
      branchId: f.branchId,
      actor: {
        userId: f.actorId,
        membershipId: f.actorId,
        displayName: "นุ่น",
        kind: "staff",
        permissions: new Set(["cash:open_shift", "cash:close_shift"]),
        branchIds: new Set([f.branchId]),
      },
    });
    await expect(
      closeCashierShift(cashierOnly, { countedCashSatang: 2000, closingNote: "นับขาด" }),
    ).rejects.toThrow(/ผู้จัดการอนุมัติ/);

    const closed = await closeCashierShift(ctx, { countedCashSatang: 2000, closingNote: "นับขาด 20 บาท" });
    expect(closed.varianceSatang).toBe(2000);
  });
});
