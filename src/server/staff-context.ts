import { headers } from "next/headers";
import { UnauthenticatedError, BusinessError } from "@/modules/shared";
import { auth } from "@/server/auth/config";
import { createAppContext, type AppContext } from "@/server/context";
import { prisma } from "@/server/db/prisma";
import { tenantSlugFromHost } from "@/server/tenancy";

export async function getStaffContext(branchCode: string): Promise<AppContext> {
  const session = await auth();
  if (!session?.user?.id || session.user.kind !== "staff") {
    throw new UnauthenticatedError();
  }

  const headerList = await headers();
  const slugFromHost = tenantSlugFromHost(headerList.get("host"));
  const tenantId = session.user.tenantId;
  const tenantSlug = session.user.tenantSlug;
  if (!tenantId || !tenantSlug) {
    throw new BusinessError("บัญชีนี้ยังไม่ได้ผูกกับคลินิก");
  }
  if (slugFromHost && slugFromHost !== tenantSlug) {
    throw new BusinessError("โดเมนไม่ตรงกับคลินิกในเซสชัน");
  }

  const code = branchCode.toUpperCase();
  const branchId = session.user.branches.find((b) => b.code.toUpperCase() === code)?.id;
  if (!branchId) {
    throw new BusinessError("ไม่มีสิทธิ์เข้าสาขานี้");
  }

  return createAppContext({
    db: prisma,
    tenantId,
    branchId,
    actor: {
      userId: session.user.id,
      membershipId: session.user.membershipId ?? null,
      displayName: session.user.displayName,
      kind: "staff",
      permissions: new Set(session.user.permissions),
      branchIds: new Set(session.user.branches.map((b) => b.id)),
    },
  });
}
