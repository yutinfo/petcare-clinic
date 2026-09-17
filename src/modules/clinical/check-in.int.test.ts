import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { checkInPet } from "@/modules/clinical";
import { createAppContext, SYSTEM_ACTOR } from "@/server/context";
import { getPgHarness, type PgHarness } from "@/test/pg-harness";

let h: PgHarness;

beforeAll(async () => {
  h = await getPgHarness();
});

describe("เช็คอิน", () => {
  it("สร้าง Encounter + น้ำหนัก และไม่เปิดเคสซ้ำ", async () => {
    const tenantId = randomUUID();
    const branchId = randomUUID();
    await h.migrator.tenant.create({
      data: { id: tenantId, slug: `chk-${tenantId.slice(0, 8)}`, legalName: "เอ", displayName: "เอ" },
    });
    await h.migrator.branch.create({
      data: { id: branchId, tenantId, code: "BKK", name: "สาขาหลัก" },
    });
    const species = await h.migrator.species.create({
      data: { tenantId: null, code: `DOG-${tenantId.slice(0, 4)}`, nameTh: "สุนัข", nameEn: "Dog" },
    });
    const owner = await h.migrator.owner.create({
      data: { tenantId, code: "O-CHK01", firstName: "นุ่น", searchKey: "" },
    });
    const pet = await h.migrator.pet.create({
      data: {
        tenantId,
        ownerId: owner.id,
        code: "P-CHK01",
        name: "โบ้",
        searchKey: "",
        speciesId: species.id,
      },
    });

    const ctx = createAppContext({
      db: h.migrator,
      tenantId,
      branchId,
      actor: SYSTEM_ACTOR,
    });

    const first = await checkInPet(ctx, { petId: pet.id, weightKg: "12.4", chiefComplaint: "อาเจียน" });
    expect(first.reused).toBe(false);
    expect(first.number).toMatch(/^VN-BKK-\d{4}-\d{6}$/);

    const second = await checkInPet(ctx, { petId: pet.id, weightKg: "12.5" });
    expect(second.reused).toBe(true);
    expect(second.encounterId).toBe(first.encounterId);

    const stored = await h.migrator.pet.findUnique({ where: { id: pet.id } });
    expect(stored?.currentWeightKg?.toString()).toBe("12.4");
  });
});
