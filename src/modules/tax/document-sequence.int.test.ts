import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { formatDocumentNumber, nextDocumentNumber } from "@/modules/tax";
import { getPgHarness, type PgHarness } from "@/test/pg-harness";

let h: PgHarness;

beforeAll(async () => {
  h = await getPgHarness();
});

describe("DocumentSequence", () => {
  it("จองเลขเรียงต่อกันและคืนเลขเมื่อ rollback", async () => {
    const tenantId = randomUUID();
    const branchId = randomUUID();
    await h.migrator.tenant.create({
      data: { id: tenantId, slug: `seq-${tenantId.slice(0, 8)}`, legalName: "เอ", displayName: "เอ" },
    });
    await h.migrator.branch.create({
      data: { id: branchId, tenantId, code: "BKK", name: "สาขาหลัก" },
    });

    const n1 = await h.migrator.$transaction((tx) =>
      nextDocumentNumber(tx, tenantId, branchId, "INVOICE_FULL", "2569"),
    );
    const n2 = await h.migrator.$transaction((tx) =>
      nextDocumentNumber(tx, tenantId, branchId, "INVOICE_FULL", "2569"),
    );
    expect(n1).toBe(1);
    expect(n2).toBe(2);
    expect(formatDocumentNumber("INV", "BKK", "2569", n2)).toBe("INV-BKK-2569-000002");

    await expect(
      h.migrator.$transaction(async (tx) => {
        await nextDocumentNumber(tx, tenantId, branchId, "INVOICE_FULL", "2569");
        throw new Error("ยกเลิก");
      }),
    ).rejects.toThrow("ยกเลิก");

    const n3 = await h.migrator.$transaction((tx) =>
      nextDocumentNumber(tx, tenantId, branchId, "INVOICE_FULL", "2569"),
    );
    expect(n3).toBe(3);
  });
});
