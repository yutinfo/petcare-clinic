import type { Prisma } from "@prisma/client";
import type { AppContext } from "@/server/context";

type AuditInput = {
  action: string;
  entityType: string;
  entityId?: string | null;
  before?: Prisma.InputJsonValue;
  after?: Prisma.InputJsonValue;
  reason?: string;
};

export async function writeAuditLog(
  tx: Prisma.TransactionClient,
  ctx: AppContext,
  input: AuditInput,
) {
  return tx.auditLog.create({
    data: {
      tenantId: ctx.tenantId,
      branchId: ctx.branchId,
      actorUserId: ctx.actor.userId === SYSTEM_ZERO ? null : ctx.actor.userId,
      actorMemberId: ctx.actor.membershipId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      before: input.before,
      after: input.after,
      reason: input.reason,
    },
  });
}

const SYSTEM_ZERO = "00000000-0000-0000-0000-000000000000";
