"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { OwnerPetPicker } from "@/components/staff/owner-pet-picker";
import { BOOKING_STATUS, BOOKING_TYPE } from "@/components/staff/labels";
import { DateTimeField, askToProceed } from "@/components/staff/live";
import { EmptyState, Field, Notice, StatusBadge } from "@/components/staff/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { formatThaiDateTime } from "@/modules/shared/date";
import { cancelBookingAction, createBookingAction } from "./actions";

type Row = {
  id: string;
  code: string;
  type: string;
  status: string;
  startAt: string;
  ownerName: string;
  petName: string | null;
  requestedNote: string | null;
};

export function AppointmentDesk({ branch, rows }: { branch: string; rows: Row[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [petId, setPetId] = useState<string | null>(null);
  const [label, setLabel] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div className="grid gap-5 lg:grid-cols-[22rem_minmax(0,1fr)]">
      <form
        className="clinic-card space-y-3 p-5"
        onSubmit={(e) => {
          e.preventDefault();
          if (!ownerId) {
            setMsg("เลือกลูกค้าก่อน");
            return;
          }
          const data = new FormData(e.currentTarget);
          start(async () => {
            const res = await createBookingAction(branch, {
              ownerId,
              petId: petId ?? undefined,
              type: String(data.get("type")) as "CONSULT" | "VACCINE" | "GROOMING" | "FOLLOW_UP",
              startAt: String(data.get("startAt")),
              note: String(data.get("note") || ""),
            });
            if (!res.ok) setMsg(res.message);
            else {
              setMsg(null);
              router.refresh();
            }
          });
        }}
      >
        <h2 className="font-semibold">จองนัดใหม่</h2>
        {msg ? <Notice>{msg}</Notice> : null}
        <OwnerPetPicker
          branch={branch}
          mode="pet"
          placeholder="ค้นลูกค้าหรือชื่อสัตว์"
          selectedLabel={label || undefined}
          onPickPet={(owner, pet) => {
            setOwnerId(owner.id);
            setPetId(pet.id);
            setLabel(`${owner.displayName} · ${pet.name}`);
          }}
          onPickOwner={(owner) => {
            setOwnerId(owner.id);
            if (!petId) setLabel(owner.displayName);
          }}
        />
        <Field label="ประเภท">
          <Select name="type" defaultValue="CONSULT">
            <option value="CONSULT">ตรวจรักษา</option>
            <option value="VACCINE">วัคซีน</option>
            <option value="GROOMING">อาบน้ำตัดขน</option>
            <option value="FOLLOW_UP">ติดตามผล</option>
          </Select>
        </Field>
        <DateTimeField name="startAt" label="วันและเวลา" defaultTo="soon" />
        <Field label="หมายเหตุ">
          <Input name="note" placeholder="เช่น มาตามนัดวัคซีนปีสอง" />
        </Field>
        <Button type="submit" disabled={pending || !ownerId} className="w-full">
          บันทึกนัด
        </Button>
      </form>
      <ul className="space-y-2">
        {rows.length === 0 ? (
          <EmptyState title="วันนี้ยังไม่มีนัด" hint="จองทางซ้าย หรือรอคำขอจากพอร์ทัลเจ้าของสัตว์" />
        ) : null}
        {rows.map((b) => (
          <li key={b.id} className="clinic-card flex items-start justify-between gap-3 p-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xs text-stone-400">{b.code}</p>
                <StatusBadge value={b.type} map={BOOKING_TYPE} />
                <StatusBadge value={b.status} map={BOOKING_STATUS} />
              </div>
              <p className="mt-1 font-medium">
                {b.petName ?? "—"} · {b.ownerName}
              </p>
              <p className="text-sm text-stone-500">{formatThaiDateTime(new Date(b.startAt))}</p>
              {b.requestedNote ? <p className="mt-1 text-sm text-stone-500">{b.requestedNote}</p> : null}
            </div>
            {b.status === "CONFIRMED" || b.status === "REQUESTED" ? (
              <Button
                size="sm"
                variant="ghost"
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    if (!askToProceed(`ยกเลิกนัด ${b.petName ?? b.ownerName}?`)) return;
                    await cancelBookingAction(branch, b.id);
                    router.refresh();
                  })
                }
              >
                ยกเลิก
              </Button>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
