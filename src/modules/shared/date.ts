import { formatInTimeZone } from "date-fns-tz";

export const BANGKOK_TZ = "Asia/Bangkok";

export function toBuddhistYear(date: Date, timeZone = BANGKOK_TZ): number {
  return Number(formatInTimeZone(date, timeZone, "yyyy")) + 543;
}

/** ปี พ.ศ. 4 หลัก — ใช้เป็น period ของ DocumentSequence แบบรายปี เช่น "2569" */
export function buddhistYearPeriod(date: Date = new Date(), timeZone = BANGKOK_TZ): string {
  return String(toBuddhistYear(date, timeZone));
}

/** ปีเดือน พ.ศ. เช่น "256909" */
export function buddhistYearMonthPeriod(date: Date = new Date(), timeZone = BANGKOK_TZ): string {
  return `${toBuddhistYear(date, timeZone)}${formatInTimeZone(date, timeZone, "MM")}`;
}

/** วันที่ไทย ค.ศ.→พ.ศ. เช่น 17/09/2569 */
export function formatThaiDate(date: Date, timeZone = BANGKOK_TZ): string {
  const dmy = formatInTimeZone(date, timeZone, "dd/MM");
  return `${dmy}/${toBuddhistYear(date, timeZone)}`;
}

export function formatThaiDateTime(date: Date, timeZone = BANGKOK_TZ): string {
  return `${formatThaiDate(date, timeZone)} ${formatInTimeZone(date, timeZone, "HH:mm")}`;
}

/** วันที่ทางธุรกิจตามเวลาไทย (ค่าห้องรายวัน, งวดเอกสาร) เป็น YYYY-MM-DD */
export function bangkokBusinessDate(date: Date = new Date()): string {
  return formatInTimeZone(date, BANGKOK_TZ, "yyyy-MM-dd");
}
