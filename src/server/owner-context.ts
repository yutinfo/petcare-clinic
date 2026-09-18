import { UnauthenticatedError, BusinessError } from "@/modules/shared";
import { auth } from "@/server/auth/config";
import { createAppContext, type AppContext } from "@/server/context";
import { prisma } from "@/server/db/prisma";

export async function getOwnerContext(): Promise<AppContext> {
  const session = await auth();
  if (!session?.user?.id || session.user.kind !== "owner") {
    throw new UnauthenticatedError();
  }
  const tenantId = session.user.tenantId;
  if (!tenantId) throw new BusinessError("บัญชีนี้ยังไม่ได้ผูกกับคลินิก");

  return createAppContext({
    db: prisma,
    tenantId,
    branchId: session.user.branches[0]?.id ?? null,
    actor: {
      userId: session.user.id,
      membershipId: null,
      displayName: session.user.displayName,
      kind: "owner",
      permissions: new Set(),
      branchIds: new Set(session.user.branches.map((b) => b.id)),
    },
  });
}
