import { beforeAll, describe, expect, it } from "vitest";
import { checkInPet } from "@/modules/clinical";
import { dispensePrescription, prescribe } from "@/modules/pharmacy";
import { getPgHarness, type PgHarness } from "@/test/pg-harness";
import { addLot, seedMiniClinic } from "@/test/clinic-fixture";

let h: PgHarness;

beforeAll(async () => {
  h = await getPgHarness();
});

describe("จ่ายยา FEFO", () => {
  it("ตัดล็อตหมดอายุก่อน พร้อมตั้ง ChargeItem ในทรานแซกชันเดียว", async () => {
    const f = await seedMiniClinic(h.migrator);
    await addLot(h.migrator, {
      tenantId: f.tenantId,
      branchId: f.branchId,
      productId: f.product.id,
      lotNo: "OLD",
      expiry: "2026-10-01",
      qty: 20,
      actorId: f.actorId,
    });
    await addLot(h.migrator, {
      tenantId: f.tenantId,
      branchId: f.branchId,
      productId: f.product.id,
      lotNo: "NEW",
      expiry: "2027-03-01",
      qty: 100,
      actorId: f.actorId,
    });

    const checked = await checkInPet(f.ctx, { petId: f.pet.id, weightKg: "12.4" });
    const rx = await prescribe(f.ctx, {
      encounterId: checked.encounterId,
      productId: f.product.id,
      mgPerKg: "20",
      route: "PO",
      frequencyCode: "BID",
      durationDays: 7,
    });
    expect(rx.totalQtyBase).toBe("14");

    const out = await dispensePrescription(f.ctx, { prescriptionId: rx.id });
    expect(out.lots[0]?.lotNo).toBe("OLD");
    expect(out.lots[0]?.qty).toBe("14");

    const charges = await h.migrator.chargeItem.findMany({
      where: { encounterId: checked.encounterId, itemType: "PRODUCT" },
    });
    expect(charges).toHaveLength(1);
    expect(charges[0]?.amountSatang).toBe(14 * 1200);

    const oldOnHand = await h.migrator.stockOnHand.findFirst({
      where: { productId: f.product.id, lot: { lotNo: "OLD" } },
    });
    expect(oldOnHand?.qtyBase.toString()).toBe("6");
  });

  it("ไม่จ่ายล็อตที่หมดอายุตามวันธุรกิจไทย และไม่ตั้ง ChargeItem", async () => {
    const f = await seedMiniClinic(h.migrator);
    await addLot(h.migrator, {
      tenantId: f.tenantId,
      branchId: f.branchId,
      productId: f.product.id,
      lotNo: "EXPIRED",
      expiry: "2000-01-01",
      qty: 100,
      actorId: f.actorId,
    });
    const checked = await checkInPet(f.ctx, { petId: f.pet.id, weightKg: "12.4" });
    const rx = await prescribe(f.ctx, {
      encounterId: checked.encounterId,
      productId: f.product.id,
      mgPerKg: "20",
      route: "PO",
      frequencyCode: "BID",
      durationDays: 7,
    });
    await expect(dispensePrescription(f.ctx, { prescriptionId: rx.id })).rejects.toThrow(/สต็อกไม่พอ/);
    const charges = await h.migrator.chargeItem.findMany({
      where: { encounterId: checked.encounterId, itemType: "PRODUCT" },
    });
    expect(charges).toHaveLength(0);
    const dispenses = await h.migrator.dispense.findMany({ where: { prescriptionId: rx.id } });
    expect(dispenses).toHaveLength(0);
  });
});
