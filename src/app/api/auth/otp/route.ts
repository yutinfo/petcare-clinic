import { NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";
import { generateOtp, storeOwnerOtp } from "@/server/auth/otp";

export async function POST(request: Request) {
  const body = (await request.json()) as { phone?: string };
  const phone = String(body.phone ?? "").replace(/\D/g, "");
  if (phone.length < 9) {
    return NextResponse.json({ error: "เบอร์โทรไม่ถูกต้อง" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { phone } });
  if (!user || user.status !== "ACTIVE") {
    // ไม่บอกว่ามีบัญชีหรือไม่
    return NextResponse.json({ ok: true });
  }

  const code = generateOtp();
  await storeOwnerOtp(phone, code);

  if (process.env.NODE_ENV !== "production") {
    console.log(`[dev] OTP สำหรับ ${phone}: ${code}`);
  }

  return NextResponse.json({ ok: true });
}
