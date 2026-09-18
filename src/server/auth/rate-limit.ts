import IORedis from "ioredis";

const memory = new Map<string, { count: number; resetAt: number }>();
let redis: IORedis | undefined;

export const OTP_REQUEST_MAX = 3;
export const OTP_VERIFY_MAX = 5;
export const STAFF_LOGIN_MAX = 5;
export const RATE_WINDOW_MS = 15 * 60 * 1000;

export function resetRateLimitStoreForTests() {
  memory.clear();
}

function preferMemoryStore(): boolean {
  return process.env.NODE_ENV === "test" || !process.env.REDIS_URL;
}

async function getRedis(): Promise<IORedis | null> {
  if (preferMemoryStore()) return null;
  if (redis) return redis;
  try {
    redis = new IORedis(process.env.REDIS_URL!, { maxRetriesPerRequest: 1, lazyConnect: true });
    await redis.connect();
    return redis;
  } catch {
    return null;
  }
}

function memoryBucket(key: string, now: number, windowMs: number) {
  const current = memory.get(key);
  if (!current || current.resetAt <= now) {
    const fresh = { count: 0, resetAt: now + windowMs };
    memory.set(key, fresh);
    return fresh;
  }
  return current;
}

export async function isRateLimited(key: string, max: number, now = Date.now()): Promise<boolean> {
  const r = await getRedis();
  if (r) {
    const n = Number((await r.get(`rl:${key}`)) ?? 0);
    return n >= max;
  }
  const current = memory.get(key);
  if (!current || current.resetAt <= now) return false;
  return current.count >= max;
}

/** คืน true ถ้ายังไม่เกินเพดาน แล้วเพิ่มตัวนับ */
export async function consumeRateLimit(
  key: string,
  max: number,
  windowMs = RATE_WINDOW_MS,
  now = Date.now(),
): Promise<boolean> {
  const r = await getRedis();
  if (r) {
    const n = await r.incr(`rl:${key}`);
    if (n === 1) await r.pexpire(`rl:${key}`, windowMs);
    return n <= max;
  }
  const current = memoryBucket(key, now, windowMs);
  if (current.count >= max) return false;
  current.count += 1;
  memory.set(key, current);
  return true;
}

export async function resetRateLimit(key: string) {
  const r = await getRedis();
  if (r) {
    await r.del(`rl:${key}`);
    return;
  }
  memory.delete(key);
}
