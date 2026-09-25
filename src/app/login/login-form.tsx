"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, Notice } from "@/components/staff/ui";
import { loginStaffAction } from "./actions";

const DEMO = [
  { email: "nune@demo.local", labelKey: "demoNune" },
  { email: "ek@demo.local", labelKey: "demoEk" },
  { email: "jo@demo.local", labelKey: "demoJo" },
  { email: "ann@demo.local", labelKey: "demoAnn" },
] as const;

export function LoginForm({ from }: { from?: string }) {
  const t = useTranslations("login");
  const [state, action, pending] = useActionState(loginStaffAction, undefined);
  const [email, setEmail] = useState("nune@demo.local");

  return (
    <form action={action} className="space-y-4">
      {from ? <input type="hidden" name="from" value={from} /> : null}
      <Field label={t("email")}>
        <Input
          name="email"
          type="email"
          autoComplete="username"
          autoFocus
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </Field>
      <Field label={t("password")}>
        <Input name="password" type="password" autoComplete="current-password" required defaultValue="demo1234" />
      </Field>
      {state?.error ? <Notice>{state.error}</Notice> : null}
      <Button type="submit" className="h-12 w-full" disabled={pending}>
        {pending ? t("pending") : t("submit")}
      </Button>
      <div className="rounded-2xl bg-cream px-3 py-3">
        <p className="text-sm text-stone-500">{t("demoHint")}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {DEMO.map((d) => (
            <button
              key={d.email}
              type="button"
              onClick={() => setEmail(d.email)}
              className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-ink shadow-sm hover:bg-sand"
            >
              {t(d.labelKey)}
            </button>
          ))}
        </div>
      </div>
      <p className="text-center text-sm text-stone-500">
        {t("ownerPrompt")}{" "}
        <Link href="/portal/login" className="text-teal underline-offset-2 hover:underline">
          {t("ownerLink")}
        </Link>
      </p>
    </form>
  );
}
