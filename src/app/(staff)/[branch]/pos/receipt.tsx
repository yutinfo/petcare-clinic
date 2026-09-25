"use client";

import Link from "next/link";
import { DocLabel } from "@/components/staff/doc-label";
import { formatSatangTh } from "@/modules/shared/money";
import { formatThaiDateTime } from "@/modules/shared/date";
import { Button } from "@/components/ui/button";
import type { getInvoice } from "@/modules/billing";

const DOC_LABEL = {
  FULL_TAX_INVOICE: "fullTax",
  ABBREVIATED_TAX_INVOICE: "abbreviated",
  RECEIPT: "receipt",
  PROFORMA: "proforma",
} as const;

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
        <p className="text-center text-xs font-medium uppercase tracking-wide text-teal">
          <DocLabel name="original" />
        </p>
        <h1 className="mt-1 text-center text-2xl font-semibold">
          {DOC_LABEL[invoice.docType as keyof typeof DOC_LABEL] ? (
            <DocLabel name={DOC_LABEL[invoice.docType as keyof typeof DOC_LABEL]} />
          ) : (
            invoice.docType
          )}
        </h1>
        <p className="mt-1 text-center text-sm text-stone-500">
          <DocLabel name="number" /> {invoice.number}
        </p>
        <div className="mt-6 grid gap-1 text-sm">
          <p>
            <DocLabel name="seller" /> {invoice.sellerName}
          </p>
          <p>{invoice.sellerAddress}</p>
          {invoice.sellerTaxId ? (
            <p>
              <DocLabel name="taxId" /> {invoice.sellerTaxId} <DocLabel name="headOffice" />
            </p>
          ) : null}
          <p className="mt-3">
            <DocLabel name="buyer" /> {invoice.buyerName}
          </p>
          {invoice.buyerTaxId ? (
            <p>
              <DocLabel name="taxId" /> {invoice.buyerTaxId}
            </p>
          ) : null}
          <p>
            <DocLabel name="date" /> {invoice.issuedAt ? formatThaiDateTime(new Date(invoice.issuedAt)) : ""}
          </p>
        </div>
        <table className="mt-6 w-full text-sm">
          <thead>
            <tr className="border-b text-left text-stone-500">
              <th className="py-2">
                <DocLabel name="item" />
              </th>
              <th>
                <DocLabel name="pet" />
              </th>
              <th className="text-right">
                <DocLabel name="total" />
              </th>
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
            <dt>
              <DocLabel name="base" />
            </dt>
            <dd className="tabular-nums">{formatSatangTh(invoice.vatBaseSatang || invoice.subtotalSatang)}</dd>
          </div>
          {invoice.vatSatang > 0 ? (
            <div className="flex justify-between">
              <dt>
                <DocLabel name="vat" />
              </dt>
              <dd className="tabular-nums">{formatSatangTh(invoice.vatSatang)}</dd>
            </div>
          ) : null}
          <div className="flex justify-between text-lg font-semibold">
            <dt>
              <DocLabel name="grand" />
            </dt>
            <dd className="tabular-nums">{formatSatangTh(invoice.grandTotalSatang)}</dd>
          </div>
          <p className="text-stone-500">({invoice.bahtText})</p>
        </dl>
        {invoice.priceIncludesVat && invoice.vatSatang > 0 ? (
          <p className="mt-3 text-xs text-stone-500">
            <DocLabel name="includesVat" />
          </p>
        ) : null}
        <p className="mt-4 text-xs text-amber-700">
          การจัดประเภท VAT ของแต่ละรายการตั้งได้ที่แค็ตตาล็อก — รอผู้ทำบัญชียืนยันก่อนใช้งานจริง
        </p>
      </article>
    </div>
  );
}
