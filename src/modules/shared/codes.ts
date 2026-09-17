import { randomBytes } from "node:crypto";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateCode(prefix: string, length = 5): string {
  const bytes = randomBytes(length);
  let body = "";
  for (const byte of bytes) {
    body += ALPHABET[byte % ALPHABET.length];
  }
  return `${prefix}-${body}`;
}

export function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

/** ให้ตรงกับฟังก์ชัน th_normalize ในฐานข้อมูล */
export function thNormalize(text: string): string {
  return text.toLowerCase().replace(/[\s\-.]/g, "");
}
