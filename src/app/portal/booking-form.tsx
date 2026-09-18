"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { DateTimeField } from "@/components/staff/live";
import { Field, Notice } from "@/components/staff/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { requestBookingAction } from "./actions";

export function PortalBookingForm({ pets }: { pets: { id: string; name: string }[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  return (
    <form
      className="clinic-card space-y-3 p-5"
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        start(async () => {
          const res = await requestBookingAction({
            petId: String(data.get("petId")),
            type: String(data.get("type")) as "CONSULT" | "GROOMING" | "VACCINE",
            startAt: String(data.get("startAt")),
            note: String(data.get("note") || ""),
          });
          if (!res.ok) {
            setMsg(null);
            setErr(res.message);
          } else {
            setErr(null);
            setMsg(`ส่งคำขอแล้ว ${res.code} — คลินิกจะยืนยันให้`);
            router.refresh();
          }
        });
      }}
    >
      <h2 className="font-semibold">จองคิวออนไลน์</h2>
      <p className="text-sm text-stone-500">เลือกสัตว์ ประเภทบริการ และเวลาที่สะดวก คำขอจะรอคลินิกอนุมัติ</p>
      {err ? <Notice>{err}</Notice> : null}
      {msg ? <Notice tone="ok">{msg}</Notice> : null}
      <Field label="สัตว์">
        <Select name="petId">
          {pets.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="ต้องการจอง">
        <Select name="type" defaultValue="GROOMING">
          <option value="GROOMING">อาบน้ำตัดขน</option>
          <option value="CONSULT">ตรวจรักษา</option>
          <option value="VACCINE">วัคซีน</option>
        </Select>
      </Field>
      <DateTimeField name="startAt" label="วันและเวลา" defaultTo="soon" />
      <Field label="ข้อความถึงคลินิก">
        <Input name="note" placeholder="เช่น ตัดสั้น เบอร์ 4" />
      </Field>
      <Button type="submit" disabled={pending || pets.length === 0} className="w-full">
        ส่งคำขอจอง
      </Button>
    </form>
  );
}
