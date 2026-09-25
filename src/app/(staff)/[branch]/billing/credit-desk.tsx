"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CREDIT_REASON } from "@/components/staff/labels";
import { askToProceed } from "@/components/staff/live";
import { EmptyState, Field, Notice } from "@/components/staff/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { CREDIT_REASON_CODES, lineReturnAmountSatang, quoteCreditNote } from "@/modules/billing/credit-note-math";
import { bahtStringToSatang, formatSatangTh } from "@/modules/shared/money";
import { issueCreditNoteAction } from "./actions";

export type CreditInvoiceOption = {
  id: string;
  number: string;
  ownerName: string;
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

export type RecentCreditNote = {
  id: string;
  number: string;
  invoiceNumber: string;
  differenceSatang: number;
};

export function CreditDesk({
  branch,
  invoices,
  recent,
}: {
  branch: string;
  invoices: CreditInvoiceOption[];
  recent: RecentCreditNote[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [invoiceId, setInvoiceId] = useState(invoices[0]?.id ?? "");
  const [correctBaht, setCorrectBaht] = useState("");
  const [reasonCode, setReasonCode] = useState<(typeof CREDIT_REASON_CODES)[number]>("PRICE_ERROR");
  const [refundCash, setRefundCash] = useState(false);
  const [qtyByLine, setQtyByLine] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<string | null>(null);
  const selected = invoices.find((inv) => inv.id === invoiceId) ?? null;

  const returnLines = useMemo(() => {
    if (!selected) return [];
    return selected.lines.flatMap((line) => {
      const qty = (qtyByLine[line.id] ?? "").trim();
      if (qty === "" || qty === "0") return [];
      return [{ ...line, returnQty: qty }];
    });
  }, [qtyByLine, selected]);

  const quote = useMemo(() => {
    if (!selected) return null;
    try {
      const currentNet = selected.grandTotalSatang - selected.alreadyCreditedSatang;
      const correctAmountSatang =
        returnLines.length > 0
          ? currentNet -
            returnLines.reduce(
              (sum, line) =>
                sum +
                lineReturnAmountSatang({
                  lineAmountSatang: line.amountSatang,
                  lineQty: line.qty,
                  returnQty: line.returnQty,
                  alreadyReturnedQty: line.returnedQty,
                  alreadyCreditedSatang: line.creditedSatang,
                }),
              0,
            )
          : correctBaht.trim() === ""
            ? null
            : bahtStringToSatang(correctBaht);
      if (correctAmountSatang == null) return null;
      return quoteCreditNote({
        grandTotalSatang: selected.grandTotalSatang,
        invoiceVatSatang: selected.vatSatang,
        alreadyCreditedSatang: selected.alreadyCreditedSatang,
        alreadyCreditedVatSatang: selected.alreadyCreditedVatSatang,
        paidSatang: selected.paidSatang,
        balanceSatang: selected.balanceSatang,
        correctAmountSatang,
        allowRefund: refundCash,
      });
    } catch (err) {
      return { ok: false as const, message: err instanceof Error ? err.message : "ยอดที่ถูกต้องไม่ถูกต้อง" };
    }
  }, [correctBaht, refundCash, returnLines, selected]);

  if (invoices.length === 0) {
    return (
      <div className="space-y-4">
        <EmptyState
          title="ยังไม่มีบิลที่มียอดค้าง"
          hint="ใบที่ลดจนหมดมูลค่าแล้วจะไม่โชว์ในรายการนี้"
        />
        <RecentNotes branch={branch} recent={recent} />
      </div>
    );
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <form
        className="clinic-card space-y-3 p-5"
        onSubmit={(e) => {
          e.preventDefault();
          if (!selected || !quote?.ok) {
            setMsg(quote && !quote.ok ? quote.message : "เลือกบิลและใส่ยอดที่ถูกต้อง");
            return;
          }
          const reason = String(new FormData(e.currentTarget).get("reason") ?? "");
          start(async () => {
            if (
              !askToProceed(
                `ออกใบลดหนี้ ${formatSatangTh(quote.differenceSatang)} บาท จากบิล ${selected.number}? ยอดบนใบกำกับเดิมจะไม่เปลี่ยน`,
              )
            ) {
              return;
            }
            const res = await issueCreditNoteAction(branch, {
              invoiceId: selected.id,
              reasonCode,
              reason,
              correctAmountBaht: correctBaht,
              refundCash,
              lines: returnLines.map((line) => ({ invoiceLineId: line.id, qty: line.returnQty })),
            });
            if (!res.ok) setMsg(res.message);
            else router.push(`/${branch}/billing/credit-notes/${res.id}`);
          });
        }}
      >
        {msg ? <Notice>{msg}</Notice> : null}
        <Field label="บิลที่ออกแล้ว">
          <Select
            name="invoiceId"
            value={invoiceId}
            onChange={(e) => {
              setInvoiceId(e.target.value);
              setMsg(null);
            }}
          >
            {invoices.map((inv) => (
              <option key={inv.id} value={inv.id}>
                {inv.number} · {inv.ownerName} · ค้าง {formatSatangTh(inv.balanceSatang)}
              </option>
            ))}
          </Select>
        </Field>
        {selected ? (
          <dl className="grid gap-1 rounded-xl bg-cream px-3 py-3 text-sm text-stone-600">
            <div className="flex justify-between gap-3">
              <dt>ยอดตามใบกำกับ</dt>
              <dd className="tabular-nums">{formatSatangTh(selected.grandTotalSatang)} บาท</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt>ลดไปแล้ว</dt>
              <dd className="tabular-nums">{formatSatangTh(selected.alreadyCreditedSatang)} บาท</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt>ชำระแล้ว</dt>
              <dd className="tabular-nums">{formatSatangTh(selected.paidSatang)} บาท</dd>
            </div>
            <div className="flex justify-between gap-3 font-medium text-ink">
              <dt>ค้างชำระ</dt>
              <dd className="tabular-nums">{formatSatangTh(selected.balanceSatang)} บาท</dd>
            </div>
          </dl>
        ) : null}
        {selected && selected.lines.length > 0 ? (
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-ink">คืนเป็นรายการ (ไม่ใส่ก็ลดทั้งบิลจากยอดที่ถูกต้อง)</legend>
            {selected.lines.map((line) => (
              <Field
                key={line.id}
                label={`${line.description} · ${line.qty} ${line.unitName ?? ""} · ${formatSatangTh(line.amountSatang)} บาท`}
                hint={line.returnedQty !== "0" ? `คืนไปแล้ว ${line.returnedQty}` : "ใส่จำนวนที่คืน ถ้าว่างจะไม่ใช้บรรทัดนี้"}
              >
                <Input
                  inputMode="decimal"
                  aria-label={`จำนวนคืน ${line.description}`}
                  value={qtyByLine[line.id] ?? ""}
                  onChange={(e) => {
                    setQtyByLine((current) => ({ ...current, [line.id]: e.target.value }));
                    setMsg(null);
                  }}
                />
              </Field>
            ))}
          </fieldset>
        ) : null}
        <Field
          label="ยอดที่ถูกต้อง (บาท)"
          hint="ใช้เมื่อไม่ได้ใส่จำนวนคืนรายการ เป็นยอดสุทธิที่ควรเป็นหลังใบนี้"
        >
          <Input
            name="correctAmount"
            inputMode="decimal"
            value={correctBaht}
            onChange={(e) => {
              setCorrectBaht(e.target.value);
              setMsg(null);
            }}
            required={returnLines.length === 0}
            disabled={returnLines.length > 0}
          />
        </Field>
        {selected && selected.paidSatang > 0 ? (
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="mt-1"
              checked={refundCash}
              onChange={(e) => setRefundCash(e.target.checked)}
            />
            <span>คืนเงินสดส่วนที่จ่ายไปแล้ว ต้องเปิดกะอยู่ และต้องมีสิทธิ์คืนเงิน</span>
          </label>
        ) : null}
        <Field label="เหตุผล">
          <Select
            name="reasonCode"
            value={reasonCode}
            onChange={(e) => setReasonCode(e.target.value as (typeof CREDIT_REASON_CODES)[number])}
          >
            {CREDIT_REASON_CODES.map((code) => (
              <option key={code} value={code}>
                {CREDIT_REASON[code]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="รายละเอียด">
          <Input name="reason" required />
        </Field>
        {quote?.ok ? (
          <dl className="space-y-1 rounded-xl border border-stone-200 px-3 py-3 text-sm">
            <div className="flex justify-between">
              <dt>ส่วนต่างที่จะลด</dt>
              <dd className="font-semibold tabular-nums">{formatSatangTh(quote.differenceSatang)} บาท</dd>
            </div>
            <div className="flex justify-between">
              <dt>ภาษีขายที่ลด</dt>
              <dd className="tabular-nums">{formatSatangTh(quote.vatSatang)} บาท</dd>
            </div>
            <div className="flex justify-between">
              <dt>ลูกหนี้คงเหลือ</dt>
              <dd className="tabular-nums">{formatSatangTh(quote.newBalanceSatang)} บาท</dd>
            </div>
            {quote.refundSatang > 0 ? (
              <div className="flex justify-between font-medium">
                <dt>เงินสดที่คืน</dt>
                <dd className="tabular-nums">{formatSatangTh(quote.refundSatang)} บาท</dd>
              </div>
            ) : null}
          </dl>
        ) : quote ? (
          <Notice tone="warn">{quote.message}</Notice>
        ) : null}
        <Button type="submit" disabled={pending || !quote?.ok} className="w-full">
          {pending ? "กำลังออกใบลดหนี้…" : "ออกใบลดหนี้"}
        </Button>
      </form>
      <RecentNotes branch={branch} recent={recent} />
    </div>
  );
}

function RecentNotes({ branch, recent }: { branch: string; recent: RecentCreditNote[] }) {
  if (recent.length === 0) return null;
  return (
    <section className="clinic-card p-5">
      <h2 className="font-semibold">ใบลดหนี้ล่าสุด</h2>
      <ul className="mt-3 space-y-2 text-sm">
        {recent.map((note) => (
          <li key={note.id}>
            <Link href={`/${branch}/billing/credit-notes/${note.id}`} className="flex justify-between gap-2 hover:underline">
              <span>
                {note.number}
                <span className="block text-sm text-stone-500">อ้างอิง {note.invoiceNumber}</span>
              </span>
              <span className="tabular-nums">{formatSatangTh(note.differenceSatang)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
