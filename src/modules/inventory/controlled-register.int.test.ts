import { beforeAll, describe, expect, it } from "vitest";
import { getControlledRegister } from "./controlled-register";
import { getPgHarness, type PgHarness } from "@/test/pg-harness";
import { seedMiniClinic, staffContext } from "@/test/clinic-fixture";

let h: PgHarness;

beforeAll(async () => {
  h = await getPgHarness();
});

describe("ทะเบียนยาควบคุม", () => {
  it("อ่านยอดจาก ledger ตรง ๆ มียอดยกมาจากเดือนก่อน และไม่แก้ตัวเลขให้ตรง", async () => {
    const f = await seedMiniClinic(h.migrator);
    const ctx = staffContext(h.app, f);
    await h.migrator.product.update({
      where: { id: f.product.id },
      data: { isControlled: true, controlledClass: "วัตถุออกฤทธิ์ประเภท 2" },
    });
    const lot = await h.migrator.stockLot.create({
      data: {
        tenantId: f.tenantId,
        branchId: f.branchId,
        productId: f.product.id,
        lotNo: "CTRL-1",
        expiryDate: new Date("2027-01-01"),
        unitCostSatang: 400,
      },
    });
    const move = (type: "RECEIPT" | "DISPENSE", qty: string, at: string) =>
      h.migrator.stockMovement.create({
        data: {
          tenantId: f.tenantId,
          branchId: f.branchId,
          productId: f.product.id,
          lotId: lot.id,
          type,
          qtyBase: qty,
          performedById: f.actorId,
          occurredAt: new Date(at),
        },
      });
    await move("RECEIPT", "100", "2026-08-01T10:00:00+07:00");
    await move("DISPENSE", "-10", "2026-08-20T10:00:00+07:00");
    await move("DISPENSE", "-5", "2026-09-05T10:00:00+07:00");

    const august = await getControlledRegister(ctx, { productId: f.product.id, yearMonth: "2026-08" });
    expect(august.lines).toHaveLength(2);
    expect(august.broughtForward).toBe("0.0000");
    expect(august.lastBalance).toBe("90.0000");
    expect(august.mismatch).toBe(false);

    const september = await getControlledRegister(ctx, { productId: f.product.id, yearMonth: "2026-09" });
    expect(september.lines).toHaveLength(1);
    expect(september.broughtForward).toBe("90.0000");
    expect(september.lines[0]?.outbound).toBe("5.0000");
    expect(september.lastBalance).toBe("85.0000");
    expect(september.computedBalance).toBe("85.0000");
    expect(september.mismatch).toBe(false);
  });

  it("ปฏิเสธยาที่ไม่ใช่ยาควบคุม", async () => {
    const f = await seedMiniClinic(h.migrator);
    const ctx = staffContext(h.app, f);
    await expect(
      getControlledRegister(ctx, { productId: f.product.id, yearMonth: "2026-09" }),
    ).rejects.toThrow(/ไม่ใช่ยาควบคุม/);
  });
});
