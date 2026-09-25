import { Prisma } from "@prisma/client";
import { z } from "zod";
import { returnSoldLots } from "@/modules/inventory";
import { bahtText, BusinessError, buddhistYearPeriod, formatSatangTh } from "@/modules/shared";
import { formatDocumentNumber, nextDocumentNumber } from "@/modules/tax";
import { writeAuditLog } from "@/server/audit";
import type { AppContext } from "@/server/context";
import {
  CREDIT_REASON_CODES,
  lineReturnAmountSatang,
  quoteCreditNote,
  type CreditReasonCode,
} from "./credit-note-math";

const creditNoteInputSchema = z.object({
  invoiceId: z.string().uuid("ไม่พบบิล"),
  reasonCode: z.enum(CREDIT_REASON_CODES, { message: "เลือกเหตุผลใบลดหนี้" }),
  reason: z.string().trim().min(1, "ระบุเหตุผล").max(500, "เหตุผลยาวเกิน 500 ตัวอักษร"),
  correctAmountSatang: z.number().int("ยอดที่ถูกต้องต้องเป็นสตางค์จำนวนเต็ม").min(0, "ยอดที่ถูกต้องต้องไม่ติดลบ"),
  refundCash: z.boolean().optional(),
  lines: z
    .array(
      z.object({
        invoiceLineId: z.string().uuid("ไม่พบบรรทัดบิล"),
        qty: z.string().regex(/^\d+(\.\d{1,4})?$/, "จำนวนคืนไม่ถูกต้อง"),
      }),
    )
    .max(40)
    .optional(),
});

export type IssueCreditNoteInput = z.infer<typeof creditNoteInputSchema>;

const OPENABLE = new Set(["ISSUED", "PARTIALLY_PAID", "PAID"]);

export type CreditableInvoice = {
  id: string;
  number: string;
  ownerName: string;
  status: string;
  grandTotalSatang: number;
  vatSatang: number;
  paidSatang: number;
  balanceSatang: number;
  alreadyCreditedSatang: number;
  alreadyCreditedVatSatang: number;
  lines: {
    id: string;
    description: string;
    qty: string;
    unitName: string | null;
    amountSatang: number;
    returnedQty: string;
    creditedSatang: number;
  }[];
};

export async function listCreditableInvoices(ctx: AppContext): Promise<CreditableInvoice[]> {
  ctx.can("billing:credit_note");
  if (!ctx.branchId) throw new BusinessError("ต้องระบุสาขา");
  return ctx.tx(async (tx) => {
    const rows = await tx.invoice.findMany({
      where: {
        branchId: ctx.branchId!,
        status: { in: ["ISSUED", "PARTIALLY_PAID", "PAID"] },
      },
      include: { owner: true, creditNotes: { include: { lines: true } }, lines: { orderBy: { lineNo: "asc" } } },
      orderBy: { issuedAt: "desc" },
      take: 40,
    });
    return rows
      .map((inv) => {
        const alreadyCreditedSatang = inv.creditNotes.reduce((sum, note) => sum + note.differenceSatang, 0);
        const priorLines = inv.creditNotes.flatMap((note) => note.lines);
        return {
          id: inv.id,
          number: inv.number,
          ownerName: [inv.owner.firstName, inv.owner.lastName].filter(Boolean).join(" "),
          status: inv.status,
          grandTotalSatang: inv.grandTotalSatang,
          vatSatang: inv.vatSatang,
          paidSatang: inv.paidSatang,
          balanceSatang: inv.balanceSatang,
          alreadyCreditedSatang,
          alreadyCreditedVatSatang: inv.creditNotes.reduce((sum, note) => sum + note.vatSatang, 0),
          lines: inv.lines.map((line) => {
            const credited = priorLines.filter((row) => row.invoiceLineId === line.id);
            return {
              id: line.id,
              description: line.description,
              qty: line.qty.toString(),
              unitName: line.unitName,
              amountSatang: line.amountSatang,
              returnedQty: credited
                .reduce((sum, row) => sum.plus(row.qty), new Prisma.Decimal(0))
                .toString(),
              creditedSatang: credited.reduce((sum, row) => sum + row.amountSatang, 0),
            };
          }),
        };
      })
      .filter((inv) => inv.grandTotalSatang - inv.alreadyCreditedSatang > 0);
  });
}

export async function listRecentCreditNotes(ctx: AppContext) {
  ctx.can("billing:read");
  if (!ctx.branchId) throw new BusinessError("ต้องระบุสาขา");
  return ctx.tx(async (tx) => {
    const rows = await tx.creditNote.findMany({
      where: { branchId: ctx.branchId! },
      include: { invoice: true },
      orderBy: { issuedAt: "desc" },
      take: 12,
    });
    return rows.map((note) => ({
      id: note.id,
      number: note.number,
      invoiceNumber: note.invoice.number,
      differenceSatang: note.differenceSatang,
      issuedAt: note.issuedAt.toISOString(),
    }));
  });
}

export async function issueCreditNote(ctx: AppContext, raw: IssueCreditNoteInput) {
  const parsed = creditNoteInputSchema.safeParse(raw);
  if (!parsed.success) {
    throw new BusinessError(parsed.error.issues[0]?.message ?? "ข้อมูลใบลดหนี้ไม่ถูกต้อง");
  }
  const input = parsed.data;
  ctx.can("billing:credit_note");
  if (!ctx.branchId) throw new BusinessError("ต้องระบุสาขา");
  if (!ctx.actor.membershipId) throw new BusinessError("บัญชีนี้ยังไม่ได้ผูกเป็นพนักงาน");

  return ctx.tx(async (tx) => {
    await tx.$queryRawUnsafe(
      `SELECT id FROM "Invoice" WHERE id = '${input.invoiceId}'::uuid FOR UPDATE`,
    );
    const invoice = await tx.invoice.findFirst({
      where: { id: input.invoiceId },
      include: { creditNotes: { include: { lines: true } }, lines: true },
    });
    if (!invoice) throw new BusinessError("ไม่พบบิล");
    ctx.can("billing:credit_note", { branchId: invoice.branchId });
    if (invoice.branchId !== ctx.branchId) {
      throw new BusinessError("บิลนี้ไม่ใช่ของสาขาที่กำลังทำรายการ");
    }
    if (invoice.status === "DRAFT") throw new BusinessError("ออกบิลก่อนจึงจะลดหนี้ได้");
    if (invoice.status === "VOID") throw new BusinessError("บิลที่ยกเลิกแล้วออกใบลดหนี้ไม่ได้");
    if (!OPENABLE.has(invoice.status)) throw new BusinessError("สถานะบิลนี้ออกใบลดหนี้ไม่ได้");

    const alreadyCreditedSatang = invoice.creditNotes.reduce((sum, note) => sum + note.differenceSatang, 0);
    const alreadyCreditedVatSatang = invoice.creditNotes.reduce((sum, note) => sum + note.vatSatang, 0);
    const currentNetSatang = invoice.grandTotalSatang - alreadyCreditedSatang;
    if (currentNetSatang - invoice.paidSatang !== invoice.balanceSatang) {
      throw new BusinessError("ยอดบิลไม่สอดคล้องกับใบลดหนี้ที่มีอยู่");
    }

    const prepared = await creditLines(tx, invoice, input.lines ?? []);
    const correctAmountSatang =
      prepared.length > 0 ? currentNetSatang - prepared.reduce((sum, line) => sum + line.amountSatang, 0) : input.correctAmountSatang;
    const quote = quoteCreditNote({
      grandTotalSatang: invoice.grandTotalSatang,
      invoiceVatSatang: invoice.vatSatang,
      alreadyCreditedSatang,
      alreadyCreditedVatSatang,
      paidSatang: invoice.paidSatang,
      balanceSatang: invoice.balanceSatang,
      correctAmountSatang,
      allowRefund: input.refundCash === true,
    });
    if (!quote.ok) throw new BusinessError(quote.message);
    const notedLines = allocateLineVat(prepared, quote.vatSatang, quote.differenceSatang);

    const branch = await tx.branch.findFirst({
      where: { id: invoice.branchId, tenantId: ctx.tenantId },
    });
    if (!branch) throw new BusinessError("ไม่พบสาขา");

    const period = buddhistYearPeriod();
    const seq = await nextDocumentNumber(tx, ctx.tenantId, branch.id, "CREDIT_NOTE", period);
    const number = formatDocumentNumber("CN", branch.code, period, seq);

    const note = await tx.creditNote.create({
      data: {
        tenantId: ctx.tenantId,
        branchId: invoice.branchId,
        number,
        invoiceId: invoice.id,
        reasonCode: input.reasonCode,
        reason: input.reason,
        originalAmountSatang: quote.currentNetSatang,
        correctAmountSatang,
        differenceSatang: quote.differenceSatang,
        vatSatang: quote.vatSatang,
        issuedById: ctx.actor.membershipId!,
        lines: {
          create: notedLines.map((line) => ({
            tenantId: ctx.tenantId,
            invoiceLineId: line.invoiceLineId,
            description: line.description,
            qty: line.qty,
            amountSatang: line.amountSatang,
            vatSatang: line.vatSatang,
            productId: line.productId,
          })),
        },
      },
    });

    for (const line of notedLines) {
      if (!line.productId) continue;
      await returnSoldLots(tx, {
        tenantId: ctx.tenantId,
        branchId: invoice.branchId,
        productId: line.productId,
        qtyBase: line.qty,
        invoiceId: invoice.id,
        posSaleIds: line.posSaleId ? [line.posSaleId] : [],
        performedById: ctx.actor.membershipId!,
      });
    }

    if (quote.refundSatang > 0) {
      ctx.can("billing:refund", { branchId: invoice.branchId });
      const shift = await tx.cashierShift.findFirst({
        where: { branchId: invoice.branchId, cashierId: ctx.actor.membershipId!, status: "OPEN" },
      });
      if (!shift) throw new BusinessError("เปิดกะเงินสดก่อนคืนเงิน");
      await tx.payment.create({
        data: {
          tenantId: ctx.tenantId,
          branchId: invoice.branchId,
          invoiceId: invoice.id,
          ownerId: invoice.ownerId,
          method: "CASH",
          amountSatang: quote.refundSatang,
          status: "REFUNDED",
          receivedById: ctx.actor.membershipId!,
          shiftId: shift.id,
          note: `คืนเงินตามใบลดหนี้ ${number}`,
        },
      });
    }

    const status =
      quote.newBalanceSatang === 0 && quote.newPaidSatang > 0
        ? "PAID"
        : quote.newPaidSatang > 0
          ? "PARTIALLY_PAID"
          : "ISSUED";
    await tx.invoice.update({
      where: { id: invoice.id },
      data: {
        balanceSatang: quote.newBalanceSatang,
        paidSatang: quote.newPaidSatang,
        status,
      },
    });

    ctx.emit("credit_note.issued", {
      creditNoteId: note.id,
      invoiceId: invoice.id,
      number,
      differenceSatang: quote.differenceSatang,
      vatSatang: quote.vatSatang,
    });
    await writeAuditLog(tx, ctx, {
      action: "credit_note.issued",
      entityType: "CreditNote",
      entityId: note.id,
      reason: input.reason,
      after: {
        number,
        invoiceId: invoice.id,
        reasonCode: input.reasonCode,
        differenceSatang: quote.differenceSatang,
        vatSatang: quote.vatSatang,
      },
    });

    return {
      id: note.id,
      number,
      invoiceId: invoice.id,
      invoiceNumber: invoice.number,
      reasonCode: input.reasonCode satisfies CreditReasonCode,
      originalAmountSatang: quote.currentNetSatang,
      correctAmountSatang,
      differenceSatang: quote.differenceSatang,
      vatSatang: quote.vatSatang,
      refundSatang: quote.refundSatang,
      balanceSatang: quote.newBalanceSatang,
      bahtText: bahtText(quote.differenceSatang),
      displayDifference: formatSatangTh(quote.differenceSatang),
    };
  });
}

export async function getCreditNote(ctx: AppContext, creditNoteId: string) {
  ctx.can("billing:read");
  return ctx.tx(async (tx) => {
    const note = await tx.creditNote.findFirst({
      where: { id: creditNoteId },
      include: { invoice: true, lines: true },
    });
    if (!note) throw new BusinessError("ไม่พบใบลดหนี้");
    ctx.can("billing:read", { branchId: note.branchId });
    const invoice = note.invoice;
    return {
      id: note.id,
      number: note.number,
      reasonCode: note.reasonCode,
      reason: note.reason,
      originalAmountSatang: note.originalAmountSatang,
      correctAmountSatang: note.correctAmountSatang,
      differenceSatang: note.differenceSatang,
      vatSatang: note.vatSatang,
      issuedAt: note.issuedAt.toISOString(),
      bahtText: bahtText(note.differenceSatang),
      invoiceNumber: invoice.number,
      invoiceGrandTotalSatang: invoice.grandTotalSatang,
      invoiceVatSatang: invoice.vatSatang,
      buyerName: invoice.buyerName,
      buyerTaxId: invoice.buyerTaxId,
      sellerName: invoice.sellerName,
      sellerTaxId: invoice.sellerTaxId,
      sellerAddress: invoice.sellerAddress,
      sellerBranchCode: invoice.sellerBranchCode,
      lines: note.lines.map((line) => ({
        description: line.description,
        qty: line.qty.toString(),
        amountSatang: line.amountSatang,
      })),
    };
  });
}

type PreparedLine = {
  invoiceLineId: string;
  description: string;
  qty: Prisma.Decimal;
  amountSatang: number;
  vatSatang: number;
  productId: string | null;
  posSaleId: string | null;
};

async function creditLines(
  tx: Prisma.TransactionClient,
  invoice: {
    id: string;
    lines: { id: string; description: string; qty: Prisma.Decimal; amountSatang: number; chargeItemId: string | null }[];
    creditNotes: { lines: { invoiceLineId: string | null; qty: Prisma.Decimal; amountSatang: number }[] }[];
  },
  requested: { invoiceLineId: string; qty: string }[],
): Promise<Omit<PreparedLine, "vatSatang">[]> {
  if (requested.length === 0) return [];
  const charges = await tx.chargeItem.findMany({
    where: { id: { in: invoice.lines.map((line) => line.chargeItemId).filter((id): id is string => Boolean(id)) } },
  });
  const prior = invoice.creditNotes.flatMap((note) => note.lines);
  return requested.map((row) => {
    const line = invoice.lines.find((item) => item.id === row.invoiceLineId);
    if (!line) throw new BusinessError("ไม่พบบรรทัดบิล");
    const credited = prior.filter((item) => item.invoiceLineId === line.id);
    const alreadyQty = credited.reduce((sum, item) => sum.plus(item.qty), new Prisma.Decimal(0));
    const alreadyAmount = credited.reduce((sum, item) => sum + item.amountSatang, 0);
    let amountSatang: number;
    try {
      amountSatang = lineReturnAmountSatang({
        lineAmountSatang: line.amountSatang,
        lineQty: line.qty.toString(),
        returnQty: row.qty,
        alreadyReturnedQty: alreadyQty.toString(),
        alreadyCreditedSatang: alreadyAmount,
      });
    } catch (err) {
      throw new BusinessError(err instanceof Error ? err.message : "จำนวนคืนไม่ถูกต้อง");
    }
    const charge = charges.find((item) => item.id === line.chargeItemId);
    return {
      invoiceLineId: line.id,
      description: line.description,
      qty: new Prisma.Decimal(row.qty),
      amountSatang,
      productId: charge?.productId ?? null,
      posSaleId: charge?.posSaleId ?? null,
    };
  });
}

function allocateLineVat(
  lines: Omit<PreparedLine, "vatSatang">[],
  vatSatang: number,
  differenceSatang: number,
): PreparedLine[] {
  let remaining = vatSatang;
  return lines.map((line, index) => {
    const share =
      index === lines.length - 1 || differenceSatang === 0
        ? remaining
        : Math.min(remaining, Math.round((line.amountSatang * vatSatang) / differenceSatang));
    remaining -= share;
    return { ...line, vatSatang: share };
  });
}
