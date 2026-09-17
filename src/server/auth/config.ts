import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { TOTP, Secret } from "otpauth";
import { prisma } from "@/server/db/prisma";
import { verifyOwnerOtp } from "@/server/auth/otp";

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt", maxAge: 60 * 60 * 12 },
  pages: {},
  providers: [
    Credentials({
      id: "staff",
      name: "พนักงาน",
      credentials: {
        email: { label: "อีเมล", type: "email" },
        password: { label: "รหัสผ่าน", type: "password" },
        totp: { label: "รหัส TOTP", type: "text" },
      },
      async authorize(credentials) {
        const email = String(credentials?.email ?? "")
          .trim()
          .toLowerCase();
        const password = String(credentials?.password ?? "");
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || user.status !== "ACTIVE" || !user.passwordHash) return null;
        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;

        if (user.mfaEnabledAt && user.mfaSecret) {
          const token = String(credentials?.totp ?? "");
          const totp = new TOTP({
            issuer: "PetCare",
            label: email,
            algorithm: "SHA1",
            digits: 6,
            period: 30,
            secret: Secret.fromBase32(user.mfaSecret),
          });
          if (totp.validate({ token, window: 1 }) === null) return null;
        }

        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });

        return {
          id: user.id,
          name: user.displayName,
          email: user.email,
          kind: "staff" as const,
        };
      },
    }),
    Credentials({
      id: "owner",
      name: "เจ้าของสัตว์",
      credentials: {
        phone: { label: "เบอร์โทร", type: "text" },
        otp: { label: "OTP", type: "text" },
      },
      async authorize(credentials) {
        const phone = String(credentials?.phone ?? "").replace(/\D/g, "");
        const otp = String(credentials?.otp ?? "");
        if (!phone || !otp) return null;
        const valid = await verifyOwnerOtp(phone, otp);
        if (!valid) return null;

        const user = await prisma.user.findUnique({ where: { phone } });
        if (!user || user.status !== "ACTIVE") return null;

        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });

        return {
          id: user.id,
          name: user.displayName,
          email: user.email,
          kind: "owner" as const,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.kind = (user as { kind?: string }).kind ?? "staff";
        token.name = user.name;
      }
      return token;
    },
    async session({ session, token }) {
      session.user = {
        ...session.user,
        id: String(token.sub ?? ""),
        kind: (token.kind as "staff" | "owner") ?? "staff",
        displayName: String(token.name ?? ""),
      };
      return session;
    },
  },
});
