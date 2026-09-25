"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("portal");
  const types = useTranslations("enum.BookingType");
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
            setMsg(t("booked", { code: res.code }));
            router.refresh();
          }
        });
      }}
    >
      <h2 className="font-semibold">{t("bookTitle")}</h2>
      <p className="text-sm text-stone-500">{t("bookHint")}</p>
      {err ? <Notice>{err}</Notice> : null}
      {msg ? <Notice tone="ok">{msg}</Notice> : null}
      <Field label={t("pet")}>
        <Select name="petId">
          {pets.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label={t("bookType")}>
        <Select name="type" defaultValue="GROOMING">
          <option value="GROOMING">{types("GROOMING")}</option>
          <option value="CONSULT">{types("CONSULT")}</option>
          <option value="VACCINE">{types("VACCINE")}</option>
        </Select>
      </Field>
      <DateTimeField name="startAt" label={t("when")} defaultTo="soon" />
      <Field label={t("note")}>
        <Input name="note" placeholder={t("notePlaceholder")} />
      </Field>
      <Button type="submit" disabled={pending || pets.length === 0} className="w-full">
        {t("submitBooking")}
      </Button>
    </form>
  );
}
