import IORedis from "ioredis";
import { prisma } from "@/server/db/prisma";
import {
  OTP_REQUEST_MAX,
  OTP_VERIFY_MAX,
  RATE_WINDOW_MS,
  consumeRateLimit,
  isRateLimited,
  resetRateLimit,
} from "./rate-limit";

const TTL_SECONDS = 300;
const memory = new Map<string, { code: string; exp: number }>();
let redis: IORedis | undefined;

function key(phone: string) {
  return `otp:owner:${phone}`;
}

function digitsOnly(phone: string) {
  return phone.replace(/\D/g, "");
}

async function getRedis(): Promise<IORedis | null> {
  if (redis) return redis;
  const url = process.env.REDIS_URL;
  if (!url) return null;
  try {
    redis = new IORedis(url, { maxRetriesPerRequest: 1, lazyConnect: true });
    await redis.connect();
    return redis;
  } catch {
    return null;
  }
}

export function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function issueOwnerOtp(phoneRaw: string): Promise<
  { ok: true; devOtp?: string } | { ok: false; message: string }
> {
  const phone = digitsOnly(phoneRaw);
  if (phone.length < 9) return { ok: false, message: "เบอร์โทรไม่ถูกต้อง" };
  if (!(await consumeRateLimit(`otp-req:${phone}`, OTP_REQUEST_MAX, RATE_WINDOW_MS))) {
    return { ok: false, message: "ขอรหัสได้ไม่เกิน 3 ครั้งใน 15 นาที" };
  }
  if (process.env.NODE_ENV === "production") {
    return { ok: false, message: "ระบบส่งรหัสยังไม่พร้อม ติดต่อคลินิก" };
  }
  const user = await prisma.user.findUnique({ where: { phone } });
  if (!user || user.status !== "ACTIVE") {
    return { ok: true };
  }
  const code = generateOtp();
  await storeOwnerOtp(phone, code);
  return { ok: true, devOtp: code };
}

export async function storeOwnerOtp(phone: string, code: string): Promise<void> {
  const k = key(digitsOnly(phone));
  const r = await getRedis();
  if (r) {
    await r.set(k, code, "EX", TTL_SECONDS);
    return;
  }
  memory.set(k, { code, exp: Date.now() + TTL_SECONDS * 1000 });
}

export async function verifyOwnerOtp(phone: string, code: string): Promise<boolean> {
  const digits = digitsOnly(phone);
  if (await isRateLimited(`otp-verify:${digits}`, OTP_VERIFY_MAX)) {
    return false;
  }
  const k = key(digits);
  const r = await getRedis();
  if (r) {
    const saved = await r.get(k);
    if (saved && saved === code) {
      await r.del(k);
      await resetRateLimit(`otp-verify:${digits}`);
      return true;
    }
    await consumeRateLimit(`otp-verify:${digits}`, OTP_VERIFY_MAX, RATE_WINDOW_MS);
    return false;
  }
  const saved = memory.get(k);
  if (!saved || saved.exp < Date.now()) {
    memory.delete(k);
    await consumeRateLimit(`otp-verify:${digits}`, OTP_VERIFY_MAX, RATE_WINDOW_MS);
    return false;
  }
  if (saved.code !== code) {
    await consumeRateLimit(`otp-verify:${digits}`, OTP_VERIFY_MAX, RATE_WINDOW_MS);
    return false;
  }
  memory.delete(k);
  await resetRateLimit(`otp-verify:${digits}`);
  return true;
}
