import { beforeAll, describe, expect, it } from "vitest";
import { Prisma } from "@prisma/client";
import { checkInPet } from "@/modules/clinical";
import { createAppContext } from "@/server/context";
import { bangkokBusinessDate } from "@/modules/shared";
import { getPgHarness, type PgHarness } from "@/test/pg-harness";
import { addLot, seedMiniClinic, staffContext } from "@/test/clinic-fixture";
import { issueCreditNote } from "./credit-note";
import { issueInvoiceFromCharges } from "./invoice";
import { addPosLine } from "./pos";
import { findOpenCashierShift, openCashierShift } from "./shift";

let h: PgHarness;

beforeAll(async () => {
  h = await getPgHarness();
});

async function unpaidInvoice(permissions?: readonly string[]) {
  const f = await seedMiniClinic(h.migrator);
  const ctx = staffContext(h.app, f, permissions);
  const checked = await checkInPet(ctx, { petId: f.pet.id, weightKg: "4" });
  const charges = await h.migrator.chargeItem.findMany({
    where: { encounterId: checked.encounterId },
  });
  const invoice = await issueInvoiceFromCharges(ctx, { chargeIds: charges.map((c) => c.id) });
  return { f, ctx, invoice };
}

describe("ใบลดหนี้", () => {
  it("ลดบางส่วนแล้วลูกหนี้และภาษีขายลดตามจริง โดยไม่แก้ยอดบนใบกำกับ", async () => {
    const { ctx, invoice } = await unpaidInvoice();
    const note = await issueCreditNote(ctx, {
      invoiceId: invoice.id,
      reasonCode: "PRICE_ERROR",
      reason: "คิดค่าตรวจสูงไป",
      correctAmountSatang: 20_000,
    });

    expect(note.number).toMatch(/^CN-BKK-\d{4}-\d{6}$/);
    expect(note.differenceSatang).toBe(15_000);
    expect(note.vatSatang).toBe(981);
    expect(note.balanceSatang).toBe(20_000);

    const row = await h.migrator.invoice.findUniqueOrThrow({ where: { id: invoice.id } });
    expect(row.grandTotalSatang).toBe(35_000);
    expect(row.vatSatang).toBe(2_290);
    expect(row.balanceSatang).toBe(20_000);
    expect(row.status).toBe("ISSUED");

    const closing = await issueCreditNote(ctx, {
      invoiceId: invoice.id,
      reasonCode: "DISCOUNT_AFTER",
      reason: "ลดส่วนที่เหลือ",
      correctAmountSatang: 0,
    });
    expect(closing.vatSatang).toBe(1_309);
    expect(note.vatSatang + closing.vatSatang).toBe(2_290);
    const closed = await h.migrator.invoice.findUniqueOrThrow({ where: { id: invoice.id } });
    expect(closed.balanceSatang).toBe(0);
    expect(closed.grandTotalSatang).toBe(35_000);
    expect(closed.vatSatang).toBe(2_290);

    const audit = await h.migrator.auditLog.findMany({ where: { entityId: note.id } });
    expect(audit.some((row) => row.action === "credit_note.issued")).toBe(true);
  });

  it("จ่ายครบแล้วออกใบลดหนี้ไม่ได้ และลดเกินยอดค้างไม่ได้", async () => {
    const f = await seedMiniClinic(h.migrator);
    const ctx = staffContext(h.app, f);
    await openCashierShift(ctx, { openingFloatSatang: 0 });
    const checked = await checkInPet(ctx, { petId: f.pet.id, weightKg: "4" });
    const charges = await h.migrator.chargeItem.findMany({
      where: { encounterId: checked.encounterId },
    });
    const paid = await issueInvoiceFromCharges(ctx, {
      chargeIds: charges.map((c) => c.id),
      method: "CASH",
    });
    await expect(
      issueCreditNote(ctx, {
        invoiceId: paid.id,
        reasonCode: "RETURN",
        reason: "ลูกค้าคืนของ",
        correctAmountSatang: 0,
      }),
    ).rejects.toThrow(/ชำระครบ/);

    const partial = await unpaidInvoice();
    await h.migrator.invoice.update({
      where: { id: partial.invoice.id },
      data: { paidSatang: 10_000, balanceSatang: 25_000, status: "PARTIALLY_PAID" },
    });
    await expect(
      issueCreditNote(partial.ctx, {
        invoiceId: partial.invoice.id,
        reasonCode: "PRICE_ERROR",
        reason: "ลดเกินส่วนที่ยังค้าง",
        correctAmountSatang: 0,
      }),
    ).rejects.toThrow(/ยอดค้าง/);
  });

  it("ไม่มีสิทธิ์ บิลร่าง และบิลยกเลิก ออกใบลดหนี้ไม่ได้", async () => {
    const { f, ctx, invoice } = await unpaidInvoice();
    const cashier = createAppContext({
      db: h.app,
      tenantId: f.tenantId,
      branchId: f.branchId,
      actor: {
        userId: f.actorId,
        membershipId: f.actorId,
        displayName: "แคชเชียร์",
        kind: "staff",
        permissions: new Set(["billing:invoice", "billing:read"]),
        branchIds: new Set([f.branchId]),
      },
    });
    await expect(
      issueCreditNote(cashier, {
        invoiceId: invoice.id,
        reasonCode: "PRICE_ERROR",
        reason: "ไม่มีสิทธิ์",
        correctAmountSatang: 0,
      }),
    ).rejects.toThrow(/ไม่มีสิทธิ์/);

    await h.migrator.invoice.update({ where: { id: invoice.id }, data: { status: "VOID" } });
    await expect(
      issueCreditNote(ctx, {
        invoiceId: invoice.id,
        reasonCode: "PRICE_ERROR",
        reason: "บิลยกเลิก",
        correctAmountSatang: 0,
      }),
    ).rejects.toThrow(/ยกเลิก/);

    const draft = await h.migrator.invoice.create({
      data: {
        tenantId: f.tenantId,
        branchId: f.branchId,
        docType: "FULL_TAX_INVOICE",
        number: `DRAFT-${invoice.id.slice(0, 8)}`,
        ownerId: f.owner.id,
        status: "DRAFT",
        buyerName: "แพร",
        sellerName: "คลินิกทดสอบ",
        sellerAddress: "กรุงเทพฯ",
        grandTotalSatang: 35_000,
        vatSatang: 2_290,
        balanceSatang: 35_000,
      },
    });
    await expect(
      issueCreditNote(ctx, {
        invoiceId: draft.id,
        reasonCode: "PRICE_ERROR",
        reason: "ยังเป็นร่าง",
        correctAmountSatang: 0,
      }),
    ).rejects.toThrow(/ออกบิลก่อน/);
  });

  it("สองคำขอพร้อมกันลดเต็มจำนวนได้ครั้งเดียว", async () => {
    const { ctx, invoice } = await unpaidInvoice();
    const input = {
      invoiceId: invoice.id,
      reasonCode: "SERVICE_NOT_RENDERED" as const,
      reason: "ไม่ได้ให้บริการ",
      correctAmountSatang: 0,
    };
    const results = await Promise.allSettled([issueCreditNote(ctx, input), issueCreditNote(ctx, input)]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((r) => r.status === "rejected")).toHaveLength(1);
    const notes = await h.migrator.creditNote.findMany({ where: { invoiceId: invoice.id } });
    expect(notes).toHaveLength(1);
    const row = await h.migrator.invoice.findUniqueOrThrow({ where: { id: invoice.id } });
    expect(row.balanceSatang).toBe(0);
    expect(row.grandTotalSatang).toBe(35_000);
  });

  it("คืนสินค้าเข้าล็อตเดิมและคืนเงินสดเมื่อบิลจ่ายครบ", async () => {
    const f = await seedMiniClinic(h.migrator);
    const ctx = staffContext(h.app, f);
    const product = await h.migrator.product.create({
      data: {
        tenantId: f.tenantId,
        code: `TOY-${f.tenantId.slice(0, 8)}`,
        name: "ลูกบอลยาง",
        searchKey: "toyball",
        type: "RETAIL",
        baseUnit: "ชิ้น",
        defaultPriceSatang: 8900,
        requiresPrescription: false,
        taxCode: "VAT7",
      },
    });
    const expiry = bangkokBusinessDate(new Date(Date.now() + 400 * 86_400_000));
    await addLot(h.migrator, {
      tenantId: f.tenantId,
      branchId: f.branchId,
      productId: product.id,
      lotNo: "TOY-OK",
      expiry,
      qty: 5,
      actorId: f.actorId,
    });
    await addPosLine(ctx, { ownerId: f.owner.id, productId: product.id, qty: "2" });
    await openCashierShift(ctx, { openingFloatSatang: 0 });
    const charges = await h.migrator.chargeItem.findMany({ where: { productId: product.id } });
    const invoice = await issueInvoiceFromCharges(ctx, {
      chargeIds: charges.map((charge) => charge.id),
      method: "CASH",
    });
    const line = await h.migrator.invoiceLine.findFirstOrThrow({ where: { invoiceId: invoice.id } });
    const input = {
      invoiceId: invoice.id,
      reasonCode: "RETURN" as const,
      reason: "ลูกค้าคืนของ",
      correctAmountSatang: 0,
      lines: [{ invoiceLineId: line.id, qty: "1" }],
    };
    await expect(issueCreditNote(ctx, input)).rejects.toThrow(/ชำระครบ/);
    await expect(
      issueCreditNote(ctx, { ...input, refundCash: true, lines: [{ invoiceLineId: line.id, qty: "3" }] }),
    ).rejects.toThrow(/จำนวนในบิล/);

    const note = await issueCreditNote(ctx, { ...input, refundCash: true });
    expect(note.differenceSatang).toBe(8900);
    expect(note.refundSatang).toBe(8900);
    const onHand = await h.migrator.stockOnHand.aggregate({
      where: { productId: product.id },
      _sum: { qtyBase: true },
    });
    expect(new Prisma.Decimal(onHand._sum.qtyBase ?? 0).toNumber()).toBe(4);
    const row = await h.migrator.invoice.findUniqueOrThrow({ where: { id: invoice.id } });
    expect(row.grandTotalSatang).toBe(17_800);
    expect(row.paidSatang).toBe(8900);
    expect(row.balanceSatang).toBe(0);
    expect(row.vatSatang).toBeGreaterThan(0);
    const shift = await findOpenCashierShift(ctx);
    expect(shift?.cashReceivedSatang).toBe(8900);
    const lines = await h.migrator.creditNoteLine.findMany({ where: { creditNoteId: note.id } });
    expect(lines).toHaveLength(1);
    expect(lines[0]?.amountSatang).toBe(8900);
  });
});
