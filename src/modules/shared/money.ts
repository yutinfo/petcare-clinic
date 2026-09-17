/** เงินทั้งระบบเป็นจำนวนเต็มหน่วยสตางค์ — ห้าม Float / ห้ามคำนวณเป็นบาททศนิยม */

export function assertSatang(value: number, field = "amountSatang"): number {
  if (!Number.isInteger(value)) {
    throw new Error(`${field} ต้องเป็นจำนวนเต็มหน่วยสตางค์`);
  }
  return value;
}

export function addSatang(...amounts: number[]): number {
  return amounts.reduce((sum, n) => sum + assertSatang(n), 0);
}

export function subtractSatang(left: number, right: number): number {
  return assertSatang(left) - assertSatang(right);
}

/** รับสตริงบาท เช่น "12.50" หรือ "12" แล้วแปลงเป็นสตางค์ — ไม่รับ number เพื่อกัน 0.1+0.2 */
export function bahtStringToSatang(baht: string): number {
  const trimmed = baht.trim();
  if (!/^-?\d+(\.\d{1,2})?$/.test(trimmed)) {
    throw new Error(`รูปแบบจำนวนเงินไม่ถูกต้อง: ${baht}`);
  }
  const negative = trimmed.startsWith("-");
  const [whole = "0", frac = ""] = trimmed.replace("-", "").split(".");
  const satang = Number(whole) * 100 + Number((frac + "00").slice(0, 2));
  return negative ? -satang : satang;
}

export function satangToBahtString(satang: number): string {
  assertSatang(satang);
  const sign = satang < 0 ? "-" : "";
  const abs = Math.abs(satang);
  const baht = Math.floor(abs / 100);
  const frac = abs % 100;
  return `${sign}${baht}.${frac.toString().padStart(2, "0")}`;
}

export function formatSatangTh(satang: number): string {
  const [whole, frac] = satangToBahtString(satang).replace("-", "").split(".");
  const grouped = Number(whole).toLocaleString("th-TH");
  const sign = satang < 0 ? "-" : "";
  return `${sign}${grouped}.${frac}`;
}
