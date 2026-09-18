import { beforeAll, describe, expect, it } from "vitest";
import { billStayNights, checkInStay, checkOutStay } from "@/modules/boarding";
import { bangkokBusinessDate } from "@/modules/shared";
import { getPgHarness, type PgHarness } from "@/test/pg-harness";
import { seedMiniClinic, staffContext } from "@/test/clinic-fixture";

let h: PgHarness;

beforeAll(async () => {
  h = await getPgHarness();
});

describe("ค่าห้องฝากเลี้ยง", () => {
  it("คิดค่ารายวันแบบ idempotent — รันซ้ำยอดเท่าเดิม", async () => {
    const f = await seedMiniClinic(h.migrator);
    const ctx = staffContext(h.app, f);
    const kennel = await h.migrator.resource.create({
      data: {
        tenantId: f.tenantId,
        branchId: f.branchId,
        type: "KENNEL",
        code: "K1",
        name: "กรง 1",
      },
    });
    const today = bangkokBusinessDate();
    const asOf = new Date(`${today}T09:00:00+07:00`);
    const checkInAt = new Date(asOf.getTime() - 2 * 86_400_000);
    const expectedOut = bangkokBusinessDate(new Date(asOf.getTime() + 5 * 86_400_000));
    const stay = await checkInStay(ctx, {
      petId: f.pet.id,
      kennelResourceId: kennel.id,
      expectedOutAt: `${expectedOut}T18:00`,
      vaccineVerified: true,
    });
    await h.migrator.stay.update({
      where: { id: stay.id },
      data: { checkInAt },
    });
    const first = await billStayNights(ctx, stay.id, asOf);
    const second = await billStayNights(ctx, stay.id, asOf);
    expect(first.billedDates.length).toBeGreaterThan(0);
    expect(second.billedDates).toEqual([]);
    expect(first.totalSatang).toBe(first.billedDates.length * 50000);

    const charges = await h.migrator.chargeItem.findMany({ where: { stayId: stay.id } });
    expect(charges).toHaveLength(first.billedDates.length);
  });

  it("เข้าวันนี้ ออกพรุ่งนี้คิดหนึ่งคืน ไม่คิดวันออก", async () => {
    const f = await seedMiniClinic(h.migrator);
    const ctx = staffContext(h.app, f);
    const kennel = await h.migrator.resource.create({
      data: {
        tenantId: f.tenantId,
        branchId: f.branchId,
        type: "KENNEL",
        code: "K2",
        name: "กรง 2",
      },
    });
    const today = bangkokBusinessDate();
    const yesterday = new Date(`${today}T00:00:00+07:00`);
    yesterday.setTime(yesterday.getTime() - 86_400_000);
    const stay = await h.migrator.stay.create({
      data: {
        tenantId: f.tenantId,
        branchId: f.branchId,
        code: "ST-NIGHT",
        type: "BOARDING",
        status: "CHECKED_IN",
        petId: f.pet.id,
        ownerId: f.owner.id,
        kennelResourceId: kennel.id,
        checkInAt: yesterday,
        expectedOutAt: new Date(Date.now() + 86_400_000),
        dailyRateServiceId: f.board.id,
        dailyRateSatang: 50000,
      },
    });
    await checkOutStay(ctx, stay.id);
    const nights = await h.migrator.chargeItem.findMany({ where: { stayId: stay.id } });
    expect(nights).toHaveLength(1);
    expect(nights[0]?.amountSatang).toBe(50000);
    expect(nights[0]?.description).not.toContain(today);
  });

  it("ไม่มีรายการ BOARD-NIGHT แล้วเช็คอินไม่ได้", async () => {
    const f = await seedMiniClinic(h.migrator);
    const ctx = staffContext(h.app, f);
    await h.migrator.serviceItem.delete({ where: { id: f.board.id } });
    const kennel = await h.migrator.resource.create({
      data: {
        tenantId: f.tenantId,
        branchId: f.branchId,
        type: "KENNEL",
        code: "K3",
        name: "กรง 3",
      },
    });
    await expect(
      checkInStay(ctx, {
        petId: f.pet.id,
        kennelResourceId: kennel.id,
        expectedOutAt: `${bangkokBusinessDate(new Date(Date.now() + 3 * 86_400_000))}T18:00`,
        vaccineVerified: true,
      }),
    ).rejects.toThrow(/ตั้งค่า/);
  });
});
