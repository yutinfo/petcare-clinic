"use client";

import { useActionState, useState, useTransition } from "react";
import Link from "next/link";
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
      <label className="block space-y-1">
        <span className="text-sm font-medium">เบอร์โทร</span>
        <Input
          name="phone"
          inputMode="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
        />
      </label>
      <label className="block space-y-1">
        <span className="text-sm font-medium">รหัส OTP</span>
        <Input name="otp" inputMode="numeric" maxLength={6} required />
      </label>
      {hint ? <p className="text-sm text-teal-800">{hint}</p> : null}
      {state?.error ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">{state.error}</p>
      ) : null}
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
        <Button type="submit" className="h-12 flex-1 bg-teal-800 hover:bg-teal-700" disabled={pending}>
          เข้าสู่ระบบ
        </Button>
      </div>
      <p className="text-center text-sm text-stone-500">
        พนักงานคลินิก?{" "}
        <Link href="/login" className="text-teal-800 underline">
          เข้าสู่ระบบด้วยอีเมล
        </Link>
      </p>
    </form>
  );
}
