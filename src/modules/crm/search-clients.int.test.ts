import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { searchClients } from "@/modules/crm";
import { createAppContext, SYSTEM_ACTOR } from "@/server/context";
import { getPgHarness, type PgHarness } from "@/test/pg-harness";

let h: PgHarness;

beforeAll(async () => {
  h = await getPgHarness();
});

describe("ค้นหาเจ้าของ/สัตว์", () => {
  it("ค้นจากชื่อสัตว์และเบอร์โทรได้", async () => {
    const tenantId = randomUUID();
    await h.migrator.tenant.create({
      data: { id: tenantId, slug: `srch-${tenantId.slice(0, 8)}`, legalName: "เอ", displayName: "เอ" },
    });
    const species = await h.migrator.species.create({
      data: { tenantId: null, code: `CAT-${tenantId.slice(0, 4)}`, nameTh: "แมว", nameEn: "Cat" },
    });
    const owner = await h.migrator.owner.create({
      data: { tenantId, code: "O-SRCH1", firstName: "แพร", lastName: "ใจดี", searchKey: "" },
    });
    await h.migrator.ownerPhone.create({
      data: { tenantId, ownerId: owner.id, raw: "0812345678", digits: "0812345678", isPrimary: true },
    });
    await h.migrator.pet.create({
      data: {
        tenantId,
        ownerId: owner.id,
        code: "P-SRCH1",
        name: "ข้าวปุ้น",
        searchKey: "",
        speciesId: species.id,
      },
    });

    const ctx = createAppContext({ db: h.migrator, tenantId, actor: SYSTEM_ACTOR });
    const byName = await searchClients(ctx, "ข้าวปุ้น");
    expect(byName).toHaveLength(1);
    expect(byName[0]?.pets[0]?.name).toBe("ข้าวปุ้น");

    const byPhone = await searchClients(ctx, "5678");
    expect(byPhone[0]?.displayName).toContain("แพร");
  });
});
