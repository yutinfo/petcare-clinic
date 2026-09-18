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

/**
 * ค่าจาก input datetime-local ไม่มีโซน — ถือเป็นเวลาไทย
 * ถ้ามี offset หรือ Z อยู่แล้ว ใช้ตามนั้น (เทส/API)
 */
export function parseBangkokDateTimeLocal(value: string): Date {
  const trimmed = value.trim();
  if (!trimmed) throw new RangeError("วันเวลาว่าง");
  if (/[zZ]$/.test(trimmed) || /[+-]\d{2}:\d{2}$/.test(trimmed)) {
    const parsed = new Date(trimmed);
    if (Number.isNaN(parsed.getTime())) throw new RangeError("วันเวลาไม่ถูกต้อง");
    return parsed;
  }
  const match = trimmed.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})(?::(\d{2}))?$/);
  if (!match) throw new RangeError("วันเวลาไม่ถูกต้อง");
  const parsed = new Date(`${match[1]}T${match[2]}:${match[3] ?? "00"}+07:00`);
  if (Number.isNaN(parsed.getTime())) throw new RangeError("วันเวลาไม่ถูกต้อง");
  return parsed;
}

/** ค่าสำหรับ input datetime-local ตามนาฬิกาไทย */
export function datetimeLocalValue(date: Date = new Date(), timeZone = BANGKOK_TZ): string {
  return formatInTimeZone(date, timeZone, "yyyy-MM-dd'T'HH:mm");
}

/** พรุ่งนี้ตามปฏิทินไทย ณ ชั่วโมง:นาที เช่น 18:00 สำหรับกำหนดรับฝาก */
export function bangkokTomorrowAt(hour: number, minute = 0): string {
  const today = bangkokBusinessDate();
  const [year, month, day] = today.split("-").map(Number);
  const next = new Date(Date.UTC(year!, month! - 1, day! + 1));
  const ymd = `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}-${String(next.getUTCDate()).padStart(2, "0")}`;
  return `${ymd}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}
