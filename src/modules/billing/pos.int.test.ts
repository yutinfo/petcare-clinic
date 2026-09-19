import { beforeAll, describe, expect, it } from "vitest";
import { bangkokBusinessDate } from "@/modules/shared";
import { getPgHarness, type PgHarness } from "@/test/pg-harness";
import { addLot, seedMiniClinic, staffContext } from "@/test/clinic-fixture";
import { addPosLine } from "./pos";

function plusDays(days: number): string {
  return bangkokBusinessDate(new Date(Date.now() + days * 86_400_000));
}

let h: PgHarness;

beforeAll(async () => {
  h = await getPgHarness();
});

async function retailProduct(tenantId: string) {
  return h.migrator.product.create({
    data: {
      tenantId,
      code: `TOY-${tenantId.slice(0, 8)}`,
      name: "ลูกบอลยาง",
      searchKey: "toyball",
      type: "RETAIL",
      baseUnit: "ชิ้น",
      defaultPriceSatang: 8900,
      requiresPrescription: false,
      taxCode: "VAT7",
    },
  });
}

describe("POS หน้าร้าน", () => {
  it("สินค้าไม่มีสต็อกใช้ได้แล้วเพิ่มในบิลไม่ได้", async () => {
    const f = await seedMiniClinic(h.migrator);
    const ctx = staffContext(h.app, f);
    const product = await retailProduct(f.tenantId);
    await expect(
      addPosLine(ctx, { ownerId: f.owner.id, productId: product.id, qty: "1" }),
    ).rejects.toThrow(/หมดสต็อก/);
    const charges = await h.migrator.chargeItem.findMany({ where: { productId: product.id } });
    expect(charges).toHaveLength(0);
  });

  it("ล็อตหมดอายุอย่างเดียวเพิ่มใน POS ไม่ได้", async () => {
    const f = await seedMiniClinic(h.migrator);
    const ctx = staffContext(h.app, f);
    const product = await retailProduct(f.tenantId);
    await addLot(h.migrator, {
      tenantId: f.tenantId,
      branchId: f.branchId,
      productId: product.id,
      lotNo: "TOY-OLD",
      expiry: "2000-01-01",
      qty: 10,
      actorId: f.actorId,
    });
    await expect(
      addPosLine(ctx, { ownerId: f.owner.id, productId: product.id, qty: "1" }),
    ).rejects.toThrow(/หมดสต็อก/);
    const charges = await h.migrator.chargeItem.findMany({ where: { productId: product.id } });
    expect(charges).toHaveLength(0);
  });

  it("มีล็อตใช้ได้จึงเพิ่มในบิลได้", async () => {
    const f = await seedMiniClinic(h.migrator);
    const ctx = staffContext(h.app, f);
    const product = await retailProduct(f.tenantId);
    await addLot(h.migrator, {
      tenantId: f.tenantId,
      branchId: f.branchId,
      productId: product.id,
      lotNo: "TOY-OK",
      expiry: plusDays(400),
      qty: 5,
      actorId: f.actorId,
    });
    const out = await addPosLine(ctx, { ownerId: f.owner.id, productId: product.id, qty: "1" });
    expect(out.posSaleId.length).toBeGreaterThan(8);
    const charges = await h.migrator.chargeItem.findMany({ where: { productId: product.id } });
    expect(charges).toHaveLength(1);
    expect(charges[0]?.amountSatang).toBe(8900);
  });
});
