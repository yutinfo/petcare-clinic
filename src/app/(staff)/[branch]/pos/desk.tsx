"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { OwnerPetPicker } from "@/components/staff/owner-pet-picker";
import { PAYMENT_METHOD } from "@/components/staff/labels";
import { askToProceed } from "@/components/staff/live";
import { EmptyState, Field, Notice } from "@/components/staff/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatSatangTh } from "@/modules/shared/money";
import type { ChargeView } from "@/modules/billing";
import { addPosLineAction, checkoutAction } from "./actions";

type Product = {
  id: string;
  name: string;
  defaultPriceSatang: number;
  baseUnit: string;
  qtyOnHand: string;
  requiresPrescription: boolean;
  type: string;
};

type Recent = {
  id: string;
  number: string;
  ownerName: string;
  grandTotalSatang: number;
};

export function PosDesk({
  branch,
  products,
  openCharges,
  recent,
  cashShiftOpen,
}: {
  branch: string;
  products: Product[];
  openCharges: ChargeView[];
  recent: Recent[];
  cashShiftOpen: boolean;
}) {
  const router = useRouter();
  const [ownerId, setOwnerId] = useState<string | null>(openCharges[0]?.ownerId ?? null);
  const [ownerName, setOwnerName] = useState(openCharges[0]?.ownerName ?? "");
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [filter, setFilter] = useState("");

  const visible = products.filter(
    (p) =>
      !p.requiresPrescription &&
      (filter.trim().length < 1 || p.name.toLowerCase().includes(filter.toLowerCase())),
  );
  const ownerCharges = useMemo(
    () => openCharges.filter((c) => !ownerId || c.ownerId === ownerId),
    [openCharges, ownerId],
  );
  const total = ownerCharges.reduce((s, c) => s + c.amountSatang, 0);

  const waitingOwners = useMemo(() => {
    const map = new Map<string, { name: string; total: number; count: number }>();
    for (const c of openCharges) {
      const cur = map.get(c.ownerId) ?? { name: c.ownerName ?? "ลูกค้า", total: 0, count: 0 };
      cur.total += c.amountSatang;
      cur.count += 1;
      map.set(c.ownerId, cur);
    }
    return [...map.entries()];
  }, [openCharges]);

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <section className="space-y-4">
        {!cashShiftOpen ? (
          <Notice tone="warn">
            ยังไม่เปิดกะเงินสด — รับเงินสดไม่ได้จนกว่าจะ{" "}
            <Link href={`/${branch}/billing`} className="underline">
              เปิดกะ
            </Link>
          </Notice>
        ) : null}
        <div className="clinic-card space-y-3 p-4">
          <p className="text-sm font-medium">เลือกลูกค้าก่อนคิดเงิน</p>
          <OwnerPetPicker
            branch={branch}
            mode="owner"
            placeholder="ค้นชื่อหรือเบอร์"
            selectedLabel={ownerName ? `กำลังคิดเงิน: ${ownerName}` : undefined}
            onPickOwner={(owner) => {
              setOwnerId(owner.id);
              setOwnerName(owner.displayName);
            }}
          />
          {waitingOwners.length > 0 ? (
            <div>
              <p className="mb-2 text-sm text-stone-500">ค้างชำระ</p>
              <div className="flex flex-wrap gap-2">
                {waitingOwners.map(([id, info]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => {
                      setOwnerId(id);
                      setOwnerName(info.name);
                    }}
                    className={`rounded-full px-3 py-1.5 text-sm ${
                      ownerId === id ? "bg-teal text-white" : "bg-cream text-ink hover:bg-sand"
                    }`}
                  >
                    {info.name} · {formatSatangTh(info.total)}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
        {!ownerId ? (
          <EmptyState title="ยังไม่ได้เลือกลูกค้า" hint="ค้นด้านบน หรือกดชื่อจากรายการค้างชำระ แล้วค่อยแตะสินค้า" />
        ) : (
          <>
            <Field label="ค้นสินค้า">
              <Input
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="ชื่อหรือบาร์โค้ด"
                aria-label="ค้นสินค้า"
              />
            </Field>
            {visible.length === 0 ? (
              <EmptyState title="ไม่พบสินค้าหน้าร้าน" hint="ยาที่ต้องมีใบสั่งจะไม่โชว์ที่นี่ — จ่ายที่ห้องยา" />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {visible.map((p) => {
                  const outOfStock = Number(p.qtyOnHand) <= 0;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      disabled={!ownerId || pending || outOfStock}
                      className="clinic-card p-4 text-left disabled:opacity-50"
                      onClick={() =>
                        start(async () => {
                          if (!ownerId || outOfStock) return;
                          const res = await addPosLineAction(branch, { ownerId, productId: p.id, qty: "1" });
                          if (!res.ok) setMsg(res.message);
                          else router.refresh();
                        })
                      }
                    >
                      <p className="font-medium">{p.name}</p>
                      <p className="mt-1 text-lg font-semibold tabular-nums text-teal">
                        {formatSatangTh(p.defaultPriceSatang)} บาท
                      </p>
                      <p className={`text-xs ${outOfStock ? "text-coral" : "text-stone-500"}`}>
                        {outOfStock ? "หมดสต็อก — รับของเข้าที่คลังก่อน" : `คงเหลือ ${p.qtyOnHand} ${p.baseUnit}`}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}
      </section>
      <aside className="space-y-4">
        <div className="clinic-card space-y-3 p-5">
          <h2 className="font-semibold">บิลนี้{ownerName ? ` · ${ownerName}` : ""}</h2>
          {msg ? <Notice>{msg}</Notice> : null}
          {ownerCharges.length === 0 ? (
            <p className="text-sm text-stone-400">ยังไม่มีรายการ — แตะสินค้าด้านซ้าย หรือปิดเคสจากห้องตรวจ</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {ownerCharges.map((c) => (
                <li key={c.id} className="flex justify-between gap-2">
                  <span>
                    {c.description}
                    {c.petName ? <span className="block text-[11px] text-stone-400">{c.petName}</span> : null}
                  </span>
                  <span className="tabular-nums">{formatSatangTh(c.amountSatang)}</span>
                </li>
              ))}
            </ul>
          )}
          <p className="border-t border-stone-100 pt-3 text-xl font-semibold tabular-nums">
            รวม {formatSatangTh(total)} บาท
          </p>
          <div className="grid gap-2">
            {(["CASH", "PROMPTPAY", "CREDIT_CARD"] as const).map((m) => (
              <Button
                key={m}
                variant={m === "CASH" ? "default" : "outline"}
                disabled={!ownerId || total === 0 || pending || (m === "CASH" && !cashShiftOpen)}
                onClick={() =>
                  start(async () => {
                    if (!ownerId) return;
                    if (
                      !askToProceed(
                        `รับชำระด้วย${PAYMENT_METHOD[m]} จำนวน ${formatSatangTh(total)} บาท จากคุณ ${ownerName}?`,
                      )
                    ) {
                      return;
                    }
                    const res = await checkoutAction(branch, ownerId, m);
                    if (res && !res.ok) setMsg(res.message);
                  })
                }
              >
                ชำระด้วย{PAYMENT_METHOD[m]}
              </Button>
            ))}
          </div>
        </div>
        {recent.length > 0 ? (
          <div className="clinic-card p-5">
            <h2 className="font-semibold">ใบเสร็จล่าสุด</h2>
            <ul className="mt-2 space-y-2 text-sm">
              {recent.slice(0, 6).map((inv) => (
                <li key={inv.id}>
                  <Link href={`/${branch}/pos?invoice=${inv.id}`} className="flex justify-between hover:underline">
                    <span>
                      {inv.number}
                      <span className="block text-[11px] text-stone-400">{inv.ownerName}</span>
                    </span>
                    <span className="tabular-nums">{formatSatangTh(inv.grandTotalSatang)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </aside>
    </div>
  );
}
