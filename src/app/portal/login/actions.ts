"use server";

import { AuthError } from "next-auth";
import { prisma } from "@/server/db/prisma";
import { generateOtp, storeOwnerOtp } from "@/server/auth/otp";
import { signIn } from "@/server/auth/config";

export async function requestOtpAction(phoneRaw: string) {
  const phone = phoneRaw.replace(/\D/g, "");
  if (phone.length < 9) return { ok: false as const, message: "เบอร์โทรไม่ถูกต้อง" };
  const user = await prisma.user.findUnique({ where: { phone } });
  if (user && user.status === "ACTIVE") {
    const code = generateOtp();
    await storeOwnerOtp(phone, code);
    if (process.env.NODE_ENV !== "production") {
      console.log(`[dev] OTP สำหรับ ${phone}: ${code}`);
      return { ok: true as const, devOtp: code };
    }
  }
  return { ok: true as const };
}

export async function loginOwnerAction(_prev: unknown, formData: FormData) {
  const phone = String(formData.get("phone") ?? "");
  const otp = String(formData.get("otp") ?? "");
  try {
    await signIn("owner", { phone, otp, redirectTo: "/portal" });
  } catch (err) {
    if (err instanceof AuthError) {
      return { error: "รหัส OTP ไม่ถูกต้อง" };
    }
    throw err;
  }
}
