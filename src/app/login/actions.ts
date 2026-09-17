"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/server/auth/config";

export async function loginStaffAction(_prev: unknown, formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) {
    return { error: "กรอกอีเมลและรหัสผ่าน" };
  }
  try {
    await signIn("staff", { email, password, redirectTo: "/" });
  } catch (err) {
    if (err instanceof AuthError) {
      return { error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" };
    }
    throw err;
  }
}
