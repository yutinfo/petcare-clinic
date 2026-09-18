"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { OwnerPetPicker } from "@/components/staff/owner-pet-picker";
import { GROOMING_STATUS } from "@/components/staff/labels";
import { askToProceed } from "@/components/staff/live";
import { EmptyState, Field, Notice, StatusBadge } from "@/components/staff/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { startGroomAction, setGroomStatusAction } from "./actions";

type Row = {
  id: string;
  code: string;
  status: string;
  petName: string;
  speciesNameTh: string;
  ownerName: string;
  groomerName: string;
  styleNote: string | null;
};

const NEXT: Record<string, { label: string; status: "IN_PROGRESS" | "DRYING" | "READY_FOR_PICKUP" | "COMPLETED" }> = {
  SCHEDULED: { label: "เริ่มทำ", status: "IN_PROGRESS" },
  CHECKED_IN: { label: "เริ่มทำ", status: "IN_PROGRESS" },
  IN_PROGRESS: { label: "เป่าแห้งแล้ว", status: "DRYING" },
  DRYING: { label: "รอเจ้าของมารับ", status: "READY_FOR_PICKUP" },
  READY_FOR_PICKUP: { label: "ส่งมอบ (คิดเงิน)", status: "COMPLETED" },
};

const COLS: { key: string; title: string; also: string[] }[] = [
  { key: "SCHEDULED", title: "รอเริ่ม", also: ["CHECKED_IN"] },
  { key: "IN_PROGRESS", title: "กำลังทำ", also: [] },
  { key: "DRYING", title: "เป่าแห้ง", also: [] },
  { key: "READY_FOR_PICKUP", title: "รอรับ", also: [] },
];

export function GroomingDesk({ branch, rows }: { branch: string; rows: Row[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [petId, setPetId] = useState<string | null>(null);
  const [petLabel, setPetLabel] = useState("");
  const [style, setStyle] = useState("");

  return (
    <div className="space-y-4">
      <form
        className="clinic-card space-y-3 p-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!petId) {
            setMsg("เลือกสัตว์ก่อนเปิดคิว");
            return;
          }
          start(async () => {
            const res = await startGroomAction(branch, petId, style);
            if (!res.ok) setMsg(res.message);
            else {
              setMsg(null);
              setPetId(null);
              setPetLabel("");
              setStyle("");
              router.refresh();
            }
          });
        }}
      >
        <h2 className="font-semibold">เปิดคิวใหม่</h2>
        {msg ? <Notice>{msg}</Notice> : null}
        <OwnerPetPicker
          branch={branch}
          mode="pet"
          placeholder="ค้นสัตว์เพื่อเปิดคิว"
          selectedLabel={petLabel || undefined}
          onPickPet={(owner, pet) => {
            setPetId(pet.id);
            setPetLabel(`${pet.name} · ${owner.displayName}`);
          }}
        />
        <Field label="สไตล์ตัด / เบอร์ปัตตาเลี่ยน">
          <Input value={style} onChange={(e) => setStyle(e.target.value)} placeholder="เช่น เบอร์ 4 หลังสั้น" />
        </Field>
        <Button type="submit" disabled={pending || !petId}>
          เปิดคิว
        </Button>
      </form>

      {rows.length === 0 ? (
        <EmptyState title="ยังไม่มีคิววันนี้" hint="ค้นสัตว์ด้านบนแล้วกดเปิดคิว" />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {COLS.map((col) => {
            const items = rows.filter((r) => r.status === col.key || col.also.includes(r.status));
            return (
              <section key={col.key} className="space-y-2">
                <h2 className="font-semibold">
                  {col.title} <span className="text-sm font-normal text-stone-400">{items.length}</span>
                </h2>
                {items.length === 0 ? <p className="text-sm text-stone-400">ว่าง</p> : null}
                {items.map((j) => (
                  <article key={j.id} className="clinic-card p-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs text-stone-400">
                        {j.code} · {j.groomerName}
                      </p>
                      <StatusBadge value={j.status} map={GROOMING_STATUS} />
                    </div>
                    <h3 className="mt-1 text-lg font-semibold">
                      {j.petName} <span className="text-sm font-normal text-stone-500">{j.speciesNameTh}</span>
                    </h3>
                    <p className="text-sm text-stone-500">{j.ownerName}</p>
                    {j.styleNote ? <p className="mt-2 rounded-xl bg-rose-50 px-3 py-2 text-sm">{j.styleNote}</p> : null}
                    {NEXT[j.status] ? (
                      <Button
                        className="mt-3 w-full"
                        size="sm"
                        disabled={pending}
                        onClick={() =>
                          start(async () => {
                            const next = NEXT[j.status]!;
                            if (
                              next.status === "COMPLETED" &&
                              !askToProceed(`ส่งมอบ ${j.petName} และคิดเงินอาบน้ำตัดขน?`)
                            ) {
                              return;
                            }
                            const res = await setGroomStatusAction(branch, j.id, next.status);
                            if (res && !res.ok) setMsg(res.message);
                            else router.refresh();
                          })
                        }
                      >
                        {NEXT[j.status]!.label}
                      </Button>
                    ) : null}
                  </article>
                ))}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
