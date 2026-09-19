import { beforeAll, describe, expect, it } from "vitest";
import { checkInPet } from "@/modules/clinical";
import { issueInvoiceFromCharges, tryMutateIssuedInvoice } from "./invoice";
import { openCashierShift } from "./shift";
import { getPgHarness, type PgHarness } from "@/test/pg-harness";
import { seedMiniClinic, staffContext } from "@/test/clinic-fixture";

let h: PgHarness;

beforeAll(async () => {
  h = await getPgHarness();
});

describe("ออกบิล", () => {
  it("จองเลขตอนออกบิล คำนวณ VAT ระดับบิล และห้ามแก้ยอดหลังออก", async () => {
    const f = await seedMiniClinic(h.migrator);
    const ctx = staffContext(h.app, f);
    await openCashierShift(ctx, { openingFloatSatang: 0 });
    const checked = await checkInPet(ctx, { petId: f.pet.id, weightKg: "4" });
    const charges = await h.migrator.chargeItem.findMany({ where: { encounterId: checked.encounterId } });
    expect(charges.length).toBeGreaterThan(0);

    const invoice = await issueInvoiceFromCharges(ctx, {
      chargeIds: charges.map((c) => c.id),
      method: "CASH",
    });
    expect(invoice.number).toMatch(/^INV-BKK-\d{4}-\d{6}$/);
    expect(invoice.grandTotalSatang).toBe(35000);
    expect(invoice.vatSatang).toBe(2290);
    const lineVat = await h.migrator.invoiceLine.findMany({ where: { invoiceId: invoice.id } });
    expect(lineVat.reduce((s, l) => s + l.vatSatang, 0)).toBe(2290);
    expect(invoice.paidSatang).toBe(35000);
    const billed = await h.migrator.auditLog.findMany({ where: { entityId: invoice.id } });
    expect(billed.some((l) => l.action === "invoice.issued")).toBe(true);

    await expect(tryMutateIssuedInvoice(h.migrator, invoice.id, 1)).rejects.toThrow(
      /P0001|แก้ไขไม่ได้|ใบก/,
    );

    await expect(
      h.migrator.invoice.update({ where: { id: invoice.id }, data: { status: "DRAFT" } }),
    ).rejects.toThrow(/ร่าง|แก้ไขไม่ได้|P0001/);
  });

  it("ออกบิลชุดเดียวกันพร้อมกันได้ครั้งเดียว", async () => {
    const f = await seedMiniClinic(h.migrator);
    const ctx = staffContext(h.app, f);
    await openCashierShift(ctx, { openingFloatSatang: 0 });
    const checked = await checkInPet(ctx, { petId: f.pet.id, weightKg: "4" });
    const charges = await h.migrator.chargeItem.findMany({ where: { encounterId: checked.encounterId } });
    const chargeIds = charges.map((c) => c.id);
    const results = await Promise.allSettled([
      issueInvoiceFromCharges(ctx, { chargeIds, method: "CASH" }),
      issueInvoiceFromCharges(ctx, { chargeIds, method: "CASH" }),
    ]);
    const ok = results.filter((r) => r.status === "fulfilled");
    const failed = results.filter((r) => r.status === "rejected");
    expect(ok).toHaveLength(1);
    expect(failed).toHaveLength(1);
    const invoices = await h.migrator.invoice.findMany({
      where: { ownerId: f.owner.id },
    });
    expect(invoices).toHaveLength(1);
  });
});
