"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { askToProceed } from "@/components/staff/live";
import { Field, Notice } from "@/components/staff/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatSatangTh } from "@/modules/shared/money";
import type { ShiftView } from "@/modules/billing";
import { closeShiftAction, openShiftAction } from "./actions";

export function ShiftDesk({ branch, shift }: { branch: string; shift: ShiftView | null }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  if (!shift) {
    return (
      <form
        className="clinic-card max-w-md space-y-3 p-5"
        onSubmit={(e) => {
          e.preventDefault();
          const data = new FormData(e.currentTarget);
          start(async () => {
            const res = await openShiftAction(branch, String(data.get("openingFloat") ?? "0"));
            if (!res.ok) setMsg(res.message);
            else {
              setOk("เปิดกะแล้ว");
              router.refresh();
            }
          });
        }}
      >
        {msg ? <Notice>{msg}</Notice> : null}
        <p className="text-sm text-stone-500">ต้องเปิดกะก่อนรับเงินสดที่หน้าร้านหรือห้องตรวจ</p>
        <Field label="เงินทอนตั้งต้น (บาท)">
          <Input name="openingFloat" defaultValue="0" inputMode="decimal" required />
        </Field>
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "กำลังเปิดกะ…" : "เปิดกะ"}
        </Button>
      </form>
    );
  }

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <dl className="clinic-card space-y-3 p-5 text-sm">
        <div className="flex justify-between">
          <dt className="text-stone-500">เงินทอนตั้งต้น</dt>
          <dd className="tabular-nums">{formatSatangTh(shift.openingFloatSatang)} บาท</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-stone-500">เงินสดรับในกะนี้</dt>
          <dd className="tabular-nums">{formatSatangTh(shift.cashReceivedSatang)} บาท</dd>
        </div>
        <div className="flex justify-between text-base font-semibold">
          <dt>ยอดที่ควรมี</dt>
          <dd className="tabular-nums">{formatSatangTh(shift.expectedCashSatang)} บาท</dd>
        </div>
      </dl>
      <form
        className="clinic-card space-y-3 p-5"
        onSubmit={(e) => {
          e.preventDefault();
          const data = new FormData(e.currentTarget);
          const counted = String(data.get("counted") ?? "");
          const note = String(data.get("note") ?? "");
          start(async () => {
            if (!askToProceed("ปิดกะนี้แล้วจะรับเงินสดต่อไม่ได้จนกว่าจะเปิดกะใหม่ ดำเนินการต่อ?")) return;
            const res = await closeShiftAction(branch, counted, note);
            if (!res.ok) setMsg(res.message);
            else {
              setOk(
                res.varianceSatang === 0
                  ? "ปิดกะแล้ว ยอดตรง"
                  : `ปิดกะแล้ว ผลต่าง ${formatSatangTh(res.varianceSatang)} บาท`,
              );
              router.refresh();
            }
          });
        }}
      >
        {msg ? <Notice>{msg}</Notice> : null}
        {ok ? <Notice tone="ok">{ok}</Notice> : null}
        <Field label="นับเงินในลิ้นชักได้ (บาท)">
          <Input name="counted" inputMode="decimal" required />
        </Field>
        <Field label="หมายเหตุผลต่าง" hint="ถ้าไม่ตรงกับยอดที่ควรมี ต้องระบุเหตุผล และต้องมีสิทธิ์อนุมัติ">
          <Input name="note" />
        </Field>
        <Button type="submit" variant="coral" disabled={pending} className="w-full">
          {pending ? "กำลังปิดกะ…" : "ปิดกะ"}
        </Button>
      </form>
    </div>
  );
}
