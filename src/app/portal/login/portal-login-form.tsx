"use client";

import { useActionState, useState, useTransition } from "react";
import Link from "next/link";
import { Field, Notice } from "@/components/staff/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { loginOwnerAction, requestOtpAction } from "./actions";

export function PortalLoginForm() {
  const [phone, setPhone] = useState("0812345678");
  const [hint, setHint] = useState<string | null>(null);
  const [pendingOtp, startOtp] = useTransition();
  const [state, action, pending] = useActionState(loginOwnerAction, undefined);

  return (
    <form action={action} className="space-y-4">
      <Field label="เบอร์โทร">
        <Input
          name="phone"
          inputMode="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
          autoComplete="tel"
        />
      </Field>
      <Field label="รหัส 6 หลัก">
        <Input name="otp" inputMode="numeric" maxLength={6} required autoComplete="one-time-code" />
      </Field>
      {hint ? <Notice tone="ok">{hint}</Notice> : null}
      {state?.error ? <Notice>{state.error}</Notice> : null}
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          className="h-12 flex-1"
          disabled={pendingOtp}
          onClick={() =>
            startOtp(async () => {
              const res = await requestOtpAction(phone);
              if (!res.ok) setHint(res.message);
              else if ("devOtp" in res && res.devOtp) setHint(`รหัสสำหรับทดลอง: ${res.devOtp}`);
              else setHint("ถ้าเบอร์นี้มีในระบบ เราได้ส่งรหัสแล้ว");
            })
          }
        >
          ขอรหัส
        </Button>
        <Button type="submit" className="h-12 flex-1" disabled={pending}>
          เข้าสู่ระบบ
        </Button>
      </div>
      <p className="rounded-2xl bg-cream px-3 py-2 text-xs text-stone-500">
        คลินิกตัวอย่าง: เบอร์ 0812345678 แล้วกดขอรหัส
      </p>
      <p className="text-center text-sm text-stone-500">
        พนักงานคลินิก?{" "}
        <Link href="/login" className="text-teal underline-offset-2 hover:underline">
          เข้าด้วยอีเมล
        </Link>
      </p>
    </form>
  );
}
