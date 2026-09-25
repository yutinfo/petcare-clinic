export const LOCALES = ["th", "en"] as const;

export type AppLocale = (typeof LOCALES)[number];

export function resolveLocale(value: string | undefined | null): AppLocale {
  return value === "en" ? "en" : "th";
}
