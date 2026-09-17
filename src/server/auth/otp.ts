import IORedis from "ioredis";

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
  const k = key(digitsOnly(phone));
  const r = await getRedis();
  if (r) {
    const saved = await r.get(k);
    if (saved && saved === code) {
      await r.del(k);
      return true;
    }
    return false;
  }
  const saved = memory.get(k);
  if (!saved || saved.exp < Date.now()) {
    memory.delete(k);
    return false;
  }
  if (saved.code !== code) return false;
  memory.delete(k);
  return true;
}
