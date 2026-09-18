"use server";

import { AuthError } from "next-auth";
import { issueOwnerOtp } from "@/server/auth/otp";
import { signIn } from "@/server/auth/config";

export async function requestOtpAction(phoneRaw: string) {
  return issueOwnerOtp(phoneRaw);
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
