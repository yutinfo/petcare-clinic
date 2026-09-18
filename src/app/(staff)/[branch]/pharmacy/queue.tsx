"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RX_STATUS } from "@/components/staff/labels";
import { AlertChip, EmptyState, Notice, StatusBadge } from "@/components/staff/ui";
import { Button } from "@/components/ui/button";
import type { listPendingPrescriptions } from "@/modules/pharmacy";
import { dispenseAction } from "./actions";

type Row = Awaited<ReturnType<typeof listPendingPrescriptions>>[number];

export function PharmacyQueue({ branch, rows }: { branch: string; rows: Row[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [label, setLabel] = useState<
    (Row & { lots?: { lotNo: string; qty: string; expiryDate: string | null }[] }) | null
  >(null);

  return (
    <div className="space-y-4">
      {msg ? <div className="no-print"><Notice>{msg}</Notice></div> : null}
      {rows.length === 0 && !label ? (
        <EmptyState title="ไม่มีใบสั่งรอจ่าย" hint="เมื่อหมอสั่งยาจากห้องตรวจ คิวจะมาโชว์ที่นี่" />
      ) : (
        <ul className="no-print grid gap-3">
          {rows.map((rx) => (
            <li key={rx.id} className="clinic-card flex flex-wrap items-start justify-between gap-4 p-5">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-xs text-stone-400">{rx.encounterNumber}</p>
                  <StatusBadge value={rx.status} map={RX_STATUS} />
                </div>
                <h2 className="text-lg font-semibold">
                  {rx.petName} <span className="text-sm font-normal text-stone-500">{rx.speciesNameTh}</span>
                </h2>
                <p className="text-sm text-stone-500">{rx.ownerName}</p>
                <p className="mt-2 font-medium text-teal">{rx.productName}</p>
                <p className="text-sm">{rx.instructionTh}</p>
                <p className="text-xs text-stone-400">
                  ต้องจ่ายอีก {rx.remainingQty} จาก {rx.totalQtyBase} {rx.doseUnit}
                </p>
                <div className="mt-2">
                  <AlertChip labels={rx.alerts.map((a) => a.label)} />
                </div>
              </div>
              <Button
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    const res = await dispenseAction(branch, rx.id);
                    if (!res.ok) setMsg(res.message);
                    else {
                      setLabel({ ...rx, lots: res.lots });
                      router.refresh();
                    }
                  })
                }
              >
                จ่ายยา (หมดอายุก่อน)
              </Button>
            </li>
          ))}
        </ul>
      )}
      {label ? (
        <div className="clinic-card print-sheet mx-auto max-w-md p-6 text-sm">
          <p className="text-center text-xs text-teal">ฉลากยา · 50×30 mm</p>
          <h3 className="mt-2 text-center font-semibold">คลินิกรักสัตว์ สาขาสุขุมวิท</h3>
          <p className="mt-3">
            ชื่อสัตว์: {label.petName} ({label.speciesNameTh})
          </p>
          <p>เจ้าของ: {label.ownerName}</p>
          <hr className="my-3 border-stone-200" />
          <p className="font-medium">{label.productName}</p>
          <p>{label.instructionTh}</p>
          {label.lots?.map((l) => (
            <p key={l.lotNo} className="text-xs text-stone-500">
              ล็อต {l.lotNo} × {l.qty}
              {l.expiryDate ? ` · หมดอายุ ${l.expiryDate}` : ""}
            </p>
          ))}
          <p className="mt-3 text-xs text-rose-700">กินยาให้ครบแม้อาการดีขึ้นแล้ว</p>
          <Button type="button" variant="outline" className="no-print mt-4 w-full" onClick={() => window.print()}>
            พิมพ์ฉลาก
          </Button>
        </div>
      ) : null}
    </div>
  );
}
