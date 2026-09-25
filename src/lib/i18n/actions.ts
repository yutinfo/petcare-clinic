"use server";

import { cookies } from "next/headers";
import { resolveLocale, type AppLocale } from "./locale";

export async function setLocaleAction(locale: AppLocale) {
  const next = resolveLocale(locale);
  (await cookies()).set("pc_locale", next, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
}
