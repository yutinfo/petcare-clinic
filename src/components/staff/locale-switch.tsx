"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { setLocaleAction } from "@/lib/i18n/actions";
import type { AppLocale } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";

export function LocaleSwitch() {
  const locale = useLocale();
  const t = useTranslations("common");
  const router = useRouter();
  const [pending, start] = useTransition();

  function choose(next: AppLocale) {
    if (next === locale) return;
    start(async () => {
      await setLocaleAction(next);
      router.refresh();
    });
  }

  return (
    <div role="group" aria-label={t("language")} className="inline-flex rounded-full bg-cream p-1">
      {(
        [
          ["th", "ไทย"],
          ["en", "EN"],
        ] as const
      ).map(([code, label]) => (
        <button
          key={code}
          type="button"
          disabled={pending}
          aria-pressed={locale === code}
          onClick={() => choose(code)}
          className={cn(
            "h-8 rounded-full px-3 text-sm font-medium",
            locale === code ? "bg-white text-ink shadow-sm" : "text-stone-500",
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
