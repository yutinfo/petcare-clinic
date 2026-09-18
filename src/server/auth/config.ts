import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { TOTP, Secret } from "otpauth";
import { prisma } from "@/server/db/prisma";
import {
  RATE_WINDOW_MS,
  STAFF_LOGIN_MAX,
  consumeRateLimit,
  isRateLimited,
  resetRateLimit,
} from "@/server/auth/rate-limit";
import { verifyOwnerOtp } from "@/server/auth/otp";
import { getMigrator } from "@/server/db/migrator";
import type { SessionBranch } from "@/types/next-auth";

async function loadStaffClaims(userId: string) {
  const db = getMigrator();
  const membership = await db.membership.findFirst({
    where: { userId, status: "ACTIVE" },
    include: {
      tenant: true,
      role: { include: { permissions: true } },
      branches: true,
    },
    orderBy: { createdAt: "asc" },
  });
  if (!membership) return null;

  const branchRecords =
    membership.branches.length > 0
      ? await db.branch.findMany({
          where: { id: { in: membership.branches.map((b) => b.branchId) }, isActive: true },
        })
      : await db.branch.findMany({
          where: { tenantId: membership.tenantId, isActive: true },
        });

  const branches: SessionBranch[] = branchRecords.map((b) => ({
    id: b.id,
    code: b.code,
    name: b.name,
  }));
  const defaultBranch =
    branches.find((b) => b.id === membership.defaultBranchId) ?? branches[0];

  return {
    tenantId: membership.tenantId,
    tenantSlug: membership.tenant.slug,
    tenantName: membership.tenant.displayName,
    membershipId: membership.id,
    defaultBranchCode: defaultBranch?.code.toLowerCase(),
    permissions: membership.role.permissions.map((p) => p.permissionKey),
    branches,
  };
}

async function loadOwnerClaims(userId: string) {
  const db = getMigrator();
  const owner = await db.owner.findFirst({
    where: { userId, deletedAt: null },
    orderBy: { createdAt: "asc" },
  });
  if (!owner) return null;
  const tenant = await db.tenant.findUnique({ where: { id: owner.tenantId } });
  if (!tenant) return null;
  const branches = await db.branch.findMany({
    where: { tenantId: tenant.id, isActive: true },
    orderBy: { isHeadOffice: "desc" },
  });
  return {
    tenantId: tenant.id,
    tenantSlug: tenant.slug,
    tenantName: tenant.displayName,
    ownerId: owner.id,
    defaultBranchCode: branches[0]?.code.toLowerCase(),
    branches: branches.map((b) => ({ id: b.id, code: b.code, name: b.name })),
  };
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt", maxAge: 60 * 60 * 12 },
  pages: { signIn: "/login" },
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
        const loginKey = `staff-login:${email}`;
        if (await isRateLimited(loginKey, STAFF_LOGIN_MAX)) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || user.status !== "ACTIVE" || !user.passwordHash) {
          await consumeRateLimit(loginKey, STAFF_LOGIN_MAX, RATE_WINDOW_MS);
          return null;
        }
        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) {
          await consumeRateLimit(loginKey, STAFF_LOGIN_MAX, RATE_WINDOW_MS);
          return null;
        }

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
          if (totp.validate({ token, window: 1 }) === null) {
            await consumeRateLimit(loginKey, STAFF_LOGIN_MAX, RATE_WINDOW_MS);
            return null;
          }
        }

        await resetRateLimit(loginKey);
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
        token.kind = user.kind ?? "staff";
        token.name = user.name;
        if (user.kind === "staff" && user.id) {
          const claims = await loadStaffClaims(user.id);
          if (claims) {
            token.tenantId = claims.tenantId;
            token.tenantSlug = claims.tenantSlug;
            token.tenantName = claims.tenantName;
            token.membershipId = claims.membershipId;
            token.defaultBranchCode = claims.defaultBranchCode;
            token.permissions = claims.permissions;
            token.branches = claims.branches;
          }
        }
        if (user.kind === "owner" && user.id) {
          const claims = await loadOwnerClaims(user.id);
          if (claims) {
            token.tenantId = claims.tenantId;
            token.tenantSlug = claims.tenantSlug;
            token.tenantName = claims.tenantName;
            token.ownerId = claims.ownerId;
            token.defaultBranchCode = claims.defaultBranchCode;
            token.permissions = [];
            token.branches = claims.branches;
          }
        }
      }
      return token;
    },
    async session({ session, token }) {
      session.user = {
        ...session.user,
        id: String(token.sub ?? ""),
        kind: token.kind ?? "staff",
        displayName: String(token.name ?? ""),
        tenantId: token.tenantId,
        tenantSlug: token.tenantSlug,
        tenantName: token.tenantName,
        membershipId: token.membershipId ?? null,
        ownerId: token.ownerId,
        defaultBranchCode: token.defaultBranchCode,
        permissions: token.permissions ?? [],
        branches: token.branches ?? [],
      };
      return session;
    },
  },
});
