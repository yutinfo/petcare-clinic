import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { getPgHarness, type PgHarness } from "@/test/pg-harness";

let h: PgHarness;

beforeAll(async () => {
  h = await getPgHarness();
});

describe("RLS — แยกข้อมูลข้าม tenant", () => {
  it("อ่านข้าม tenant ไม่ได้", async () => {
    const tenantA = randomUUID();
    const tenantB = randomUUID();

    await h.migrator.tenant.create({
      data: {
        id: tenantA,
        slug: `clinic-a-${tenantA.slice(0, 8)}`,
        legalName: "คลินิกเอ",
        displayName: "คลินิกเอ",
      },
    });
    await h.migrator.tenant.create({
      data: {
        id: tenantB,
        slug: `clinic-b-${tenantB.slice(0, 8)}`,
        legalName: "คลินิกบี",
        displayName: "คลินิกบี",
      },
    });

    await h.migrator.owner.create({
      data: {
        tenantId: tenantA,
        code: "O-AAAA1",
        firstName: "แพร",
        searchKey: "",
      },
    });

    const seenByA = await h.app.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.tenant_id', ${tenantA}, true)`;
      return tx.owner.findMany();
    });
    expect(seenByA).toHaveLength(1);
    expect(seenByA[0]?.firstName).toBe("แพร");

    const seenByB = await h.app.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.tenant_id', ${tenantB}, true)`;
      return tx.owner.findMany();
    });
    expect(seenByB).toHaveLength(0);
  });

  it("เขียนข้อมูลคนละ tenant ผ่าน WITH CHECK ไม่ได้", async () => {
    const tenantA = randomUUID();
    const tenantB = randomUUID();
    await h.migrator.tenant.createMany({
      data: [
        { id: tenantA, slug: `a-${tenantA.slice(0, 8)}`, legalName: "เอ", displayName: "เอ" },
        { id: tenantB, slug: `b-${tenantB.slice(0, 8)}`, legalName: "บี", displayName: "บี" },
      ],
    });

    await expect(
      h.app.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT set_config('app.tenant_id', ${tenantB}, true)`;
        await tx.owner.create({
          data: {
            tenantId: tenantA,
            code: "O-HACK1",
            firstName: "ไม่ควรผ่าน",
            searchKey: "",
          },
        });
      }),
    ).rejects.toThrow();
  });

  it("v_rls_coverage_gaps ว่าง", async () => {
    const gaps = await h.migrator.$queryRaw<{ table_name: string }[]>`
      SELECT table_name FROM v_rls_coverage_gaps ORDER BY table_name`;
    expect(gaps).toEqual([]);
  });
});
