"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { bangkokTomorrowAt, datetimeLocalValue } from "@/modules/shared/date";
import { waitMinutes } from "./labels";
import { Field } from "./ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function WaitMinutes({
  iso,
  prefix = "รอ ",
  className,
}: {
  iso: string;
  prefix?: string;
  className?: string;
}) {
  const [mins, setMins] = useState(() => waitMinutes(iso));
  useEffect(() => {
    const tick = () => setMins(waitMinutes(iso));
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, [iso]);
  return (
    <span className={cn(mins >= 20 ? "font-medium text-rose-700" : className)}>
      {prefix}
      {mins} นาที
    </span>
  );
}

export function RefreshButton({ label = "รีเฟรช" }: { label?: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button type="button" variant="outline" disabled={pending} onClick={() => start(() => router.refresh())}>
      {pending ? "กำลังโหลด…" : label}
    </Button>
  );
}

export function askToProceed(message: string): boolean {
  return window.confirm(message);
}

export function DateTimeField({
  name,
  label,
  defaultTo,
}: {
  name: string;
  label: string;
  defaultTo: "soon" | "tomorrow-evening";
}) {
  const [value, setValue] = useState("");
  useEffect(() => {
    setValue(
      defaultTo === "tomorrow-evening"
        ? bangkokTomorrowAt(18)
        : datetimeLocalValue(new Date(Date.now() + 30 * 60_000)),
    );
  }, [defaultTo]);
  return (
    <Field label={label}>
      <Input name={name} type="datetime-local" required value={value} onChange={(e) => setValue(e.target.value)} />
    </Field>
  );
}
