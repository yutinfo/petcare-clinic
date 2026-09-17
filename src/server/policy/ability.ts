import { ForbiddenError } from "@/modules/shared";

type ActorLike = {
  kind: string;
  permissions: ReadonlySet<string>;
  branchIds: ReadonlySet<string>;
};

export type Resource = {
  branchId?: string | null;
};

export function buildAbility(actor: ActorLike) {
  return {
    can(permission: string, resource?: Resource): boolean {
      if (actor.kind === "system") return true;
      if (!actor.permissions.has(permission)) return false;
      if (
        resource?.branchId &&
        !actor.branchIds.has(resource.branchId) &&
        !actor.permissions.has("report:tenant")
      ) {
        return false;
      }
      return true;
    },
    assert(permission: string, resource?: Resource): void {
      if (!this.can(permission, resource)) {
        throw new ForbiddenError(permission);
      }
    },
  };
}
