"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { loginStaffAction } from "./actions";

export function LoginForm({ from }: { from?: string }) {
  const [state, action, pending] = useActionState(loginStaffAction, undefined);

  return (
    <form action={action} className="space-y-4">
      {from ? <input type="hidden" name="from" value={from} /> : null}
      <label className="block space-y-1">
        <span className="text-sm font-medium">อีเมล</span>
        <Input name="email" type="email" autoComplete="username" autoFocus required defaultValue="nune@demo.local" />
      </label>
      <label className="block space-y-1">
        <span className="text-sm font-medium">รหัสผ่าน</span>
        <Input name="password" type="password" autoComplete="current-password" required defaultValue="demo1234" />
      </label>
      {state?.error ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">{state.error}</p>
      ) : null}
      <Button type="submit" className="h-12 w-full bg-teal-800 hover:bg-teal-700" disabled={pending}>
        {pending ? "กำลังเข้าสู่ระบบ…" : "เข้าสู่ระบบ"}
      </Button>
      <p className="text-center text-sm text-stone-500">
        เจ้าของสัตว์?{" "}
        <Link href="/portal/login" className="text-teal-800 underline">
          เข้าสู่ระบบด้วยเบอร์โทร
        </Link>
      </p>
    </form>
  );
}
