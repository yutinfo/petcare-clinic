import type { AppLocale } from "./locale";

/** แสดงเงินจากสตางค์จำนวนเต็ม ไม่วางทศนิยมลงการคำนวณ */
export function formatSatang(satang: number, locale: AppLocale): string {
  const sign = satang < 0 ? "-" : "";
  const abs = Math.abs(satang);
  const whole = Math.floor(abs / 100);
  const frac = abs % 100;
  const grouped = new Intl.NumberFormat(locale === "th" ? "th-TH" : "en-US").format(whole);
  return `${sign}${grouped}.${frac.toString().padStart(2, "0")}`;
}
