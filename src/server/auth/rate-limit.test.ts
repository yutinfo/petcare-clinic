import { afterEach, describe, expect, it, vi } from "vitest";
import { issueOwnerOtp } from "./otp";
import {
  OTP_REQUEST_MAX,
  RATE_WINDOW_MS,
  STAFF_LOGIN_MAX,
  consumeRateLimit,
  isRateLimited,
  resetRateLimitStoreForTests,
} from "./rate-limit";

afterEach(() => {
  resetRateLimitStoreForTests();
  vi.unstubAllEnvs();
});

describe("rate limit", () => {
  it("ขอ OTP ได้ไม่เกิน 3 ครั้งต่อ 15 นาทีต่อเบอร์", async () => {
    const key = "otp-req:0811111111";
    expect(await consumeRateLimit(key, OTP_REQUEST_MAX, RATE_WINDOW_MS)).toBe(true);
    expect(await consumeRateLimit(key, OTP_REQUEST_MAX, RATE_WINDOW_MS)).toBe(true);
    expect(await consumeRateLimit(key, OTP_REQUEST_MAX, RATE_WINDOW_MS)).toBe(true);
    expect(await consumeRateLimit(key, OTP_REQUEST_MAX, RATE_WINDOW_MS)).toBe(false);
    expect(await isRateLimited(key, OTP_REQUEST_MAX)).toBe(true);
  });

  it("ล็อกอินพนักงานไม่เกิน 5 ครั้งต่อ 15 นาทีต่อบัญชี", async () => {
    const key = "staff-login:nune@demo.local";
    for (let i = 0; i < STAFF_LOGIN_MAX; i += 1) {
      expect(await consumeRateLimit(key, STAFF_LOGIN_MAX, RATE_WINDOW_MS)).toBe(true);
    }
    expect(await consumeRateLimit(key, STAFF_LOGIN_MAX, RATE_WINDOW_MS)).toBe(false);
  });

  it("production ไม่บอกว่าส่ง OTP สำเร็จและไม่คืนรหัส", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const res = await issueOwnerOtp("0812345678");
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.message).toMatch(/ยังไม่พร้อม/);
  });
});
