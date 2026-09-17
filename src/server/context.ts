import type { Prisma, PrismaClient } from "@prisma/client";
import { buildAbility, type Resource } from "@/server/policy/ability";

export type ActorKind = "staff" | "owner" | "system";

export type Actor = {
  userId: string;
  membershipId: string | null;
  displayName: string;
  kind: ActorKind;
  permissions: ReadonlySet<string>;
  branchIds: ReadonlySet<string>;
};

export type DbClient = PrismaClient | Prisma.TransactionClient;

export type AppContext = {
  tenantId: string;
  branchId: string | null;
  actor: Actor;
  /** ตรวจสิทธิ์แล้วโยน ForbiddenError ถ้าไม่มี — เรียกเป็นบรรทัดแรกของทุก use-case */
  can(permission: string, resource?: Resource): void;
  tx<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T>;
  emit(type: string, payload: Prisma.InputJsonValue): void;
};

type CreateContextInput = {
  db: PrismaClient;
  tenantId: string;
  branchId?: string | null;
  actor: Actor;
};

export function createAppContext(input: CreateContextInput): AppContext {
  const ability = buildAbility(input.actor);
  const pending: { type: string; payload: Prisma.InputJsonValue }[] = [];

  return {
    tenantId: input.tenantId,
    branchId: input.branchId ?? null,
    actor: input.actor,
    can(permission, resource) {
      ability.assert(permission, resource);
    },
    emit(type, payload) {
      pending.push({ type, payload });
    },
    async tx(fn) {
      return input.db.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT set_config('app.tenant_id', ${input.tenantId}, true)`;
        const result = await fn(tx);
        if (pending.length > 0) {
          await tx.outboxEvent.createMany({
            data: pending.map((event) => ({
              tenantId: input.tenantId,
              type: event.type,
              payload: event.payload,
            })),
          });
          pending.length = 0;
        }
        return result;
      });
    },
  };
}

export const SYSTEM_ACTOR: Actor = {
  userId: "00000000-0000-0000-0000-000000000000",
  membershipId: null,
  displayName: "system",
  kind: "system",
  permissions: new Set(),
  branchIds: new Set(),
};
