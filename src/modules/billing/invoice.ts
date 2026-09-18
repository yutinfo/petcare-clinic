import { Prisma, type InvoiceDocType, type PaymentMethod } from "@prisma/client";
import { consumeFefo } from "@/modules/inventory";
import { bahtText, BusinessError, buddhistYearPeriod, formatSatangTh } from "@/modules/shared";
import { computeInvoiceTotals, formatDocumentNumber, nextDocumentNumber } from "@/modules/tax";
import type { AppContext } from "@/server/context";

export type IssueInvoiceInput = {
  chargeIds: string[];
  method?: PaymentMethod;
  amountSatang?: number;
  reference?: string;
  fullTax?: boolean;
};

export async function issueInvoiceFromCharges(ctx: AppContext, input: IssueInvoiceInput) {
  ctx.can("billing:invoice");
  if (!ctx.branchId) throw new BusinessError("ต้องระบุสาขา");
  if (input.chargeIds.length === 0) throw new BusinessError("เลือกรายการก่อนออกบิล");

  return ctx.tx(async (tx) => {
    const chargeIds = [...new Set(input.chargeIds)].sort();
    if (chargeIds.some((id) => !/^[0-9a-f-]{36}$/i.test(id))) {
      throw new BusinessError("รหัสรายการไม่ถูกต้อง");
    }
    await tx.$queryRawUnsafe(
      `SELECT id FROM "ChargeItem" WHERE id IN (${chargeIds.map((id) => `'${id}'::uuid`).join(",")}) FOR UPDATE`,
    );
    const charges = await tx.chargeItem.findMany({
      where: { id: { in: chargeIds }, branchId: ctx.branchId! },
      include: { owner: true, pet: true },
      orderBy: { occurredAt: "asc" },
    });
    if (charges.length !== chargeIds.length) {
      throw new BusinessError("ไม่พบรายการค่าใช้จ่ายบางรายการ");
    }
    if (charges.some((c) => c.status !== "OPEN")) {
      throw new BusinessError("มีรายการที่วางบิลไปแล้ว");
    }
    ctx.can("billing:invoice", { branchId: ctx.branchId });
    const ownerId = charges[0]!.ownerId;
    if (charges.some((c) => c.ownerId !== ownerId)) {
      throw new BusinessError("รายการต้องเป็นของลูกค้าคนเดียวกัน");
    }

    const owner = charges[0]!.owner;
    const branch = await tx.branch.findFirst({
      where: { id: ctx.branchId!, tenantId: ctx.tenantId },
    });
    if (!branch) throw new BusinessError("ไม่พบสาขา");

    const profile = await tx.taxProfile.findUnique({ where: { branchId: branch.id } });
    if (!profile) throw new BusinessError("ยังไม่ได้ตั้งค่าภาษีของสาขา");

    const totals = computeInvoiceTotals(
      charges.map((c) => ({ amountSatang: c.amountSatang, taxCode: c.taxCode })),
      {
        isVatRegistered: profile.isVatRegistered,
        vatRatePercent: Number(profile.vatRatePercent),
        pricesIncludeVat: profile.pricesIncludeVat,
      },
    );

    const docType: InvoiceDocType = profile.isVatRegistered
      ? input.fullTax || owner.taxId
        ? "FULL_TAX_INVOICE"
        : "ABBREVIATED_TAX_INVOICE"
      : "RECEIPT";

    const period = buddhistYearPeriod();
    const seq = await nextDocumentNumber(tx, ctx.tenantId, branch.id, docType, period);
    const prefix = profile.isVatRegistered ? profile.invoicePrefix : "REC";
    const number = formatDocumentNumber(prefix, branch.code, period, seq);

    const invoice = await tx.invoice.create({
      data: {
        tenantId: ctx.tenantId,
        branchId: branch.id,
        docType,
        number,
        ownerId,
        status: "ISSUED",
        issuedAt: new Date(),
        buyerName: [owner.firstName, owner.lastName].filter(Boolean).join(" "),
        buyerTaxId: owner.taxId,
        buyerBranchCode: owner.taxBranchCode,
        buyerAddress: [owner.addressLine, owner.district, owner.province].filter(Boolean).join(" ") || null,
        sellerName: profile.sellerName,
        sellerTaxId: profile.taxId,
        sellerAddress: profile.sellerAddress,
        sellerBranchCode: profile.taxBranchCode,
        priceIncludesVat: profile.pricesIncludeVat,
        subtotalSatang: totals.subtotalSatang,
        vatBaseSatang: totals.vatBaseSatang,
        vatSatang: totals.vatSatang,
        exemptSatang: totals.exemptSatang,
        grandTotalSatang: totals.grandTotalSatang,
        paidSatang: 0,
        balanceSatang: totals.grandTotalSatang,
        issuedById: ctx.actor.membershipId,
      },
    });

    await tx.invoiceLine.createMany({
      data: charges.map((c, i) => ({
        tenantId: ctx.tenantId,
        invoiceId: invoice.id,
        lineNo: i + 1,
        chargeItemId: c.id,
        itemType: c.itemType,
        description: c.description,
        petName: c.pet?.name ?? null,
        qty: c.qty,
        unitName: c.unitName,
        unitPriceSatang: c.unitPriceSatang,
        discountSatang: c.discountSatang,
        taxCode: c.taxCode,
        vatRatePercent: c.vatRatePercent,
        vatSatang: totals.lineVatSatang[i] ?? 0,
        amountSatang: c.amountSatang,
      })),
    });

    const claimed = await tx.chargeItem.updateMany({
      where: { id: { in: charges.map((c) => c.id) }, status: "OPEN" },
      data: { status: "INVOICED", invoiceId: invoice.id },
    });
    if (claimed.count !== charges.length) {
      throw new BusinessError("มีรายการที่วางบิลไปแล้ว");
    }

    const encounterIds = [...new Set(charges.map((c) => c.encounterId).filter(Boolean))] as string[];
    for (const encounterId of encounterIds) {
      const leftover = await tx.chargeItem.count({
        where: { encounterId, status: "OPEN" },
      });
      if (leftover === 0) {
        await tx.encounter.updateMany({
          where: { id: encounterId, status: { in: ["READY_TO_BILL", "IN_PROGRESS", "PENDING_RESULT"] } },
          data: { status: "CLOSED", closedAt: new Date() },
        });
      }
    }

    const saleIds = [...new Set(charges.map((c) => c.posSaleId).filter(Boolean))] as string[];
    if (saleIds.length > 0) {
      await tx.posSale.updateMany({
        where: { id: { in: saleIds } },
        data: { status: "INVOICED", closedAt: new Date() },
      });
    }

    for (const charge of charges) {
      if (charge.sourceType !== "POS" || !charge.productId) continue;
      await consumeFefo(tx, {
        tenantId: ctx.tenantId,
        branchId: branch.id,
        productId: charge.productId,
        qtyBase: charge.qty,
        type: "SALE",
        refType: "POS_SALE",
        refId: charge.posSaleId ?? invoice.id,
        performedById: ctx.actor.membershipId ?? ctx.actor.userId,
      });
    }

    let paidSatang = 0;
    if (input.method) {
      const payAmount = input.amountSatang ?? totals.grandTotalSatang;
      if (payAmount <= 0) throw new BusinessError("ยอดชำระต้องมากกว่าศูนย์");
      if (payAmount > totals.grandTotalSatang) {
        throw new BusinessError("ยอดชำระเกินยอดบิล");
      }
      await tx.payment.create({
        data: {
          tenantId: ctx.tenantId,
          branchId: branch.id,
          invoiceId: invoice.id,
          ownerId,
          method: input.method,
          amountSatang: payAmount,
          receivedById: ctx.actor.membershipId ?? ctx.actor.userId,
          reference: input.reference ?? null,
        },
      });
      paidSatang = payAmount;
      const balance = totals.grandTotalSatang - paidSatang;
      await tx.invoice.update({
        where: { id: invoice.id },
        data: {
          paidSatang,
          balanceSatang: balance,
          status: balance === 0 ? "PAID" : "PARTIALLY_PAID",
        },
      });
    }

    ctx.emit("invoice.issued", { invoiceId: invoice.id, number, grandTotalSatang: totals.grandTotalSatang });

    return {
      id: invoice.id,
      number,
      docType,
      grandTotalSatang: totals.grandTotalSatang,
      vatSatang: totals.vatSatang,
      paidSatang,
      bahtText: bahtText(totals.grandTotalSatang),
      displayTotal: formatSatangTh(totals.grandTotalSatang),
    };
  });
}

export async function getInvoice(ctx: AppContext, invoiceId: string) {
  ctx.can("billing:read");
  return ctx.tx(async (tx) => {
    const invoice = await tx.invoice.findFirst({
      where: { id: invoiceId },
      include: { lines: { orderBy: { lineNo: "asc" } }, payments: true, owner: true },
    });
    if (!invoice) throw new BusinessError("ไม่พบบิล");
    ctx.can("billing:read", { branchId: invoice.branchId });
    return {
      id: invoice.id,
      number: invoice.number,
      docType: invoice.docType,
      status: invoice.status,
      issuedAt: invoice.issuedAt?.toISOString() ?? null,
      buyerName: invoice.buyerName,
      buyerTaxId: invoice.buyerTaxId,
      sellerName: invoice.sellerName,
      sellerTaxId: invoice.sellerTaxId,
      sellerAddress: invoice.sellerAddress,
      sellerBranchCode: invoice.sellerBranchCode,
      priceIncludesVat: invoice.priceIncludesVat,
      subtotalSatang: invoice.subtotalSatang,
      vatBaseSatang: invoice.vatBaseSatang,
      vatSatang: invoice.vatSatang,
      exemptSatang: invoice.exemptSatang,
      grandTotalSatang: invoice.grandTotalSatang,
      paidSatang: invoice.paidSatang,
      balanceSatang: invoice.balanceSatang,
      bahtText: bahtText(invoice.grandTotalSatang),
      ownerName: [invoice.owner.firstName, invoice.owner.lastName].filter(Boolean).join(" "),
      lines: invoice.lines.map((l) => ({
        lineNo: l.lineNo,
        description: l.description,
        petName: l.petName,
        qty: l.qty.toString(),
        unitName: l.unitName,
        unitPriceSatang: l.unitPriceSatang,
        vatSatang: l.vatSatang,
        amountSatang: l.amountSatang,
        taxCode: l.taxCode,
      })),
      payments: invoice.payments.map((p) => ({
        method: p.method,
        amountSatang: p.amountSatang,
        receivedAt: p.receivedAt.toISOString(),
      })),
    };
  });
}

export async function listRecentInvoices(ctx: AppContext) {
  ctx.can("billing:read");
  if (!ctx.branchId) throw new BusinessError("ต้องระบุสาขา");
  return ctx.tx(async (tx) => {
    const rows = await tx.invoice.findMany({
      where: { branchId: ctx.branchId! },
      include: { owner: true },
      orderBy: { createdAt: "desc" },
      take: 40,
    });
    return rows.map((inv) => ({
      id: inv.id,
      number: inv.number,
      status: inv.status,
      docType: inv.docType,
      grandTotalSatang: inv.grandTotalSatang,
      issuedAt: inv.issuedAt?.toISOString() ?? inv.createdAt.toISOString(),
      ownerName: [inv.owner.firstName, inv.owner.lastName].filter(Boolean).join(" "),
    }));
  });
}

/** ใช้ในเทสว่าบิลที่ออกแล้วแก้ยอดไม่ได้ */
export async function tryMutateIssuedInvoice(
  tx: Prisma.TransactionClient,
  invoiceId: string,
  grandTotalSatang: number,
) {
  return tx.invoice.update({
    where: { id: invoiceId },
    data: { grandTotalSatang },
  });
}
