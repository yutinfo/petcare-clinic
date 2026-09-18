"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { bangkokBusinessDate } from "@/modules/shared/date";
import { EmptyState, Field, Notice } from "@/components/staff/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { receiveAction } from "./actions";

type Stock = {
  productId: string;
  productName: string;
  productCode: string;
  baseUnit: string;
  lotNo: string;
  expiryDate: string | null;
  qtyBase: string;
};

type Product = { id: string; name: string; code: string };

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function InventoryDesk({
  branch,
  stock,
  products,
}: {
  branch: string;
  stock: Stock[];
  products: Product[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const today = bangkokBusinessDate();
  const soon = addDays(today, 30);

  const rows = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return stock.filter(
      (s) =>
        q.length < 1 ||
        s.productName.toLowerCase().includes(q) ||
        s.productCode.toLowerCase().includes(q) ||
        s.lotNo.toLowerCase().includes(q),
    );
  }, [filter, stock]);

  return (
    <div className="grid gap-5 lg:grid-cols-[20rem_minmax(0,1fr)]">
      <form
        className="clinic-card space-y-3 p-5"
        onSubmit={(e) => {
          e.preventDefault();
          const data = new FormData(e.currentTarget);
          start(async () => {
            const res = await receiveAction(branch, {
              productId: String(data.get("productId")),
              qty: String(data.get("qty")),
              lotNo: String(data.get("lotNo")),
              expiryDate: String(data.get("expiryDate") || "") || undefined,
            });
            if (!res.ok) {
              setOk(null);
              setMsg(res.message);
            } else {
              setMsg(null);
              setOk(`รับเข้าแล้ว ${res.number}`);
              router.refresh();
            }
          });
        }}
      >
        <h2 className="font-semibold">รับของเข้าล็อต</h2>
        {msg ? <Notice>{msg}</Notice> : null}
        {ok ? <Notice tone="ok">{ok}</Notice> : null}
        <Field label="สินค้า">
          <Select name="productId" required>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="จำนวน (หน่วยฐาน)">
          <Input name="qty" placeholder="เช่น 100" required />
        </Field>
        <Field label="เลขล็อต">
          <Input name="lotNo" required />
        </Field>
        <Field label="วันหมดอายุ">
          <Input name="expiryDate" type="date" />
        </Field>
        <Button type="submit" disabled={pending} className="w-full">
          บันทึกรับเข้า
        </Button>
      </form>
      <div className="space-y-3">
        <Input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="ค้นชื่อยา / รหัส / ล็อต" />
        <div className="clinic-card overflow-x-auto p-2">
          {rows.length === 0 ? (
            <EmptyState title="ยังไม่มีสต็อก" hint="รับของเข้าทางซ้าย แล้วยอดจะโชว์ตามล็อต" />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-stone-400">
                  <th className="p-3">สินค้า</th>
                  <th>ล็อต</th>
                  <th>หมดอายุ</th>
                  <th className="text-right">คงเหลือ</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((s) => {
                  const expired = s.expiryDate !== null && s.expiryDate < today;
                  const warning = s.expiryDate !== null && !expired && s.expiryDate <= soon;
                  return (
                    <tr key={`${s.productId}-${s.lotNo}`} className="border-t border-stone-100">
                      <td className="p-3">
                        <span className="font-medium">{s.productName}</span>
                        <span className="block text-xs text-stone-400">{s.productCode}</span>
                      </td>
                      <td>{s.lotNo}</td>
                      <td className={expired ? "font-medium text-rose-700" : warning ? "text-amber-700" : ""}>
                        {s.expiryDate ?? "—"}
                        {expired ? " · หมดอายุ" : warning ? " · ใกล้หมด" : ""}
                      </td>
                      <td className="text-right font-medium tabular-nums">
                        {s.qtyBase} {s.baseUnit}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
