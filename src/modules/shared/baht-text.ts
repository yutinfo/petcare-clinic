import { assertSatang } from "./money";

const DIGITS = ["ศูนย์", "หนึ่ง", "สอง", "สาม", "สี่", "ห้า", "หก", "เจ็ด", "แปด", "เก้า"];
const POSITIONS = ["", "สิบ", "ร้อย", "พัน", "หมื่น", "แสน"];

function readGroup(n: number): string {
  if (n === 0) return "";
  const digits = n.toString().padStart(6, "0").split("").map(Number);
  let out = "";
  for (let i = 0; i < 6; i++) {
    const d = digits[i] ?? 0;
    const pos = 5 - i;
    if (d === 0) continue;
    if (pos === 1) {
      if (d === 1) out += "สิบ";
      else if (d === 2) out += "ยี่สิบ";
      else out += `${DIGITS[d]}สิบ`;
    } else if (pos === 0 && d === 1 && n >= 10) {
      out += "เอ็ด";
    } else {
      out += `${DIGITS[d]}${POSITIONS[pos]}`;
    }
  }
  return out;
}

function readInteger(n: number): string {
  if (n === 0) return "ศูนย์";
  const million = Math.floor(n / 1_000_000);
  const rest = n % 1_000_000;
  const restText = readGroup(rest);
  if (million === 0) return restText;
  return `${readInteger(million)}ล้าน${restText}`;
}

/** จำนวนเงินเป็นตัวอักษรไทย สำหรับพิมพ์บนใบกำกับภาษี เช่น 1250 สตางค์ → "สิบสองบาทห้าสิบสตางค์" */
export function bahtText(satang: number): string {
  assertSatang(satang, "satang");
  if (satang < 0) return `ลบ${bahtText(-satang)}`;
  const baht = Math.floor(satang / 100);
  const st = satang % 100;
  const bahtPart = `${readInteger(baht)}บาท`;
  if (st === 0) return `${bahtPart}ถ้วน`;
  return `${bahtPart}${readInteger(st)}สตางค์`;
}
