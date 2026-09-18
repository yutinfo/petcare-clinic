import { NextResponse } from "next/server";
import { issueOwnerOtp } from "@/server/auth/otp";

export async function POST(request: Request) {
  const body = (await request.json()) as { phone?: string };
  const result = await issueOwnerOtp(String(body.phone ?? ""));
  if (!result.ok) {
    const status = result.message.includes("เบอร์") ? 400 : result.message.includes("15 นาที") ? 429 : 503;
    return NextResponse.json({ error: result.message }, { status });
  }
  return NextResponse.json({ ok: true });
}
