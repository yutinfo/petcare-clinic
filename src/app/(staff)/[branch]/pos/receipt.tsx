"use client";

import Link from "next/link";
import { formatSatangTh } from "@/modules/shared/money";
import { formatThaiDateTime } from "@/modules/shared/date";
import { Button } from "@/components/ui/button";
import type { getInvoice } from "@/modules/billing";

const DOC_LABEL: Record<string, string> = {
  FULL_TAX_INVOICE: "ใบกำกับภาษี / ใบเสร็จรับเงิน",
  ABBREVIATED_TAX_INVOICE: "ใบเสร็จรับเงิน/ใบกำกับภาษีอย่างย่อ",
  RECEIPT: "ใบเสร็จรับเงิน",
  PROFORMA: "ใบแจ้งหนี้",
};

export function ReceiptCard({
  branch,
  invoice,
}: {
  branch: string;
  invoice: Awaited<ReturnType<typeof getInvoice>>;
}) {
  return (
    <div className="space-y-4">
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-stone-500">ออกบิลแล้ว — พิมพ์ให้ลูกค้าหรือทำรายการถัดไป</p>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => window.print()}>
            พิมพ์ใบเสร็จ
          </Button>
          <Link
            href={`/${branch}/pos`}
            className="inline-flex h-11 items-center rounded-xl bg-teal px-4 text-sm font-medium text-white"
          >
            คิดเงินรายการถัดไป
          </Link>
        </div>
      </div>
      <article className="clinic-card mx-auto max-w-xl p-8">
        <p className="text-center text-xs font-medium uppercase tracking-wide text-teal">ต้นฉบับ</p>
        <h1 className="mt-1 text-center text-2xl font-semibold">{DOC_LABEL[invoice.docType] ?? invoice.docType}</h1>
        <p className="mt-1 text-center text-sm text-stone-500">เลขที่ {invoice.number}</p>
        <div className="mt-6 grid gap-1 text-sm">
          <p>
            <span className="text-stone-400">ผู้ขาย</span> {invoice.sellerName}
          </p>
          <p>{invoice.sellerAddress}</p>
          {invoice.sellerTaxId ? <p>เลขประจำตัวผู้เสียภาษี {invoice.sellerTaxId} สำนักงานใหญ่</p> : null}
          <p className="mt-3">
            <span className="text-stone-400">ผู้ซื้อ</span> {invoice.buyerName}
          </p>
          {invoice.buyerTaxId ? <p>เลขประจำตัวผู้เสียภาษี {invoice.buyerTaxId}</p> : null}
          <p>วันที่ {invoice.issuedAt ? formatThaiDateTime(new Date(invoice.issuedAt)) : ""}</p>
        </div>
        <table className="mt-6 w-full text-sm">
          <thead>
            <tr className="border-b text-left text-stone-400">
              <th className="py-2">รายการ</th>
              <th>สัตว์</th>
              <th className="text-right">รวม</th>
            </tr>
          </thead>
          <tbody>
            {invoice.lines.map((l) => (
              <tr key={l.lineNo} className="border-b border-stone-100">
                <td className="py-2">
                  {l.description}
                  <span className="block text-xs text-stone-400">
                    {l.qty} {l.unitName ?? ""}
                  </span>
                </td>
                <td>{l.petName ?? "—"}</td>
                <td className="text-right tabular-nums">{formatSatangTh(l.amountSatang)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <dl className="mt-4 space-y-1 text-sm">
          <div className="flex justify-between">
            <dt>มูลค่าสินค้า/บริการ</dt>
            <dd className="tabular-nums">{formatSatangTh(invoice.vatBaseSatang || invoice.subtotalSatang)}</dd>
          </div>
          {invoice.vatSatang > 0 ? (
            <div className="flex justify-between">
              <dt>ภาษีมูลค่าเพิ่ม 7%</dt>
              <dd className="tabular-nums">{formatSatangTh(invoice.vatSatang)}</dd>
            </div>
          ) : null}
          <div className="flex justify-between text-lg font-semibold">
            <dt>รวมทั้งสิ้น</dt>
            <dd className="tabular-nums">{formatSatangTh(invoice.grandTotalSatang)}</dd>
          </div>
          <p className="text-stone-500">({invoice.bahtText})</p>
        </dl>
        {invoice.priceIncludesVat && invoice.vatSatang > 0 ? (
          <p className="mt-3 text-xs text-stone-400">ราคาสินค้ารวมภาษีมูลค่าเพิ่มแล้ว</p>
        ) : null}
        <p className="mt-4 text-xs text-amber-700">
          การจัดประเภท VAT ของแต่ละรายการตั้งได้ที่แค็ตตาล็อก — รอผู้ทำบัญชียืนยันก่อนใช้งานจริง
        </p>
      </article>
    </div>
  );
}
