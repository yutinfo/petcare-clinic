"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { OwnerPetPicker } from "@/components/staff/owner-pet-picker";
import { CARE_LOG, KENNEL_SIZE, labelOf } from "@/components/staff/labels";
import { DateTimeField, askToProceed } from "@/components/staff/live";
import { EmptyState, Notice } from "@/components/staff/ui";
import { Button } from "@/components/ui/button";
import { formatThaiDateTime } from "@/modules/shared/date";
import { billNightsAction, boardCheckInAction, boardCheckOutAction, careLogAction } from "./actions";

type Kennel = {
  id: string;
  code: string;
  name: string;
  size: string | null;
  zone: string | null;
  colorHex: string | null;
  stay: {
    id: string;
    code: string;
    status: string;
    petName: string;
    speciesNameTh: string;
    ownerName: string;
    expectedOutAt: string;
  } | null;
};

const CARE = ["FEED", "WATER", "WALK", "OBSERVATION"] as const;

export function KennelMap({ branch, kennels }: { branch: string; kennels: Kennel[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [selected, setSelected] = useState<string | null>(null);
  const [petId, setPetId] = useState<string | null>(null);
  const [petLabel, setPetLabel] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const kennel = kennels.find((k) => k.id === selected);

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
      {kennels.length === 0 ? (
        <EmptyState title="ยังไม่มีกรงในสาขานี้" hint="ตั้งค่ากรงในข้อมูลสาขาก่อนรับฝาก" />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {kennels.map((k) => (
            <button
              key={k.id}
              type="button"
              onClick={() => {
                setSelected(k.id);
                setMsg(null);
                setOk(null);
                setPetId(null);
                setPetLabel("");
              }}
              className={`clinic-card p-4 text-left ${selected === k.id ? "ring-2 ring-sky-400" : ""}`}
              style={{ borderTop: `6px solid ${k.colorHex ?? "#14b8a6"}` }}
            >
              <p className="text-xs text-stone-400">
                {k.zone} · {labelOf(KENNEL_SIZE, k.size)}
              </p>
              <p className="font-semibold">{k.name}</p>
              {k.stay ? (
                <p className="mt-2 text-sm">
                  {k.stay.petName} <span className="text-stone-500">{k.stay.ownerName}</span>
                </p>
              ) : (
                <p className="mt-2 text-sm text-emerald-700">ว่าง</p>
              )}
            </button>
          ))}
        </div>
      )}
      <aside className="clinic-card space-y-3 p-5">
        {msg ? <Notice>{msg}</Notice> : null}
        {ok ? <Notice tone="ok">{ok}</Notice> : null}
        {!kennel ? <p className="text-sm text-stone-500">เลือกกรงทางซ้ายเพื่อรับฝาก หรือดูแลสัตว์ที่อยู่</p> : null}
        {kennel && !kennel.stay ? (
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (!petId) {
                setMsg("เลือกสัตว์ก่อน");
                return;
              }
              const data = new FormData(e.currentTarget);
              start(async () => {
                const res = await boardCheckInAction(branch, {
                  petId,
                  kennelResourceId: kennel.id,
                  expectedOutAt: String(data.get("expectedOutAt")),
                  vaccineVerified: true,
                });
                if (!res.ok) setMsg(res.message);
                else {
                  setOk("รับฝากแล้ว");
                  router.refresh();
                }
              });
            }}
          >
            <h2 className="font-semibold">เช็คอิน {kennel.name}</h2>
            <OwnerPetPicker
              branch={branch}
              mode="pet"
              placeholder="ค้นชื่อสัตว์หรือเบอร์เจ้าของ"
              selectedLabel={petLabel || undefined}
              onPickPet={(owner, pet) => {
                setPetId(pet.id);
                setPetLabel(`${pet.name} · ${owner.displayName}`);
              }}
            />
            <DateTimeField name="expectedOutAt" label="กำหนดรับกลับ" defaultTo="tomorrow-evening" />
            <Button type="submit" disabled={pending || !petId} className="w-full">
              รับฝาก
            </Button>
          </form>
        ) : null}
        {kennel?.stay ? (
          <div className="space-y-3">
            <div>
              <p className="text-xs text-stone-400">{kennel.stay.code}</p>
              <h2 className="font-semibold">{kennel.stay.petName}</h2>
              <p className="text-sm text-stone-500">{kennel.stay.ownerName}</p>
              <p className="text-xs text-stone-400">
                กำหนดรับ {formatThaiDateTime(new Date(kennel.stay.expectedOutAt))}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {CARE.map((t) => (
                <Button
                  key={t}
                  size="sm"
                  variant="outline"
                  disabled={pending}
                  onClick={() =>
                    start(async () => {
                      const res = await careLogAction(branch, kennel.stay!.id, t);
                      if (!res.ok) setMsg(res.message);
                      else {
                        setOk(`บันทึก${CARE_LOG[t]}แล้ว`);
                        router.refresh();
                      }
                    })
                  }
                >
                  {CARE_LOG[t]}
                </Button>
              ))}
            </div>
            <Button
              variant="outline"
              className="w-full"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const res = await billNightsAction(branch, kennel.stay!.id);
                  if (!res.ok) setMsg(res.message);
                  else setOk(`คิดค่าห้อง ${res.billedDates.length} คืน (กดซ้ำยอดไม่เพิ่ม)`);
                })
              }
            >
              คิดค่าห้องวันนี้
            </Button>
            <Button
              variant="coral"
              className="w-full"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  if (!askToProceed(`เช็คเอาท์ ${kennel.stay!.petName} และคิดค่าห้องทั้งหมด?`)) return;
                  const res = await boardCheckOutAction(branch, kennel.stay!.id);
                  if (!res.ok) setMsg(res.message);
                  else {
                    setSelected(null);
                    router.refresh();
                  }
                })
              }
            >
              เช็คเอาท์ + คิดค่าห้อง
            </Button>
          </div>
        ) : null}
      </aside>
    </div>
  );
}
