"use client";

import Link from "next/link";
import { CREDIT_REASON } from "@/components/staff/labels";
import { Button } from "@/components/ui/button";
import { formatThaiDateTime } from "@/modules/shared/date";
import { formatSatangTh } from "@/modules/shared/money";

export type CreditNotePrint = {
  id: string;
  number: string;
  reasonCode: string;
  reason: string;
  originalAmountSatang: number;
  correctAmountSatang: number;
  differenceSatang: number;
  vatSatang: number;
  issuedAt: string;
  bahtText: string;
  invoiceNumber: string;
  invoiceGrandTotalSatang: number;
  buyerName: string;
  buyerTaxId: string | null;
  sellerName: string;
  sellerTaxId: string | null;
  sellerAddress: string | null;
  sellerBranchCode: string;
  lines: { description: string; qty: string; amountSatang: number }[];
};

export function CreditNotePrint({ branch, note }: { branch: string; note: CreditNotePrint }) {
  const branchLabel = note.sellerBranchCode === "00000" ? "สำนักงานใหญ่" : `สาขาที่ ${note.sellerBranchCode}`;
  return (
    <div className="space-y-4">
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-stone-500">ออกใบลดหนี้แล้ว — พิมพ์ให้ลูกค้าหรือกลับไปหน้าการเงิน</p>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => window.print()}>
            พิมพ์ใบลดหนี้
          </Button>
          <Link
            href={`/${branch}/billing`}
            className="inline-flex h-11 items-center rounded-xl bg-teal px-4 text-sm font-medium text-white"
          >
            กลับหน้าการเงิน
          </Link>
        </div>
      </div>
      <article className="clinic-card mx-auto max-w-xl p-8">
        <p className="text-center text-sm font-medium text-teal">ต้นฉบับ</p>
        <h1 className="mt-1 text-center text-2xl font-semibold">ใบลดหนี้</h1>
        <p className="mt-1 text-center text-sm text-stone-500">เลขที่ {note.number}</p>
        <div className="mt-6 grid gap-1 text-sm">
          <p>
            <span className="text-stone-500">ผู้ขาย</span> {note.sellerName}
          </p>
          {note.sellerAddress ? <p>{note.sellerAddress}</p> : null}
          {note.sellerTaxId ? (
            <p>
              เลขประจำตัวผู้เสียภาษี {note.sellerTaxId} {branchLabel}
            </p>
          ) : null}
          <p className="mt-3">
            <span className="text-stone-500">ผู้ซื้อ</span> {note.buyerName}
          </p>
          {note.buyerTaxId ? <p>เลขประจำตัวผู้เสียภาษี {note.buyerTaxId}</p> : null}
          <p>วันที่ {formatThaiDateTime(new Date(note.issuedAt))}</p>
          <p>อ้างอิงใบกำกับเลขที่ {note.invoiceNumber}</p>
        </div>
        {note.lines.length > 0 ? (
          <ul className="mt-6 space-y-1 border-t border-stone-100 pt-4 text-sm">
            {note.lines.map((line) => (
              <li key={`${line.description}-${line.qty}`} className="flex justify-between gap-3">
                <span>
                  {line.description} <span className="text-stone-500">× {line.qty}</span>
                </span>
                <span className="tabular-nums">{formatSatangTh(line.amountSatang)}</span>
              </li>
            ))}
          </ul>
        ) : null}
        <dl className="mt-6 space-y-1 border-t border-stone-100 pt-4 text-sm">
          <div className="flex justify-between gap-3">
            <dt>ยอดตามใบกำกับเดิม</dt>
            <dd className="tabular-nums">{formatSatangTh(note.invoiceGrandTotalSatang)} บาท</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt>มูลค่าก่อนใบนี้</dt>
            <dd className="tabular-nums">{formatSatangTh(note.originalAmountSatang)} บาท</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt>มูลค่าที่ถูกต้อง</dt>
            <dd className="tabular-nums">{formatSatangTh(note.correctAmountSatang)} บาท</dd>
          </div>
          {note.vatSatang > 0 ? (
            <div className="flex justify-between gap-3">
              <dt>ภาษีขายในส่วนที่ลด</dt>
              <dd className="tabular-nums">{formatSatangTh(note.vatSatang)} บาท</dd>
            </div>
          ) : null}
          <div className="flex justify-between gap-3 text-lg font-semibold">
            <dt>ผลต่าง</dt>
            <dd className="tabular-nums">{formatSatangTh(note.differenceSatang)} บาท</dd>
          </div>
          <p className="text-stone-500">({note.bahtText})</p>
        </dl>
        <p className="mt-4 text-sm">
          เหตุผล: {CREDIT_REASON[note.reasonCode] ?? note.reasonCode} — {note.reason}
        </p>
        <p className="mt-3 text-sm text-stone-500">ตัวเลขบนใบกำกับเดิมไม่ถูกแก้ไข เอกสารนี้เป็นใบลดหนี้แยกต่างหาก</p>
      </article>
    </div>
  );
}
