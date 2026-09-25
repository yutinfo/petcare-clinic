import { beforeAll, describe, expect, it } from "vitest";
import { createAppContext } from "@/server/context";
import { getPgHarness, type PgHarness } from "@/test/pg-harness";
import { seedMiniClinic, staffContext } from "@/test/clinic-fixture";
import { importCatalogTranslations } from "./catalog-translation";

let h: PgHarness;

beforeAll(async () => {
  h = await getPgHarness();
});

describe("นำเข้าคำแปลแค็ตตาล็อก", () => {
  it("นำเข้าภาษาอังกฤษและภาษาที่สามได้ และนำเข้าซ้ำแล้วทับของเดิม", async () => {
    const f = await seedMiniClinic(h.migrator);
    const ctx = staffContext(h.app, f);
    const product = await h.migrator.product.create({
      data: {
        tenantId: f.tenantId,
        code: `NAME-${f.tenantId.slice(0, 8)}`,
        name: "ลูกบอลยาง",
        searchKey: "toyball",
        type: "RETAIL",
        baseUnit: "ชิ้น",
        defaultPriceSatang: 1000,
        requiresPrescription: false,
        taxCode: "VAT7",
      },
    });
    const row = {
      entityType: "Product" as const,
      entityId: product.id,
      field: "name" as const,
      locale: "en",
      text: "Rubber ball",
    };
    await importCatalogTranslations(ctx, [row]);
    await importCatalogTranslations(ctx, [{ ...row, text: "Rubber toy" }, { ...row, locale: "zh", text: "橡皮球" }]);
    const saved = await h.migrator.catalogTranslation.findMany({
      where: { entityId: product.id },
      orderBy: { locale: "asc" },
    });
    expect(saved.map((item) => [item.locale, item.text])).toEqual([
      ["en", "Rubber toy"],
      ["zh", "橡皮球"],
    ]);

    const stranger = createAppContext({
      db: h.app,
      tenantId: f.tenantId,
      branchId: f.branchId,
      actor: {
        userId: f.actorId,
        membershipId: f.actorId,
        displayName: "นุ่น",
        kind: "staff",
        permissions: new Set(["patient:read"]),
        branchIds: new Set([f.branchId]),
      },
    });
    await expect(importCatalogTranslations(stranger, [row])).rejects.toThrow(/ไม่มีสิทธิ์/);
    await expect(
      importCatalogTranslations(ctx, [{ ...row, entityId: "00000000-0000-4000-8000-000000000000" }]),
    ).rejects.toThrow(/ไม่พบรายการ/);
  });
});
